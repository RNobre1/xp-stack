import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/**/*_test.sh', 'node_modules/**'],
    globals: false,
    environment: 'node',
    testTimeout: 10000,
  },
});
