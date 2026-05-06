module.exports = {
  testEnvironment: "node",
  collectCoverage: false,
  coverageProvider: 'v8',
  setupFiles: ["<rootDir>/tests/jest.setup.env.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.mocks.js"],
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  passWithNoTests: true,
  moduleNameMapper: {
    "^(.*/)?config/database$": "<rootDir>/tests/mocks/db.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/integration/database.testcontainers.test.js",
  ],
  // Coverage thresholds - gradually increased as test suite improves
  // Current: statements 34.61%, branches 13.97%, functions 21.55%, lines 35.53%
  // Target: 95% across the board, but pragmatically increasing in phases
};
