from __future__ import annotations

import importlib
import json
import sys
import types as pytypes
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.backend import goal_personalization
from app.config import get_settings


def _reset_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-youtube-key")
    get_settings.cache_clear()


def _install_fake_google_modules() -> type:
    google_module = pytypes.ModuleType("google")
    genai_module = pytypes.ModuleType("google.genai")
    types_module = pytypes.ModuleType("google.genai.types")

    class _SimpleObject:
        def __init__(self, **kwargs: Any) -> None:
            self.__dict__.update(kwargs)

    class Part:
        def __init__(self, text: str | None = None, data: bytes | None = None, mimeType: str | None = None) -> None:
            self.text = text
            self.data = data
            self.mimeType = mimeType

    class Content:
        def __init__(self, role: str, parts: list[Any]) -> None:
            self.role = role
            self.parts = parts

    class Blob(_SimpleObject):
        pass

    class GenerateContentConfig(_SimpleObject):
        pass

    class LiveConnectConfig(_SimpleObject):
        pass

    class SpeechConfig(_SimpleObject):
        pass

    class VoiceConfig(_SimpleObject):
        pass

    class PrebuiltVoiceConfig(_SimpleObject):
        pass

    class FakeResponse:
        def __init__(self, text: str) -> None:
            self.text = text

    class FakeModels:
        async def generate_content(self, model: str, contents: list[Any], config: Any) -> FakeResponse:
            FakeClient.generate_calls.append(
                {
                    "model": model,
                    "contents": contents,
                    "config": config,
                }
            )
            return FakeResponse(FakeClient.text_responder(model, contents, config))

    class FakeLiveSession:
        def __init__(self) -> None:
            self.sent_client_content: list[dict[str, Any]] = []
            self.sent_realtime_input: list[dict[str, Any]] = []

        async def send_client_content(self, **kwargs: Any) -> None:
            self.sent_client_content.append(kwargs)

        async def send_realtime_input(self, **kwargs: Any) -> None:
            self.sent_realtime_input.append(kwargs)

        async def receive(self):
            if False:
                yield None

    class FakeLiveConnector:
        async def __aenter__(self) -> FakeLiveSession:
            session = FakeLiveSession()
            FakeClient.live_sessions.append(session)
            return session

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

    class FakeLive:
        def connect(self, *, model: str, config: Any) -> FakeLiveConnector:
            FakeClient.live_connect_calls.append({"model": model, "config": config})
            return FakeLiveConnector()

    class FakeClient:
        text_responder = staticmethod(lambda model, contents, config: json.dumps({"goal": "fallback"}))
        generate_calls: list[dict[str, Any]] = []
        live_connect_calls: list[dict[str, Any]] = []
        live_sessions: list[FakeLiveSession] = []

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.aio = _SimpleObject(models=FakeModels(), live=FakeLive())

    types_module.Part = Part
    types_module.Content = Content
    types_module.Blob = Blob
    types_module.GenerateContentConfig = GenerateContentConfig
    types_module.LiveConnectConfig = LiveConnectConfig
    types_module.SpeechConfig = SpeechConfig
    types_module.VoiceConfig = VoiceConfig
    types_module.PrebuiltVoiceConfig = PrebuiltVoiceConfig
    genai_module.Client = FakeClient
    genai_module.types = types_module
    google_module.genai = genai_module

    sys.modules["google"] = google_module
    sys.modules["google.genai"] = genai_module
    sys.modules["google.genai.types"] = types_module

    return FakeClient


@pytest.fixture
def goal_extractor_module(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[Any, type]]:
    _reset_settings_cache(monkeypatch)
    fake_client_class = _install_fake_google_modules()
    sys.modules.pop("app.backend.goal_extractor", None)
    module = importlib.import_module("app.backend.goal_extractor")
    fake_client_class.generate_calls.clear()
    fake_client_class.live_connect_calls.clear()
    fake_client_class.live_sessions.clear()
    yield module, fake_client_class
    get_settings.cache_clear()


def test_normalize_user_profile_keeps_relevant_fields() -> None:
    profile = goal_personalization.normalize_user_profile(
        {
            "_id": "user-001",
            "name": "TestUser",
            "current_role": "Software Engineer",
            "industry": "Fintech",
            "expertise": [
                {
                    "field": "Machine Learning",
                    "level": "intermediate",
                    "topics_known": ["gradient descent", "CNNs"],
                    "topics_gaps": ["transformers"],
                    "years_experience": 2,
                    "last_used": "currently active",
                }
            ],
            "ambitions": [
                {
                    "goal": "Become an ML engineer",
                    "target_skills": ["LLMOps", "RAG pipelines"],
                    "timeline": "6 months",
                    "motivation": "switch roles",
                }
            ],
        }
    )

    assert profile["current_role"] == "Software Engineer"
    assert profile["expertise"][0]["topics_gaps"] == ["transformers"]
    assert profile["ambitions"][0]["target_skills"] == ["LLMOps", "RAG pipelines"]


def test_load_user_profile_returns_missing_warning(monkeypatch: pytest.MonkeyPatch) -> None:
    _reset_settings_cache(monkeypatch)
    monkeypatch.setenv("MONGO_URI", "mongodb://example")
    get_settings.cache_clear()

    class FakeCollection:
        def find_one(self, query: dict[str, Any]) -> None:
            assert query == {"_id": "user-404"}
            return None

    class FakeDatabase:
        def __getitem__(self, collection_name: str) -> FakeCollection:
            assert collection_name == get_settings().MONGO_USER_PROFILES_COLLECTION
            return FakeCollection()

    class FakeMongoClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.closed = False

        def __getitem__(self, db_name: str) -> FakeDatabase:
            assert db_name == get_settings().MONGO_DB
            return FakeDatabase()

        def close(self) -> None:
            self.closed = True

    monkeypatch.setattr(goal_personalization, "MongoClient", FakeMongoClient)

    profile, warning = goal_personalization.load_user_profile("user-404")

    assert profile is None
    assert warning == "No saved profile was found for user 'user-404'. Continuing without personalization."


def test_build_goal_extraction_prompt_includes_personalization_rules() -> None:
    prompt = goal_personalization.build_goal_extraction_prompt(
        "Base prompt",
        {
            "current_role": "Software Engineer",
            "expertise": [{"field": "Machine Learning", "topics_gaps": ["transformers"]}],
        },
    )

    assert "Base prompt" in prompt
    assert "Saved profile context:" in prompt
    assert "transformers" in prompt
    assert '"current_role":"Software Engineer"' in prompt


def test_build_goal_extraction_prompt_inserts_configured_follow_up_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _reset_settings_cache(monkeypatch)
    monkeypatch.setenv("GOAL_EXTRACTION_MAX_FOLLOW_UP_QUESTIONS", "4")
    get_settings.cache_clear()

    prompt = goal_personalization.build_goal_extraction_prompt(
        "Ask at most {{MAX_FOLLOW_UP_QUESTIONS}} follow-up questions."
    )

    assert prompt == "Ask at most 4 follow-up questions."


def test_text_websocket_forces_json_after_follow_up_limit(
    monkeypatch: pytest.MonkeyPatch,
    goal_extractor_module: tuple[Any, type],
) -> None:
    module, fake_client_class = goal_extractor_module
    responses = iter(
        [
            "Which part of LLMs do you want to use at work?",
            "What is your current level with Python and APIs?",
            "How much time can you spend each day?",
            "One more thing: what kind of product surface are you targeting?",
            json.dumps(
                {
                    "goal": "Build LLM product features for fintech workflows",
                    "description": "Learn hosted LLM APIs, retrieval basics, and evaluation for internal fintech tools. "
                    "Skip fine-tuning and deep model theory for now. This is personalized around the user's software "
                    "engineering background and ambition to move toward applied AI work.",
                    "level": "intermediate",
                    "time_per_day_minutes": 30,
                    "context": "The user is a software engineer exploring practical LLM product work.",
                }
            ),
        ]
    )

    def responder(model: str, contents: list[Any], config: Any) -> str:
        return next(responses)

    fake_client_class.text_responder = staticmethod(responder)
    monkeypatch.setattr(module, "_build_system_instruction", lambda user_id: ("prompt", None))

    async def fake_generate_roadmap(goal: dict[str, Any], user_id: str) -> dict[str, Any]:
        assert goal["goal"] == "Build LLM product features for fintech workflows"
        return {"modules": [{"title": "Module 1", "chapters": [{"title": "Intro"}]}]}

    monkeypatch.setattr(module, "_generate_roadmap", fake_generate_roadmap)

    app = FastAPI()
    app.include_router(module.router)

    with TestClient(app) as client:
        with client.websocket_connect("/ws/text?user_id=user-001") as websocket:
            websocket.send_json({"text": "I want to learn LLMs"})
            assert websocket.receive_json()["text"] == "Which part of LLMs do you want to use at work?"

            websocket.send_json({"text": "I want to build fintech copilots"})
            assert websocket.receive_json()["text"] == "What is your current level with Python and APIs?"

            websocket.send_json({"text": "Intermediate with Python and APIs"})
            assert websocket.receive_json()["text"] == "How much time can you spend each day?"

            websocket.send_json({"text": "30 minutes a day"})
            payload = websocket.receive_json()

    assert payload["type"] == "goal_complete"
    assert payload["goal"]["goal"] == "Build LLM product features for fintech workflows"
    assert fake_client_class.generate_calls[-1]["config"].responseMimeType == "application/json"


def test_text_websocket_warns_then_continues(
    monkeypatch: pytest.MonkeyPatch,
    goal_extractor_module: tuple[Any, type],
) -> None:
    module, fake_client_class = goal_extractor_module
    fake_client_class.text_responder = staticmethod(
        lambda model, contents, config: json.dumps(
            {
                "goal": "Learn prompt engineering for support automation",
                "description": "Learn prompting, prompt testing, and lightweight evaluation for support tasks. "
                "Skip model training for now. This is personalized around the user's immediate workflow needs.",
                "level": "beginner",
                "time_per_day_minutes": 20,
                "context": "The user wants to automate support work quickly.",
            }
        )
    )
    warning = "No saved profile was found for user 'user-001'. Continuing without personalization."
    monkeypatch.setattr(module, "_build_system_instruction", lambda user_id: ("prompt", warning))

    async def fake_generate_roadmap(goal: dict[str, Any], user_id: str) -> dict[str, Any]:
        return {"modules": []}

    monkeypatch.setattr(module, "_generate_roadmap", fake_generate_roadmap)

    app = FastAPI()
    app.include_router(module.router)

    with TestClient(app) as client:
        with client.websocket_connect("/ws/text?user_id=user-001") as websocket:
            warning_payload = websocket.receive_json()
            websocket.send_json({"text": "I want to automate support with AI"})
            goal_payload = websocket.receive_json()

    assert warning_payload == {"type": "message", "text": warning}
    assert goal_payload["type"] == "goal_complete"
    assert goal_payload["goal"]["goal"] == "Learn prompt engineering for support automation"


def test_voice_websocket_uses_personalized_prompt(
    monkeypatch: pytest.MonkeyPatch,
    goal_extractor_module: tuple[Any, type],
) -> None:
    module, fake_client_class = goal_extractor_module
    warning = "Could not load your saved profile. Continuing without personalization."
    monkeypatch.setattr(module, "_build_system_instruction", lambda user_id: ("PROMPT WITH PROFILE", warning))

    app = FastAPI()
    app.include_router(module.router)

    with TestClient(app) as client:
        with client.websocket_connect("/ws/voice?user_id=user-001") as websocket:
            payload = websocket.receive_json()

    assert payload == {"type": "message", "text": warning}
    assert fake_client_class.live_connect_calls
    assert fake_client_class.live_connect_calls[0]["config"].systemInstruction == "PROMPT WITH PROFILE"
