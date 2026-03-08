import asyncio
import json
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.config import get_settings
from app.backend.roadmap_generator import generate_roadmap

router = APIRouter()

DEFAULT_USER_ID = "default-user"


async def _generate_roadmap(goal: dict, user_id: str = DEFAULT_USER_ID) -> dict:
    return await asyncio.to_thread(generate_roadmap, goal["goal"], user_id)


def _build_text_client() -> genai.Client:
    key = get_settings().GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    return genai.Client(api_key=key)


def _build_voice_client() -> genai.Client:
    key = get_settings().GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    return genai.Client(
        api_key=key,
        http_options={"api_version": "v1alpha"},
    )


def _extract_goal_json(response_text: str) -> dict[str, Any] | None:
    cleaned = response_text.strip()
    if not cleaned:
        return None

    candidates = [cleaned]
    if cleaned.startswith("```"):
        candidates.append(cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip())

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(parsed, dict) and "goal" in parsed:
            return parsed

    return None


class GoalExtractionSession:
    def __init__(self) -> None:
        self.client = _build_text_client()
        self.history: list[types.Content] = []

    async def send_user_message(self, text: str) -> str:
        self.history.append(
            types.Content(
                role="user",
                parts=[types.Part(text=text)],
            )
        )
        response = await self.client.aio.models.generate_content(
            model=get_settings().MODEL_NAME,
            contents=self.history,
            config=types.GenerateContentConfig(
                systemInstruction=get_settings().GOAL_EXTRACTION_PROMPT,
            ),
        )
        response_text = (response.text or "").strip()
        if not response_text:
            raise RuntimeError("Gemini returned an empty response.")
        self.history.append(
            types.Content(
                role="model",
                parts=[types.Part(text=response_text)],
            )
        )
        return response_text


@router.websocket("/ws/text")
async def text_goal_extractor(websocket: WebSocket, user_id: str = Query(default=DEFAULT_USER_ID)) -> None:
    await websocket.accept()

    try:
        payload = await websocket.receive_json()
        user_text = str(payload.get("text", "")).strip() if isinstance(payload, dict) else ""

        if not user_text:
            await websocket.send_json({"type": "message", "text": "Send a JSON message with a non-empty `text` field."})
            await websocket.close()
            return

        goal = {"goal": user_text}
        roadmap = await _generate_roadmap(goal, user_id)
        await websocket.send_json({"type": "goal_complete", "goal": goal, "roadmap": roadmap})
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"type": "message", "text": f"Goal extraction failed: {exc}"})
        await websocket.close(code=1011)


async def _voice_send_loop(
    websocket: WebSocket,
    session: Any,
    stop_event: asyncio.Event,
) -> None:
    chunk_count = 0
    while not stop_event.is_set():
        receive_task = asyncio.create_task(websocket.receive())
        stop_task = asyncio.create_task(stop_event.wait())

        done, pending = await asyncio.wait(
            {receive_task, stop_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        for pending_task in pending:
            pending_task.cancel()

        if stop_task in done:
            await asyncio.gather(receive_task, return_exceptions=True)
            break

        message = receive_task.result()
        message_type = message.get("type")

        if message_type == "websocket.disconnect":
            raise WebSocketDisconnect(code=message.get("code", 1000))

        if message_type == "websocket.receive":
            text_message = message.get("text")
            if text_message:
                try:
                    payload = json.loads(text_message)
                except json.JSONDecodeError:
                    payload = None

                if isinstance(payload, dict) and payload.get("type") == "end_audio":
                    print("[voice] received end_audio control message")
                    await session.send_realtime_input(audio_stream_end=True)
                    continue

        audio_chunk = message.get("bytes")
        if not audio_chunk:
            continue

        chunk_count += 1
        if chunk_count <= 5 or chunk_count % 20 == 0:
            print(f"[voice] sending audio chunk #{chunk_count} ({len(audio_chunk)} bytes)")

        await session.send_realtime_input(
            audio=types.Blob(
                data=audio_chunk,
                mimeType="audio/pcm;rate=16000",
            )
        )


async def _voice_receive_loop(
    websocket: WebSocket,
    session: Any,
    stop_event: asyncio.Event,
    user_id: str = DEFAULT_USER_ID,
) -> None:
    async for turn in session.receive():
        if turn.data:
            print(f"[voice] received audio from Gemini ({len(turn.data)} bytes)")
            await websocket.send_bytes(turn.data)

        if turn.text:
            print(f"[voice] received text from Gemini: {turn.text[:200]!r}")
            goal = _extract_goal_json(turn.text)
            if goal is not None:
                print("[voice] goal_complete detected")
                roadmap = await _generate_roadmap(goal, user_id)
                await websocket.send_json({"type": "goal_complete", "goal": goal, "roadmap": roadmap})
                stop_event.set()
                return

    stop_event.set()


@router.websocket("/ws/voice")
async def voice_goal_extractor(websocket: WebSocket, user_id: str = Query(default=DEFAULT_USER_ID)) -> None:
    await websocket.accept()
    print("[voice] websocket accepted")

    try:
        client = _build_voice_client()
        config = types.LiveConnectConfig(
            responseModalities=["AUDIO"],
            systemInstruction=get_settings().GOAL_EXTRACTION_PROMPT,
            speechConfig=types.SpeechConfig(
                voiceConfig=types.VoiceConfig(
                    prebuiltVoiceConfig=types.PrebuiltVoiceConfig(voiceName="Aoede")
                )
            ),
        )
    except Exception as exc:
        print(f"[voice] failed to initialize voice client/config: {exc}")
        await websocket.send_json(
            {
                "type": "message",
                "text": f"Unable to start voice goal extraction: {exc}",
            }
        )
        await websocket.close(code=1011)
        return

    stop_event = asyncio.Event()

    try:
        print(f"[voice] opening Gemini Live session with model={get_settings().VOICE_MODEL}")
        async with client.aio.live.connect(
            model=get_settings().VOICE_MODEL,
            config=config,
        ) as session:
            print("[voice] Gemini Live session connected")
            send_task = asyncio.create_task(_voice_send_loop(websocket, session, stop_event))
            receive_task = asyncio.create_task(_voice_receive_loop(websocket, session, stop_event, user_id))

            try:
                await asyncio.gather(send_task, receive_task)
            finally:
                print("[voice] shutting down voice tasks")
                stop_event.set()
                for task in (send_task, receive_task):
                    if not task.done():
                        task.cancel()
                await asyncio.gather(send_task, receive_task, return_exceptions=True)
    except WebSocketDisconnect:
        print("[voice] websocket disconnected")
        return
    except Exception as exc:
        print(f"[voice] error: {exc}")
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json(
                {
                    "type": "message",
                    "text": f"Voice goal extraction failed: {exc}",
                }
            )
            await websocket.close(code=1011)
