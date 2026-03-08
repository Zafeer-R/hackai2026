# CourseGen API — Reference

Base URL: `http://localhost:8000/api/v1`

---

## Endpoints

### 1. Generate Course

**`POST /course/generate`**

Generates a full course. All content except Veo videos is returned synchronously.
Videos generate in the background — subscribe to the SSE stream for updates.

#### Request

```json
{
  "topic": "React Hooks",
  "expertise": "beginner"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `topic` | string | Yes | 2–200 chars |
| `expertise` | string | Yes | `beginner` \| `intermediate` \| `advanced` |

#### Response — `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Understanding React Hooks",
  "topic": "React Hooks",
  "expertise": "beginner",
  "description": "A concise introduction to React Hooks...",
  "estimated_time": "45 min",
  "stream_url": "/api/v1/course/550e8400.../stream",
  "chapters": [
    {
      "number": 1,
      "title": "What Are Hooks?",
      "summary": "Hooks let you use state and lifecycle features in functional components...",
      "key_concepts": ["state", "functional component", "side effects"],
      "content": {
        "video": {
          "status": "generating",
          "url": null,
          "job_id": null
        },
        "youtube": {
          "video_id": "dpw9EHDh2bM",
          "url": "https://www.youtube.com/watch?v=dpw9EHDh2bM",
          "title": "React Hooks Explained",
          "channel": "Fireship",
          "duration": "PT8M42S",
          "thumbnail": "https://i.ytimg.com/vi/dpw9EHDh2bM/hqdefault.jpg",
          "views": 1200000,
          "likes": 42000,
          "dislikes": 310,
          "score": 0.8741
        },
        "meme": {
          "image_b64": "<base64-encoded PNG>",
          "prompt_used": "A funny meme about learning React Hooks..."
        },
        "article": {
          "title": "A Complete Guide to useEffect",
          "url": "https://overreacted.io/a-complete-guide-to-useeffect/",
          "source": "overreacted.io",
          "snippet": "When I started learning Hooks...",
          "estimated_read_time": "12 min"
        },
        "song": {
          "audio_b64": "<base64-encoded MP3>",
          "prompt_used": "An upbeat jingle about React useState hook...",
          "duration_seconds": 8.0
        }
      },
      "quiz": [
        {
          "id": 1,
          "type": "true_false",
          "question": "Hooks can only be used inside functional components.",
          "options": null,
          "answer": "true",
          "explanation": "Hooks are designed exclusively for functional components..."
        },
        {
          "id": 2,
          "type": "multiple_choice",
          "question": "What does useState return?",
          "options": ["A single value", "A callback", "An array of [value, setter]", "An object"],
          "answer": "An array of [value, setter]",
          "explanation": "useState returns a tuple: the current state and a function to update it."
        },
        {
          "id": 3,
          "type": "fill_blank",
          "question": "const [count, ___] = useState(0)",
          "options": null,
          "answer": "setCount",
          "explanation": "The setter is conventionally named set + StateName."
        }
      ],
      "learn_more": [
        "React useReducer hook",
        "React Context API",
        "Custom hooks"
      ]
    }
  ]
}
```

---

### 2. Get Course State

**`GET /course/{course_id}`**

Returns the current state of the course, including video URLs as they become available.
Poll this endpoint, or use the SSE stream instead.

#### Response — `200 OK`

Same schema as POST response. Check `chapters[n].content.video.status`:

| Status | Meaning |
|---|---|
| `"generating"` | Veo is still running |
| `"ready"` | `video.url` is populated and playable |
| `"failed"` | Veo failed; fall back to the `youtube` field |

#### Error

`404 Not Found` — course ID not found in store.

---

### 3. SSE Video Stream

**`GET /course/{course_id}/stream`**

Server-Sent Events stream. Connect immediately after POST /generate.
The server pushes events as Veo finishes each chapter's video.

#### Client (browser)

```js
const source = new EventSource(`/api/v1/course/${courseId}/stream`)

source.addEventListener('video_ready', (e) => {
  const { chapter, video_url } = JSON.parse(e.data)
  // update UI for chapter `chapter` with video_url
})

source.addEventListener('video_failed', (e) => {
  const { chapter } = JSON.parse(e.data)
  // fall back to YouTube for that chapter
})

source.addEventListener('all_complete', (e) => {
  source.close()
})

// Keep-alive pings arrive as 'ping' events — ignore them
```

#### Events

| Event name | Data shape | When |
|---|---|---|
| `video_ready` | `{ "chapter": 2, "video_url": "/media/videos/..." }` | One Veo clip finished |
| `video_failed` | `{ "chapter": 2 }` | Veo failed for a chapter |
| `all_complete` | `{ "course_id": "..." }` | All chapters done (success or fail) |
| `ping` | `{}` | Keep-alive every 120 s of silence |

Stream closes server-side after `all_complete`. If the client disconnects, the queue is cleaned up automatically.

---

## Video URL

Generated Veo videos are served from:
```
GET /media/videos/{course_id}/{chapter_number}.mp4
```
e.g. `/media/videos/550e8400.../1.mp4`

---

## AI Services & Keys

| Service | Key | Used for |
|---|---|---|
| Google Gemini (`gemini-2.0-flash`) | `GEMINI_API_KEY` | Course outline, quiz, search queries |
| Google Imagen 3 (`imagen-3.0-generate-002`) | `GEMINI_API_KEY` | Meme image per chapter |
| Google Veo 2 (`veo-2.0-generate-001`) | `GEMINI_API_KEY` | 8–10 s explainer video per chapter |
| YouTube Data API v3 | `YOUTUBE_API_KEY` | Best supplementary video by score |
| DuckDuckGo Search | none | Web article per chapter |
| ElevenLabs Sound Generation | `ELEVENLABS_API_KEY` | Educational jingle per chapter |
| Return YouTube Dislike | none | Estimated dislike counts for scoring |

---

## YouTube Video Scoring

Candidates: top 10 YouTube results for `youtube_search_query`, filtered to `medium` duration (4–20 min).

```
score = like_ratio × 0.6 + normalised_views × 0.4

like_ratio       = likes / (likes + dislikes)   — from returnyoutubedislike.com
normalised_views = log10(views + 1) / 8         — ~0–1 for up to 100 M views
```

---

## Error Responses

| HTTP | Meaning |
|---|---|
| `404` | Course ID not found |
| `422` | Invalid request body (Pydantic validation error) |
| `500` | Unexpected server error |

---

## Running Locally

```bash
cp .env.example .env
# fill in your keys

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Interactive docs: `http://localhost:8000/docs`
