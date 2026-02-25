// src/app/onboarding/FieldRenderer.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  Field,
  filterOptionsByMap,
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

// Import new UI components
import {
  Section,
  FormField,
  Input,
  Textarea,
  Select,
  RadioGroup,
  Button,
  GOLD,
  GOLD_BG_SOFT,
} from "@/components/ui";

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

  // --- radio ---
  if (f.type === "radio") {
    return (
      <Section key={f.id}>
        <FormField label={f.label} required={f.required}>
          <RadioGroup
            name={f.id}
            value={answers[f.id] ?? ""}
            onChange={(value) => setValue(f.id, value)}
            options={options}
            orientation="horizontal"
          />
        </FormField>
      </Section>
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
        <Section key={f.id}>
          <MultiSelectCards
            label={f.label}
            required={f.required}
            helperText="You can select multiple activities that apply to your firm."
            value={selected}
            onChange={(next) => setValue(f.id, next)}
            options={baOptions}
          />
        </Section>
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
      <Section key={f.id}>
        <FormField label={f.label} required={f.required}>
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
                  style={{
                    ...(isChecked && { backgroundColor: GOLD_BG_SOFT, borderColor: GOLD }),
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    isChecked
                      ? "text-amber-100"
                      : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/70"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </FormField>
      </Section>
    );
  }

  // --- textarea ---
  if (f.type === "textarea") {
    return (
      <Section key={f.id}>
        <FormField label={f.label} required={f.required} htmlFor={f.id}>
          <Textarea
            id={f.id}
            rows={4}
            value={answers[f.id] || ""}
            onChange={(value) => setValue(f.id, value)}
          />
        </FormField>
      </Section>
    );
  }

  // --- file ---
  if (f.type === "file") {
    return (
      <Section key={f.id}>
        <FormField label={f.label} required={f.required} htmlFor={f.id}>
          <input
            id={f.id}
            type="file"
            accept={f.accept}
            multiple={!!f.multiple}
            style={{
              colorScheme: 'dark',
            }}
            className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-md file:border file:border-[#bfa76f] file:bg-transparent file:text-[#bfa76f] file:px-3 file:py-1.5 hover:file:bg-[rgba(191,167,111,.10)]"
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
        </FormField>
      </Section>
    );
  }

  // --- otp ---
  if (f.type === "otp") {
    return (
      <Section key={f.id}>
        <FormField label={f.label} htmlFor={f.id}>
          <div className="flex gap-2">
            <Input
              id={f.id}
              type="text"
              value={answers[f.id] || ""}
              onChange={(value) => setValue(f.id, value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              inputMode="numeric"
            />
            {DEV_MODE && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setValue(f.id, "000000")}
              >
                Autofill
              </Button>
            )}
          </div>
          {DEV_MODE && <p className="mt-1 text-xs text-neutral-500">Dev mode: OTP not validated.</p>}
        </FormField>
      </Section>
    );
  }

  // --- note ---
  if (f.type === "note") {
    return (
      <Section key={f.id}>
        <div className="mb-1 text-sm font-semibold text-neutral-100">{f.label}</div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-300">
          {f.text || ""}
        </div>
      </Section>
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

    // For other selects, use Select component
    return (
      <Section key={f.id}>
        <FormField label={f.label} required={f.required} htmlFor={f.id}>
          <Select
            id={f.id}
            value={answers[f.id] ?? ""}
            onChange={(value) => setValue(f.id, value)}
            options={options || []}
            placeholder="Select…"
          />
        </FormField>
      </Section>
    );
  }

  // --- number ---
  if (f.type === "number") {
    return (
      <Section key={f.id}>
        <FormField label={f.label} required={f.required} htmlFor={f.id}>
          <Input
            id={f.id}
            type="number"
            value={answers[f.id] ?? ""}
            onChange={(value) => setValue(f.id, value === "" ? "" : Number(value))}
          />
        </FormField>
      </Section>
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
    <Section key={f.id}>
      <FormField label={f.label} required={f.required} htmlFor={f.id}>
        <Input
          id={f.id}
          type={inputType}
          value={answers[f.id] ?? ""}
          onChange={(value) => setValue(f.id, value)}
        />
      </FormField>
    </Section>
  );
}
