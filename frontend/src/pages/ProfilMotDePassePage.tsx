import { Navigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useTipAuth } from "../context/TipAuthContext";
import ModifMotDePasse from "../features/auth/ModifMotDePasse";

export default function ProfilMotDePassePage() {
  const { isSignedIn } = useAuth();
  const { tipUser } = useTipAuth();

  if (!isSignedIn || !tipUser) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="p-4 sm:p-6">
      <ModifMotDePasse />
    </div>
  );
}
