import { apiFetch } from "./client";

export interface PredictEventPayload {
  event_id?: string;
  total_budget?: number;
  allocation_logistique?: number;
  allocation_pedagogique?: number;
  ratio_perdiem?: number;
  id_region?: number;
  type_seminaire?: string;
  mois_evenement?: number;
  budget_alloue?: number;
  city?: string;
  region?: string;
  country?: string;
  preparation_theme?: string;
  event_type?: string;
}

export interface PredictEventResult {
  risk_score: number;
  predicted_participants: number;
  event_id?: string | null;
  event_title?: string | null;
}

export function predictEvent(token: string | null, payload: PredictEventPayload) {
  return apiFetch<PredictEventResult>(`/v1/analytics/predict-event`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CorrelationPoint {
  event_id: string;
  event_title: string;
  city: string | null;
  country: string | null;
  preparation_theme: string | null;
  amount_chf: number;
  participants_expected: number | null;
  participants_real: number | null;
  risk_score: number;
  predicted_participants: number;
  event_month: number | null;
}

export interface CorrelationCoeffs {
  budget_risk: number | null;
  budget_predicted_participants: number | null;
  risk_predicted_participants: number | null;
  budget_real_participants: number | null;
}

export interface ThemeAggregate {
  theme: string;
  count: number;
  avg_risk: number;
  avg_predicted_participants: number;
  avg_budget: number;
}

export interface CityAggregate {
  city: string;
  count: number;
  avg_risk: number;
  avg_predicted_participants: number;
}

export interface CorrelationDataset {
  items: CorrelationPoint[];
  coefficients: CorrelationCoeffs;
  by_theme: ThemeAggregate[];
  by_city: CityAggregate[];
}

export function fetchCorrelationDataset(token: string | null, limit = 200) {
  return apiFetch<CorrelationDataset>(`/v1/analytics/correlation-dataset?limit=${limit}`, token);
}
