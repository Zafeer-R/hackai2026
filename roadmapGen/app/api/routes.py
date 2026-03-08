import logging
import time

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_roadmap_service
from app.repository.mongodb import RepositoryError
from app.schemas.api import (
    EditRoadmapRequest,
    GenerateRoadmapRequest,
    GenerateRoadmapResponse,
    StoredRoadmapResponse,
)
from app.services.roadmap_service import GenerationError, RoadmapNotFoundError, RoadmapService

router = APIRouter(prefix="/v1/roadmap", tags=["roadmap"])
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GenerateRoadmapResponse)
def generate_roadmap(
    request_data: GenerateRoadmapRequest,
    service: RoadmapService = Depends(get_roadmap_service),
) -> GenerateRoadmapResponse:
    t0 = time.perf_counter()
    logger.info(
        "generate_roadmap.start user_id=%s goal=%s",
        request_data.user_id,
        request_data.goal[:80],
    )
    try:
        response = service.generate(request_data)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "generate_roadmap.success user_id=%s elapsed_ms=%.1f module_count=%s",
            request_data.user_id,
            elapsed_ms,
            len(response.modules),
        )
        return response
    except GenerationError as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.warning(
            "generate_roadmap.generation_error elapsed_ms=%.1f error=%s",
            elapsed_ms,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Roadmap generation failed: {exc}",
        ) from exc
    except RepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {exc}",
        ) from exc


@router.post("/edit", response_model=GenerateRoadmapResponse)
def edit_roadmap(
    request_data: EditRoadmapRequest,
    service: RoadmapService = Depends(get_roadmap_service),
) -> GenerateRoadmapResponse:
    t0 = time.perf_counter()
    logger.info(
        "edit_roadmap.start user_id=%s instruction=%s",
        request_data.user_id,
        request_data.instruction[:80],
    )
    try:
        response = service.edit(request_data)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "edit_roadmap.success user_id=%s elapsed_ms=%.1f module_count=%s",
            request_data.user_id,
            elapsed_ms,
            len(response.modules),
        )
        return response
    except GenerationError as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.warning(
            "edit_roadmap.generation_error elapsed_ms=%.1f error=%s",
            elapsed_ms,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Roadmap edit failed: {exc}",
        ) from exc
    except RepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {exc}",
        ) from exc


@router.get("/user/{user_id}", response_model=StoredRoadmapResponse)
def get_roadmap_for_user(
    user_id: str,
    service: RoadmapService = Depends(get_roadmap_service),
) -> StoredRoadmapResponse:
    try:
        return service.get_by_user(user_id)
    except RoadmapNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RepositoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        ) from exc
