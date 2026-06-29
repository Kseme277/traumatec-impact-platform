import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import { useTipAuth } from "../context/TipAuthContext";
import GuidesAdminHandoffPage from "../pages/GuidesAdminHandoffPage";

/** Affiche le gabarit handoff immédiatement (pas le splash TIP). */
export default function GuidesAdminHandoffGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { tipUser, isLoading, error, hasRole } = useTipAuth();

  if (!isLoaded) {
    return (
      <GuideHubHandoffShell status="Préparation de votre session Traumatec…" manualLabel="Cliquez ici." />
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  if (!tipUser) {
    if (isLoading || !error) {
      return (
        <GuideHubHandoffShell status="Vérification de votre profil administrateur…" manualLabel="Cliquez ici." />
      );
    }
    return (
      <GuideHubHandoffShell
        status={error ?? "Profil TIP indisponible. Reconnectez-vous."}
        error
      />
    );
  }

  if (!hasRole("administrateur")) {
    return (
      <GuideHubHandoffShell
        status="Accès réservé aux administrateurs Traumatec."
        error
      />
    );
  }

  return <GuidesAdminHandoffPage />;
}
