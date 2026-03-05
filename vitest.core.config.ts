import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'packages',
    environment: 'node',
    include: ['packages/*/src/**/*.{test,spec}.ts', 'providers/*/src/**/*.{test,spec}.ts'],
  },
});
