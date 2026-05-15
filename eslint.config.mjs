import baseConfig from '@opennota/config/eslint/base.mjs';

/**
 * Root ESLint config. Per-app and per-package configs live alongside their
 * code; this one covers loose root-level scripts and config files.
 */
export default [
  ...baseConfig,
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'apps/**',
      'packages/**',
    ],
  },
];
