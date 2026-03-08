from functools import lru_cache

from .config import get_settings
from ..providers.gemini import GeminiProvider
from ..repository.mongodb import MongoRoadmapRepository
from ..services.roadmap_service import RecommendationService, RoadmapService


@lru_cache
def get_repository() -> MongoRoadmapRepository:
    settings = get_settings()
    return MongoRoadmapRepository(settings=settings)


def _get_provider() -> GeminiProvider:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is required")
    return GeminiProvider(
        base_url=settings.gemini_base_url,
        api_key=settings.gemini_api_key,
        model_name=settings.model_name,
        timeout_sec=settings.llm_timeout_sec,
    )


@lru_cache
def get_roadmap_service() -> RoadmapService:
    settings = get_settings()
    provider = _get_provider()
    repository = get_repository()
    return RoadmapService(settings=settings, provider=provider, repository=repository)


@lru_cache
def get_recommendation_service() -> RecommendationService:
    settings = get_settings()
    provider = _get_provider()
    repository = get_repository()
    return RecommendationService(settings=settings, provider=provider, repository=repository)
