from fastapi import APIRouter, Depends

from app.deps.auth import get_current_utilisateur
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurMeResponse

router = APIRouter()


@router.get("/me", response_model=UtilisateurMeResponse)
async def get_me(utilisateur: Utilisateur = Depends(get_current_utilisateur)) -> Utilisateur:
    return utilisateur
