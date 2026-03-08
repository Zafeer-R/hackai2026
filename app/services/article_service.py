"""
1. Tavily       → search + extract full article text (include_raw_content)
2. Gemini       → summarise to 3 focused sentences, expertise-appropriate

Falls back to the Tavily snippet if raw_content or Gemini fail.
"""
from __future__ import annotations
from typing import Optional

from tavily import AsyncTavilyClient
from google import genai
from google.genai import types

from functools import lru_cache

from app.config import get_settings


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    return genai.Client(api_key=get_settings().GEMINI_API_KEY)


_RAW_CONTENT_MAX_CHARS = 4000  # enough context for a good summary; avoids token bloat
_SKIP_DOMAINS = ["youtube.com", "reddit.com", "quora.com", "stackoverflow.com"]


async def find_article(query: str, expertise: str, chapter_title: str) -> Optional[dict]:
    # 1. Tavily search + raw_content extraction in a single call
    result = await _search(query)
    if not result:
        return None

    url    = result.get("url", "")
    title  = result.get("title", "")
    source = url.split("/")[2].replace("www.", "") if url else ""

    # 2. Gemini → 3-sentence summary, or fall back to Tavily snippet
    raw_text = (result.get("raw_content") or "")[:_RAW_CONTENT_MAX_CHARS].strip()
    if raw_text:
        summary = await _summarise(raw_text, chapter_title, expertise)
    else:
        summary = (result.get("content") or "")[:400]

    read_time = max(1, round(len(summary.split()) / 200))

    return {
        "title": title,
        "url": url,
        "source": source,
        "summary": summary,
        "estimated_read_time": f"{read_time} min",
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _search(query: str) -> Optional[dict]:
    """Search via Tavily and return the first result with raw_content."""
    try:
        client = AsyncTavilyClient(api_key=get_settings().TAVILY_API_KEY)
        response = await client.search(
            query=query,
            max_results=5,
            include_raw_content=True,
            exclude_domains=_SKIP_DOMAINS,
        )
        results = response.get("results", [])
        return results[0] if results else None
    except Exception as e:
        print(f"[Article] Tavily search failed: {e}")
        return None


async def _summarise(text: str, chapter_title: str, expertise: str) -> str:
    client = _get_client()

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
