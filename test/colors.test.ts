// The palette of the user's colors (what a user colours in an app): the colors are user data and stay the same in both
// themes, so they must hold up on both the light and the dark paper and stay distinguishable from each other.
import { describe, expect, test } from 'vitest'
import { COLORS, COLOR_NAMES } from '../src/colors'
import { palettes, themePalettes } from './theme-tokens'

const LEGACY = ['#e34432', '#ee6449', '#6b9fa0', '#78a271', '#7b68ee', '#297abc', '#f5a623']

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(channel) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
function lab(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map(channel) as [number, number, number]
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const distance = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!))
function hue(hex: string): number {
  const [r, g, b] = rgb(hex)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

describe('the color palette of areas and projects', () => {
  test('has eighteen distinct colors, every one written as #rrggbb in lower case', () => {
    expect(COLORS.length).toBe(18)
    expect(new Set(COLORS).size).toBe(COLORS.length)
    for (const c of COLORS) expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('the seven colors already saved by users are still there, in the palette', () => {
    for (const c of LEGACY) expect(COLORS as readonly string[], c).toContain(c)
  })

  test('every color has a distinct English name, spoken instead of the hexadecimal', () => {
    const names = COLORS.map((c) => COLOR_NAMES[c])
    for (const [i, n] of names.entries()) expect(n, COLORS[i]).toMatch(/^[A-Z][a-z ]+$/)
    expect(new Set(names).size).toBe(COLORS.length)
    expect(Object.keys(COLOR_NAMES).sort()).toEqual([...COLORS].sort())
  })

  test('are ordered by hue, red to pink', () => {
    const hues = COLORS.map(hue)
    expect(hues).toEqual([...hues].sort((a, b) => a - b))
  })

  test('stay visible on both papers: at least 1.8:1 against the light and the dark one', () => {
    const { light, dark } = palettes()
    // Computed once: every theme's palette for every colour made this test run past its time limit (CI, 2026-11-20).
    const themes = Object.entries(themePalettes())
    for (const c of COLORS) {
      expect(contrast(c, light.paper!), `${c} on light paper`).toBeGreaterThanOrEqual(1.8)
      expect(contrast(c, dark.paper!), `${c} on dark paper`).toBeGreaterThanOrEqual(1.8)
      // Also on every chosen theme: a project's color does not change with the theme.
      for (const [id, t] of themes) expect(contrast(c, t['paper']!), `${c} on ${id}`).toBeGreaterThanOrEqual(1.8)
    }
  })

  test('are told apart at a glance: no two closer than 11 in CIELAB', () => {
    for (const [i, a] of COLORS.entries()) for (const b of COLORS.slice(i + 1)) expect(distance(a, b), `${a} / ${b}`).toBeGreaterThanOrEqual(11)
  })

})
