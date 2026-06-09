from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.catalog import EventProfile
from app.schemas.catalog import EventProfileResponse
from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.get("/", response_model=list[EventProfileResponse])
async def list_profiles(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EventProfile]:
    result = await db.execute(
        select(EventProfile).where(EventProfile.is_active.is_(True)).order_by(EventProfile.name)
    )
    return list(result.scalars().all())
