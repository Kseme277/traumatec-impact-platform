import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import Settings
from app.services.email_templates import render_invitation_email, render_password_reset_email

logger = logging.getLogger(__name__)


def _from_header(settings: Settings) -> str:
    return f"{settings.smtp_from_name} <{settings.smtp_from_email}>"


class EmailService:
    def __init__(self, settings: Settings):
        self._settings = settings

    async def send_invitation(
        self,
        *,
        to_email: str,
        prenom: str,
        nom: str,
        invitation_url: str,
    ) -> None:
        subject = "Invitation — Traumatec Impact Platform"
        html = render_invitation_email(
            settings=self._settings,
            prenom=prenom,
            nom=nom,
            invitation_url=invitation_url,
        )
        await self._send(to_email=to_email, subject=subject, html=html)

    async def send_password_reset_code(self, *, to_email: str, code: str) -> None:
        subject = "Code de réinitialisation — Traumatec Impact Platform"
        html = render_password_reset_email(settings=self._settings, code=code)
        await self._send(to_email=to_email, subject=subject, html=html)

    async def send_clerk_template_email(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str | None,
        slug: str,
        otp_code: str | None = None,
    ) -> None:
        if slug == "reset_password_code" and otp_code:
            await self.send_password_reset_code(to_email=to_email, code=otp_code)
            return

        if html_body:
            await self._send(to_email=to_email, subject=subject or "Traumatec Impact Platform", html=html_body)
            return

        if otp_code:
            await self.send_password_reset_code(to_email=to_email, code=otp_code)
            return

        logger.warning("Email Clerk non géré (slug=%s) — aucun contenu exploitable", slug)

    async def _send(self, *, to_email: str, subject: str, html: str) -> None:
        if not self._settings.smtp_enabled:
            logger.info("SMTP désactivé — email non envoyé à %s : %s", to_email, subject)
            return

        message = EmailMessage()
        message["From"] = _from_header(self._settings)
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content("Consultez la version HTML de cet email.")
        message.add_alternative(html, subtype="html")

        try:
            await aiosmtplib.send(
                message,
                hostname=self._settings.smtp_host,
                port=self._settings.smtp_port,
                start_tls=self._settings.smtp_use_tls,
            )
            logger.info("Email envoyé à %s : %s", to_email, subject)
        except Exception:
            logger.exception("Échec envoi email à %s", to_email)
            raise
