import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack root so builds don’t pick a parent folder when multiple lockfiles exist locally/CI.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
