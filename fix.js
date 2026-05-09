const fs = require('fs');
const path = require('path');

function walk(d) {
    let res = [];
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) {
            res.push(...walk(p));
        } else if (p.endsWith('page.tsx')) {
            res.push(p);
        }
    }
    return res;
}

const files = walk('dashboard/src/app');
for (const f of files) {
    let txt = fs.readFileSync(f, 'utf8');
    if (!txt.includes('use client')) {
        fs.writeFileSync(f, '"use client";\n' + txt);
        console.log('Added use client to', f);
    }
}
