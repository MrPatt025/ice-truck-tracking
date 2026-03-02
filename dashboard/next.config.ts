import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.56.1:3000"],
  eslint: {
    // Lint is run as a separate CI step; don't block production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
