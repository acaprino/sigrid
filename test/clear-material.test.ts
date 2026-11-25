// The clear material (`ThemeDef.material: 'clear'`): the page paints no ground, for a transparent window of its own that holds one part with a
// surface of its own. Only an attribute is added; no colour, shape or variable changes; the next theme takes it away; and the stylesheet makes
// `html` and `body` transparent under it and nowhere else.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { ThemeDef } from '../src/theme-catalog'
import { GLASS_GROUND, tokensFor } from '../src/theme-engine'
import { BASE_THEME, applyTheme } from '../src/themes'

const clear = (theme: ThemeDef): ThemeDef => ({ ...theme, material: 'clear' })

describe('clear', () => {
  test('it adds the attribute and changes nothing else, in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const plain = tokensFor(BASE_THEME, scheme)
      const asked = tokensFor(clear(BASE_THEME), scheme)
      expect(asked.colors).toEqual(plain.colors)
      expect(asked.shape).toEqual(plain.shape)
      expect(asked.corrected).toEqual(plain.corrected)
      expect(asked.attributes).toEqual({ ...plain.attributes, 'data-material': 'clear' })
      expect(asked.shape).not.toHaveProperty(GLASS_GROUND)
    }
  })

  test('applyTheme writes it, and the next theme takes it away', () => {
    const el = document.createElement('div')
    applyTheme(el, { theme: clear(BASE_THEME), scheme: 'dark' })
    expect(el.getAttribute('data-material')).toBe('clear')
    applyTheme(el, { theme: BASE_THEME, scheme: 'dark' })
    expect(el.hasAttribute('data-material')).toBe(false)
  })

  test('the stylesheet makes the root and the body transparent under it, outside the layers, and only under it', () => {
    const css = readFileSync(join(__dirname, '../src/styles/theme.css'), 'utf8')
    const rule = css.match(/:root\[data-material="clear"\],\s*:root\[data-material="clear"\] body \{([^}]*)\}/)
    expect(rule?.[1]).toMatch(/background-color:\s*transparent/)
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '').split('data-material="clear"').length - 1).toBe(2)
  })
})
