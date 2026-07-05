import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import EvenementsPage from "./pages/EvenementsPage";
import EvenementDetailPage from "./pages/EvenementDetailPage";
import EvenementCreatePage from "./pages/EvenementCreatePage";
import EvenementEditPage from "./pages/EvenementEditPage";
import CertificatesPage from "./pages/CertificatesPage";
import EventParticipantsPage from "./pages/EventParticipantsPage";
import ParticipantDetailPage from "./pages/ParticipantDetailPage";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import AcceptInvitation from "./pages/AuthPages/AcceptInvitation";
import SsoCallback from "./pages/AuthPages/SsoCallback";
import UtilisateursListPage from "./pages/admin/UtilisateursListPage";
import UtilisateurCreatePage from "./pages/admin/UtilisateurCreatePage";
import UtilisateurDetailPage from "./pages/admin/UtilisateurDetailPage";
import AuditPage from "./pages/admin/AuditPage";
import ParametresStockagePage from "./pages/admin/ParametresStockagePage";
import ParametresGuideHubPage from "./pages/admin/ParametresGuideHubPage";
import ProfilMotDePassePage from "./pages/ProfilMotDePassePage";
import DocumentsTemplatesPage from "./pages/DocumentsTemplatesPage";
import DocumentsGenerationPage from "./pages/DocumentsGenerationPage";
import DocumentsGenerationDetailPage from "./pages/DocumentsGenerationDetailPage";
import GuidesAdminHandoffGate from "./pages/GuidesAdminHandoffGate";
import NotificationsPage from "./pages/NotificationsPage";
import WorkflowControlePage from "./pages/WorkflowControlePage";
import WorkflowControleDetailPage from "./pages/WorkflowControleDetailPage";
import WorkflowValidationPage from "./pages/WorkflowValidationPage";
import WorkflowValidationDetailPage from "./pages/WorkflowValidationDetailPage";
import UtilisateursRoutePage from "./pages/UtilisateursRoutePage";
import ReferentielsAdminPage from "./pages/admin/ReferentielsAdminPage";
import PackageCatalogAdminPage from "./pages/admin/PackageCatalogAdminPage";
import PredictionsPage from "./pages/PredictionsPage";

function GuideHubProxyRedirect({ target }: { target: string }) {
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route index path="/" element={<SignIn />} />
        <Route path="/signin" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/connexion" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/sso-callback" element={<SsoCallback />} />

        <Route path="/guides/admin-handoff" element={<GuidesAdminHandoffGate />} />

        {/* GuideHub SPA navigue parfois vers /admin — rediriger vers le proxy nginx /gh/admin */}
        <Route path="/admin" element={<GuideHubProxyRedirect target="/gh/admin" />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Home />} />
            <Route element={<ProtectedRoute requireAnyRole={["administrateur", "support_administratif"]} />}>
              <Route path="/evenements" element={<EvenementsPage />} />
              <Route path="/evenements/nouveau" element={<EvenementCreatePage />} />
              <Route path="/evenements/:id" element={<EvenementDetailPage />} />
              <Route path="/evenements/:id/modifier" element={<EvenementEditPage />} />
              <Route path="/certificats" element={<CertificatesPage />} />
              <Route path="/certificats/participants/:participantId" element={<ParticipantDetailPage />} />
              <Route path="/evenements/:id/participants" element={<EventParticipantsPage />} />
              <Route path="/documents/generation" element={<DocumentsGenerationPage />} />
              <Route path="/documents/generation/:eventId" element={<DocumentsGenerationDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/documents/templates" element={<DocumentsTemplatesPage />} />
              <Route path="/predictions" element={<PredictionsPage />} />
            </Route>

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/utilisateurs" element={<UtilisateursRoutePage />} />

            <Route element={<ProtectedRoute requireAnyRole={["administrateur", "controle_procedure"]} />}>
              <Route path="/workflow/controle" element={<WorkflowControlePage />} />
              <Route path="/workflow/controle/:jobId" element={<WorkflowControleDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute requireAnyRole={["administrateur", "validateur"]} />}>
              <Route path="/workflow/validation" element={<WorkflowValidationPage />} />
              <Route path="/workflow/validation/:jobId" element={<WorkflowValidationDetailPage />} />
            </Route>
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/profil" element={<UserProfiles />} />
            <Route path="/profil/mot-de-passe" element={<ProfilMotDePassePage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin/utilisateurs" element={<UtilisateursListPage />} />
              <Route path="/admin/utilisateurs/nouveau" element={<UtilisateurCreatePage />} />
              <Route path="/admin/utilisateurs/:id" element={<UtilisateurDetailPage />} />
              <Route path="/admin/referentiels" element={<ReferentielsAdminPage />} />
              <Route path="/admin/referentiels/types-paquets" element={<PackageCatalogAdminPage />} />
              <Route path="/admin/audit" element={<AuditPage />} />
              <Route path="/admin/stockage" element={<ParametresStockagePage />} />
              <Route path="/admin/guidehub" element={<ParametresGuideHubPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
