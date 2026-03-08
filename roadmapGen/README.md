# HackAI Roadmap API

FastAPI service that generates a learning roadmap from a single niche goal.

## Quick Start

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -e .[dev]
uvicorn app.main:app --reload
```

## Endpoint

- `POST /v1/roadmap/generate`
- `GET /v1/roadmap/user/{userId}`

### Request

```json
{
  "userId": "user-001",
  "goal": "Kubernetes operators in Go"
}
```

### Response

```json
{
  "modules": [
    {
      "title": "Operator Foundations",
      "chapters": [{"title": "Controller pattern basics"}]
    }
  ]
}
```

Stored roadmap lookup response:

```json
{
  "userId": "user-001",
  "goal": "Kubernetes operators in Go",
  "modules": [
    {
      "title": "Operator Foundations",
      "chapters": [{"title": "Controller pattern basics"}]
    }
  ],
  "updatedAt": "2026-03-08T00:00:00Z"
}
```

## Environment Variables

- `MODEL_NAME`
- `GEMINI_BASE_URL`
- `GEMINI_API_KEY`
- `MONGO_URI`
- `MONGO_DB`
- `MONGO_COLLECTION`
- `LLM_TIMEOUT_SEC`
- `LLM_MAX_RETRIES`
- `LOG_LEVEL` (`DEBUG`, `INFO`, `WARNING`, `ERROR`)

## Test

```bash
pytest -q
```
