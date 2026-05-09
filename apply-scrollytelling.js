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
  let content = fs.readFileSync(file, 'utf8');

  // Add ScrollytellingCanvas import if not exists
  if (!content.includes('ScrollytellingCanvas')) {
    content = content.replace(/(import .*?\n)/, "$1import { ScrollytellingCanvas } from '@/components/ScrollytellingCanvas';\n");
  }

  // Add motion import if not exists
  if (!content.includes('framer-motion') && !content.match(/import\s+{.*motion.*}\s+from\s+['"]framer-motion['"]/)) {
     content = content.replace(/(import .*?\n)/, "$1import { motion } from 'framer-motion';\n");
  }

  // Wrap the return block
  // We look for: export default function Something(...) { ... return ( ... ); }
  const exportMatch = content.match(/export default function\s+\w+\s*\([^)]*\)\s*\{/);
  if (exportMatch) {
    const startIndex = exportMatch.index;
    let blockStart = content.indexOf('{', startIndex);
    
    // Find the matching closing brace
    let braceCount = 1;
    let i = blockStart + 1;
    let lastReturnIndex = -1;

    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      
      // Look for "return (" at the outermost level
      if (braceCount === 1 && content.slice(i, i + 8) === 'return (') {
        lastReturnIndex = i;
      } else if (braceCount === 1 && content.slice(i, i + 7) === 'return ') {
         if (content.slice(i, i + 10).trim() === 'return <') {
             lastReturnIndex = i;
         }
      }
      i++;
    }

    if (lastReturnIndex !== -1) {
      const returnStart = lastReturnIndex;
      let isParen = content.slice(returnStart, returnStart + 8) === 'return (';
      let _contentToWrap = '';
      let endOfReturn = -1;

      if (isParen) {
         let parenCount = 0;
         let j = returnStart + 6; // index of '('
         while (j < content.length) {
            if (content[j] === '(') parenCount++;
            else if (content[j] === ')') parenCount--;

            if (parenCount === 0) {
               endOfReturn = j;
               break;
            }
            j++;
         }
         
         const innerContent = content.slice(returnStart + 8, endOfReturn);
         
         const newReturn = `return (
    <ScrollytellingCanvas>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">
        ${innerContent.trim()}
      </motion.div>
    </ScrollytellingCanvas>
  )`;
         content = content.slice(0, returnStart) + newReturn + content.slice(endOfReturn + 1);

      } else {
         const semicolon = content.indexOf(';', returnStart);
         const end = semicolon !== -1 ? semicolon : i - 1;
         const innerContent = content.slice(returnStart + 7, end);

         const newReturn = `return (
    <ScrollytellingCanvas>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">
        ${innerContent.trim()}
      </motion.div>
    </ScrollytellingCanvas>
  );`;
         content = content.slice(0, returnStart) + newReturn + content.slice(end + (semicolon !== -1 ? 1 : 0));
      }
    }
  }

  fs.writeFileSync(file, content);
  console.log('Processed', file);
}
