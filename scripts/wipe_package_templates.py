#!/usr/bin/env python3
"""Vide tous les templates paquets : PostgreSQL (catalog) + MinIO + sources locales."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "tip-common"))

from sqlalchemy import create_engine, text

from tip_common.config import BaseServiceSettings
from tip_common.redis_cache import invalidate_prefix
from tip_common.storage import PACKAGES_BUNDLES_PREFIX, get_object_storage

WIPE_SQL = """
UPDATE catalog.event_profiles
SET active_bundle_id = NULL, package_template_ids = NULL, certificate_set_id = NULL;
DELETE FROM catalog.certificate_template_steps;
DELETE FROM catalog.certificate_template_sets;
DELETE FROM catalog.package_templates;
DELETE FROM catalog.package_bundles;
DELETE FROM catalog.event_profiles;
"""


def _sync_url(database_url: str) -> str:
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def wipe_database(settings: BaseServiceSettings) -> None:
    try:
        engine = create_engine(_sync_url(settings.database_url))
        with engine.begin() as conn:
            conn.execute(text(WIPE_SQL))
        print("Base catalog : templates et versions supprimés.")
        return
    except Exception as exc:
        print(f"SQLAlchemy indisponible ({exc}) — tentative psql…")

    import subprocess

    db_url = _sync_url(settings.database_url)
    # postgresql://user:pass@host:port/db
    from urllib.parse import urlparse

    parsed = urlparse(db_url)
    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password
    host = parsed.hostname or "localhost"
    port = str(parsed.port or 5432)
    user = parsed.username or "tip"
    dbname = (parsed.path or "/tip").lstrip("/")
    subprocess.run(
        [
            "psql",
            "-h",
            host,
            "-p",
            port,
            "-U",
            user,
            "-d",
            dbname,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            WIPE_SQL,
        ],
        check=True,
        env=env,
    )
    print("Base catalog : templates et versions supprimés (psql).")


def wipe_minio(settings: BaseServiceSettings) -> None:
    if settings.storage_backend.lower() != "minio":
        templates_dir = settings.storage_root / "templates" / "packages" / "bundles"
        if templates_dir.exists():
            shutil.rmtree(templates_dir)
            templates_dir.mkdir(parents=True, exist_ok=True)
        print(f"Stockage local : {templates_dir} vidé.")
        return

    if not settings.minio_access_key or not settings.minio_secret_key:
        print("MinIO non configuré — skip stockage objet.")
        return

    storage = get_object_storage(settings)
    keys = storage.list_keys(PACKAGES_BUNDLES_PREFIX)
    for key in keys:
        storage.delete(key)
    print(f"MinIO : {len(keys)} objet(s) supprimé(s) sous {PACKAGES_BUNDLES_PREFIX}")


async def _flush_catalog_cache(settings: BaseServiceSettings) -> None:
    import asyncio

    deleted = await invalidate_prefix(settings.redis_url, "tip:catalog:")
    print(f"Redis : {deleted} clé(s) cache catalog supprimée(s).")


def wipe_cache(settings: BaseServiceSettings) -> None:
    import asyncio

    try:
        asyncio.run(_flush_catalog_cache(settings))
    except Exception as exc:
        print(f"Redis : purge cache ignorée ({exc}).")


def wipe_local_sources(root: Path) -> None:
    for folder_name in ("Packages", "package-zips"):
        folder = root / folder_name
        if not folder.is_dir():
            continue
        removed = 0
        for child in folder.iterdir():
            if child.name in (".gitkeep", "README.md"):
                continue
            if child.is_dir():
                shutil.rmtree(child)
                removed += 1
            else:
                child.unlink()
                removed += 1
        print(f"{folder_name}/ : {removed} entrée(s) supprimée(s).")


def main() -> int:
    parser = argparse.ArgumentParser(description="Vide le catalogue templates paquets TIP.")
    parser.add_argument("--skip-db", action="store_true")
    parser.add_argument("--skip-minio", action="store_true")
    parser.add_argument("--skip-local", action="store_true")
    parser.add_argument("--skip-cache", action="store_true")
    args = parser.parse_args()

    os.chdir(ROOT)
    settings = BaseServiceSettings()

    if not args.skip_db:
        wipe_database(settings)
    if not args.skip_minio:
        wipe_minio(settings)
    if not args.skip_cache:
        wipe_cache(settings)
    if not args.skip_local:
        wipe_local_sources(ROOT)

    print("Terminé — catalogue templates vide.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
