// Glass (`ThemeDef.material: 'glass'`): the window's own material shows through the ground of the page. Off by default.
// First: without the choice nothing of the engine changes, and with it only an attribute and one variable are added.
// Then the measurement, by the engine: on the ground it computes, over a white and a black desktop behind an acrylic
// that keeps half of it, the text holds 4.5:1 and the control border and the user's colours 3:1, in every sample theme
// and for the five accents of the shell's preset, in both schemes (`[glass]` lines print what was measured). Last: the
// rules of `theme.css` draw glass only under the attribute on the root, on what opens over the page only when the
// palette states it, and not at all with forced colours or where the person asked for less transparency. And the glass
// a palette states (`Surfaces.glass`: the ground, the work area, what floats) is kept as stated, or raised in opacity
// only (`[glass-levels]` lines print the worst pair on each surface).
import { describe, expect, test } from 'vitest'
import { PALETTE_COMBOS } from '../src/palette'
import type { ThemeDef } from '../src/theme-catalog'
import { ACRYLIC_KEEPS, GLASS_FLOAT, GLASS_GROUND, GLASS_SHEET, GLASS_TEXT, GLASS_VARIABLES, contrast, glassBackdrops, glassGround, glassHeld, glassLevel, glassLevels, glassOver, isGlassColor, over, themeTokens, tokensFor } from '../src/theme-engine'
import { BASE_THEME, THEME_ATTRIBUTES, THEME_VARIABLES, applyTheme, copyTheme, themeVariables } from '../src/themes'
import { THEMES } from './fixtures/sample-themes'
import { SHELL_ACCENTS, SHELL_GLASS, SHELL_TONE, shellGlass, shellPreset } from './fixtures/shell-preset'
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

describe('the glass a palette states (`Surfaces.glass`)', () => {
  const SURFACES = [['ground', GLASS_GROUND, 'glass-ground'], ['sheet', GLASS_SHEET, 'glass-sheet'], ['float', GLASS_FLOAT, 'glass-float']] as const
  type Scheme = (typeof SCHEMES)[number]
  type Stated = { readonly [S in Scheme]: { readonly ground: string; readonly sheet: string; readonly float: string } }

  /** What is behind each surface at its worst, computed here from the levels the engine wrote. */
  function behind(colors: Readonly<Record<string, string>>, shape: Readonly<Record<string, string>>) {
    const ground = glassBackdrops(colors['paper']!)
    const sheet = glassOver(shape[GLASS_GROUND]!, ground)
    const float = [...glassOver(shape[GLASS_SHEET] ?? colors['paper']! + 'ff', sheet), ...sheet, colors['ink']!]
    return { ground, sheet, float }
  }

  /** The worst text and the worst border or mark on a level over its backdrops, and whether everything holds. */
  function measure(colors: Readonly<Record<string, string>>, level: string, backdrops: readonly string[]) {
    const { tint } = parts(level)
    let ok = true
    let text = { ratio: Infinity, at: '' }
    let border = { ratio: Infinity, at: '' }
    for (const surface of glassOver(level, backdrops)) {
      for (const [name, min] of glassHeld(colors)) {
        const ratio = contrast(colors[name]!, surface)
        const solid = contrast(colors[name]!, tint)
        if (ratio < Math.min(min, solid)) ok = false
        // A colour short on the opaque colour itself is not glass's doing: it is counted apart.
        if (solid < min) continue
        const at = `${name} ${colors[name]} on ${surface}`
        if (min === 4.5 && ratio < text.ratio) text = { ratio, at }
        if (min === 3 && ratio < border.ratio) border = { ratio, at }
      }
    }
    return { ok, text, border }
  }

  /** One theme in one scheme: each stated level keeps its colour, is never thinner than stated, holds, and is named when raised. */
  function check(stated: Stated, accent: (typeof SHELL_ACCENTS)[number], scheme: Scheme, lines?: string[]): readonly string[] {
    const t = tokensFor(shellGlass(accent, stated), scheme, SHELL_TONE)
    const where = `${accent.id} ${scheme}`
    expect(t.attributes, where).toMatchObject({ 'data-material': 'glass', 'data-float': 'glass' })
    const under = behind(t.colors, t.shape)
    const raised: string[] = []
    for (const [key, variable, name] of SURFACES) {
      const asked = stated[scheme][key]
      const written = t.shape[variable]!
      expect(written, `${where} ${key}`).toMatch(/^#[0-9a-f]{8}$/)
      // The colour is the palette's; only the opacity may differ, and only upward.
      expect(parts(written).tint, `${where} ${key}`).toBe(parts(asked).tint)
      expect(parts(written).byte, `${where} ${key}`).toBeGreaterThanOrEqual(parts(asked).byte)
      expect(written, `${where} ${key}`).toBe(glassLevel(t.colors, asked, under[key]))
      const now = measure(t.colors, written, under[key])
      expect(now.ok, `${where} ${key}: ${now.text.at} ${now.text.ratio.toFixed(2)}; ${now.border.at} ${now.border.ratio.toFixed(2)}`).toBe(true)
      const moved = written !== asked
      expect(t.corrected.includes(name), `${where} ${key} in corrected`).toBe(moved)
      // Raised no further than needed: one step thinner and something falls short.
      if (moved) {
        raised.push(name)
        expect(measure(t.colors, parts(written).tint + (parts(written).byte - 1).toString(16).padStart(2, '0'), under[key]).ok, `${where} ${key} one step thinner`).toBe(false)
      }
      lines?.push(`[glass-levels] ${where} ${key}: stated ${asked} (${(parts(asked).alpha * 100).toFixed(1)}%), written ${written} (${(parts(written).alpha * 100).toFixed(1)}%)${moved ? ' RAISED' : ''}; text ${now.text.ratio.toFixed(2)} (${now.text.at}), border or mark ${now.border.ratio.toFixed(2)} (${now.border.at})`)
    }
    // The engine measured over the same backdrops.
    expect(glassLevels(t.colors, [t.colors['paper']!], stated[scheme]).behind).toEqual(under)
    return raised
  }

  const lines: string[] = []
  const raisedAt: string[] = []

  test.each(SCHEMES)('in %s the three levels of the old Smooth look are written for each accent: the colour as stated, the opacity as stated or raised', (scheme) => {
    for (const accent of SHELL_ACCENTS) for (const name of check(SHELL_GLASS, accent, scheme, lines)) raisedAt.push(`${name} ${accent.id} ${scheme}`)
  })

  test('what was measured is printed', () => {
    for (const line of lines) console.log(line)
    console.log(`[glass-levels] raised: ${raisedAt.length === 0 ? 'none, the six values are as stated in every accent' : raisedAt.join(', ')}`)
    expect(lines).toHaveLength(SHELL_ACCENTS.length * SCHEMES.length * SURFACES.length)
  })

  // The work area may stay as thin as stated: what is behind it is the ground, which already holds every colour.
  test('a level stated too thin keeps its colour and takes the opacity its text needs, and is named in `corrected`', () => {
    const thin: Stated = {
      dark: { ground: '#0c111d00', sheet: '#1a202c00', float: '#24293500' },
      light: { ground: '#f6f7f900', sheet: '#ffffff00', float: '#ffffff00' },
    }
    for (const scheme of SCHEMES) {
      for (const accent of SHELL_ACCENTS) {
        expect(check(thin, accent, scheme), `${accent.id} ${scheme}`).toEqual(expect.arrayContaining(['glass-ground', 'glass-float']))
      }
    }
  })

  test('a level is `#rrggbbaa`: anything else, or a level left out, is as without it', () => {
    expect(['#0c111dcc', '#0C111DCC'].every(isGlassColor)).toBe(true)
    expect(['#0c111d', 'rgba(12, 17, 29, 0.8)', '0c111dcc', '#0c111dcg', 42, null, undefined].some(isGlassColor)).toBe(false)
    const accent = SHELL_ACCENTS[0]
    for (const scheme of SCHEMES) {
      const unstated = tokensFor({ ...shellPreset(accent), material: 'glass' }, scheme, SHELL_TONE)
      const bad = { ground: '#0c111d', sheet: 'rgba(26, 32, 44, 0.94)', float: 42 }
      expect(tokensFor(shellGlass(accent, { dark: bad, light: bad }), scheme, SHELL_TONE)).toEqual(unstated)
      expect(tokensFor(shellGlass(accent, { dark: {}, light: {} }), scheme, SHELL_TONE)).toEqual(unstated)
      // Each level alone: only its own variable is added, and what opens over the page is named only with the float.
      const only = (key: 'ground' | 'sheet' | 'float') => tokensFor(shellGlass(accent, { dark: { [key]: SHELL_GLASS.dark[key] }, light: { [key]: SHELL_GLASS.light[key] } }), scheme, SHELL_TONE)
      expect(Object.keys(only('ground').shape).filter((k) => k.startsWith('--glass'))).toEqual([GLASS_GROUND])
      expect(parts(only('ground').shape[GLASS_GROUND]!).tint).toBe(parts(SHELL_GLASS[scheme].ground).tint)
      expect(only('sheet').shape[GLASS_GROUND]).toBe(unstated.shape[GLASS_GROUND])
      expect(Object.keys(only('sheet').shape).filter((k) => k.startsWith('--glass')).sort()).toEqual([GLASS_GROUND, GLASS_SHEET].sort())
      expect(only('sheet').attributes).not.toHaveProperty('data-float')
      expect(Object.keys(only('float').shape).filter((k) => k.startsWith('--glass')).sort()).toEqual([GLASS_FLOAT, GLASS_GROUND].sort())
      expect(only('float').attributes).toMatchObject({ 'data-float': 'glass' })
    }
  })

  test('stated glass is read only under `material: glass`, and changes no colour', () => {
    for (const scheme of SCHEMES) {
      for (const accent of SHELL_ACCENTS) {
        const plain = tokensFor(shellPreset(accent), scheme, SHELL_TONE)
        const { material: _material, ...solid } = shellGlass(accent)
        expect(tokensFor(solid, scheme, SHELL_TONE), accent.id).toEqual(plain)
        expect(tokensFor({ ...solid, material: 'solid' }, scheme, SHELL_TONE), accent.id).toEqual(plain)
        expect(tokensFor(shellGlass(accent), scheme, SHELL_TONE).colors, accent.id).toEqual(plain.colors)
      }
    }
  })

  test('it stays with the user\'s own accent, and goes with the user\'s own page: the engine computes the ground of that one', () => {
    const theme = shellGlass(SHELL_ACCENTS[0])
    for (const scheme of SCHEMES) {
      const accent = themeTokens(theme, scheme, { accent: '#4452c4' })
      for (const [key, variable] of SURFACES) expect(parts(accent.shape[variable]!).tint, `${scheme} ${key}`).toBe(parts(SHELL_GLASS[scheme][key]).tint)
      const page = themeTokens(theme, scheme, { accent: '#4452c4', background: 'match' })
      expect(page.attributes).toMatchObject({ 'data-material': 'glass' })
      expect(page.attributes).not.toHaveProperty('data-float')
      expect(Object.keys(page.shape).filter((k) => k.startsWith('--glass'))).toEqual([GLASS_GROUND])
    }
  })

  test('applyTheme writes the three variables and the attribute, the next theme takes them away, and another window copies them', () => {
    expect(GLASS_VARIABLES).toEqual([GLASS_GROUND, GLASS_SHEET, GLASS_FLOAT])
    for (const name of GLASS_VARIABLES) expect(THEME_VARIABLES).toContain(name)
    expect(THEME_ATTRIBUTES).toContain('data-float')
    const el = document.createElement('div')
    const other = document.createElement('div')
    const stated = shellGlass(SHELL_ACCENTS[0])
    applyTheme(el, { theme: stated, scheme: 'dark' })
    const tokens = tokensFor(stated, 'dark')
    expect(el.getAttribute('data-float')).toBe('glass')
    for (const name of GLASS_VARIABLES) expect(el.style.getPropertyValue(name), name).toBe(tokens.shape[name])
    copyTheme(el, other)
    expect(other.getAttribute('data-float')).toBe('glass')
    for (const name of GLASS_VARIABLES) expect(other.style.getPropertyValue(name), name).toBe(tokens.shape[name])
    // A glass theme that states nothing keeps the ground only; a solid one keeps none.
    applyTheme(el, { theme: { ...shellPreset(SHELL_ACCENTS[0]), material: 'glass' }, scheme: 'dark' })
    expect(el.hasAttribute('data-float')).toBe(false)
    expect(el.style.getPropertyValue(GLASS_GROUND)).not.toBe('')
    expect(el.style.getPropertyValue(GLASS_SHEET)).toBe('')
    expect(el.style.getPropertyValue(GLASS_FLOAT)).toBe('')
    applyTheme(el, { theme: shellPreset(SHELL_ACCENTS[0]), scheme: 'dark' })
    for (const name of GLASS_VARIABLES) expect(el.style.getPropertyValue(name), name).toBe('')
    copyTheme(el, other)
    expect(other.hasAttribute('data-float')).toBe(false)
    for (const name of GLASS_VARIABLES) expect(other.style.getPropertyValue(name), name).toBe('')
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
  // The clear material's one rule (test/clear-material.test.ts) is the page's own, not glass: it is set apart here.
  const CLEAR_RULE = /:root\[data-material="clear"\],\s*:root\[data-material="clear"\] body \{[^}]*\}/
  const css = unlayered(themeCss).replace(CLEAR_RULE, '')
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
    expect(themeCss.replace(/\/\*[\s\S]*?\*\//g, '').replace(CLEAR_RULE, '').split('data-material').length - 1).toBe(block.split('data-material').length - 1)
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
    // The work area is the paper unless the palette states its glass.
    expect(of(':root[data-material="glass"] [data-slot="app-shell-work"]')).toBe(`background-color: var(${GLASS_SHEET}, var(--color-paper));`)
  })

  test('what opens over the page stays as it is unless the palette states its glass: one rule, under `data-float`, and the toolkit draws no blur', () => {
    const FRAME = ['app-shell', 'app-shell-work', 'sidebar', 'title-bar']
    // Menus, lists, popovers and dialogs: each paints the raised sheet. Sheets, the drawer, notices and hints are not here.
    const FLOAT = ['combobox-content', 'date-field-content', 'dialog-content', 'dropdown-menu-content', 'dropdown-menu-sub-content', 'popover-content', 'select-content']
    const slotsOf = (text: string) => [...new Set([...text.matchAll(/data-slot="([a-z-]+)"/g)].map((m) => m[1]!))].sort()
    const floating = rules.filter((rule) => rule.selectors.some((selector) => selector.includes('data-float')))
    expect(floating).toHaveLength(1)
    expect(floating[0]!.selectors).toHaveLength(1)
    expect(floating[0]!.selectors[0]).toMatch(/^:root\[data-material="glass"\]\[data-float="glass"\] :is\(/)
    expect(floating[0]!.body).toBe(`background-color: var(${GLASS_FLOAT}, var(--color-raised));`)
    expect(slotsOf(floating[0]!.selectors[0]!)).toEqual(FLOAT)
    // Every other rule names the frame's slots only: without `data-float` nothing that opens over the page is touched.
    expect(slotsOf(rules.filter((rule) => !floating.includes(rule)).map((rule) => rule.selectors.join(' ')).join(' '))).toEqual(FRAME)
    expect(themeCss.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/backdrop-filter|blur\(/)
  })
})
