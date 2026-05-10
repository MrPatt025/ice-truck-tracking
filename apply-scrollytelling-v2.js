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

  if (!content.includes('ScrollytellingCanvas')) {
    content = content.replace(/(import .*?\n)/, "$1import { ScrollytellingCanvas } from '@/components/ScrollytellingCanvas';\n");
  }

  if (!content.includes('framer-motion') && !content.match(/import\s+{.*motion.*}\s+from\s+['"]framer-motion['"]/)) {
     content = content.replace(/(import .*?\n)/, "$1import { motion } from 'framer-motion';\n");
  }

  const exportMatch = content.match(/export default function\s+\w+\s*\([^)]*\)\s*\{/);
  if (exportMatch) {
    const startIndex = exportMatch.index;
    let blockStart = content.indexOf('{', startIndex);
    
    let braceCount = 1;
    let i = blockStart + 1;
    let mainReturnStart = -1;
    
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultilineComment = false;

    while (i < content.length && braceCount > 0) {
      const char = content[i];
      const nextChar = content[i+1];

      if (!inString && !inComment && !inMultilineComment) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '/' && nextChar === '/') {
          inComment = true;
          i++;
        } else if (char === '/' && nextChar === '*') {
          inMultilineComment = true;
          i++;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (braceCount === 1) {
          if (content.slice(i, i + 8) === 'return (') {
             if (mainReturnStart === -1) {
                 mainReturnStart = i;
             }
          } else if (content.slice(i, i + 7) === 'return ') {
             if (content.slice(i, i + 10).trim() === 'return <') {
                 if (mainReturnStart === -1) {
                     mainReturnStart = i;
                 }
             }
          }
        }
      } else if (inString) {
        if (char === '\\') {
          i++; // skip escaped
        } else if (char === stringChar) {
          inString = false;
        }
      } else if (inComment) {
        if (char === '\n') {
          inComment = false;
        }
      } else if (inMultilineComment) {
        if (char === '*' && nextChar === '/') {
          inMultilineComment = false;
          i++;
        }
      }
      if (braceCount === 0) {
          break; // i is the closing brace
      }
      i++;
    }

    const blockEnd = i; // The closing '}' of the default function

    if (mainReturnStart !== -1) {
        // We know where the main return starts, and where the function block ends.
        // We can just find the last ')' before the blockEnd (excluding trailing spaces/newlines).
        let j = blockEnd - 1;
        while (j > mainReturnStart && (content[j] === ' ' || content[j] === '\n' || content[j] === '\r' || content[j] === ';')) {
            j--;
        }
        
        let lastChar = content[j];
        if (lastChar === ')') {
            // we will replace 'return (' with 'return (<ScrollytellingCanvas>...'
            // and we will replace ')' at j with '</ScrollytellingCanvas>)'
            
            let isParen = content.slice(mainReturnStart, mainReturnStart + 8) === 'return (';
            if (isParen) {
                const newReturnStartStr = `return (\n    <ScrollytellingCanvas>\n      <motion.div suppressHydrationWarning initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">`;
                const newReturnEndStr = `      </motion.div>\n    </ScrollytellingCanvas>\n  )`;
                
                content = content.slice(0, mainReturnStart) + newReturnStartStr + content.slice(mainReturnStart + 8, j) + newReturnEndStr + content.slice(j + 1);
            } else {
                // 'return <Component'
                const newReturnStartStr = `return (\n    <ScrollytellingCanvas>\n      <motion.div suppressHydrationWarning initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">\n        <`;
                const newReturnEndStr = `      </motion.div>\n    </ScrollytellingCanvas>\n  )`;
                content = content.slice(0, mainReturnStart) + newReturnStartStr + content.slice(mainReturnStart + 8, j + 1) + '\n' + newReturnEndStr + content.slice(j + 1);
            }
        }
    }
  }

  fs.writeFileSync(file, content);
  console.log('Processed', file);
}
