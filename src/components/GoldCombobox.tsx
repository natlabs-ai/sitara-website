"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type ComboboxOption = { value: string; label: string };

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function useOutsideClick(
  refs: React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
) {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [refs, onOutside]);
}

export function GoldCombobox({
  label,
  required,
  showError = false,
  error,
  value,
  onChange,
  options,
  placeholder = "Start typing to search…",
  emptyText = "No matches. Try a different spelling.",
  disabled = false,
  maxResults = 40,
}: {
  label: string;
  required?: boolean;
  /** Whether to show error state (red asterisk + error styling) */
  showError?: boolean;
  /** Error message to display */
  error?: string;
  value?: string | null;
  onChange: (next: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  maxResults?: number;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [activeIdx, setActiveIdx] = React.useState(0);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? "";

  // Keep query aligned with selected value when closed
  React.useEffect(() => {
    if (!open) setQuery(selectedLabel || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  const filtered = React.useMemo(() => {
    const q = normalize(query);

    if (!q) return options.slice(0, maxResults);

    const starts: ComboboxOption[] = [];
    const contains: ComboboxOption[] = [];

    for (const opt of options) {
      const n = normalize(opt.label);
      if (n.startsWith(q)) starts.push(opt);
      else if (n.includes(q)) contains.push(opt);

      if (starts.length >= maxResults) break;
    }

    if (starts.length < maxResults) {
      for (const opt of contains) {
        starts.push(opt);
        if (starts.length >= maxResults) break;
      }
    }

    return starts;
  }, [options, query, maxResults]);

  useOutsideClick([wrapRef], () => setOpen(false));

  function commit(opt: ComboboxOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      setActiveIdx(0);
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIdx];
      if (pick) commit(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Only show asterisk when showError is true AND required AND invalid
  const showAsterisk = showError && required;

  return (
    <div
      ref={wrapRef}
      className={`rounded-xl border bg-black/30 p-4 ${showError ? 'border-red-500/40' : 'border-neutral-800'}`}
    >
      <div className="mb-1 text-sm font-semibold text-neutral-100">
        {label}
        {showAsterisk && <span className="text-red-400"> *</span>}
      </div>

      <div className="relative mt-2">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
          <Search className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={open ? query : selectedLabel}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            // When opening, put cursor at end and enable filtering
            setQuery(selectedLabel || "");
            setActiveIdx(0);
          }}
          onClick={() => {
            setOpen(true);
            setQuery(selectedLabel || "");
            setActiveIdx(0);
          }}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
            setOpen(true);

            // If user clears, clear the stored answer too (keeps required validation correct)
            if (e.target.value.trim() === "") onChange("");
          }}
          placeholder={placeholder}
          className={
            "w-full rounded-lg border border-neutral-800 bg-black/40 text-neutral-100 placeholder:text-neutral-500 " +
            "pl-10 pr-10 px-3 py-2 focus:outline-none focus:ring-1 focus:border-[--gold-color] focus:ring-[--gold-color] transition"
          }
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen((v) => !v);
            setActiveIdx(0);
            // When opening via chevron, start from current selection
            if (!open) setQuery(selectedLabel || "");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-neutral-400 hover:bg-black/40 hover:text-neutral-200 disabled:opacity-40"
          aria-label="Toggle list"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-neutral-400">
                {emptyText}
              </div>
            ) : (
              <ul className="max-h-72 overflow-auto py-1">
                {filtered.map((opt, idx) => {
                  const isActive = idx === activeIdx;
                  const isSelected = value === opt.value;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-black/60 text-neutral-50"
                            : "bg-transparent text-neutral-200 hover:bg-black/50"
                        }`}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => commit(opt)}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <span className="text-[--gold-color]">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && showError && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Gold tokens */}
      <style>{`:root{--gold-color:#bfa76f}`}</style>
    </div>
  );
}
