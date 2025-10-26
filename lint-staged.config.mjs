// lint-staged.config.mjs
export default {
  // ลดปัญหา Windows/ESRCH จากงานขนาน
  concurrent: false,
  relative: true,

  // TypeScript โค้ดในทุกแพ็กเกจ
  '{backend,dashboard,mobile-app,sdk,src}/**/*.{ts,tsx}': [
    'pnpm exec eslint --fix --cache --cache-location .eslintcache',
    'pnpm exec prettier -w',
  ],

  // ไฟล์ที่ Prettier จัดรูปแบบได้ทั่วไป
  '**/*.{js,jsx,json,md,yml,yaml,css,scss,html}': [
    'pnpm exec prettier -w --ignore-unknown',
  ],

  // Prisma schema
  'backend/prisma/schema.prisma': ['pnpm -F backend exec prisma format'],
};
