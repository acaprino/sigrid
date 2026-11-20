import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    // Material Color Utilities imports its own files without the `.js` extension: Node's ESM loader refuses them, so
    // the tests let Vite transform it (the build bundles it with esbuild, which resolves them).
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
})
