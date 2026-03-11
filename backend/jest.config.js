module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(.*/)?config/database$": "<rootDir>/tests/mocks/db.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "database\\.testcontainers\\.test\\.js",
  ],
};
