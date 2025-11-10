"use client";
import React, { useEffect, useMemo, useState } from "react";
import schemaJson from "@/config/sitara_onboarding_schema.json";

/**
 * Very small renderer that:
 * 1) Reads the JSON schema.
 * 2) Decides whether to ask/skip each field using confidence thresholds.
 * 3) Renders basic input types (text/textarea/number/date/radio/select/chips/file).
 * 4) Supports branching by service selection (Trader/Supplier/Jewellery/Institutional/Refining).
 *
 * NOTE:
 * - This is client-only (works with static export).
 * - “extracted” is a map you populate from your OCR/metadata step after uploads.
 *   Example shape: { "tax.trn": { value: "100000000000000", confidence: 0.91, sourceDoc: "trn_certificate.pdf" } }
 */

type ExtractHit = { value: any; confidence: number; sourceDoc?: string };
type ExtractMap = Record<string, ExtractHit>;

type Question = {
  id: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "radio"
    | "select"
    | "chips"
    | "file"
    | "list"
    | "table"
    | "composite";
  required?: boolean;
  options?: string[];
  fields?: { id: string; type: "number" | "text"; label?: string }[]; // for composite
  multiple?: boolean;
  accept?: string[];
  mask?: string;
  validation?: { regex?: string };
  auto_populate?: {
    sources?: { doc_type: string; field: string }[];
    lock_if_confidence?: "high";
  };
  displayConditions?: { when: string; is: string }[];
  columns?: string[];
};

type Block = { title: string; questions: Question[] };
type Step =
  | { id?: string; title?: string; questions?: Question[]; ref_block?: string }
  | { id: string; branch: { when: Record<string, string>; include: { ref_block: string }[] }[] };

type Flow = { title: string; steps: Step[] };

type Schema = {
  settings: {
    confidence_thresholds: { high: number; medium: number };
  };
  blocks: Record<string, Block>;
  flows: Record<string, Flow>;
};

const schema = schemaJson as Schema;

/** ---------- util: path helpers ---------- */
function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
function set(obj: any, path: string, val: any) {
  const parts = path.split(".");
  let cur = obj;
  parts.forEach((p, i) => {
    if (i === parts.length - 1) cur[p] = val;
    else cur[p] = cur[p] || {};
    cur = cur[p];
  });
}

/** Decide whether to show, prefill or skip */
function decideAsk(fieldId: string, extracted: ExtractMap, high: number, medium: number) {
  const fx = extracted?.[fieldId];
  if (!fx) return { mode: "ask" as const, value: undefined, locked: false, info: undefined };
  if (fx.confidence >= high) return { mode: "skip" as const, value: fx.value, locked: true, info: fx };
  if (fx.confidence >= medium) return { mode: "confirm" as const, value: fx.value, locked: false, info: fx };
  return { mode: "ask" as const, value: undefined, locked: false, info: fx };
}

/** Render a single question */
function InputControl({
  q,
  value,
  onChange,
  locked,
  confirmNeeded,
  prefillInfo,
}: {
  q: Question;
  value: any;
  onChange: (val: any) => void;
  locked: boolean;
  confirmNeeded: boolean;
  prefillInfo?: ExtractHit;
}) {
  const common = "w-full rounded-xl border p-3";
  const label = (
    <label className="block font-medium mb-1">
      {q.label} {q.required ? <span className="text-red-600">*</span> : null}
    </label>
  );
  const hint =
    prefillInfo ? (
      <div className="text-xs text-gray-500 mt-1">
        Prefilled from {prefillInfo.sourceDoc || "extraction"} (confidence {Math.round(prefillInfo.confidence * 100)}%)
      </div>
    ) : null;

  if (q.type === "radio" && q.options) {
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <div className="flex gap-4">
          {q.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                checked={value === opt}
                onChange={() => onChange(opt)}
                disabled={locked}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  if (q.type === "select" && q.options) {
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <select className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={locked}>
          <option value="" disabled>
            Select…
          </option>
          {q.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  if (q.type === "chips" && q.options) {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const active = arr.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                className={`rounded-full border px-3 py-1 ${active ? "bg-gray-200" : ""}`}
                onClick={() => {
                  const next = active ? arr.filter((x) => x !== opt) : [...arr, opt];
                  onChange(next);
                }}
                disabled={locked}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  if (q.type === "composite" && q.fields) {
    const obj = value ?? {};
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <div className="grid grid-cols-2 gap-3">
          {q.fields.map((f) => (
            <input
              key={f.id}
              type={f.type === "number" ? "number" : "text"}
              className={common}
              placeholder={f.label || f.id}
              value={obj[f.id] ?? ""}
              onChange={(e) => onChange({ ...obj, [f.id]: e.target.value })}
              disabled={locked}
            />
          ))}
        </div>
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  if (q.type === "textarea") {
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <textarea className={common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={locked} />
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  if (q.type === "file") {
    return (
      <div className={locked ? "opacity-70 pointer-events-none" : ""}>
        {label}
        <input type="file" multiple={q.multiple} className="block" disabled={locked} />
        {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
        {hint}
      </div>
    );
  }

  // default: text/number/date
  const inputType = q.type === "number" ? "number" : q.type === "date" ? "date" : "text";
  return (
    <div className={locked ? "opacity-70 pointer-events-none" : ""}>
      {label}
      <input
        type={inputType}
        className={common}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
      />
      {confirmNeeded ? <ConfirmToggle onConfirm={() => {}} /> : null}
      {hint}
    </div>
  );
}

function ConfirmToggle({ onConfirm }: { onConfirm: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="mt-2 text-sm flex items-center gap-2">
      <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
      <span>Confirm the prefilled value is correct</span>
      <button
        type="button"
        className={`ml-2 rounded-md border px-2 py-1 ${ok ? "" : "opacity-50 pointer-events-none"}`}
        onClick={onConfirm}
      >
        Confirm
      </button>
    </div>
  );
}

export default function OnboardingRenderer({
  extracted = {},
}: {
  /** Map produced by your OCR/metadata pipeline after uploads */
  extracted?: ExtractMap;
}) {
  const [answers, setAnswers] = useState<any>({});
  const thresholds = schema.settings.confidence_thresholds;
  const flowAccount = schema.flows["AccountType"];
  const selectedActor = get(answers, "actor.type");
  const selectedService = get(answers, "actor.service");

  // helper for writing answers
  const write = (id: string, val: any) => {
    setAnswers((prev: any) => {
      const next = { ...prev };
      set(next, id, val);
      return next;
    });
  };

  // Build current flow (AccountType -> Corporate/Individual + branch)
  const currentFlow: Flow | null = useMemo(() => {
    if (!selectedActor) return flowAccount as Flow;
    return schema.flows[selectedActor as "Corporate" | "Individual"] || null;
  }, [selectedActor, flowAccount]);

  // Resolve a step’s questions (including ref_block)
  const expandStep = (step: Step): Question[] => {
    if ("questions" in step && step.questions) return step.questions;
    if ("ref_block" in step && step.ref_block) return schema.blocks[step.ref_block].questions;
    return [];
  };

  // Branch resolution: include blocks where when conditions match current answers
  const expandBranch = (bStep: Extract<Step, { branch: any }>): Question[] => {
    const out: Question[] = [];
    bStep.branch.forEach((branch) => {
      const condKey = Object.keys(branch.when)[0];
      const condVal = branch.when[condKey];
      if (get(answers, condKey) === condVal) {
        branch.include.forEach((inc) => out.push(...schema.blocks[inc.ref_block].questions));
      }
    });
    return out;
  };

  // Collect all questions to render for the current flow
  const questions: Question[] = useMemo(() => {
    if (!currentFlow) return [];
    const out: Question[] = [];
    currentFlow.steps.forEach((s) => {
      if ("branch" in s) out.push(...expandBranch(s));
      else out.push(...expandStep(s));
    });
    // Filter by displayConditions
    return out.filter((q) => {
      if (!q.displayConditions) return true;
      return q.displayConditions.every((c) => get(answers, c.when) === c.is);
    });
  }, [currentFlow, answers]);

  // Prefill/ask/skip decision and UI
  const rendered = questions.map((q) => {
    const decision = decideAsk(q.id, extracted, thresholds.high, thresholds.medium);
    // If skip (locked high confidence), we still show a small “Verified” row for auditability
    if (decision.mode === "skip") {
      if (get(answers, q.id) == null) write(q.id, decision.value);
      return (
        <div key={q.id} className="rounded-xl border p-3 bg-gray-50">
          <div className="text-xs text-gray-500">Verified</div>
          <div className="font-medium">{q.label}</div>
          <div className="text-sm">{String(decision.value)}</div>
        </div>
      );
    }

    const val = get(answers, q.id);
    return (
      <div key={q.id} className="space-y-1">
        <InputControl
          q={q}
          value={val}
          onChange={(v) => write(q.id, v)}
          locked={decision.locked}
          confirmNeeded={decision.mode === "confirm"}
          prefillInfo={decision.info}
        />
      </div>
    );
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Onboarding</h1>

      {/* Step 1: Always show account type/service first */}
      <div className="rounded-2xl border p-4">
        <h2 className="text-lg font-medium mb-2">{schema.flows["AccountType"].title}</h2>
        {schema.flows["AccountType"].steps[0].questions!.map((q) => {
          const val = get(answers, q.id);
          return (
            <div key={q.id} className="mb-3">
              <InputControl q={q as Question} value={val} onChange={(v) => write(q.id, v)} locked={false} confirmNeeded={false} />
            </div>
          );
        })}
      </div>

      {/* After they pick Corporate/Individual, render relevant blocks dynamically */}
      {selectedActor ? (
        <div className="rounded-2xl border p-4 space-y-4">
          <h2 className="text-lg font-medium mb-2">{currentFlow?.title}</h2>
          {rendered}
        </div>
      ) : null}

      {/* Debug / export answers */}
      <div className="rounded-2xl border p-4">
        <h3 className="font-medium mb-2">Answers (debug)</h3>
        <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">{JSON.stringify(answers, null, 2)}</pre>
      </div>
    </div>
  );
}
