import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
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
import ProtectedRoute from "./features/auth/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import AcceptInvitation from "./pages/AuthPages/AcceptInvitation";
import SsoCallback from "./pages/AuthPages/SsoCallback";
import UtilisateursListPage from "./pages/admin/UtilisateursListPage";
import UtilisateurCreatePage from "./pages/admin/UtilisateurCreatePage";
import UtilisateurDetailPage from "./pages/admin/UtilisateurDetailPage";
import AuditPage from "./pages/admin/AuditPage";
import ProfilMotDePassePage from "./pages/ProfilMotDePassePage";
import DocumentsTemplatesPage from "./pages/DocumentsTemplatesPage";
import DocumentsGenerationPage from "./pages/DocumentsGenerationPage";
import GuidesAdminHandoffPage from "./pages/GuidesAdminHandoffPage";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/connexion" element={<Navigate to="/signin" replace />} />
        <Route path="/signup" element={<Navigate to="/signin" replace />} />
        <Route path="/sso-callback" element={<SsoCallback />} />

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/guides/admin-handoff" element={<GuidesAdminHandoffPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/evenements" element={<EvenementsPage />} />
            <Route path="/evenements/nouveau" element={<EvenementCreatePage />} />
            <Route path="/evenements/:id" element={<EvenementDetailPage />} />
            <Route path="/evenements/:id/modifier" element={<EvenementEditPage />} />
            <Route path="/documents/templates" element={<DocumentsTemplatesPage />} />
            <Route path="/documents/generation" element={<DocumentsGenerationPage />} />
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
              <Route path="/admin/audit" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
