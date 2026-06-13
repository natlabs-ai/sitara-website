"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type NavbarVariant = "marketing" | "focus" | "app";

const GOLD = "#bfa76f";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

const shellCls =
  "fixed inset-x-0 top-0 z-50 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-neutral-800";

const innerCls =
  "mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between";

const wordmarkCls = "text-xl tracking-[0.35em] text-amber-400 font-medium";

export default function Navbar({ variant }: { variant: NavbarVariant }) {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const close = () => setOpen(false);

  const handleLogout = () => {
    close();
    logout();
    router.push("/");
  };

  // ── Focus variant ──────────────────────────────────────────────────────────
  if (variant === "focus") {
    return (
      <header className={shellCls} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className={innerCls}>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition"
          >
            <span>←</span>
            <span>Back to site</span>
          </Link>
          <div className="flex flex-col items-end">
            <Link href="/" className={wordmarkCls} aria-label="Sitara home">
              SITARA
            </Link>
            {user?.email && (
              <span className="mt-0.5 text-xs text-neutral-400 truncate max-w-[200px]">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ── App variant ────────────────────────────────────────────────────────────
  if (variant === "app") {
    return (
      <header className={shellCls} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className={innerCls}>
          <div>
            <Link href="/" className={wordmarkCls} aria-label="Sitara home">
              SITARA
            </Link>
            {user?.email && (
              <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[240px]">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800"
            data-testid="logout-button"
          >
            Log Out
          </button>
        </div>
      </header>
    );
  }

  // ── Marketing variant (default) ────────────────────────────────────────────
  return (
    <header className={shellCls} style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <nav className={innerCls}>
        {/* Brand */}
        <Link href="/" className={wordmarkCls} aria-label="Sitara home">
          SITARA
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-neutral-200 hover:text-white">
                {l.label}
              </a>
            </li>
          ))}

          {isAuthenticated ? (
            <>
              <li className="text-sm text-neutral-500 max-w-[160px] truncate">
                {user?.email}
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium px-4 py-2 rounded-lg transition hover:opacity-90"
                  style={{ background: GOLD, color: "#0c0c0c" }}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="text-sm px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition"
                >
                  Log Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white transition"
                >
                  Log In
                </Link>
              </li>
              <li>
                <Link
                  href="/onboard"
                  className="text-sm font-medium px-4 py-2 rounded-lg transition hover:opacity-90"
                  style={{ background: GOLD, color: "#0c0c0c" }}
                >
                  Open Account
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Mobile menu button */}
        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-700 text-neutral-200"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div
        id="mobile-menu"
        className={`md:hidden transition-[max-height] duration-300 overflow-hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <ul className="mx-auto max-w-screen-xl px-4 sm:px-6 py-2 space-y-1">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={close}
                className="block rounded-md px-3 py-3 text-base text-neutral-200 hover:bg-neutral-800"
              >
                {l.label}
              </a>
            </li>
          ))}

          {isAuthenticated ? (
            <>
              <li className="px-3 py-2 text-sm text-neutral-500 truncate">{user?.email}</li>
              <li>
                <Link
                  href="/dashboard"
                  onClick={close}
                  className="block rounded-md px-3 py-3 text-base font-medium"
                  style={{ color: GOLD }}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-3 py-3 text-base text-neutral-400 hover:bg-neutral-800"
                >
                  Log Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  href="/login"
                  onClick={close}
                  className="block rounded-md px-3 py-3 text-base text-neutral-200 hover:bg-neutral-800"
                >
                  Log In
                </Link>
              </li>
              <li>
                <Link
                  href="/onboard"
                  onClick={close}
                  className="block rounded-md px-3 py-3 text-base font-medium"
                  style={{ color: GOLD }}
                >
                  Open Account
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </header>
  );
}
