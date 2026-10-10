import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UserX, Download, Target, Settings, LogOut, Loader2,
} from "lucide-react";
import { API } from "@/api";

const NAV = [
  { to: "/defense/admin", end: true, icon: LayoutDashboard, label: "Tableau de bord", id: "dashboard" },
  { to: "/defense/admin/leads", icon: Users, label: "Prospects", id: "leads" },
  { to: "/defense/admin/leads/incomplets", icon: UserX, label: "Leads incomplets", id: "partial-leads" },
  { to: "/defense/admin/exports", icon: Download, label: "Exports", id: "exports" },
  { to: "/defense/admin/pixels", icon: Target, label: "Meta Pixels", id: "pixels" },
  { to: "/defense/admin/parametres", icon: Settings, label: "Paramètres", id: "settings" },
];

export default function DefenseAdminLayout() {
  const nav = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/defense/auth/me")
      .then((r) => setAdmin(r.data))
      .catch(() => nav("/defense/admin/login", { replace: true }))
      .finally(() => setLoading(false));
  }, [nav]);

  const logout = async () => {
    try { await API.post("/defense/auth/logout"); } catch {}
    nav("/defense/admin/login", { replace: true });
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F5F6F8]"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>;
  }
  if (!admin) return null;

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-['Manrope'] text-[#071D3A]">
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#071D3A] text-white flex flex-col">
        <div className="h-1.5 w-full flex"><span className="flex-1 bg-[#0055A4]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#EF4135]" /></div>
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 font-['Bricolage_Grotesque'] text-sm font-extrabold">LD</span>
          <div className="leading-tight">
            <p className="font-['Bricolage_Grotesque'] font-extrabold">Livret Défense</p>
            <p className="text-[11px] text-white/50">Administration</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`defense-nav-${n.id}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#C8102E] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <p className="px-3 pb-2 text-xs text-white/40 truncate">{admin.email}</p>
          <button type="button" data-testid="defense-logout" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="ml-64 p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
