import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import DefenseLanding from "@/pages/DefenseLanding";
import LivretLanding from "@/pages/LivretLanding";
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
import { isDefenseHost, DEFENSE_LANDING_PATH, DEFENSE_ADMIN_BASE, isLivretHost, LIVRET_LANDING_PATH, LIVRET_ADMIN_BASE } from "@/defenseBase";

// Enfants d'administration partagés — rigoureusement identiques pour les deux sites.
function AdminChildren() {
  return (
    <>
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
    </>
  );
}

// Site « Livret Défense » : design propre pour la page publique, MÊME admin que la landing 1.
function DefenseRoutes() {
  return (
    <>
      <Route path={DEFENSE_LANDING_PATH} element={<DefenseLanding />} />
      <Route path={`${DEFENSE_ADMIN_BASE}/login`} element={<AdminLogin />} />
      <Route path={DEFENSE_ADMIN_BASE} element={<AdminLayout />}>
        {AdminChildren()}
      </Route>
    </>
  );
}

// Site « Super Livret — Compte rémunéré » : design propre pour la page publique, MÊME admin.
function LivretRoutes() {
  return (
    <>
      <Route path={LIVRET_LANDING_PATH} element={<LivretLanding />} />
      <Route path={`${LIVRET_ADMIN_BASE}/login`} element={<AdminLogin />} />
      <Route path={LIVRET_ADMIN_BASE} element={<AdminLayout />}>
        {AdminChildren()}
      </Route>
    </>
  );
}

function ClaudeRoutes() {
  return (
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        {AdminChildren()}
      </Route>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {isDefenseHost
            ? DefenseRoutes()
            : isLivretHost
            ? LivretRoutes()
            : (<>{ClaudeRoutes()}{DefenseRoutes()}{LivretRoutes()}</>)}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
