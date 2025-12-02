"use client";

import React from "react";
import {
  Field,
  filterOptionsByMap,
  GOLD,
  GOLD_BG_SOFT,
  Label,
  visibleByRules,
  DEV_MODE,
  isTruthy,
} from "./onboardingShared";

export function FieldRenderer({
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

  // --- radio ---
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

  // --- multiselect ---
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

  // --- textarea ---
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

  // --- file ---
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

  // --- otp ---
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

  // --- note ---
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

  // --- select ---
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

  // --- number ---
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

  // --- default text/email/password/tel ---
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
