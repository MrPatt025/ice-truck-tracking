const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('page.tsx')) {
      results.push(file);
    }
  });
  return results;
}
const pages = walk('dashboard/src/app');
pages.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;
  if (content.includes('initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}')) {
    content = content.replace(/initial=\{\{ opacity: 0, y: 20 \}\} whileInView=\{\{ opacity: 1, y: 0 \}\} viewport=\{\{ once: true \}\}/g, 'initial={false} animate={{ opacity: 1, y: 0 }}');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(p, content);
    console.log('Updated ' + p);
  }
});
