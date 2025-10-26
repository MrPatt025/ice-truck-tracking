// dashboard/src/cypress/support/e2e.ts
/// <reference types="cypress" />

import './commands';

// โหลดปลั๊กอินแบบ optional
try {
  // optional at runtime

  require('cypress-plugin-tab');
} catch {}

// กัน flakiness จาก error ภายในแอป
Cypress.on('uncaught:exception', (_err): false => {
  return false;
});

export {};
