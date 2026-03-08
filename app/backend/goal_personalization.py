from __future__ import annotations

import json
from typing import Any, Mapping

from pymongo import MongoClient

from app.config import get_settings

PROMPT_MAX_FOLLOW_UP_QUESTIONS_TOKEN = "{{MAX_FOLLOW_UP_QUESTIONS}}"


def get_max_follow_up_questions() -> int:
    return get_settings().GOAL_EXTRACTION_MAX_FOLLOW_UP_QUESTIONS


def get_max_assistant_question_turns() -> int:
    return 1 + get_max_follow_up_questions()


def build_force_final_json_prompt() -> str:
    return (
        f"You have reached the maximum of {get_max_follow_up_questions()} follow-up questions. "
        "Based on the conversation and any saved profile context already provided, "
        "infer conservatively and return ONLY the final JSON now."
    )


def normalize_user_profile(document: Mapping[str, Any]) -> dict[str, Any]:
    profile: dict[str, Any] = {}

    for key in ("name", "current_role", "industry"):
        value = document.get(key)
        if value:
            profile[key] = str(value).strip()

    expertise_items = []
    for item in document.get("expertise", []) or []:
        if not isinstance(item, Mapping):
            continue
        normalized_item: dict[str, Any] = {}
        for key in ("field", "level", "years_experience", "last_used"):
            value = item.get(key)
            if value not in (None, "", []):
                normalized_item[key] = value
        for key in ("topics_known", "topics_gaps"):
            values = item.get(key)
            if isinstance(values, list):
                clean_values = [
                    str(value).strip() for value in values if str(value).strip()
                ]
                if clean_values:
                    normalized_item[key] = clean_values
        if normalized_item:
            expertise_items.append(normalized_item)
    if expertise_items:
        profile["expertise"] = expertise_items

    ambition_items = []
    for item in document.get("ambitions", []) or []:
        if not isinstance(item, Mapping):
            continue
        normalized_item = {}
        for key in ("goal", "timeline", "motivation"):
            value = item.get(key)
            if value:
                normalized_item[key] = str(value).strip()
        skills = item.get("target_skills")
        if isinstance(skills, list):
            clean_skills = [
                str(value).strip() for value in skills if str(value).strip()
            ]
            if clean_skills:
                normalized_item["target_skills"] = clean_skills
        if normalized_item:
            ambition_items.append(normalized_item)
    if ambition_items:
        profile["ambitions"] = ambition_items

    return profile


def load_user_profile(user_id: str) -> tuple[dict[str, Any] | None, str | None]:
    settings = get_settings()
    if not settings.MONGO_URI:
        return (
            None,
            "Profile personalization is unavailable right now. Continuing without it.",
        )

    client: MongoClient[Any] | None = None
    try:
        client = MongoClient(
            settings.MONGO_URI,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=2000,
        )
        document = client[settings.MONGO_DB][
            settings.MONGO_USER_PROFILES_COLLECTION
        ].find_one({"_id": user_id})
    except Exception as exc:
        print(f"[goal-extractor] user profile lookup failed for {user_id!r}: {exc}")
        return (
            None,
            "Could not load your saved profile. Continuing without personalization.",
        )
    finally:
        if client is not None:
            client.close()

    if not isinstance(document, Mapping):
        return (
            None,
            f"No saved profile was found for user '{user_id}'. Continuing without personalization.",
        )

    profile = normalize_user_profile(document)
    if not profile:
        return (
            None,
            f"No usable personalization context was found for user '{user_id}'. Continuing without personalization.",
        )

    return profile, None


def build_goal_extraction_prompt(
    base_prompt: str, profile: Mapping[str, Any] | None = None
) -> str:
    sections = [
        base_prompt.strip().replace(
            PROMPT_MAX_FOLLOW_UP_QUESTIONS_TOKEN,
            str(get_max_follow_up_questions()),
        )
    ]

    if profile:
        sections.append("Saved profile context:")
        sections.append(json.dumps(dict(profile), separators=(",", ":"), ensure_ascii=True))

    return "\n\n".join(sections).strip()
