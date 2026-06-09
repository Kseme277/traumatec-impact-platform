"""Cache HTTP JSON via Redis — repli transparent si Redis indisponible."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

_clients: dict[str, Any] = {}


def _import_redis():
    try:
        import redis

        return redis
    except ImportError:
        logger.warning("Package redis non installé — cache désactivé")
        return None


def _get_client(redis_url: str) -> Any | None:
    if redis_url in _clients:
        return _clients[redis_url]
    redis = _import_redis()
    if redis is None:
        _clients[redis_url] = None
        return None
    try:
        client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _clients[redis_url] = client
        return client
    except Exception as exc:
        logger.warning("Redis indisponible — cache désactivé (%s)", exc)
        _clients[redis_url] = None
        return None


def build_cache_key(namespace: str, parts: dict[str, Any]) -> str:
    raw = json.dumps(parts, sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:20]
    return f"tip:{namespace}:{digest}"


async def get_cached_json(redis_url: str, key: str) -> dict[str, Any] | list[Any] | None:
    client = _get_client(redis_url)
    if client is None:
        return None
    try:
        payload = await asyncio.to_thread(client.get, key)
        if not payload:
            return None
        return json.loads(payload)
    except Exception as exc:
        logger.debug("Lecture cache Redis échouée (%s): %s", key, exc)
        return None


async def set_cached_json(
    redis_url: str,
    key: str,
    value: Any,
    ttl_seconds: int,
) -> None:
    client = _get_client(redis_url)
    if client is None or ttl_seconds <= 0:
        return
    try:
        await asyncio.to_thread(
            client.setex,
            key,
            ttl_seconds,
            json.dumps(value, default=str),
        )
    except Exception as exc:
        logger.debug("Écriture cache Redis échouée (%s): %s", key, exc)


async def invalidate_prefix(redis_url: str, prefix: str) -> int:
    """Supprime toutes les clés dont le nom commence par ``prefix``."""
    client = _get_client(redis_url)
    if client is None:
        return 0
    deleted = 0
    try:
        cursor = 0
        while True:
            cursor, keys = await asyncio.to_thread(client.scan, cursor, match=f"{prefix}*", count=200)
            if keys:
                deleted += int(await asyncio.to_thread(client.delete, *keys))
            if cursor == 0:
                break
    except Exception as exc:
        logger.warning("Invalidation cache Redis échouée (%s): %s", prefix, exc)
    return deleted


async def cached_call(
    *,
    redis_url: str,
    namespace: str,
    key_parts: dict[str, Any],
    ttl_seconds: int,
    enabled: bool,
    factory: Callable[[], Awaitable[T]],
    serialize: Callable[[T], Any],
    deserialize: Callable[[Any], T],
) -> T:
    """Exécute ``factory`` avec mise en cache JSON optionnelle."""
    if not enabled:
        return await factory()

    key = build_cache_key(namespace, key_parts)
    cached = await get_cached_json(redis_url, key)
    if cached is not None:
        return deserialize(cached)

    result = await factory()
    await set_cached_json(redis_url, key, serialize(result), ttl_seconds)
    return result
