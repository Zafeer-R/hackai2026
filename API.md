# Frontend Integration Guide

Base URL: `http://localhost:8000`

---

## Overview

The full user flow has three stages:

```
1. Goal Extraction (WebSocket)
        ↓
   goal_complete → { goal, roadmap }
        ↓
2. Course Generation (POST + SSE)
        ↓
   chapter_ready events → fill UI progressively
        ↓
3. Done — all chapters loaded
```

---

## Stage 1 — Goal Extraction (WebSocket)

Two modes are available. Both return the same `goal_complete` payload.

### Text Mode

**`WS ws://localhost:8000/ws/text?user_id={userId}`**

1. Connect.
2. Send one JSON message with the user's learning intent.
3. Receive `goal_complete` — the connection closes after this.

**Send:**
```json
{ "text": "I want to learn how LLMs work from scratch" }
```

**Receive — `goal_complete`:**
```json
{
  "type": "goal_complete",
  "goal": { "goal": "Understand how large language models work from scratch" },
  "roadmap": {
    "modules": [
      {
        "title": "Foundations of Neural Networks",
        "chapters": [
          { "title": "Perceptrons and Activation Functions" },
          { "title": "Backpropagation Explained" }
        ]
      },
      {
        "title": "Transformer Architecture",
        "chapters": [
          { "title": "Attention Mechanisms" },
          { "title": "Encoder-Decoder Structure" }
        ]
      }
    ]
  }
}
```

**Error message (non-fatal):**
```json
{ "type": "message", "text": "Something went wrong: ..." }
```

**JavaScript example:**
```js
const ws = new WebSocket(`ws://localhost:8000/ws/text?user_id=${userId}`);

ws.onopen = () => ws.send(JSON.stringify({ text: userInput }));

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  if (payload.type === "goal_complete") {
    const { goal, roadmap } = payload;
    // proceed to Stage 2
  }
};
```

---

### Voice Mode

**`WS ws://localhost:8000/ws/voice?user_id={userId}`**

Streams raw PCM16 audio to Gemini Live. The conversation continues until Gemini extracts a goal, then sends `goal_complete` and closes.

| Detail | Value |
|---|---|
| Audio format | PCM 16-bit, little-endian |
| Sample rate | 16 000 Hz |
| Channels | Mono |
| Chunk interval | ~250 ms |

**Send (binary):** raw PCM16 audio chunks as `ArrayBuffer`.

**Send (text, end of turn):**
```json
{ "type": "end_audio" }
```

**Receive (binary):** Gemini's PCM16 audio response — play it back.

**Receive (text):**
```json
{ "type": "goal_complete", "goal": { "goal": "..." }, "roadmap": { ... } }
```

```json
{ "type": "message", "text": "Gemini status text / error" }
```

**Minimal JavaScript skeleton:**
```js
const ws = new WebSocket(`ws://localhost:8000/ws/voice?user_id=${userId}`);
ws.binaryType = "arraybuffer";

ws.onopen = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // capture mic → downsample to PCM16 @ 16kHz → ws.send(pcmBuffer)
};

ws.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // play PCM16 audio from Gemini
    return;
  }
  const payload = JSON.parse(event.data);
  if (payload.type === "goal_complete") {
    const { goal, roadmap } = payload;
    // proceed to Stage 2
  }
};

// When user finishes speaking:
ws.send(JSON.stringify({ type: "end_audio" }));
```

---

## Stage 2 — Course Generation

### 2a. Start generation

**`POST http://localhost:8000/api/v1/course/generate`**

Call this immediately after receiving `goal_complete`. Returns a `course_id` — do **not** wait for content; it streams in Stage 2b.

**Request body:**
```json
{
  "goal": "Understand how large language models work from scratch",
  "roadmap": { "modules": [ ... ] },
  "user_id": "alice",
  "expertise": "beginner"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `goal` | string | Yes | The `goal.goal` string from `goal_complete` |
| `roadmap` | object | Yes | The full `roadmap` object from `goal_complete` |
| `user_id` | string | No | Defaults to `"default-user"` |
| `expertise` | string | No | `beginner` \| `intermediate` \| `advanced`. Default: `beginner` |

**Response — `202 Accepted`:**
```json
{ "course_id": "c9a1b2d3-..." }
```

---

### 2b. Stream chapter progress (SSE)

**`GET http://localhost:8000/api/v1/course/{course_id}/stream`**

Connect immediately after getting `course_id`. Chapters arrive as they complete (up to 5 in parallel).

**JavaScript:**
```js
const es = new EventSource(`http://localhost:8000/api/v1/course/${courseId}/stream`);

es.addEventListener("chapter_ready", (e) => {
  const { module_idx, chapter_idx, content } = JSON.parse(e.data);
  // render chapter card at modules[module_idx].chapters[chapter_idx]
});

es.addEventListener("chapter_failed", (e) => {
  const { module_idx, chapter_idx, error } = JSON.parse(e.data);
  // show error state for that chapter
});

es.addEventListener("course_complete", () => {
  es.close();
  // all done
});
```

#### Events

| Event | Data shape | When |
|---|---|---|
| `chapter_ready` | `{ module_idx, chapter_idx, content }` | One chapter finished |
| `chapter_failed` | `{ module_idx, chapter_idx, error }` | One chapter failed (others continue) |
| `course_complete` | `{ course_id }` | All chapters finished |
| `ping` | `{}` | Keep-alive every 120 s |

#### `chapter_ready` — `content` shape

```json
{
  "title": "Attention Mechanisms",
  "summary": "Attention lets the model focus on relevant parts of the input...",
  "key_concepts": ["query", "key", "value", "softmax", "context vector"],
  "youtube": {
    "video_id": "iDulhoQ2pro",
    "url": "https://www.youtube.com/watch?v=iDulhoQ2pro&t=42",
    "title": "Attention in Transformers, Visually Explained",
    "channel": "3Blue1Brown",
    "duration": "PT26M39S",
    "thumbnail": "https://i.ytimg.com/vi/iDulhoQ2pro/hqdefault.jpg",
    "views": 3200000,
    "likes": 89000,
    "dislikes": 420,
    "score": 0.921,
    "start_seconds": 42
  },
  "article": {
    "title": "The Illustrated Transformer",
    "url": "https://jalammar.github.io/illustrated-transformer/",
    "source": "jalammar.github.io",
    "summary": "Jay Alammar's visual walkthrough of the Transformer architecture...",
    "estimated_read_time": "15 min"
  },
  "meme": {
    "image_b64": "<base64 PNG>",
    "prompt_used": "A meme about attention weights in transformers"
  },
  "song": {
    "audio_b64": "<base64 MP3>",
    "lyrics": "Query, key, and value — that's the attention game...",
    "duration_seconds": 12.4
  },
  "quiz": [
    {
      "id": 1,
      "type": "true_false",
      "question": "Attention allows the model to weigh the importance of different tokens.",
      "options": null,
      "answer": "true",
      "explanation": "Attention scores determine how much each token contributes to the output."
    },
    {
      "id": 2,
      "type": "multiple_choice",
      "question": "What is the role of the Query vector in attention?",
      "options": ["Stores values", "Represents what we're looking for", "Normalises scores", "Encodes position"],
      "answer": "Represents what we're looking for",
      "explanation": "The Query is compared against Keys to compute attention weights."
    }
  ],
  "learn_more": ["Multi-head attention", "Positional encoding", "Scaled dot-product attention"]
}
```

Fields that may be `null` if the service failed: `youtube`, `article`, `meme`, `song`.

---

## Complete Flow Example

```js
async function startCourse(userId, userInput) {
  // 1. Goal extraction
  const { goal, roadmap } = await extractGoalViaWebSocket(userId, userInput);

  // 2. Start course generation
  const res = await fetch("http://localhost:8000/api/v1/course/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal: goal.goal,
      roadmap,
      user_id: userId,
      expertise: "beginner",
    }),
  });
  const { course_id } = await res.json();

  // 3. Stream progress
  const es = new EventSource(`http://localhost:8000/api/v1/course/${course_id}/stream`);

  es.addEventListener("chapter_ready", (e) => {
    const { module_idx, chapter_idx, content } = JSON.parse(e.data);
    updateChapterCard(module_idx, chapter_idx, content);
  });

  es.addEventListener("course_complete", () => es.close());
}
```

---

## Standalone Module Generation

If you want to generate content for a single topic without the roadmap flow:

**`POST http://localhost:8000/api/v1/module/generate`**

```json
{
  "subtopic": "Attention Mechanisms",
  "expertise": "beginner",
  "language": "English"
}
```

Returns the full module content synchronously (except Veo video). Subscribe to `GET /api/v1/module/{module_id}/stream` for the video event.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | Required. Google AI Studio key |
| `YOUTUBE_API_KEY` | — | Required. YouTube Data API v3 key |
| `TAVILY_API_KEY` | `""` | Optional. Tavily search API key for article enrichment |
| `ELEVENLABS_API_KEY` | `""` | Optional. Disables song generation if unset |
| `ENABLE_VEO` | `false` | Enable Veo video generation (slow) |
| `ROADMAP_MAX_MODULES` | `3` | Max modules per roadmap |
| `ROADMAP_MAX_CHAPTERS_PER_MODULE` | `2` | Max chapters per module |
| `MONGO_URI` | `""` | Optional. Persist roadmaps to MongoDB Atlas |

---

## MongoDB Integration

When `MONGO_URI` is set, the backend persists data to MongoDB Atlas. Here's how to query that data directly from a frontend or backend service.

### Collections

| Collection | Stores |
|---|---|
| `roadmaps` | Goal + roadmap per user, indexed by `user_id` |
| `courses` | Generated course chapters, indexed by `course_id` |

### Fetching a User's Roadmap

```js
// Node.js (MongoDB driver)
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db("hackai");

// Get the latest roadmap for a user
const roadmap = await db.collection("roadmaps").findOne(
  { user_id: "alice" },
  { sort: { created_at: -1 } }
);
// roadmap.goal  → { goal: "..." }
// roadmap.roadmap → { modules: [...] }
```

### Fetching a Course by ID

```js
const course = await db.collection("courses").findOne({ course_id: "c9a1b2d3-..." });
// course.modules → array of modules with completed chapters
```

### Fetching All Chapters for a Course

```js
// Each chapter is stored as a sub-document inside modules
const course = await db.collection("courses").findOne(
  { course_id: courseId },
  { projection: { "modules.chapters": 1 } }
);

for (const mod of course.modules) {
  for (const chapter of mod.chapters) {
    console.log(chapter.title, chapter.content);
  }
}
```

### Python (PyMongo)

```python
from pymongo import MongoClient
import os

client = MongoClient(os.environ["MONGO_URI"])
db = client["hackai"]

# Get roadmap
roadmap = db["roadmaps"].find_one({"user_id": "alice"}, sort=[("created_at", -1)])

# Get course
course = db["courses"].find_one({"course_id": course_id})
```

### Document Shapes

**`roadmaps` document:**
```json
{
  "_id": "...",
  "user_id": "alice",
  "goal": { "goal": "Understand how LLMs work" },
  "roadmap": { "modules": [ ... ] },
  "created_at": "2026-03-08T10:00:00Z"
}
```

**`courses` document:**
```json
{
  "_id": "...",
  "course_id": "c9a1b2d3-...",
  "user_id": "alice",
  "goal": "Understand how LLMs work",
  "expertise": "beginner",
  "status": "complete",
  "modules": [
    {
      "title": "Foundations of Neural Networks",
      "chapters": [
        {
          "title": "Attention Mechanisms",
          "content": { ... }
        }
      ]
    }
  ],
  "created_at": "2026-03-08T10:00:00Z"
}
```

> **Note:** If `MONGO_URI` is not set, no data is persisted — all state lives in memory for the lifetime of the server process.

---

## Running Locally

```bash
cp .env.example .env   # fill in your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
# open http://localhost:8000
```

Interactive API docs: `http://localhost:8000/docs`
