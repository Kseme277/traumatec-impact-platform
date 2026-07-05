"""Analyse IA des champs à remplacer — un template ou tout le catalogue."""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.catalog import PackageTemplate
from app.services.template_files import download_template_bytes, get_template_or_404
logger = logging.getLogger(__name__)


async def analyze_template_in_db(
    db: AsyncSession,
    settings: Settings,
    template_id: UUID,
) -> dict:
    template = await get_template_or_404(db, template_id)
    data, filename, _ = await download_template_bytes(settings, template)
    meta = dict(template.placeholders or {})
    if not meta.get("replaceable", True):
        return {
            "template_id": str(template_id),
            "code": template.code,
            "filename": filename,
            "skipped": True,
            "reason": "non remplaçable",
        }

    from tip_common.document_section_scanner import scan_document_sections

    analysis = await scan_document_sections(
        filename=filename,
        file_bytes=data,
        document_role=meta.get("document_role") or template.document_type or "autre",
        use_ai=False,
    )
    fields = analysis.get("replacement_fields") or analysis.get("fields") or []
    meta["replacement_fields"] = fields
    meta["field_analysis_classifier"] = analysis.get("classifier")
    meta["section_count"] = analysis.get("section_count")
    meta["field_samples"] = [f.get("sample") for f in fields if f.get("sample")][:40]
    template.placeholders = meta
    await db.commit()
    await db.refresh(template)

    return {
        "template_id": str(template_id),
        "code": template.code,
        "filename": filename,
        "classifier": analysis.get("classifier"),
        "field_count": len(fields),
        "fields": fields,
    }


async def analyze_all_active_templates(
    db: AsyncSession,
    settings: Settings,
    *,
    package_type: str | None = None,
    delay_seconds: float = 0.5,
) -> list[dict]:
    """Parcourt chaque template actif et relance l'analyse IA (NVIDIA ou règles)."""
    result = await db.execute(
        select(PackageTemplate).where(PackageTemplate.is_active.is_(True))
    )
    templates = list(result.scalars().all())
    if package_type:
        code = package_type.upper().replace("-", "_")
        templates = [
            t for t in templates if (t.placeholders or {}).get("package_type") == code
        ]
    templates.sort(key=lambda t: (t.placeholders or {}).get("package_file_order", 0))

    reports: list[dict] = []
    for index, template in enumerate(templates, start=1):
        meta = template.placeholders or {}
        name = meta.get("source_file") or template.name
        logger.info("[%s/%s] Analyse %s (%s)", index, len(templates), template.code, name)
        try:
            report = await analyze_template_in_db(db, settings, template.id)
            reports.append(report)
            logger.info(
                "  → %s champs (%s)",
                report.get("field_count", 0),
                report.get("classifier", "?"),
            )
        except Exception as exc:
            logger.exception("Échec analyse %s", template.code)
            reports.append(
                {
                    "template_id": str(template.id),
                    "code": template.code,
                    "filename": name,
                    "error": str(exc)[:500],
                }
            )
        if delay_seconds and index < len(templates):
            await asyncio.sleep(delay_seconds)
    return reports


async def _cli_main() -> None:
    import os
    import sys

    from app.core.database import AsyncSessionLocal

    settings = Settings()
    package_type = os.getenv("PACKAGE_TYPE")
    async with AsyncSessionLocal() as db:
        reports = await analyze_all_active_templates(
            db, settings, package_type=package_type
        )
    ok = sum(1 for r in reports if "error" not in r and not r.get("skipped"))
    err = sum(1 for r in reports if "error" in r)
    print(f"Analyse terminée : {ok} OK, {err} erreur(s), {len(reports)} total")
    for r in reports:
        if r.get("skipped"):
            print(f"  SKIP {r.get('code')} — {r.get('reason')}")
        elif "error" in r:
            print(f"  ERR  {r.get('code')} — {r['error'][:120]}")
        else:
            print(
                f"  OK   {r.get('code')} — {r.get('field_count')} champs ({r.get('classifier')})"
            )
    if err:
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_cli_main())
