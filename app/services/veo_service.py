"""
Generates a short explainer video (8-10 s) using Google Veo 3.

This is a long-running operation (~30-60 s per video). It is always called
from a background task. On completion it:
  1. Saves the video to generated_media/videos/{course_id}/{chapter_num}.mp4
  2. Updates the in-memory store
  3. Publishes a 'video_ready' event to the course SSE queue
"""
from __future__ import annotations
import asyncio
import os
import time
from typing import Optional

from google import genai
from google.genai import types

from app.config import get_settings
import app.store as store


_VIDEO_DIR = "generated_media/videos"


def _video_path(course_id: str, chapter_num: int) -> str:
    folder = os.path.join(_VIDEO_DIR, course_id)
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, f"{chapter_num}.mp4")


def _media_url(course_id: str, chapter_num: int) -> str:
    return f"/media/videos/{course_id}/{chapter_num}.mp4"


def _generate_sync(
    api_key: str, prompt: str, course_id: str, chapter_num: int
) -> Optional[str]:
    """Blocking Veo call + poll. Returns the served URL or None."""
    client = genai.Client(api_key=api_key)

    full_prompt = (
        f"Short educational animated explainer: {prompt}. "
        "Whiteboard animation style. No text overlays. 8-10 seconds. No people."
    )

    try:
        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt=full_prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1,
                duration_seconds=8,
            ),
        )

        # Poll until done (Veo is a long-running operation)
        while not operation.done:
            time.sleep(10)
            operation = client.operations.get(operation)

        video = operation.response.generated_videos[0].video
        video_bytes = client.files.download(file=video.uri)

        path = _video_path(course_id, chapter_num)
        with open(path, "wb") as f:
            f.write(video_bytes)

        return _media_url(course_id, chapter_num)

    except Exception as e:
        print(f"[Veo] Failed for course={course_id} chapter={chapter_num}: {e}")
        return None


async def generate_video_background(
    course_id: str, chapter_num: int, video_prompt: str
) -> None:
    """
    Called as a FastAPI background task.
    Generates the video, updates the store, and fires an SSE event.
    """
    settings = get_settings()

    url = await asyncio.to_thread(
        _generate_sync, settings.GEMINI_API_KEY, video_prompt, course_id, chapter_num
    )

    if url:
        store.update_chapter_video(course_id, chapter_num, url)
        await store.publish(
            course_id,
            {"event": "video_ready", "data": {"chapter": chapter_num, "video_url": url}},
        )
    else:
        store.mark_chapter_video_failed(course_id, chapter_num)
        await store.publish(
            course_id,
            {"event": "video_failed", "data": {"chapter": chapter_num}},
        )

    # Check if all chapters are done
    course = store.get_course(course_id)
    if course and all(
        ch["content"]["video"]["status"] in ("ready", "failed")
        for ch in course["chapters"]
    ):
        await store.publish(course_id, {"event": "all_complete", "data": {"course_id": course_id}})
