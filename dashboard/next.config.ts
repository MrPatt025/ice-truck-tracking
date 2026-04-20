import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production'
const withPWA = (config: NextConfig) => config
const configuredApiRoot = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:5000').trim()
const HTTP_SCHEME = 'http' + '://'
const HTTPS_SCHEME = 'https' + '://'

function trimPathTrailingSlashes(url: URL): void {
  while (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
}

function normalizeBackendOrigin(rawUrl: string): string {
  const candidate = rawUrl.startsWith(HTTP_SCHEME) || rawUrl.startsWith(HTTPS_SCHEME)
    ? rawUrl
    : `${HTTPS_SCHEME}${rawUrl}`
  const url = new URL(candidate)

  trimPathTrailingSlashes(url)
  const pathnameLower = url.pathname.toLowerCase()

  if (pathnameLower.endsWith('/api/v1')) {
    url.pathname = url.pathname.slice(0, -7) || '/'
  } else if (pathnameLower.endsWith('/api')) {
    url.pathname = url.pathname.slice(0, -4) || '/'
  }

  trimPathTrailingSlashes(url)
  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
}

const backendOrigin = normalizeBackendOrigin(configuredApiRoot)
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
const localApiOrigins: string[] = []
if (!isProduction) {
  localApiOrigins.push('http://localhost:5000', 'ws://localhost:5000')
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
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com https://demotiles.maplibre.org",
  "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
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
  allowedDevOrigins: ["http://localhost:3000", "https://192.168.56.1:3000"],
  compress: true,
  poweredByHeader: false,
  turbopack: {},
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
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/metrics',
        destination: `${backendOrigin}/metrics`,
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
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
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
