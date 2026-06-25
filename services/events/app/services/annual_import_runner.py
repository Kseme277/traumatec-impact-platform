from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models.event import AnnualImport, Event
from app.services.excel_import import parse_projects_workbook
from app.services.import_jobs import ImportJobStatus, import_job_store
from app.services.organizer_linking import resolve_support_user_ids_by_email
from app.services.project_status import tip_status_from_project_status
from app.core.config import get_settings
from tip_common.audit import record_audit_event
from tip_common.email_identity import normalize_email
from tip_common.redis_cache import invalidate_prefix

BATCH_SIZE = 100


async def run_annual_import_job(
    job_id: UUID,
    content: bytes,
    filename: str,
    user_id: int,
) -> None:
    try:
        await import_job_store.update(
            job_id,
            status=ImportJobStatus.PARSING,
            phase="parsing",
            message="Lecture du fichier Excel…",
        )

        def on_parse_progress(processed: int, total: int) -> None:
            import_job_store.update_sync(
                job_id,
                processed=processed,
                total=total,
                message=f"Analyse des lignes… {processed}/{total}",
            )

        rows, parse_errors = parse_projects_workbook(content, on_progress=on_parse_progress)
        if not rows and parse_errors:
            await import_job_store.update(
                job_id,
                status=ImportJobStatus.FAILED,
                phase="failed",
                error=parse_errors[0],
                message="Échec de l'analyse du fichier",
            )
            return

        total_rows = len(rows)
        await import_job_store.update(
            job_id,
            status=ImportJobStatus.IMPORTING,
            phase="importing",
            processed=0,
            total=total_rows,
            message=f"Suppression des événements existants…",
        )

        year = datetime.now(timezone.utc).year
        imported_count = 0
        import_id: UUID

        async with AsyncSessionLocal() as db:
            await db.execute(delete(Event))
            await db.execute(delete(AnnualImport))
            await db.commit()

            await import_job_store.update(
                job_id,
                message=f"Enregistrement des événements… 0/{total_rows}",
            )

            annual_import = AnnualImport(
                year=year,
                filename=filename,
                imported_by_id=user_id,
                row_count=total_rows,
                error_report={"errors": parse_errors} if parse_errors else None,
            )
            db.add(annual_import)
            await db.flush()
            import_id = annual_import.id

            import_emails = {
                str(row.get("organizer_responsible_email")).strip()
                for row in rows
                if row.get("organizer_responsible_email")
            }
            support_by_email = await resolve_support_user_ids_by_email(db, import_emails)

            for index, row in enumerate(rows, start=1):
                metadata = dict(row.get("metadata_json") or {})
                org_email = row.get("organizer_responsible_email")
                org_name = row.get("organizer_responsible_name")
                if org_name:
                    metadata["organizer_responsible_name"] = org_name
                organizer_user_id = None
                if org_email:
                    normalized = normalize_email(str(org_email))
                    organizer_user_id = support_by_email.get(normalized)
                    if not organizer_user_id:
                        metadata["organizer_responsible_email_import"] = str(org_email).strip()

                event = Event(
                    annual_import_id=annual_import.id,
                    project_number=row["project_number"],
                    title=row["title"],
                    event_type=row.get("event_type"),
                    preparation_theme=row.get("preparation_theme"),
                    country=row.get("country"),
                    city=row.get("city"),
                    region=row.get("region"),
                    responsible_person=row.get("responsible_person"),
                    organizer_responsible_user_id=organizer_user_id,
                    project_status=row.get("project_status"),
                    cost_center=row.get("cost_center"),
                    participants_expected=row.get("participants_expected"),
                    participants_real=row.get("participants_real"),
                    amount_chf=row.get("amount_chf"),
                    payments_done_chf=row.get("payments_done_chf"),
                    percent_paid=row.get("percent_paid"),
                    balance_to_pay_chf=row.get("balance_to_pay_chf"),
                    start_date=row.get("start_date"),
                    end_date=row.get("end_date"),
                    status=tip_status_from_project_status(row.get("project_status")),
                    metadata_json=metadata,
                )
                db.add(event)
                imported_count += 1

                if index % BATCH_SIZE == 0 or index == total_rows:
                    await db.commit()
                    await import_job_store.update(
                        job_id,
                        processed=index,
                        message=f"Enregistrement des événements… {index}/{total_rows}",
                    )

        async with AsyncSessionLocal() as audit_db:
            await record_audit_event(
                audit_db,
                actor_id=user_id,
                action="event.import_complete",
                entity_type="import",
                entity_id=str(import_id),
                payload={
                    "filename": filename,
                    "year": year,
                    "imported_count": imported_count,
                    "errors_count": len(parse_errors),
                },
            )
            await audit_db.commit()

        settings = get_settings()
        if settings.cache_enabled:
            await invalidate_prefix(settings.redis_url, "tip:events:")
            await invalidate_prefix(settings.redis_url, "tip:analytics:")

        await import_job_store.update(
            job_id,
            status=ImportJobStatus.COMPLETED,
            phase="completed",
            processed=total_rows,
            total=total_rows,
            message="Import terminé",
            result={
                "import_id": str(import_id),
                "filename": filename,
                "year": year,
                "imported_count": imported_count,
                "skipped_count": 0,
                "errors": parse_errors,
            },
        )
    except Exception as exc:
        await import_job_store.update(
            job_id,
            status=ImportJobStatus.FAILED,
            phase="failed",
            error=str(exc),
            message="Erreur lors de l'import",
        )
