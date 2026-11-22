// @vitest-environment node
// A theme of two colours (`duoTheme`): the base brought to a very light page (`pageTint`) and an accent chosen by the
// classical harmonies and ranked (`accentSuggestions`), with the engine's contrast thresholds holding for every one.
import { describe, expect, test } from 'vitest'
import { BASE_THEME, COLORS, accentSuggestions, contrast, duoTheme, pageTint, themeTokens } from '../src'
import { FIXED, fromHex } from '../src/theme-engine'

const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const BASES = COLORS
const RED = fromHex(FIXED.light.destructive).h

describe('the base of a theme of two colours', () => {
  test('any colour is brought to a very light tone that keeps only its hue; white, a gray or nothing is the neutral white', () => {
    for (const base of BASES) {
      const page = fromHex(pageTint(base))
      expect(page.L, base).toBeGreaterThan(0.97)
      expect(page.C, base).toBeLessThanOrEqual(0.02)
      if (fromHex(base).C >= 0.04 && page.C > 0.004) expect(apart(page.h, fromHex(base).h), base).toBeLessThan(12)
    }
    for (const none of [null, undefined, '#ffffff', '#808080', 'not a colour']) expect(fromHex(pageTint(none)).C).toBeLessThan(0.002)
    // Even the most saturated colour leaves a white page.
    expect(contrast(pageTint('#ff0000'), '#ffffff')).toBeLessThan(1.1)
  })
})

describe('the accents suggested for a base', () => {
  test('the first is the recommended one, none is the red of an error, and no two are the same hue', () => {
    for (const base of [null, ...BASES]) {
      const list = accentSuggestions(base)
      expect(list.length, String(base)).toBeGreaterThanOrEqual(5)
      expect(list.length).toBeLessThanOrEqual(8)
      expect(list.filter((s) => s.recommended)).toEqual([list[0]])
      for (const s of list) expect(apart(fromHex(s.color).h, RED), `${base} ${s.id}`).toBeGreaterThanOrEqual(20)
      const hues = list.map((s) => fromHex(s.color).h)
      for (let i = 0; i < hues.length; i++) for (let j = i + 1; j < hues.length; j++) expect(apart(hues[i]!, hues[j]!), `${base} ${list[i]!.id} ${list[j]!.id}`).toBeGreaterThan(8)
    }
  })

  test('with a hue they are its harmonies on the OKLCH wheel, each at its turn; without one they are spread round the wheel, the blue first', () => {
    const blue = '#297abc'
    const h = fromHex(blue).h
    for (const s of accentSuggestions(blue)) {
      if (s.moved) continue
      expect(apart(fromHex(s.color).h, ((h + s.turn) % 360 + 360) % 360), s.id).toBeLessThan(6)
    }
    // Blue's best accent is its complement, an amber: its split complement at -150 is an olive at a button's lightness.
    expect(accentSuggestions(blue)[0]!.id).toBe('complement+180')
    const neutral = accentSuggestions(null)
    expect(neutral.every((s) => s.harmony === 'spread')).toBe(true)
    expect(neutral[0]!.id).toBe('spread-264')
    expect(accentSuggestions('#ffffff').map((s) => s.id)).toEqual(neutral.map((s) => s.id))
  })

  test('the same base always gives the same list', () => {
    expect(accentSuggestions('#7b68ee')).toEqual(accentSuggestions('#7B68EE'.toLowerCase()))
  })
})

describe('the theme the two colours make', () => {
  test('for every base and every suggested accent, in light and in dark, the contrast thresholds hold', () => {
    for (const base of [null, ...BASES.filter((_, i) => i % 2 === 0)]) {
      for (const s of accentSuggestions(base)) {
        for (const scheme of ['light', 'dark'] as const) {
          const c = themeTokens(BASE_THEME, scheme, duoTheme({ base, accent: s.color })).colors as Record<string, string>
          const where = `${base} ${s.id} ${scheme}`
          expect(contrast(c['primary-foreground']!, c['primary']!), `label on fill, ${where}`).toBeGreaterThanOrEqual(4.5)
          expect(contrast(c['primary']!, c['paper']!), `fill on page, ${where}`).toBeGreaterThanOrEqual(3)
          expect(contrast(c['accent']!, c['paper']!), `accent text on page, ${where}`).toBeGreaterThanOrEqual(4.5)
          expect(contrast(c['ink']!, c['paper']!), `ink on page, ${where}`).toBeGreaterThanOrEqual(7)
        }
      }
    }
  })

  test('the page is the base at a very light tone in light and a very dark one in dark; a base with no hue is neutral in both', () => {
    const tinted = (scheme: 'light' | 'dark', base: string | null) => fromHex((themeTokens(BASE_THEME, scheme, duoTheme({ base, accent: '#3f6dd7' })).colors as Record<string, string>)['paper']!)
    const light = tinted('light', '#2f9e6e')
    expect(light.L).toBeGreaterThan(0.97)
    expect(apart(light.h, fromHex('#2f9e6e').h)).toBeLessThan(12)
    const dark = tinted('dark', '#2f9e6e')
    expect(dark.L).toBeLessThan(0.3)
    expect(apart(dark.h, fromHex('#2f9e6e').h)).toBeLessThan(20)
    expect(tinted('light', null).C).toBeLessThan(0.002)
    expect(tinted('dark', null).C).toBeLessThan(0.002)
  })
})
