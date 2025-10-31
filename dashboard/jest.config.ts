module.exports = {
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: { react: { runtime: 'automatic', development: true } },
          target: 'es2022',
        },
      },
    ],
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../src/$1',
  },
  collectCoverageFrom: [
    'src/ui/utils/**/*.{ts,tsx}',
    'src/shared/utils/**/*.{ts,tsx}',
    'src/types/truck.ts',
  ],
  coverageThreshold: {
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
    './src/ui/utils/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/shared/utils/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/types/truck.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
