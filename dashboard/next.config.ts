import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production'
const withPWA = (config: NextConfig) => config
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
const localApiOrigins: string[] = []
if (!isProduction) {
  localApiOrigins.push('http://localhost:5000')
}
const connectSrc = [
  "'self'",
  'ws:',
  'wss:',
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  ...localApiOrigins,
].join(' ')

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com https://demotiles.maplibre.org",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "frame-src 'none'",
  "manifest-src 'self'",
  isProduction ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ')

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
      const existingCacheGroups = existingSplitChunks?.cacheGroups ?? {}

      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...existingSplitChunks,
          cacheGroups: {
            ...existingCacheGroups,
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: isProduction
              ? 'max-age=31536000; includeSubDomains; preload'
              : 'max-age=0',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
