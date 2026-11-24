// Tints with a name and their scales (owner, 2026-11-24): the names are those of the eighteen free colours, a theme
// written by names holds the engine's thresholds in every tone, and every scale holds the thresholds its steps are for.
import { expect, test } from 'vitest'
import { COLORS, COLOR_NAMES, HUE_NAMES, TONE_PRESETS, grayScale, hueColor, hueScale, isHueName, namedTheme, presetTone, tokensFor, type HueScale } from '../src'
import { contrast, fromHex, luminance, toneChroma } from '../src/theme-engine'

const SCHEMES = ['light', 'dark'] as const
const HEX = /^#[0-9a-f]{6}$/
const least = (color: string, grounds: readonly string[]) => Math.min(...grounds.map((bg) => contrast(color, bg)))

test('the tints are the eighteen free colours, by their names and in their order', () => {
  expect(HUE_NAMES.map((name) => name)).toEqual(COLORS.map((color) => COLOR_NAMES[color].toLowerCase()))
  expect(hueColor('blue')).toBe(COLORS[10])
  expect(isHueName('blue')).toBe(true)
  for (const no of ['Blue', 'navy', '', null, 10]) expect(isHueName(no), String(no)).toBe(false)
  expect(() => hueColor('navy' as never)).toThrow('unknown hue')
})

test('a theme written by names is the named colour as the accent, on its own gray or on one with no hue', () => {
  const blue = fromHex(hueColor('blue'))
  const theme = namedTheme({ id: 'sea', label: 'Sea', accent: 'blue' })
  expect(theme).toMatchObject({ id: 'sea', label: 'Sea', sidebar: 'tenue', palette: 'crisp' })
  expect(theme.accent).toEqual([blue.C, blue.h])
  expect(theme.fill).toEqual([blue.L, blue.C])
  expect(theme.hue).toBe(blue.h)
  // A tint, never a colour: the grays of the catalogue's themes are in this range.
  expect(theme.chroma).toBeGreaterThanOrEqual(0.005)
  expect(theme.chroma).toBeLessThanOrEqual(0.013)
  expect(theme.second).toBeUndefined()

  const amber = fromHex(hueColor('amber'))
  const two = namedTheme({ id: 'two', label: 'Two', accent: 'blue', ground: 'amber', second: 'emerald', sidebar: 'piena' })
  expect(two.hue).toBe(amber.h)
  expect(two.second?.[1]).toBe(fromHex(hueColor('emerald')).h)
  expect(two.sidebar).toBe('piena')
  expect(namedTheme({ id: 'plain', label: 'Plain', accent: 'blue', ground: 'gray' }).chroma).toBe(0)
})

test('every named theme holds the engine thresholds in every tone, in light and in dark', () => {
  for (const accent of HUE_NAMES) {
    for (const tone of TONE_PRESETS) {
      for (const scheme of SCHEMES) {
        const c = tokensFor(namedTheme({ id: accent, label: accent, accent }), scheme, presetTone(tone)).colors
        const at = `${accent} ${tone} ${scheme}`
        const grounds = [c['paper']!, c['paper-2']!, c['raised']!, c['sidebar-paper']!]
        expect(least(c['ink']!, grounds), `${at}: ink`).toBeGreaterThanOrEqual(7)
        expect(least(c['ink-mute']!, grounds), `${at}: muted ink`).toBeGreaterThanOrEqual(4.5)
        expect(least(c['accent']!, [...grounds, c['accent-soft']!]), `${at}: accent`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c['primary-foreground']!, c['primary']!), `${at}: label`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c['primary-foreground']!, c['accent-hover']!), `${at}: label, hover`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c['selected-ink']!, c['selected']!), `${at}: selection`).toBeGreaterThanOrEqual(4.5)
      }
    }
  }
})

test('the tones of a scale are the engine’s, with its numbers', () => {
  expect(TONE_PRESETS.map(toneChroma)).toEqual([0.45, 1, 1.7])
})

/** Every scale there is: the three tones and the gray of each tint, and the gray with no hue. */
function everyScale(): { at: string; scheme: (typeof SCHEMES)[number]; scale: HueScale; gray: HueScale }[] {
  const out: ReturnType<typeof everyScale> = []
  for (const scheme of SCHEMES) {
    const plain = grayScale(null, scheme)
    out.push({ at: `gray ${scheme}`, scheme, scale: plain, gray: plain })
    for (const hue of HUE_NAMES) {
      const gray = grayScale(hue, scheme)
      out.push({ at: `${hue} gray ${scheme}`, scheme, scale: gray, gray })
      for (const tone of TONE_PRESETS) out.push({ at: `${hue} ${tone} ${scheme}`, scheme, scale: hueScale(hue, tone, scheme), gray })
    }
  }
  return out
}

test('a scale is twelve colours, and steps 1 to 8 go one way: darker in light, lighter in dark', () => {
  for (const { at, scheme, scale } of everyScale()) {
    expect(scale.steps, at).toHaveLength(12)
    for (const step of scale.steps) expect(step, at).toMatch(HEX)
    expect(scale.on, at).toMatch(HEX)
    const lum = scale.steps.slice(0, 8).map(luminance)
    for (let i = 1; i < lum.length; i++) {
      if (scheme === 'light') expect(lum[i]!, `${at}: step ${i + 1}`).toBeLessThan(lum[i - 1]!)
      else expect(lum[i]!, `${at}: step ${i + 1}`).toBeGreaterThan(lum[i - 1]!)
    }
  }
})

test('every scale holds the thresholds its steps are for', () => {
  for (const { at, scale, gray } of everyScale()) {
    const s = scale.steps
    const page = [gray.steps[0]!, gray.steps[1]!]
    // The border of a control and the fill are seen without text, on the scale's own backgrounds and on the page.
    expect(least(s[7]!, [s[0]!, s[1]!, ...page]), `${at}: step 8`).toBeGreaterThanOrEqual(3)
    expect(least(s[8]!, page), `${at}: step 9`).toBeGreaterThanOrEqual(3)
    // The label reads on the fill and on the fill under the pointer.
    expect(least(scale.on, [s[8]!, s[9]!]), `${at}: label`).toBeGreaterThanOrEqual(4.5)
    // Text: step 11 on the backgrounds and the soft background, step 12 on every background of a component.
    expect(least(s[10]!, [s[0]!, s[1]!, s[2]!, ...page]), `${at}: step 11`).toBeGreaterThanOrEqual(4.5)
    expect(least(s[11]!, s.slice(0, 5)), `${at}: step 12`).toBeGreaterThanOrEqual(7)
  }
})

test('the three tones read apart: from Calm to Vivid a tint gains colour, and its gray has almost none', () => {
  const chroma = (hex: string) => fromHex(hex).C
  for (const scheme of SCHEMES) {
    for (const hue of HUE_NAMES) {
      const [calm, balanced, vivid] = TONE_PRESETS.map((tone) => hueScale(hue, tone, scheme).steps)
      const gray = grayScale(hue, scheme).steps
      // On the selection (step 4) and on the border (step 7), where nothing has moved a step to hold a threshold.
      for (const step of [4, 7]) {
        const at = `${hue} ${scheme}: step ${step}`
        expect(chroma(calm![step - 1]!), at).toBeLessThan(chroma(balanced![step - 1]!))
        expect(chroma(balanced![step - 1]!), at).toBeLessThan(chroma(vivid![step - 1]!))
      }
      // The backgrounds of a component and the borders are another colour in each tone, whatever the tint.
      for (let step = 3; step <= 8; step++) expect(new Set([calm![step - 1], balanced![step - 1], vivid![step - 1]]).size, `${hue} ${scheme}: step ${step}`).toBe(3)
      for (const step of gray) expect(chroma(step), `${hue} ${scheme}: gray`).toBeLessThan(0.025)
    }
    for (const step of grayScale(null, scheme).steps) expect(chroma(step), `gray ${scheme}`).toBeLessThan(0.001)
  }
})

test('a scale is pure, and refuses what is not a tint or a scheme', () => {
  expect(hueScale('blue', 'vivid', 'light')).toEqual(hueScale('blue', 'vivid', 'light'))
  expect(grayScale('blue', 'dark')).toEqual(grayScale('blue', 'dark'))
  expect(() => hueScale('navy' as never, 'vivid', 'light')).toThrow('unknown hue')
  expect(() => hueScale('blue', 'vivid', 'sepia' as never)).toThrow('unknown scheme')
  expect(() => grayScale(null, 'sepia' as never)).toThrow('unknown scheme')
})
