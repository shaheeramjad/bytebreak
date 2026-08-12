import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'games/**/src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
