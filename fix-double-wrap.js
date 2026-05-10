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

  // Fix double ScrollytellingCanvas wrapping
  // This happens if the script is run multiple times.
  // We want to keep only one ScrollytellingCanvas wrap.
  
  // Strategy: Remove any ScrollytellingCanvas wrap that contains ANOTHER ScrollytellingCanvas
  let changed = false;
  
  // Remove the double start
  const doubleStart = /<ScrollytellingCanvas>\s*<motion\.div[^>]*suppressHydrationWarning[^>]*>\s*<ScrollytellingCanvas>/g;
  if (doubleStart.test(content)) {
     content = content.replace(doubleStart, '<ScrollytellingCanvas>');
     changed = true;
  }

  // Remove the double end
  const doubleEnd = /<\/ScrollytellingCanvas>\s*<\/motion\.div>\s*<\/ScrollytellingCanvas>/g;
  if (doubleEnd.test(content)) {
     content = content.replace(doubleEnd, '</ScrollytellingCanvas>');
     changed = true;
  }

  // Also fix any motion.div double wrap
  const doubleMotion = /<motion\.div[^>]*>\s*<motion\.div[^>]*suppressHydrationWarning[^>]*>/g;
  if (doubleMotion.test(content)) {
      content = content.replace(doubleMotion, '<motion.div suppressHydrationWarning initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">');
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed double wrap in', file);
  }
}
