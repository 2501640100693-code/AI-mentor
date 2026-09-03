import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
