"use client";
import type { StaticImageData } from "next/image";

type BronzeImageProps = {
  src: string | StaticImageData; // pass "/images/..." from callers
  alt: string;
  width: number;
  height: number;
  overlayStrength?: number; // 0 → 1 (default 0.22)
  vignette?: boolean;       // default true
  variant?: "light" | "dark";
  className?: string;
  priority?: boolean; // kept for API parity
  sizes?: string;     // kept for API parity
};

// Sitara bronze
const BRONZE = "198,162,91";

// Hard, reliable prefix at build time (no env reliance):
const isProd = process.env.NODE_ENV === "production";
// <-- IMPORTANT: keep the repo name here
const REPO_PREFIX = isProd ? "/sitara-website" : "";

function withRepoPrefix(p: string) {
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${REPO_PREFIX}${path}`;
}

export default function BronzeImage({
  src,
  alt,
  width,
  height,
  overlayStrength,
  vignette = true,
  variant = "light",
  className,
}: BronzeImageProps) {
  const strength = overlayStrength ?? (variant === "dark" ? 0.34 : 0.22);

  // If an imported image (StaticImageData), use its .src; otherwise use the string.
  const rawSrc = typeof src === "string" ? src : src.src;
  const finalSrc = withRepoPrefix(rawSrc);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        className={`w-full h-auto object-cover ${className ?? ""}`}
        loading="lazy"
        decoding="async"
      />

      {/* Bronze color wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgba(${BRONZE}, ${strength})`,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Directional bronze gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, rgba(${BRONZE}, ${
            strength * 0.9
          }) 0%, rgba(${BRONZE}, 0) 60%)`,
          mixBlendMode: "overlay",
        }}
      />

      {/* Optional vignette */}
      {vignette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.28) 100%)",
          }}
        />
      )}
    </div>
  );
}
