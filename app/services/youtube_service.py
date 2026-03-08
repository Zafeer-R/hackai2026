"""
Finds the best YouTube video for a chapter using:
  - YouTube Data API v3 for search + statistics
  - returnyoutubedislike.com for estimated dislike counts

Scoring:  score = like_ratio * 0.6 + normalised_views * 0.4

Start-time detection (hybrid):
  1. Parse timestamps from the video description (free, instant)
     e.g. "2:34 useState explained" → match against chapter title/key_concepts
  2. Fallback: youtube-transcript-api + Gemini to find the relevant second
"""
from __future__ import annotations
import asyncio
import math
import re
from typing import Optional

import httpx
from googleapiclient.discovery import build
from google import genai
from google.genai import types

from functools import lru_cache

from app.config import get_settings


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    return genai.Client(api_key=get_settings().GEMINI_API_KEY)


_RYD_BASE    = "https://returnyoutubedislikeapi.com/votes"
_TS_PATTERN  = re.compile(r"(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)")


# ── Scoring ────────────────────────────────────────────────────────────────────

def _score(likes: int, dislikes: int, views: int) -> float:
    total_votes = likes + dislikes
    like_ratio  = likes / total_votes if total_votes > 0 else 0.5
    view_score  = math.log10(views + 1) / 8
    return round(like_ratio * 0.6 + view_score * 0.4, 4)


# ── Start-time: description chapters ──────────────────────────────────────────

def _ts_to_seconds(ts: str) -> int:
    parts = ts.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])


def _start_from_description(
    description: str, chapter_title: str, key_concepts: list[str]
) -> Optional[int]:
    """
    Parse chapter timestamps from the video description.
    Returns the start second of the best-matching chapter, or None if
    the video has no chapters or none match.
    """
    matches = _TS_PATTERN.findall(description)
    if len(matches) < 2:
        return None   # not a chaptered video

    chapters = [(_ts_to_seconds(ts), label.strip()) for ts, label in matches]

    query_terms = set(
        re.sub(r"[^\w\s]", "", (chapter_title + " " + " ".join(key_concepts)).lower()).split()
    )

    best_score, best_seconds = 0, None
    for seconds, label in chapters:
        label_terms = set(re.sub(r"[^\w\s]", "", label.lower()).split())
        score = len(query_terms & label_terms)
        if score > best_score:
            best_score, best_seconds = score, seconds

    return best_seconds   # None if no term overlap → triggers transcript fallback


# ── Start-time: transcript + Gemini fallback ───────────────────────────────────

def _fetch_transcript(video_id: str) -> Optional[list[dict]]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        return YouTubeTranscriptApi.get_transcript(video_id)
    except Exception:
        return None


async def _start_from_transcript(
    video_id: str, chapter_title: str, key_concepts: list[str]
) -> int:
    """Fetch captions, sample them, ask Gemini for the most relevant second."""
    transcript = await asyncio.to_thread(_fetch_transcript, video_id)
    if not transcript:
        return 0

    # Every 4th entry, capped at 80 lines — enough context, minimal tokens
    lines = [f"[{int(e['start'])}s] {e['text']}" for e in transcript[::4][:80]]

    client = _get_client()

    prompt = (
        f"Transcript of a YouTube video (every 4th caption shown):\n"
        f"{chr(10).join(lines)}\n\n"
        f"At what second does the explanation of '{chapter_title}' "
        f"(key concepts: {', '.join(key_concepts)}) begin?\n"
        f"Return ONLY a single integer (seconds). Return 0 if not found."
    )

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0, max_output_tokens=10),
        )
        return max(0, int(response.text.strip()))
    except Exception:
        return 0


# ── YouTube API ────────────────────────────────────────────────────────────────

async def _get_dislikes(video_ids: list[str]) -> dict[str, int]:
    async def fetch_one(client: httpx.AsyncClient, vid: str) -> tuple[str, int]:
        try:
            r = await client.get(_RYD_BASE, params={"videoId": vid}, timeout=5)
            return vid, r.json().get("dislikes", 0)
        except Exception:
            return vid, 0

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[fetch_one(client, v) for v in video_ids])
    return dict(results)


def _search_and_stats(api_key: str, query: str) -> list[dict]:
    yt = build("youtube", "v3", developerKey=api_key)

    search_resp = (
        yt.search()
        .list(
            q=query,
            part="id,snippet",
            type="video",
            videoDuration="medium",
            maxResults=10,
            relevanceLanguage="en",
            safeSearch="strict",
        )
        .execute()
    )

    video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]
    if not video_ids:
        return []

    stats_resp = (
        yt.videos()
        .list(part="statistics,contentDetails,snippet", id=",".join(video_ids))
        .execute()
    )

    videos = []
    for item in stats_resp.get("items", []):
        stats   = item.get("statistics", {})
        snippet = item.get("snippet", {})
        details = item.get("contentDetails", {})
        videos.append({
            "video_id":    item["id"],
            "title":       snippet.get("title", ""),
            "channel":     snippet.get("channelTitle", ""),
            "thumbnail":   snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            "duration":    details.get("duration", ""),
            "description": snippet.get("description", ""),  # for chapter timestamp parsing
            "views": int(stats.get("viewCount", 0)),
            "likes": int(stats.get("likeCount", 0)),
        })
    return videos


# ── Public API ─────────────────────────────────────────────────────────────────

async def find_best_video(
    query: str,
    chapter_title: str,
    key_concepts: list[str],
) -> Optional[dict]:
    settings = get_settings()

    candidates   = await asyncio.to_thread(_search_and_stats, settings.YOUTUBE_API_KEY, query)
    if not candidates:
        return None

    video_ids    = [v["video_id"] for v in candidates]
    dislikes_map = await _get_dislikes(video_ids)

    best     = max(candidates, key=lambda v: _score(v["likes"], dislikes_map.get(v["video_id"], 0), v["views"]))
    dislikes = dislikes_map.get(best["video_id"], 0)

    # ── Hybrid start-time detection ───────────────────────────────────────────
    start_seconds = _start_from_description(best["description"], chapter_title, key_concepts)
    if start_seconds is None:
        start_seconds = await _start_from_transcript(best["video_id"], chapter_title, key_concepts)

    return {
        "video_id":      best["video_id"],
        "url":           f"https://www.youtube.com/watch?v={best['video_id']}&t={start_seconds}",
        "title":         best["title"],
        "channel":       best["channel"],
        "duration":      best["duration"],
        "thumbnail":     best["thumbnail"],
        "views":         best["views"],
        "likes":         best["likes"],
        "dislikes":      dislikes,
        "score":         _score(best["likes"], dislikes, best["views"]),
        "start_seconds": start_seconds,
    }
