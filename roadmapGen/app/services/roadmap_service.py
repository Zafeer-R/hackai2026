from __future__ import annotations

import logging
import re
import time
from typing import Any

from pydantic import ValidationError

from app.providers.base import LLMProvider, LLMProviderError
from app.repository.mongodb import RepositoryError
from app.schemas.api import (
    Chapter,
    EditRoadmapRequest,
    GenerateRoadmapRequest,
    GenerateRoadmapResponse,
    Module,
    GeneratedRoadmapPayload,
    StoredRoadmapResponse,
)
from app.services.prompt_builder import (
    build_edit_system_prompt,
    build_edit_user_prompt,
    build_system_prompt,
    build_user_prompt,
)
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

    def edit(self, request_data: EditRoadmapRequest) -> GenerateRoadmapResponse:
        total_t0 = time.perf_counter()
        system_prompt = build_edit_system_prompt()
        original_roadmap = request_data.roadmap.model_dump()
        user_prompt = build_edit_user_prompt(
            roadmap=original_roadmap,
            instruction=request_data.instruction,
        )
        target_indices = self._extract_target_chapter_indices(
            request_data.instruction,
            request_data.roadmap.modules,
        )

        last_error: Exception | None = None
        max_attempts = self.settings.llm_max_retries + 1
        for attempt in range(max_attempts):
            attempt_t0 = time.perf_counter()
            try:
                logger.debug(
                    "roadmap.edit attempt=%s/%s model=%s",
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
                self._validate_edit_result(
                    original_modules=request_data.roadmap.modules,
                    edited_modules=response.modules,
                    target_indices=target_indices,
                )
                goal = self._get_goal_for_edit(request_data.user_id)
                self.repository.upsert_user_roadmap(
                    user_id=request_data.user_id,
                    goal=goal,
                    modules=[module.model_dump() for module in response.modules],
                )
                elapsed_ms = (time.perf_counter() - attempt_t0) * 1000
                total_ms = (time.perf_counter() - total_t0) * 1000
                logger.info(
                    "roadmap.edit success attempt=%s elapsed_ms=%.1f total_ms=%.1f modules=%s",
                    attempt + 1,
                    elapsed_ms,
                    total_ms,
                    len(response.modules),
                )
                return response
            except RepositoryError:
                raise
            except (LLMProviderError, ValidationError, SemanticValidationError, ValueError) as exc:
                last_error = exc
                elapsed_ms = (time.perf_counter() - attempt_t0) * 1000
                logger.warning(
                    "roadmap.edit retry attempt=%s/%s elapsed_ms=%.1f reason=%s",
                    attempt + 1,
                    max_attempts,
                    elapsed_ms,
                    exc,
                )
                continue

        raise GenerationError(
            f"Failed to edit roadmap in {max_attempts} attempts: {last_error}"
        )

    def generate_dict(self, goal: str, user_id: str) -> dict:
        """Pydantic-free version of generate(). Returns a plain dict."""
        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(goal=goal)

        last_error: Exception | None = None
        max_attempts = self.settings.llm_max_retries + 1
        for attempt in range(max_attempts):
            try:
                raw_payload = self.provider.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
                modules = []
                for m in raw_payload.get("modules", [])[:7]:
                    title = str(m.get("title", "")).strip()[:140] or "Untitled Module"
                    chapters = [
                        {"title": str(c.get("title", "")).strip()[:140]}
                        for c in m.get("chapters", [])
                        if str(c.get("title", "")).strip()
                    ][:4]
                    if not chapters:
                        chapters = [{"title": f"Core concepts of {title}"}]
                    modules.append({"title": title, "chapters": chapters})

                self.repository.upsert_user_roadmap(
                    user_id=user_id,
                    goal=goal,
                    modules=modules,
                )
                return {"modules": modules}
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(
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

    def _get_goal_for_edit(self, user_id: str) -> str:
        try:
            document = self.repository.get_user_roadmap(user_id)
        except RepositoryError:
            raise
        if document and isinstance(document.get("goal"), str) and document["goal"].strip():
            return document["goal"].strip()
        return "Edited roadmap"

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

    def _extract_target_chapter_indices(
        self,
        instruction: str,
        modules: list[Module],
    ) -> set[int]:
        chapter_count = sum(len(module.chapters) for module in modules)
        matches = re.findall(r"\bchapters?\s*(\d+)\b", instruction, flags=re.IGNORECASE)
        if not matches:
            raise ValueError("Edit instruction must reference at least one chapter number.")

        indices = {int(match) - 1 for match in matches}
        if any(index < 0 or index >= chapter_count for index in indices):
            raise ValueError("Edit instruction referenced a chapter number outside the roadmap.")
        return indices

    def _validate_edit_result(
        self,
        *,
        original_modules: list[Module],
        edited_modules: list[Module],
        target_indices: set[int],
    ) -> None:
        if len(original_modules) != len(edited_modules):
            raise SemanticValidationError("Edited roadmap changed the module count")

        flat_index = 0
        for original_module, edited_module in zip(original_modules, edited_modules):
            if original_module.title != edited_module.title:
                raise SemanticValidationError("Edited roadmap changed a module title")
            if len(original_module.chapters) != len(edited_module.chapters):
                raise SemanticValidationError(
                    f"Edited roadmap changed chapter count for module '{original_module.title}'"
                )

            for original_chapter, edited_chapter in zip(original_module.chapters, edited_module.chapters):
                if flat_index not in target_indices and original_chapter.title != edited_chapter.title:
                    raise SemanticValidationError(
                        f"Edited roadmap changed untouched chapter '{original_chapter.title}'"
                    )
                flat_index += 1
