from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.national_contact import NationalContact
from app.schemas.national_contact import (
    NationalContactCreate,
    NationalContactListResponse,
    NationalContactResponse,
    NationalContactUpdate,
)
from tip_common.audit import record_audit_event
from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=NationalContactListResponse)
async def list_national_contacts(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(default=True),
    q: str | None = Query(default=None),
) -> NationalContactListResponse:
    query = select(NationalContact).order_by(NationalContact.full_name)
    count_query = select(func.count()).select_from(NationalContact)
    if active_only:
        query = query.where(NationalContact.is_active.is_(True))
        count_query = count_query.where(NationalContact.is_active.is_(True))
    if q:
        pattern = f"%{q.strip()}%"
        filt = (
            NationalContact.full_name.ilike(pattern)
            | NationalContact.email.ilike(pattern)
            | NationalContact.country.ilike(pattern)
        )
        query = query.where(filt)
        count_query = count_query.where(filt)
    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query)).scalars().all()
    return NationalContactListResponse(
        items=[NationalContactResponse.model_validate(c) for c in items],
        total=total,
    )


@router.post("/", response_model=NationalContactResponse, status_code=status.HTTP_201_CREATED)
async def create_national_contact(
    payload: NationalContactCreate,
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> NationalContact:
    contact = NationalContact(**payload.model_dump())
    db.add(contact)
    await db.flush()
    await record_audit_event(
        db,
        actor_id=user.id,
        action="national_contact.create",
        entity_type="national_contact",
        entity_id=str(contact.id),
        payload={"full_name": contact.full_name},
    )
    await db.commit()
    await db.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=NationalContactResponse)
async def update_national_contact(
    contact_id: UUID,
    payload: NationalContactUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> NationalContact:
    contact = await db.get(NationalContact, contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    await record_audit_event(
        db,
        actor_id=user.id,
        action="national_contact.update",
        entity_type="national_contact",
        entity_id=str(contact.id),
        payload={},
    )
    await db.commit()
    await db.refresh(contact)
    return contact
