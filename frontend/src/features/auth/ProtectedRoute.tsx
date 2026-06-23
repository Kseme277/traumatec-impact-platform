import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import AuthErrorScreen from "../../components/auth/AuthErrorScreen";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";
import { canAccessRoute } from "../../config/navByRole";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { RoleUtilisateur } from "./types";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  requireAnyRole?: RoleUtilisateur[];
}

export default function ProtectedRoute({ requireAdmin = false, requireAnyRole }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();
  const { tipUser, isLoading, error, errorStatus, refreshProfile, hasRole, hasAnyRole, isAdmin } = useTipAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <AuthLoadingScreen />;
  }

  if (!isSignedIn || errorStatus === 401) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!tipUser && (isLoading || !error)) {
    return <AuthLoadingScreen />;
  }

  if (error || !tipUser) {
    return (
      <AuthErrorScreen
        statusCode={error ? errorStatus : 403}
        message={error ?? t("auth.profileNotAuthorized")}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  if (!tipUser.est_actif) {
    return (
      <AuthErrorScreen
        title={t("auth.accountDisabled")}
        statusCode={403}
        message={t("auth.accountSuspended")}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  if (requireAdmin && !hasRole("administrateur")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAnyRole?.length && !hasAnyRole(...requireAnyRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccessRoute(location.pathname, hasRole, isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
