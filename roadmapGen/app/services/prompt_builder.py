from __future__ import annotations

import json


def build_system_prompt() -> str:
    return (
        "You are a roadmap generation engine. Return valid JSON only.\n"
        "Rules:\n"
        "1) The topic is specific and niche. Produce an actionable roadmap.\n"
        "2) Output ONLY this shape: {\"modules\": [{\"title\": \"...\", \"chapters\": [{\"title\": \"...\"}]}]}.\n"
        "3) No keys outside modules/title/chapters.\n"
        "4) Prefer <= 5 modules; each module must have 1-4 chapters.\n"
        "5) If topic complexity needs it, you may use up to 7 modules.\n"
        "6) No sub-chapters and no long explanations.\n"
    )


def build_user_prompt(*, goal: str) -> str:
    envelope = {
        "goal": goal,
        "required_response_schema": {
            "modules": [
                {
                    "title": "string",
                    "chapters": [{"title": "string"}],
                }
            ]
        },
    }
    return json.dumps(envelope, indent=2)


def build_edit_system_prompt() -> str:
    return (
        "You are a roadmap editor. Return valid JSON only.\n"
        "Rules:\n"
        "1) Output ONLY this shape: {\"modules\": [{\"title\": \"...\", \"chapters\": [{\"title\": \"...\"}]}]}.\n"
        "2) Keep the same module count, chapter count per module, module order, and chapter order.\n"
        "3) Keep all module titles identical.\n"
        "4) Only change the chapter title or titles needed to satisfy the user's edit instruction.\n"
        "5) Leave every untouched chapter title exactly unchanged.\n"
        "6) No extra keys, no explanations, no notes.\n"
    )


def build_edit_user_prompt(*, roadmap: dict, instruction: str) -> str:
    envelope = {
        "instruction": instruction,
        "existing_roadmap": roadmap,
        "required_response_schema": {
            "modules": [
                {
                    "title": "string",
                    "chapters": [{"title": "string"}],
                }
            ]
        },
    }
    return json.dumps(envelope, indent=2)
