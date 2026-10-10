import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { API, fmtError } from "@/api";

export default function DefenseAdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/defense/auth/login", { email, password });
      nav("/defense/admin", { replace: true });
    } catch (err) {
      setError(fmtError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#071D3A] font-['Manrope'] px-4">
      <div className="w-full max-w-sm">
        <div className="h-1.5 w-full flex rounded-t-md overflow-hidden"><span className="flex-1 bg-[#0055A4]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#EF4135]" /></div>
        <div className="rounded-b-2xl bg-white p-8 shadow-2xl">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#071D3A] text-white"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <p className="font-['Bricolage_Grotesque'] text-lg font-extrabold text-[#071D3A]">Livret Défense</p>
              <p className="text-xs text-[#071D3A]/50">Espace d'administration</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#071D3A]">Adresse e-mail</label>
              <input data-testid="defense-login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border-2 border-[#163A63]/15 bg-[#F5F6F8] px-4 py-2.5 outline-none focus:border-[#163A63] focus:bg-white transition" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#071D3A]">Mot de passe</label>
              <input data-testid="defense-login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border-2 border-[#163A63]/15 bg-[#F5F6F8] px-4 py-2.5 outline-none focus:border-[#163A63] focus:bg-white transition" />
            </div>
            {error && <p data-testid="defense-login-error" className="text-sm text-[#C8102E]">{error}</p>}
            <button data-testid="defense-login-submit" type="submit" disabled={loading} className="w-full rounded-lg bg-[#C8102E] px-6 py-3 font-semibold text-white hover:bg-[#A00C24] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
