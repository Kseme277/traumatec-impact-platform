from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.post("/events/{event_id}/import")
async def import_participants(
    _: AuthenticatedUser = Depends(get_current_user),
    event_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events", "event_id": event_id}


@router.get("/events/{event_id}")
async def list_participants(
    _: AuthenticatedUser = Depends(get_current_user),
    event_id: str = "",
) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events", "event_id": event_id}
