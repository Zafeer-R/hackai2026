import logging

from fastapi import FastAPI

from .api.routes import router as roadmap_router
from .core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    app = FastAPI(title=settings.app_name)
    app.include_router(roadmap_router)

    @app.get("/healthz", tags=["health"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
