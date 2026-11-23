// `docs/tokens.css`, every design token with its value, written from the source so it cannot fall behind it: the
// colours and the shape as the theme engine computes them for the gray baseline (`BASE_THEME`), in light and in dark;
// the measures of the three densities; every custom property `src/styles/theme.css` declares besides those; and the
// motion's durations, curves and distances. A reference for whoever reads the tokens (DESIGN.md, llms.txt), not a
// stylesheet the package loads. `node scripts/tokens.mjs` writes it; with `--check` it leaves it as it is and fails if
// it is not what it would write (test/tokens-doc.test.ts runs it so). Run it after a change to a token.
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/')
const check = process.argv.includes('--check')
const target = 'docs/tokens.css'

/** The source's values: the engine, the densities and the motion, bundled from the TypeScript sources. */
async function source() {
  const out = `${root}node_modules/.cache/sigrid-tokens/`
  mkdirSync(out, { recursive: true })
  await build({
    stdin: {
      contents: [
        "export { themeTokens } from './src/theme-engine'",
        "export { BASE_THEME } from './src/themes'",
        "export { DENSITIES, TOUCH_TARGET, densityVariables } from './src/density'",
        "export { DURATION_MS, FLUENT_CURVES, GESTURE_MS, PRESS_SCALE, TRAVEL_PX } from './src/internal/motion-impl'",
      ].join('\n'),
      resolveDir: root,
      loader: 'ts',
    },
    outfile: `${out}tokens.mjs`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    // The motion module imports React and Motion: they stay outside, only its constants are read.
    external: ['react', 'react/*', 'react-dom', 'react-dom/*', 'motion', 'motion/*'],
    jsx: 'automatic',
    logLevel: 'silent',
  })
  return import(`${pathToFileURL(`${out}tokens.mjs`).href}?${Date.now()}`)
}

/** `--name: value;` lines, each with its comment when there is one. */
const lines = (entries, indent, note = () => '') =>
  entries.map(([name, value]) => `${indent}${name}: ${value};${note(name) ? ` /* ${note(name)} */` : ''}`).join('\n')

/** What a colour token is for, where a word helps; the others say it with their name. */
const COLOR_NOTES = {
  paper: 'the page',
  'paper-2': 'lanes, headers, quiet fills, the segment track',
  'sidebar-paper': 'the sidebar',
  ink: 'text, at least 7:1 on every background',
  'ink-soft': 'secondary text, at least 4.5:1',
  'ink-mute': 'muted text, at least 4.5:1',
  line: 'decorative dividers, under 3:1 on purpose',
  accent: 'the accent as text and the focus ring: 4.5:1 on every background and on accent-soft',
  'accent-hover': 'the solid button under the pointer',
  'accent-soft': 'the accent tint',
  raised: 'sheets, cards, menus, popovers',
  drop: 'the colour of the shadows',
  primary: 'the fill of the one solid button',
  input: 'control borders, at least 3:1',
  ring: 'the focus ring: the accent as text',
  highlight: 'behind a match inside a text, with the ink on it',
  selected: 'the selection tint',
  spot: 'the theme\'s second colour as a fill; without one, the fill',
}

/**
 * The custom properties of a stylesheet, rule by rule, with the at-rules around each rule (except `@layer`, which only
 * orders them). `@keyframes` and `@property` are left out: they are animations, not tokens. A tiny reader, enough for
 * theme.css: comments are dropped, and no brace sits inside a string there.
 */
function declared(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  const stack = []
  let start = 0
  for (let at = 0; at < text.length; at++) {
    const ch = text[at]
    if (ch === '{') {
      stack.push(text.slice(start, at).trim().replace(/\s+/g, ' '))
      start = at + 1
    } else if (ch === '}') {
      const body = text.slice(start, at)
      const path = [...stack]
      stack.pop()
      start = at + 1
      if (path.some((p) => p.startsWith('@keyframes') || p.startsWith('@property'))) continue
      const decls = [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')])
      if (decls.length) rules.push({ path: path.filter((p) => !p.startsWith('@layer')), decls })
    } else if (ch === ';' && stack.length === 0) {
      start = at + 1
    }
  }
  return rules
}

/** A rule again as CSS, inside its at-rules. */
function ruleCss({ path, decls }) {
  let out = ''
  path.forEach((p, depth) => (out += `${'  '.repeat(depth)}${p} {\n`))
  out += `${lines(decls, '  '.repeat(path.length))}\n`
  for (let depth = path.length - 1; depth >= 0; depth--) out += `${'  '.repeat(depth)}}\n`
  return out
}

async function tokensCss() {
  const src = await source()
  const light = src.themeTokens(src.BASE_THEME, 'light')
  const dark = src.themeTokens(src.BASE_THEME, 'dark')
  const color = (tokens) => Object.entries(tokens.colors).map(([k, v]) => [`--color-${k}`, v])
  const colorNote = (name) => COLOR_NOTES[name.slice('--color-'.length)] ?? ''
  const darkShape = Object.entries(dark.shape).filter(([k, v]) => light.shape[k] !== v)
  const normal = src.densityVariables('normal')
  const others = src.DENSITIES.filter((d) => d.id !== 'normal')
  const densityNote = (name) => others.map((d) => `${d.id} ${src.densityVariables(d.id)[name]}`).join(', ')
  // What the engine writes is above: theme.css's first-paint copies of it are not repeated.
  const engine = new Set([...Object.keys(light.colors).map((k) => `--color-${k}`), ...Object.keys(light.shape)])
  const rules = declared(readFileSync(`${root}src/styles/theme.css`, 'utf8'))
    .map((rule) => ({ ...rule, decls: rule.decls.filter(([name]) => !engine.has(name)) }))
    .filter((rule) => rule.decls.length > 0)
  const ms = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}ms`).join(', ')
  const px = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}px`).join(', ')
  const curves = Object.entries(src.FLUENT_CURVES).map(([k, v]) => `${k} cubic-bezier(${v.join(', ')})`).join('; ')
  return `/*
 * @acaprino/sigrid: every design token with its value. Written from the source by scripts/tokens.mjs (do not edit it:
 * run \`node scripts/tokens.mjs\`; test/tokens-doc.test.ts fails when it is behind). A reference, not a stylesheet the
 * package loads: the live sources are src/styles/theme.css, src/theme-engine.ts, src/density.ts and
 * src/internal/motion-impl.tsx.
 * The colours are those of the gray baseline (\`BASE_THEME\`), the first paint of src/styles/theme.css. An app passes its
 * own themes: the engine computes every colour of them with the same rules, so the values differ while the names and
 * the guarantees (test/contrast.test.ts, test/theme-engine.test.ts) do not.
 */

/* ———— Colour, light: themeTokens(BASE_THEME, 'light').colors, written on the root by applyTheme ———— */
:root {
${lines(color(light), '  ', colorNote)}
}

/* ———— Colour, dark: themeTokens(BASE_THEME, 'dark').colors ———— */
@media (prefers-color-scheme: dark) {
  :root {
${lines(color(dark), '    ')}
  }
}

/* ———— Shape: themeTokens(BASE_THEME, …).shape, written on the root by applyTheme; in dark only what differs ———— */
:root {
${lines(Object.entries(light.shape), '  ')}
}
@media (prefers-color-scheme: dark) {
  :root {
${lines(darkShape, '    ')}
  }
}

/* ———— Density: densityVariables, written on the root by applyDensity; \`normal\` is the default ———— */
:root {
${lines(Object.entries(normal), '  ', densityNote)}
}

/* ———— Declared in src/styles/theme.css (Tailwind's \`@theme\`, the density and title bar tokens, the label colours,
   the layout and the heights) ———— */
${rules.map(ruleCss).join('')}
/* ———— Motion (src/internal/motion-impl.tsx; only with \`animated\`, never with prefers-reduced-motion) ————
   Curves: ${curves}.
   Durations: ${ms(src.DURATION_MS)}.
   Gestures: ${ms(src.GESTURE_MS)}.
   Travel: ${px(src.TRAVEL_PX)}.
   Pressed scale: ${src.PRESS_SCALE.tap}. Touch target: ${src.TOUCH_TARGET}px. */
`
}

const text = await tokensCss()
const now = existsSync(`${root}${target}`) ? readFileSync(`${root}${target}`, 'utf8').replace(/\r\n/g, '\n') : null
if (check) {
  if (now !== text) {
    console.error(`${target} is not what scripts/tokens.mjs would write. Run \`node scripts/tokens.mjs\`.`)
    process.exit(1)
  }
} else if (now !== text) {
  writeFileSync(`${root}${target}`, text)
  console.log(`tokens: ${target} written`)
} else {
  console.log(`tokens: ${target} is up to date`)
}
