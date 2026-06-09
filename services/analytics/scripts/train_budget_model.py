#!/usr/bin/env python3
"""Entraîne Isolation Forest sur l'historique budgétaire des événements."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ml.features import BUDGET_FEATURES, budget_features_from_row, synthetic_training_rows  # noqa: E402

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
                   start_date, metadata_json, participants_expected, participants_real
            FROM events.events
            WHERE amount_chf IS NOT NULL AND amount_chf > 0
            """
        )
        with engine.connect() as conn:
            result = conn.execute(query)
            return [dict(row._mapping) for row in result]
    except Exception as exc:
        print(f"PostgreSQL indisponible pour l'entraînement budget ({exc}) — jeu synthétique.")
        return []


def main() -> None:
    rows = load_rows_from_postgres()
    if len(rows) < 30:
        rows = synthetic_training_rows(150)

    matrix = []
    for row in rows:
        feats = budget_features_from_row(row)
        matrix.append([feats[name] for name in BUDGET_FEATURES])

    X = np.array(matrix)
    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,
        random_state=42,
    )
    model.fit(X)

    out = ARTIFACTS / "budget_isolation_forest.joblib"
    joblib.dump(model, out)
    print(f"Modèle budget sauvegardé → {out} ({len(rows)} lignes)")


if __name__ == "__main__":
    main()
