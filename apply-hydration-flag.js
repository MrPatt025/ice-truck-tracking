const fs = require('node:fs');

const files = [
  'dashboard/src/app/(auth)/forgot-password/page.tsx',
  'dashboard/src/app/(auth)/login/page.tsx',
  'dashboard/src/app/(auth)/register/page.tsx',
  'dashboard/src/app/(auth)/reset-password/page.tsx',
  'dashboard/src/app/admin/page.tsx',
  'dashboard/src/app/alerts/page.tsx',
  'dashboard/src/app/compliance/page.tsx',
  'dashboard/src/app/dashboard/page.tsx',
  'dashboard/src/app/fleet/page.tsx',
  'dashboard/src/app/operations/page.tsx',
  'dashboard/src/app/page.tsx',
  'dashboard/src/app/reports/page.tsx',
  'dashboard/src/app/settings/page.tsx',
  'dashboard/src/app/tracking/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/<motion\.div initial={{ opacity: 0, y: 20 }}/g, '<motion.div suppressHydrationWarning initial={{ opacity: 0, y: 20 }}');

  fs.writeFileSync(file, content);
  console.log('Added hydration flag to', file);
}
