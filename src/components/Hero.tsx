"use client";

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
};

export default function Hero({ onPrimary, onSecondary }: Props) {
  return (
    <section aria-label="Hero" className="pt-28 relative">
      {/* Abstract bronze gradients */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 0%, rgba(198,162,91,0.35) 0%, rgba(0,0,0,0) 60%)," +
            "radial-gradient(50% 60% at 80% 20%, rgba(198,162,91,0.22) 0%, rgba(0,0,0,0) 55%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-light leading-tight">
            Precision and Integrity in Gold Trading
          </h1>
          <p className="mt-5 text-foreground/80 max-w-2xl">
            Trusted UAE-based trading partner specialising in sourcing, logistics,
            and delivery of investment-grade gold.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={onPrimary}
              className="border border-bronze rounded-xl px-5 py-3 hover:bg-bronze hover:text-black"
            >
              Begin Relationship
            </button>
            <button
              onClick={onSecondary}
              className="text-foreground/70 hover:text-bronze"
            >
              Explore Services →
            </button>
          </div>
          {/* Subtle shimmer line */}
          <div
            className="mt-8 w-40 h-px"
            style={{
              background:
                "linear-gradient(90deg, rgba(198,162,91,0) 0%, rgba(198,162,91,0.9) 50%, rgba(198,162,91,0) 100%)",
              animation: "shimmer 4s linear infinite",
              backgroundSize: "200% 100%",
            }}
          />
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
