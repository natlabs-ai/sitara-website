"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

const GOLD = "#bfa76f";

export default function Header() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

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
        <ul className="hidden md:flex items-center gap-8">
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
          <li>
            <Link
              href="/onboard"
              className="text-sm text-neutral-300 hover:text-white"
            >
              Log In
            </Link>
          </li>
          <li>
            <Link
              href="/onboard"
              className="text-sm font-medium px-4 py-2 rounded-lg transition"
              style={{ background: GOLD, color: "#0c0c0c" }}
            >
              Open Account
            </Link>
          </li>
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
        <ul className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 py-2 space-y-2">
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
          <li>
            <Link
              href="/onboard"
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
        </ul>
      </div>
    </header>
  );
}
