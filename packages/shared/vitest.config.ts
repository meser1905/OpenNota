import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for @opennota/shared.
 *
 * The package is plain TypeScript with no decorators, so the default esbuild
 * transform is sufficient — no SWC plugin is needed here.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
