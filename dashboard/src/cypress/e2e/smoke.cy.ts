// dashboard/src/cypress/e2e/smoke.cy.ts

// Basic smoke tests to ensure UI is up and core APIs respond with sane data.

const API_URL = (Cypress.env('API_URL') ||
  Cypress.env('NEXT_PUBLIC_API_URL') ||
  'http://localhost:5000') as string;

const UI_URL = ((Cypress.config('baseUrl') as string) ||
  (Cypress.env('UI_URL') as string) ||
  'http://localhost:3000') as string;

describe('Smoke: API', () => {
  it('GET /api/v1/health -> 200 & status present', () => {
    cy.request(`${API_URL}/api/v1/health`).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body).to.have.property('status');
    });
  });

  it('GET /api/v1/trucks -> 200 & array with expected keys', () => {
    cy.request(`${API_URL}/api/v1/trucks`).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body).to.be.an('array');
      if (Array.isArray(body) && body.length) {
        const t = body[0];
        expect(t).to.have.all.keys(
          'id',
          'latitude',
          'longitude',
          'driver_name',
          'speed',
          'temp',
          'updatedAt',
        );
      }
    });
  });

  it('GET /api/v1/alerts -> 200 & array with expected keys', () => {
    cy.request(`${API_URL}/api/v1/alerts`).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body).to.be.an('array');
      if (Array.isArray(body) && body.length) {
        const a = body[0];
        expect(a).to.include.keys('id', 'level', 'message', 'ts');
      }
    });
  });
});

describe('Smoke: UI', () => {
  it('UI root responds with 200', () => {
    cy.request(UI_URL).its('status').should('eq', 200);
  });

  it('UI renders page body', () => {
    cy.visit(UI_URL);
    cy.get('body').should('be.visible');
  });
});
