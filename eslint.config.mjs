// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
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

    // base recommended
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactPlugin.configs.recommended,
    { plugins: { 'react-hooks': reactHooks }, rules: { ...reactHooks.configs.recommended.rules } },

    // แปลง config แบบ eslintrc ของปลั๊กอินให้ใช้กับ flat ได้
    ...compat.extends('plugin:react/recommended'),
    ...compat.extends('plugin:react-hooks/recommended'),

    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: tseslint.parser,
            parserOptions: { tsconfigRootDir: process.cwd(), projectService: true },
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { react: reactPlugin, 'react-hooks': reactHooks },
        settings: { react: { version: 'detect' } },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];
