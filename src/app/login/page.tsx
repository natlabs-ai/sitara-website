"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/koraClient";
import { useAuth } from "@/contexts/AuthContext";

const GOLD = "#bfa76f";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Loading…</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-900 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition"
        >
          <span>←</span>
          <span>Back to site</span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.45em] text-amber-400"
        >
          SITARA
        </Link>
      </header>

      {/* Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-light text-neutral-100 tracking-wide">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Log in to manage your applications
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 transition focus:outline-none focus:ring-2"
                style={{ focusRingColor: GOLD } as any}
                onFocus={(e) => (e.target.style.borderColor = GOLD)}
                onBlur={(e) => (e.target.style.borderColor = "")}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 pr-12 text-sm text-neutral-100 placeholder-neutral-600 transition focus:outline-none focus:ring-2"
                  onFocus={(e) => (e.target.style.borderColor = GOLD)}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-neutral-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: GOLD }}
            >
              {isSubmitting ? "Logging in…" : "Log In"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-neutral-800" />
            <span className="text-xs text-neutral-600">or</span>
            <div className="flex-1 border-t border-neutral-800" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/onboard"
              className="font-medium transition hover:opacity-80"
              style={{ color: GOLD }}
            >
              Open an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
