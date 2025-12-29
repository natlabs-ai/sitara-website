import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // IMPORTANT: Vercel root hosting
  // Do NOT use basePath or assetPrefix

  images: {
    unoptimized: true,
    domains: ["images.unsplash.com", "upload.wikimedia.org"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
