"use client";

import { useState, useEffect } from "react";
import { countries } from "@/data/countries";
import { detectCountryFromTimezone } from "@/lib/detectCountry";

type Role = "signatory" | "employee";
type Props = { onContinue: (country: string, role: Role) => void; onBack: () => void };

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mb-5 transition-colors">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
      Back
    </button>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query ? countries.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : countries;
  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        placeholder="Start typing to search…"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setOpen(true); setQuery(e.target.value); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg py-1 text-sm">
          {filtered.slice(0, 50).map((c) => (
            <li key={c.name} onMouseDown={() => { onChange(c.name); setOpen(false); setQuery(""); }}
              className="cursor-pointer px-3 py-1.5 text-neutral-100 hover:bg-neutral-800">{c.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BusinessContext({ onContinue, onBack }: Props) {
  const [country, setCountry] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const d = detectCountryFromTimezone();
    if (d && countries.some((c) => c.name === d)) {
      setCountry(d);
      setDetected(true);
    }
  }, []);

  const canContinue = country !== "" && role !== "";

  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Tell us about your business</h2>
      <p className="text-sm text-neutral-400 mb-6">This helps us show you exactly what you&apos;ll need to complete your application.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Where is your business registered?</label>
          <CountrySelect value={country} onChange={setCountry} />
          {detected && country && <p className="mt-1 text-xs text-neutral-500">Detected from your location — change if needed.</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">What is your role?</label>
          <div className="space-y-2">
            {([
              { value: "signatory" as Role, label: "I am the authorised signatory", description: "Named in the business license (CEO, GM, or director)" },
              { value: "employee" as Role, label: "I am completing this on behalf of my company", description: "Employee acting on behalf of the business" },
            ]).map((opt) => (
              <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  role === opt.value ? "border-[#bfa76f] bg-[#bfa76f]/10" : "border-neutral-800 bg-black/40 hover:border-neutral-600"
                }`}>
                <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${role === opt.value ? "border-[#bfa76f]" : "border-neutral-600"}`}>
                  {role === opt.value && <div className="h-2 w-2 rounded-full bg-[#bfa76f]" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-100">{opt.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => canContinue && onContinue(country, role as Role)} disabled={!canContinue}
        className="mt-6 w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        Continue →
      </button>
    </div>
  );
}
