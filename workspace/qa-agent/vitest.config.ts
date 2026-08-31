import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['src/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
});
