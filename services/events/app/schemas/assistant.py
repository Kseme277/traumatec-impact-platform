from pydantic import BaseModel, Field


class AssistantChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[AssistantChatMessage] = Field(default_factory=list)


class AssistantContextSummary(BaseModel):
    events_total: int = 0
    search_events: int = 0


class AssistantChatResponse(BaseModel):
    reply: str
    source: str
    model: str | None = None
    context_summary: AssistantContextSummary | None = None
