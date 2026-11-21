// The color tokens of `theme.css`, split by palette: the light one is the `@theme` block, the dark one is the block
// `@media (prefers-color-scheme: dark)` that redefines them. Without this split an expression over the whole file
// would pick up the values of the last palette written, that is the dark one.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { THEMES, themeTokens } from './fixtures/sample-themes'

// From a string, not from `new URL`: in the jsdom environment `URL` is jsdom's and `fileURLToPath` rejects it.
export const themeCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/theme.css'), 'utf8')

const DARK_MARKER = '@media (prefers-color-scheme: dark)'

/** The `--color-*: #rrggbb` tokens of a piece of CSS, without comments. */
export function colorTokens(css: string): Record<string, string> {
  const block = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]!] = m[2]!.toLowerCase()
  return out
}

/** The two system palettes: `light` (the `@theme` block) and `dark` (the block for `prefers-color-scheme: dark`). */
export function palettes(css: string = themeCss): { light: Record<string, string>; dark: Record<string, string> } {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const at = clean.indexOf(DARK_MARKER)
  if (at < 0) throw new Error(`theme.css has no ${DARK_MARKER} block`)
  // The dark block ends where the next layer begins (the label colors).
  const next = clean.indexOf('@layer', at)
  return { light: colorTokens(clean.slice(0, at)), dark: colorTokens(clean.slice(at, next < 0 ? undefined : next)) }
}

/** The colors of every theme in light and in dark, computed by the engine, keyed by `theme×scheme`. */
export function themePalettes(): Record<string, Record<string, string>> {
  return Object.fromEntries(THEMES.flatMap((t) => (['light', 'dark'] as const).map((scheme) => [`${t.id}×${scheme}`, { ...themeTokens(t.id, scheme).colors }])))
}
