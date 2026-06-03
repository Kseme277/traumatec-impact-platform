from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, require_admin

router = APIRouter()


@router.get("/")
async def list_users(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "identity"}
