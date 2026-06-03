import httpx

from app.core.config import Settings


class ClerkAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class ClerkInvitationResult:
    def __init__(self, clerk_id: str, invitation_url: str | None = None):
        self.clerk_id = clerk_id
        self.invitation_url = invitation_url


class ClerkClient:
    BASE_URL = "https://api.clerk.com/v1"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._secret_key = settings.clerk_secret_key
        self._headers = {
            "Authorization": f"Bearer {self._secret_key}",
            "Content-Type": "application/json",
        }

    def _accept_invitation_url(self) -> str:
        base = self._settings.app_public_url.rstrip("/")
        return f"{base}/accept-invitation"

    async def create_user_with_invitation(
        self,
        *,
        email: str,
        nom: str,
        prenom: str,
        role: str,
    ) -> ClerkInvitationResult:
        """Crée l'utilisateur Clerk et prépare une invitation (email envoyé par TIP via SMTP)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            create_response = await client.post(
                f"{self.BASE_URL}/users",
                headers=self._headers,
                json={
                    "email_address": [email],
                    "first_name": prenom,
                    "last_name": nom,
                    "skip_password_requirement": True,
                    "public_metadata": {"role": role},
                },
            )

            if create_response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec création Clerk: {create_response.text}",
                    create_response.status_code,
                )

            clerk_user = create_response.json()
            clerk_id = clerk_user["id"]
            invitation_url = await self._create_invitation(client, email=email, role=role)
            return ClerkInvitationResult(clerk_id=clerk_id, invitation_url=invitation_url)

    async def create_invitation_only(
        self,
        *,
        email: str,
        role: str,
    ) -> str | None:
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await self._create_invitation(client, email=email, role=role)

    async def _create_invitation(
        self,
        client: httpx.AsyncClient,
        *,
        email: str,
        role: str,
    ) -> str | None:
        invitation_response = await client.post(
            f"{self.BASE_URL}/invitations",
            headers=self._headers,
            json={
                "email_address": email,
                "public_metadata": {"role": role},
                "redirect_url": self._accept_invitation_url(),
                "ignore_existing": True,
                "notify": False,
            },
        )

        if invitation_response.status_code >= 400:
            if invitation_response.status_code in (400, 422):
                return None
            raise ClerkAPIError(
                f"Échec invitation Clerk: {invitation_response.text}",
                invitation_response.status_code,
            )

        invitation = invitation_response.json()
        return invitation.get("url")

    async def set_user_banned(self, clerk_id: str, *, banned: bool) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
                json={"banned": banned},
            )
            if response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec mise à jour Clerk: {response.text}",
                    response.status_code,
                )

    async def sync_public_metadata(self, clerk_id: str, *, role: str) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
                json={"public_metadata": {"role": role}},
            )
            if response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec sync metadata Clerk: {response.text}",
                    response.status_code,
                )
