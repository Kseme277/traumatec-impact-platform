import { useAuth } from "@clerk/clerk-react";
import { Plug, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { ApiError } from "../../api/client";
import {
  fetchGuidesBridgeConfig,
  testGuidesBridgeConfig,
  updateGuidesBridgeConfig,
  type GuidesBridgeConfig,
} from "../../api/guidesBridge";
import { getApiToken } from "../../lib/clerkToken";
import { showError, showSuccess } from "../../lib/swal";
import { useTranslation } from "../../i18n/useTranslation";

export default function ParametresGuideHubPage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [config, setConfig] = useState<GuidesBridgeConfig | null>(null);
  const [companySlug, setCompanySlug] = useState("");
  const [bridgeEmail, setBridgeEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getApiToken(getToken);
      const data = await fetchGuidesBridgeConfig(token);
      setConfig(data);
      setCompanySlug(data.company_slug);
      setBridgeEmail(data.bridge_email);
      setPassword("");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("guidesBridge.loadFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const token = await getApiToken(getToken);
      const payload = {
        company_slug: companySlug.trim(),
        bridge_email: bridgeEmail.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      const updated = await updateGuidesBridgeConfig(token, payload);
      setConfig(updated);
      setPassword("");
      await showSuccess(t("guidesBridge.saved"), t("guidesBridge.savedDesc"));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("guidesBridge.saveFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const token = await getApiToken(getToken);
      const result = await testGuidesBridgeConfig(token);
      if (result.success) {
        await showSuccess(
          t("guidesBridge.testOk"),
          result.email
            ? t("guidesBridge.testOkDesc").replace("{email}", result.email)
            : result.message,
        );
      } else {
        await showError(t("guidesBridge.testFailed"), result.message);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("guidesBridge.testFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <PageMeta title={t("guidesBridge.title")} description={t("guidesBridge.desc")} />
      <AdminBreadcrumb
        crumbs={[
          { label: t("nav.admin"), to: "/admin/utilisateurs" },
          { label: t("guidesBridge.title") },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t("guidesBridge.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("guidesBridge.desc")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComponentCard title={t("guidesBridge.formTitle")} desc={t("guidesBridge.formDesc")}>
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          ) : (
            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <Label htmlFor="guides-company-slug">{t("guidesBridge.companySlug")}</Label>
                <Input
                  id="guides-company-slug"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="traumatec-cm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("guidesBridge.companySlugHint")}</p>
              </div>

              <div>
                <Label htmlFor="guides-bridge-email">{t("guidesBridge.bridgeEmail")}</Label>
                <Input
                  id="guides-bridge-email"
                  type="email"
                  value={bridgeEmail}
                  onChange={(e) => setBridgeEmail(e.target.value)}
                  placeholder="admin@traumatec.cm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="guides-bridge-password">{t("guidesBridge.bridgePassword")}</Label>
                <Input
                  id="guides-bridge-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    config?.password_configured ? t("guidesBridge.passwordPlaceholder") : t("guidesBridge.passwordRequired")
                  }
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("guidesBridge.passwordHint")}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t("common.saving") : t("common.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  startIcon={<Plug className="size-4" />}
                  disabled={isTesting || isSaving}
                  onClick={() => void handleTest()}
                >
                  {isTesting ? t("guidesBridge.testing") : t("guidesBridge.testConnection")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  startIcon={<RefreshCw className="size-4" />}
                  disabled={isLoading}
                  onClick={() => void load()}
                >
                  {t("common.refresh")}
                </Button>
              </div>
            </form>
          )}
        </ComponentCard>

        <ComponentCard title={t("guidesBridge.infraTitle")} desc={t("guidesBridge.infraDesc")}>
          {config ? (
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">{t("guidesBridge.status")}</dt>
                <dd className="mt-1">
                  <Badge color={config.enabled ? "success" : "warning"}>
                    {config.enabled ? t("guidesBridge.enabled") : t("guidesBridge.disabled")}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">{t("guidesBridge.source")}</dt>
                <dd className="mt-1 text-gray-600 dark:text-gray-400">
                  {config.configured_in_database
                    ? t("guidesBridge.sourceDatabase")
                    : t("guidesBridge.sourceEnv")}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">API</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                  {config.api_url || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">Web</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                  {config.web_url || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">Proxy TIP</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                  {config.proxy_web_url || "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{t("guidesBridge.infraHint")}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
