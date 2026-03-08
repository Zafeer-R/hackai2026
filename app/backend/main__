from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.goal_extractor import router as goal_extractor_router

app = FastAPI(title="Goal Finder MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goal_extractor_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
