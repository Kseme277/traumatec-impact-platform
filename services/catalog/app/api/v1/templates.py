from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, require_admin

router = APIRouter()


@router.get("/")
async def list_templates(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "catalog"}


@router.post("/")
async def upload_template(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "catalog"}
