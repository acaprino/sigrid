// The toolkit's showcase: a page that renders every exported component in its variants, sizes and states, in light
// and dark and in several palettes. Development only: `npm run showcase` serves it, `npm run showcase:build` writes
// `showcase/dist/`. It is not part of the package (`files` publishes `dist` and `src` only) and it is not read by the
// package's own Tailwind build (`src/styles/entry.css` excludes this folder).
import { fileURLToPath } from 'node:url'
import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwind()],
  server: { port: 5180, host: '127.0.0.1' },
  preview: { port: 5181, host: '127.0.0.1' },
  // Three pages: the showcase, the app editor (`/builder.html`) and the page that runs the app it edits (`/run.html`).
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { index: fileURLToPath(new URL('./index.html', import.meta.url)), builder: fileURLToPath(new URL('./builder.html', import.meta.url)), run: fileURLToPath(new URL('./run.html', import.meta.url)) } } },
})
