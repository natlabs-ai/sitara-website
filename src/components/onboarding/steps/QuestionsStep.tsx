// src/app/onboarding/steps/QuestionsStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { countries } from "@/data/countries";
import questionSpec from "@/config/questions/uae_business_questions.v1.json";
import { upsertQuestionnaire } from "@/lib/koraClient";
import { Section } from "@/components/ui";

type QuestionType = "single_select" | "country_multi_select_iso2" | "ack";

type QuestionDef = {
  code: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  ackValue?: string;
};

type QuestionnaireSpec = {
  meta: { version: string };
  questions: QuestionDef[];
};

interface QuestionsStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

function safeArray(v: any): string[] {
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function countryNameByIso2(iso2: string): string {
  const hit = countries.find(
    (c: any) => String(c.code).toUpperCase() === iso2.toUpperCase(),
  );
  return hit?.name ?? iso2;
}

/** ---------- Stable (module-scope) UI primitives ---------- */

function Pill({
  text,
  onRemove,
  inputRef,
}: {
  text: string;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-black/40 px-3 py-1 text-xs text-neutral-200">
      {text}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          onRemove();
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="rounded-full border border-neutral-800 bg-black/40 px-2 py-[2px] text-[11px] text-neutral-200 hover:border-[#bfa76f]"
        aria-label={`Remove ${text}`}
      >
        ×
      </button>
    </span>
  );
}

function RadioQuestion({
  def,
  value,
  onSet,
  showValidationErrors = false,
}: {
  def: QuestionDef;
  value: string;
  onSet: (v: string) => void;
  showValidationErrors?: boolean;
}) {
  const showAsterisk = showValidationErrors && def.required && !value;
  return (
    <Section className="bg-black/20">
      <div className="text-sm font-medium text-neutral-100">
        {def.label}
        {showAsterisk && <span className="text-red-400"> *</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        {(def.options ?? []).map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200"
          >
            <input
              type="radio"
              name={def.code}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onSet(opt.value)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[#bfa76f] focus:ring-[#bfa76f]"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

function AckQuestion({
  def,
  checked,
  onToggle,
  showValidationErrors = false,
}: {
  def: QuestionDef;
  checked: boolean;
  onToggle: (v: boolean) => void;
  showValidationErrors?: boolean;
}) {
  const showAsterisk = showValidationErrors && def.required && !checked;
  return (
    <Section className="bg-black/20">
      <div className="text-sm font-medium text-neutral-100">
        {def.label}
        {showAsterisk && <span className="text-red-400"> *</span>}
      </div>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[#bfa76f] focus:ring-[#bfa76f]"
        />
        <span>
          {def.ackValue
            ? def.ackValue === "consent"
              ? "I consent"
              : "I acknowledge"
            : "I confirm"}
        </span>
      </label>
    </Section>
  );
}

function CountryMultiSelect({
  def,
  countryQuery,
  setCountryQuery,
  countryOptions: _countryOptions,
  filteredCountryOptions,
  selectedIso2,
  toggleCountry,
  activeCountryIdx,
  setActiveCountryIdx,
  inputRef,
  listRef,
  showValidationErrors = false,
}: {
  def: QuestionDef;
  countryQuery: string;
  setCountryQuery: (v: string) => void;
  countryOptions: Array<{ value: string; label: string }>;
  filteredCountryOptions: Array<{ value: string; label: string }>;
  selectedIso2: string[];
  toggleCountry: (iso2: string) => void;
  activeCountryIdx: number;
  setActiveCountryIdx: (v: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  showValidationErrors?: boolean;
}) {
  const showAsterisk = showValidationErrors && def.required && selectedIso2.length === 0;
  return (
    <Section className="bg-black/20">
      <div className="text-sm font-medium text-neutral-100">
        {def.label}
        {showAsterisk && <span className="text-red-400"> *</span>}
      </div>

      <p className="mt-1 text-xs text-neutral-400">
        Start typing to search and add countries. Use ↑ / ↓ and Enter to select
        (or click). Selected countries will appear below.
      </p>

      <div className="mt-3">
        <input
          ref={inputRef}
          type="text"
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          onKeyDown={(e) => {
            if (!filteredCountryOptions.length) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next =
                activeCountryIdx < 0
                  ? 0
                  : Math.min(activeCountryIdx + 1, filteredCountryOptions.length - 1);
              setActiveCountryIdx(next);
              requestAnimationFrame(() => {
                const el = listRef.current?.querySelector(
                  `[data-idx="${next}"]`,
                ) as HTMLElement | null;
                el?.scrollIntoView({ block: "nearest" });
              });
              return;
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = activeCountryIdx <= 0 ? 0 : activeCountryIdx - 1;
              setActiveCountryIdx(next);
              requestAnimationFrame(() => {
                const el = listRef.current?.querySelector(
                  `[data-idx="${next}"]`,
                ) as HTMLElement | null;
                el?.scrollIntoView({ block: "nearest" });
              });
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              const idx = activeCountryIdx >= 0 ? activeCountryIdx : 0;
              const opt = filteredCountryOptions[idx];
              if (!opt) return;

              toggleCountry(opt.value);

              setCountryQuery("");
              requestAnimationFrame(() => inputRef.current?.focus());
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setCountryQuery("");
              requestAnimationFrame(() => inputRef.current?.focus());
              return;
            }
          }}
          placeholder="Type to search countries…"
          className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
          role="combobox"
          aria-expanded={filteredCountryOptions.length > 0}
          aria-controls="country-options"
          aria-autocomplete="list"
        />

        <div
          id="country-options"
          ref={listRef}
          className="mt-3 max-h-56 overflow-auto rounded-xl border border-neutral-800 bg-black/40"
          role="listbox"
        >
          {filteredCountryOptions.length ? (
            filteredCountryOptions.map((opt, idx) => {
              const active = selectedIso2
                .map((x) => x.toUpperCase())
                .includes(opt.value.toUpperCase());
              const highlighted = idx === activeCountryIdx;

              return (
                <button
                  key={opt.value}
                  type="button"
                  data-idx={idx}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveCountryIdx(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCountry(opt.value);
                    setCountryQuery("");
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                    highlighted
                      ? "bg-[#bfa76f]/20 text-[#d7c89a]"
                      : active
                        ? "bg-[#bfa76f]/10 text-[#d7c89a]"
                        : "text-neutral-200 hover:bg-black/60"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs text-neutral-500">{opt.value}</span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-neutral-500">No matches.</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedIso2.length ? (
            selectedIso2
              .slice()
              .sort((a, b) =>
                countryNameByIso2(a).localeCompare(countryNameByIso2(b)),
              )
              .map((iso2) => (
                <Pill
                  key={iso2}
                  text={countryNameByIso2(iso2)}
                  onRemove={() => toggleCountry(iso2)}
                  inputRef={inputRef}
                />
              ))
          ) : (
            <span className="text-xs text-neutral-500">
              No countries selected yet.
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}

/** ---------- Main Step ---------- */

export default function QuestionsStep({ answers, setValue, showValidationErrors = false }: QuestionsStepProps) {
  const spec = questionSpec as QuestionnaireSpec;

  // Store everything under one stable object for easy persistence later
  const q = (answers.questionnaire as Record<string, any> | undefined) ?? {};

  const setQ = React.useCallback(
    (code: string, value: any) => {
      setValue("questionnaire", { ...q, [code]: value });
    },
    [q, setValue],
  );

  const isBusiness = answers.accountType === "business";

  const countryOptions = React.useMemo(() => {
    return countries
      .filter((c: any) => c?.name && c?.code)
      .map((c: any) => ({
        value: String(c.code).toUpperCase(),
        label: String(c.name),
      }));
  }, []);

  const selectedIso2 = safeArray(q.countries_of_operation_iso2);

  const toggleCountry = React.useCallback(
    (iso2: string) => {
      const next = new Set(selectedIso2.map((x) => x.toUpperCase()));
      const k = iso2.toUpperCase();
      if (next.has(k)) next.delete(k);
      else next.add(k);
      setQ("countries_of_operation_iso2", Array.from(next));
    },
    [selectedIso2, setQ],
  );

  // Search query and keyboard navigation state
  const [countryQuery, setCountryQuery] = React.useState("");
  const [activeCountryIdx, setActiveCountryIdx] = React.useState<number>(-1);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const filteredCountryOptions = React.useMemo(() => {
    const ql = countryQuery.trim().toLowerCase();
    if (!ql) return countryOptions.slice(0, 30);
    return countryOptions
      .filter(
        (o) =>
          o.label.toLowerCase().includes(ql) ||
          o.value.toLowerCase().includes(ql),
      )
      .slice(0, 30);
  }, [countryOptions, countryQuery]);

  React.useEffect(() => {
    setActiveCountryIdx(filteredCountryOptions.length ? 0 : -1);
  }, [filteredCountryOptions]);

  // ---- Autosave to backend (debounced) ----
  const tenantId = answers.koraTenantId as string | undefined;
  const applicationId = answers.koraApplicationId as string | undefined;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tenantId || !applicationId) return;

    // Avoid spamming API before user touches anything
    if (!q || Object.keys(q).length === 0) return;

    const t = window.setTimeout(() => {
      upsertQuestionnaire({
        tenant_id: tenantId,
        application_id: applicationId,
        questionnaire_code: "uae_business_questions",
        questionnaire_version: spec.meta.version || "v1",
        responses: q,
      }).catch((e) => {
        console.warn("Questionnaire autosave failed", e);
      });
    }, 500);

    return () => window.clearTimeout(t);
  }, [tenantId, applicationId, q, spec.meta.version]);

  if (!isBusiness) {
    return (
      <Section>
        <div className="text-sm text-neutral-300">
          Questions are only required for business accounts.
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">Questions</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Please answer the questions below. These help determine the appropriate
          compliance checks.
        </p>
        <p className="mt-2 text-[11px] text-neutral-500">
          Questionnaire version:{" "}
          <span className="text-neutral-200">{spec.meta.version}</span>
        </p>
      </Section>

      {spec.questions.map((def) => {
        if (def.type === "country_multi_select_iso2") {
          return (
            <CountryMultiSelect
              key={def.code}
              def={def}
              countryQuery={countryQuery}
              setCountryQuery={setCountryQuery}
              countryOptions={countryOptions}
              filteredCountryOptions={filteredCountryOptions}
              selectedIso2={selectedIso2}
              toggleCountry={toggleCountry}
              activeCountryIdx={activeCountryIdx}
              setActiveCountryIdx={setActiveCountryIdx}
              inputRef={inputRef}
              listRef={listRef}
              showValidationErrors={showValidationErrors}
            />
          );
        }

        if (def.type === "ack") {
          const checked = q[def.code] === true;
          return (
            <AckQuestion
              key={def.code}
              def={def}
              checked={checked}
              onToggle={(v) => setQ(def.code, v)}
              showValidationErrors={showValidationErrors}
            />
          );
        }

        const value = String(q[def.code] ?? "");
        return (
          <RadioQuestion
            key={def.code}
            def={def}
            value={value}
            onSet={(v) => setQ(def.code, v)}
            showValidationErrors={showValidationErrors}
          />
        );
      })}
    </div>
  );
}
