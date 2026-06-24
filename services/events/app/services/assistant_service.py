from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.national_contact import NationalContact
from app.models.participant import Participant
from app.models.teacher import Teacher
from tip_common.security import AuthenticatedUser


def _tokens(message: str) -> list[str]:
    return [part for part in message.lower().split() if len(part) >= 2][:12]


async def _search_events(db: AsyncSession, message: str, *, limit: int = 8) -> list[dict[str, Any]]:
    tokens = _tokens(message)
    query = select(Event).order_by(Event.start_date.desc().nullslast()).limit(limit)
    if tokens:
        clauses = []
        for token in tokens:
            pattern = f"%{token}%"
            clauses.append(
                or_(
                    Event.title.ilike(pattern),
                    Event.project_number.ilike(pattern),
                    Event.city.ilike(pattern),
                    Event.country.ilike(pattern),
                    Event.responsible_person.ilike(pattern),
                    Event.event_type.ilike(pattern),
                )
            )
        query = select(Event).where(or_(*clauses)).order_by(Event.start_date.desc().nullslast()).limit(limit)
    rows = (await db.execute(query)).scalars().all()
    return [
        {
            "id": str(event.id),
            "project_number": event.project_number,
            "title": event.title,
            "city": event.city,
            "country": event.country,
            "start_date": event.start_date.isoformat() if event.start_date else None,
            "project_status": event.project_status,
            "status": event.status,
            "responsible_person": event.responsible_person,
            "organizer_responsible_user_id": event.organizer_responsible_user_id,
        }
        for event in rows
    ]


async def _search_users(db: AsyncSession, message: str, *, limit: int = 6) -> list[dict[str, Any]]:
    tokens = _tokens(message)
    if not tokens:
        return []
    clauses = " OR ".join(
        f"(LOWER(prenom) LIKE :p{i} OR LOWER(nom) LIKE :p{i} OR LOWER(email) LIKE :p{i})"
        for i in range(len(tokens))
    )
    params = {f"p{i}": f"%{token}%" for i, token in enumerate(tokens)}
    params["lim"] = limit
    result = await db.execute(
        text(
            f"""
            SELECT id, prenom, nom, email, role, est_actif
            FROM identity.utilisateurs
            WHERE {clauses}
            ORDER BY nom, prenom
            LIMIT :lim
            """
        ),
        params,
    )
    return [
        {
            "id": row.id,
            "name": f"{row.prenom} {row.nom}".strip(),
            "email": row.email,
            "role": row.role,
            "active": row.est_actif,
        }
        for row in result.mappings().all()
    ]


async def _search_teachers(db: AsyncSession, message: str, *, limit: int = 6) -> list[dict[str, Any]]:
    tokens = _tokens(message)
    query = select(Teacher).where(Teacher.is_active.is_(True)).order_by(Teacher.last_name).limit(limit)
    if tokens:
        clauses = []
        for token in tokens:
            pattern = f"%{token}%"
            clauses.append(
                or_(
                    Teacher.first_name.ilike(pattern),
                    Teacher.last_name.ilike(pattern),
                    Teacher.email.ilike(pattern),
                )
            )
        query = (
            select(Teacher)
            .where(Teacher.is_active.is_(True), or_(*clauses))
            .order_by(Teacher.last_name)
            .limit(limit)
        )
    rows = (await db.execute(query)).scalars().all()
    return [
        {
            "id": str(row.id),
            "name": f"{row.first_name} {row.last_name}".strip(),
            "email": row.email,
            "phone": row.phone,
        }
        for row in rows
    ]


async def _search_nationals(db: AsyncSession, message: str, *, limit: int = 6) -> list[dict[str, Any]]:
    tokens = _tokens(message)
    query = select(NationalContact).where(NationalContact.is_active.is_(True)).limit(limit)
    if tokens:
        clauses = []
        for token in tokens:
            pattern = f"%{token}%"
            clauses.append(
                or_(
                    NationalContact.full_name.ilike(pattern),
                    NationalContact.email.ilike(pattern),
                    NationalContact.phone.ilike(pattern),
                )
            )
        query = select(NationalContact).where(NationalContact.is_active.is_(True), or_(*clauses)).limit(limit)
    rows = (await db.execute(query)).scalars().all()
    return [
        {
            "id": str(row.id),
            "name": row.full_name,
            "email": row.email,
            "phone": row.phone,
        }
        for row in rows
    ]


async def _workflow_snapshot(db: AsyncSession) -> dict[str, int]:
    result = await db.execute(
        text(
            """
            SELECT workflow_status, COUNT(*)::int AS cnt
            FROM docgen.generation_jobs
            WHERE workflow_status IS NOT NULL
            GROUP BY workflow_status
            """
        )
    )
    return {row.workflow_status: row.cnt for row in result.mappings().all()}


async def _participant_totals(db: AsyncSession) -> dict[str, int]:
    total = (await db.execute(select(func.count()).select_from(Participant))).scalar_one()
    teachers = (
        await db.execute(
            select(func.count()).select_from(Participant).where(Participant.certificate_role == "enseignant")
        )
    ).scalar_one()
    return {"total": total, "enseignants_inscriptions": teachers}


async def _platform_metrics(db: AsyncSession) -> dict[str, Any]:
    total = (await db.execute(select(func.count()).select_from(Event))).scalar_one()
    open_count = (
        await db.execute(
            select(func.count()).select_from(Event).where(func.upper(Event.project_status) == "OPEN")
        )
    ).scalar_one()
    closed_count = (
        await db.execute(
            select(func.count()).select_from(Event).where(func.upper(Event.project_status) == "CLOSED")
        )
    ).scalar_one()
    today = date.today()
    upcoming = (
        await db.execute(
            select(func.count()).select_from(Event).where(func.coalesce(Event.end_date, Event.start_date) >= today)
        )
    ).scalar_one()
    amount_sum = (await db.execute(select(func.sum(Event.amount_chf)))).scalar_one()
    return {
        "events_total": total,
        "events_open": open_count,
        "events_closed": closed_count,
        "events_upcoming": upcoming,
        "budget_chf_total": float(amount_sum or 0),
    }


async def build_assistant_context(
    db: AsyncSession,
    user: AuthenticatedUser,
    message: str,
) -> dict[str, Any]:
    metrics = await _platform_metrics(db)
    today = date.today().isoformat()

    context: dict[str, Any] = {
        "platform": "Traumatec Impact Platform (TIP)",
        "date": today,
        "user": {
            "name": f"{user.prenom} {user.nom}".strip(),
            "email": user.email,
            "roles": list(user.roles),
            "is_admin": user.is_admin,
        },
        "metrics": metrics,
        "workflow_jobs_by_status": await _workflow_snapshot(db),
        "participants_registry": await _participant_totals(db),
        "search_hits": {
            "events": await _search_events(db, message),
            "teachers": await _search_teachers(db, message),
            "national_contacts": await _search_nationals(db, message),
        },
    }

    if user.is_admin:
        try:
            context["search_hits"]["users"] = await _search_users(db, message)
        except Exception:
            context["search_hits"]["users"] = []
        try:
            audit = await db.execute(
                text(
                    """
                SELECT action, entity_type, entity_id, created_at::text
                FROM identity.audit_logs
                ORDER BY created_at DESC
                LIMIT 8
                """
                )
            )
            context["recent_audit"] = [dict(row) for row in audit.mappings().all()]
        except Exception:
            context["recent_audit"] = []

    teacher_count = (await db.execute(select(func.count()).select_from(Teacher))).scalar_one()
    national_count = (await db.execute(select(func.count()).select_from(NationalContact))).scalar_one()
    context["referentials"] = {
        "teachers_count": teacher_count,
        "national_contacts_count": national_count,
    }

    return context


SYSTEM_PROMPT = """Tu es l'assistant IA de la plateforme Traumatec Impact Platform (TIP).
Tu réponds en français sauf si l'utilisateur écrit en anglais.
Tu aides les équipes Traumatec à : préparer des événements, générer des paquets documentaires,
gérer les certificats, le workflow (contrôle procédure / validation finale) et l'administration.

Règles :
- Base-toi UNIQUEMENT sur le contexte JSON fourni (données réelles de la base TIP).
- Si une information manque, dis-le clairement au lieu d'inventer.
- Pour les métriques, cite les chiffres du contexte (événements, budget CHF, participants, workflow).
- Pour les recherches, utilise search_hits (événements, utilisateurs, enseignants, contacts nationaux).
- Propose des actions concrètes quand pertinent (ex. compléter la fiche événement, lancer la génération).
- Les commandes rapides restent disponibles : « aide », « génère le paquet pour … », « liste les événements ».
- Réponses concises, structurées, professionnelles (listes à puces si utile).
"""


async def local_assistant_reply(context: dict[str, Any], message: str) -> str:
    """Réponse de secours sans NVIDIA."""
    metrics = context.get("metrics", {})
    lowered = message.lower().strip()
    if lowered in {"salut", "bonjour", "hello", "hi", "coucou"}:
        name = context.get("user", {}).get("name", "")
        return (
            f"Bonjour {name} ! Je suis l'assistant TIP. "
            f"La plateforme compte {metrics.get('events_total', 0)} événements "
            f"({metrics.get('events_open', 0)} ouverts). "
            "Posez-moi une question sur un événement, les métriques ou tapez « aide » pour les commandes."
        )

    if any(word in lowered for word in ("métrique", "metric", "stat", "tableau de bord", "dashboard", "combien")):
        part = context.get("participants_registry", {})
        ref = context.get("referentials", {})
        lines = [
            f"• Événements : {metrics.get('events_total', 0)} total — {metrics.get('events_open', 0)} ouverts, {metrics.get('events_closed', 0)} clôturés",
            f"• À venir (calendrier) : {metrics.get('events_upcoming', 0)}",
            f"• Budget CHF (somme projets) : {metrics.get('budget_chf_total', 0):,.0f}",
            f"• Inscriptions participants : {part.get('total', 0)} ({part.get('enseignants_inscriptions', 0)} enseignants)",
            f"• Référentiel : {ref.get('teachers_count', 0)} enseignants, {ref.get('national_contacts_count', 0)} contacts nationaux",
        ]
        wf = context.get("workflow_jobs_by_status") or {}
        if wf:
            wf_line = ", ".join(f"{k}: {v}" for k, v in wf.items())
            lines.append(f"• Paquets workflow : {wf_line}")
        return "Voici les indicateurs actuels :\n" + "\n".join(lines)

    hits = context.get("search_hits", {})
    events = hits.get("events") or []
    if events:
        lines = [
            f"• {e.get('project_number')} — {e.get('title')} ({e.get('city')}, {e.get('country')})"
            for e in events[:5]
        ]
        return "Événements correspondants en base :\n" + "\n".join(lines)

    return (
        "Je peux vous aider avec les métriques TIP, la recherche en base (événements, utilisateurs, enseignants) "
        "et les actions rapides. Exemples : « Combien d'événements ouverts ? », « Événements au Cameroun », "
        "« génère le paquet pour Yaoundé ». Tapez « aide » pour la liste des commandes."
    )


async def run_assistant_chat(
    db: AsyncSession,
    user: AuthenticatedUser,
    message: str,
    history: list[dict[str, str]],
) -> dict[str, Any]:
    from tip_common.nvidia_client import nvidia_chat_completion

    context = await build_assistant_context(db, user, message)
    context_json = __import__("json").dumps(context, ensure_ascii=False, default=str)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nCONTEXTE_BD_JSON:\n{context_json}"},
    ]
    for item in history[-10:]:
        role = item.get("role", "user")
        if role in {"user", "assistant"}:
            messages.append({"role": role, "content": str(item.get("content", ""))[:4000]})
    messages.append({"role": "user", "content": message[:4000]})

    content, detail = await nvidia_chat_completion(
        messages=messages,
        temperature=0.35,
        max_tokens=900,
        timeout=75.0,
    )

    if content:
        return {
            "reply": content.strip(),
            "source": "nvidia",
            "model": detail,
            "context_summary": {
                "events_total": context["metrics"]["events_total"],
                "search_events": len(context["search_hits"]["events"]),
            },
        }

    fallback = await local_assistant_reply(context, message)
    note = f"\n\n_(Mode local — IA NVIDIA indisponible : {detail})_" if detail else ""
    return {
        "reply": fallback + note,
        "source": "local",
        "model": None,
        "context_summary": {
            "events_total": context["metrics"]["events_total"],
            "search_events": len(context["search_hits"]["events"]),
        },
    }
