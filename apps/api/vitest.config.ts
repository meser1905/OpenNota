import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the NestJS API.
 *
 * NestJS relies on `emitDecoratorMetadata`, which the default esbuild
 * transform Vitest uses does not emit. The `unplugin-swc` plugin compiles the
 * test files (and the source under test) with SWC instead, so decorator
 * metadata survives and `@Injectable()` services can be constructed.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    // Integration specs spin up real Prisma clients against temp databases;
    // keeping them serial avoids cross-suite SQLite file contention.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/*.module.ts'],
    },
  },
  plugins: [
    // `as` cast: the plugin's type ships against a slightly different Vite
    // version than Vitest's bundled one; the runtime contract is identical.
    swc.vite({ module: { type: 'es6' } }) as never,
  ],
});
