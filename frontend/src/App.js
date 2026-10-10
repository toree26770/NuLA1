import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import DefenseLanding from "@/pages/DefenseLanding";
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import PartialLeadsPage from "@/pages/admin/PartialLeadsPage";
import LeadsPage from "@/pages/admin/LeadsPage";
import FormBuilder from "@/pages/admin/FormBuilder";
import ContentEditor from "@/pages/admin/ContentEditor";
import ExportsPage from "@/pages/admin/ExportsPage";
import CampaignsPage from "@/pages/admin/CampaignsPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import DefenseAdminLayout from "@/pages/defense/DefenseAdminLayout";
import DefenseAdminLogin from "@/pages/defense/DefenseAdminLogin";
import DefenseDashboard from "@/pages/defense/DefenseDashboard";
import DefenseLeadsPage from "@/pages/defense/DefenseLeadsPage";
import DefensePartialLeadsPage from "@/pages/defense/DefensePartialLeadsPage";
import DefenseExportsPage from "@/pages/defense/DefenseExportsPage";
import DefensePixelsPage from "@/pages/defense/DefensePixelsPage";
import DefenseSettingsPage from "@/pages/defense/DefenseSettingsPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/defense" element={<DefenseLanding />} />
          <Route path="/defense/admin/login" element={<DefenseAdminLogin />} />
          <Route path="/defense/admin" element={<DefenseAdminLayout />}>
            <Route index element={<DefenseDashboard />} />
            <Route path="leads" element={<DefenseLeadsPage />} />
            <Route path="leads/incomplets" element={<DefensePartialLeadsPage />} />
            <Route path="exports" element={<DefenseExportsPage />} />
            <Route path="pixels" element={<DefensePixelsPage />} />
            <Route path="parametres" element={<DefenseSettingsPage />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="statistiques" element={<AnalyticsPage />} />
            <Route path="leads" element={<LeadsPage key="all" status="" title="Tous les leads" />} />
            <Route path="leads/nouveaux" element={<LeadsPage key="nouveau" status="nouveau" title="Nouveaux leads" />} />
            <Route path="leads/recuperes" element={<LeadsPage key="recupere" status="recupere" title="Leads récupérés" />} />
            <Route path="leads/traites" element={<LeadsPage key="traite" status="traite" title="Leads traités" />} />
            <Route path="leads/doublons" element={<LeadsPage key="doublon" status="doublon" title="Doublons" />} />
            <Route path="leads/incomplets" element={<PartialLeadsPage />} />
            <Route path="formulaire" element={<FormBuilder />} />
            <Route path="contenu" element={<ContentEditor />} />
            <Route path="exports" element={<ExportsPage />} />
            <Route path="campagnes" element={<CampaignsPage />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
