import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  typescript: { ignoreBuildErrors: false },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
