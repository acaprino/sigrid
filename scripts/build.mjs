import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const run = (script, args) => execFileSync(process.execPath, [`${root}node_modules/${script}`, ...args], { cwd: root, stdio: 'inherit' })

rmSync(`${root}dist`, { recursive: true, force: true })
mkdirSync(`${root}dist/fonts`, { recursive: true })

// Base UI imports `use-sync-external-store/shim` and `/shim/with-selector`, which are CommonJS with `require("react")`:
// in the bundle they would become `__require("react")`, resolved at runtime from the `dist` folder and not from the app (two Reacts,
// the first hook fails). They are replaced with ESM modules that import `react` like the rest of the package: the shim
// is React's `useSyncExternalStore` (18 and 19 have it), the selector is in `scripts/shims/`.
const syncExternalStore = {
  name: 'use-sync-external-store-esm',
  setup(b) {
    b.onResolve({ filter: /^use-sync-external-store\/shim(\/index(\.js)?)?$/ }, () => ({ path: 'shim', namespace: 'uses-esm' }))
    b.onLoad({ filter: /^shim$/, namespace: 'uses-esm' }, () => ({
      contents: "export { useSyncExternalStore } from 'react'",
      loader: 'js',
      resolveDir: root,
    }))
    b.onResolve({ filter: /^use-sync-external-store\/shim\/with-selector(\.js)?$/ }, () => ({
      path: `${root}scripts/shims/use-sync-external-store-with-selector.js`,
    }))
  },
}

await build({
  plugins: [syncExternalStore],
  // The main entry, and one for each part that rests on a library an app may not need (a table, a long list, a
  // list put in order by dragging, formatted text, a graph): what they share with the main entry is in common chunks.
  entryPoints: ['index', 'table', 'virtual', 'reorder', 'rich-text', 'graph'].map((entry) => `${root}src/${entry}.ts`),
  // `splitting`: Motion (src/internal/motion-impl.tsx) stays in a separate chunk, loaded only with animations on.
  outdir: `${root}dist`,
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  logLevel: 'warning',
})

// The stylesheet of the graph canvas, with React Flow's own layout rules inside it: one file for an app to import.
await build({ entryPoints: [`${root}src/styles/graph.css`], outfile: `${root}dist/graph.css`, bundle: true, logLevel: 'warning' })

run('typescript/bin/tsc', ['-p', 'tsconfig.json'])
run('@tailwindcss/cli/dist/index.mjs', ['-i', 'src/styles/entry.css', '-o', 'dist/styles.css'])

for (const f of readdirSync(`${root}src/styles/fonts`)) cpSync(`${root}src/styles/fonts/${f}`, `${root}dist/fonts/${f}`)
console.log('@acaprino/sigrid: dist/index.js and its five entries (table, virtual, reorder, rich-text, graph), their .d.ts, dist/styles.css, dist/graph.css, dist/fonts/')
