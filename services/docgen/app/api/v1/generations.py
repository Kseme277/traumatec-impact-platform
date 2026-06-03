from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.post("/events/{event_id}")
async def start_generation(
    _: AuthenticatedUser = Depends(get_current_user),
    event_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "docgen", "event_id": event_id}


@router.get("/{job_id}")
async def get_generation_status(
    _: AuthenticatedUser = Depends(get_current_user),
    job_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "docgen", "job_id": job_id}


@router.get("/{job_id}/download")
async def download_zip(
    _: AuthenticatedUser = Depends(get_current_user),
    job_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "docgen", "job_id": job_id}


@router.get("/events/{event_id}/history")
async def generation_history(
    _: AuthenticatedUser = Depends(get_current_user),
    event_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "docgen", "event_id": event_id}
