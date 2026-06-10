#!/usr/bin/env python3
"""Importe tous les paquets depuis Packages/ vers catalog (MinIO + PostgreSQL)."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = Path("/app") if Path("/app/app").is_dir() else ROOT
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))
tip_common = Path("/packages/tip-common") if Path("/packages/tip-common").is_dir() else ROOT / "packages" / "tip-common"
if tip_common.is_dir() and str(tip_common) not in sys.path:
    sys.path.insert(0, str(tip_common))

from tip_common.package_types import ALL_PACKAGE_TYPES, PACKAGE_TYPE_SPECS  # noqa: E402

SKIP_FOLDERS = {
    "IEC_C",
    "PBO_F",
    "IEC_F",
    "ORP_S",  # alias PBO_S — utiliser PBO_S
}


async def main(*, force: bool) -> int:
    try:
        from app.core.config import get_settings
        from app.core.database import AsyncSessionLocal
        from app.services.package_import import bootstrap_system_packages
    except ImportError:
        print(
            "Exécutez depuis le conteneur catalog :\n"
            "  docker-compose exec catalog python /app/scripts/bootstrap_packages_db.py --force",
            file=sys.stderr,
        )
        return 1

    settings = get_settings()
    expected = sorted(ALL_PACKAGE_TYPES)
    print("Types attendus :", ", ".join(expected))
    print("Durées :", ", ".join(f"{c}={PACKAGE_TYPE_SPECS[c].duration_days}j" for c in expected))

    async with AsyncSessionLocal() as db:
        summaries = await bootstrap_system_packages(
            db,
            settings,
            uploaded_by_id=None,
            force=force,
        )
        await db.commit()

    imported = {s["package_type"] for s in summaries}
    print(f"\n{len(summaries)} version(s) importée(s) :")
    for summary in sorted(summaries, key=lambda row: row["package_type"]):
        print(
            f"  {summary['package_type']} v{summary['version']} "
            f"({summary['file_count']} fichiers)"
        )

    missing = [code for code in expected if code not in imported]
    if missing:
        print("\nTypes non importés (dossier Packages/ manquant ou vide) :", ", ".join(missing))
        return 1

    print("\nBootstrap terminé.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import paquets AO Alliance en base")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Crée une nouvelle version même si le type existe déjà",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(force=args.force)))
