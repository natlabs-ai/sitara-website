import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repo = "sitara-website"; // ← your GitHub repo name

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Static export for GitHub Pages
  // output: "export",
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
  trailingSlash: true,

  // GH Pages cannot use Next’s image optimizer
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

  // Make the base path available inside the app
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${repo}` : "",
  },
};

export default nextConfig;
