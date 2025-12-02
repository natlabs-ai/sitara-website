// src/app/onboard/page.tsx
"use client";
import React from "react";
import spec from "@/config/sitara_onboarding_schema.json";
import OnboardingRenderer from "@/app/onboarding/OnboardingRenderer";

const DEV_MODE = true;

export default function OnboardPage() {
  const [resetKey] = React.useState(0);
  const [extract, setExtract] = React.useState<any | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  async function submitToApi(answers: Record<string, any>) {
    const fd = new FormData();

    // 1) attach plain answers (exclude shadow __files)
    const plainAnswers: Record<string, any> = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (!k.endsWith("__files")) plainAnswers[k] = v;
    });
    fd.append("answers", JSON.stringify(plainAnswers));

    // 2) attach the real File objects from *__files keys
    Object.entries(answers).forEach(([k, v]) => {
      if (!k.endsWith("__files")) return;
      const fieldId = k.replace(/__files$/, "");
      const files = Array.isArray(v) ? (v as File[]) : [];
      files.forEach((file) => fd.append(fieldId, file));
    });

    const res = await fetch("/api/kyb-extract", { method: "POST", body: fd });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-6">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="
              text-sm text-foreground/90 underline decoration-[--color-bronze]
              underline-offset-4 hover:text-[--color-bronze] transition
              inline-flex items-center gap-2
            "
          >
            <span aria-hidden>←</span> Back to site
          </a>
          <div
            className="select-none tracking-[0.55em] uppercase font-semibold text-[--color-bronze]"
            aria-label="Sitara"
          >
            S&nbsp;I&nbsp;T&nbsp;A&nbsp;R&nbsp;A
          </div>
        </div>
      </header>

      {/* DEV banner */}
      {DEV_MODE && (
        <div className="mx-auto mt-4 w-full max-w-3xl px-4 md:px-6">
          <div className="rounded-md border border-yellow-900/40 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-300">
            DEV mode: validation bypass enabled — JSON-driven flow.
          </div>
        </div>
      )}

      {/* Renderer */}
      <main className="mx-auto w-full max-w-3xl px-4 md:px-6">
        <OnboardingRenderer
          key={resetKey}
          spec={spec}
          onSubmit={async (data) => {
            setSubmitError(null);
            setExtract(null);
            try {
              if (DEV_MODE) console.log("SUBMIT → answers", data);
              const json = await submitToApi(data);
              if (DEV_MODE) console.log("KYB extract response →", json);
              setExtract(json?.extract ?? json);
              alert("Submitted! Scroll down to see the KYB Extract (DEV).");
            } catch (err) {
              console.error(err);
              setSubmitError((err as Error).message);
              alert(`Submit error: ${(err as Error).message}`);
            }
          }}
          onChange={(data) => {
            if (DEV_MODE) console.log("answers:", data);
          }}
          onStepChange={(idx, step) => {
            if (DEV_MODE) console.log(`step → ${idx + 1}: ${step.label}`);
          }}
        />

        {/* DEV: Inline KYB extract preview */}
        {(extract || submitError) && (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
            <h2 className="text-base font-semibold text-neutral-100 mb-2">KYB Extract (DEV)</h2>
            {submitError ? (
              <p className="text-sm text-red-400">{submitError}</p>
            ) : (
              <pre className="text-xs bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 text-neutral-300 overflow-auto">
                {JSON.stringify(extract, null, 2)}
              </pre>
            )}
            <p className="mt-2 text-xs text-neutral-500">
              This is a DEV preview of the API response from <code>/api/kyb-extract</code>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
