import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { consumeGuidesHandoff, prepareGuidesHandoff } from "../api/guides";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import { getGuidesProxyAdminUrl } from "../config/guides";
import { useTranslation } from "../i18n/useTranslation";
import { getApiToken } from "../lib/clerkToken";
import { persistGuideHubSession, resolveGuideHubAdminUrl } from "../lib/guidesHandoffStorage";

export default function GuidesAdminHandoffPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Préparation de votre session…");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        setStatus("Vérification de votre session Traumatec…");
        const token = await getApiToken(getToken);
        if (!token) {
          throw new Error(t("documents.sessionExpiredShort"));
        }

        setStatus("Connexion sécurisée à GuideHub…");
        const session = await prepareGuidesHandoff(token);

        setStatus("Ouverture de l'administration GuideHub…");
        const handoff = await consumeGuidesHandoff(session.handoff_ticket);

        persistGuideHubSession(
          handoff.access_token,
          handoff.email,
          handoff.role,
          handoff.member_role,
        );

        // Même origine : proxy /gh/admin (session localStorage TIP = GuideHub)
        const adminUrl = resolveGuideHubAdminUrl(handoff.redirect) || getGuidesProxyAdminUrl();
        window.location.replace(adminUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("guides.adminOpenFailed"));
      }
    })();
  }, [getToken, t]);

  if (error) {
    return <GuideHubHandoffShell status={error} error manualHref={getGuidesProxyAdminUrl()} />;
  }

  return (
    <GuideHubHandoffShell
      status={status}
      manualHref={getGuidesProxyAdminUrl()}
      manualLabel="Cliquez ici."
    />
  );
}
