/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import type { Step } from "../onboardingShared";
import { countries } from "@/data/countries";
import { Section, YesNoToggle } from "@/components/ui";

/** ---------- Searchable Country Select (stores ISO code) ---------- */

interface SearchableCountrySelectProps {
  label: string;
  required?: boolean;
  helperText?: string;
  value: string; // ISO code (AE, GB, US...)
  onChange: (value: string) => void; // ISO code
}

const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  label,
  required,
  helperText,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selectedCountry = React.useMemo(() => {
    const code = (value || "").trim().toUpperCase();
    return countries.find((c) => c.code.toUpperCase() === code) || null;
  }, [value]);

  const filteredCountries = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setQuery("");
  };

  const displayValue = isOpen ? query : selectedCountry?.name || "";

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-sm font-semibold text-neutral-100">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      {helperText && <p className="mb-1 text-xs text-neutral-400">{helperText}</p>}

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          placeholder={selectedCountry?.name ? selectedCountry.name : "Start typing to search…"}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setIsOpen(true);
            setQuery(e.target.value);
          }}
          className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
        />

        {isOpen && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-neutral-800 bg-neutral-950/95 shadow-lg">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-500">No matches found.</div>
            ) : (
              <ul className="py-1 text-sm">
                {filteredCountries.map((c) => (
                  <li
                    key={c.code}
                    className="cursor-pointer px-3 py-1.5 text-neutral-100 hover:bg-neutral-800"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c.code);
                    }}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {selectedCountry?.code ? (
        <div className="text-[11px] text-neutral-500">Selected code: {selectedCountry.code}</div>
      ) : null}
    </div>
  );
};

/** ---------- Main Business Profile Step ---------- */

export interface BusinessProfileStepProps {
  step: Step;
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

export const BusinessStep: React.FC<BusinessProfileStepProps> = ({
  step,
  answers,
  setValue,
  showValidationErrors,
}) => {
  const holdsAssets = answers.holds_client_assets_or_funds as boolean | undefined;

  return (
    <div className="space-y-5">
      {/* Country of Incorporation */}
      {step.fields.some((f) => f.id === "incCountry") && (() => {
        const f = step.fields.find((f) => f.id === "incCountry")!;
        return (
          <Section key={f.id}>
            <SearchableCountrySelect
              label={f.label || "Country of Incorporation"}
              required={f.required}
              helperText="Select the country where your company is legally incorporated."
              value={(answers.incCountry as string) || ""}
              onChange={(code) => setValue("incCountry", code)}
            />
          </Section>
        );
      })()}

      {/* Business activity questions */}
      <Section>
        <div className="mb-3">
          <p className="text-sm font-semibold text-neutral-100">Business activity</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            These questions determine which compliance documents apply to your business.
          </p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business ever take ownership of precious metals?</p>
            <YesNoToggle
              value={answers.takes_ownership_of_metals === true ? 'yes' : answers.takes_ownership_of_metals === false ? 'no' : null}
              onChange={(v) => setValue("takes_ownership_of_metals", v === 'yes')}
            />
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business hold client assets or funds?</p>
            <YesNoToggle
              value={holdsAssets === true ? 'yes' : holdsAssets === false ? 'no' : null}
              onChange={(v) => { setValue("holds_client_assets_or_funds", v === 'yes'); if (v === 'no') setValue("settlement_facilitation", undefined); }}
            />
            {holdsAssets === true && (
              <div className="pl-3 border-l border-neutral-700 space-y-3">
                <p className="text-sm text-neutral-200">Do you facilitate settlement (escrow-style)?</p>
                <YesNoToggle
                  value={answers.settlement_facilitation === true ? 'yes' : answers.settlement_facilitation === false ? 'no' : null}
                  onChange={(v) => setValue("settlement_facilitation", v === 'yes')}
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business arrange or execute transactions for clients?</p>
            <YesNoToggle
              value={answers.acts_as_intermediary === true ? 'yes' : answers.acts_as_intermediary === false ? 'no' : null}
              onChange={(v) => setValue("acts_as_intermediary", v === 'yes')}
            />
          </div>
        </div>
        {showValidationErrors &&
          (answers.takes_ownership_of_metals === undefined ||
           answers.holds_client_assets_or_funds === undefined ||
           answers.acts_as_intermediary === undefined ||
           (holdsAssets === true && answers.settlement_facilitation === undefined)) && (
          <p className="mt-3 text-xs text-red-400">Please answer all questions above.</p>
        )}
      </Section>
    </div>
  );
};

export default BusinessStep;
