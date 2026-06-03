from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.get("/")
async def list_events(_: AuthenticatedUser = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events"}


@router.get("/stats")
async def dashboard_stats(_: AuthenticatedUser = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events"}


@router.get("/{event_id}")
async def get_event(_: AuthenticatedUser = Depends(get_current_user), event_id: str = "") -> dict[str, str]:
    return {"status": "not_implemented", "service": "events", "event_id": event_id}


@router.patch("/{event_id}")
async def update_event(_: AuthenticatedUser = Depends(get_current_user), event_id: str = "") -> dict[str, str]:
    return {"status": "not_implemented", "service": "events", "event_id": event_id}
