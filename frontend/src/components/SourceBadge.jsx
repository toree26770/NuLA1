// Badge de provenance d'un lead (Meta / Google), déduit côté backend via
// `source_label`. Repli sur `utm_source` (ou « — ») quand la source est inconnue.
const SOURCE_STYLES = {
  Meta: "bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20",
  Google: "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20",
  "Meta + Google": "bg-purple-50 text-purple-700 border-purple-200",
};

export function SourceBadge({ label, fallback }) {
  if (!label) {
    return <span className="text-gray-400">{fallback || "—"}</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SOURCE_STYLES[label] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {label}
    </span>
  );
}
