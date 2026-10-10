import { motion } from "framer-motion";
import { Cookie } from "lucide-react";

export default function ConsentBanner({ onAccept, onReject }) {
  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 inset-x-0 z-[60] border-t border-white/10 bg-[#101722]/95 backdrop-blur-md px-5 py-4 md:px-8"
      role="dialog"
      aria-label="Consentement publicitaire"
      data-testid="consent-banner"
    >
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF683D]/15 border border-[#FF683D]/30">
            <Cookie className="h-5 w-5 text-[#FF683D]" />
          </span>
          <p className="text-sm leading-relaxed text-[#F8F6F2]/80">
            Nous utilisons des cookies de mesure publicitaire (Meta Pixel) pour évaluer la performance de nos
            campagnes. Ils ne sont activés qu'avec votre accord. Vous pouvez accepter ou refuser.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="consent-reject-btn"
            onClick={onReject}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-[#F8F6F2]/80 hover:bg-white/5 transition-colors"
          >
            Refuser
          </button>
          <button
            type="button"
            data-testid="consent-accept-btn"
            onClick={onAccept}
            className="btn-primary-orange !py-2.5 !px-6 !text-sm"
          >
            Accepter
          </button>
        </div>
      </div>
    </motion.div>
  );
}
