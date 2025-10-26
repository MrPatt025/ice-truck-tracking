import './commands';
// ใช้ plugin ถ้ามีติดตั้งไว้ (ไม่มีไม่เป็นไร เพราะเรามี no-op ไว้แล้ว)
try {
  require('cypress-plugin-tab');
} catch {}
Cypress.on('uncaught:exception', (err) => {
  // กัน error ภายในแอปที่ไม่เกี่ยวกับสิ่งที่ทดสอบ
  if (/toString/.test(err.message)) return false;
});
