"""
API routes:
  POST /api/v1/module/generate     — generate a focused module for a single subtopic
  GET  /api/v1/module/{id}         — get current module state (video status updates here)
  GET  /api/v1/module/{id}/stream  — SSE stream for Veo video_ready events
"""
from __future__ import annotations
import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sse_starlette.sse import EventSourceResponse

import app.store as store
from app.config import get_settings
from app.models.course import ModuleRequest
from app.services import (
    article_service,
    audio_service,
    gemini_service,
    imagen_service,
    veo_service,
    youtube_service,
)

router = APIRouter()


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/module/generate", response_model=None, status_code=201)
async def generate_module(request: ModuleRequest, background_tasks: BackgroundTasks):
    """
    Generates a focused learning module for a single subtopic.

    All content except the Veo clip is returned synchronously.
    Subscribe to the SSE stream endpoint to receive the video URL when Veo finishes.
    """
    # 1. Gemini → single module outline (title, summary, quiz, prompts, search queries)
    outline = await gemini_service.generate_module_outline(request.subtopic, request.expertise, request.language)

    module_id = str(uuid.uuid4())

    # 2. Enrich all content in parallel
    yt, article, meme_b64, song = await asyncio.gather(
        youtube_service.find_best_video(
            outline["youtube_search_query"],
            chapter_title=outline["title"],
            key_concepts=outline["key_concepts"],
        ),
        article_service.find_article(
            outline["article_search_query"],
            expertise=request.expertise,
            chapter_title=outline["title"],
        ),
        imagen_service.generate_meme(outline["meme_prompt"], outline["title"]),
        audio_service.generate_song(outline["song_lyrics"], outline["title"]),
        return_exceptions=True,
    )

    def _safe(val):
        return None if isinstance(val, Exception) else val

    meme = (
        {"image_b64": meme_b64, "prompt_used": outline["meme_prompt"]}
        if _safe(meme_b64) else None
    )

    # 3. Assemble
    module = {
        "id": module_id,
        "subtopic": request.subtopic,
        "expertise": request.expertise,
        "language": request.language,
        "title": outline["title"],
        "summary": outline["summary"],
        "key_concepts": outline["key_concepts"],
        "content": {
            "video": {
                "status": "disabled" if not get_settings().ENABLE_VEO else "generating",
                "url": None,
                "job_id": None,
            },
            "youtube": _safe(yt),
            "meme": meme,
            "article": _safe(article),
            "song": _safe(song),
        },
        "quiz": outline["quiz"],
        "learn_more": outline["learn_more"],
        "stream_url": f"/api/v1/module/{module_id}/stream",
    }

    # 4. Persist
    store.save_course(module_id, module)

    # 5. Kick off Veo background task (single video for this module)
    if get_settings().ENABLE_VEO:
        store.create_queue(module_id)
        background_tasks.add_task(
            veo_service.generate_video_background,
            module_id,
            1,                          # always chapter slot 1 for a module
            outline["video_prompt"],
        )

    return module


@router.get("/module/{module_id}")
async def get_module(module_id: str):
    """
    Returns the current module state.
    Check `content.video.status`:
      - "generating" → Veo still running
      - "ready"      → video URL is populated
      - "failed"     → Veo failed, use YouTube instead
      - "disabled"   → ENABLE_VEO=false, no video generated
    """
    module = store.get_course(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module


@router.get("/module/{module_id}/stream")
async def stream_module(module_id: str):
    """
    SSE stream. Connect immediately after POST /module/generate.

    Events:
      video_ready  — { chapter: 1, video_url: str }
      video_failed — { chapter: 1 }
      all_complete — { course_id: str }
      ping         — {} (keep-alive every 120 s)
    """
    if not store.get_course(module_id):
        raise HTTPException(status_code=404, detail="Module not found")

    queue = store.get_queue(module_id)
    if not queue:
        async def _empty():
            yield {"event": "all_complete", "data": json.dumps({"course_id": module_id})}
        return EventSourceResponse(_empty())

    async def _generator() -> AsyncGenerator:
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=120)
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
                    continue

                yield {"event": event["event"], "data": json.dumps(event["data"])}

                if event["event"] == "all_complete":
                    store.remove_queue(module_id)
                    break
        except asyncio.CancelledError:
            store.remove_queue(module_id)

    return EventSourceResponse(_generator())
