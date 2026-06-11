"use client";

type Props = { onSelect: (type: "personal" | "business") => void };

export default function AccountTypeSelection({ onSelect }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Let&apos;s get started</h2>
      <p className="text-sm text-neutral-400 mb-6">What type of account would you like to open?</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: "personal" as const, label: "Personal", sub: "Individual account",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /> },
          { type: "business" as const, label: "Business", sub: "Company or organisation",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /> },
        ].map((opt) => (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            className="flex flex-col items-start gap-2 rounded-xl border border-neutral-800 bg-black/40 px-5 py-5 text-left hover:border-[#bfa76f] hover:bg-[#bfa76f]/5 transition-colors group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bfa76f]/15 group-hover:bg-[#bfa76f]/25 transition-colors">
              <svg className="h-5 w-5 text-[#bfa76f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {opt.icon}
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-100">{opt.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
