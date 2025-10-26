// next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// ---------- Helpers ----------
/** ทำความสะอาดสตริง ENV list -> string[] */
function parseList(envVal, sep = ',') {
  return String(envVal || '')
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** สร้าง CSP header ตามโหมดและ ENV ที่ให้มา */
function buildCsp() {
  const isProd = process.env.NODE_ENV === 'production';
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  // allow list เพิ่มเติมทาง ENV (คั่นด้วย comma)
  const extraConnect = parseList(process.env.CSP_CONNECT_SRC_EXTRA);
  const extraImg = parseList(process.env.CSP_IMG_SRC_EXTRA);
  const extraFrame = parseList(process.env.CSP_FRAME_SRC_EXTRA);

  // host สำหรับ API/WS (เช่น http://localhost:5000)
  const apiHost = apiUrl ? new URL(apiUrl).origin : null;
  const wsHost = apiUrl
    ? apiUrl
        .replace(/^http(s?):\/\//, (_, s) => (s ? 'wss://' : 'ws://'))
        .replace(/\/+$/, '')
    : null;

  /** หมายเหตุ:
   * - dev: ผ่อนปรนกว่า (อนุญาต 'unsafe-eval' เพื่อ React Fast Refresh เป็นต้น)
   * - prod: เข้มขึ้น ไม่ใส่ 'unsafe-eval'
   * - style-inline ยังจำเป็นสำหรับ styled-jsx/tailwind ในหลายเคส จึงเปิดไว้โดยตั้งใจ
   */
  const scriptSrc = isProd ? ["'self'"] : ["'self'", "'unsafe-eval'"]; // dev ต้องการบางเคส

  const connectSrc = [
    "'self'",
    'blob:',
    ...(apiHost ? [apiHost] : []),
    ...(wsHost ? [wsHost] : []),
    ...extraConnect,
  ];

  const imgSrc = ["'self'", 'data:', 'blob:', 'https:', ...extraImg];

  const styleSrc = ["'self'", "'unsafe-inline'"];
  const fontSrc = ["'self'", 'data:'];
  const frameSrc = ["'self'", ...extraFrame];
  const objectSrc = ["'none'"];
  const baseUri = ["'self'"];
  const formAction = ["'self'"];

  const directives = {
    'default-src': ["'self'"],
    'base-uri': baseUri,
    'form-action': formAction,
    'object-src': objectSrc,
    'frame-src': frameSrc,
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'connect-src': connectSrc,
    'img-src': imgSrc,
    'font-src': fontSrc,
    // ปิด inline event handlers
    'script-src-attr': ["'none'"],
    // อนุญาต worker/wasm ผ่าน blob: ถ้าจำเป็น (three/r3f เป็นต้น)
    'worker-src': ["'self'", 'blob:'],
  };

  const value = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');

  const key =
    process.env.ENABLE_CSP === 'true'
      ? 'Content-Security-Policy'
      : process.env.ENABLE_CSP_REPORT_ONLY === 'true'
        ? 'Content-Security-Policy-Report-Only'
        : null;

  return key ? [{ key, value }] : [];
}

/** ---------- Dev origins (ลด warning ตอน dev) ---------- */
const resolvedLan =
  process.env.LAN_HOST && process.env.LAN_HOST.trim()
    ? `http://${process.env.LAN_HOST.trim()}:3000`
    : null;

const extraDevOrigins = parseList(process.env.ALLOWED_DEV_ORIGINS);

const allowedDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  resolvedLan,
  ...extraDevOrigins,
].filter(Boolean);

/** ---------- Security Headers ---------- */
/** หมายเหตุ:
 * - HSTS ใช้ได้เฉพาะ HTTPS; เปิดด้วย ENV ENABLE_HSTS='true'
 * - X-XSS-Protection เลิกใช้แล้วในบราวเซอร์หลัก ๆ (ตั้ง 0 เพื่อตัดความสับสน)
 */
const securityHeadersBase = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '0' },
  {
    key: 'Permissions-Policy',
    value: [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'fullscreen=(self)',
      'payment=()',
      'usb=()',
      'accelerometer=()',
      'autoplay=(self)',
    ].join(', '),
  },
];

// เปิด HSTS เฉพาะเมื่อระบุไว้ และต้องแน่ใจว่าเสิร์ฟผ่าน HTTPS จริง ๆ
if (process.env.ENABLE_HSTS === 'true') {
  securityHeadersBase.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const securityHeaders = [...securityHeadersBase, ...buildCsp()];

/** ---------- Images Remote Patterns ---------- */
function buildRemotePatterns() {
  // ใช้กับ next/image (ถ้าโปรเจ็กต์มีใช้งาน)
  // ใส่ host ผ่าน ENV: ALLOWED_IMAGE_HOSTS="images.example.com,cdn.example.io"
  const hosts = parseList(process.env.ALLOWED_IMAGE_HOSTS);
  return hosts
    .map((host) => {
      // รองรับทั้ง "https://..." หรือแค่โดเมน
      try {
        const u = new URL(/^https?:\/\//.test(host) ? host : `https://${host}`);
        return {
          protocol: u.protocol.replace(':', ''),
          hostname: u.hostname,
          port: u.port || undefined,
          pathname: '/**',
        };
      } catch {
        // ถ้าพาร์สไม่ได้ก็ข้าม
        return null;
      }
    })
    .filter(Boolean);
}

/** ---------- Config หลัก ---------- */
const baseConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  output: 'standalone',

  images: {
    remotePatterns: buildRemotePatterns(),
  },

  experimental: {
    // Dev overlay allowed origins (บางเวอร์ชันใช้ allowedOrigins, บางเวอร์ชันใช้ allowedDevOrigins)
    allowedOrigins: allowedDevOrigins,
    allowedDevOrigins,
    typedRoutes: true,
  },

  // ให้ CI fail เมื่อ lint error แต่ไม่บล็อกตอน dev
  eslint: {
    ignoreDuringBuilds: process.env.CI ? false : true,
  },

  // เปิด browser sourcemap แบบ opt-in
  productionBrowserSourceMaps: process.env.BROWSER_SOURCEMAPS === 'true',

  async headers() {
    return [
      // Global security headers
      { source: '/:path*', headers: securityHeaders },

      // Cache assets ของ Next แบบยาว
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },

      // ตัวอย่าง: cache fonts/images (ถ้ามีโฟลเดอร์เหล่านี้)
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  /**
   * Proxy API และ WS ไป backend ตาม NEXT_PUBLIC_API_URL
   * ✅ สำคัญ: ฝั่ง client ควรเรียกเป็น path แบบ relative เช่น `/api/v1/health`
   * เพื่อให้ rewrite ทำงานและเลี่ยง CORS ใน dev/test (เช่น Playwright)
   */
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
    if (api && api.startsWith('http')) {
      return {
        beforeFiles: [
          // HTTP API: คงเส้นทางเดิมทั้งหมดหลัง /api
          { source: '/api/:path*', destination: `${api}/api/:path*` },

          // WS: แผนที่ path /ws ไป backend ws
          // หมายเหตุ: เวอร์ชันของ Next บางช่วง "rewrite" อาจไม่ proxy WS ได้จริง
          // ถ้าเกิดปัญหาให้เรียก WS จาก client ไปที่ backend โดยตรงผ่าน ENV ใน dev
          { source: '/ws', destination: `${api}/ws` },
        ],
        afterFiles: [],
        fallback: [],
      };
    }
    return [];
  },

  // ปกติไม่ต้องแตะ webpack ถ้าไม่มี lib พิเศษ
  webpack: (config, { dev, isServer: _isServer }) => {
    // ลด noisy warning บางประเภทใน dev (ถ้าต้องการ)
    config.infrastructureLogging = config.infrastructureLogging || {};
    if (dev) config.infrastructureLogging.level = 'error';

    // ตัวอย่าง: ปิด performance hints ระหว่าง dev
    if (dev && config.performance) config.performance.hints = false;

    return config;
  },
};

module.exports = withBundleAnalyzer(baseConfig);
