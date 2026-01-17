import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', '!packages/*/src/**/*.test.ts'],
      exclude: ['node_modules/', 'dist/'],
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@mynexthome/core': path.resolve(__dirname, './packages/core/src'),
      '@mynexthome/integrations': path.resolve(__dirname, './packages/integrations/src'),
    },
  },
});
