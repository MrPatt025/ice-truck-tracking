/**
 * @file app.test.tsx
 * @description Minimal test file to prevent Jest watcher from crashing with "No tests found"
 * This ensures Jest can successfully monitor the dashboard for changes during development.
 */

describe('App Setup', () => {
  it('should pass basic sanity check', () => {
    expect(true).toBe(true)
  })

  it('should load without errors', () => {
    expect(() => {
      // Minimal validation of test infrastructure
    }).not.toThrow()
  })
})
