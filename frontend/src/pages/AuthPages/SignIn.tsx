import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (isSignedIn) {
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
