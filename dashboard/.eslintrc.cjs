module.exports = {
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
  parserOptions: { project: './tsconfig.json' },
  rules: {
    'react-native/no-raw-text': 'off',
  },
};
