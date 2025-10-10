// lint-staged.config.js
module.exports = {
  'backend/**/*.{js,jsx,ts,tsx}': ['eslint --fix --cache --cache-location .eslintcache'],
  'dashboard/**/*.{js,jsx,ts,tsx}': ['eslint --fix --cache --cache-location .eslintcache'],
  'mobile-app/**/*.{js,jsx,ts,tsx}': ['eslint --fix --cache --cache-location .eslintcache'],
  'sdk/**/*.{js,jsx,ts,tsx}': ['eslint --fix --cache --cache-location .eslintcache'],

  '*.{json,md,yml,yaml}': ['prettier --write'],
  '**/*.{css,scss,less}': ['prettier --write'],
};
