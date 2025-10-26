// dashboard/next.config.ts
import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // ใช้ React Strict Mode
  reactStrictMode: true,
  // swcMinify ถูกเปิดอัตโนมัติใน Next.js สมัยใหม่และ option นี้ถูกเลิกใช้แล้ว

  // สำหรับ deploy แบบ container/standalone (ลดขนาด artifact และ dependency ที่ต้อง bundle)
  output: 'standalone',

  // ช่วยให้ Next ติดตามไฟล์อ้างอิงจากราก monorepo (../)
  outputFileTracingRoot: path.join(__dirname, '..'),

  // คุณมีขั้นตอน `pnpm type-check` และ `pnpm lint` ก่อน build อยู่แล้ว
  // ปิดตรวจซ้ำในขั้นตอน next build เพื่อลดเวลาสร้าง
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // ถ้าอยากให้ Next “ไม่” ข้าม error ให้เปลี่ยนเป็น false
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
  webpack: (config, { isServer }) => {
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
};

export default nextConfig;
