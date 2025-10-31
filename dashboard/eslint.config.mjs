// Dashboard-local ESLint Flat Config
// Purpose: keep UI linting lightweight and avoid typed-lint parserOptions.project issues during Next.js builds.
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';

const tsPlugin = tseslint.plugin;

const ignores = {
  ignores: [
    '.next/**',
    'dist/**',
    'coverage/**',
    'storybook-static/**',
    'playwright-report/**',
    'test-results/**',
    'public/**',
    // Generated types
    'src/types/api/**',
  ],
};

const baseTsUi = {
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tseslint.parser,
    globals: { ...globals.browser, ...globals.es2022 },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooks,
    'jsx-a11y': jsxA11y,
    'next': nextPlugin,
  },
  rules: {
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility - strict enforcement per jsx-a11y/recommended + custom rules
    ...jsxA11y.configs.recommended.rules,
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/no-static-element-interactions': 'error', // Upgraded to error
    'jsx-a11y/click-events-have-key-events': 'error', // Upgraded to error
    'jsx-a11y/no-noninteractive-element-interactions': 'off', // Allow role="group" divs
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/no-redundant-roles': 'warn',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/iframe-has-title': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',

    // Keep UI ergonomic and fast to iterate
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
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Discourage console.log in production
  },
};

const baseJs = {
  files: ['**/*.js', '**/*.mjs'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2022 },
  },
  rules: {
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
};

const tests = [
  {
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        test: 'readonly',
        expect: 'readonly',
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/cypress/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-console': 'off', // Allow console in tests
    },
  },
];

export default [
  ignores,
  baseJs,
  baseTsUi,
  ...tests,
  // Always place prettier last
  prettier,
];
