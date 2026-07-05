"""Catalogue de types de paquets : fusion specs système + définitions admin."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import PackageTypeDefinition
from tip_common.package_types import (
    ACTIVITY_COURS,
    ACTIVITY_FACULTY,
    ACTIVITY_SEMINAIRE,
    list_package_types_by_activity,
)

ACTIVITY_KIND_LABELS = {
    ACTIVITY_COURS: "Cours",
    ACTIVITY_SEMINAIRE: "Séminaire",
    ACTIVITY_FACULTY: "Faculty Education Training",
}


def _type_dict(row: dict, *, is_custom: bool) -> dict:
    return {**row, "is_custom": is_custom}


def _definition_to_dict(defn: PackageTypeDefinition) -> dict:
    return _type_dict(
        {
            "code": defn.code,
            "label": defn.label,
            "activity_kind": defn.activity_kind,
            "activity_label": defn.activity_label,
            "title": defn.title,
            "description": defn.description or "",
            "preparation_theme": defn.preparation_theme,
            "duration_days": defn.duration_days,
            "sort_order": defn.sort_order,
        },
        is_custom=True,
    )


async def get_merged_package_types(db: AsyncSession) -> dict[str, list[dict]]:
    builtin = list_package_types_by_activity()
    merged: dict[str, list[dict]] = {
        ACTIVITY_COURS: [_type_dict(row, is_custom=False) for row in builtin.get(ACTIVITY_COURS, [])],
        ACTIVITY_SEMINAIRE: [_type_dict(row, is_custom=False) for row in builtin.get(ACTIVITY_SEMINAIRE, [])],
        ACTIVITY_FACULTY: [_type_dict(row, is_custom=False) for row in builtin.get(ACTIVITY_FACULTY, [])],
    }

    result = await db.execute(
        select(PackageTypeDefinition)
        .where(PackageTypeDefinition.is_active.is_(True))
        .order_by(PackageTypeDefinition.activity_kind, PackageTypeDefinition.sort_order, PackageTypeDefinition.label)
    )
    custom_rows = list(result.scalars().all())

    for defn in custom_rows:
        kind = defn.activity_kind
        if kind not in merged:
            merged[kind] = []
        payload = _definition_to_dict(defn)
        existing_codes = {row["code"] for row in merged[kind]}
        if defn.code in existing_codes:
            merged[kind] = [payload if row["code"] == defn.code else row for row in merged[kind]]
        else:
            merged[kind].append(payload)

    for items in merged.values():
        items.sort(key=lambda row: (row.get("sort_order", 0), row["label"]))

    return merged


async def list_custom_package_types(db: AsyncSession) -> list[PackageTypeDefinition]:
    result = await db.execute(
        select(PackageTypeDefinition).order_by(
            PackageTypeDefinition.activity_kind,
            PackageTypeDefinition.sort_order,
            PackageTypeDefinition.label,
        )
    )
    return list(result.scalars().all())


async def resolve_package_type_spec(db: AsyncSession, code: str) -> dict[str, str | int]:
    normalized = code.strip().upper().replace("-", "_")
    result = await db.execute(
        select(PackageTypeDefinition).where(
            PackageTypeDefinition.code == normalized,
            PackageTypeDefinition.is_active.is_(True),
        )
    )
    defn = result.scalar_one_or_none()
    if defn:
        return {
            "code": defn.code,
            "label": defn.label,
            "preparation_theme": defn.preparation_theme,
            "activity_kind": defn.activity_kind,
            "activity_label": defn.activity_label,
            "title": defn.title,
            "description": defn.description or "",
            "duration_days": defn.duration_days,
        }

    from tip_common.package_types import PACKAGE_TYPE_SPECS

    spec = PACKAGE_TYPE_SPECS.get(normalized)
    if spec is None:
        raise ValueError(f"Type de paquet inconnu : {normalized}")
    return {
        "code": spec.code,
        "label": spec.label,
        "preparation_theme": spec.preparation_theme,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "title": spec.title,
        "description": spec.description,
        "duration_days": spec.duration_days,
    }
