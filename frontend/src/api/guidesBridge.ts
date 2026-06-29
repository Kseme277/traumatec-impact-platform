import { apiFetch } from "./client";

export interface GuidesBridgeConfig {
  enabled: boolean;
  company_slug: string;
  bridge_email: string;
  password_configured: boolean;
  configured_in_database: boolean;
  api_url: string;
  web_url: string;
  proxy_web_url: string;
}

export interface GuidesBridgeConfigUpdate {
  company_slug: string;
  bridge_email: string;
  password?: string;
}

export interface GuidesBridgeTestResult {
  success: boolean;
  message: string;
  email?: string | null;
  role?: string | null;
}

export function fetchGuidesBridgeConfig(token: string): Promise<GuidesBridgeConfig> {
  return apiFetch<GuidesBridgeConfig>("/v1/guides/bridge-config", token);
}

export function updateGuidesBridgeConfig(
  token: string,
  payload: GuidesBridgeConfigUpdate,
): Promise<GuidesBridgeConfig> {
  return apiFetch<GuidesBridgeConfig>("/v1/guides/bridge-config", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function testGuidesBridgeConfig(token: string): Promise<GuidesBridgeTestResult> {
  return apiFetch<GuidesBridgeTestResult>("/v1/guides/bridge-config/test", token, {
    method: "POST",
  });
}
