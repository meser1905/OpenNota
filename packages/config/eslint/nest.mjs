import baseConfig from './base.mjs';

/**
 * ESLint flat config for the NestJS backend.
 * Decorator-heavy code is already covered by the base TypeScript rules.
 */
export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
