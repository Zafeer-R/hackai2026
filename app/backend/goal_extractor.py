from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.backend.goal_personalization import (
    build_force_final_json_prompt,
    build_goal_extraction_prompt,
    get_max_assistant_question_turns,
    load_user_profile,
)
from app.backend.roadmap_generator import generate_roadmap
from app.config import get_settings

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


def _build_system_instruction(user_id: str) -> tuple[str, str | None]:
    profile, warning = load_user_profile(user_id)
    prompt = build_goal_extraction_prompt(get_settings().GOAL_EXTRACTION_PROMPT, profile)
    return prompt, warning


class GoalExtractionSession:
    def __init__(self, system_instruction: str) -> None:
        self.client = _build_text_client()
        self.system_instruction = system_instruction
        self.history: list[types.Content] = []
        self.assistant_question_turns = 0
        self.max_assistant_question_turns = get_max_assistant_question_turns()
        self.force_final_json_prompt = build_force_final_json_prompt()

    async def _generate_response(self, *, force_json: bool = False) -> str:
        contents = list(self.history)
        config_kwargs: dict[str, Any] = {
            "systemInstruction": self.system_instruction,
        }

        if force_json:
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=self.force_final_json_prompt)],
                )
            )
            config_kwargs["responseMimeType"] = "application/json"

        response = await self.client.aio.models.generate_content(
            model=get_settings().MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        response_text = (response.text or "").strip()
        if not response_text:
            raise RuntimeError("Gemini returned an empty response.")
        return response_text

    def _append_model_response(self, response_text: str) -> None:
        self.history.append(
            types.Content(
                role="model",
                parts=[types.Part(text=response_text)],
            )
        )

    async def send_user_message(self, text: str) -> tuple[str, dict[str, Any] | None]:
        self.history.append(
            types.Content(
                role="user",
                parts=[types.Part(text=text)],
            )
        )

        response_text = await self._generate_response()
        goal = _extract_goal_json(response_text)
        if goal is not None:
            self._append_model_response(response_text)
            return response_text, goal

        if self.assistant_question_turns >= self.max_assistant_question_turns:
            forced_response = await self._generate_response(force_json=True)
            forced_goal = _extract_goal_json(forced_response)
            if forced_goal is None:
                raise RuntimeError("Gemini did not return valid goal JSON after the follow-up limit.")
            self._append_model_response(forced_response)
            return forced_response, forced_goal

        self.assistant_question_turns += 1
        self._append_model_response(response_text)
        return response_text, None


@dataclass
class VoiceConversationState:
    assistant_question_turns: int = 0
    finalize_requested: bool = False
    model_text_parts: list[str] = field(default_factory=list)
    max_assistant_question_turns: int = field(default_factory=get_max_assistant_question_turns)
    force_final_json_prompt: str = field(default_factory=build_force_final_json_prompt)


def _is_voice_turn_complete(turn: Any) -> bool:
    server_content = getattr(turn, "server_content", None)
    if server_content is None:
        return bool(getattr(turn, "text", None)) and not bool(getattr(turn, "data", None))
    return bool(
        getattr(server_content, "turn_complete", False)
        or getattr(server_content, "generation_complete", False)
    )


async def _request_voice_final_json(session: Any, prompt: str) -> None:
    send_client_content = getattr(session, "send_client_content", None)
    if callable(send_client_content):
        await send_client_content(
            turns=[
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            turn_complete=True,
        )
        return

    await session.send_realtime_input(text=prompt)


async def _voice_send_loop(
    websocket: WebSocket,
    session: Any,
    stop_event: asyncio.Event,
    state: VoiceConversationState,
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
                    if (
                        state.assistant_question_turns >= state.max_assistant_question_turns
                        and not state.finalize_requested
                    ):
                        print("[voice] requesting forced JSON finalization")
                        state.finalize_requested = True
                        await _request_voice_final_json(session, state.force_final_json_prompt)
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
    state: VoiceConversationState,
    user_id: str = DEFAULT_USER_ID,
) -> None:
    async for turn in session.receive():
        if turn.data:
            print(f"[voice] received audio from Gemini ({len(turn.data)} bytes)")
            await websocket.send_bytes(turn.data)

        if turn.text:
            state.model_text_parts.append(turn.text)

            joined_text = "".join(state.model_text_parts).strip()
            goal = _extract_goal_json(joined_text)
            if goal is not None:
                print(f"[voice] received text from Gemini: {joined_text[:200]!r}")
                print("[voice] goal_complete detected")
                roadmap = await _generate_roadmap(goal, user_id)
                await websocket.send_json({"type": "goal_complete", "goal": goal, "roadmap": roadmap})
                stop_event.set()
                return

        if not _is_voice_turn_complete(turn):
            continue

        joined_text = "".join(state.model_text_parts).strip()
        state.model_text_parts.clear()
        if not joined_text:
            continue

        print(f"[voice] received text from Gemini: {joined_text[:200]!r}")
        goal = _extract_goal_json(joined_text)
        if goal is not None:
            print("[voice] goal_complete detected")
            roadmap = await _generate_roadmap(goal, user_id)
            await websocket.send_json({"type": "goal_complete", "goal": goal, "roadmap": roadmap})
            stop_event.set()
            return

        if state.finalize_requested:
            raise RuntimeError("Gemini Live exceeded the follow-up limit without returning final goal JSON.")

        state.assistant_question_turns += 1

    stop_event.set()


@router.websocket("/ws/text")
async def text_goal_extractor(websocket: WebSocket, user_id: str = Query(default=DEFAULT_USER_ID)) -> None:
    await websocket.accept()

    try:
        system_instruction, warning = _build_system_instruction(user_id)
        session = GoalExtractionSession(system_instruction)

        if warning:
            await websocket.send_json({"type": "message", "text": warning})

        while True:
            payload = await websocket.receive_json()
            user_text = str(payload.get("text", "")).strip() if isinstance(payload, dict) else ""

            if not user_text:
                await websocket.send_json({"type": "message", "text": "Send a JSON message with a non-empty `text` field."})
                continue

            response_text, goal = await session.send_user_message(user_text)
            if goal is None:
                await websocket.send_json({"type": "message", "text": response_text})
                continue

            roadmap = await _generate_roadmap(goal, user_id)
            await websocket.send_json({"type": "goal_complete", "goal": goal, "roadmap": roadmap})
            await websocket.close()
            return
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"type": "message", "text": f"Goal extraction failed: {exc}"})
        await websocket.close(code=1011)


@router.websocket("/ws/voice")
async def voice_goal_extractor(websocket: WebSocket, user_id: str = Query(default=DEFAULT_USER_ID)) -> None:
    await websocket.accept()
    print("[voice] websocket accepted")

    try:
        system_instruction, warning = _build_system_instruction(user_id)
        client = _build_voice_client()
        config = types.LiveConnectConfig(
            responseModalities=["AUDIO"],
            systemInstruction=system_instruction,
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
    state = VoiceConversationState()

    try:
        if warning:
            await websocket.send_json({"type": "message", "text": warning})

        print(f"[voice] opening Gemini Live session with model={get_settings().VOICE_MODEL}")
        async with client.aio.live.connect(
            model=get_settings().VOICE_MODEL,
            config=config,
        ) as session:
            print("[voice] Gemini Live session connected")
            send_task = asyncio.create_task(_voice_send_loop(websocket, session, stop_event, state))
            receive_task = asyncio.create_task(_voice_receive_loop(websocket, session, stop_event, state, user_id))

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
