// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';

export default [
    // Global ignores
    {
        ignores: [
            'node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            'pnpm-lock.yaml',
            'eslint.config.*',
            'lint-staged.config.*',
            '**/*.config.{js,cjs,mjs,ts}',
            'backend/database/**',
            '**/next-env.d.ts',
            'lint-result.json',
            'lint-output.*',
        ],
    },

    // Explicit Next.js scope for dashboard app (prevents plugin detection warnings)
    {
        files: ['dashboard/**/*.{js,jsx,ts,tsx}'],
        plugins: {
            '@next/next': nextPlugin,
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
        },
    },

    // Base recommended configs
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // Main config for all JS/TS files
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: tseslint.parser,
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooks,
            '@next/next': nextPlugin,
        },
        settings: {
            react: { version: '18.3' },
            next: {
                rootDir: ['dashboard/'],
            },
        },
        rules: {
            // React
            ...reactPlugin.configs.recommended.rules,
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
            'react/react-in-jsx-scope': 'off',
            'react/display-name': 'off',
            'react/no-unknown-property': ['error', { ignore: ['jsx', 'global'] }],

            // React Hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript overrides
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/triple-slash-reference': 'off',

            // General
            'no-empty': 'warn',
        },
    },

    // Test file overrides — allow Jest globals
    {
        files: [
            '**/*.test.{js,ts,jsx,tsx}',
            '**/*.spec.{js,ts,jsx,tsx}',
            '**/tests/**/*.{js,ts,jsx,tsx}',
            '**/jest.setup*.{js,ts}',
            '**/__tests__/**/*.{js,ts,jsx,tsx}',
            '**/cypress/**/*.{js,ts,jsx,tsx}',
        ],
        languageOptions: {
            globals: {
                ...globals.jest,
                cy: 'readonly',
                Cypress: 'readonly',
            },
        },
    },
];
