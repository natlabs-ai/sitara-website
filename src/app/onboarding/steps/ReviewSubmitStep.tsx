// src/app/onboarding/steps/ReviewSubmitStep.tsx
"use client";

import React from "react";
import { DEV_MODE, GOLD, GOLD_BG_SOFT } from "../onboardingShared";
import { fetchEvidencePack, type EvidencePackResponse } from "@/lib/koraClient";

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function docTypeLabel(docType: string): string {
  return titleCase(docType);
}

function parseIsoToMs(v?: string | null): number | null {
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function formatTime(v?: string | null): string {
  if (!v) return "—";
  const ms = parseIsoToMs(v);
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return v;
  }
}

type ReviewSubmitStepProps = {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  setGlobalError?: (msg: string | null) => void;
  isSubmitting?: boolean;
};

export default function ReviewSubmitStep({
  answers,
  setValue,
  setGlobalError,
  isSubmitting,
}: ReviewSubmitStepProps) {
  const applicationId = answers.koraApplicationId as string | undefined;
  const isBusiness = answers.accountType === "business";

  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Prevent repeated auto-refresh loops
  const autoRefreshAttemptedRef = React.useRef(false);

  const evidence: EvidencePackResponse | null =
    (answers.evidencePack as EvidencePackResponse | null) ?? null;

  const requiredTypes: string[] = evidence?.derived?.required_document_types ?? [];
  const missingTypes: string[] = evidence?.derived?.missing_document_types ?? [];
  const latestByType: Record<string, string> =
    evidence?.derived?.latest_documents_by_type ?? {};

  const documents = Array.isArray(evidence?.documents) ? evidence!.documents : [];

  const latestDocFor = React.useCallback(
    (docType: string) => {
      const latestId = latestByType?.[docType];
      if (!latestId) return null;
      return documents.find((d) => d.id === latestId) ?? null;
    },
    [documents, latestByType],
  );

  // ---- Server-driven staleness detection ----
  const generatedAtIso = evidence?.meta?.generated_at ?? null;
  const generatedAtMs = parseIsoToMs(generatedAtIso);

  const maxUploadedAtMs = React.useMemo(() => {
    let max: number | null = null;
    for (const d of documents) {
      const ms = parseIsoToMs(d?.dates?.uploaded_at ?? null);
      if (ms === null) continue;
      if (max === null || ms > max) max = ms;
    }
    return max;
  }, [documents]);

  const isStale =
    !!evidence &&
    generatedAtMs !== null &&
    maxUploadedAtMs !== null &&
    maxUploadedAtMs > generatedAtMs;

  const isComplete =
    !isBusiness || DEV_MODE || (!!evidence && (missingTypes?.length ?? 0) === 0);

  async function loadEvidence(opts?: { reason?: "manual" | "auto" }) {
    if (!isBusiness) return;

    if (!applicationId) {
      const msg =
        "Missing application reference. Please go back to Login and try again.";
      setLoadError(msg);
      setGlobalError?.(msg);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      // Only clear global error on manual refresh (auto refresh shouldn't flicker the top error)
      if (opts?.reason === "manual") setGlobalError?.(null);

      const data = await fetchEvidencePack(applicationId);

      // Store on answers so OnboardingRenderer can gate submit and reuse it.
      setValue("evidencePack", data);
      setValue("evidencePackFetchedAt", new Date().toISOString());
    } catch (e: any) {
      console.error("Failed to fetch evidence pack", e);
      const msg =
        e?.message || "Could not load evidence pack. Please try again or refresh.";
      setLoadError(msg);

      // For manual refresh, bubble it up
      if (opts?.reason === "manual") setGlobalError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isBusiness) return;

    // Auto-load when we land on submit step (business only)
    if (!evidence && applicationId) {
      loadEvidence({ reason: "auto" });
      return;
    }

    // If evidence exists but is stale, auto-refresh ONCE (optional, safe)
    if (evidence && isStale && applicationId && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      loadEvidence({ reason: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness, applicationId, !!evidence, isStale]);

  const pill = (ok: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] ${
      ok
        ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
        : "border-neutral-700 bg-neutral-900 text-neutral-300"
    }`;

  return (
    <div className="space-y-5">
      {isBusiness ? (
        <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Business evidence pack
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                This section is derived from your onboarding resolution and the
                documents currently stored for this application.
              </p>

              {evidence ? (
                <div className="mt-2 text-[11px] text-neutral-500">
                  Generated:{" "}
                  <span className="text-neutral-300">
                    {formatTime(evidence.meta?.generated_at)}
                  </span>
                  {maxUploadedAtMs !== null ? (
                    <>
                      {" "}
                      · Latest upload:{" "}
                      <span className="text-neutral-300">
                        {formatTime(new Date(maxUploadedAtMs).toISOString())}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => loadEvidence({ reason: "manual" })}
              disabled={loading || isSubmitting}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                loading || isSubmitting
                  ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                  : "border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Staleness banner (server-driven) */}
          {evidence && isStale ? (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
              Evidence pack may be out of date (a newer document upload exists).
              Please refresh to ensure this page reflects the latest documents.
            </div>
          ) : null}

          <div className="mt-4">
            {!evidence ? (
              <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                {loading
                  ? "Loading evidence pack…"
                  : loadError
                    ? loadError
                    : "Evidence pack not loaded yet."}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Document sets
                    </div>
                    <div className="mt-2 text-xs text-neutral-200">
                      {(evidence.derived?.document_sets || []).length
                        ? (evidence.derived?.document_sets || [])
                            .map((s) => titleCase(String(s)))
                            .join(", ")
                        : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Required types
                    </div>
                    <div className="mt-2 text-xs text-neutral-200">
                      {requiredTypes.length ? requiredTypes.length : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Completeness
                    </div>
                    <div className="mt-2">
                      {DEV_MODE ? (
                        <span className={pill(true)}>DEV_MODE (not gated)</span>
                      ) : missingTypes.length === 0 ? (
                        <span className={pill(true)}>Complete</span>
                      ) : (
                        <span className={pill(false)}>
                          Missing {missingTypes.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-neutral-800 bg-black/20 p-4">
                  <div className="text-xs font-semibold text-neutral-100">
                    Required documents
                  </div>

                  <div className="mt-3 space-y-2">
                    {(requiredTypes.length ? requiredTypes : []).map((t) => {
                      const isMissing = missingTypes.includes(t);
                      const latestDoc = latestDocFor(t);

                      return (
                        <div
                          key={t}
                          className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-black/25 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-100">
                              {docTypeLabel(t)}
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-400">
                              Latest file:{" "}
                              <span className="text-neutral-200">
                                {latestDoc?.file?.original_name ||
                                  latestDoc?.blob?.name ||
                                  (isMissing ? "—" : "Unknown")}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className={pill(!isMissing)}>
                              {isMissing ? "Missing" : "Received"}
                            </span>
                            {latestDoc?.id ? (
                              <span className="rounded-full border border-neutral-800 bg-black/40 px-2.5 py-1 text-[11px] text-neutral-300">
                                ID: <span className="font-mono">{latestDoc.id}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {!requiredTypes.length ? (
                      <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                        No required document types were returned. This usually
                        means onboarding resolution has not been stored yet.
                      </div>
                    ) : null}
                  </div>

                  {!DEV_MODE && missingTypes.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
                      Missing documents must be uploaded before you can submit.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
        </section>
      ) : null}

      <input type="hidden" value={String(isComplete)} readOnly />
    </div>
  );
}
