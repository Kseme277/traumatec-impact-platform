import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchGuidesSession } from "../api/guides";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import { buildGuidesHandoffUrl } from "../config/guides";
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
        const session = await fetchGuidesSession(token);
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
    return (
      <GuideHubHandoffShell
        title="Connexion en cours"
        lead="Liaison sécurisée entre Traumatec Impact Platform et votre espace administrateur GuideHub."
        status={error}
        error
      >
        <div className="mt-6 border-t border-gray-200 pt-5">
          <Link to="/dashboard" className="text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline">
            {t("common.backToHome")}
          </Link>
        </div>
      </GuideHubHandoffShell>
    );
  }

  return (
    <GuideHubHandoffShell
      title="Connexion en cours"
      lead="Liaison sécurisée entre Traumatec Impact Platform et votre espace administrateur GuideHub."
      status={status}
    />
  );
}
