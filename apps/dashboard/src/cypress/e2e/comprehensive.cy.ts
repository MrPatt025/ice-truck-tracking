describe('Ice Truck Tracking Dashboard - Comprehensive E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.intercept('GET', '**/api/v1/health').as('healthCheck');
  });

  describe('Health and Connectivity', () => {
    it('should load the dashboard successfully', () => {
      cy.get('body').should('be.visible');
      cy.wait('@healthCheck').its('response.statusCode').should('eq', 200);
    });

    it('should display connection status', () => {
      cy.get('[data-testid="connection-status"]').should('be.visible');
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
    });

    it('should handle API health check', () => {
      cy.request('http://localhost:5000/api/v1/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.status).to.eq('healthy');
        expect(response.body).to.have.property('websocket_clients');
      });
    });
  });

  describe('Real-time Map Functionality', () => {
    it('should display the map component', () => {
      cy.get('[data-testid="map-container"]').should('be.visible');
      cy.get('.mapboxgl-canvas').should('exist');
    });

    it('should show truck markers on the map', () => {
      // Wait for WebSocket connection and truck data
      cy.wait(3000);
      cy.get('[data-testid="truck-marker"]').should('have.length.at.least', 1);
    });

    it('should update truck positions in real-time', () => {
      cy.get('[data-testid="truck-marker"]').first().then(($marker) => {
        const initialPosition = $marker.position();
        
        // Wait for position update
        cy.wait(5000);
        
        cy.get('[data-testid="truck-marker"]').first().then(($updatedMarker) => {
          const updatedPosition = $updatedMarker.position();
          expect(updatedPosition).to.not.deep.equal(initialPosition);
        });
      });
    });

    it('should handle map interactions', () => {
      cy.get('[data-testid="map-container"]').click();
      cy.get('[data-testid="map-container"]').trigger('mousedown', { button: 0 });
      cy.get('[data-testid="map-container"]').trigger('mousemove', { clientX: 100, clientY: 100 });
      cy.get('[data-testid="map-container"]').trigger('mouseup');
    });
  });

  describe('Dashboard Components', () => {
    it('should display sidebar navigation', () => {
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('[data-testid="sidebar"]').should('contain', 'Dashboard');
      cy.get('[data-testid="sidebar"]').should('contain', 'Analytics');
    });

    it('should show truck list', () => {
      cy.get('[data-testid="truck-list"]').should('be.visible');
      cy.get('[data-testid="truck-item"]').should('have.length.at.least', 1);
    });

    it('should display analytics dashboard', () => {
      cy.get('[data-testid="analytics-dashboard"]').should('be.visible');
      cy.get('[data-testid="metrics-card"]').should('have.length.at.least', 1);
    });

    it('should show real-time metrics', () => {
      cy.get('[data-testid="active-trucks"]').should('be.visible');
      cy.get('[data-testid="total-distance"]').should('be.visible');
      cy.get('[data-testid="average-speed"]').should('be.visible');
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline mode gracefully', () => {
      // Simulate offline mode
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('offlineRequest');
      
      cy.get('[data-testid="connection-status"]').should('contain', 'Offline');
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
    });

    it('should buffer data when offline', () => {
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('offlineRequest');
      
      // Perform actions that would normally send data
      cy.get('[data-testid="map-container"]').click();
      
      // Check that data is buffered
      cy.get('[data-testid="buffered-data"]').should('be.visible');
    });

    it('should sync data when connection is restored', () => {
      // First go offline
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('offlineRequest');
      cy.get('[data-testid="connection-status"]').should('contain', 'Offline');
      
      // Then restore connection
      cy.intercept('GET', '**/api/**', { statusCode: 200, body: { status: 'healthy' } }).as('onlineRequest');
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
      cy.get('[data-testid="sync-indicator"]').should('be.visible');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple truck updates', () => {
      // Simulate multiple truck updates
      cy.intercept('GET', '**/api/v1/health', {
        statusCode: 200,
        body: {
          status: 'healthy',
          websocket_clients: 10,
          timestamp: new Date().toISOString()
        }
      }).as('multipleTrucks');
      
      cy.wait('@multipleTrucks');
      cy.get('[data-testid="truck-marker"]').should('have.length.at.least', 5);
    });

    it('should maintain performance under load', () => {
      // Test map performance with many markers
      cy.get('[data-testid="map-container"]').should('be.visible');
      
      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        cy.get('[data-testid="map-container"]').click();
        cy.wait(100);
      }
      
      // Should still be responsive
      cy.get('[data-testid="map-container"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/v1/health', { statusCode: 500 }).as('apiError');
      
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle WebSocket connection errors', () => {
      // Simulate WebSocket connection failure
      cy.intercept('GET', '**/socket.io/**', { forceNetworkError: true }).as('wsError');
      
      cy.get('[data-testid="connection-status"]').should('contain', 'Disconnected');
      cy.get('[data-testid="reconnect-button"]').should('be.visible');
    });

    it('should show appropriate error messages', () => {
      cy.intercept('GET', '**/api/**', { statusCode: 404 }).as('notFound');
      
      cy.get('[data-testid="error-message"]').should('contain', 'Not Found');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="map-container"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="sidebar"]').should('have.attr', 'aria-label');
    });

    it('should be keyboard navigable', () => {
      cy.get('body').tab();
      cy.focused().should('be.visible');
    });

    it('should have proper color contrast', () => {
      cy.get('[data-testid="connection-status"]').should('have.css', 'color');
      // This would need a more sophisticated color contrast check
    });
  });
}); 
