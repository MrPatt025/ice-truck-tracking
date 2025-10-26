// stryker.conf.js
/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
module.exports = {
  // Target only real source files in this monorepo
  mutate: [
    'backend/src/**/*.{ts,js}',
    'dashboard/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/*.{spec,test}.{ts,tsx,js,jsx}',
    '!**/__tests__/**',
  ],

  testRunner: 'jest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'off', // let Jest handle coverage; mutation runs stay fast

  // Tighter quality bar for a portfolio-grade project
  thresholds: { high: 90, low: 80, break: 70 },

  // Keep runs stable on slower machines/CI
  timeoutMS: 60_000,
  maxConcurrentTestRunners: 4,
  concurrency: 4,
  cleanTempDir: true,
  tempDirName: 'node_modules/.stryker-tmp',

  // Jest runner config (expects a root jest.config.js that wires workspace projects)
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
  },

  // TypeScript semantic checks during mutation
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // Helpful in pnpm workspaces
  symlinkNodeModules: true,
};
