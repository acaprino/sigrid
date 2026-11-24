// The toolkit's showcase: a page that renders most exported components in their variants, sizes and states, in light
// and dark and in several palettes (some are shown nowhere yet: KeyHints, CommandsProvider, FileDrop and the
// look-settings controls DensityChoice, BaseColorChoice, PaletteComboChoice, ThemeCatalogChoice, ChoiceCards and
// ChoiceGroup). Development only: `npm run showcase` serves it, `npm run showcase:build` writes `showcase/dist/`. It
// is not part of the package (`files` in package.json publishes dist, src, tauri, bin, agents, docs,
// tools/zero-slop-design and the files at the root, never showcase/) and it is not read by the package's own Tailwind
// build (`src/styles/entry.css` excludes this folder).
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
