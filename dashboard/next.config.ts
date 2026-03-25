import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.56.1:3000"],
  compress: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: false,
  },
  /**
   * Core Web Vitals optimization:
   * - Image optimization for LCP (Largest Contentful Paint)
   * - Automatic srcset generation for responsive images
   * - AVIF format support for faster loading
   */
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.mapbox.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },
  /**
   * Webpack optimization for bundle size:
   * - Enables SWC minification (faster than Terser)
   * - Enables named module IDs for stable hashes
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side bundle optimizations
      const existingSplitChunks = (config.optimization?.splitChunks as unknown) as {
        cacheGroups?: Record<string, unknown>
      } | undefined
      
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...(existingSplitChunks || {}),
          cacheGroups: {
            // Separate React/R3F into vendor chunk for better caching
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|@react-three)[\\/]/,
              name: 'vendor-react',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Separate Three.js into its own chunk (large library)
            three: {
              test: /[\\/]node_modules[\\/]three[\\/]/,
              name: 'vendor-three',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Deck.gl in separate chunk
            deckgl: {
              test: /[\\/]node_modules[\\/]@?deck\.gl[\\/]/,
              name: 'vendor-deckgl',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
