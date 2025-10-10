module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(.*/)?config/database$": "<rootDir>/tests/mocks/db.js",
  },
};
