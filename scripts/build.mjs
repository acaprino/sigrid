import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
    b.onResolve({ filter: /^use-sync-external-store(?:\/shim)?\/with-selector(\.js)?$/ }, () => ({
      path: `${root}scripts/shims/use-sync-external-store-with-selector.js`,
    }))
  },
}

// Recharts pulls three tiny CommonJS dependencies (`decimal.js-light`, `eventemitter3`, `react-is`): resolve them to
// their ESM files / shim so `dist/chart.js` and every shared chunk stay pure browser ESM (test/build.test.ts).
const chartDepsEsm = {
  name: 'chart-deps-esm',
  setup(b) {
    b.onResolve({ filter: /^decimal\.js-light$/ }, () => ({ path: `${root}node_modules/decimal.js-light/decimal.mjs` }))
    b.onResolve({ filter: /^react-is$/ }, () => ({ path: `${root}scripts/shims/react-is.js` }))
    b.onResolve({ filter: /^eventemitter3$/ }, () => ({ path: 'eventemitter3', namespace: 'ee3-esm' }))
    b.onLoad({ filter: /.*/, namespace: 'ee3-esm' }, () => {
      const src = readFileSync(`${root}node_modules/eventemitter3/index.js`, 'utf8').replace(
        /if\s*\(\s*['"]undefined['"]\s*!==\s*typeof module\s*\)\s*\{\s*module\.exports\s*=\s*EventEmitter;\s*\}/,
        'export { EventEmitter }; export default EventEmitter;',
      )
      return { contents: src, loader: 'js', resolveDir: `${root}node_modules/eventemitter3` }
    })
  },
}

// React Flow imports `react-compiler-runtime`, CommonJS with `require("react")`: inlined, it became `__require("react")`,
// which a browser ES module (Vite's dev server) cannot run. It is React's own `react/compiler-runtime` (React 19),
// left to the app like `react` itself.
const compilerRuntime = {
  name: 'react-compiler-runtime-external',
  setup(b) {
    b.onResolve({ filter: /^react-compiler-runtime$/ }, () => ({ path: 'react/compiler-runtime', external: true }))
  },
}

// A library's own stylesheet that a part puts in the page by itself (xterm's): `import css from 'library/file.css?inline'`
// is the text of the file, as it is in Vite. The part brings it with its code, so the app imports no CSS for it.
const inlineCss = {
  name: 'inline-css',
  setup(b) {
    b.onResolve({ filter: /\.css\?inline$/ }, async (args) => {
      const found = await b.resolve(args.path.replace(/\?inline$/, ''), { resolveDir: args.resolveDir, kind: args.kind })
      return found.errors.length ? { errors: found.errors } : { path: found.path, namespace: 'css-text' }
    })
    b.onLoad({ filter: /.*/, namespace: 'css-text' }, (args) => ({ contents: readFileSync(args.path, 'utf8'), loader: 'text' }))
  },
}

await build({
  plugins: [syncExternalStore, chartDepsEsm, compilerRuntime, inlineCss],
  // The main entry (the ground: themes, words, helpers), one for each level that draws (primitives, components, the
  // frame, assemblies), and one for each assembly that rests on a library an app may not need (a table, a long list, a
  // list put in order by dragging, formatted text, a graph): what they share is in common chunks.
  // The Tauri entry's source is outside `src/` (the toolkit knows no shell): the entries are named, so each one is
  // `dist/<name>.js` wherever its source is.
  entryPoints: {
    ...Object.fromEntries(['index', 'primitives', 'components', 'layout', 'assemblies', 'table', 'virtual', 'reorder', 'rich-text', 'graph', 'terminal', 'code', 'chart'].map((entry) => [entry, `${root}src/${entry}.ts`])),
    tauri: `${root}tauri/index.ts`,
  },
  // `splitting`: Motion (src/internal/motion-impl.tsx) stays in a separate chunk, loaded only with animations on.
  outdir: `${root}dist`,
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  // Tauri's API is the app's (an optional peer): the Tauri entry imports it with `import()`, which stays as it is.
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/compiler-runtime', 'react-dom/client', '@tauri-apps/api', '@tauri-apps/api/*'],
  logLevel: 'warning',
})

// The stylesheet of the graph canvas, with React Flow's own layout rules inside it: one file for an app to import.
await build({ entryPoints: [`${root}src/styles/graph.css`], outfile: `${root}dist/graph.css`, bundle: true, logLevel: 'warning' })

run('typescript/bin/tsc', ['-p', 'tsconfig.json'])
// The Tauri entry's declarations go to `dist/tauri/` (its own root, so they do not land on the toolkit's), and
// `dist/tauri.d.ts` is the door to them, beside `dist/tauri.js`.
run('typescript/bin/tsc', ['-p', 'tsconfig.tauri.json'])
writeFileSync(`${root}dist/tauri.d.ts`, "export * from './tauri/index'\n")
run('@tailwindcss/cli/dist/index.mjs', ['-i', 'src/styles/entry.css', '-o', 'dist/styles.css'])

for (const f of readdirSync(`${root}src/styles/fonts`)) cpSync(`${root}src/styles/fonts/${f}`, `${root}dist/fonts/${f}`)
console.log('@acaprino/sigrid: dist/index.js and its thirteen entries (primitives, components, layout, assemblies, table, virtual, reorder, rich-text, graph, terminal, code, chart, tauri), their .d.ts, dist/styles.css, dist/graph.css, dist/fonts/')
