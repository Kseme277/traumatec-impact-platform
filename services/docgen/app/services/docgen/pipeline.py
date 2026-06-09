"""Assemblage du paquet documentaire AO Alliance (tous fichiers + remplacements)."""

from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.services.docgen.event_context import enrich_event_context
from app.services.docgen.template_render import build_event_context, render_package_document
from tip_common.package_types import (
    filter_templates_by_package_duration,
    infer_package_type_for_event,
    PACKAGE_TYPE_SPECS,
)
from tip_common.storage import GENERATIONS_EVENT_PREFIX, GENERATIONS_PREFIX, get_object_storage

logger = logging.getLogger(__name__)


async def append_job_log(
    db: AsyncSession,
    job_id: UUID,
    *,
    level: str = "info",
    message: str,
) -> None:
    entry = {
        "at": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
    }
    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET logs_json = COALESCE(logs_json, '[]'::jsonb) || CAST(:entry AS jsonb)
            WHERE id = :job_id
            """
        ),
        {"job_id": str(job_id), "entry": json.dumps([entry], ensure_ascii=False)},
    )
    await db.commit()


async def _load_responsible_photo(
    session: AsyncSession,
    event_id: UUID,
    settings: Settings,
    *,
    metadata_json: dict | None = None,
) -> bytes | None:
    """Photo du responsable national (pièce jointe événement ou metadata)."""
    storage = get_object_storage(settings)
    result = await session.execute(
        text(
            """
            SELECT file_path
            FROM events.event_attachments
            WHERE event_id = :event_id
              AND attachment_type = 'responsible_photo'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"event_id": str(event_id)},
    )
    row = result.one_or_none()
    paths: list[str] = []
    if row is not None and row.file_path:
        paths.append(str(row.file_path))
    meta = metadata_json if isinstance(metadata_json, dict) else {}
    for key in ("responsible_photo_path", "photo_path", "responsible_photo"):
        value = meta.get(key)
        if value and str(value).strip() and str(value) not in paths:
            paths.append(str(value).strip())

    for path in paths:
        try:
            return storage.download_bytes(path)
        except Exception as exc:
            logger.warning("Photo responsable illisible (%s): %s", path, exc)
    return None


async def _load_prepared_by(session: AsyncSession, job_id: UUID) -> str:
    """Nom de l'utilisateur TIP ayant lancé la génération."""
    result = await session.execute(
        text(
            """
            SELECT u.prenom, u.nom, u.email
            FROM docgen.generation_jobs j
            JOIN identity.utilisateurs u ON u.id = j.requested_by_id
            WHERE j.id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )
    row = result.one_or_none()
    if row is None:
        return ""
    full_name = f"{(row.prenom or '').strip()} {(row.nom or '').strip()}".strip()
    return full_name or (row.email or "").strip()


async def _load_event(session: AsyncSession, event_id: UUID) -> dict:
    result = await session.execute(
        text(
            """
            SELECT project_number, title, event_type, preparation_theme,
                   city, country, region, responsible_person,
                   start_date::text, end_date::text,
                   participants_expected, metadata_json
            FROM events.events
            WHERE id = :id
            """
        ),
        {"id": str(event_id)},
    )
    row = result.one_or_none()
    if row is None:
        raise ValueError("Événement introuvable")
    return {
        "project_number": row.project_number,
        "title": row.title,
        "event_type": row.event_type,
        "preparation_theme": row.preparation_theme,
        "city": row.city,
        "country": row.country,
        "region": row.region,
        "responsible_person": row.responsible_person,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "participants_expected": row.participants_expected,
        "metadata_json": row.metadata_json,
    }


def _assert_event_upcoming(event: dict) -> None:
    ref_raw = event.get("end_date") or event.get("start_date")
    if not ref_raw:
        raise ValueError(
            "Dates de l'événement manquantes. Renseignez la date de début et de fin sur la fiche événement."
        )
    ref = date.fromisoformat(str(ref_raw)[:10])
    if ref < date.today():
        raise ValueError(
            "Cet événement est déjà passé. La génération n'est possible que pour les événements à venir."
        )


def _guess_content_type(ext: str) -> str:
    ext = ext.lower()
    if ext == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if ext == ".doc":
        return "application/msword"
    if ext == ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if ext == ".pdf":
        return "application/pdf"
    if ext == ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    if ext == ".png":
        return "image/png"
    return "application/octet-stream"


async def _load_profile_templates(session: AsyncSession, event: dict) -> tuple[dict, list[dict], dict | None]:
    from tip_common.nvidia_event_classifier import classify_event_package
    from tip_common.package_types import infer_preparation_theme_for_event

    classified = await classify_event_package(event)
    theme = (
        event.get("preparation_theme")
        or (classified or {}).get("preparation_theme")
        or infer_preparation_theme_for_event(
            event_type=event.get("event_type"),
            title=event.get("title"),
        )
    )
    if not theme:
        raise ValueError(
            "Événement sans thème de préparation (operatory, pbo, iec). "
            "Renseignez le thème ou précisez l'activité / le titre (ex. IEC, ORP, Op C)."
        )

    package_type = (classified or {}).get("package_type") or infer_package_type_for_event(
        preparation_theme=theme,
        event_type=event.get("event_type"),
        title=event.get("title"),
        start_date=event.get("start_date"),
        end_date=event.get("end_date"),
    )
    if not package_type:
        raise ValueError(
            f"Type de paquet non déterminé pour l'événement « {event.get('event_type') or theme} »."
        )

    profile_result = await session.execute(
        text(
            """
            SELECT id, name, preparation_theme, package_type, event_type_label,
                   active_bundle_id, package_template_ids
            FROM catalog.event_profiles
            WHERE package_type = :package_type AND is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"package_type": package_type},
    )
    profile_row = profile_result.one_or_none()
    if profile_row is None:
        profile_result = await session.execute(
            text(
                """
                SELECT id, name, preparation_theme, package_type, event_type_label,
                       active_bundle_id, package_template_ids
                FROM catalog.event_profiles
                WHERE preparation_theme = :theme AND is_active = TRUE
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"theme": theme},
        )
        profile_row = profile_result.one_or_none()

    if profile_row is None:
        raise ValueError(
            f"Aucun profil paquet pour « {package_type} ». "
            "Importez un ZIP via POST /api/v1/packages/upload."
        )

    if profile_row.active_bundle_id:
        tpl_result = await session.execute(
            text(
                """
                SELECT id, code, name, file_path, placeholders, document_type
                FROM catalog.package_templates
                WHERE is_active = TRUE
                  AND placeholders->>'bundle_id' = :bundle_id
                """
            ),
            {"bundle_id": str(profile_row.active_bundle_id)},
        )
    elif profile_row.package_template_ids:
        template_ids = [str(tid) for tid in profile_row.package_template_ids]
        tpl_result = await session.execute(
            text(
                """
                SELECT id, code, name, file_path, placeholders, document_type
                FROM catalog.package_templates
                WHERE id::text = ANY(:ids) AND is_active = TRUE
                """
            ),
            {"ids": template_ids},
        )
    else:
        raise ValueError(f"Profil paquet « {package_type} » sans version active.")
    templates = []
    for row in tpl_result.fetchall():
        meta = row.placeholders or {}
        templates.append(
            {
                "id": str(row.id),
                "code": row.code,
                "name": row.name,
                "file_path": row.file_path,
                "document_type": row.document_type,
                "placeholders": meta,
            }
        )
    templates.sort(
        key=lambda t: (t.get("placeholders") or {}).get("package_file_order", 0)
    )
    spec = PACKAGE_TYPE_SPECS.get(package_type)
    max_days = spec.duration_days if spec else 3
    before = len(templates)
    templates = filter_templates_by_package_duration(
        templates,
        package_type=package_type,
        max_days=max_days,
    )
    if len(templates) < before:
        logger.info(
            "Paquet %s (%sj) : %s fichier(s) exclus (jours > %s)",
            package_type,
            max_days,
            before - len(templates),
            max_days,
        )
    profile = {
        "id": str(profile_row.id),
        "name": profile_row.name,
        "preparation_theme": profile_row.preparation_theme,
        "package_type": profile_row.package_type or package_type,
        "event_type_label": profile_row.event_type_label,
        "bundle_id": str(profile_row.active_bundle_id) if profile_row.active_bundle_id else None,
    }
    return profile, templates, classified


async def _analyze_templates_before_generation(
    db: AsyncSession,
    settings: Settings,
    *,
    job_id: UUID,
    templates: list[dict],
) -> None:
    """
    Analyse IA + règles de chaque modèle AVANT le rendu (même logique que
    catalog template_field_analysis). Persiste replacement_fields en base.
    """
    from tip_common.document_section_scanner import scan_document_sections

    storage = get_object_storage(settings)
    force_reanalyze = os.getenv("DOCGEN_FORCE_REANALYZE", "").lower() in ("1", "true", "yes")
    use_ai = os.getenv("DOCGEN_GENERATION_USE_AI", "").lower() in ("1", "true", "yes")

    to_analyze: list[dict] = []
    skipped = 0
    for tpl in templates:
        meta = tpl.get("placeholders") or {}
        arcname = meta.get("source_file") or tpl["name"]
        ext = Path(arcname).suffix.lower()
        replaceable = meta.get("replaceable") or ext in {".docx", ".doc", ".xlsx"}
        if not (replaceable and ext in {".docx", ".doc", ".xlsx"}):
            continue
        if not force_reanalyze and meta.get("replacement_fields"):
            skipped += 1
            continue
        to_analyze.append(tpl)

    total = len(to_analyze)
    if not total:
        if skipped:
            await append_job_log(
                db,
                job_id,
                message=f"Analyse modèles ignorée — règles déjà en base ({skipped} fichier(s)).",
            )
        return

    if skipped:
        await append_job_log(
            db,
            job_id,
            message=(
                f"Analyse partielle — {skipped} fichier(s) déjà en base, "
                f"{total} à analyser…"
            ),
        )
    else:
        await append_job_log(
            db,
            job_id,
            message=f"Analyse des modèles — {total} fichier(s) remplaçable(s)…",
        )
    delay = float(os.getenv("DOCGEN_ANALYSIS_DELAY", "0.15"))

    for index, tpl in enumerate(to_analyze, start=1):
        meta = dict(tpl.get("placeholders") or {})
        arcname = meta.get("source_file") or tpl["name"]
        code = tpl.get("code") or ""
        document_role = meta.get("document_role") or tpl.get("document_type") or "autre"

        await append_job_log(
            db,
            job_id,
            message=f"[{index}/{total}] Analyse {code} ({arcname})",
        )
        logger.info("[%s/%s] Analyse %s (%s)", index, total, code, arcname)

        raw = storage.download_bytes(tpl["file_path"])
        analysis = await scan_document_sections(
            filename=arcname,
            file_bytes=raw,
            document_role=document_role,
            use_ai=use_ai,
        )
        fields = analysis.get("replacement_fields") or []
        classifier = analysis.get("classifier") or "rules"

        meta["replacement_fields"] = fields
        meta["field_analysis_classifier"] = classifier
        meta["section_count"] = analysis.get("section_count")
        meta["field_samples"] = [f.get("sample") for f in fields if f.get("sample")][:40]
        tpl["placeholders"] = meta

        await db.execute(
            text(
                """
                UPDATE catalog.package_templates
                SET placeholders = CAST(:placeholders AS jsonb)
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": tpl["id"],
                "placeholders": json.dumps(meta, ensure_ascii=False),
            },
        )
        await db.commit()

        result_msg = f"  → {len(fields)} champs ({classifier})"
        await append_job_log(db, job_id, message=result_msg)
        logger.info(result_msg)

        if delay and index < total:
            await asyncio.sleep(delay)


def _zip_filename(event: dict) -> str:
    project = event.get("project_number") or "projet"
    city = event.get("city") or ""
    country = event.get("country") or ""
    date = event.get("start_date") or datetime.now(timezone.utc).date().isoformat()
    safe = "_".join(part for part in (project, city, country, str(date)) if part)
    return f"{safe}_paquet.zip".replace(" ", "-")


async def build_package_zip(
    db: AsyncSession,
    settings: Settings,
    *,
    job_id: UUID,
    event_id: UUID,
) -> tuple[str, str, int]:
    await append_job_log(db, job_id, message="Chargement de l'événement…")
    event = await _load_event(db, event_id)
    _assert_event_upcoming(event)
    await append_job_log(
        db,
        job_id,
        message=(
            f"Événement chargé : {event.get('project_number')} — {event.get('title')} "
            f"({event.get('preparation_theme')})"
        ),
    )

    await append_job_log(db, job_id, message="Résolution du profil paquet…")
    profile, templates, classified = await _load_profile_templates(db, event)
    if not templates:
        raise ValueError("Profil paquet sans templates actifs.")
    await append_job_log(
        db,
        job_id,
        message=f"Profil résolu — {profile.get('package_type')} ({len(templates)} modèle(s))",
    )

    prepared_by = await _load_prepared_by(db, job_id)
    responsible_photo = await _load_responsible_photo(
        db,
        event_id,
        settings,
        metadata_json=event.get("metadata_json"),
    )
    enriched_event = await enrich_event_context(
        event,
        package_type=profile.get("package_type"),
        classified=classified,
    )
    if prepared_by:
        enriched_event["prepared_by"] = prepared_by
        enriched_event["prepared_by_name"] = prepared_by
    if responsible_photo:
        enriched_event["responsible_photo_bytes"] = responsible_photo
    render_context = build_event_context(enriched_event)
    spec = PACKAGE_TYPE_SPECS.get(profile.get("package_type") or "")
    duration_label = f"{spec.duration_days} jour" if spec and spec.duration_days == 1 else f"{spec.duration_days} jours" if spec else "—"
    await append_job_log(
        db,
        job_id,
        message=(
            f"Paquet {profile.get('package_type')} ({profile.get('event_type_label')}, {duration_label}) — "
            f"{len(templates)} fichier(s) — IA : {(classified or {}).get('classifier', 'rules')}"
        ),
    )

    await _analyze_templates_before_generation(
        db, settings, job_id=job_id, templates=templates
    )

    storage = get_object_storage(settings)
    dossier_prefix = f"{GENERATIONS_EVENT_PREFIX}{event_id}/{job_id}/"
    artifact_keys: list[str] = []
    buffer = io.BytesIO()

    readme = (
        "Paquet documentaire TIP — Traumatec Impact Platform\n"
        f"Projet: {event.get('project_number')} — {event.get('title')}\n"
        f"Thème: {event.get('preparation_theme')}\n"
        f"Dates: {render_context.get('start_date')} — {render_context.get('end_date')}\n"
        f"Lieu: {render_context.get('lieu')}\n"
        f"Profil: {profile.get('name')}\n"
        f"Type paquet: {profile.get('package_type')} ({profile.get('event_type_label')})\n"
        f"Fichiers: {len(templates)} (docxtpl + surlignages)\n"
        f"Généré: {datetime.now(timezone.utc).isoformat()}\n"
    )
    readme_arc = "00_README.txt"
    readme_key = f"{dossier_prefix}{readme_arc}"
    storage.upload_bytes(readme_key, readme.encode("utf-8"), content_type="text/plain; charset=utf-8")
    artifact_keys.append(readme_key)
    await append_job_log(db, job_id, message="README généré et stocké")

    zip_entries: list[tuple[str, bytes]] = []
    for tpl in templates:
        meta = tpl.get("placeholders") or {}
        arcname = meta.get("source_file") or tpl["name"]
        ext = Path(arcname).suffix or Path(tpl["file_path"]).suffix or ".docx"
        raw = storage.download_bytes(tpl["file_path"])
        from tip_common.package_types import infer_document_type, template_day_index

        document_role = meta.get("document_role") or infer_document_type(arcname)
        day_index = template_day_index(arcname)
        replaceable = meta.get("replaceable") or ext.lower() in {".docx", ".doc", ".xlsx"}
        if replaceable and ext.lower() in {".docx", ".doc", ".xlsx"}:
            replacement_fields = list(meta.get("replacement_fields") or [])
            content = render_package_document(
                raw,
                suffix=ext,
                context=render_context,
                replacement_fields=replacement_fields,
                document_role=document_role,
                day_index=day_index,
            )
            await append_job_log(
                db,
                job_id,
                message=(
                    f"Rendu {ext.lstrip('.')} : {arcname} "
                    f"({len(replacement_fields)} remplacements, rôle {document_role})"
                ),
            )
        else:
            content = raw
            await append_job_log(db, job_id, message=f"Copie : {arcname}")
        content_type = _guess_content_type(ext)
        file_key = f"{dossier_prefix}{arcname}"
        storage.upload_bytes(file_key, content, content_type=content_type)
        artifact_keys.append(file_key)
        zip_entries.append((arcname, content))

    manifest = {
        "event_id": str(event_id),
        "job_id": str(job_id),
        "preparation_theme": event.get("preparation_theme"),
        "package_type": profile.get("package_type"),
        "event_type_label": profile.get("event_type_label"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dossier_prefix": dossier_prefix,
        "artifacts": artifact_keys,
        "template_codes": [t["code"] for t in templates],
    }
    manifest_key = f"{dossier_prefix}_manifest.json"
    storage.upload_bytes(
        manifest_key,
        json.dumps(manifest, indent=2, ensure_ascii=False).encode("utf-8"),
        content_type="application/json",
    )
    artifact_keys.append(manifest_key)
    await append_job_log(db, job_id, message="Manifeste de traçabilité écrit")

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(readme_arc, readme)
        for arcname, content in zip_entries:
            zf.writestr(arcname, content)

    zip_name = _zip_filename(event)
    zip_key = f"{GENERATIONS_PREFIX}{job_id}/{zip_name}"
    storage.upload_bytes(zip_key, buffer.getvalue(), content_type="application/zip")
    artifact_keys.append(zip_key)
    await append_job_log(db, job_id, message=f"Archive ZIP créée : {zip_name}")

    traceability = {
        "dossier_prefix": dossier_prefix,
        "zip_path": zip_key,
        "artifacts": artifact_keys,
    }

    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET zip_path = :zip_path,
                zip_filename = :zip_filename,
                certificate_count = :count,
                template_versions_json = CAST(:traceability AS jsonb)
            WHERE id = :job_id
            """
        ),
        {
            "zip_path": zip_key,
            "zip_filename": zip_name,
            "count": len(templates),
            "traceability": json.dumps(traceability, ensure_ascii=False),
            "job_id": str(job_id),
        },
    )
    await db.commit()
    return zip_key, zip_name, len(templates)


def run_docgen_job(job_id: str) -> None:
    import asyncio

    from app.core.config import get_settings
    from app.core.database import AsyncSessionLocal

    settings = get_settings()

    async def _run() -> None:
        jid = UUID(job_id)
        async with AsyncSessionLocal() as session:
            row = await session.execute(
                text("SELECT event_id FROM docgen.generation_jobs WHERE id = :id"),
                {"id": str(jid)},
            )
            event_id = UUID(str(row.scalar_one()))
            await session.execute(
                text(
                    "UPDATE docgen.generation_jobs SET status = 'running', started_at = now() WHERE id = :id"
                ),
                {"id": str(jid)},
            )
            await session.commit()
            await append_job_log(session, jid, message="Job démarré — génération du paquet documentaire")
            try:
                _, zip_name, count = await build_package_zip(
                    session, settings, job_id=jid, event_id=event_id
                )
                await append_job_log(
                    session,
                    jid,
                    message=f"Génération terminée — {count} fichier(s), ZIP : {zip_name}",
                )
                await session.execute(
                    text(
                        "UPDATE docgen.generation_jobs SET status = 'completed', completed_at = now() WHERE id = :id"
                    ),
                    {"id": str(jid)},
                )
            except Exception as exc:
                logger.exception("DocGen job %s failed", job_id)
                await session.rollback()
                await append_job_log(session, jid, level="error", message=str(exc)[:2000])
                await session.execute(
                    text(
                        """
                        UPDATE docgen.generation_jobs
                        SET status = 'failed', error_message = :err, completed_at = now()
                        WHERE id = :id
                        """
                    ),
                    {"id": str(jid), "err": str(exc)[:2000]},
                )
            await session.commit()

    asyncio.run(_run())
