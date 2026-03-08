from functools import lru_cache

from app.core.config import get_settings
from app.providers.gemini import GeminiProvider
from app.repository.mongodb import MongoRoadmapRepository
from app.services.roadmap_service import RoadmapService


@lru_cache
def get_repository() -> MongoRoadmapRepository:
    settings = get_settings()
    return MongoRoadmapRepository(settings=settings)


@lru_cache
def get_roadmap_service() -> RoadmapService:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is required")
    provider = GeminiProvider(
        base_url=settings.gemini_base_url,
        api_key=settings.gemini_api_key,
        model_name=settings.model_name,
        timeout_sec=settings.llm_timeout_sec,
    )
    repository = get_repository()
    return RoadmapService(settings=settings, provider=provider, repository=repository)
