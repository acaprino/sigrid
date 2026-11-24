// Labels (`@meds`) have a fixed color, chosen from the name: the same name has the same color everywhere and on every
// device, with no extra data. The palette lives in `theme.css`, the chips of the labels field carry it. (How an app's
// rows show a label is tested in the app's package.)
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ChipsInput } from '../src/components/ChipsInput'
import { TAG_HUES, tagHue } from '../src/internal/tag-color'
import { palettes, themeCss } from './theme-tokens'
import { contrast, noop } from './helpers'

test('the color comes from the name: case, spaces and the at sign do not change it', () => {
  const h = tagHue('meds')
  expect(h).toBeGreaterThanOrEqual(1)
  expect(h).toBeLessThanOrEqual(TAG_HUES)
  for (const same of ['@meds', 'Meds', ' meds ', '@MEDS']) expect(tagHue(same)).toBe(h)
})

test('different names use all the colors of the palette', () => {
  const seen = new Set(Array.from({ length: 300 }, (_, i) => tagHue(`label-${i}`)))
  expect(seen.size).toBe(TAG_HUES)
})

/** The `--tag-N-bg`/`--tag-N-ink` tokens of the rule with this exact selector. */
function tagTokens(selector: string): Record<string, string> {
  const css = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  const at = css.indexOf(`${selector} {`)
  if (at < 0) throw new Error(`theme.css has no rule ${selector}`)
  const open = css.indexOf('{', at)
  const body = css.slice(open + 1, css.indexOf('}', open))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--tag-(\d+-(?:bg|ink))\s*:\s*(#[0-9a-f]{6})\s*;/g)) out[m[1]!] = m[2]!
  return out
}

// Light: without `data-scheme` (before the script, or outside the client) and with the light scheme. Dark: with the dark scheme
// and, without `data-scheme`, with the dark system.
const LIGHT = tagTokens(':where(:root:not([data-scheme]), [data-scheme="light"])')
const DARK = tagTokens(':where([data-scheme="dark"])')
const DARK_FIRST_PAINT = tagTokens(':where(:root:not([data-scheme]))')

test('the label palette has a background and an ink for every color, light and dark', () => {
  for (const p of [LIGHT, DARK]) {
    for (let n = 1; n <= TAG_HUES; n++) {
      expect(p[`${n}-bg`], `--tag-${n}-bg`).toMatch(/^#[0-9a-f]{6}$/)
      expect(p[`${n}-ink`], `--tag-${n}-ink`).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(Object.keys(p)).toHaveLength(TAG_HUES * 2)
  }
  expect(DARK_FIRST_PAINT).toEqual(DARK)
  // The first-dark-paint rule sits inside `@media (prefers-color-scheme: dark)`.
  const at = themeCss.indexOf(':where(:root:not([data-scheme])) {')
  expect(themeCss.slice(0, at).trimEnd().endsWith('@media (prefers-color-scheme: dark) {')).toBe(true)
})

test('every label is readable: at least 4.5:1 between ink and background, light and dark', () => {
  for (const [scheme, p] of [['light', LIGHT], ['dark', DARK]] as const) {
    for (let n = 1; n <= TAG_HUES; n++) {
      const ratio = contrast(p[`${n}-ink`]!, p[`${n}-bg`]!)
      expect(ratio, `${scheme}, color ${n}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('a label dot reaches 3:1 on the page, the lanes and the raised surfaces, light and dark (R10)', () => {
  const first = palettes(themeCss)
  for (const [scheme, p, t] of [['light', LIGHT, first.light], ['dark', DARK, first.dark]] as const) {
    for (let n = 1; n <= TAG_HUES; n++) {
      for (const bg of ['paper', 'paper-2', 'raised'] as const) {
        const ratio = contrast(p[`${n}-ink`]!, t[bg]!)
        expect(ratio, `${scheme}, color ${n} on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    }
  }
})

// The color is an attribute read by `theme.css`, never an inline style.
// A chip of the labels field is neutral with an 8px dot in the label's ink (R10: data colours as dots, never filled).
const varsOf = (el: HTMLElement) => ({
  hue: el.getAttribute('data-tag-hue'),
  style: el.getAttribute('style'),
  filled: el.className.includes('bg-(--tag-bg)'),
  dot: el.querySelector('[data-slot="chip-dot"]')?.className.includes('bg-(--tag-ink)') ?? false,
})
const expected = (name: string) => ({ hue: String(tagHue(name)), style: null, filled: false, dot: true })

test('every color has its `[data-tag-hue]` rule that carries background and ink', () => {
  const css = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  for (let n = 1; n <= TAG_HUES; n++) {
    const at = css.indexOf(`[data-tag-hue="${n}"] {`)
    expect(at, `[data-tag-hue="${n}"]`).toBeGreaterThan(-1)
    const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at))
    expect(body).toContain(`--tag-bg: var(--tag-${n}-bg);`)
    expect(body).toContain(`--tag-ink: var(--tag-${n}-ink);`)
  }
})

test('the same label has the same color in the task details (Labels field)', () => {
  render(<ChipsInput id="e" value={['meds', 'Home']} onChange={noop} />)
  const chips = document.querySelectorAll<HTMLElement>('[data-slot="chip"]')
  expect(varsOf(chips[0]!)).toEqual(expected('meds'))
  expect(varsOf(chips[1]!)).toEqual(expected('home'))
})
