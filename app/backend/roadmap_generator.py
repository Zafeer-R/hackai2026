from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from pymongo import MongoClient

from app.config import get_settings


def _parse_json_content(content: Any) -> dict:
    if isinstance(content, dict):
        return content
    text = content.strip() if isinstance(content, str) else ""
    candidates = [text]
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.IGNORECASE | re.DOTALL)
    if fenced:
        candidates.append(fenced.group(1).strip())
    first, last = text.find("{"), text.rfind("}")
    if first != -1 and last > first:
        candidates.append(text[first:last + 1].strip())
    for c in candidates:
        try:
            parsed = json.loads(c)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("Gemini response was not valid JSON")


def _call_gemini(goal: str) -> dict:
    s = get_settings()
    max_mod = s.ROADMAP_MAX_MODULES
    max_ch = s.ROADMAP_MAX_CHAPTERS_PER_MODULE
    system_prompt = (
        "You are a roadmap generation engine. Return valid JSON only.\n"
        "Rules:\n"
        "1) The topic is specific and niche. Produce an actionable roadmap.\n"
        '2) Output ONLY this shape: {"modules": [{"title": "...", "chapters": [{"title": "..."}]}]}.\n'
        "3) No keys outside modules/title/chapters.\n"
        f"4) Generate EXACTLY {max_mod} modules — no more, no less.\n"
        f"5) Each module must have EXACTLY {max_ch} chapters — no more, no less.\n"
        "6) No sub-chapters and no long explanations.\n"
    )
    user_prompt = json.dumps({
        "goal": goal,
        "required_response_schema": {"modules": [{"title": "string", "chapters": [{"title": "string"}]}]},
    })
    endpoint = f"{s.GEMINI_BASE_URL}/models/{s.MODEL_NAME}:generateContent?key={s.GEMINI_API_KEY}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json", "maxOutputTokens": 1800},
    }
    with httpx.Client(timeout=s.LLM_TIMEOUT_SEC) as client:
        response = client.post(endpoint, json=payload)
    response.raise_for_status()
    data = response.json()
    content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
    if not content:
        raise ValueError("Gemini response did not include text content")
    return _parse_json_content(content)


def _normalize(raw: dict) -> list[dict]:
    s = get_settings()
    modules = []
    for m in raw.get("modules", [])[:s.ROADMAP_MAX_MODULES]:
        title = str(m.get("title", "")).strip()[:140] or "Untitled Module"
        chapters = [
            {"title": str(c.get("title", "")).strip()[:140]}
            for c in m.get("chapters", [])
            if str(c.get("title", "")).strip()
        ][:s.ROADMAP_MAX_CHAPTERS_PER_MODULE]
        if not chapters:
            chapters = [{"title": f"Core concepts of {title}"}]
        modules.append({"title": title, "chapters": chapters})
    return modules


def _upsert_roadmap(user_id: str, goal: str, modules: list[dict]) -> None:
    s = get_settings()
    if not s.MONGO_URI:
        return
    client = MongoClient(s.MONGO_URI, tlsAllowInvalidCertificates=True)
    col = client[s.MONGO_DB][s.MONGO_COLLECTION]
    col.update_one(
        {"_id": user_id},
        {"$set": {"_id": user_id, "userId": user_id, "goal": goal, "modules": modules, "updatedAt": datetime.now(timezone.utc)}},
        upsert=True,
    )


def generate_roadmap(goal: str, user_id: str) -> dict:
    """Generate a roadmap for the given goal and persist it. Returns plain dict."""
    s = get_settings()
    last_error: Exception | None = None
    for _ in range(s.LLM_MAX_RETRIES + 1):
        try:
            raw = _call_gemini(goal)
            modules = _normalize(raw)
            _upsert_roadmap(user_id, goal, modules)
            return {"modules": modules}
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Roadmap generation failed after retries: {last_error}")
