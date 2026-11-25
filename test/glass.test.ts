// Glass (`ThemeDef.material: 'glass'`): the window's own material shows through the ground of the page. Off by default.
// First: without the choice nothing of the engine changes, and with it only an attribute and one variable are added.
// Then the measurement, by the engine: on the ground it computes, over a white and a black desktop behind an acrylic
// that keeps half of it, the text holds 4.5:1 and the control border and the user's colours 3:1, in every sample theme
// and for the five accents of the shell's preset, in both schemes (`[glass]` lines print what was measured). Last: the
// rules of `theme.css` draw glass only under the attribute on the root, never on what opens over the page, and not at
// all with forced colours or where the person asked for less transparency.
import { describe, expect, test } from 'vitest'
import { PALETTE_COMBOS } from '../src/palette'
import type { ThemeDef } from '../src/theme-catalog'
import { ACRYLIC_KEEPS, GLASS_GROUND, GLASS_TEXT, contrast, glassBackdrops, glassGround, glassHeld, over, themeTokens, tokensFor } from '../src/theme-engine'
import { BASE_THEME, THEME_ATTRIBUTES, THEME_VARIABLES, applyTheme, copyTheme, themeVariables } from '../src/themes'
import { THEMES } from './fixtures/sample-themes'
import { SHELL_ACCENTS, SHELL_TONE, shellPreset } from './fixtures/shell-preset'
import { themeCss } from './theme-tokens'

const SCHEMES = ['light', 'dark'] as const
const glass = (theme: ThemeDef): ThemeDef => ({ ...theme, material: 'glass' })
/** Every theme measured: the gray baseline, the sample themes, and the shell's preset in each of its five accents. */
const MEASURED: readonly ThemeDef[] = [BASE_THEME, ...(THEMES as readonly ThemeDef[]), ...SHELL_ACCENTS.map((accent) => shellPreset(accent))]

describe('off by default', () => {
  test('a theme that does not ask writes no attribute and no variable; `solid` and a value that is not one count as absent', () => {
    for (const scheme of SCHEMES) {
      for (const theme of MEASURED) {
        const plain = tokensFor(theme, scheme)
        expect(plain.attributes, theme.id).not.toHaveProperty('data-material')
        expect(plain.shape, theme.id).not.toHaveProperty(GLASS_GROUND)
        expect(tokensFor({ ...theme, material: 'solid' }, scheme), theme.id).toEqual(plain)
        expect(tokensFor({ ...theme, material: 'frosted' } as unknown as ThemeDef, scheme), theme.id).toEqual(plain)
      }
    }
  })

  test('glass adds the attribute and the ground, and changes no colour, no shape and no other attribute', () => {
    for (const scheme of SCHEMES) {
      for (const theme of MEASURED) {
        const plain = tokensFor(theme, scheme)
        const asked = tokensFor(glass(theme), scheme)
        expect(asked.colors, theme.id).toEqual(plain.colors)
        expect(asked.corrected, theme.id).toEqual(plain.corrected)
        expect(asked.attributes, theme.id).toEqual({ ...plain.attributes, 'data-material': 'glass' })
        const { [GLASS_GROUND]: ground, ...shape } = asked.shape
        expect(shape, theme.id).toEqual(plain.shape)
        expect(ground, theme.id).toMatch(/^#[0-9a-f]{8}$/)
      }
    }
  })

  test('applyTheme writes them, the next theme takes them away, and another window copies them', () => {
    const el = document.createElement('div')
    const other = document.createElement('div')
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-material')).toBe(false)
    expect(el.style.getPropertyValue(GLASS_GROUND)).toBe('')
    applyTheme(el, { theme: glass(BASE_THEME), scheme: 'light' })
    expect(el.getAttribute('data-material')).toBe('glass')
    expect(el.style.getPropertyValue(GLASS_GROUND)).toBe(tokensFor(glass(BASE_THEME), 'light').shape[GLASS_GROUND])
    expect(THEME_ATTRIBUTES).toContain('data-material')
    expect(THEME_VARIABLES).toContain(GLASS_GROUND)
    copyTheme(el, other)
    expect(other.getAttribute('data-material')).toBe('glass')
    expect(other.style.getPropertyValue(GLASS_GROUND)).toBe(el.style.getPropertyValue(GLASS_GROUND))
    applyTheme(el, { theme: BASE_THEME, scheme: 'light' })
    expect(el.hasAttribute('data-material')).toBe(false)
    expect(el.style.getPropertyValue(GLASS_GROUND)).toBe('')
    copyTheme(el, other)
    expect(other.hasAttribute('data-material')).toBe(false)
    expect(other.style.getPropertyValue(GLASS_GROUND)).toBe('')
  })

  test('the material stays with the user\'s own colours and with a palette from one colour', () => {
    const nord = glass(THEMES.find((t) => t.id === 'nord')! as ThemeDef)
    const own = themeTokens(nord, 'light', { accent: '#4452c4', background: 'match' })
    expect(own.attributes).toMatchObject({ 'data-material': 'glass' })
    expect(own.shape[GLASS_GROUND]).toMatch(/^#[0-9a-f]{8}$/)
    const palette = themeVariables({ theme: nord, scheme: 'dark', palette: { seed: '#3366cc', combo: PALETTE_COMBOS[0]! } })
    expect(palette[GLASS_GROUND]).toMatch(/^#[0-9a-f]{8}$/)
    const el = document.createElement('div')
    applyTheme(el, { theme: nord, scheme: 'dark', palette: { seed: '#3366cc', combo: PALETTE_COMBOS[0]! } })
    expect(el.getAttribute('data-material')).toBe('glass')
  })
})

/** The ground as the engine wrote it: its colour, and how opaque it is, as the byte and as a share. */
function parts(ground: string): { tint: string; byte: number; alpha: number } {
  const byte = parseInt(ground.slice(7, 9), 16)
  return { tint: ground.slice(0, 7), byte, alpha: byte / 255 }
}

describe('the ground of a glass page, measured by the engine', () => {
  test('the worst backdrop is a white and a black desktop behind an acrylic that keeps half of it', () => {
    expect(ACRYLIC_KEEPS).toBe(0.5)
    expect(glassBackdrops('#ffffff')).toEqual(['#ffffff', '#808080'])
    expect(glassBackdrops('#000000')).toEqual(['#808080', '#000000'])
    // What is held: every text colour that may sit on the frame at 4.5:1, the control border and the user's colours at 3:1.
    const held = glassHeld(tokensFor(BASE_THEME, 'light').colors)
    expect(held.filter(([, min]) => min === 4.5).map(([name]) => name)).toEqual([...GLASS_TEXT])
    expect(held.find(([name]) => name === 'input')).toEqual(['input', 3])
    expect(held.filter(([name]) => name.startsWith('mark-')).length).toBeGreaterThanOrEqual(18)
    expect(held.filter(([name]) => name.startsWith('mark-')).every(([, min]) => min === 3)).toBe(true)
  })

  const table: string[] = []
  const range = { light: [1, 0], dark: [1, 0] } as Record<(typeof SCHEMES)[number], [number, number]>
  let worstText = { ratio: Infinity, at: '' }
  let worstBorder = { ratio: Infinity, at: '' }
  let short = 0

  test.each(SCHEMES)('in %s every text holds 4.5:1 and every border and mark 3:1 on the ground, over both backdrops, and the ground is as thin as that allows', (scheme) => {
    for (const theme of MEASURED) {
      const t = tokensFor(glass(theme), scheme)
      const { tint, byte, alpha } = parts(t.shape[GLASS_GROUND]!)
      const full = t.attributes['data-sidebar'] === 'own'
      const grounds = [t.colors['paper']!, t.colors['paper-2']!, t.colors['raised']!, ...(full ? [] : [t.colors['sidebar-paper']!])]
      // The ground is one of the theme's own backgrounds, and what the function gives for them.
      expect(grounds, `${theme.id} ${scheme}`).toContain(tint)
      expect(t.shape[GLASS_GROUND], `${theme.id} ${scheme}`).toBe(glassGround(t.colors, grounds))
      const backdrops = glassBackdrops(t.colors['paper']!)
      const measure = (a: number) => {
        let ok = true
        let text = { ratio: Infinity, at: '' }
        let border = { ratio: Infinity, at: '' }
        for (const backdrop of backdrops) {
          const ground = over(tint, backdrop, a)
          for (const [name, min] of glassHeld(t.colors)) {
            const ratio = contrast(t.colors[name]!, ground)
            const solid = contrast(t.colors[name]!, tint)
            const at = `${name} ${t.colors[name]} on ${ground} (${tint} at ${Math.round(a * 100)}% over ${backdrop}), ${theme.id} ${scheme}`
            // A colour that falls short on the opaque background itself is not glass's doing: it must not fall further.
            if (ratio < Math.min(min, solid)) ok = false
            if (solid < min) continue
            if (min === 4.5 && ratio < text.ratio) text = { ratio, at }
            if (min === 3 && ratio < border.ratio) border = { ratio, at }
          }
        }
        return { ok, text, border }
      }
      const now = measure(alpha)
      expect(now.ok, `${theme.id} ${scheme}: ${now.text.at} ${now.text.ratio.toFixed(2)}; ${now.border.at} ${now.border.ratio.toFixed(2)}`).toBe(true)
      expect(now.text.ratio, now.text.at).toBeGreaterThanOrEqual(4.5)
      expect(now.border.ratio, now.border.at).toBeGreaterThanOrEqual(3)
      // As thin as it can be: one step thinner and something falls short.
      if (byte > 0) expect(measure((byte - 1) / 255).ok, `${theme.id} ${scheme} one step thinner`).toBe(false)
      short += glassHeld(t.colors).filter(([name, min]) => contrast(t.colors[name]!, tint) < min).length
      if (now.text.ratio < worstText.ratio) worstText = now.text
      if (now.border.ratio < worstBorder.ratio) worstBorder = now.border
      range[scheme] = [Math.min(range[scheme][0], alpha), Math.max(range[scheme][1], alpha)]
      table.push(`[glass] ${theme.id} ${scheme}: ground ${tint} at ${(alpha * 100).toFixed(1)}%; text ${now.text.ratio.toFixed(2)}, border ${now.border.ratio.toFixed(2)}`)
    }
  })

  test('what was measured is printed', () => {
    for (const line of table) console.log(line)
    for (const scheme of SCHEMES) console.log(`[glass] ${scheme}: the ground is from ${(range[scheme][0] * 100).toFixed(1)}% to ${(range[scheme][1] * 100).toFixed(1)}% opaque over ${MEASURED.length} themes`)
    console.log(`[glass] worst text: ${worstText.ratio.toFixed(3)}, ${worstText.at}`)
    console.log(`[glass] worst border or mark: ${worstBorder.ratio.toFixed(3)}, ${worstBorder.at}`)
    console.log(`[glass] colours short on the opaque ground itself, held where they were: ${short}`)
    expect(table).toHaveLength(MEASURED.length * SCHEMES.length)
  })
})

/** The text of `theme.css` without comments and outside every `@layer`: only there does a rule beat the utilities. */
function unlayered(css: string): string {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let out = ''
  let i = 0
  while (i < clean.length) {
    const at = clean.indexOf('@layer', i)
    if (at < 0) return out + clean.slice(i)
    out += clean.slice(i, at)
    const open = clean.indexOf('{', at)
    const semicolon = clean.indexOf(';', at)
    if (semicolon >= 0 && semicolon < open) { i = semicolon + 1; continue }
    let depth = 0
    for (let j = open; j < clean.length; j++) {
      if (clean[j] === '{') depth++
      else if (clean[j] === '}' && --depth === 0) { i = j + 1; break }
    }
  }
  return out
}

describe('the rules of theme.css', () => {
  const GATE = '@media (forced-colors: none) and (prefers-reduced-transparency: no-preference)'
  const css = unlayered(themeCss)
  const at = css.indexOf(GATE)
  const open = css.indexOf('{', at)
  let end = open
  for (let depth = 0, j = open; j < css.length; j++) {
    if (css[j] === '{') depth++
    else if (css[j] === '}' && --depth === 0) { end = j; break }
  }
  const block = css.slice(open + 1, end)
  // A comma inside `:is(…)` is not the end of a selector.
  const list = (selectors: string) => selectors.split(/,(?![^()]*\))/).map((s) => s.trim().replace(/\s+/g, ' '))
  const rules = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: list(m[1]!), body: m[2]!.trim() }))

  test('every rule of glass is in one block, outside the layers, shut with forced colours and with less transparency asked', () => {
    expect(at, 'the gate of the glass rules').toBeGreaterThanOrEqual(0)
    expect(rules.length).toBeGreaterThan(0)
    // Nothing of the stylesheet names the material outside that block: without the attribute nothing is drawn another way.
    expect((css.slice(0, at) + css.slice(end)).includes('data-material')).toBe(false)
    expect(themeCss.replace(/\/\*[\s\S]*?\*\//g, '').split('data-material').length - 1).toBe(block.split('data-material').length - 1)
    // And the ground's variable is read only there.
    expect((css.slice(0, at) + css.slice(end)).includes(GLASS_GROUND)).toBe(false)
  })

  test('each rule holds only under the attribute on the root, and sets a background colour and nothing else', () => {
    for (const rule of rules) {
      for (const selector of rule.selectors) expect(selector, selector).toMatch(/^:root\[data-material="glass"\]/)
      expect(rule.body, rule.selectors.join(', ')).toMatch(/^background-color:\s*[^;]+;$/)
    }
  })

  test('the page paints nothing, the body is the ground, the frame paints nothing and the work area is the paper', () => {
    const of = (selector: string) => rules.find((rule) => rule.selectors.includes(selector))?.body
    expect(of(':root[data-material="glass"]')).toBe('background-color: transparent;')
    expect(of(':root[data-material="glass"] body')).toBe(`background-color: var(${GLASS_GROUND}, var(--color-paper));`)
    expect(of(':root[data-material="glass"] :is([data-slot="app-shell"], [data-slot="title-bar"]):not([data-slot="app-shell-work"] *)')).toBe('background-color: transparent;')
    // A sidebar with colours of its own keeps its column: its inks are held on its colour only.
    expect(of(':root[data-material="glass"]:not([data-sidebar="own"]) [data-slot="sidebar"]:not([data-slot="app-shell-work"] *)')).toBe('background-color: transparent;')
    expect(of(':root[data-material="glass"] [data-slot="app-shell-work"]')).toBe('background-color: var(--color-paper);')
  })

  test('what opens over the page stays as it is: no rule names a slot but the frame\'s, and the toolkit draws no blur', () => {
    const slots = new Set([...block.matchAll(/data-slot="([a-z-]+)"/g)].map((m) => m[1]))
    expect([...slots].sort()).toEqual(['app-shell', 'app-shell-work', 'sidebar', 'title-bar'])
    expect(themeCss.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/backdrop-filter|blur\(/)
  })
})
