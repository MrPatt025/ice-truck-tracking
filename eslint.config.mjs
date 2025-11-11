// eslint.config.mjs (root, Flat Config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

// Plugins
const require = createRequire(import.meta.url);
let storybookPlugin = null;
try {
  // Resolve lazily so workspaces that don't install Storybook don't break ESLint
  storybookPlugin = require('eslint-plugin-storybook');
} catch {
  // Storybook not installed in this environment — skip Storybook rules.
  storybookPlugin = null;
}
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tailwindcss from 'eslint-plugin-tailwindcss';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsPlugin = tseslint.plugin;

/* ----------------------------- Ignores ----------------------------- */
const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.next-build/**',
    'dashboard/.next/**',
    'dashboard/.next-build/**',
    // Storybook build output can contain bundled globals that trigger lint noise
    'dashboard/storybook-static/**',
    // Playwright HTML reports and artifacts
    'dashboard/playwright-report/**',
    'dashboard/test-results/**',
    // Public static assets (may include vendor JS)
    'dashboard/public/**',
    'dashboard/out/**',
    '**/out/**',
    '**/*.min.js',
    '**/html/**',
    'backend/_legacy/**',
    'backend/src/_legacy/**',
    '**/__snapshots__/**',
    'backend/prisma/migrations/**',
    '**/generated/**',
    '**/__generated__/**',
    '**/next-env.d.ts',
    'frontend/frontend/.expo/**',
  ],
};

/* ------------------------------ Base JS ---------------------------- */
/** Flat config: ห้ามสเปรด js.configs.recommended แล้วไปแก้ rules ตรง ๆ */
const baseJs = [ignores, js.configs.recommended];

/* --------------------------- Base TS (no type) --------------------- */
const tsBase = tseslint.configs.recommended.map((c) => ({
  ...c,
  files: ['**/*.ts', '**/*.tsx'],
  // รวม plugin เดิมของชุดคอนฟิก + ของเราเอง (อย่าทับ)
  plugins: {
    ...(c.plugins ?? {}),
    '@typescript-eslint': tsPlugin,
  },
}));

/* --------------------- Typed lint เฉพาะ backend ------------------- */
const typedBackend = tseslint.configs.recommendedTypeChecked.map((c) => ({
  ...c,
  files: ['backend/src/**/*.ts', 'backend/prisma/**/*.ts'],
  languageOptions: {
    ...c.languageOptions,
    parserOptions: {
      ...c.languageOptions?.parserOptions,
      project: ['./backend/tsconfig.eslint.json'],
      tsconfigRootDir: __dirname,
    },
    globals: {
      ...globals.node,
      ...globals.es2022,
    },
  },
  // รวม @typescript-eslint กลับเข้าไป แล้วค่อยเติมปลั๊กอินอื่น
  plugins: {
    ...(c.plugins ?? {}),
    '@typescript-eslint': tsPlugin,
    sonarjs,
    security,
    'unused-imports': unusedImports,
  },
  rules: {
    ...c.rules,
    // TS safety
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],

    // ใช้กฎ core สำหรับ promise reject
    'prefer-promise-reject-errors': ['error', { allowEmptyReject: false }],

    // Security / Code smells
    'sonarjs/no-all-duplicated-branches': 'warn',
    'sonarjs/no-collapsible-if': 'warn',
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-regexp': 'warn',

    // Hygiene
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
}));

/* --------------------------- JS/ MJS (ESM) ------------------------- */
const esmJs = {
  files: ['**/*.js', '**/*.mjs'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    globals: { ...globals.node, ...globals.browser, ...globals.es2022 },
  },
  // ผูก @typescript-eslint เพื่อให้คอมเมนต์เช่น
  // // eslint-disable-next-line @typescript-eslint/no-var-requires
  // ไม่ทำให้ ESLint บ่นว่า "Definition not found"
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
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

/* ------------------------------ CJS only --------------------------- */
const cjs = {
  files: ['**/*.cjs'],
  languageOptions: {
    sourceType: 'script',
    ecmaVersion: 'latest',
    globals: { ...globals.node, ...globals.es2022 },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
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

/* ------------------------------ .d.ts ------------------------------ */
const dts = {
  files: ['**/*.d.ts'],
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
  },
};

/* ------------------------------- UI side --------------------------- */
const uiDashboard = {
  files: ['dashboard/**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2022 },
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooks,
    'unused-imports': unusedImports,
    sonarjs,
    'jsx-a11y': jsxA11y,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility (jsx-a11y)
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/iframe-has-title': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/media-has-caption': 'warn',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
    'jsx-a11y/no-noninteractive-tabindex': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',

    // Import sorting
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',

    // UI ergonomics
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

    // ลดขยะ import
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    // Code smell (เบากว่า backend)
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/cognitive-complexity': ['warn', 20],
  },
};

const uiOtherUi = {
  files: ['mobile-app/**/*.{ts,tsx}', 'frontend/**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2022 },
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooks,
    'unused-imports': unusedImports,
    sonarjs,
    'jsx-a11y': jsxA11y,
    tailwindcss,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility (jsx-a11y)
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/iframe-has-title': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/media-has-caption': 'warn',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
    'jsx-a11y/no-noninteractive-tabindex': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',

    // Tailwind CSS
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/enforces-negative-arbitrary-values': 'warn',
    'tailwindcss/enforces-shorthand': 'warn',
    'tailwindcss/migration-from-tailwind-2': 'warn',
    'tailwindcss/no-arbitrary-value': 'off',
    'tailwindcss/no-contradicting-classname': 'error',
    'tailwindcss/no-custom-classname': 'off',

    // Import sorting
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',

    // UI ergonomics
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

    // ลดขยะ import
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    // Code smell (เบากว่า backend)
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/cognitive-complexity': ['warn', 20],
  },
};

/* -------------------------------- Tests ---------------------------- */
const tests = [
  {
    files: ['backend/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...(globals.vitest ?? {}) },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
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
    files: ['dashboard/e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Common Playwright test globals
        test: 'readonly',
        expect: 'readonly',
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
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
    files: ['dashboard/src/cypress/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...(globals.vitest ?? {}),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
    },
  },
];

/* --------------------------- Scripts (Node) ------------------------ */
const scriptsSpecial = {
  files: ['load-test.js', 'security-audit.js'],
  languageOptions: {
    globals: { ...globals.node, ...globals.es2022 },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    '@typescript-eslint/no-unused-expressions': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
};

/* --------------------------- Storybook (Flat) ---------------------- */
const storybookFlat = (() => {
  const raw = storybookPlugin?.configs?.['flat/recommended'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
})();

/* ------------------------ Linter global opts ----------------------- */
const linterTuning = {
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
};

export default [
  linterTuning,
  ...baseJs,
  ...tsBase,
  esmJs,
  cjs,
  ...typedBackend,
  dts,
  uiDashboard,
  uiOtherUi,
  // Temporary override: allow @ts-nocheck in a few heavy UI files while refactoring types
  {
    files: [
      'dashboard/src/components/charts/LazyCharts.tsx',
      'dashboard/src/components/dashboard/Fleet3DCanvas.tsx',
      'dashboard/src/components/dashboard/PerformanceCharts.tsx',
      // Temporary leniency while we reduce complexity in these large components
      'dashboard/src/app/dashboard/page.tsx',
      'dashboard/src/shared/lib/apiClient.ts',
      'dashboard/src/app/login/page.tsx',
    ],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      // Permit higher complexity thresholds temporarily
      'sonarjs/cognitive-complexity': 'off',
    },
  },
  ...tests,
  scriptsSpecial,
  ...storybookFlat,
  // วาง prettier เป็นตัวสุดท้ายเสมอ
  prettier,
];
