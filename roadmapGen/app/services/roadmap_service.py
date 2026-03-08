from __future__ import annotations

import logging
import time
from typing import Any

from pydantic import ValidationError

from app.core.config import Settings
from app.providers.base import LLMProvider, LLMProviderError
from app.repository.mongodb import RepositoryError
from app.schemas.api import (
    Chapter,
    GenerateRoadmapRequest,
    GenerateRoadmapResponse,
    Module,
    GeneratedRoadmapPayload,
    StoredRoadmapResponse,
)
from app.services.prompt_builder import build_system_prompt, build_user_prompt
from app.services.validator import SemanticValidationError, validate_roadmap_semantics

logger = logging.getLogger(__name__)


class GenerationError(RuntimeError):
    pass


class RoadmapNotFoundError(RuntimeError):
    pass


class RoadmapService:
    def __init__(self, *, settings: Settings, provider: LLMProvider, repository: Any) -> None:
        self.settings = settings
        self.provider = provider
        self.repository = repository

    def generate(self, request_data: GenerateRoadmapRequest) -> GenerateRoadmapResponse:
        total_t0 = time.perf_counter()
        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(goal=request_data.goal)

        last_error: Exception | None = None
        max_attempts = self.settings.llm_max_retries + 1
        for attempt in range(max_attempts):
            attempt_t0 = time.perf_counter()
            try:
                logger.debug(
                    "roadmap.generate attempt=%s/%s model=%s",
                    attempt + 1,
                    max_attempts,
                    self.settings.model_name,
                )
                raw_payload = self.provider.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
                payload = GeneratedRoadmapPayload.model_validate(raw_payload)
                response = self._normalize_and_build_response(payload)
                validate_roadmap_semantics(request_data.goal, response.modules)
                self.repository.upsert_user_roadmap(
                    user_id=request_data.user_id,
                    goal=request_data.goal,
                    modules=[module.model_dump() for module in response.modules],
                )
                elapsed_ms = (time.perf_counter() - attempt_t0) * 1000
                total_ms = (time.perf_counter() - total_t0) * 1000
                logger.info(
                    "roadmap.generate success attempt=%s elapsed_ms=%.1f total_ms=%.1f modules=%s",
                    attempt + 1,
                    elapsed_ms,
                    total_ms,
                    len(response.modules),
                )
                return response
            except RepositoryError:
                raise
            except (LLMProviderError, ValidationError, SemanticValidationError) as exc:
                last_error = exc
                elapsed_ms = (time.perf_counter() - attempt_t0) * 1000
                logger.warning(
                    "roadmap.generate retry attempt=%s/%s elapsed_ms=%.1f reason=%s",
                    attempt + 1,
                    max_attempts,
                    elapsed_ms,
                    exc,
                )
                continue

        raise GenerationError(
            f"Failed to generate a valid roadmap in {max_attempts} attempts: {last_error}"
        )

    def get_by_user(self, user_id: str) -> StoredRoadmapResponse:
        try:
            document = self.repository.get_user_roadmap(user_id)
        except RepositoryError:
            raise
        if not document:
            raise RoadmapNotFoundError(f"No roadmap found for userId '{user_id}'")
        return StoredRoadmapResponse.model_validate(document)

    def _normalize_and_build_response(
        self, payload: GeneratedRoadmapPayload
    ) -> GenerateRoadmapResponse:
        modules: list[Module] = []
        for generated_module in payload.modules[:7]:
            module_title = generated_module.title[:140].strip()
            if not module_title:
                module_title = "Untitled Module"
            chapter_titles = [
                chapter.title[:140].strip()
                for chapter in generated_module.chapters
                if chapter.title.strip()
            ]
            if not chapter_titles:
                chapter_titles = [f"Core concepts of {module_title}"]
            chapter_titles = chapter_titles[:4]
            modules.append(
                Module(
                    title=module_title,
                    chapters=[Chapter(title=chapter_title) for chapter_title in chapter_titles],
                )
            )
        return GenerateRoadmapResponse(modules=modules)
