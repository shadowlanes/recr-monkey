import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages: the app is fully client-side, so the
  // build is plain files in out/ (Pages build output directory: out).
  output: "export",
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
