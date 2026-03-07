import json
from typing import Any

import google.generativeai as genai
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from backend.config import GEMINI_API_KEY, GOAL_EXTRACTION_PROMPT


router = APIRouter()


def _build_model() -> genai.GenerativeModel:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set.")

    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=GOAL_EXTRACTION_PROMPT,
    )


def _extract_goal_json(response_text: str) -> dict[str, Any] | None:
    cleaned = response_text.strip()
    fence_stripped = (
        cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    )

    candidates = [cleaned, fence_stripped]
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if not isinstance(parsed, dict):
            continue

        required_keys = {
            "goal",
            "description",
            "level",
            "time_per_day_minutes",
            "context",
        }
        if not required_keys.issubset(parsed.keys()):
            continue

        if parsed.get("level") not in {"beginner", "intermediate", "advanced"}:
            continue

        if not isinstance(parsed.get("time_per_day_minutes"), int):
            continue

        return parsed

    return None


class GoalExtractionSession:
    def __init__(self) -> None:
        self.model = _build_model()
        self.chat = self.model.start_chat(history=[])
        self.history: list[dict[str, str]] = []

    def send_user_message(self, text: str) -> str:
        self.history.append({"role": "user", "text": text})
        response = self.chat.send_message(text)
        response_text = (response.text or "").strip()
        self.history.append({"role": "assistant", "text": response_text})
        return response_text


@router.websocket("/ws/text")
async def text_goal_extractor(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        session = GoalExtractionSession()
    except Exception as exc:
        await websocket.send_json(
            {
                "type": "message",
                "text": f"Unable to start goal extraction: {exc}",
            }
        )
        await websocket.close(code=1011)
        return

    try:
        while True:
            payload = await websocket.receive_json()
            user_text = (
                str(payload.get("text", "")).strip()
                if isinstance(payload, dict)
                else ""
            )

            if not user_text:
                await websocket.send_json(
                    {
                        "type": "message",
                        "text": "Send a JSON message with a non-empty `text` field.",
                    }
                )
                continue

            gemini_response = await run_in_threadpool(
                session.send_user_message, user_text
            )
            goal = _extract_goal_json(gemini_response)

            if goal is not None:
                await websocket.send_json({"type": "goal_complete", "goal": goal})
            else:
                await websocket.send_json({"type": "message", "text": gemini_response})
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json(
            {
                "type": "message",
                "text": f"Goal extraction failed: {exc}",
            }
        )
        await websocket.close(code=1011)
