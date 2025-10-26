module.exports = {
  testMatch: ['<rootDir>/tests/unit/**/*.test.(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: { '^.+\\.(t|j)sx?$': ['@swc/jest'] },
  testEnvironment: 'jsdom',
};
