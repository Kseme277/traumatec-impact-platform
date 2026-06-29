import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { prepareGuidesHandoff } from "../api/guides";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import { buildGuidesHandoffUrl, getGuidesProxyAdminUrl } from "../config/guides";
import { useTranslation } from "../i18n/useTranslation";
import { getApiToken } from "../lib/clerkToken";

export default function GuidesAdminHandoffPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Préparation de votre session…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setStatus("Vérification de votre session Traumatec…");
        const token = await getApiToken(getToken);
        if (!token) {
          throw new Error(t("documents.sessionExpiredShort"));
        }

        setStatus("Connexion sécurisée à GuideHub…");
        const session = await prepareGuidesHandoff(token);
        if (cancelled) return;

        setStatus("Redirection vers l'administration GuideHub…");
        const handoffUrl = buildGuidesHandoffUrl({
          ...session,
          proxy_web_url: session.proxy_web_url,
        });
        window.location.replace(handoffUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("guides.adminOpenFailed"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, t]);

  if (error) {
    return <GuideHubHandoffShell status={error} error />;
  }

  return (
    <GuideHubHandoffShell
      status={status}
      manualHref={getGuidesProxyAdminUrl()}
      manualLabel="Cliquez ici."
    />
  );
}
