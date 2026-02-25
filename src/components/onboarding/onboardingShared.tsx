//src\app\onboarding\onboardingShared.tsx

"use client";

import React from "react";

/** ---------- Types ---------- */
export type Option = { value: string; label: string; group?: string };

export type ShowRule = {
  field: string;
  equals?: string;
  includesAny?: string[];
  exists?: boolean;
};

export type BaseField = {
  id: string;
  label: string;
  required?: boolean;
  showIf?: ShowRule[];
};

export type Field = BaseField & {
  type:
    | "text"
    | "email"
    | "password"
    | "tel"
    | "textarea"
    | "file"
    | "radio"
    | "multiselect"
    | "otp"
    | "select"
    | "number"
    | "note";
  accept?: string;
  multiple?: boolean;
  options?: Option[];
  filterBy?: { field: string; map: Record<string, string> };
  text?: string;
};

export type Step = {
  id: string;
  label: string;
  fields: Field[];
  showIf?: ShowRule[];
};

export type Spec = {
  meta: { title: string; version: string };
  steps: Step[];
  questionBank?: Field[];
};

// Owner type stored under answers.owners
export type Owner = {
  id: string;
  name?: string;
  ownerType?:
    | "individual"
    | "company"
    | "spv"
    | "trust"
    | "foundation"
    | "other_entity"
    | "";
  incCountry?: string;
  share?: number | "";
  controlBasis?: string;
  pep?: "yes" | "no" | "";
  sanctions?: "yes" | "no" | "unsure" | "";
};

/** ---------- Config ---------- */

export const DEV_MODE = true;

/** ---------- Palette ---------- */
export const GOLD = "#bfa76f";
export const GOLD_HOVER = "#a9915c";
export const GOLD_BG_SOFT = "rgba(191,167,111,.10)";

/** ---------- Helpers ---------- */
export function isTruthy(v: unknown) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function valueIncludesAny(val: unknown, targets: string[]) {
  if (Array.isArray(val)) return val.some((v) => targets.includes(String(v)));
  if (typeof val === "string") return targets.includes(val);
  return false;
}

export function visibleByRules(
  rules: ShowRule[] | undefined,
  answers: Record<string, any>
) {
  if (!rules || rules.length === 0) return true;
  return rules.every((r) => {
    const v = answers[r.field];
    if (r.exists) return isTruthy(v);
    if (r.equals !== undefined) return String(v) === String(r.equals);
    if (r.includesAny && r.includesAny.length > 0)
      return valueIncludesAny(v, r.includesAny);
    return true;
  });
}

export function filterOptionsByMap(
  opts: Option[] = [],
  rule: Field["filterBy"],
  answers: Record<string, any>
) {
  if (!rule) return opts;
  const driver = answers[rule.field];
  const groupKey = rule.map[String(driver)];
  if (!groupKey) return [];
  return opts.filter((o) => o.group === groupKey);
}

/** ---------- Small UI helpers ---------- */
export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium mb-1 text-neutral-100"
    >
      {children}{" "}
      {required ? <span className="text-[--gold-color]"> *</span> : null}
      <style>{`:root{--gold-color:${GOLD}}`}</style>
    </label>
  );
}
