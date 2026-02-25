// src/components/MultiSelectCards.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";

export type CardOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

interface MultiSelectCardsProps {
  label?: string;
  helperText?: string;
  required?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  options: CardOption[];
}

export const MultiSelectCards: React.FC<MultiSelectCardsProps> = ({
  label,
  helperText,
  required,
  value,
  onChange,
  options,
}) => {
  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="text-sm font-medium text-neutral-100">
          {label}
          {required && <span className="text-red-400"> *</span>}
        </div>
      )}

      {helperText && (
        <p className="text-xs text-neutral-400">{helperText}</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={[
                "relative flex flex-col items-start rounded-2xl border p-3 text-left transition",
                "bg-black/30 hover:bg-black/50",
                selected
                  ? "border-amber-400 shadow-md shadow-amber-500/30"
                  : "border-white/10",
              ].join(" ")}
            >
              {selected && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400/90 p-1">
                  <Check className="h-3 w-3 text-black" />
                </span>
              )}

              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-50">
                {opt.icon}
                <span>{opt.label}</span>
              </div>

              {opt.description && (
                <p className="text-xs leading-snug text-neutral-300">
                  {opt.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
