describe('Ice Truck Dashboard', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads the dashboard successfully', () => {
    cy.contains('Ice Truck Tracking').should('be.visible')
    cy.get('[data-testid="map-container"]').should('exist')
  })

  it('displays truck status indicators', () => {
    cy.contains('Active').should('be.visible')
    cy.contains('Inactive').should('be.visible')
  })

  it('shows connection status', () => {
    cy.contains(/Connected|Disconnected/).should('be.visible')
  })

  it('can toggle dark mode', () => {
    cy.get('[data-testid="theme-toggle"]').click()
    cy.get('html').should('have.class', 'dark')
  })

  it('displays geofence legend', () => {
    cy.contains('Allowed Zones').should('be.visible')
    cy.contains('Restricted Zones').should('be.visible')
  })
})