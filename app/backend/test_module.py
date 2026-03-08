import asyncio
import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError
from websockets.asyncio.client import connect


WS_URL = "ws://127.0.0.1:8000/ws/text"
INITIAL_MESSAGE = "I want to learn about large language models"
FOLLOW_UP_ANSWER = (
    "I'm a software engineer, intermediate Python, want to build apps with "
    "LLMs, have 15 minutes a day"
)


class GoalOutput(BaseModel):
    goal: str
    description: str
    level: str
    time_per_day_minutes: int = Field(ge=1)
    context: str


async def run_text_test() -> GoalOutput:
    print(f"Connecting to {WS_URL}")
    sent_initial_message = False

    async with connect(WS_URL, open_timeout=10, close_timeout=5) as websocket:
        while True:
            if not sent_initial_message:
                print(f"USER: {INITIAL_MESSAGE}")
                await websocket.send(json.dumps({"text": INITIAL_MESSAGE}))
                sent_initial_message = True

            raw_message = await asyncio.wait_for(websocket.recv(), timeout=60)
            payload: dict[str, Any] = json.loads(raw_message)

            if payload.get("type") == "message":
                text = payload.get("text", "")
                print(f"AI: {text}")
                if text.startswith("Goal extraction failed:") or text.startswith("Unable to start goal extraction:"):
                    raise RuntimeError(text)
                if "Continuing without personalization." in text:
                    continue
                print(f"USER: {FOLLOW_UP_ANSWER}")
                await websocket.send(json.dumps({"text": FOLLOW_UP_ANSWER}))
                continue

            if payload.get("type") == "goal_complete":
                print("GoalOutput JSON:")
                print(json.dumps(payload["goal"], indent=2))
                return GoalOutput.model_validate(payload["goal"])

            raise RuntimeError(f"Unexpected payload: {payload}")


if __name__ == "__main__":
    try:
        goal = asyncio.run(run_text_test())
        print("GoalOutput validation passed.")
        print(goal.model_dump_json(indent=2))
    except ValidationError as exc:
        print("GoalOutput validation failed.")
        print(exc)
        raise
