// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    'dashboard/.next/**',
    'dashboard/out/**',
    '**/out/**',
    '**/*.min.js',
    '**/html/**',
    'backend/_legacy/**',
    'backend/src/_legacy/**',
    '**/__snapshots__/**',
    'backend/prisma/migrations/**',
    '**/generated/**',
    '**/next-env.d.ts',
    'frontend/frontend/.expo/**',
  ],
};

// JS base + Prettier
const baseJs = [ignores, js.configs.recommended, prettier];

// TS base (no type-check)
const tsBase = tseslint.configs.recommended.map((c) => ({
  ...c,
  files: ['**/*.ts', '**/*.tsx'],
}));

// Typed lint เฉพาะ backend production code
const typedBackend = tseslint.configs.recommendedTypeChecked.map((c) => ({
  ...c,
  files: ['backend/src/**/*.ts', 'backend/prisma/**/*.ts'],
  languageOptions: {
    ...c.languageOptions,
    parserOptions: {
      ...(c.languageOptions?.parserOptions ?? {}),
      project: ['./backend/tsconfig.eslint.json'],
      tsconfigRootDir: __dirname, // ต้องเป็นสตริง
    },
  },
  rules: {
    ...c.rules,
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],
  },
}));

// ทุก .js/.mjs เป็น ESM
const esmJs = {
  files: ['**/*.js', '**/*.mjs'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    globals: { ...globals.node, ...globals.browser, ...globals.es2022 },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};

// เฉพาะ .cjs เป็น CJS
const cjs = {
  files: ['**/*.cjs'],
  languageOptions: {
    sourceType: 'script',
    ecmaVersion: 'latest',
    globals: { ...globals.node, ...globals.es2022 },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};

// .d.ts
const dts = {
  files: ['**/*.d.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
  },
};

// ผ่อนกฎฝั่ง UI
const uiRelaxed = {
  files: [
    'dashboard/**/*.{ts,tsx}',
    'mobile-app/**/*.{ts,tsx}',
    'frontend/**/*.{ts,tsx}',
  ],
  languageOptions: { globals: { ...globals.browser } },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-unused-expressions': [
      'warn',
      { allowShortCircuit: true, allowTernary: true },
    ],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'prefer-const': 'warn',
  },
};

// Tests
const tests = [
  {
    files: ['backend/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['dashboard/src/cypress/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
    },
  },
];

// สคริปต์พิเศษ
const scriptsSpecial = {
  files: ['load-test.js', 'security-audit.js'],
  rules: {
    '@typescript-eslint/no-unused-expressions': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
};

export default [
  ...baseJs,
  ...tsBase,
  esmJs,
  cjs,
  ...typedBackend,
  dts,
  uiRelaxed,
  ...tests,
  scriptsSpecial,
];
