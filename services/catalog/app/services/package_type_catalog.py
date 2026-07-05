"""Catalogue de types de paquets : fusion specs système + définitions admin."""

from __future__ import annotations

import re

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import PackageActivityCategory, PackageTypeDefinition
from tip_common.package_types import (
    ACTIVITY_COURS,
    ACTIVITY_FACULTY,
    ACTIVITY_SEMINAIRE,
    list_package_types_by_activity,
)

BUILTIN_ACTIVITY_KINDS = {
    ACTIVITY_COURS: "Cours",
    ACTIVITY_SEMINAIRE: "Séminaire",
    ACTIVITY_FACULTY: "Faculty Education Training",
}

_CATEGORY_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{1,31}$")


def normalize_category_code(raw: str) -> str:
    code = raw.strip().lower().replace("-", "_").replace(" ", "_")
    code = re.sub(r"[^a-z0-9_]+", "", code)
    return code


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


async def get_activity_categories(db: AsyncSession) -> list[dict]:
    merged: dict[str, dict] = {
        code: {
            "code": code,
            "label": label,
            "sort_order": index,
            "is_custom": False,
            "is_builtin": True,
        }
        for index, (code, label) in enumerate(BUILTIN_ACTIVITY_KINDS.items())
    }

    result = await db.execute(
        select(PackageActivityCategory)
        .where(PackageActivityCategory.is_active.is_(True))
        .order_by(PackageActivityCategory.sort_order, PackageActivityCategory.label)
    )
    for row in result.scalars().all():
        if row.code in BUILTIN_ACTIVITY_KINDS:
            merged[row.code]["label"] = row.label
            merged[row.code]["sort_order"] = row.sort_order
            continue
        merged[row.code] = {
            "code": row.code,
            "label": row.label,
            "sort_order": row.sort_order,
            "is_custom": True,
            "is_builtin": False,
        }

    return sorted(merged.values(), key=lambda item: (item["sort_order"], item["label"]))


async def list_custom_activity_categories(db: AsyncSession) -> list[PackageActivityCategory]:
    result = await db.execute(
        select(PackageActivityCategory).order_by(
            PackageActivityCategory.sort_order,
            PackageActivityCategory.label,
        )
    )
    return list(result.scalars().all())


async def get_valid_activity_kind_codes(db: AsyncSession) -> set[str]:
    categories = await get_activity_categories(db)
    return {item["code"] for item in categories}


async def get_activity_category_label(db: AsyncSession, code: str) -> str:
    categories = await get_activity_categories(db)
    for item in categories:
        if item["code"] == code:
            return item["label"]
    return code


async def get_merged_package_types(db: AsyncSession) -> dict[str, list[dict]]:
    categories = await get_activity_categories(db)
    merged: dict[str, list[dict]] = {item["code"]: [] for item in categories}

    builtin = list_package_types_by_activity()
    for kind, rows in builtin.items():
        if kind not in merged:
            merged[kind] = []
        merged[kind] = [_type_dict(row, is_custom=False) for row in rows]

    result = await db.execute(
        select(PackageTypeDefinition)
        .where(PackageTypeDefinition.is_active.is_(True))
        .order_by(PackageTypeDefinition.activity_kind, PackageTypeDefinition.sort_order, PackageTypeDefinition.label)
    )
    for defn in result.scalars().all():
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


async def get_package_catalog(db: AsyncSession) -> dict:
    return {
        "categories": await get_activity_categories(db),
        "types": await get_merged_package_types(db),
    }


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


async def count_types_in_category(db: AsyncSession, category_code: str) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(PackageTypeDefinition)
        .where(PackageTypeDefinition.activity_kind == category_code)
    )
    return int(result.scalar_one())
