"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

const GOLD = "#bfa76f";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const close = () => setOpen(false);

  const handleLogout = () => {
    close();
    logout();
    router.push("/");
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl tracking-[0.35em] text-amber-400 font-medium"
          aria-label="Sitara home"
        >
          SITARA
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-neutral-200 hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}

          {isAuthenticated ? (
            <>
              {/* Email indicator */}
              <li className="text-sm text-neutral-500 max-w-[160px] truncate">
                {user?.email}
              </li>
              {/* Dashboard */}
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium px-4 py-2 rounded-lg transition"
                  style={{ background: GOLD, color: "#0c0c0c" }}
                >
                  Dashboard
                </Link>
              </li>
              {/* Log out */}
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
              {/* Log In — outlined button for prominence */}
              <li>
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white transition"
                >
                  Log In
                </Link>
              </li>
              {/* Open Account — gold filled */}
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
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden transition-[max-height] duration-300 overflow-hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <ul className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 py-2 space-y-1">
          {links.map((l) => (
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
              <li className="px-3 py-2 text-sm text-neutral-500 truncate">
                {user?.email}
              </li>
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
