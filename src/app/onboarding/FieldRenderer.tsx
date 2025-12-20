// src/app/onboarding/FieldRenderer.tsx
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

import { countries } from "@/data/countries";

import { MultiSelectCards, type CardOption } from "@/components/MultiSelectCards";

import {
  Building2,
  Factory,
  Warehouse,
  Truck,
  Gem,
  Briefcase,
} from "lucide-react";

import { GoldCombobox } from "@/components/GoldCombobox";

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
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required={f.required}>{f.label}</Label>
        <div className="flex flex-wrap gap-5">
          {options.map((o) => (
            <label key={o.value} className="inline-flex items-center gap-2 text-neutral-100">
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
    const selected: string[] = Array.isArray(answers[f.id]) ? answers[f.id] : [];

    // 1) Special layout for Business Activities
    if (f.id === "businessActivities") {
      const baOptions: CardOption[] = [
        {
          value: "trader",
          label: "Trader",
          description: "Buying and selling physical gold or doré.",
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          value: "supplier",
          label: "Supplier",
          description: "Mine output, aggregators or producers.",
          icon: <Factory className="h-4 w-4" />,
        },
        {
          value: "refiner",
          label: "Refiner",
          description: "Processing doré or scrap into refined bars.",
          icon: <Factory className="h-4 w-4" />,
        },
        {
          value: "vault_storage",
          label: "Vault Storage",
          description: "Secure storage of bullion and valuables.",
          icon: <Warehouse className="h-4 w-4" />,
        },
        {
          value: "logistics",
          label: "Logistics",
          description: "Armoured transport, export and customs.",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          value: "retail_jewellery",
          label: "Retail / Manufacturing Jewellery",
          description: "Retail shops or jewellery manufacturing.",
          icon: <Gem className="h-4 w-4" />,
        },
        {
          value: "institutional",
          label: "Institutional",
          description: "Banks, funds, family offices, treasuries.",
          icon: <Briefcase className="h-4 w-4" />,
        },
        {
          value: "other",
          label: "Other (please specify)",
          description: "Any activity that does not fit the above.",
          icon: <Building2 className="h-4 w-4" />,
        },
      ];

      return (
        <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
          <MultiSelectCards
            label={f.label}
            required={f.required}
            helperText="You can select multiple activities that apply to your firm."
            value={selected}
            onChange={(next) => setValue(f.id, next)}
            options={baOptions}
          />
        </div>
      );
    }

    // 2) Special layout for Supplier Type
    if (f.id === "supplierCategories") {
      const supOptions: CardOption[] = [
        {
          value: "aggregator",
          label: "Aggregator / Cooperative",
          description: "Collecting material from multiple miners or sources.",
          icon: <Factory className="h-4 w-4" />,
        },
        {
          value: "mine",
          label: "Mine",
          description: "Operating one or more mining sites.",
          icon: <Factory className="h-4 w-4" />,
        },
        {
          value: "producer_smelter",
          label: "Producer / Smelter",
          description: "Producing or smelting doré or semi-refined gold.",
          icon: <Factory className="h-4 w-4" />,
        },
      ];

      return (
        <div key={f.id} className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-50">
              {f.label}
              {f.required && <span className="text-red-400"> *</span>}
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Supplier details
            </span>
          </div>
          <p className="mb-3 text-xs text-neutral-200">
            Select all supplier profiles that apply to your business.
          </p>

          <MultiSelectCards value={selected} onChange={(next) => setValue(f.id, next)} options={supOptions} />
        </div>
      );
    }

    // 3) Fallback styling for all other multiselects (e.g. selectedServices)
    return (
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label required={f.required}>{f.label}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => {
            const isChecked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (isChecked) next.delete(o.value);
                  else next.add(o.value);
                  setValue(f.id, Array.from(next));
                }}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  isChecked
                    ? "border-[--gold-color] bg-[--gold-bg-soft] text-amber-100"
                    : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/70"
                }`}
              >
                {o.label}
              </button>
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
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
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
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
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
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
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
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
            >
              Autofill
            </button>
          )}
        </div>
        {DEV_MODE && <p className="mt-1 text-xs text-neutral-500">Dev mode: OTP not validated.</p>}
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </div>
    );
  }

  // --- note ---
  if (f.type === "note") {
    return (
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <div className="mb-1 text-sm font-semibold text-neutral-100">{f.label}</div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-300">
          {f.text || ""}
        </div>
      </div>
    );
  }

  // --- select ---
  if (f.type === "select") {
    // Special-case: Country of Incorporation uses GoldCombobox
    if (f.id === "incCountry") {
      const countryOptions = countries.map((c) => ({ value: c.name, label: c.name }));

      return (
        <GoldCombobox
          label={f.label}
          required={f.required}
          value={String(answers[f.id] ?? "")}
          onChange={(v) => setValue(f.id, v)}
          options={countryOptions}
          placeholder="Start typing to search…"
          emptyText="No matches. Try a different spelling."
        />
      );
    }

    // For other selects, keep native select for now.
    return (
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
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
      <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
        <Label htmlFor={f.id} required={f.required}>
          {f.label}
        </Label>
        <input
          id={f.id}
          type="number"
          className={baseInput}
          value={answers[f.id] ?? ""}
          onChange={(e) => setValue(f.id, e.target.value === "" ? "" : Number(e.target.value))}
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
    <div key={f.id} className="rounded-xl border border-neutral-800 bg-black/30 p-4">
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
