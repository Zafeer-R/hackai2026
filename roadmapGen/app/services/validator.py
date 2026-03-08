from __future__ import annotations

import re
from collections import Counter
from typing import Protocol


class HasTitle(Protocol):
    title: str


class HasChapters(Protocol):
    title: str
    chapters: list[HasTitle]


class SemanticValidationError(ValueError):
    pass


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def validate_roadmap_semantics(goal: str, modules: list[HasChapters]) -> list[str]:
    flags: list[str] = []
    module_count = len(modules)

    if module_count > 7:
        raise SemanticValidationError("Roadmap has more than 7 modules")

    if module_count > 5:
        flags.append("module_overflow_used")

    _validate_unique_module_intent(modules)
    _validate_chapter_progression(modules)
    _validate_goal_coverage(goal, modules)

    return flags


def _validate_unique_module_intent(modules: list[HasChapters]) -> None:
    normalized_titles = [_normalize_text(module.title) for module in modules]
    duplicates = [title for title, count in Counter(normalized_titles).items() if count > 1]
    if duplicates:
        raise SemanticValidationError(f"Duplicate module intent detected: {duplicates[0]}")


def _validate_chapter_progression(modules: list[HasChapters]) -> None:
    chapter_titles: list[str] = []
    for module in modules:
        if len(module.chapters) > 4:
            raise SemanticValidationError(f"Module '{module.title}' has more than 4 chapters")
        for chapter in module.chapters:
            chapter_titles.append(_normalize_text(chapter.title))

    duplicate_chapters = [title for title, count in Counter(chapter_titles).items() if count > 1]
    if duplicate_chapters:
        raise SemanticValidationError(f"Duplicate chapter title detected: {duplicate_chapters[0]}")


def _validate_goal_coverage(goal: str, modules: list[HasChapters]) -> None:
    goal_tokens = {token for token in _normalize_text(goal).split() if len(token) > 2}
    if not goal_tokens:
        return

    coverage_text = " ".join(
        f"{module.title} " + " ".join(chapter.title for chapter in module.chapters)
        for module in modules
    )
    normalized_coverage = _normalize_text(coverage_text)

    def token_matches(token: str) -> bool:
        variants = {token}
        if token.endswith("es") and len(token) > 4:
            variants.add(token[:-2])
        if token.endswith("s") and len(token) > 3:
            variants.add(token[:-1])
        return any(variant and variant in normalized_coverage for variant in variants)

    matched = [token for token in goal_tokens if token_matches(token)]
    if not matched:
        raise SemanticValidationError("Roadmap does not appear to cover the requested goal")
