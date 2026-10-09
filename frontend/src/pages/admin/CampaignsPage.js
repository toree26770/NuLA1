import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { API, fmtError } from "@/api";

export default function CampaignsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/admin/campaigns").then((r) => setData(r.data)).catch((e) => toast.error(fmtError(e)));
  }, []);

  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="campaigns-loading" />;

  return (
    <div className="space-y-5" data-testid="campaigns-page">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Campagnes Meta</h1>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800" data-testid="tracking-info">
        <p className="font-semibold mb-1 flex items-center gap-2"><Megaphone className="h-4 w-4" /> Suivi publicitaire actif</p>
        <p>Chaque lead enregistre automatiquement : utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, campaign_id, adset_id, ad_id. Le Meta Pixel et la Conversions API pourront être branchés ultérieurement (structure prête).</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid="campaigns-table">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="p-3">Campagne</th>
              <th className="p-3">Total</th>
              <th className="p-3">Nouveaux</th>
              <th className="p-3">Récupérés</th>
              <th className="p-3">Traités</th>
              <th className="p-3">Doublons</th>
              <th className="p-3">Montants envisagés</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.campaign} className="border-b border-gray-50 hover:bg-[#FF683D]/[0.03]" data-testid={`campaign-row-${c.campaign.slice(0, 12)}`}>
                <td className="p-3 font-medium text-gray-800">{c.campaign}</td>
                <td className="p-3 font-semibold">{c.total}</td>
                <td className="p-3 text-[#FF683D] font-semibold">{c.nouveau}</td>
                <td className="p-3">{c.recupere}</td>
                <td className="p-3">{c.traite}</td>
                <td className="p-3">{c.doublon}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(c.amounts).map(([a, n]) => (
                      <span key={a} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{a} : {n}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {data.campaigns.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400" data-testid="campaigns-empty">Aucune campagne enregistrée pour le moment. Les paramètres UTM apparaîtront dès les premiers leads.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
