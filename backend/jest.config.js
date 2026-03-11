module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(.*/)?config/database$": "<rootDir>/tests/mocks/db.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    String.raw`database\.testcontainers\.test\.js`,
  ],
};
