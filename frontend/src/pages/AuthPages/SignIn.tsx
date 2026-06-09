import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";
import PageMeta from "../../components/common/PageMeta";
import { useTipAuth } from "../../context/TipAuthContext";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading } = useTipAuth();

  if (!isLoaded) {
    return <AuthLoadingScreen message="Vérification de votre session…" />;
  }

  if (isSignedIn) {
    if (isLoading) {
      return <AuthLoadingScreen />;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <PageMeta
        title="Connexion | Traumatec Impact Platform"
        description="Connectez-vous à la plateforme Traumatec Impact Platform pour gérer vos dossiers AO Alliance."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
