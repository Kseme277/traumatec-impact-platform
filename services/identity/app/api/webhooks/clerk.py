import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import get_settings
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/clerk")
async def clerk_webhook(request: Request) -> dict[str, str]:
    """Reçoit email.created de Clerk et envoie via SMTP Traumatec (Mailpit en dev)."""
    settings = get_settings()
    if not settings.clerk_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_WEBHOOK_SECRET non configuré",
        )

    payload = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        wh = Webhook(settings.clerk_webhook_secret)
        event = wh.verify(payload, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signature webhook invalide") from exc

    if event.get("type") != "email.created":
        return {"status": "ignored"}

    data: dict[str, Any] = event.get("data", {})
    to_email = data.get("to_email_address")
    if not to_email:
        logger.warning("email.created sans destinataire")
        return {"status": "ignored"}

    nested = data.get("data") or {}
    otp_code = nested.get("otp") or nested.get("otp_code") or data.get("otp_code")

    mailer = EmailService(settings)
    try:
        await mailer.send_clerk_template_email(
            to_email=to_email,
            subject=data.get("subject") or "Traumatec Impact Platform",
            html_body=data.get("body"),
            slug=data.get("slug") or "",
            otp_code=otp_code,
        )
    except Exception as exc:
        logger.exception("Échec envoi email Clerk webhook")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Échec envoi email",
        ) from exc

    return {"status": "sent"}
