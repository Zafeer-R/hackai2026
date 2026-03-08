from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_roadmap_service
from app.main import create_app
from app.services.roadmap_service import RoadmapService


class StaticProvider:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls = 0

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        self.calls += 1
        return self.payload


class InMemoryRepository:
    def __init__(self) -> None:
        self.docs: dict[str, dict] = {}

    def upsert_user_roadmap(self, *, user_id: str, goal: str, modules: list[dict]) -> None:
        self.docs[user_id] = {
            "userId": user_id,
            "goal": goal,
            "modules": modules,
            "updatedAt": "2026-01-01T00:00:00Z",
        }

    def get_user_roadmap(self, user_id: str) -> dict | None:
        return self.docs.get(user_id)


@pytest.fixture
def valid_generated_payload() -> dict:
    return {
        "modules": [
            {
                "title": "Operator Foundations",
                "chapters": [
                    {"title": "Controller pattern basics"},
                    {"title": "CRD design essentials"},
                ],
            },
            {
                "title": "Operator Delivery",
                "chapters": [
                    {"title": "Reconciliation logic in Go"},
                    {"title": "Testing and deployment"},
                ],
            },
        ]
    }


@pytest.fixture
def client_with_service(
    valid_generated_payload: dict,
) -> Iterator[tuple[TestClient, StaticProvider, InMemoryRepository]]:
    from app.core.config import Settings

    provider = StaticProvider(valid_generated_payload)
    repository = InMemoryRepository()
    settings = Settings()
    service = RoadmapService(settings=settings, provider=provider, repository=repository)

    app = create_app()
    app.dependency_overrides[get_roadmap_service] = lambda: service
    with TestClient(app) as client:
        yield client, provider, repository
