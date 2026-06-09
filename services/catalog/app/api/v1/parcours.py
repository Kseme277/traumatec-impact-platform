from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.schemas.catalog import ParcoursResponse
from app.services.parcours import list_parcours
from sqlalchemy.ext.asyncio import AsyncSession
from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.get("/", response_model=list[ParcoursResponse])
async def get_parcours(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ParcoursResponse]:
    return await list_parcours(db)
