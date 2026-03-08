"""
In-memory store for course state and SSE event queues.
Keyed by course UUID. No database needed for the hackathon.
"""
from __future__ import annotations
import asyncio
from typing import Optional

# {course_id: course_dict}  — serialised Course model as dict
_courses: dict[str, dict] = {}

# {course_id: asyncio.Queue}  — receives SSE events while a client is connected
_queues: dict[str, asyncio.Queue] = {}


# ── Course ─────────────────────────────────────────────────────────────────────

def save_course(course_id: str, course: dict) -> None:
    _courses[course_id] = course


def get_course(course_id: str) -> Optional[dict]:
    return _courses.get(course_id)


def update_chapter_video(course_id: str, chapter_num: int, url: str) -> None:
    course = _courses.get(course_id)
    if not course:
        return
    for ch in course["chapters"]:
        if ch["number"] == chapter_num:
            ch["content"]["video"] = {"status": "ready", "url": url, "job_id": None}
            return


def mark_chapter_video_failed(course_id: str, chapter_num: int) -> None:
    course = _courses.get(course_id)
    if not course:
        return
    for ch in course["chapters"]:
        if ch["number"] == chapter_num:
            ch["content"]["video"] = {"status": "failed", "url": None, "job_id": None}
            return


# ── SSE Queues ─────────────────────────────────────────────────────────────────

def create_queue(course_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _queues[course_id] = q
    return q


def get_queue(course_id: str) -> Optional[asyncio.Queue]:
    return _queues.get(course_id)


async def publish(course_id: str, event: dict) -> None:
    q = _queues.get(course_id)
    if q:
        await q.put(event)


def remove_queue(course_id: str) -> None:
    _queues.pop(course_id, None)
