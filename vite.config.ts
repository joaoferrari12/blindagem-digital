import { defineConfig } from 'vitest/config';

// Served from https://joaoferrari12.github.io/blindagem-digital/ by GitHub Pages.
// `npm run dev` and `vite preview` use the same base so hash links behave the same.
export default defineConfig({
  base: '/blindagem-digital/',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
