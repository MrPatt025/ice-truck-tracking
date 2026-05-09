const fs = require('fs');
const path = require('path');

const jestFiles = ['jest.config.js', 'backend/jest.config.js', 'dashboard/jest.config.js'];
jestFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/coverageProvider:\s*['"]babel['"],?/g, '');
    code = code.replace(/coverageProvider:\s*['"]v8['"],?/g, '');
    if (code.match(/module\.exports\s*=\s*\{/)) {
      code = code.replace(/module\.exports\s*=\s*\{/, 'module.exports = {\n  coverageProvider: "v8",');
    } else if (code.match(/export default\s*\{/)) {
      code = code.replace(/export default\s*\{/, 'export default {\n  coverageProvider: "v8",');
    } else if (code.match(/const config(.*?)=\s*\{/)) {
      code = code.replace(/const config(.*?)=\s*\{/, 'const config$1= {\n  coverageProvider: "v8",');
    } else {
      code += '\n// Add coverageProvider\nmodule.exports.coverageProvider = "v8";\n';
    }
    fs.writeFileSync(f, code);
  }
});
