import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Asterisk, Lock } from "lucide-react";
import { API, fmtError } from "@/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/login", { email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(fmtError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B111B] flex items-center justify-center px-5" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-1 mb-8">
          <span className="font-display text-3xl font-bold text-[#F8F6F2]">Claude</span>
          <span className="text-[#FF683D] font-display text-3xl font-bold">.</span>
          <Asterisk className="h-8 w-8 text-[#FF683D]" strokeWidth={2.5} />
        </div>
        <form onSubmit={submit} className="bg-[#F8F6F2] rounded-2xl shadow-2xl p-8" data-testid="admin-login-form">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Lock className="h-5 w-5 text-[#FF683D]" />
            <h1 className="font-display text-2xl font-bold text-[#0B111B]">Administration</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Connectez-vous pour accéder à l'espace privé.</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                id="admin-email"
                data-testid="admin-email-input"
                type="email"
                required
                autoComplete="email"
                className="form-input-premium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemple.fr"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input
                id="admin-password"
                data-testid="admin-password-input"
                type="password"
                required
                autoComplete="current-password"
                className="form-input-premium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && <p data-testid="admin-login-error" className="mt-4 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            data-testid="admin-login-btn"
            disabled={loading}
            className="btn-primary-orange w-full mt-6 disabled:opacity-60"
          >
            {loading ? "CONNEXION…" : "SE CONNECTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
