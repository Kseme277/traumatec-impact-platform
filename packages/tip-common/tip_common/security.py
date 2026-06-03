"""Firebase JWT validation and role-based access control (shared)."""

from enum import StrEnum

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security_scheme = HTTPBearer(auto_error=False)


class UserRole(StrEnum):
    PREPARATOR = "preparator"
    ADMIN = "admin"


class AuthenticatedUser:
    def __init__(self, uid: str, email: str, role: UserRole, user_id: str | None = None):
        self.uid = uid
        self.email = email
        self.role = role
        self.user_id = user_id

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    # TODO(S1): validate Firebase ID token via firebase-admin
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Firebase authentication not yet configured",
    )


async def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required",
        )
    return user
