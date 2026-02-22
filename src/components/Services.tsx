"use client";

type Props = { onEnquire: () => void };

export default function Services({ onEnquire }: Props) {
  const cards = [
    { title: "Gold Trading", desc: "Physical and allocated trades for institutional and private clients.", icon: "🏛️" },
    { title: "Refining & Assaying", desc: "Accredited partners for purity verification and optimisation.", icon: "🧪" },
    { title: "Sourcing & Supply", desc: "Direct procurement from vetted mines and suppliers.", icon: "🔗" },
    { title: "Vaulting & Logistics", desc: "Secure storage and bonded movement via Free Zone partners.", icon: "📦" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="text-3xl md:text-4xl font-light mb-8">Services</h2>
      <div className="overflow-x-auto flex gap-6 pb-4 snap-x snap-mandatory">
        {cards.map((c, i) => (
          <article
            key={i}
            className="snap-start min-w-[300px] md:min-w-[360px] rounded-2xl bg-[#111] border border-white/5 p-6 shadow-soft hover:border-bronze transition"
          >
            <div className="text-bronze text-3xl" aria-hidden>
              {c.icon}
            </div>
            <h3 className="mt-3 text-xl font-medium">{c.title}</h3>
            <p className="mt-2 text-sm text-foreground/70">{c.desc}</p>
            <div className="mt-6 h-px bg-white/10" />
            <button onClick={onEnquire} className="mt-4 text-sm text-bronze hover:text-bronze-dim">
              Enquire →
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
