// @vitest-environment node
// The first paint (before the script puts the choice on the root) uses the two blocks of `theme.css`: the `@theme`
// block is the gray baseline (`BASE_THEME`) in light, the `prefers-color-scheme: dark` one in dark; an app paints its own default over them. They must be exactly what
// the engine computes, or the page would change color as soon as it opens. With `UPDATE_THEME_CSS=1` the test
// rewrites them, then it must be run again without it.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { themeTokens } from '../src/theme-engine'
import { BASE_THEME } from '../src/themes'
import { palettes } from './theme-tokens'

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/theme.css')
const light = themeTokens(BASE_THEME, 'light').colors
const dark = themeTokens(BASE_THEME, 'dark').colors

/** Rewrites the `--color-*` of a block: changes the values that are there and adds the missing ones before the closing brace. */
function rewrite(css: string, start: number, end: number, tokens: Record<string, string>, indent: string): string {
  let block = css.slice(start, end)
  for (const [k, v] of Object.entries(tokens)) {
    const re = new RegExp(`(--color-${k}\\s*:\\s*)#[0-9a-fA-F]{6}(\\s*;)`)
    if (re.test(block)) block = block.replace(re, `$1${v}$2`)
    else block = block.replace(/\n(\s*)$/, `\n${indent}--color-${k}: ${v};\n$1`)
  }
  return css.slice(0, start) + block + css.slice(end)
}

if (process.env['UPDATE_THEME_CSS']) {
  let css = readFileSync(file, 'utf8')
  // The dark block first: rewriting it does not move the light block, which comes before it.
  const media = css.indexOf('@media (prefers-color-scheme: dark)')
  const darkOpen = css.indexOf('{', css.indexOf(':host', media))
  css = rewrite(css, darkOpen + 1, css.indexOf('\n    }', darkOpen) + 1, dark, '      ')
  const themeOpen = css.indexOf('{', css.indexOf('@theme'))
  css = rewrite(css, themeOpen + 1, css.indexOf('\n}', themeOpen) + 1, light, '  ')
  writeFileSync(file, css)
}

test('the @theme block is the gray baseline in light, as the engine computes it', () => {
  const css = palettes(readFileSync(file, 'utf8'))
  expect(css.light).toEqual(light)
})

test('the block for the dark system is the gray baseline in dark, as the engine computes it', () => {
  const css = palettes(readFileSync(file, 'utf8'))
  expect(css.dark).toEqual(dark)
})
