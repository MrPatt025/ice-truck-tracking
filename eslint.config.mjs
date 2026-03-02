// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
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
        ],
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
        },
        settings: { react: { version: 'detect' } },
        rules: {
            // React
            ...reactPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',

            // React Hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript overrides
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
