"use client";

import { GoldCombobox } from "@/components/GoldCombobox";
import { countries } from "@/data/countries";
import React from "react";

const nameOptions = countries.map((c) => ({ value: c.name, label: c.name }));
const codeOptions = countries.map((c) => ({ value: c.code, label: c.name }));

interface CountryComboboxProps {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  required?: boolean;
  showError?: boolean;
  error?: string;
  valueAs?: "name" | "code"; // default: "name"
  placeholder?: string;
}

export function CountryCombobox({
  label,
  value,
  onChange,
  required,
  showError,
  error,
  valueAs = "name",
  placeholder,
}: CountryComboboxProps) {
  const options = valueAs === "code" ? codeOptions : nameOptions;
  return (
    <GoldCombobox
      label={label}
      required={required}
      showError={showError}
      error={error}
      value={value ?? null}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? "Start typing to search…"}
    />
  );
}
