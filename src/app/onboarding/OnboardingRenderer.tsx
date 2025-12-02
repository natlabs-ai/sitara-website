// src/app/onboarding/OnboardingRenderer.tsx
"use client";

import React from "react";
import {
  IdDocumentUploader,
  type IdAutoFill,
  type IdExtractStatus,
} from "@/components/IdDocumentUploader";
import type { IdExtracted } from "@/types/IdExtracted";
import {
  createApplication,
  type AccountType,
} from "@/lib/koraClient";

/** ---------- Types ---------- */
type Option = { value: string; label: string; group?: string };
type ShowRule = {
  field: string;
  equals?: string;
  includesAny?: string[];
  exists?: boolean;
};
type BaseField = {
  id: string;
  label: string;
  required?: boolean;
  showIf?: ShowRule[];
};
type Field = BaseField & {
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
type Step = {
  id: string;
  label: string;
  fields: Field[];
  showIf?: ShowRule[];
};
type Spec = {
  meta: { title: string; version: string };
  steps: Step[];
  questionBank?: Field[];
};

// Owner type stored under answers.owners
type Owner = {
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

const DEV_MODE = true;

/** ---------- Palette ---------- */
const GOLD = "#bfa76f";
const GOLD_HOVER = "#a9915c";
const GOLD_BG_SOFT = "rgba(191,167,111,.10)";

/** ---------- Helpers ---------- */
function isTruthy(v: unknown) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function valueIncludesAny(val: unknown, targets: string[]) {
  if (Array.isArray(val)) return val.some((v) => targets.includes(String(v)));
  if (typeof val === "string") return targets.includes(val);
  return false;
}

function visibleByRules(
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

function filterOptionsByMap(
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

function Label({
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
      {children} {required ? <span className="text-[--gold-color]"> *</span> : null}
      <style>{`:root{--gold-color:${GOLD}}`}</style>
    </label>
  );
}

/** ---------- Field Renderer (used for non-Login steps) ---------- */
function FieldRenderer({
  f,
  answers,
  setValue,
}: {
  f: Field;
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const visible = visibleByRules(f.showIf, answers);
  if (!visible) return null;

  let options = f.options || [];
  if (f.filterBy) options = filterOptionsByMap(options, f.filterBy, answers);

  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition";

  if (f.type === "radio") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label required={f.required}>{f.label}</Label>
        <div className="flex flex-wrap gap-5">
          {options.map((o) => (
            <label
              key={o.value}
              className="inline-flex items-center gap-2 text-neutral-100"
            >
              <input
                type="radio"
                name={f.id}
                checked={answers[f.id] === o.value}
                onChange={() => setValue(f.id, o.value)}
                className="h-4 w-4 accent-[--gold-color]"
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  if (f.type === "multiselect") {
    const selected: string[] = answers[f.id] || [];
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label required={f.required}>{f.label}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((o) => {
            const isChecked = selected.includes(o.value);
            return (
              <label
                key={o.value}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                  isChecked
                    ? "border-[--gold-color] bg-[--gold-bg-soft]"
                    : "border-neutral-800 bg-black/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const nextVal = new Set(selected);
                    e.target.checked
                      ? nextVal.add(o.value)
                      : nextVal.delete(o.value);
                    setValue(f.id, Array.from(nextVal));
                  }}
                  className="h-4 w-4 accent-[--gold-color]"
                />
                <span className="text-neutral-100">{o.label}</span>
              </label>
            );
          })}
        </div>
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>
    );
  }

  if (f.type === "textarea") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label htmlFor={f.id} required={f.required}>
          {f.label}
        </Label>
        <textarea
          id={f.id}
          className={baseInput}
          rows={4}
          value={answers[f.id] || ""}
          onChange={(e) => setValue(f.id, e.target.value)}
        />
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  if (f.type === "file") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label htmlFor={f.id} required={f.required}>
          {f.label}
        </Label>
        <input
          id={f.id}
          type="file"
          accept={f.accept}
          multiple={!!f.multiple}
          className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-md file:border file:border-[--gold-color] file:bg-transparent file:text-[--gold-color] file:px-3 file:py-1.5 hover:file:bg-[--gold-bg-soft]"
          onChange={(e) => {
            const fl = e.target.files ? Array.from(e.target.files) : [];
            setValue(`${f.id}__files`, f.multiple ? fl : fl.slice(0, 1));
            const names = fl.map((x) => x.name);
            setValue(f.id, f.multiple ? names : names[0] || null);
          }}
        />
        {isTruthy(answers[f.id]) && (
          <p className="mt-2 text-xs text-neutral-400">
            Attached:{" "}
            {Array.isArray(answers[f.id])
              ? (answers[f.id] as string[]).join(", ")
              : String(answers[f.id])}
          </p>
        )}
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>
    );
  }

  if (f.type === "otp") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label htmlFor={f.id}>{f.label}</Label>
        <div className="flex gap-2">
          <input
            id={f.id}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit code"
            className={baseInput}
            value={answers[f.id] || ""}
            onChange={(e) => setValue(f.id, e.target.value)}
          />
          {DEV_MODE && (
            <button
              type="button"
              onClick={() => setValue(f.id, "000000")}
              className="px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800"
            >
              Autofill
            </button>
          )}
        </div>
        {DEV_MODE && (
          <p className="text-xs text-neutral-500 mt-1">
            Dev mode: OTP not validated.
          </p>
        )}
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  if (f.type === "note") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <div className="text-sm font-semibold text-neutral-100 mb-1">
          {f.label}
        </div>
        <div className="text-sm leading-6 text-neutral-300 whitespace-pre-wrap">
          {f.text || ""}
        </div>
      </div>
    );
  }

  if (f.type === "select") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label htmlFor={f.id} required={f.required}>
          {f.label}
        </Label>
        <select
          id={f.id}
          className={baseInput}
          value={answers[f.id] ?? ""}
          onChange={(e) => setValue(f.id, e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {(options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  if (f.type === "number") {
    return (
      <div
        key={f.id}
        className="rounded-xl border border-neutral-800 bg-black/30 p-4"
      >
        <Label htmlFor={f.id} required={f.required}>
          {f.label}
        </Label>
        <input
          id={f.id}
          type="number"
          className={baseInput}
          value={answers[f.id] ?? ""}
          onChange={(e) =>
            setValue(
              f.id,
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
        />
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  const inputType =
    f.type === "password"
      ? "password"
      : f.type === "email"
      ? "email"
      : f.type === "tel"
      ? "tel"
      : "text";

  return (
    <div
      key={f.id}
      className="rounded-xl border border-neutral-800 bg-black/30 p-4"
    >
      <Label htmlFor={f.id} required={f.required}>
        {f.label}
      </Label>
      <input
        id={f.id}
        type={inputType}
        className={baseInput}
        value={answers[f.id] ?? ""}
        onChange={(e) => setValue(f.id, e.target.value)}
      />
      <style>{`:root{--gold-color:${GOLD}}`}</style>
    </div>
  );
}

/** ---------- Login Panel (custom UX for Login step) ---------- */
function AccountPanel({
  answers,
  setValue,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const countries = React.useMemo(
    () =>
      [
        { name: "Australia", iso2: "AU", dial: "61" },
        { name: "Bahrain", iso2: "BH", dial: "973" },
        { name: "Canada", iso2: "CA", dial: "1" },
        { name: "France", iso2: "FR", dial: "33" },
        { name: "Germany", iso2: "DE", dial: "49" },
        { name: "Hong Kong", iso2: "HK", dial: "852" },
        { name: "India", iso2: "IN", dial: "91" },
        { name: "Kuwait", iso2: "KW", dial: "965" },
        { name: "Nigeria", iso2: "NG", dial: "234" },
        { name: "Oman", iso2: "OM", dial: "968" },
        { name: "Pakistan", iso2: "PK", dial: "92" },
        { name: "Qatar", iso2: "QA", dial: "974" },
        { name: "Saudi Arabia", iso2: "SA", dial: "966" },
        { name: "Singapore", iso2: "SG", dial: "65" },
        { name: "South Africa", iso2: "ZA", dial: "27" },
        { name: "Switzerland", iso2: "CH", dial: "41" },
        { name: "Turkey", iso2: "TR", dial: "90" },
        { name: "United Arab Emirates", iso2: "AE", dial: "971" },
        { name: "United Kingdom", iso2: "GB", dial: "44" },
        { name: "United States", iso2: "US", dial: "1" },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currentIso = answers.phoneCountry || "AE";
  const current = countries.find((c) => c.iso2 === currentIso) || countries[0];
  const dial = answers.phoneDial || current.dial;
  const national = answers.phoneNational || "";

  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition";

  function updateE164(nextDial: string, nextNational: string) {
    const nsn = nextNational.replace(/\D+/g, "").replace(/^0+/, "");
    const e164 = nsn ? `+${nextDial}${nsn}` : `+${nextDial}`;
    setValue("phoneDial", nextDial);
    setValue("phoneNational", nsn);
    setValue("phone", e164);
  }

  function onCountryChange(iso2: string) {
    const c = countries.find((x) => x.iso2 === iso2) || current;
    setValue("phoneCountry", c.iso2);
    updateE164(c.dial, national);
  }

  function onNationalChange(v: string) {
    updateE164(dial, v);
  }

  function sendSmsOtp() {
    if (!answers.phone) return;
    setValue("phoneOtp", "000000");
  }

  const baseBtn =
    "px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800";

  return (
    <div className="space-y-5">
      {/* Email */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Email</Label>
        <div className="grid md:grid-cols-3 gap-3 items-center">
          <input
            type="email"
            className={`${baseInput} md:col-span-2`}
            placeholder="name@example.com"
            value={answers.email || ""}
            onChange={(e) => {
              setValue("email", e.target.value);
              setValue("emailVerified", false);
            }}
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={baseInput}
              placeholder="Email OTP"
              value={answers.emailOtp || ""}
              onChange={(e) => setValue("emailOtp", e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!answers.email) return;
                setValue("emailOtp", "000000");
              }}
              className={baseBtn}
            >
              Send
            </button>
            <button
              type="button"
              onClick={() =>
                setValue("emailVerified", !!answers.email && !!answers.emailOtp)
              }
              className="px-3 py-2 rounded-lg border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
            >
              {answers.emailVerified ? "Verified" : "Verify"}
            </button>
          </div>
        </div>
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Mobile */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Mobile</Label>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            className={baseInput}
            value={currentIso}
            onChange={(e) => onCountryChange(e.target.value)}
            aria-label="Country"
            title="Country"
          >
            {countries.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>

          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-neutral-800 bg-neutral-900 text-neutral-200">
              +{dial}
            </span>
            <input
              type="tel"
              className={`${baseInput} rounded-l-none`}
              placeholder="501234567"
              value={national}
              onChange={(e) => onNationalChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={baseInput}
              placeholder="SMS OTP"
              value={answers.phoneOtp || ""}
              onChange={(e) => setValue("phoneOtp", e.target.value)}
            />
            <button type="button" onClick={sendSmsOtp} className={baseBtn}>
              Send
            </button>
            <button
              type="button"
              onClick={() =>
                setValue(
                  "phoneVerified",
                  !!answers.phone && !!answers.phoneOtp
                )
              }
              className="px-3 py-2 rounded-lg border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
            >
              {answers.phoneVerified ? "Verified" : "Verify"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          Full number:{" "}
          <span className="text-neutral-200">
            {answers.phone || `+${dial}`}
          </span>
        </p>
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>Set Password</Label>
        <input
          type="password"
          className={baseInput}
          placeholder="Minimum 8 characters"
          value={answers.password || ""}
          onChange={(e) => {
            setValue("password", e.target.value);
            if (answers.confirmPassword) setValue("passwordMatch", true);
          }}
        />

        <Label required>Confirm Password</Label>
        <input
          type="password"
          className={baseInput}
          placeholder="Re-enter password"
          value={answers.confirmPassword || ""}
          onChange={(e) => {
            setValue("confirmPassword", e.target.value);
            setValue("passwordMatch", e.target.value === answers.password);
          }}
        />

        {answers.confirmPassword &&
          answers.password &&
          !answers.passwordMatch && (
            <p className="mt-2 text-xs text-red-400">
              Passwords do not match.
            </p>
          )}

        <p className="mt-2 text-xs text-neutral-500">
          Tip: we’ll add strength checks in production.
        </p>
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    </div>
  );
}

/** ---------- Ownership Panel (minimal smart-first: type → docs → %) ---------- */
function OwnershipPanel({
  answers,
  setValue,
}: {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}) {
  const baseInput =
    "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 px-3 py-2 " +
    "focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition";

  const owners: Owner[] = Array.isArray(answers.owners) ? answers.owners : [];

  function setOwners(next: Owner[]) {
    setValue("owners", next);
  }

  function addOwner() {
    const id = `owner_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const next: Owner[] = [
      ...owners,
      {
        id,
        ownerType: "",
        share: "",
      },
    ];
    setOwners(next);
  }

  function updateOwner(idx: number, patch: Partial<Owner>) {
    const next = owners.slice();
    const curr = next[idx] || { id: `owner_${idx}` };
    next[idx] = { ...curr, ...patch };
    setOwners(next);
  }

  function removeOwner(idx: number) {
    const next = owners.filter((_, i) => i !== idx);
    setOwners(next);
  }

  function OwnerFileInput(props: {
    ownerKey: string;
    label: string;
    accept?: string;
    multiple?: boolean;
  }) {
    const {
      ownerKey,
      label,
      accept = ".pdf,.jpg,.jpeg,.png,.zip",
      multiple = true,
    } = props;
    const displayKey = ownerKey;
    const filesKey = `${ownerKey}__files`;
    const displayVal = answers[displayKey];

    return (
      <div>
        <Label>{label}</Label>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-md file:border file:border-[--gold-color] file:bg-transparent file:text-[--gold-color] file:px-3 file:py-1.5 hover:file:bg-[--gold-bg-soft]"
          onChange={(e) => {
            const fl = e.target.files ? Array.from(e.target.files) : [];
            setValue(filesKey, multiple ? fl : fl.slice(0, 1));
            const names = fl.map((x) => x.name);
            setValue(displayKey, multiple ? names : names[0] || null);
          }}
        />
        {isTruthy(displayVal) && (
          <p className="mt-2 text-xs text-neutral-400">
            Attached:{" "}
            {Array.isArray(displayVal)
              ? (displayVal as string[]).join(", ")
              : String(displayVal)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro note */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <h2 className="text-sm font-semibold text-neutral-100 mb-1">
          Who owns or controls the business?
        </h2>
        <p className="text-sm text-neutral-300">
          Disclose all Ultimate Beneficial Owners (UBOs) and other controlling
          parties. Include any person or entity with{" "}
          <strong className="text-neutral-100">
            ≥25% ownership or control
          </strong>{" "}
          or significant influence.
        </p>
      </div>

      {/* Owners list */}
      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-100">
            Owners / Controllers
          </h3>
          <button
            type="button"
            onClick={addOwner}
            className="inline-flex items-center gap-1 rounded-lg border border-[--gold-color] px-3 py-1.5 text-xs font-medium text-[--gold-color] hover:bg-[--gold-bg-soft]"
          >
            <span>＋</span> Add owner
          </button>
        </div>

        {owners.length === 0 && (
          <p className="text-xs text-neutral-400">
            No owners added yet. Start by adding at least one owner.
          </p>
        )}

        <div className="space-y-4 mt-2">
          {owners.map((owner, idx) => {
            const index = idx + 1;
            const ownerType = owner.ownerType || "";
            const isIndividual = ownerType === "individual";
            const isEntity =
              ownerType === "company" ||
              ownerType === "spv" ||
              ownerType === "trust" ||
              ownerType === "foundation" ||
              ownerType === "other_entity";

            const ownerPrefix = `owner_${owner.id || idx}`;

            return (
              <div
                key={owner.id || idx}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-300">
                    Owner {index}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOwner(idx)}
                    className="text-xs text-neutral-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Owner Type</Label>
                    <select
                      className={baseInput}
                      value={ownerType}
                      onChange={(e) =>
                        updateOwner(idx, {
                          ownerType: e.target.value as Owner["ownerType"],
                        })
                      }
                    >
                      <option value="">Select…</option>
                      <option value="individual">Individual</option>
                      <option value="company">Company / Corporate</option>
                      <option value="spv">SPV / Holding vehicle</option>
                      <option value="trust">Trust</option>
                      <option value="foundation">Foundation</option>
                      <option value="other_entity">
                        Other entity / association
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label>Ownership / Control (%)</Label>
                    <input
                      type="number"
                      className={baseInput}
                      value={owner.share ?? ""}
                      onChange={(e) =>
                        updateOwner(idx, {
                          share:
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {isIndividual && (
                  <div className="border-t border-neutral-800 pt-3 space-y-3">
                    <div className="text-xs font-semibold text-neutral-300">
                      Owner documents (individual)
                    </div>
                    <p className="text-xs text-neutral-500">
                      Start with the minimum: passport/ID and one proof of
                      address for this person. We’ll extract name, nationality
                      and other details from these documents.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_idDoc`}
                        label="Passport / ID document"
                      />
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_proofAddress`}
                        label="Proof of residential address"
                      />
                    </div>
                  </div>
                )}

                {isEntity && (
                  <div className="border-t border-neutral-800 pt-3 space-y-3">
                    <div className="text-xs font-semibold text-neutral-300">
                      Owner documents (entity)
                    </div>
                    <p className="text-xs text-neutral-500">
                      Upload the key corporate documents for this owner. We’ll
                      extract legal name, jurisdiction, registration numbers and
                      other details automatically where possible.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_legalExistence`}
                        label="Proof of legal existence (licence / certificate)"
                      />
                      <OwnerFileInput
                        ownerKey={`${ownerPrefix}_ownershipProof`}
                        label="Proof of ownership / shareholding"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required>
          I confirm the ownership structure is complete and accurate.
        </Label>
        <label className="inline-flex items-center gap-2 text-neutral-100 text-sm">
          <input
            type="radio"
            name="ownershipDeclaration"
            className="h-4 w-4 accent-[--gold-color]"
            checked={answers.ownershipDeclaration === "agree"}
            onChange={() => setValue("ownershipDeclaration", "agree")}
          />
          <span>I agree</span>
        </label>
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    </div>
  );
}

/** ---------- Main Component ---------- */
export default function OnboardingRenderer({
  spec,
  onSubmit,
  initialAnswers,
  onChange,
  onStepChange,
}: {
  spec: Spec;
  onSubmit: (data: Record<string, any>) => void;
  initialAnswers?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onStepChange?: (index: number, step: Step) => void;
}) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>(
    initialAnswers || {}
  );
  const [isSubmittingStep, setIsSubmittingStep] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const visibleSteps = React.useMemo(
    () => spec.steps.filter((s) => visibleByRules(s.showIf, answers)),
    [spec.steps, answers]
  );

  const step = spec.steps[stepIdx];
  const isCurrentVisible = visibleSteps.some((s) => s.id === step.id);

  React.useEffect(() => {
    if (!isCurrentVisible) {
      const forward = visibleSteps.find(
        (s) => spec.steps.findIndex((x) => x.id === s.id) >= stepIdx
      );
      if (forward) {
        setStepIdx(spec.steps.findIndex((x) => x.id === forward.id));
      } else if (visibleSteps.length > 0) {
        setStepIdx(
          spec.steps.findIndex(
            (x) => x.id === visibleSteps[visibleSteps.length - 1].id
          )
        );
      } else {
        setStepIdx(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, isCurrentVisible, visibleSteps.length]);

  const visibleIdx = Math.max(
    0,
    visibleSteps.findIndex((s) => s.id === step.id)
  );
  const visibleTotal = visibleSteps.length;

  React.useEffect(() => {
    onChange?.(answers);
  }, [answers, onChange]);

  React.useEffect(() => {
    onStepChange?.(visibleIdx, step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdx, step.id]);

  function setValue(id: string, val: any) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function goToVisibleIndex(nextVisibleIdx: number) {
    const target = visibleSteps[nextVisibleIdx];
    if (!target) return;
    const absolute = spec.steps.findIndex((s) => s.id === target.id);
    if (absolute >= 0) setStepIdx(absolute);
  }

  function next() {
    if (visibleIdx < visibleSteps.length - 1)
      goToVisibleIndex(visibleIdx + 1);
  }

  function prev() {
    if (visibleIdx > 0) goToVisibleIndex(visibleIdx - 1);
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  const questionnaireFields: Field[] =
    step.id === "questionnaire"
      ? (spec.questionBank || []).filter((q) =>
          visibleByRules(q.showIf, answers)
        )
      : [];

  const canGoNext = (() => {
    if (step.id === "accountSelection") {
      return !!answers.accountType;
    }

    if (step.id === "login") {
      return (
        !!answers.email &&
        !!answers.phone &&
        !!answers.password &&
        !!answers.confirmPassword &&
        answers.passwordMatch !== false &&
        !isSubmittingStep
      );
    }

    if (step.id === "identity") {
      return answers.idExtractStatus !== "processing";
    }

    return !isSubmittingStep;
  })();

  const ownersForTree: Owner[] = React.useMemo(() => {
    const raw = answers.owners;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (o: Owner) => o && o.name && String(o.name).trim().length > 0
    );
  }, [answers.owners]);

  /** ---------- New: handle Next click with backend call on login ---------- */
  async function handleNextClick() {
    setGlobalError(null);

    if (step.id !== "login") {
      next();
      return;
    }

    try {
      setIsSubmittingStep(true);

      const accountType: AccountType =
        answers.accountType === "business" ? "business" : "individual";

      const payload = {
        tenant_code: "sitara-core",
        account_type: accountType,
        email: String(answers.email || ""),
        phone_country_code: answers.phoneDial
          ? `+${answers.phoneDial}`
          : undefined,
        phone_number: answers.phoneNational || undefined,
        phone_e164: answers.phone || undefined,
        password: answers.password || undefined,
      };

      const res = await createApplication(payload);

      setValue("koraApplicationId", res.application_id);
      setValue("koraApplicantId", res.applicant_id);
      setValue("koraTenantId", res.tenant_id);

      next();
    } catch (e: any) {
      console.error("Failed to create Kora application from login step", e);
      setGlobalError(
        e?.message || "Unable to start your application. Please try again."
      );
    } finally {
      setIsSubmittingStep(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Breadcrumb (only visible steps) */}
      <nav className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        {visibleSteps.map((s, i) => {
          const isActive = s.id === step.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-[--gold-color] text-[--gold-color]"
                    : "border-neutral-700 text-neutral-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  isActive ? "text-[--gold-color]" : "text-neutral-400"
                }
              >
                {s.label}
              </span>
              {i < visibleSteps.length - 1 && (
                <span className="mx-2 text-neutral-600">—</span>
              )}
            </div>
          );
        })}
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </nav>

      {/* Global error banner (for Kora errors on login) */}
      {globalError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-xs text-red-200">
          {globalError}
        </div>
      )}

      {/* Title */}
      <div className="mb-6 text-center">
        <h1
          className="
            text-2xl md:text-3xl font-semibold tracking-widest
            bg-gradient-to-r from-[--color-bronze] via-[#d7c89a] to-[--color-bronze]
            text-transparent bg-clip-text
            drop-shadow-[0_0_10px_var(--gold-shadow)]
          "
        >
          {spec.meta.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Step {visibleIdx + 1} of {visibleTotal} ·{" "}
          <span className="text-neutral-200">{step.label}</span>
        </p>
        <style>{`:root{--gold-shadow: rgba(191,167,111,.35)}`}</style>
      </div>

      {/* Content */}
      <div className="space-y-5">
        {step.id === "review" && (
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
            <h2 className="text-base font-semibold text-neutral-100 mb-2">
              Review
            </h2>
            <pre className="text-xs bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 text-neutral-300 overflow-auto">
              {JSON.stringify(answers, null, 2)}
            </pre>
            <p className="mt-2 text-xs text-neutral-400">
              You’ll answer a short questionnaire next, tailored to your
              selections.
            </p>
          </div>
        )}

        {step.id === "questionnaire" &&
          (questionnaireFields.length > 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm text-neutral-300 mb-4">
                Please answer the questions below. These are generated from your
                earlier selections.
              </p>
              <div className="space-y-5">
                {questionnaireFields.map((f) => (
                  <FieldRenderer
                    key={f.id}
                    f={f}
                    answers={answers}
                    setValue={setValue}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-sm text-neutral-300">
              No additional questions are required based on your selections.
            </div>
          ))}

        {step.id !== "review" &&
          step.id !== "questionnaire" &&
          step.id !== "submit" && (
            <>
              {step.id === "login" ? (
                <AccountPanel answers={answers} setValue={setValue} />
              ) : step.id === "ownership" ? (
                <OwnershipPanel answers={answers} setValue={setValue} />
              ) : step.id === "identity" ? (
                <div className="space-y-5">
    {/* 1. Passport / ID – smart Azure extraction card at the top */}
    <IdDocumentUploader
      tenantId={answers.koraTenantId}
      applicationId={answers.koraApplicationId}
      applicantId={answers.koraApplicantId}
      onStatusChange={(status: IdExtractStatus) => {
        setValue("idExtractStatus", status);
      }}
      onExtracted={(extracted: IdExtracted) => {
        setValue("idExtractPrimary", extracted);
      }}
      onAutoFill={(values: IdAutoFill) => {
        if (values.fullName) {
          setValue("fullName", values.fullName);
        }
        if (values.nationality) {
          setValue("nationality", values.nationality);
        }
        if (values.dateOfBirth) {
          setValue("dateOfBirth", values.dateOfBirth);
        }
      }}
    />

                  {/* 2. Remaining identity fields */}
                  {step.fields.map((f) => (
                    <FieldRenderer
                      key={f.id}
                      f={f}
                      answers={answers}
                      setValue={setValue}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {step.fields.map((f) => (
                    <FieldRenderer
                      key={f.id}
                      f={f}
                      answers={answers}
                      setValue={setValue}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        {step.id === "submit" && (
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-4">
            <h2 className="text-base font-semibold text-neutral-100 mb-2">
              Ready to submit
            </h2>
            <p className="text-sm text-neutral-300">
              We’re sending the information below. Please confirm the details
              before final submission.
            </p>
            <pre className="text-xs bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 text-neutral-300 overflow-auto">
              {JSON.stringify(answers, null, 2)}
            </pre>

            {ownersForTree.length > 0 && (
              <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <h3 className="text-xs font-semibold text-neutral-100 mb-2 uppercase tracking-wide">
                  Ownership structure (summary)
                </h3>
                <p className="text-xs text-neutral-400 mb-2">
                  This summary shows only disclosed owners with a name. Empty
                  rows are automatically collapsed.
                </p>
                <div className="text-xs text-neutral-200">
                  <div className="font-semibold mb-1">Client entity</div>
                  <ul className="ml-4 space-y-1 list-disc">
                    {ownersForTree.map((o, idx) => {
                      let typeLabel = "Owner";
                      switch (o.ownerType) {
                        case "individual":
                          typeLabel = "Individual";
                          break;
                        case "company":
                          typeLabel = "Company";
                          break;
                        case "spv":
                          typeLabel = "SPV / Holding";
                          break;
                        case "trust":
                          typeLabel = "Trust";
                          break;
                        case "foundation":
                          typeLabel = "Foundation";
                          break;
                        case "other_entity":
                          typeLabel = "Other entity";
                          break;
                      }

                      const shareLabel =
                        o.share !== undefined && o.share !== ""
                          ? ` · ${o.share}%`
                          : "";
                      const countryLabel = o.incCountry
                        ? ` · ${o.incCountry}`
                        : "";
                      const pepLabel = o.pep === "yes" ? " · PEP" : "";
                      const sancLabel =
                        o.sanctions === "yes"
                          ? " · Sanctions flag"
                          : o.sanctions === "unsure"
                          ? " · Sanctions unsure"
                          : "";

                      return (
                        <li key={o.id || idx}>
                          <span className="font-medium">{o.name}</span>
                          <span className="text-neutral-400">
                            {" "}
                            — {typeLabel}
                            {shareLabel}
                            {countryLabel}
                            {pepLabel}
                            {sancLabel}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          disabled={visibleIdx === 0}
          onClick={prev}
          className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 disabled:opacity-40 hover:bg-neutral-800 transition"
        >
          Back
        </button>

        {step.id !== "submit" ? (
          <button
            type="button"
            onClick={handleNextClick}
            disabled={!canGoNext || visibleIdx >= visibleSteps.length - 1}
            className={`px-5 py-2 rounded-lg font-medium transition ${
              !canGoNext || visibleIdx >= visibleSteps.length - 1
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
            }`}
          >
            {step.id === "login" && isSubmittingStep ? "Starting…" : "Next"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition"
          >
            Submit
          </button>
        )}
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Single Reset */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            setAnswers({});
            setStepIdx(0);
            setGlobalError(null);
          }}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
