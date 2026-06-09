"""Extraction des features ML depuis événements TIP."""

from __future__ import annotations

import hashlib
from datetime import date
from typing import Any

REGION_IDS = {
    "yaoundé": 1,
    "yaounde": 1,
    "douala": 2,
    "libreville": 3,
    "bangui": 4,
    "kinshasa": 5,
    "mbeya": 6,
    "nairobi": 7,
    "addis ababa": 8,
    "default": 0,
}

BUDGET_FEATURES = ["total_budget", "allocation_logistique", "allocation_pedagogique", "ratio_perdiem"]
ATTENDANCE_FEATURES = ["id_region", "type_seminaire", "mois_evenement", "budget_alloue"]

THEME_IDS = {
    "operatory": 1,
    "pbo": 2,
    "iec": 3,
    "default": 0,
}


def region_id(city: str | None, region: str | None, country: str | None) -> int:
    haystack = f"{city or ''} {region or ''} {country or ''}".lower()
    for key, value in REGION_IDS.items():
        if key != "default" and key in haystack:
            return value
    return REGION_IDS["default"]


def seminar_type_id(preparation_theme: str | None, event_type: str | None) -> int:
    theme = (preparation_theme or "").lower()
    if theme in THEME_IDS:
        return THEME_IDS[theme]
    et = (event_type or "").lower()
    if "iec" in et:
        return THEME_IDS["iec"]
    if "pbo" in et or "orp" in et:
        return THEME_IDS["pbo"]
    if "operatory" in et or "op" in et:
        return THEME_IDS["operatory"]
    return THEME_IDS["default"]


def event_month(start_date: date | str | None) -> int:
    if start_date is None:
        return 6
    if isinstance(start_date, str):
        try:
            return int(start_date[5:7])
        except (ValueError, IndexError):
            return 6
    return int(start_date.month)


def budget_features_from_row(row: dict[str, Any]) -> dict[str, float]:
    total = float(row.get("amount_chf") or 0)
    meta = row.get("metadata_json") or {}
    if not isinstance(meta, dict):
        meta = {}
    excel = meta.get("excel") or {}
    if not isinstance(excel, dict):
        excel = {}

    logistics = float(excel.get("logistics_chf") or excel.get("allocation_logistique") or total * 0.35)
    pedagogical = float(excel.get("pedagogical_chf") or excel.get("allocation_pedagogique") or total * 0.45)
    perdiem = float(excel.get("perdiem_chf") or total * 0.12)
    ratio_perdiem = perdiem / total if total > 0 else 0.15

    return {
        "total_budget": max(total, 1.0),
        "allocation_logistique": max(logistics, 0.0),
        "allocation_pedagogique": max(pedagogical, 0.0),
        "ratio_perdiem": min(max(ratio_perdiem, 0.0), 1.0),
    }


def attendance_features_from_row(row: dict[str, Any]) -> dict[str, float]:
    total_budget = float(row.get("amount_chf") or 5000)
    return {
        "id_region": float(region_id(row.get("city"), row.get("region"), row.get("country"))),
        "type_seminaire": float(seminar_type_id(row.get("preparation_theme"), row.get("event_type"))),
        "mois_evenement": float(event_month(row.get("start_date"))),
        "budget_alloue": max(total_budget, 500.0),
    }


def synthetic_training_rows(count: int = 120) -> list[dict[str, Any]]:
    """Jeu de secours si l'historique PostgreSQL est insuffisant."""
    rows: list[dict[str, Any]] = []
    cities = list(REGION_IDS.keys())
    themes = ["operatory", "pbo", "iec"]
    for i in range(count):
        offset = int(hashlib.md5(str(i).encode()).hexdigest()[0:2], 16)
        total = 8000 + (i % 17) * 1200 + offset * 5
        logistics = total * (0.25 + (i % 5) * 0.03)
        pedagogical = total * (0.35 + (i % 4) * 0.04)
        perdiem = total * (0.08 + (i % 3) * 0.02)
        participants = int(18 + (total / 1200) + (i % 9) * 3)
        rows.append(
            {
                "amount_chf": total,
                "participants_real": participants,
                "participants_expected": participants + (i % 3),
                "city": cities[i % len(cities)],
                "region": cities[i % len(cities)],
                "country": "Cameroun",
                "preparation_theme": themes[i % 3],
                "event_type": themes[i % 3],
                "start_date": date(2024 + (i % 2), (i % 12) + 1, 10),
                "metadata_json": {
                    "excel": {
                        "logistics_chf": logistics,
                        "pedagogical_chf": pedagogical,
                        "perdiem_chf": perdiem,
                    }
                },
                "is_anomaly": 1 if (i % 23 == 0) else 0,
            }
        )
    return rows
