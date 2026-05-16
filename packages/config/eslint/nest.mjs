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
      // NestJS reads constructor parameter types at runtime via
      // `emitDecoratorMetadata`, so injected classes must be value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
