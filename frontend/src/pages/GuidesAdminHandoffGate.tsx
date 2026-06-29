import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import { GuideHubHandoffShell } from "../components/GuideHubHandoffShell";
import GuidesAdminHandoffPage from "./GuidesAdminHandoffPage";

/** Clerk requis — le handoff GuideHub gère l'auth admin côté API. */
export default function GuidesAdminHandoffGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <GuideHubHandoffShell status="Préparation de votre session Traumatec…" />;
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <GuidesAdminHandoffPage />;
}
