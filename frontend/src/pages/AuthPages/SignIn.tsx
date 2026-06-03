import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
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
