// src/app/onboard/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import OnboardingRenderer from "../onboarding/OnboardingRenderer";
import sitaraSchema from "@/config/sitara_onboarding_schema.json";
import type { Spec } from "../onboarding/onboardingShared";

const spec = sitaraSchema as Spec;

export default function OnboardPage() {
  const handleSubmit = React.useCallback((data: Record<string, any>) => {
    // For now just log the final payload – wire this to an API later.
    // eslint-disable-next-line no-console
    console.log("Sitara onboarding submitted:", data);
  }, []);

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      {/* Top header bar */}
      <header className="flex items-center justify-between border-b border-neutral-900 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-300 hover:text-neutral-100"
        >
          <span className="text-sm">←</span>
          <span>Back to site</span>
        </Link>

        <div className="text-xs font-semibold tracking-[0.45em] text-neutral-200">
          S&nbsp;I&nbsp;T&nbsp;A&nbsp;R&nbsp;A
        </div>
      </header>

      {/* DEV banner (remove when going live) */}
      <div className="border-b border-amber-800 bg-amber-950/70 px-6 py-2 text-xs text-amber-100">
        DEV mode: validation bypass enabled — JSON-driven flow.
      </div>

      {/* Main onboarding flow */}
      <main className="px-4 pb-12 pt-6 md:px-8">
        <OnboardingRenderer spec={spec} onSubmit={handleSubmit} />
      </main>
    </div>
  );
}
