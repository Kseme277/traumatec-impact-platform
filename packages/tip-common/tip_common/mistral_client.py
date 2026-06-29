"""Client Mistral AI — assistant TIP (API OpenAI-compatible)."""

from __future__ import annotations

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "mistral-small-2506"
DEFAULT_BASE_URL = "https://api.mistral.ai/v1"


def mistral_api_key() -> str:
    return (os.getenv("MISTRAL_API_KEY") or "").strip()


def mistral_model() -> str:
    return (os.getenv("MISTRAL_MODEL") or DEFAULT_MODEL).strip()


def mistral_timeout() -> float:
    raw = os.getenv("LLM_TIMEOUT") or os.getenv("MISTRAL_TIMEOUT") or "30"
    try:
        return float(raw)
    except ValueError:
        return 30.0


def mistral_chat_completions_url() -> str:
    base = (os.getenv("MISTRAL_API_BASE_URL") or DEFAULT_BASE_URL).strip().rstrip("/")
    return f"{base}/chat/completions"


async def mistral_chat_completion(
    *,
    messages: list[dict[str, str]],
    temperature: float = 0.35,
    max_tokens: int = 900,
    timeout: float | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> tuple[str | None, str | None]:
    """Retourne (contenu, modèle) ou (None, message_erreur)."""
    key = (api_key or mistral_api_key()).strip()
    if not key:
        return None, "MISTRAL_API_KEY non configurée."

    chosen_model = (model or mistral_model()).strip()
    wait = timeout if timeout is not None else mistral_timeout()

    payload = {
        "model": chosen_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=wait) as client:
            response = await client.post(
                mistral_chat_completions_url(),
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException:
        return None, f"Timeout Mistral ({chosen_model}) après {wait}s."
    except httpx.RequestError as exc:
        return None, f"Erreur réseau Mistral : {exc}"

    body = response.text
    if response.status_code >= 400:
        snippet = body.strip().replace("\n", " ")[:200]
        if response.status_code == 401:
            return None, "Clé Mistral invalide (HTTP 401)."
        return None, f"Erreur Mistral HTTP {response.status_code}" + (f" : {snippet}" if snippet else ".")

    try:
        data = response.json()
    except json.JSONDecodeError:
        return None, "Réponse Mistral invalide (JSON attendu)."

    content = (
        (data.get("choices") or [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    if not content:
        return None, "Réponse Mistral vide."

    return content, chosen_model
