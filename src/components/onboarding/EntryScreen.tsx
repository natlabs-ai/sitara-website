"use client";

type Props = { onNew: () => void; onContinue: () => void };

export default function EntryScreen({ onNew, onContinue }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Welcome</h2>
      <p className="text-sm text-neutral-400 mb-6">
        Are you starting a new application or continuing an existing one?
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "New application", sub: "Start the process from scratch", onClick: onNew,
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /> },
          { label: "Continue application", sub: "Pick up where you left off", onClick: onContinue,
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /> },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="flex flex-col items-start gap-2 rounded-xl border border-neutral-800 bg-black/40 px-5 py-5 text-left hover:border-[#bfa76f] hover:bg-[#bfa76f]/5 transition-colors group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bfa76f]/15 group-hover:bg-[#bfa76f]/25 transition-colors">
              <svg className="h-5 w-5 text-[#bfa76f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {btn.icon}
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-100">{btn.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{btn.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
