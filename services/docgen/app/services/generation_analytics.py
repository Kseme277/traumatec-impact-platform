"""Statistiques agrégées des générations documentaires (graphiques admin)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.storage_garbage_collector import get_zip_inventory


async def get_generation_analytics(session: AsyncSession, retention_days: int) -> dict:
    inventory = await get_zip_inventory(session, retention_days)

    status_rows = await session.execute(
        text(
            """
            SELECT status, COUNT(*)::int AS count
            FROM docgen.generation_jobs
            GROUP BY status
            ORDER BY count DESC
            """
        )
    )
    by_status = [
        {"status": str(row["status"]), "count": int(row["count"] or 0)}
        for row in status_rows.mappings()
    ]

    totals_row = await session.execute(
        text(
            """
            SELECT
                COUNT(*)::int AS total_jobs,
                COALESCE(SUM(certificate_count) FILTER (WHERE status = 'completed'), 0)::int AS total_certificates,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_jobs,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_jobs
            FROM docgen.generation_jobs
            """
        )
    )
    totals = totals_row.mappings().one()
    total_jobs = int(totals["total_jobs"] or 0)
    total_certificates = int(totals["total_certificates"] or 0)
    completed_jobs = int(totals["completed_jobs"] or 0)
    failed_jobs = int(totals["failed_jobs"] or 0)
    finished = completed_jobs + failed_jobs
    success_rate = round((completed_jobs / finished) * 100, 1) if finished else 0.0

    month_rows = await session.execute(
        text(
            """
            SELECT
                to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COUNT(*)::int AS jobs,
                COALESCE(SUM(certificate_count) FILTER (WHERE status = 'completed'), 0)::int AS certificates
            FROM docgen.generation_jobs
            WHERE created_at >= (now() AT TIME ZONE 'utc') - interval '12 months'
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at)
            """
        )
    )
    by_month = [
        {
            "month": str(row["month"]),
            "jobs": int(row["jobs"] or 0),
            "certificates": int(row["certificates"] or 0),
        }
        for row in month_rows.mappings()
    ]

    top_rows = await session.execute(
        text(
            """
            SELECT
                j.event_id::text AS event_id,
                COALESCE(e.title, 'Événement') AS event_title,
                COALESCE(e.project_number, '—') AS project_number,
                COUNT(*)::int AS jobs,
                COALESCE(SUM(j.certificate_count) FILTER (WHERE j.status = 'completed'), 0)::int AS certificates
            FROM docgen.generation_jobs j
            LEFT JOIN events.events e ON e.id = j.event_id
            GROUP BY j.event_id, e.title, e.project_number
            ORDER BY jobs DESC, certificates DESC
            LIMIT 8
            """
        )
    )
    top_events = [
        {
            "event_id": str(row["event_id"]),
            "event_title": str(row["event_title"]),
            "project_number": str(row["project_number"]),
            "jobs": int(row["jobs"] or 0),
            "certificates": int(row["certificates"] or 0),
        }
        for row in top_rows.mappings()
    ]

    return {
        "total_jobs": total_jobs,
        "total_certificates": total_certificates,
        "success_rate": success_rate,
        "by_status": by_status,
        "by_month": by_month,
        "top_events": top_events,
        "inventory": inventory,
    }
