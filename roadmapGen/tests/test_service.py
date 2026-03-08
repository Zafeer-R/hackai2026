import pytest

from app.core.config import Settings
from app.providers.base import LLMProviderError
from app.services.roadmap_service import GenerationError, RoadmapNotFoundError, RoadmapService


class InMemoryRepository:
    def __init__(self) -> None:
        self.docs: dict[str, dict] = {}

    def upsert_user_roadmap(self, *, user_id: str, goal: str, modules: list[dict]) -> None:
        self.docs[user_id] = {"userId": user_id, "goal": goal, "modules": modules}

    def get_user_roadmap(self, user_id: str) -> dict | None:
        return self.docs.get(user_id)


class FlakyProvider:
    def __init__(self, payload: dict, fail_count: int = 1) -> None:
        self.payload = payload
        self.fail_count = fail_count
        self.calls = 0

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        self.calls += 1
        if self.calls <= self.fail_count:
            raise LLMProviderError("simulated malformed output")
        return self.payload


def test_retry_behavior(valid_generated_payload: dict) -> None:
    from app.schemas.api import GenerateRoadmapRequest

    provider = FlakyProvider(valid_generated_payload, fail_count=1)
    settings = Settings(LLM_MAX_RETRIES=2)
    repository = InMemoryRepository()
    service = RoadmapService(settings=settings, provider=provider, repository=repository)

    request = GenerateRoadmapRequest.model_validate(
        {"userId": "user-1", "goal": "Kubernetes operators"}
    )
    response = service.generate(request)

    assert provider.calls == 2
    assert len(response.modules) >= 1
    assert "user-1" in repository.docs


def test_generation_fails_after_retry_limit(valid_generated_payload: dict) -> None:
    from app.schemas.api import GenerateRoadmapRequest

    provider = FlakyProvider(valid_generated_payload, fail_count=10)
    settings = Settings(LLM_MAX_RETRIES=1)
    service = RoadmapService(settings=settings, provider=provider, repository=InMemoryRepository())
    request = GenerateRoadmapRequest.model_validate(
        {"userId": "user-2", "goal": "Kubernetes operators"}
    )

    with pytest.raises(GenerationError):
        service.generate(request)
    assert provider.calls == 2


def test_service_trims_long_titles() -> None:
    from app.schemas.api import GenerateRoadmapRequest

    long = "x" * 200
    broken = {"modules": [{"title": long, "chapters": [{"title": long}]}]}
    provider = FlakyProvider(broken, fail_count=0)
    settings = Settings(LLM_MAX_RETRIES=0)
    service = RoadmapService(settings=settings, provider=provider, repository=InMemoryRepository())
    request = GenerateRoadmapRequest.model_validate({"userId": "user-3", "goal": "xxxxxxxxxx"})

    response = service.generate(request)
    assert len(response.modules[0].title) <= 140
    assert len(response.modules[0].chapters[0].title) <= 140


def test_get_by_user_not_found(valid_generated_payload: dict) -> None:
    provider = FlakyProvider(valid_generated_payload, fail_count=0)
    service = RoadmapService(settings=Settings(), provider=provider, repository=InMemoryRepository())
    with pytest.raises(RoadmapNotFoundError):
        service.get_by_user("missing")
