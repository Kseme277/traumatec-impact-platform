import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useTipAuth } from "../../context/TipAuthContext";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { tipUser, isLoading, error } = useTipAuth();
  const location = useLocation();

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500">Chargement de la session...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  if (error || !tipUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center dark:border-red-900/50 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Accès refusé</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {error ?? "Votre compte n'est pas autorisé sur TIP. Contactez un administrateur."}
          </p>
        </div>
      </div>
    );
  }

  if (requireAdmin && tipUser.role !== "administrateur") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
