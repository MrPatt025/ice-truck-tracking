// eslint.config.mjs
import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
    // ignore ทั้งโมโนรีโป
    { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.turbo/**', '**/coverage/**'] },

    // base recommended
    js.configs.recommended,
    ...ts.configs.recommended,

    // แปลง config แบบ eslintrc ของปลั๊กอินให้ใช้กับ flat ได้
    ...compat.extends('plugin:react/recommended'),
    ...compat.extends('plugin:react-hooks/recommended'),

    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: ts.parser,
            parserOptions: { tsconfigRootDir: process.cwd(), projectService: true },
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { react, 'react-hooks': reactHooks },
        settings: { react: { version: 'detect' } },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];
