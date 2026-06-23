import { Navigate } from "react-router";
import { useTipAuth } from "../context/TipAuthContext";
import UtilisateursReadOnlyPage from "./UtilisateursReadOnlyPage";

/** Admin → gestion complète ; support → annuaire lecture seule. */
export default function UtilisateursRoutePage() {
  const { hasRole } = useTipAuth();
  if (hasRole("administrateur")) {
    return <Navigate to="/admin/utilisateurs" replace />;
  }
  if (hasRole("support_administratif")) {
    return <UtilisateursReadOnlyPage />;
  }
  return <Navigate to="/dashboard" replace />;
}
