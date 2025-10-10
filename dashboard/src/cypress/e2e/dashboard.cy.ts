describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.intercept('GET', '/api/v1/health', { fixture: 'health.json' })
    cy.intercept('GET', '/api/v1/tracking/trucks', { fixture: 'trucks.json' })
  })

  it('should load dashboard successfully', () => {
    cy.get('[data-testid="dashboard-title"]').should(
      'contain',
      'Ice Truck Tracking'
    )
    cy.get('[data-testid="map-container"]').should('be.visible')
    cy.get('[data-testid="sidebar"]').should('be.visible')
  })

  it('should display trucks on map', () => {
    cy.get('[data-testid="truck-marker"]').should('have.length.at.least', 1)
    cy.get('[data-testid="truck-marker"]').first().click()
    cy.get('[data-testid="truck-popup"]').should('be.visible')
  })

  it('should handle map interactions', () => {
    // Test map style switching
    cy.get('[data-testid="map-style-selector"]').select('satellite')
    cy.get('[data-testid="map-container"]').should(
      'have.class',
      'satellite-style'
    )

    // Test clustering toggle
    cy.get('[data-testid="clustering-toggle"]').click()
    cy.get('[data-testid="truck-cluster"]').should('be.visible')

    // Test context menu
    cy.get('[data-testid="map-container"]').rightclick()
    cy.get('[data-testid="context-menu"]').should('be.visible')
    cy.get('[data-testid="context-menu-item"]').first().click()
  })

  it('should handle offline mode', () => {
    // Simulate offline
    cy.window().then(win => {
      cy.stub(win.navigator, 'onLine').value(false)
      win.dispatchEvent(new Event('offline'))
    })

    cy.get('[data-testid="offline-indicator"]').should('be.visible')
    cy.get('[data-testid="offline-indicator"]').should('contain', 'Offline')

    // Simulate back online
    cy.window().then(win => {
      cy.stub(win.navigator, 'onLine').value(true)
      win.dispatchEvent(new Event('online'))
    })

    cy.get('[data-testid="offline-indicator"]').should('not.exist')
  })

  it('should handle user preferences', () => {
    cy.get('[data-testid="preferences-button"]').click()
    cy.get('[data-testid="preferences-panel"]').should('be.visible')

    // Change language
    cy.get('[data-testid="language-th"]').click()
    cy.get('[data-testid="save-preferences"]').click()

    cy.get('[data-testid="dashboard-title"]').should('contain', 'à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”')

    // Change map style
    cy.get('[data-testid="preferences-button"]').click()
    cy.get('[data-testid="map-style-preference"]').select('dark')
    cy.get('[data-testid="save-preferences"]').click()

    cy.get('[data-testid="map-container"]').should('have.class', 'dark-style')
  })

  it('should handle errors gracefully', () => {
    // Simulate API error
    cy.intercept('GET', '/api/v1/tracking/trucks', { statusCode: 500 })
    cy.reload()

    cy.get('[data-testid="error-boundary"]').should('be.visible')
    cy.get('[data-testid="retry-button"]').click()

    // Mock successful retry
    cy.intercept('GET', '/api/v1/tracking/trucks', { fixture: 'trucks.json' })
    cy.get('[data-testid="truck-marker"]').should('be.visible')
  })

  it('should be accessible', () => {
    cy.injectAxe()
    cy.checkA11y()

    // Test keyboard navigation
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-testid', 'skip-to-content')

    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-testid', 'preferences-button')

    // Test focus trap in modal
    cy.get('[data-testid="preferences-button"]').click()
    cy.get('[data-testid="preferences-panel"]').should('be.visible')

    cy.get('body').tab()
    cy.focused().should('be.within', '[data-testid="preferences-panel"]')
  })

  it('should perform well', () => {
    // Lighthouse audit
    cy.lighthouse({
      performance: 85,
      accessibility: 95,
      'best-practices': 85,
      seo: 80,
    })

    // Check for performance metrics
    cy.window()
      .its('performance')
      .then(performance => {
        const navigation = performance.getEntriesByType('navigation')[0]
        expect(
          navigation.loadEventEnd - navigation.loadEventStart
        ).to.be.lessThan(3000)
      })
  })
})


