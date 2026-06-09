import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import AuthErrorScreen from "../../components/auth/AuthErrorScreen";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();
  const { tipUser, isLoading, error, errorStatus, refreshProfile } = useTipAuth();
  const location = useLocation();

  if (!isLoaded || isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isSignedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // Clerk est prêt mais le profil TIP n'est pas encore résolu — évite le flash « Accès refusé »
  if (!tipUser && !error) {
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

  if (requireAdmin && tipUser.role !== "administrateur") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
