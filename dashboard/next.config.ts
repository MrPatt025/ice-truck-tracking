import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.56.1:3000"],
  eslint: {
    // Lint is run as a separate CI step; don't block production builds
    ignoreDuringBuilds: true,
  },
  // Performance budgets - enforce bundle size constraints
  // Target: keep main bundle <200KB gzipped, total <500KB
  // These are warnings, not hard blocks, to allow for growth
  experimental: {
    swcMinify: true,
  },
  compress: true,
  optimizeFonts: true,
  poweredByHeader: false,
};

export default nextConfig;
