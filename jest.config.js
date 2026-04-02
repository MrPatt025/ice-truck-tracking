module.exports = {
  projects: ['<rootDir>/backend/jest.config.js', '<rootDir>/dashboard/jest.config.js'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  passWithNoTests: true,
}
