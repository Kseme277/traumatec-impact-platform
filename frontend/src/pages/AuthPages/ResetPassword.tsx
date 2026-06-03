import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Mot de passe oublié | Traumatec Impact Platform"
        description="Réinitialisez votre mot de passe Traumatec Impact Platform avec le code reçu par email."
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}
