from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.config import get_settings

app = FastAPI(
    title="CourseGen API",
    description="Dynamic course generation powered by Gemini, Veo, Imagen, YouTube, and ElevenLabs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated videos
app.mount("/media", StaticFiles(directory="generated_media"), name="media")

app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def _startup_log():
    s = get_settings()
    on, off = "ON ", "OFF"
    print("\n╔══════════════════════════════╗")
    print("║      CourseGen — services    ║")
    print("╠══════════════════════════════╣")
    print(f"║  Gemini / Imagen   {on}         ║")
    print(f"║  YouTube           {on}         ║")
    print(f"║  Veo (AI video)    {on if s.ENABLE_VEO else off}         ║")
    print(f"║  ElevenLabs (song) {on if s.ELEVENLABS_API_KEY else off}         ║")
    print("╚══════════════════════════════╝\n")


@app.get("/")
async def serve_ui():
    return FileResponse("static/index.html")
