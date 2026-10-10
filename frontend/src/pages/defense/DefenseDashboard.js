import { useEffect, useState } from "react";
import { Loader2, Users, UserPlus, CalendarDays, TrendingUp } from "lucide-react";
import { API } from "@/api";

const STATUS_LABELS = { nouveau: "Nouveaux", recupere: "Récupérés", traite: "Traités", doublon: "Doublons", invalide: "Invalides" };

function Card({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-[#163A63]/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#071D3A]/60">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 font-['Bricolage_Grotesque'] text-3xl font-extrabold text-[#071D3A]">{value}</p>
    </div>
  );
}

export default function DefenseDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/defense/admin/stats"), API.get("/defense/admin/analytics?days=30")])
      .then(([s, a]) => { setStats(s.data); setAnalytics(a.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>;

  return (
    <div data-testid="defense-dashboard" className="space-y-6">
      <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} label="Total prospects" value={stats.total} accent="bg-[#071D3A]/10 text-[#071D3A]" />
        <Card icon={UserPlus} label="Aujourd'hui" value={stats.today} accent="bg-[#C8102E]/10 text-[#C8102E]" />
        <Card icon={CalendarDays} label="7 derniers jours" value={stats.last7} accent="bg-[#163A63]/10 text-[#163A63]" />
        <Card icon={TrendingUp} label="30 derniers jours" value={stats.last30} accent="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#163A63]/10 bg-white p-5 shadow-sm">
          <h2 className="font-['Bricolage_Grotesque'] font-bold text-[#071D3A]">Répartition par statut</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-[#071D3A]/70">{lbl}</span>
                <span className="font-semibold text-[#071D3A]">{stats.by_status[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#163A63]/10 bg-white p-5 shadow-sm">
          <h2 className="font-['Bricolage_Grotesque'] font-bold text-[#071D3A]">Audience (30 j)</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Visites</p><p className="mt-1 text-xl font-bold">{analytics.visits}</p></div>
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Visiteurs uniques</p><p className="mt-1 text-xl font-bold">{analytics.unique_visitors}</p></div>
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Formulaires commencés</p><p className="mt-1 text-xl font-bold">{analytics.form_starts}</p></div>
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Envois</p><p className="mt-1 text-xl font-bold">{analytics.submissions}</p></div>
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Taux de conversion</p><p className="mt-1 text-xl font-bold">{analytics.conversion_rate}%</p></div>
            <div className="rounded-lg bg-[#F5F6F8] p-3"><p className="text-[#071D3A]/55">Taux d'abandon</p><p className="mt-1 text-xl font-bold">{analytics.abandon_rate}%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
