"""
1. DuckDuckGo  → find best article URL (no API key)
2. Jina Reader → extract clean full text from URL (r.jina.ai, free, no key)
3. Gemini      → summarise to 3 focused sentences, expertise-appropriate

Falls back to the DuckDuckGo snippet if Jina or Gemini fail.
"""
from __future__ import annotations
import asyncio
from typing import Optional

import httpx
from duckduckgo_search import DDGS
from google import genai
from google.genai import types

from app.config import get_settings

_JINA_BASE = "https://r.jina.ai/"
_JINA_MAX_CHARS = 4000   # enough context for a good summary; avoids token bloat
_SKIP_DOMAINS = ("youtube.com", "reddit.com", "quora.com", "stackoverflow.com")


async def find_article(query: str, expertise: str, chapter_title: str) -> Optional[dict]:
    # 1. Search
    result = await asyncio.to_thread(_search, query)
    if not result:
        return None

    url    = result.get("href", "")
    title  = result.get("title", "")
    source = url.split("/")[2].replace("www.", "") if url else ""

    # 2. Jina Reader → full article text
    raw_text = await _fetch_jina(url)

    # 3. Gemini → 3-sentence summary, or fall back to DDG snippet
    if raw_text:
        summary = await _summarise(raw_text, chapter_title, expertise)
    else:
        summary = result.get("body", "")[:400]

    read_time = max(1, round(len(summary.split()) / 200))

    return {
        "title": title,
        "url": url,
        "source": source,
        "summary": summary,
        "estimated_read_time": f"{read_time} min",
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _search(query: str) -> Optional[dict]:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        for r in results:
            if not any(s in r.get("href", "") for s in _SKIP_DOMAINS):
                return r
        return results[0] if results else None
    except Exception as e:
        print(f"[Article] DDG search failed: {e}")
        return None


async def _fetch_jina(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{_JINA_BASE}{url}",
                headers={"Accept": "text/plain"},
                follow_redirects=True,
            )
            r.raise_for_status()
            return r.text[:_JINA_MAX_CHARS].strip()
    except Exception as e:
        print(f"[Jina] Failed for {url}: {e}")
        return None


async def _summarise(text: str, chapter_title: str, expertise: str) -> str:
    settings = get_settings()
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = (
        f"Summarise the article below for a {expertise} learner studying '{chapter_title}'.\n"
        f"Write exactly 3 sentences:\n"
        f"  1. What the article is about\n"
        f"  2. The key insight most relevant to '{chapter_title}'\n"
        f"  3. One practical takeaway\n"
        f"Use {expertise}-appropriate language. No filler phrases.\n\n"
        f"Article:\n{text}\n\n"
        f"Summary:"
    )

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=150,
            ),
        )
        return response.text.strip()
    except Exception as e:
        print(f"[Article] Gemini summarise failed: {e}")
        return text[:400]
