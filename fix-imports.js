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
  let content = fs.readFileSync(file, 'utf8');

  let changed = false;

  if (!content.match(/import\s+\{\s*ScrollytellingCanvas\s*\}\s+from\s+['"]@\/components\/ScrollytellingCanvas['"]/)) {
    content = content.replace(/^(import .*?(\n|\r\n))/m, "$1import { ScrollytellingCanvas } from '@/components/ScrollytellingCanvas';\n");
    changed = true;
  }

  if (!content.match(/import\s+\{.*motion.*\}\s+from\s+['"]framer-motion['"]/)) {
    content = content.replace(/^(import .*?(\n|\r\n))/m, "$1import { motion } from 'framer-motion';\n");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Added imports to', file);
  }
}
