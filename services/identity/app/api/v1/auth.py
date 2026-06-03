from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_me() -> dict[str, str]:
    return {"status": "not_implemented", "service": "identity"}
