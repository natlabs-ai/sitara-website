"use client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  alt: string;
  sources: string[];           // ordered candidates (can include relative /public paths)
  className?: string;
  loading?: "eager" | "lazy";
};

const SVG_FALLBACK =
  `data:image/svg+xml;charset=UTF-8,` +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'>
  <defs>
    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0%' stop-color='#0C0C0C'/>
      <stop offset='60%' stop-color='#1a1a1a'/>
      <stop offset='100%' stop-color='#2a2a2a'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)'/>
  <g fill='#C6A25B' opacity='0.35'>
    <rect x='220' y='520' width='60' height='300'/>
    <rect x='320' y='560' width='50' height='260'/>
    <rect x='390' y='500' width='40' height='320'/>
    <rect x='470' y='450' width='20' height='370'/>
    <rect x='530' y='520' width='70' height='300'/>
    <rect x='640' y='480' width='40' height='340'/>
    <rect x='720' y='420' width='18' height='400'/>
    <rect x='780' y='540' width='52' height='280'/>
  </g>
  <text x='50%' y='90%' text-anchor='middle' fill='#C6A25B' font-size='42' opacity='0.6'
        font-family='Arial, Helvetica, sans-serif'>Dubai Skyline (Placeholder)</text>
</svg>`);

export default function SafeImg({ alt, sources, className, loading = "lazy" }: Props) {
  // De-dupe and prefer local paths if present
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((s) => !!s && !seen.has(s) && seen.add(s)).concat(SVG_FALLBACK);
  }, [sources]);

  const [src, setSrc] = useState<string>(SVG_FALLBACK);

  useEffect(() => {
    let alive = true;

    (async () => {
      for (const url of candidates) {
        // Try to load the image; settle on first that succeeds
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          // allow relative /public paths; CORS only matters for canvas, not display
          img.decoding = "async";
          img.loading = loading;
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (ok) {
          if (alive) setSrc(url);
          break;
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [candidates, loading]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
      decoding="async"
    />
  );
}
