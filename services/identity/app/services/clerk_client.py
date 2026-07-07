import logging

import httpx

from app.core.config import Settings
from tip_common.email_identity import email_local_part, normalize_email

logger = logging.getLogger(__name__)


class ClerkAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class ClerkInvitationResult:
    def __init__(self, clerk_id: str | None, invitation_url: str | None = None):
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

    def _accept_invitation_url_with_ticket(self, ticket: str) -> str:
        base = self._accept_invitation_url()
        return f"{base}?ticket={ticket}"

    async def get_primary_email(self, clerk_id: str) -> str | None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
            )
            if response.status_code >= 400:
                return None

            user = response.json()
            primary_id = user.get("primary_email_address_id")
            for entry in user.get("email_addresses", []):
                if entry.get("id") == primary_id:
                    address = entry.get("email_address")
                    if isinstance(address, str):
                        return address.strip().lower()
            if user.get("email_addresses"):
                address = user["email_addresses"][0].get("email_address")
                if isinstance(address, str):
                    return address.strip().lower()
        return None

    async def get_user_image_url(self, clerk_id: str) -> str | None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
            )
            if response.status_code >= 400:
                return None
            user = response.json()
            image = user.get("image_url")
            if isinstance(image, str) and image.strip():
                return image.strip()
            for account in user.get("external_accounts") or []:
                if not isinstance(account, dict):
                    continue
                img = account.get("image_url") or account.get("avatar_url")
                if isinstance(img, str) and img.strip():
                    return img.strip()
        return None

    async def find_clerk_emails_for_local_part(self, email: str) -> list[str]:
        """Emails Clerk partageant la même partie locale (détecte les variantes de domaine)."""
        local = email_local_part(email)
        if not local:
            return []

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users",
                headers=self._headers,
                params={"query": local, "limit": 50},
            )
            if response.status_code >= 400:
                return []

            payload = response.json()
            users = payload if isinstance(payload, list) else payload.get("data", [])
            found: list[str] = []
            for user in users:
                for entry in user.get("email_addresses", []):
                    address = entry.get("email_address")
                    if isinstance(address, str) and email_local_part(address) == local:
                        found.append(normalize_email(address))
            return list(dict.fromkeys(found))

    async def find_user_id_by_email(self, email: str) -> str | None:
        email = normalize_email(email)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users",
                headers=self._headers,
                params={"email_address": email, "limit": 1},
            )
            if response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec recherche Clerk: {response.text}",
                    response.status_code,
                )

            payload = response.json()
            users = payload if isinstance(payload, list) else payload.get("data", [])
            if not users:
                return None
            return users[0]["id"]

    async def provision_user_with_invitation(
        self,
        *,
        email: str,
        nom: str,
        prenom: str,
        role: str,
        roles: list[str] | None = None,
    ) -> ClerkInvitationResult:
        """
        Réutilise un compte Clerk existant (même email ou variante proche) au lieu d'en créer un doublon.
        """
        email = normalize_email(email)
        existing_id = await self.find_user_id_by_email(email)
        if existing_id:
            primary_email = await self.get_primary_email(existing_id) or email
            await self.sync_public_metadata(existing_id, role=role, roles=roles)
            await self.update_user_names(existing_id, prenom=prenom, nom=nom)
            async with httpx.AsyncClient(timeout=30.0) as client:
                activation_url = await self._create_sign_in_activation_url(
                    client,
                    clerk_id=existing_id,
                )
            return ClerkInvitationResult(
                clerk_id=existing_id,
                invitation_url=activation_url,
            )

        clerk_variants = await self.find_clerk_emails_for_local_part(email)
        conflicts = [variant for variant in clerk_variants if variant != email]
        if conflicts:
            suggested = conflicts[0]
            raise ClerkAPIError(
                "Un compte Clerk existe déjà avec une adresse proche. "
                f"Utilisez exactement : {suggested}",
                status_code=409,
            )

        return await self.create_user_with_invitation(
            email=email,
            nom=nom,
            prenom=prenom,
            role=role,
            roles=roles,
        )

    async def create_user_with_invitation(
        self,
        *,
        email: str,
        nom: str,
        prenom: str,
        role: str,
        roles: list[str] | None = None,
    ) -> ClerkInvitationResult:
        """
        Nouvel email : invitation Clerk uniquement (notify:true) — pas de POST /users avant.
        clerk_id est renseigné à la première connexion (liaison par email).
        """
        email = normalize_email(email)
        async with httpx.AsyncClient(timeout=30.0) as client:
            invitation_url = await self._create_invitation(
                client,
                email=email,
                role=role,
                prenom=prenom,
                nom=nom,
            )
            return ClerkInvitationResult(clerk_id=None, invitation_url=invitation_url)

    async def create_activation_link(
        self,
        *,
        email: str,
        role: str,
        roles: list[str] | None = None,
        clerk_id: str | None = None,
    ) -> str | None:
        """Lien d'activation : invitation (nouveau) ou jeton de connexion (compte Clerk existant)."""
        email = normalize_email(email)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resolved_id = clerk_id or await self.find_user_id_by_email(email)
            if resolved_id:
                return await self._create_sign_in_activation_url(client, clerk_id=resolved_id)
            return await self._create_invitation(client, email=email, role=role, roles=roles)

    async def create_invitation_only(
        self,
        *,
        email: str,
        role: str,
        roles: list[str] | None = None,
        clerk_id: str | None = None,
    ) -> str | None:
        return await self.create_activation_link(email=email, role=role, roles=roles, clerk_id=clerk_id)

    async def _list_pending_invitations(
        self,
        client: httpx.AsyncClient,
        *,
        email: str,
    ) -> list[dict]:
        response = await client.get(
            f"{self.BASE_URL}/invitations",
            headers=self._headers,
            params={"status": "pending", "limit": 100},
        )
        if response.status_code >= 400:
            logger.warning("Liste invitations Clerk impossible: %s", response.text)
            return []

        payload = response.json()
        items = payload if isinstance(payload, list) else payload.get("data", [])
        target = normalize_email(email)
        pending: list[dict] = []
        for item in items:
            address = item.get("email_address")
            if isinstance(address, str) and normalize_email(address) == target:
                pending.append(item)
        return pending

    async def _revoke_pending_invitations(
        self,
        client: httpx.AsyncClient,
        *,
        email: str,
    ) -> int:
        revoked = 0
        for invitation in await self._list_pending_invitations(client, email=email):
            invitation_id = invitation.get("id")
            if not invitation_id:
                continue
            response = await client.post(
                f"{self.BASE_URL}/invitations/{invitation_id}/revoke",
                headers=self._headers,
            )
            if response.status_code < 400:
                revoked += 1
            else:
                logger.warning(
                    "Révocation invitation %s échouée: %s",
                    invitation_id,
                    response.text,
                )
        return revoked

    async def _create_sign_in_activation_url(
        self,
        client: httpx.AsyncClient,
        *,
        clerk_id: str,
    ) -> str | None:
        """Jeton de connexion pour un compte Clerk déjà créé (évite form_identifier_exists)."""
        response = await client.post(
            f"{self.BASE_URL}/sign_in_tokens",
            headers=self._headers,
            json={"user_id": clerk_id, "expires_in_seconds": 2_592_000},
        )
        if response.status_code >= 400:
            logger.error(
                "Jeton de connexion Clerk refusé pour %s (%s): %s",
                clerk_id,
                response.status_code,
                response.text,
            )
            return None
        try:
            payload = response.json()
        except ValueError:
            logger.error("Réponse Clerk sign_in_tokens invalide pour %s", clerk_id)
            return None
        if not isinstance(payload, dict):
            return None
        clerk_url = payload.get("url")
        if isinstance(clerk_url, str) and clerk_url.strip():
            return clerk_url.strip()
        ticket = payload.get("token")
        if isinstance(ticket, str) and ticket.strip():
            return self._accept_invitation_url_with_ticket(ticket.strip())
        return None

    async def _create_invitation(
        self,
        client: httpx.AsyncClient,
        *,
        email: str,
        role: str,
        roles: list[str] | None = None,
        prenom: str | None = None,
        nom: str | None = None,
        retry: bool = True,
    ) -> str | None:
        from tip_common.roles import normalize_roles, primary_role

        resolved = normalize_roles(roles or [role])
        primary = primary_role(resolved)
        payload: dict[str, object] = {
            "email_address": email,
            "public_metadata": {"role": primary, "roles": resolved},
            "redirect_url": self._accept_invitation_url(),
            "ignore_existing": True,
            "notify": True,
        }
        if prenom:
            payload["first_name"] = prenom
        if nom:
            payload["last_name"] = nom

        invitation_response = await client.post(
            f"{self.BASE_URL}/invitations",
            headers=self._headers,
            json=payload,
        )

        if invitation_response.status_code >= 400:
            body = invitation_response.text
            if invitation_response.status_code in (400, 422) and retry:
                revoked = await self._revoke_pending_invitations(client, email=email)
                if revoked:
                    logger.info(
                        "%s invitation(s) révoquée(s) pour %s — nouvel essai",
                        revoked,
                        email,
                    )
                    return await self._create_invitation(
                        client,
                        email=email,
                        role=role,
                        retry=False,
                    )
            if "form_identifier_exists" in body:
                existing_id = await self.find_user_id_by_email(email)
                if existing_id:
                    logger.info(
                        "Invitation ignorée pour %s — compte Clerk existant, jeton de connexion",
                        email,
                    )
                    return await self._create_sign_in_activation_url(
                        client,
                        clerk_id=existing_id,
                    )
            logger.error(
                "Invitation Clerk refusée pour %s (%s): %s",
                email,
                invitation_response.status_code,
                body,
            )
            if invitation_response.status_code in (400, 422):
                return None
            raise ClerkAPIError(
                f"Échec invitation Clerk: {body}",
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

    async def sync_public_metadata(
        self,
        clerk_id: str,
        *,
        role: str | None = None,
        roles: list[str] | None = None,
    ) -> None:
        from tip_common.roles import normalize_roles, primary_role

        resolved = normalize_roles(roles or ([role] if role else []))
        primary = primary_role(resolved)
        metadata = {"role": primary, "roles": resolved}
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
                json={"public_metadata": metadata},
            )
            if response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec sync metadata Clerk: {response.text}",
                    response.status_code,
                )

    async def delete_user(self, clerk_id: str) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.delete(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
            )
            if response.status_code >= 400 and response.status_code != 404:
                raise ClerkAPIError(
                    f"Échec suppression Clerk: {response.text}",
                    response.status_code,
                )

    async def update_user_names(self, clerk_id: str, *, prenom: str, nom: str) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/users/{clerk_id}",
                headers=self._headers,
                json={"first_name": prenom, "last_name": nom},
            )
            if response.status_code >= 400:
                raise ClerkAPIError(
                    f"Échec mise à jour profil Clerk: {response.text}",
                    response.status_code,
                )
