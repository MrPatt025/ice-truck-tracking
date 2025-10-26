/** @type {import('orval').Config} */
module.exports = {
  iceTruck: {
    input: '../backend/openapi.json',
    output: {
      target: 'src/features/__generated__',
      client: 'axios',
      clean: true,
      mode: 'tags-split',
      prettier: true,
      // Use our axios instance with interceptors
      override: {
        mutator: {
          path: './src/shared/lib/orvalMutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
};
