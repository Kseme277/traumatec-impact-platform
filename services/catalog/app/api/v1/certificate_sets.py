from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


@router.get("/")
async def list_certificate_sets(_: AuthenticatedUser = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "catalog"}


@router.post("/")
async def create_certificate_set(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "catalog"}
