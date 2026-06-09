"""Client NVIDIA NIM partagé — modèles de repli et diagnostic quota."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_PRIMARY_MODEL = "meta/llama-3.3-70b-instruct"
DEFAULT_FALLBACK_MODELS = ("meta/llama-3.1-70b-instruct",)

_QUOTA_MARKERS = (
    "quota",
    "rate limit",
    "rate_limit",
    "insufficient",
    "credit",
    "exceeded",
    "limit reached",
    "payment required",
    "out of",
)


def nvidia_chat_completions_url() -> str:
    explicit = os.getenv("NVIDIA_API_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    base = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1").strip().rstrip("/")
    return f"{base}/chat/completions"


def nvidia_api_key() -> str:
    return (os.getenv("NVIDIA_API_KEY") or "").strip()


def nvidia_model_chain() -> list[str]:
    primary = (os.getenv("NVIDIA_CLASSIFIER_MODEL") or DEFAULT_PRIMARY_MODEL).strip()
    raw_fallbacks = os.getenv("NVIDIA_CLASSIFIER_FALLBACK_MODELS", "")
    if raw_fallbacks.strip():
        fallbacks = [part.strip() for part in raw_fallbacks.split(",") if part.strip()]
    else:
        fallbacks = list(DEFAULT_FALLBACK_MODELS)
    chain: list[str] = []
    for model in [primary, *fallbacks]:
        if model and model not in chain:
            chain.append(model)
    return chain


def describe_nvidia_http_error(status_code: int, body: str) -> str:
    text = (body or "").lower()
    if status_code == 401:
        return "Clé NVIDIA invalide ou expirée (HTTP 401). Vérifiez NVIDIA_API_KEY sur build.nvidia.com."
    if status_code == 402:
        return "Quota / crédits NVIDIA épuisés (HTTP 402). Rechargez sur build.nvidia.com ou utilisez les règles métier."
    if status_code == 403:
        if any(marker in text for marker in _QUOTA_MARKERS):
            return "Accès NVIDIA refusé — quota ou crédits probablement épuisés (HTTP 403)."
        return "Accès NVIDIA refusé (HTTP 403). Vérifiez la clé et les droits du modèle."
    if status_code == 429:
        return "Limite de débit NVIDIA atteinte (HTTP 429). Réessayez plus tard ou désactivez DOCGEN_GENERATION_USE_AI."
    if any(marker in text for marker in _QUOTA_MARKERS):
        return f"Quota NVIDIA probablement épuisé (HTTP {status_code})."
    snippet = body.strip().replace("\n", " ")[:180]
    return f"Erreur NVIDIA HTTP {status_code}" + (f" : {snippet}" if snippet else ".")


def is_quota_or_auth_error(status_code: int, body: str = "") -> bool:
    if status_code in {401, 402, 429}:
        return True
    if status_code == 403:
        text = (body or "").lower()
        return any(marker in text for marker in _QUOTA_MARKERS)
    text = (body or "").lower()
    return any(marker in text for marker in _QUOTA_MARKERS)


async def nvidia_chat_completion(
    *,
    messages: list[dict[str, str]],
    temperature: float | None = None,
    top_p: float | None = None,
    max_tokens: int | None = None,
    timeout: float = 60.0,
    api_key: str | None = None,
    models: list[str] | None = None,
) -> tuple[str | None, str | None]:
    """
    Appelle NVIDIA NIM avec repli sur modèles alternatifs.
    Retourne (contenu, modèle_utilisé) ou (None, message_erreur).
    """
    key = (api_key or nvidia_api_key()).strip()
    if not key:
        return None, "NVIDIA_API_KEY non configurée — mode règles métier uniquement."

    url = nvidia_chat_completions_url()
    temp = temperature if temperature is not None else float(os.getenv("NVIDIA_CLASSIFIER_TEMPERATURE", "0.2"))
    top = top_p if top_p is not None else float(os.getenv("NVIDIA_CLASSIFIER_TOP_P", "0.7"))
    tokens = max_tokens if max_tokens is not None else int(os.getenv("NVIDIA_CLASSIFIER_MAX_TOKENS", "256"))
    model_list = models or nvidia_model_chain()

    last_error = "Aucun modèle NVIDIA disponible."
    quota_hit = False

    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in model_list:
            try:
                response = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temp,
                        "top_p": top,
                        "max_tokens": tokens,
                        "stream": False,
                    },
                )
                if response.is_success:
                    payload = response.json()
                    content = payload["choices"][0]["message"]["content"]
                    if model != model_list[0]:
                        logger.info("NVIDIA : repli sur modèle %s", model)
                    return content, model

                body = response.text
                last_error = describe_nvidia_http_error(response.status_code, body)
                if is_quota_or_auth_error(response.status_code, body):
                    quota_hit = True
                    logger.error("NVIDIA quota/auth (%s) — modèle %s : %s", response.status_code, model, last_error)
                    break
                logger.warning("NVIDIA modèle %s indisponible (%s) — essai suivant", model, response.status_code)
            except httpx.TimeoutException:
                last_error = f"Timeout NVIDIA ({model}) après {timeout}s."
                logger.warning(last_error)
            except Exception as exc:
                last_error = f"Erreur NVIDIA ({model}) : {exc}"
                logger.warning(last_error)

    if quota_hit:
        logger.error(
            "NVIDIA : quota ou clé épuisée — la plateforme bascule sur les règles métier. "
            "Vérifiez build.nvidia.com → API keys / Usage."
        )
    return None, last_error


async def probe_nvidia_api() -> dict[str, Any]:
    """Test rapide de la clé et des modèles (pour scripts de diagnostic)."""
    key = nvidia_api_key()
    if not key:
        return {"ok": False, "reason": "NVIDIA_API_KEY manquante"}

    results: list[dict[str, Any]] = []
    for model in nvidia_model_chain():
        content, detail = await nvidia_chat_completion(
            messages=[{"role": "user", "content": 'Réponds uniquement : {"status":"ok"}'}],
            max_tokens=32,
            timeout=30.0,
            models=[model],
        )
        ok = content is not None
        entry: dict[str, Any] = {"model": model, "ok": ok}
        if ok:
            entry["sample"] = (content or "")[:120]
        else:
            entry["error"] = detail
            entry["quota_or_auth"] = is_quota_or_auth_error(
                402 if detail and "402" in detail else 0,
                detail or "",
            ) or any(
                token in (detail or "").lower()
                for token in ("401", "402", "403", "429", "quota", "crédit", "credit", "invalid")
            )
        results.append(entry)
        if ok:
            break

    any_ok = any(item["ok"] for item in results)
    return {
        "ok": any_ok,
        "models_tested": results,
        "primary_model": nvidia_model_chain()[0] if nvidia_model_chain() else None,
        "fallback_models": nvidia_model_chain()[1:],
    }
