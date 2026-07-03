import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests import { describe, it, expect } from 'vitest' explicitly, so no
    // global injection is needed. Keeps the domain package free of ambient types.
    globals: false,
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
