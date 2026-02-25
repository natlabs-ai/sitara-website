"use client";

import React from "react";
import type { Step } from "../onboardingShared";
import { FieldRenderer } from "../FieldRenderer";
import { countries } from "@/data/countries";
import { Section } from "@/components/ui";

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
}

export const BusinessStep: React.FC<BusinessProfileStepProps> = ({
  step,
  answers,
  setValue,
}) => {
  return (
    <div className="space-y-5">
      {step.fields.map((f) => {
        if (f.id === "incCountry") {
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
        }

        return (
          <FieldRenderer
            key={f.id}
            f={f}
            answers={answers}
            setValue={setValue}
          />
        );
      })}
    </div>
  );
};

export default BusinessStep;
