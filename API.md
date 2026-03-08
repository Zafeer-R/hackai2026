# API Reference

**Base URL:** `http://localhost:8000`
**Interactive docs:** `http://localhost:8000/docs`

---

## Table of Contents

1. [Goal Extraction — WebSocket (Text)](#1-goal-extraction--websocket-text)
2. [Goal Extraction — WebSocket (Voice)](#2-goal-extraction--websocket-voice)
3. [Roadmap — Generate](#3-roadmap--generate)
4. [Roadmap — Edit](#4-roadmap--edit)
5. [Roadmap — Get by User](#5-roadmap--get-by-user)
6. [Roadmap — Recommendations](#6-roadmap--recommendations)
7. [Course — Generate from Roadmap](#7-course--generate-from-roadmap)
8. [Course — SSE Stream](#8-course--sse-stream)
9. [Module — Generate (Standalone)](#9-module--generate-standalone)
10. [Module — Get State](#10-module--get-state)
11. [Module — SSE Stream](#11-module--sse-stream)
12. [Health](#12-health)

---

## 1. Goal Extraction — WebSocket (Text)

**`WS /ws/text?user_id={userId}`**

Multi-turn text conversation. Gemini asks follow-up questions until it extracts a clear learning goal, then returns `goal_complete` and closes.

### Query Parameters

| Param | Type | Required | Default |
|---|---|---|---|
| `user_id` | string | No | `"default-user"` |

### Send (each turn)

```json
{ "text": "I want to learn how LLMs work from scratch" }
```

### Receive — follow-up question (Gemini needs more info)

```json
{ "type": "message", "text": "What is your current background in machine learning?" }
```

### Receive — `goal_complete` (conversation done)

```json
{
  "type": "goal_complete",
  "goal": {
    "goal": "Understand how large language models work from scratch"
  },
  "roadmap": [
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
```

### Receive — error (non-fatal)

```json
{ "type": "message", "text": "Goal extraction failed: ..." }
```

### JavaScript Example

```js
const ws = new WebSocket(`ws://localhost:8000/ws/text?user_id=${userId}`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "goal_complete") {
    const { goal, roadmap } = msg;
    // proceed to course generation
  } else {
    // show msg.text as assistant reply, let user respond
    ws.send(JSON.stringify({ text: userReply }));
  }
};

ws.onopen = () => ws.send(JSON.stringify({ text: userInput }));
```

---

## 2. Goal Extraction — WebSocket (Voice)

**`WS /ws/voice?user_id={userId}`**

Streams raw PCM16 audio to Gemini Live. The model speaks back via audio and closes with `goal_complete` once a goal is confirmed.

### Audio Format

| Detail | Value |
|---|---|
| Encoding | PCM 16-bit, little-endian |
| Sample rate | 16 000 Hz |
| Channels | Mono |
| Chunk interval | ~250 ms |

### Send (binary)

Raw PCM16 audio bytes as `ArrayBuffer`.

### Send (text — end of turn)

```json
{ "type": "end_audio" }
```

### Receive (binary)

Gemini's PCM16 audio response — play it back directly.

### Receive (text) — `goal_complete`

```json
{
  "type": "goal_complete",
  "goal": { "goal": "..." },
  "roadmap": [ ... ]
}
```

### Receive (text) — status / error

```json
{ "type": "message", "text": "..." }
```

### JavaScript Example

```js
const ws = new WebSocket(`ws://localhost:8000/ws/voice?user_id=${userId}`);
ws.binaryType = "arraybuffer";

ws.onopen = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // capture mic -> downsample to PCM16 @ 16 kHz -> ws.send(pcmBuffer)
};

ws.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // play PCM16 audio from Gemini
    return;
  }
  const msg = JSON.parse(event.data);
  if (msg.type === "goal_complete") {
    const { goal, roadmap } = msg;
  }
};

// when user stops speaking:
ws.send(JSON.stringify({ type: "end_audio" }));
```

---

## 3. Roadmap — Generate

**`POST /v1/roadmap/generate`**

Generate a structured learning roadmap for a goal and persist it to MongoDB.

### Request Body

```json
{
  "userId": "alice",
  "goal": "Learn Rust for systems programming"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `userId` | string | Yes | 1-120 chars |
| `goal` | string | Yes | 3-200 chars |

### Response — `200 OK`

Array of modules, each with up to 4 chapters:

```json
[
  {
    "title": "Rust Fundamentals",
    "chapters": [
      { "title": "Ownership and Borrowing" },
      { "title": "Data Types and Pattern Matching" },
      { "title": "Error Handling with Result and Option" }
    ]
  },
  {
    "title": "Memory Management",
    "chapters": [
      { "title": "Stack vs Heap Allocation" },
      { "title": "Lifetimes Explained" }
    ]
  },
  {
    "title": "Concurrency in Rust",
    "chapters": [
      { "title": "Threads and Message Passing" },
      { "title": "Async/Await with Tokio" }
    ]
  }
]
```

### Error Responses

| Status | Meaning |
|---|---|
| `502` | LLM generation failed |
| `503` | MongoDB unavailable |
| `500` | Unexpected server error |

```json
{ "detail": "Roadmap generation failed: ..." }
```

---

## 4. Roadmap — Edit

**`POST /v1/roadmap/edit`**

Edit specific chapters using a natural language instruction. The instruction **must** reference chapter numbers (e.g. "chapter 2").

### Request Body

```json
{
  "userId": "alice",
  "instruction": "Make chapter 2 focus on async Rust instead of threads",
  "roadmap": {
    "modules": [
      {
        "title": "Rust Fundamentals",
        "chapters": [
          { "title": "Ownership and Borrowing" },
          { "title": "Data Types and Pattern Matching" }
        ]
      },
      {
        "title": "Concurrency in Rust",
        "chapters": [
          { "title": "Threads and Message Passing" },
          { "title": "Async/Await with Tokio" }
        ]
      }
    ]
  }
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `userId` | string | Yes | 1-120 chars |
| `instruction` | string | Yes | 3-300 chars, must name a chapter number |
| `roadmap` | object | Yes | Full roadmap shape (same as generate response) |

### Response — `200 OK`

Same array format as generate, with the targeted chapter(s) updated. Module titles and chapter counts are never changed.

```json
[
  {
    "title": "Rust Fundamentals",
    "chapters": [
      { "title": "Ownership and Borrowing" },
      { "title": "Introduction to Async Programming" }
    ]
  },
  {
    "title": "Concurrency in Rust",
    "chapters": [
      { "title": "Threads and Message Passing" },
      { "title": "Async/Await with Tokio" }
    ]
  }
]
```

---

## 5. Roadmap — Get by User

**`GET /v1/roadmap/user/{user_id}`**

Fetch the last persisted roadmap for a user.

### Response — `200 OK`

```json
{
  "userId": "alice",
  "goal": "Learn Rust for systems programming",
  "modules": [
    {
      "title": "Rust Fundamentals",
      "chapters": [
        { "title": "Ownership and Borrowing" },
        { "title": "Data Types and Pattern Matching" }
      ]
    }
  ],
  "updatedAt": "2026-03-08T10:00:00Z"
}
```

### Error Responses

| Status | Meaning |
|---|---|
| `404` | No roadmap found for this user |
| `503` | MongoDB unavailable |

---

## 6. Roadmap — Recommendations

**`GET /v1/roadmap/user/{user_id}/recommendations`**

Generate 5-8 personalized topic recommendations based on the user's roadmap and profile.

### Response — `200 OK`

```json
{
  "user_id": "alice",
  "recommendations": [
    {
      "topic": "WebAssembly with Rust",
      "reason": "Your Rust roadmap covers systems programming but misses WASM, which is important for high-performance web apps.",
      "priority": "high"
    },
    {
      "topic": "Embedded Rust",
      "reason": "Given your interest in systems programming, embedded development is a natural extension.",
      "priority": "medium"
    },
    {
      "topic": "Rust FFI and C interop",
      "reason": "Integrating with existing C codebases is a common systems requirement not covered in your roadmap.",
      "priority": "low"
    }
  ]
}
```

| Field | Values |
|---|---|
| `priority` | `"high"` \| `"medium"` \| `"low"` |

### Error Responses

| Status | Meaning |
|---|---|
| `404` | No roadmap found |
| `502` | LLM generation failed |
| `503` | MongoDB unavailable |

---

## 7. Course — Generate from Roadmap

**`POST /api/v1/course/generate`**

Kick off async content generation for all chapters. Returns immediately with a `course_id`. Stream progress via the SSE endpoint.

### Request Body

```json
{
  "goal": "Learn Rust for systems programming",
  "roadmap": {
    "modules": [
      {
        "title": "Rust Fundamentals",
        "chapters": [
          { "title": "Ownership and Borrowing" },
          { "title": "Data Types and Pattern Matching" }
        ]
      }
    ]
  },
  "user_id": "alice",
  "expertise": "beginner"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `goal` | string | Yes | The `goal.goal` string from WebSocket |
| `roadmap` | object | Yes | Full roadmap object with `modules` array |
| `user_id` | string | No | Default: `"default-user"` |
| `expertise` | string | No | `"beginner"` \| `"intermediate"` \| `"advanced"`. Default: `"beginner"` |

### Response — `202 Accepted`

```json
{ "course_id": "c9a1b2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d" }
```

---

## 8. Course — SSE Stream

**`GET /api/v1/course/{course_id}/stream`**

Connect immediately after POST. Up to 5 chapters generate in parallel and arrive as events.

### Events

| Event | Data | When |
|---|---|---|
| `chapter_ready` | `{ module_idx, chapter_idx, content }` | A chapter finished |
| `chapter_failed` | `{ module_idx, chapter_idx, error }` | A chapter failed (others continue) |
| `course_complete` | `{ course_id }` | All chapters done |
| `ping` | `{}` | Keep-alive every 120 s |

### `chapter_ready` — `content` shape

```json
{
  "title": "Ownership and Borrowing",
  "summary": "Ownership is Rust's central feature for memory safety without garbage collection...",
  "key_concepts": ["ownership", "borrowing", "references", "lifetime", "move semantics"],
  "youtube": {
    "video_id": "VFIOSWy93H0",
    "url": "https://www.youtube.com/watch?v=VFIOSWy93H0",
    "title": "Rust Ownership Explained",
    "channel": "No Boilerplate",
    "duration": "PT12M30S",
    "thumbnail": "https://i.ytimg.com/vi/VFIOSWy93H0/hqdefault.jpg",
    "views": 450000,
    "likes": 18000,
    "dislikes": 120,
    "score": 0.94,
    "start_seconds": 0
  },
  "article": {
    "title": "Understanding Ownership in Rust",
    "url": "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html",
    "source": "doc.rust-lang.org",
    "summary": "The Rust Book chapter on ownership covers the rules that ensure memory safety...",
    "estimated_read_time": "10 min"
  },
  "meme": {
    "image_b64": "<base64 PNG>",
    "prompt_used": "A meme about Rust borrow checker errors"
  },
  "song": {
    "audio_b64": "<base64 MP3>",
    "lyrics": "Move it, borrow it, you cannot have both at once...",
    "duration_seconds": 14.2
  },
  "quiz": [
    {
      "id": 1,
      "type": "true_false",
      "question": "In Rust, each value has exactly one owner at a time.",
      "options": null,
      "answer": "true",
      "explanation": "Rust's ownership system ensures there is always exactly one owner, preventing double-frees."
    },
    {
      "id": 2,
      "type": "multiple_choice",
      "question": "What happens when you move a value in Rust?",
      "options": [
        "The original variable is still valid",
        "The original variable becomes invalid",
        "A deep copy is made",
        "The value is dropped immediately"
      ],
      "answer": "The original variable becomes invalid",
      "explanation": "Moving transfers ownership; the original binding can no longer be used."
    }
  ],
  "learn_more": ["Lifetimes", "Smart pointers", "The borrow checker"]
}
```

Fields that may be `null` if the service failed: `youtube`, `article`, `meme`, `song`.

### JavaScript Example

```js
const es = new EventSource(`http://localhost:8000/api/v1/course/${courseId}/stream`);

es.addEventListener("chapter_ready", (e) => {
  const { module_idx, chapter_idx, content } = JSON.parse(e.data);
  renderChapter(module_idx, chapter_idx, content);
});

es.addEventListener("chapter_failed", (e) => {
  const { module_idx, chapter_idx } = JSON.parse(e.data);
  markChapterFailed(module_idx, chapter_idx);
});

es.addEventListener("course_complete", () => es.close());
```

---

## 9. Module — Generate (Standalone)

**`POST /api/v1/module/generate`**

Generate rich learning content for a single topic without a roadmap. All content except the Veo video is returned synchronously.

### Request Body

```json
{
  "subtopic": "Attention Mechanisms",
  "expertise": "beginner",
  "language": "English"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `subtopic` | string | Yes | 2-200 chars |
| `expertise` | string | Yes | `"beginner"` \| `"intermediate"` \| `"advanced"` |
| `language` | string | No | Default: `"English"` |

### Response — `201 Created`

```json
{
  "id": "7f3a1b2c-...",
  "subtopic": "Attention Mechanisms",
  "expertise": "beginner",
  "language": "English",
  "title": "Attention Mechanisms in Transformers",
  "summary": "Attention lets the model dynamically focus on the most relevant parts of the input...",
  "key_concepts": ["query", "key", "value", "softmax", "multi-head attention"],
  "content": {
    "video": {
      "status": "disabled",
      "url": null,
      "job_id": null
    },
    "youtube": {
      "video_id": "iDulhoQ2pro",
      "url": "https://www.youtube.com/watch?v=iDulhoQ2pro",
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
    "meme": {
      "image_b64": "<base64 PNG>",
      "prompt_used": "A meme about attention weights"
    },
    "article": {
      "title": "The Illustrated Transformer",
      "url": "https://jalammar.github.io/illustrated-transformer/",
      "source": "jalammar.github.io",
      "summary": "Jay Alammar's visual walkthrough of the Transformer architecture...",
      "estimated_read_time": "15 min"
    },
    "song": {
      "audio_b64": "<base64 MP3>",
      "lyrics": "Query, key, and value, that is the attention game...",
      "duration_seconds": 12.4
    }
  },
  "quiz": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What does the Query vector represent in attention?",
      "options": ["Stored values", "What we are looking for", "Normalised scores", "Position encoding"],
      "answer": "What we are looking for",
      "explanation": "The Query is compared against Keys to compute attention weights."
    }
  ],
  "learn_more": ["Multi-head attention", "Positional encoding", "Scaled dot-product attention"],
  "stream_url": "/api/v1/module/7f3a1b2c-.../stream"
}
```

**`content.video.status` values:**

| Value | Meaning |
|---|---|
| `"generating"` | Veo is running — subscribe to SSE stream |
| `"ready"` | `url` is populated |
| `"failed"` | Veo failed — use `youtube` instead |
| `"disabled"` | `ENABLE_VEO=false` |

---

## 10. Module — Get State

**`GET /api/v1/module/{module_id}`**

Fetch the current state of a module. Useful to poll `content.video.status`.

### Response — `200 OK`

Same shape as `POST /api/v1/module/generate` response.

### Error Responses

| Status | Meaning |
|---|---|
| `404` | Module not found |

---

## 11. Module — SSE Stream

**`GET /api/v1/module/{module_id}/stream`**

Subscribe for Veo video events. Connect immediately after `POST /api/v1/module/generate`.

### Events

| Event | Data | When |
|---|---|---|
| `video_ready` | `{ chapter: 1, video_url: "<url>" }` | Veo finished |
| `video_failed` | `{ chapter: 1 }` | Veo failed |
| `all_complete` | `{ course_id: "<module_id>" }` | Stream done |
| `ping` | `{}` | Keep-alive every 120 s |

### JavaScript Example

```js
const es = new EventSource(`http://localhost:8000/api/v1/module/${moduleId}/stream`);

es.addEventListener("video_ready", (e) => {
  const { video_url } = JSON.parse(e.data);
  setVideoUrl(video_url);
  es.close();
});

es.addEventListener("all_complete", () => es.close());
```

---

## 12. Health

**`GET /health`**

```json
{ "status": "ok" }
```

---

## Complete Flow

```
1. WS /ws/text?user_id=alice
      Send: { "text": "I want to learn Rust" }
      Recv: { "type": "goal_complete", "goal": { "goal": "..." }, "roadmap": [...] }

2. POST /v1/roadmap/generate          <- persists roadmap to MongoDB
      Body: { "userId": "alice", "goal": "..." }
      Recv: [ { "title": "...", "chapters": [...] }, ... ]

3. POST /api/v1/course/generate       <- starts async chapter generation
      Body: { "goal": "...", "roadmap": { "modules": [...] }, "user_id": "alice", "expertise": "beginner" }
      Recv: { "course_id": "..." }

4. GET /api/v1/course/{course_id}/stream   <- SSE: chapters arrive as they finish
      Event chapter_ready -> render card
      Event course_complete -> close stream
```

---

## Shared Types

### Module (roadmap item)

```json
{
  "title": "string (max 140 chars)",
  "chapters": [
    { "title": "string (max 140 chars)" }
  ]
}
```

Max 7 modules per roadmap, max 4 chapters per module.

### QuizQuestion

```json
{
  "id": 1,
  "type": "multiple_choice | fill_blank | true_false | short_answer",
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "answer": "string",
  "explanation": "string"
}
```

`options` is `null` for all types except `multiple_choice`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | required | Google AI Studio key |
| `YOUTUBE_API_KEY` | required | YouTube Data API v3 key |
| `TAVILY_API_KEY` | `""` | Article enrichment via Tavily |
| `ELEVENLABS_API_KEY` | `""` | Disables song generation if unset |
| `ENABLE_VEO` | `false` | Enable Veo video generation |
| `MONGO_URI` | `""` | MongoDB Atlas connection string |
| `MONGO_DB` | `"hackai"` | Database name |
| `MONGO_COLLECTION` | `"user_roadmaps"` | Roadmap collection |
| `ROADMAP_MAX_MODULES` | `3` | Max modules per roadmap |
| `ROADMAP_MAX_CHAPTERS_PER_MODULE` | `2` | Max chapters per module |
| `LLM_TIMEOUT_SEC` | `15` | Gemini request timeout (seconds) |
| `MODEL_NAME` | `"gemini-2.5-flash"` | Gemini model for roadmap/course generation |

---

## Running Locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
# open http://localhost:8000
# interactive docs at http://localhost:8000/docs
```
