// lint-staged.config.js
module.exports = {
  concurrent: false,
  '**/*.{js,jsx,ts,tsx}': ['eslint --fix --cache --cache-location .eslintcache'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '**/*.{css,scss,less}': ['prettier --write'],
};
