module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/jest.setup.env.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.mocks.js"],
  moduleNameMapper: {
    "^(.*/)?config/database$": "<rootDir>/tests/mocks/db.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/integration/database.testcontainers.test.js",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "!src/**/*.d.ts",
    "!**/node_modules/**",
  ],
  // Coverage thresholds - gradually increased as test suite improves
  // Current: statements 34.61%, branches 13.97%, functions 21.55%, lines 35.53%
  // Target: 95% across the board, but pragmatically increasing in phases
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 20,
      lines: 30,
      statements: 30,
    },
  },
};
