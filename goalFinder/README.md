# Goal Finder MVP Scaffold

This folder contains a minimal scaffold for a goal extraction module that will later plug into a larger learning app.

## Stack

- Backend: Python, FastAPI, WebSockets
- Frontend: React via CDN in a single `index.html`
- Package management: `uv`
- LLM target: Google Gemini API

## Project Structure

```text
goalFinder/
├── backend/
│   ├── config.py
│   ├── goal_extractor.py
│   └── main.py
├── frontend/
│   └── index.html
├── .env.example
├── .gitignore
├── pyproject.toml
├── README.md
└── uv.lock
```

## Commands To Run

From the repo root:

```powershell
cd goalFinder
uv init .
uv add fastapi uvicorn websockets google-generativeai python-dotenv
Copy-Item .env.example .env
uv run uvicorn backend.main:app --reload
```

To open the frontend, serve the `frontend` folder with any static file server. One simple option is:

```powershell
cd goalFinder
python -m http.server 3000 --directory frontend
```

Then open:

- Backend: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`
- Frontend: `http://127.0.0.1:3000`

## Environment

Create a local `.env` file from the template and add your Gemini key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Notes

- This is scaffold only.
- The backend includes a placeholder HTTP health route and a placeholder WebSocket endpoint.
- Goal extraction logic and Gemini Live voice integration are intentionally not implemented yet.
