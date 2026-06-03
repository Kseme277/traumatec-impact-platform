from fastapi import APIRouter, Depends

from tip_common.security import AuthenticatedUser, require_admin

router = APIRouter()


@router.post("/annual-plan")
async def import_annual_plan(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events"}


@router.get("/")
async def list_imports(_: AuthenticatedUser = Depends(require_admin)) -> dict[str, str]:
    return {"status": "not_implemented", "service": "events"}
