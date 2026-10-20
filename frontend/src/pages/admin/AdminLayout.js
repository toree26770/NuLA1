import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Asterisk, LayoutDashboard, BarChart3, UserPlus, Users, UserX, Download, CheckCircle2, Copy,
  FileEdit, Palette, History, Megaphone, Settings, LogOut, Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { API } from "@/api";
import { applyDefenseBranding, applyLivretBranding, siteScope, scopeAdminBase, scopeBrandName } from "@/defenseBase";

const MENU = [
  { path: "", label: "Tableau de bord", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { path: "/statistiques", label: "Statistiques", icon: BarChart3, testid: "nav-statistiques" },
  { path: "/leads/nouveaux", label: "Nouveaux leads", icon: UserPlus, testid: "nav-nouveaux" },
  { path: "/leads", label: "Tous les leads", icon: Users, testid: "nav-tous", end: true },
  { path: "/leads/recuperes", label: "Leads récupérés", icon: Download, testid: "nav-recuperes" },
  { path: "/leads/traites", label: "Leads traités", icon: CheckCircle2, testid: "nav-traites" },
  { path: "/leads/doublons", label: "Doublons", icon: Copy, testid: "nav-doublons" },
  { path: "/leads/incomplets", label: "Leads incomplets", icon: UserX, testid: "nav-incomplets" },
  { path: "/formulaire", label: "Gestion du formulaire", icon: FileEdit, testid: "nav-formulaire" },
  { path: "/contenu", label: "Éditeur de landing page", icon: Palette, testid: "nav-contenu" },
  { path: "/exports", label: "Historique des exports", icon: History, testid: "nav-exports" },
  { path: "/campagnes", label: "Campagnes Meta", icon: Megaphone, testid: "nav-campagnes" },
  { path: "/parametres", label: "Paramètres", icon: Settings, testid: "nav-parametres" },
];

function NavItems({ onNavigate, adminBase }) {
  return (
    <nav className="flex flex-col gap-1">
      {MENU.map((item) => (
        <NavLink
          key={item.path}
          to={adminBase + item.path}
          end={item.end}
          data-testid={item.testid}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-[#FF683D] text-white" : "text-[#F8F6F2]/65 hover:bg-white/5 hover:text-[#F8F6F2]"
            }`
          }
        >
          <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scope = siteScope();
  const adminBase = scopeAdminBase();
  const brandName = scopeBrandName();

  useEffect(() => {
    if (scope === "defense") applyDefenseBranding("Administration — Livret d'Épargne Défense");
    else if (scope === "livret") applyLivretBranding("Administration — Super Livret");
    API.get("/auth/me")
      .then((res) => setAdmin(res.data))
      .catch(() => navigate(`${adminBase}/login`, { replace: true }))
      .finally(() => setChecked(true));
  }, [navigate, adminBase, scope]);

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch {}
    navigate(`${adminBase}/login`, { replace: true });
  };

  if (!checked || !admin) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center" data-testid="admin-loading">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF683D] border-t-transparent" />
      </div>
    );
  }

  const Brand = (
    <div className="flex items-center gap-1 px-4 py-5">
      <span className="font-display text-2xl font-bold text-[#F8F6F2]">{brandName}</span>
      <span className="text-[#FF683D] font-display text-2xl font-bold">.</span>
      <Asterisk className="h-6 w-6 text-[#FF683D]" strokeWidth={2.5} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex" data-testid="admin-layout">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#101722] min-h-screen sticky top-0 h-screen">
        {Brand}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavItems adminBase={adminBase} />
        </div>
        <div className="border-t border-white/10 p-3">
          <p className="px-4 py-1.5 text-xs text-[#F8F6F2]/45 truncate" data-testid="admin-email-display">{admin.email}</p>
          <button
            type="button"
            data-testid="admin-logout-btn"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[#F8F6F2]/65 hover:bg-white/5 hover:text-[#F8F6F2] transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#101722] px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="font-display text-xl font-bold text-[#F8F6F2]">{brandName}</span>
            <span className="text-[#FF683D] font-display text-xl font-bold">.</span>
            <Asterisk className="h-5 w-5 text-[#FF683D]" strokeWidth={2.5} />
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button type="button" data-testid="admin-menu-btn" className="rounded-lg p-2 text-[#F8F6F2] hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#101722] border-white/10 p-3">
              {Brand}
              <NavItems adminBase={adminBase} onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                data-testid="admin-logout-btn-mobile"
                onClick={logout}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[#F8F6F2]/65 hover:bg-white/5"
              >
                <LogOut className="h-[18px] w-[18px]" /> Déconnexion
              </button>
            </SheetContent>
          </Sheet>
        </header>
        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
