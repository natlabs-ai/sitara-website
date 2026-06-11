"use client";

import { useState, useEffect } from "react";
import { getBusinessDocs, type DocItem } from "@/config/onboardingDocuments";
import { countries } from "@/data/countries";
import { detectCountryFromTimezone } from "@/lib/detectCountry";

type Props =
  | { accountType: "personal"; onStart: () => void; onBack: () => void }
  | { accountType: "business"; country: string; role: "signatory" | "employee"; onStart: () => void; onBack: () => void };

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

function DocList({ items }: { items: DocItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black/30 px-4 py-3">
          <svg className="h-4 w-4 text-[#bfa76f] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm text-neutral-200">
            {item.label}
            {item.note && <span className="text-neutral-500"> ({item.note})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query ? countries.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : countries;
  return (
    <div className="relative">
      <input type="text" value={open ? query : value} placeholder="Start typing to search…"
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

function PersonalChecklist({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  const [residenceCountry, setResidenceCountry] = useState("");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const c = detectCountryFromTimezone();
    if (c && countries.some((x) => x.name === c)) { setResidenceCountry(c); setDetected(true); }
  }, []);

  const isUAE = residenceCountry === "United Arab Emirates";
  const docs: DocItem[] = [
    { label: "Passport" },
    ...(isUAE ? [{ label: "Emirates ID" }] : []),
    { label: "Proof of address" },
  ];

  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Before you begin</h2>
      <p className="text-sm text-neutral-400 mb-6">To complete your application you&apos;ll need the following documents ready to upload.</p>

      <div className="mb-5">
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">Country of residence</label>
        <CountrySelect value={residenceCountry} onChange={setResidenceCountry} />
        {detected && residenceCountry && <p className="mt-1 text-xs text-neutral-500">Detected from your location — change if needed.</p>}
      </div>

      {residenceCountry && <DocList items={docs} />}

      <button onClick={onStart} disabled={!residenceCountry}
        className="mt-6 w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        I&apos;m ready →
      </button>
    </div>
  );
}

export default function BeforeYouBegin(props: Props) {
  if (props.accountType === "personal") return <PersonalChecklist onStart={props.onStart} onBack={props.onBack} />;

  const docs = getBusinessDocs(props.country);

  return (
    <div>
      <BackButton onClick={props.onBack} />
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Before you begin</h2>
      <p className="text-sm text-neutral-400 mb-6">To complete your application you&apos;ll need the following documents ready to upload.</p>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Company documents</p>
          <DocList items={docs.company} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Authorised signatory</p>
          <DocList items={docs.signatory} />
        </div>
        <div className="flex gap-2.5 rounded-xl border border-neutral-800 bg-black/30 px-4 py-3">
          <svg className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-xs text-neutral-500">{docs.footer}</p>
        </div>
      </div>

      <button onClick={props.onStart}
        className="mt-6 w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors">
        I&apos;m ready →
      </button>
    </div>
  );
}
