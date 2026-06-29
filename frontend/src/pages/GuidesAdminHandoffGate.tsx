import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import { useTipAuth } from "../context/TipAuthContext";
import GuidesAdminHandoffPage from "../pages/GuidesAdminHandoffPage";

/** Affiche le gabarit handoff immédiatement (pas le splash TIP). */
export default function GuidesAdminHandoffGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { tipUser, isLoading, hasRole } = useTipAuth();

  if (!isLoaded || (isSignedIn && !tipUser && isLoading)) {
    return (
      <GuideHubHandoffShell status="Préparation de votre session Traumatec…" manualLabel="Cliquez ici." />
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  if (!tipUser || !hasRole("administrateur")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <GuidesAdminHandoffPage />;
}
