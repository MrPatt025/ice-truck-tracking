// dashboard/next.config.ts
// Note: avoid importing NextConfig type to prevent type mismatches across workspace Next versions
// Enable bundle analyzer when ANALYZE=true

// @ts-expect-error - ESM default import for next-bundle-analyzer
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer: any = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
import path from 'node:path';
import { URL } from 'node:url';

const nextConfig = {
  // ใช้ React Strict Mode
  reactStrictMode: true,
  // swcMinify ถูกเปิดอัตโนมัติใน Next.js สมัยใหม่และ option นี้ถูกเลิกใช้แล้ว

  // Allow overriding the build output directory to avoid Windows file locks during dev
  // Default remains '.next' to preserve deployment expectations
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // สำหรับ deploy แบบ container/standalone (ลดขนาด artifact และ dependency ที่ต้อง bundle)
  output: 'standalone',

  // ช่วยให้ Next ติดตามไฟล์อ้างอิงจากราก monorepo (../)
  outputFileTracingRoot: path.join(__dirname, '..'),

  // คุณมีขั้นตอน `pnpm type-check` และ `pnpm lint` ก่อน build อยู่แล้ว
  // ปิดตรวจซ้ำในขั้นตอน next build เพื่อลดเวลาสร้าง
  typescript: {
    ignoreBuildErrors: true, // ถ้าอยากให้ Next "ไม่" ข้าม error ให้เปลี่ยนเป็น false
  },

  // แก้คำเตือน dev: “Cross origin request detected ... ต้องตั้ง allowedDevOrigins”
  // ใส่ IP/โดเมน dev ที่คุณเข้ามาเปิดเว็บได้ (ปรับตามเครือข่ายของคุณ)
  allowedDevOrigins: [
    '10.73.132.145',
    '192.168.56.1',
    'localhost',
    '127.0.0.1',
  ],

  // ตั้ง alias ให้ import แบบ "@/..." ทำงานที่ฝั่ง Webpack (ให้ตรงกับ tsconfig.paths)
  webpack: (config: any, ctx: any) => {
    const isServer = !!ctx?.isServer;
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(__dirname, 'src'),
    };

    // Silence client-side critical dependency warnings by aliasing server-only modules
    if (!isServer) {
      config.resolve.alias['@sentry/node'] = false as unknown as string;
      config.resolve.alias['@opentelemetry/api'] = false as unknown as string;
      config.resolve.alias['@opentelemetry/instrumentation'] =
        false as unknown as string;
      config.resolve.alias['require-in-the-middle'] =
        false as unknown as string;
      config.resolve.alias['@prisma/instrumentation'] =
        false as unknown as string;
    }

    return config;
  },

  // ถ้าคุณโหลดรูปจากภายนอกบ่อย ๆ (โลโก้/ไอคอน/tiles) ให้ระบุ pattern ที่อนุญาต
  // หรือถ้าใช้เฉพาะแผนที่ที่ไม่ต้อง optimize สามารถตั้ง unoptimized: true แทน
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // unoptimized: true,
  },

  // ตัวเลือกเสริมเพื่อลด bundle สำหรับไลบรารีที่มีหลาย entry (เปิดแบบ experimental ไว้)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      // เพิ่มชื่อแพ็กเกจที่คุณใช้บ่อยและรองรับ optimization ได้
    ],
  },

  // Empty turbopack config to silence Next.js 16+ warnings
  turbopack: {},
} as any;

// In development, proxy API requests to the backend to avoid CORS
// This keeps cookies and credentials same-origin in dev.
(nextConfig as any).rewrites = async (): Promise<any> => {
  const isProd = process.env.NODE_ENV === 'production';
  const hasDirectApi = Boolean(process.env.NEXT_PUBLIC_API_URL);
  if (!isProd && !hasDirectApi) {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  }
  return [];
};

// Attach security headers (CSP and related hardening) post-definition to avoid type inference issues
(nextConfig as any).headers = async (): Promise<any> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
  let apiHost = 'localhost:5000';
  try {
    const u = new URL(apiUrl);
    apiHost = u.host;
  } catch {}

  // Trusted CDN sources
  const cdnCloudflare = 'cdnjs.cloudflare.com';
  const cdnJsdelivr = 'cdn.jsdelivr.net';
  const tomtom = '*.tomtom.com';
  const isProd = process.env.NODE_ENV === 'production';

  // Build CSP with nonce support for inline scripts in production
  // In dev: allow unsafe-inline/unsafe-eval for HMR and debugging
  const csp = [
    "default-src 'self'",
    // Script sources: self, trusted CDNs (Three.js, axe-core for a11y testing)
    `script-src 'self'${isProd ? '' : " 'unsafe-inline' 'unsafe-eval'"} https://${cdnCloudflare} https://${cdnJsdelivr} https://${tomtom}`,
    // Style sources: self, inline styles (for styled-jsx and dynamic theming), TomTom maps
    `style-src 'self' 'unsafe-inline' https://${tomtom}`,
    `style-src-elem 'self' 'unsafe-inline' https://${tomtom}`,
    // Image sources: self, data URIs (inline icons/base64), blob (canvas/worker), TomTom tiles
    `img-src 'self' data: blob: https://${tomtom}`,
    // Font sources: self, data URIs (embedded fonts)
    "font-src 'self' data:",
    // Connect sources: API backend (HTTP/HTTPS/WS/WSS), TomTom services, blob/data for workers
    `connect-src 'self' http://${apiHost} https://${apiHost} ws://${apiHost} wss://${apiHost} https://${tomtom} blob: data:`,
    // Prevent embedding in iframes
    "frame-ancestors 'none'",
    // Block object/embed/applet
    "object-src 'none'",
    // Only allow same-origin base URIs
    "base-uri 'self'",
    // Allow web workers from self and blob URIs (clustering, offscreen canvas)
    "worker-src 'self' blob:",
    // Media sources (if streaming video/audio in future)
    "media-src 'self' blob:",
    // Form actions (only allow submitting to self)
    "form-action 'self'",
    // Frame sources (currently blocked, adjust if embedding maps/widgets)
    "frame-src 'none'",
  ].join('; ');

  const common = [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    {
      key: 'Permissions-Policy',
      value:
        'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
    },
  ];

  const headers = [...common];
  if (process.env.ENABLE_HSTS === '1' || isProd) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    });
  }

  return [
    {
      source: '/:path*',
      headers,
    },
  ] as any;
};

export default withBundleAnalyzer(nextConfig);
