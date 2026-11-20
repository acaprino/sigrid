// With Windows forced colors the focus ring (`focus-visible:ring-*`, a shadow) disappears and `outline-none`
// removes the outline: without a rule that beats the utilities, whoever navigates by keyboard cannot see where they are.
import { expect, test } from 'vitest'
import { themeCss } from './theme-tokens'

const HEAD = '@media (forced-colors: active)'

/** The text of `theme.css` outside every `@layer`: only there does a rule beat Tailwind's utilities. */
function unlayered(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const at = css.indexOf('@layer', i)
    if (at < 0) return out + css.slice(i)
    out += css.slice(i, at)
    const open = css.indexOf('{', at)
    const semicolon = css.indexOf(';', at)
    if (semicolon >= 0 && semicolon < open) { i = semicolon + 1; continue }
    let depth = 0
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++
      else if (css[j] === '}' && --depth === 0) { i = j + 1; break }
    }
  }
  return out
}

test('with forced colors the focus has a system outline, outside the layers', () => {
  const css = unlayered(themeCss.replace(/\/\*[\s\S]*?\*\//g, ''))
  const at = css.indexOf(HEAD)
  expect(at, 'the forced-colors rule outside the layers is missing').toBeGreaterThanOrEqual(0)
  const block = css.slice(at, css.indexOf('}', css.indexOf(':focus-visible', at)) + 1)
  expect(block).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight/)
})
