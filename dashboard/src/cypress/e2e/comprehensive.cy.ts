// /cypress/e2e/comprehensive.cy.ts (Final Polished Version)
describe('Ice Truck Tracking Dashboard - Comprehensive E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-testid="dashboard-title"]', { timeout: 10000 }).should(
      'be.visible',
    );
  });

  context('Health and Connectivity', () => {
    it('should load the dashboard successfully', () => {
      cy.get('[data-testid="metrics-grid"]').should('be.visible');
    });

    it('should display connection status', () => {
      // **FIXED:** Increased timeout and check for the correct final state text.
      // This waits up to 15 seconds for the health check to complete and the UI to update.
      cy.get('[data-testid="connection-status"]', { timeout: 15000 })
        .should('contain', 'API Online')
        .and('not.contain', 'API Offline');
    });

    it('should handle API health check', () => {
      cy.get('[data-testid="active-trucks"]', { timeout: 10000 }).should(
        'not.contain',
        '...',
      );
    });
  });

  context('Dashboard Components', () => {
    it('should display sidebar navigation', () => {
      cy.get('[data-testid="sidebar"]')
        .should('be.visible')
        .and('contain', 'Dashboard');
    });

    it('should display analytics dashboard', () => {
      cy.get('[data-testid="analytics-dashboard"]').should('be.visible');
    });

    it('should show real-time metrics', () => {
      cy.get('[data-testid="active-trucks"]', { timeout: 10000 })
        .invoke('text')
        .should('match', /^\d+$/);
      cy.get('[data-testid="avg-cargo-temp"]', { timeout: 10000 })
        .invoke('text')
        .should('include', '°C');
    });
  });

  context('Real-time Map Functionality', () => {
    it('should display the map component', () => {
      cy.get('[data-testid="map-container"]').should('be.visible');
      cy.get('.maplibregl-canvas', { timeout: 15000 }).should('be.visible');
    });
  });
});
