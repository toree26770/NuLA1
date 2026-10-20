import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Users, CalendarDays, TrendingUp, UserPlus, Download, CheckCircle2, Copy } from "lucide-react";
import { API } from "@/api";
import { scopeAdminBase } from "@/defenseBase";

const PIE_COLORS = { nouveau: "#FF683D", recupere: "#3B82F6", traite: "#10B981", doublon: "#F59E0B", invalide: "#EF4444" };
const STATUS_FR = { nouveau: "Nouveaux", recupere: "Récupérés", traite: "Traités", doublon: "Doublons", invalide: "Invalides" };

function StatCard({ label, value, icon: Icon, testid, accent = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid={testid}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-[#FF683D]/10 text-[#FF683D]" : "bg-gray-100 text-gray-500"}`}>
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-[#0B111B]">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const adminBase = scopeAdminBase();

  useEffect(() => {
    API.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="dashboard-loading" />;
  }

  const pieData = Object.entries(stats.by_status).filter(([, v]) => v > 0).map(([k, v]) => ({ name: STATUS_FR[k], value: v, key: k }));
  const dayData = stats.per_day.map((d) => ({ ...d, date: d.date.slice(8, 10) + "/" + d.date.slice(5, 7) }));

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Tableau de bord</h1>
        <Link to={`${adminBase}/leads/nouveaux`} data-testid="dashboard-export-link" className="btn-primary-orange !py-2.5 !px-5 !text-sm">
          <Download className="h-4 w-4" /> Exporter les nouveaux leads
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total des leads" value={stats.total} icon={Users} testid="stat-total" accent />
        <StatCard label="Aujourd'hui" value={stats.today} icon={CalendarDays} testid="stat-today" />
        <StatCard label="7 derniers jours" value={stats.last7} icon={TrendingUp} testid="stat-7d" />
        <StatCard label="30 derniers jours" value={stats.last30} icon={TrendingUp} testid="stat-30d" />
        <StatCard label="Nouveaux" value={stats.by_status.nouveau} icon={UserPlus} testid="stat-nouveaux" accent />
        <StatCard label="Récupérés" value={stats.by_status.recupere} icon={Download} testid="stat-recuperes" />
        <StatCard label="Traités" value={stats.by_status.traite} icon={CheckCircle2} testid="stat-traites" />
        <StatCard label="Doublons bloqués" value={stats.by_status.doublon} icon={Copy} testid="stat-doublons" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="chart-per-day">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads par jour (30 jours)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#FF683D" fill="#FF683D" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="chart-status">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition par statut</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {pieData.map((d) => (
                  <Cell key={d.key} fill={PIE_COLORS[d.key]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center">
            {pieData.map((d) => (
              <span key={d.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[d.key] }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="chart-amounts">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Montants envisagés</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.by_amount} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="amount" tick={{ fontSize: 10 }} width={150} />
              <Tooltip />
              <Bar dataKey="count" name="Leads" fill="#FF683D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="chart-campaigns">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads par campagne</h2>
          {stats.by_campaign.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune campagne enregistrée pour le moment.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.by_campaign.map((c) => (
                <div key={c.campaign} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-700 truncate">{c.campaign}</span>
                  <span className="rounded-full bg-[#FF683D]/10 px-3 py-0.5 text-sm font-semibold text-[#FF683D]">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
