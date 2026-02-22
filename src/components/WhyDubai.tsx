"use client";

import Image from "next/image";
import { prefix } from "@/lib/assets";

export default function WhyDubai() {
  return (
    <section id="why-dubai" className="bg-black text-neutral-200 py-20">
      <div className="mx-auto grid max-w-screen-xl items-center gap-12 md:grid-cols-2 px-4 sm:px-6 md:px-8">
        {/* Left: Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-2xl">
          <Image
            src={`${prefix}/images/gold-trading.jpg`}
            alt="Gold trading and Dubai skyline"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-center"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
        </div>

        {/* Right: Text */}
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-amber-400 leading-tight">
            At the Heart of Global Gold Trade
          </h2>
          <p className="mt-6 text-base sm:text-lg text-neutral-300 leading-relaxed">
            Dubai's strategic location, regulatory framework, and Free Zone
            infrastructure connect producers, refineries, and markets with
            efficiency and trust. Sitara operates within this network to deliver
            reliable routes from origin to market.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm sm:text-base">KYC/AML Controls</span>
            <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm sm:text-base">Free Zone Logistics</span>
            <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm sm:text-base">Global Banking Links</span>
          </div>
        </div>
      </div>
    </section>
  );
}
