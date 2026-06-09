"""Agrégations et coefficients de corrélation pour les graphiques ML."""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    n = len(pairs)
    if n < 3:
        return None
    xs_v = [p[0] for p in pairs]
    ys_v = [p[1] for p in pairs]
    mean_x = sum(xs_v) / n
    mean_y = sum(ys_v) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
    den_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs_v))
    den_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys_v))
    if den_x == 0 or den_y == 0:
        return None
    return round(num / (den_x * den_y), 3)


def event_month(row: dict[str, Any]) -> int | None:
    start = row.get("start_date")
    if start is None:
        return None
    if hasattr(start, "month"):
        return int(start.month)
    if isinstance(start, str) and len(start) >= 7:
        try:
            return int(start[5:7])
        except ValueError:
            return None
    return None


def build_correlation_dataset(rows: list[dict], predictions: list[dict]) -> dict:
    items: list[dict] = []
    for row, pred in zip(rows, predictions):
        amount = float(row.get("amount_chf") or 0)
        if amount <= 0:
            continue
        items.append(
            {
                "event_id": row["id"],
                "event_title": str(row.get("title") or ""),
                "city": row.get("city"),
                "country": row.get("country"),
                "preparation_theme": row.get("preparation_theme"),
                "amount_chf": amount,
                "participants_expected": row.get("participants_expected"),
                "participants_real": row.get("participants_real"),
                "risk_score": float(pred["risk_score"]),
                "predicted_participants": int(pred["predicted_participants"]),
                "event_month": event_month(row),
            }
        )

    budgets = [i["amount_chf"] for i in items]
    risks = [i["risk_score"] for i in items]
    predicted = [float(i["predicted_participants"]) for i in items]
    real = [
        float(i["participants_real"])
        for i in items
        if i.get("participants_real") is not None
    ]
    real_budgets = [
        i["amount_chf"] for i in items if i.get("participants_real") is not None
    ]

    coefficients = {
        "budget_risk": _pearson(budgets, risks),
        "budget_predicted_participants": _pearson(budgets, predicted),
        "risk_predicted_participants": _pearson(risks, predicted),
        "budget_real_participants": _pearson(real_budgets, real) if len(real) >= 3 else None,
    }

    theme_buckets: dict[str, list[dict]] = defaultdict(list)
    city_buckets: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        theme = (item.get("preparation_theme") or "—").upper()
        theme_buckets[theme].append(item)
        city_key = item.get("city") or item.get("country") or "—"
        city_buckets[str(city_key)].append(item)

    by_theme = []
    for theme, bucket in sorted(theme_buckets.items(), key=lambda x: -len(x[1])):
        by_theme.append(
            {
                "theme": theme,
                "count": len(bucket),
                "avg_risk": round(sum(b["risk_score"] for b in bucket) / len(bucket), 1),
                "avg_predicted_participants": round(
                    sum(b["predicted_participants"] for b in bucket) / len(bucket), 1
                ),
                "avg_budget": round(sum(b["amount_chf"] for b in bucket) / len(bucket), 0),
            }
        )

    by_city = []
    for city, bucket in sorted(city_buckets.items(), key=lambda x: -len(x[1]))[:10]:
        by_city.append(
            {
                "city": city,
                "count": len(bucket),
                "avg_risk": round(sum(b["risk_score"] for b in bucket) / len(bucket), 1),
                "avg_predicted_participants": round(
                    sum(b["predicted_participants"] for b in bucket) / len(bucket), 1
                ),
            }
        )

    return {
        "items": items,
        "coefficients": coefficients,
        "by_theme": by_theme,
        "by_city": by_city,
    }
