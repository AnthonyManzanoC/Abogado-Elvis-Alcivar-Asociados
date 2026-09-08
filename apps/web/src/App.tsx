import { Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ShowcasePage } from "./pages/ShowcasePage";
import { PublicationPage } from "./pages/PublicationPage";
import { ContactPage } from "./pages/ContactPage";
import { AppointmentPage } from "./pages/AppointmentPage";
import { AdminPage } from "./pages/AdminPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";

export default function App() {
  return <Routes>
    <Route element={<SiteLayout />}>
      <Route index element={<HomePage />} />
      <Route path="servicios" element={<ServicesPage />} />
      <Route path="perfil" element={<ProfilePage />} />
      <Route path="vitrina" element={<ShowcasePage />} />
      <Route path="vitrina/:slug" element={<PublicationPage />} />
      <Route path="contacto" element={<ContactPage />} />
      <Route path="agendar" element={<AppointmentPage />} />
      <Route path="privacidad" element={<PrivacyPage />} />
      <Route path="terminos" element={<TermsPage />} />
    </Route>
    <Route path="admin" element={<AdminPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
