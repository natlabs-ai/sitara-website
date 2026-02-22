"use client";

import Image from "next/image";
import { prefix } from "@/lib/assets";

export default function About() {
  return (
    <section id="about" className="bg-black text-neutral-200 py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 grid md:grid-cols-2 gap-12 items-center">
        {/* Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-2xl">
          <Image
            src={`${prefix}/images/dubai-skyline.jpg`}
            alt="Dubai skyline"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-center"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-amber-400 leading-tight">
            About Sitara
          </h2>
          <p className="mt-6 text-base sm:text-lg text-neutral-300 leading-relaxed">
           Sitara partners across the precious-metals supply chain — from producers and refiners to secure storage and market distribution. Based in Dubai, we focus on dependable counterparties, transparent commercial terms, and disciplined execution. Our role is to help move metal efficiently and responsibly from origin to market, with clarity on risks, documentation and settlement.
          </p>
        </div>
      </div>
    </section>
  );
}
