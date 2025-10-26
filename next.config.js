// next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Build a safe list of dev origins (fixes the Next.js warning in dev)
const allowedDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.LAN_HOST ? `http://${process.env.LAN_HOST}:3000` : null,
  ...(process.env.ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
].filter(Boolean);

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  output: 'standalone',

  experimental: {
    allowedDevOrigins, // suppresses dev cross-origin warning
    typedRoutes: true,
  },

  eslint: {
    // Fail CI on lint errors, but don't block local dev builds
    ignoreDuringBuilds: process.env.CI ? false : true,
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Optional: proxy /api calls to your backend using env NEXT_PUBLIC_API_URL
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (api && api.startsWith('http')) {
      return [
        {
          source: '/api/:path*',
          destination: `${api.replace(/\/$/, '')}/api/:path*`,
        },
      ];
    }
    return [];
  },
});
