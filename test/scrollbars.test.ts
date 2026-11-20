// Scrollbars follow the theme: they are drawn only from the color tokens (so they work for every theme and accent
// without an extra color), only with a precise pointer (with a finger they stay the system ones, overlaid) and
// never with Windows forced colors (high contrast).
import { expect, test } from 'vitest'
import { themeCss } from './theme-tokens'

/** The block that follows `head`, up to the brace that closes it. */
function blockAfter(css: string, head: string): string {
  const at = css.indexOf(head)
  if (at < 0) throw new Error(`theme.css has no ${head}`)
  const open = css.indexOf('{', at)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  throw new Error(`${head} does not close`)
}

const WEBKIT = '@media (hover: hover) and (pointer: fine) and (forced-colors: none)'
const FIREFOX = '@supports not selector(::-webkit-scrollbar)'

test('Chromium engines: thin pill-shaped bar, no arrows, only with a precise pointer', () => {
  const css = blockAfter(themeCss, WEBKIT)
  for (const part of ['::-webkit-scrollbar ', '::-webkit-scrollbar-track', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-button', '::-webkit-scrollbar-corner']) {
    expect(css).toContain(part)
  }
  expect(blockAfter(css, '::-webkit-scrollbar-button')).toMatch(/display:\s*none/)
  expect(blockAfter(css, '::-webkit-scrollbar-thumb')).toMatch(/border-radius:\s*9999px/)
  // Outside that block there is no `::-webkit-scrollbar` rule: with a finger the bars stay the system ones.
  expect(themeCss.replace(css, '').includes('::-webkit-scrollbar-thumb')).toBe(false)
})

test('Firefox: `scrollbar-color` only where `::-webkit-scrollbar` does not exist (in Chromium it would turn it off)', () => {
  const css = blockAfter(themeCss, FIREFOX)
  expect(css).toMatch(/scrollbar-width:\s*thin/)
  expect(css).toMatch(/scrollbar-color:/)
  expect(themeCss.replace(css, '').match(/scrollbar-(color|width):/g)).toBeNull()
})

test('the scrollbar colors come only from the theme tokens, never from a written value', () => {
  for (const css of [blockAfter(themeCss, WEBKIT), blockAfter(themeCss, FIREFOX)]) {
    const colors = css.match(/(background-color|scrollbar-color):[^;]+;/g) ?? []
    expect(colors.length).toBeGreaterThan(0)
    for (const decl of colors) {
      expect(decl, decl).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i)
      expect(decl, decl).toMatch(/var\(--color-ink\)|transparent/)
    }
  }
})
