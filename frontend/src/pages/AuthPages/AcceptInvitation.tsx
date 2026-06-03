import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import AcceptInvitationForm from "../../components/auth/AcceptInvitationForm";

export default function AcceptInvitation() {
  return (
    <>
      <PageMeta
        title="Activer mon compte | Traumatec Impact Platform"
        description="Activez votre compte invité Traumatec Impact Platform et définissez votre mot de passe."
      />
      <AuthLayout>
        <AcceptInvitationForm />
      </AuthLayout>
    </>
  );
}
