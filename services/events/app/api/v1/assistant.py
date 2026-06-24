from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantContextSummary
from app.services.assistant_service import run_assistant_chat
from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    payload: AssistantChatRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssistantChatResponse:
    result = await run_assistant_chat(
        db,
        user,
        payload.message.strip(),
        [item.model_dump() for item in payload.history],
    )
    summary = result.get("context_summary")
    return AssistantChatResponse(
        reply=result["reply"],
        source=result["source"],
        model=result.get("model"),
        context_summary=AssistantContextSummary.model_validate(summary) if summary else None,
    )
