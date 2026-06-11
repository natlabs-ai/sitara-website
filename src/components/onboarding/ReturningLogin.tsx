"use client";

import { useState } from "react";
import { login } from "@/lib/koraClient";

type Props = {
  onSuccess: (result: { applicant_id: string; email: string; applications: Record<string, unknown>[] }) => void;
  onBack: () => void;
};

export default function ReturningLogin({ onSuccess, onBack }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (typeof window !== "undefined") localStorage.setItem("kora_access_token", result.access_token);
      onSuccess({ applicant_id: result.applicant_id, email: result.email, applications: result.applications ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Log in to continue</h2>
      <p className="text-sm text-neutral-400 mb-6">Enter the email and password you used when you started your application.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required
            className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
            className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none" />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-900/15 px-3 py-2.5">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || !email || !password}
          className="w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? "Logging in…" : "Log in →"}
        </button>
      </form>
    </div>
  );
}
