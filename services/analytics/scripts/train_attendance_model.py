#!/usr/bin/env python3
"""Entraîne Random Forest pour prédire l'affluence participants."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ml.features import ATTENDANCE_FEATURES, attendance_features_from_row, synthetic_training_rows  # noqa: E402

ARTIFACTS = ROOT / "app" / "ml" / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def load_rows_from_postgres() -> list[dict]:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        return []
    try:
        from sqlalchemy import create_engine, text

        sync_url = database_url.replace("+asyncpg", "")
        engine = create_engine(sync_url)
        query = text(
            """
            SELECT amount_chf, city, region, country, preparation_theme, event_type,
                   start_date, participants_expected, participants_real, metadata_json
            FROM events.events
            WHERE COALESCE(participants_real, participants_expected) IS NOT NULL
            """
        )
        with engine.connect() as conn:
            result = conn.execute(query)
            return [dict(row._mapping) for row in result]
    except Exception as exc:
        print(f"PostgreSQL indisponible pour l'entraînement affluence ({exc}) — jeu synthétique.")
        return []


def main() -> None:
    rows = load_rows_from_postgres()
    if len(rows) < 30:
        rows = synthetic_training_rows(150)

    X = []
    y = []
    for row in rows:
        feats = attendance_features_from_row(row)
        target = row.get("participants_real") or row.get("participants_expected")
        if target is None:
            continue
        X.append([feats[name] for name in ATTENDANCE_FEATURES])
        y.append(float(target))

    if len(X) < 10:
        rows = synthetic_training_rows(150)
        X, y = [], []
        for row in rows:
            feats = attendance_features_from_row(row)
            X.append([feats[name] for name in ATTENDANCE_FEATURES])
            y.append(float(row.get("participants_real") or 30))

    model = RandomForestRegressor(n_estimators=200, random_state=42, min_samples_leaf=2)
    model.fit(np.array(X), np.array(y))

    out = ARTIFACTS / "attendance_random_forest.joblib"
    joblib.dump(model, out)
    print(f"Modèle affluence sauvegardé → {out} ({len(X)} lignes)")


if __name__ == "__main__":
    main()
