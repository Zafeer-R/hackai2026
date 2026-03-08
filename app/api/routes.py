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
from app.models.course import ModuleRequest, CourseGenerateRequest
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


# ── Course generation from roadmap ──────────────────────────────────────────────

async def _generate_chapter_task(
    course_id: str,
    mod_idx: int,
    ch_idx: int,
    chapter_title: str,
    expertise: str,
    sem: asyncio.Semaphore,
) -> None:
    async with sem:
        course = store.get_roadmap_course(course_id)
        if course:
            course["modules"][mod_idx]["chapters"][ch_idx]["status"] = "generating"
        try:
            outline = await gemini_service.generate_module_outline(chapter_title, expertise, "English")

            yt, article, meme_b64, song = await asyncio.gather(
                youtube_service.find_best_video(
                    outline["youtube_search_query"],
                    chapter_title=outline["title"],
                    key_concepts=outline["key_concepts"],
                ),
                article_service.find_article(
                    outline["article_search_query"],
                    expertise=expertise,
                    chapter_title=outline["title"],
                ),
                imagen_service.generate_meme(outline["meme_prompt"], outline["title"]),
                audio_service.generate_song(outline["song_lyrics"], outline["title"]),
                return_exceptions=True,
            )

            def _safe(val):
                return None if isinstance(val, Exception) else val

            content = {
                "title": outline["title"],
                "summary": outline["summary"],
                "key_concepts": outline["key_concepts"],
                "youtube": _safe(yt),
                "article": _safe(article),
                "meme": {"image_b64": meme_b64, "prompt_used": outline["meme_prompt"]} if _safe(meme_b64) else None,
                "song": _safe(song),
                "quiz": outline["quiz"],
                "learn_more": outline["learn_more"],
            }

            store.update_roadmap_chapter(course_id, mod_idx, ch_idx, {"status": "ready", "content": content})
            await store.publish_course_event(course_id, {
                "event": "chapter_ready",
                "data": {"module_idx": mod_idx, "chapter_idx": ch_idx, "content": content},
            })
        except Exception as exc:
            store.update_roadmap_chapter(course_id, mod_idx, ch_idx, {"status": "failed"})
            await store.publish_course_event(course_id, {
                "event": "chapter_failed",
                "data": {"module_idx": mod_idx, "chapter_idx": ch_idx, "error": str(exc)},
            })


async def _generate_all_chapters(course_id: str, modules: list[dict], expertise: str) -> None:
    sem = asyncio.Semaphore(5)
    tasks = [
        _generate_chapter_task(course_id, mod_idx, ch_idx, ch["title"], expertise, sem)
        for mod_idx, mod in enumerate(modules)
        for ch_idx, ch in enumerate(mod["chapters"])
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

    course = store.get_roadmap_course(course_id)
    if course:
        course["status"] = "complete"
    await store.publish_course_event(course_id, {
        "event": "course_complete",
        "data": {"course_id": course_id},
    })


@router.post("/course/generate", status_code=202)
async def generate_course(request: CourseGenerateRequest, background_tasks: BackgroundTasks):
    course_id = str(uuid.uuid4())
    modules = [
        {
            "title": mod["title"],
            "chapters": [
                {"title": ch["title"], "status": "pending", "content": None}
                for ch in mod.get("chapters", [])
            ],
        }
        for mod in request.roadmap.get("modules", [])
    ]
    store.save_roadmap_course(course_id, {
        "course_id": course_id,
        "goal": request.goal,
        "user_id": request.user_id,
        "status": "generating",
        "modules": modules,
    })
    store.create_course_queue(course_id)
    background_tasks.add_task(_generate_all_chapters, course_id, modules, request.expertise)
    return {"course_id": course_id}


@router.get("/course/{course_id}/stream")
async def stream_course(course_id: str):
    if not store.get_roadmap_course(course_id):
        raise HTTPException(status_code=404, detail="Course not found")

    queue = store.get_course_queue(course_id)
    if not queue:
        async def _empty():
            yield {"event": "course_complete", "data": json.dumps({"course_id": course_id})}
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
                if event["event"] == "course_complete":
                    store.remove_course_queue(course_id)
                    break
        except asyncio.CancelledError:
            store.remove_course_queue(course_id)

    return EventSourceResponse(_generator())
