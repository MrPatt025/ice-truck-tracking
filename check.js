const fs = require('fs');

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
  const content = fs.readFileSync(file, 'utf8');
  const defaultExportMatch = content.match(/export default function\s+\w+\s*\([^)]*\)\s*\{/);
  if (defaultExportMatch) {
    const startIndex = defaultExportMatch.index;
    const bodyStr = content.slice(startIndex);
    const returnIndex = bodyStr.lastIndexOf('return (');
    if (returnIndex !== -1) {
        console.log(file, 'Last return is at', (returnIndex / bodyStr.length).toFixed(2), '% of the export block. Ends with:', bodyStr.slice(bodyStr.length - 20).replace(/\n/g, '\\n'));
    } else {
        console.log(file, 'No "return (" found in export default function');
    }
  }
}
