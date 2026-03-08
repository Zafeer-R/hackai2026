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
