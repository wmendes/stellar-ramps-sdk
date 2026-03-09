import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@stellar-ramps/testing': resolve(__dirname, 'packages/testing/src/index.ts'),
      '@stellar-ramps/core': resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  test: {
    name: 'packages',
    environment: 'node',
    include: ['packages/*/src/**/*.{test,spec}.ts', 'providers/*/src/**/*.{test,spec}.ts'],
  },
});
