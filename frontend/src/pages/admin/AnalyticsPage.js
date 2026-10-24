import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Eye, Users, PencilLine, CheckCircle2, LogOut, TrendingUp } from "lucide-react";
import { API } from "@/api";

const RANGES = [
  { v: 1, label: "1 jour" },
  { v: 7, label: "7 jours" },
  { v: 30, label: "30 jours" },
  { v: 90, label: "90 jours" },
];

function StatCard({ label, value, hint, icon: Icon, testid, accent = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid={testid}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-[#FF683D]/10 text-[#FF683D]" : "bg-gray-100 text-gray-500"}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-[#0B111B]" data-testid={`${testid}-value`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [campaign, setCampaign] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    API.get(`/admin/analytics?days=${days}&campaign=${encodeURIComponent(campaign)}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, campaign]);

  useEffect(() => {
    Promise.all([
      API.get("/admin/campaigns").then((r) => (r.data.campaigns || []).map((c) => c.campaign)).catch(() => []),
      API.get("/admin/pixels").then((r) => (r.data.items || []).flatMap((p) => p.campaigns || [])).catch(() => []),
    ]).then(([fromLeads, fromPixels]) => {
      const set = new Set([...fromLeads, ...fromPixels].map((c) => (c || "").trim()).filter(Boolean));
      setCampaigns([...set].sort());
    });
  }, []);

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="analytics-loading" />;
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center" data-testid="analytics-error">
        <p className="text-gray-700 font-medium">Impossible de charger les statistiques pour le moment.</p>
        <p className="text-sm text-gray-400 mt-1">Vérifiez votre connexion puis réessayez.</p>
        <button type="button" onClick={load} className="btn-primary-orange !py-2.5 !px-5 !text-sm mt-4" data-testid="analytics-retry">
          Réessayer
        </button>
      </div>
    );
  }

  const steps = (data.steps_reached || []).filter((s) => s.step_index >= 1);
  const funnel = [
    { label: "Visiteurs uniques", value: data.unique_visitors, color: "#101722" },
    { label: "Ont commencé le formulaire", value: data.form_starts, color: "#3B82F6" },
    ...steps.map((s) => ({ label: `Étape ${s.step_index + 1} atteinte`, value: s.sessions, color: "#FF914D" })),
    { label: "Demandes envoyées", value: data.submissions, color: "#10B981" },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  const dayData = (data.per_day || []).map((d) => ({
    ...d,
    date: d.date.slice(8, 10) + "/" + d.date.slice(5, 7),
  }));

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Statistiques d'audience</h1>
          <p className="text-sm text-gray-500 mt-1">
            {campaign
              ? <>Campagne : <span className="font-semibold text-[#FF683D]">{campaign}</span></>
              : "Toutes campagnes confondues — visites, formulaires commencés, envoyés et abandons."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            data-testid="analytics-campaign-select"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-[#FF683D] cursor-pointer"
          >
            <option value="">Toutes les campagnes</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>{c === "(direct)" ? "(direct / sans campagne)" : c}</option>
            ))}
          </select>
          <div className="flex gap-1.5 rounded-xl border border-gray-200 bg-white p-1" data-testid="range-selector">
            {RANGES.map((r) => (
              <button
                key={r.v}
                type="button"
                data-testid={`range-${r.v}`}
                onClick={() => setDays(r.v)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  days === r.v ? "bg-[#FF683D] text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cartes principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Visites totales" value={data.visits} hint="Nombre de chargements de page" icon={Eye} testid="stat-visits" accent />
        <StatCard label="Visiteurs uniques" value={data.unique_visitors} hint="Personnes différentes" icon={Users} testid="stat-unique" />
        <StatCard label="Formulaires commencés" value={data.form_starts} hint="Ont saisi au moins un champ" icon={PencilLine} testid="stat-starts" />
        <StatCard label="Demandes envoyées" value={data.submissions} hint="Formulaires complétés" icon={CheckCircle2} testid="stat-submissions" accent />
        <StatCard label="Abandons" value={data.abandons} hint="Commencés mais non envoyés" icon={LogOut} testid="stat-abandons" />
        <StatCard label="Taux de conversion" value={`${data.conversion_rate} %`} hint="Envois / visiteurs uniques" icon={TrendingUp} testid="stat-conversion" accent />
        <StatCard label="Taux de complétion" value={`${data.completion_rate} %`} hint="Envois / formulaires commencés" icon={TrendingUp} testid="stat-completion" />
        <StatCard label="Taux d'abandon" value={`${data.abandon_rate} %`} hint="Abandons / formulaires commencés" icon={LogOut} testid="stat-abandon-rate" />
      </div>

      {/* Entonnoir */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="funnel">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Entonnoir de conversion (où les visiteurs s'arrêtent)</h2>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const pct = Math.round((f.value / funnelMax) * 100);
            const prev = i > 0 ? funnel[i - 1].value : null;
            const dropPct = prev && prev > 0 ? Math.round(((prev - f.value) / prev) * 100) : null;
            return (
              <div key={f.label} data-testid={`funnel-step-${i}`}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{f.label}</span>
                  <span className="font-semibold text-gray-900">
                    {f.value}
                    {dropPct !== null && dropPct > 0 && (
                      <span className="ml-2 text-xs font-medium text-red-500">−{dropPct}%</span>
                    )}
                  </span>
                </div>
                <div className="h-7 w-full rounded-lg bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: f.color }}
                  >
                    <span className="text-[11px] font-bold text-white/90">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphique visites / envois par jour */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="chart-traffic">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Visites et demandes par jour</h2>
        {dayData.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Aucune donnée pour le moment. Les statistiques apparaîtront dès les premières visites.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="visites" name="Visites" stroke="#FF683D" fill="#FF683D" fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="envois" name="Demandes" stroke="#10B981" fill="#10B981" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sources de trafic */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="sources">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Sources de trafic (d'où viennent vos visiteurs)</h2>
        {(data.by_source || []).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Aucune source enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-2.5">
            {data.by_source.map((s) => (
              <div key={s.source} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5" data-testid={`source-${s.source}`}>
                <span className="text-sm font-medium text-gray-700 truncate">{s.source}</span>
                <span className="rounded-full bg-[#FF683D]/10 px-3 py-0.5 text-sm font-semibold text-[#FF683D]">{s.sessions}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
