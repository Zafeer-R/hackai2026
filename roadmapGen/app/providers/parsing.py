from __future__ import annotations

import json
import re
from typing import Any

from app.providers.base import LLMProviderError


def parse_json_content(content: Any) -> dict:
    if isinstance(content, dict):
        return content

    if not isinstance(content, str):
        raise LLMProviderError("Model content is not a JSON object or string")

    text = content.strip()
    if not text:
        raise LLMProviderError("Model content is empty")

    for candidate in _candidate_json_strings(text):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    raise LLMProviderError("Model response was not valid JSON object content")


def _candidate_json_strings(text: str) -> list[str]:
    candidates = [text]

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.IGNORECASE | re.DOTALL)
    if fenced:
        candidates.append(fenced.group(1).strip())

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidates.append(text[first_brace : last_brace + 1].strip())

    seen: set[str] = set()
    unique: list[str] = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique
