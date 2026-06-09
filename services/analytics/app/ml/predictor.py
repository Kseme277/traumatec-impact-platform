"""Chargement des modèles Joblib et inférence."""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np

from app.ml.features import attendance_features_from_row, budget_features_from_row

logger = logging.getLogger(__name__)

BUDGET_FEATURES = ["total_budget", "allocation_logistique", "allocation_pedagogique", "ratio_perdiem"]
ATTENDANCE_FEATURES = ["id_region", "type_seminaire", "mois_evenement", "budget_alloue"]


class AnalyticsPredictor:
    def __init__(self, models_dir: str | Path) -> None:
        self.models_dir = Path(models_dir)
        self.budget_model = None
        self.attendance_model = None
        self._load()

    def _load(self) -> None:
        budget_path = self.models_dir / "budget_isolation_forest.joblib"
        attendance_path = self.models_dir / "attendance_random_forest.joblib"
        if budget_path.exists():
            self.budget_model = joblib.load(budget_path)
        else:
            logger.warning("Modèle budget absent : %s", budget_path)
        if attendance_path.exists():
            self.attendance_model = joblib.load(attendance_path)
        else:
            logger.warning("Modèle affluence absent : %s", attendance_path)

    def predict(self, row: dict) -> dict[str, float | int]:
        budget = budget_features_from_row(row)
        attendance = attendance_features_from_row(row)

        risk_score = self._predict_risk(budget)
        predicted_participants = self._predict_attendance(attendance, row)

        return {
            "risk_score": round(risk_score, 1),
            "predicted_participants": int(predicted_participants),
        }

    def _predict_risk(self, features: dict[str, float]) -> float:
        if self.budget_model is None:
            ratio = features["ratio_perdiem"]
            logistics_share = features["allocation_logistique"] / features["total_budget"]
            heuristic = abs(logistics_share - 0.35) * 120 + abs(ratio - 0.12) * 200
            return float(min(100, max(5, heuristic)))

        vector = np.array([[features[name] for name in BUDGET_FEATURES]])
        raw = self.budget_model.decision_function(vector)[0]
        if hasattr(self.budget_model, "score_samples"):
            score = self.budget_model.score_samples(vector)[0]
            risk = float(100 / (1 + np.exp(score * 2)))
        else:
            risk = float(50 - raw * 25)
        return float(min(100, max(0, risk)))

    def _predict_attendance(self, features: dict[str, float], row: dict) -> int:
        if self.attendance_model is None:
            expected = row.get("participants_expected") or row.get("participants_real")
            if expected:
                return int(expected)
            return int(20 + features["budget_alloue"] / 1500)

        vector = np.array([[features[name] for name in ATTENDANCE_FEATURES]])
        pred = self.attendance_model.predict(vector)[0]
        return int(max(5, round(float(pred))))


_predictor: AnalyticsPredictor | None = None


def get_predictor(models_dir: str) -> AnalyticsPredictor:
    global _predictor
    if _predictor is None:
        _predictor = AnalyticsPredictor(models_dir)
    return _predictor
