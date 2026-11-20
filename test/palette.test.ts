// Palettes from one base colour (owner, 2026-11-20): saved values are checked, each combination does what its name says,
// and whatever colour the user picks the engine keeps the text readable in light and in dark.
import { expect, test } from 'vitest'
import { PALETTE_COMBOS, palettePick, paletteTheme } from '../src/palette'
import { contrast, tokensFor } from '../src/theme-engine'

const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

test('a saved palette passes only with a real colour and a real combination', () => {
  expect(palettePick({ seed: '#1E88E5', combo: 'bold' })).toEqual({ seed: '#1e88e5', combo: 'bold' })
  for (const no of [null, '#1e88e5', { seed: 'blue', combo: 'clean' }, { seed: '#1e88e5', combo: 'loud' }, { seed: '#1e88e5' }]) expect(palettePick(no), JSON.stringify(no)).toBeNull()
})

test('each combination does what its name says', () => {
  const seed = '#1e88e5'
  const clean = paletteTheme({ seed, combo: 'clean' })
  expect(clean.sidebar).toBe('tenue')
  expect(hueGap(clean.accent[1], clean.hue)).toBeLessThan(5)
  const bold = paletteTheme({ seed, combo: 'bold' })
  expect(bold.sidebar).toBe('piena')
  expect(hueGap(bold.accent[1], bold.hue)).toBeGreaterThan(90)
  expect(bold.second?.[1]).toBeCloseTo(bold.hue, 5)
  const soft = paletteTheme({ seed, combo: 'soft' })
  expect(soft.second?.[1]).toBeCloseTo(soft.hue, 5)
  expect(hueGap(soft.accent[1], soft.hue)).toBeGreaterThan(20)
})

test('whatever the colour, the text and the accent stay readable in light and in dark', () => {
  for (const seed of ['#e53935', '#43a047', '#1e88e5', '#ffeb3b', '#8e24aa', '#808080', '#000000', '#ffffff']) {
    for (const combo of PALETTE_COMBOS) {
      for (const scheme of ['light', 'dark'] as const) {
        const c = tokensFor(paletteTheme({ seed, combo }), scheme).colors
        const at = `${seed} ${combo} ${scheme}`
        expect(contrast(c['ink']!, c['paper']!), `${at}: ink`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c['accent']!, c['paper']!), `${at}: accent`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(c['primary-foreground']!, c['primary']!), `${at}: button label`).toBeGreaterThanOrEqual(4.5)
      }
    }
  }
})
