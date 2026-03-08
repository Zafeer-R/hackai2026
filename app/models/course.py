from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────────────────────

class CourseRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200, examples=["React Hooks"])
    expertise: Literal["beginner", "intermediate", "advanced"] = Field(
        ..., examples=["beginner"]
    )


# ── Media ──────────────────────────────────────────────────────────────────────

class VideoStatus(BaseModel):
    status: Literal["generating", "ready", "failed", "disabled"]
    url: Optional[str] = None       # served from /media/videos/{course_id}/{chapter}.mp4
    job_id: Optional[str] = None    # Veo operation name


class YouTubeVideo(BaseModel):
    video_id: str
    url: str
    title: str
    channel: str
    duration: str                   # ISO 8601 e.g. "PT8M42S"
    thumbnail: str
    views: int
    likes: int
    dislikes: int
    score: float = Field(description="0–1 combined engagement score")
    start_seconds: int = Field(default=0, description="Best timestamp to begin watching")


class Article(BaseModel):
    title: str
    url: str
    source: str
    summary: str                    # 3-sentence Gemini summary via Tavily
    estimated_read_time: str


class MemeImage(BaseModel):
    image_b64: str                  # base64-encoded PNG/JPEG
    prompt_used: str


class Song(BaseModel):
    audio_b64: str                  # base64-encoded MP3
    lyrics: str
    duration_seconds: float


# ── Quiz ───────────────────────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    id: int
    type: Literal["multiple_choice", "fill_blank", "true_false", "short_answer"]
    question: str
    options: Optional[list[str]] = None     # only for multiple_choice (4 items)
    answer: str                             # for true_false: "true" or "false"
    explanation: str


# ── Chapter ────────────────────────────────────────────────────────────────────

class ChapterContent(BaseModel):
    video: VideoStatus
    youtube: Optional[YouTubeVideo] = None
    meme: Optional[MemeImage] = None
    article: Optional[Article] = None
    song: Optional[Song] = None


class Chapter(BaseModel):
    number: int
    title: str
    summary: str
    key_concepts: list[str]
    content: ChapterContent
    quiz: list[QuizQuestion]
    learn_more: list[str]


# ── Module (single subtopic) ───────────────────────────────────────────────────

class ModuleRequest(BaseModel):
    subtopic: str = Field(..., min_length=2, max_length=200, examples=["useState Hook"])
    expertise: Literal["beginner", "intermediate", "advanced"] = Field(
        ..., examples=["beginner"]
    )
    language: str = Field(default="English", max_length=50, examples=["English"])


class CourseGenerateRequest(BaseModel):
    goal: str
    roadmap: dict
    user_id: str = "default-user"
    expertise: Literal["beginner", "intermediate", "advanced"] = "beginner"


class Module(BaseModel):
    id: str
    subtopic: str
    expertise: Literal["beginner", "intermediate", "advanced"]
    language: str
    title: str
    summary: str
    key_concepts: list[str]
    content: ChapterContent
    quiz: list[QuizQuestion]
    learn_more: list[str]
    stream_url: str = Field(description="SSE endpoint to receive video-ready events")
