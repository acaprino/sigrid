// @vitest-environment node
// The theme engine on all themes, in light and in dark: the same contrast rules that `contrast.test.ts` asks of
// every palette of `theme.css`, plus those of the filled sidebar, the selected item, the text on red and the filled button
// in the dark. The contrast is computed here with its own formula, not with the engine's.
import { describe, expect, test } from 'vitest'
import { DEFAULT_FONT, DEFAULT_SHAPE, FONTS, SHAPE_RADII, THEME_SHAPES, isThemeShape } from '../src/theme-catalog'
import type { ThemeDef } from '../src/theme-catalog'
import { DEFAULT_THEME, THEMES, themeTokens } from './fixtures/sample-themes'
import type { ThemeId } from './fixtures/sample-themes'
import { DEFAULT_TONE_INTENSITY, DEFAULT_TONE_LIGHT, FIXED, STATUS, fromHex, isAccentColor, ownTheme, pickTextStep, presetTone, themeTone, toHex, tokensFor } from '../src/theme-engine'
import { PALETTE_COMBOS, paletteTheme } from '../src/palette'
import type { OwnTheme, ThemeTone } from '../src/theme-engine'
import { palettes } from './theme-tokens'
import { contrast, luminance } from './helpers'

const mix = (fg: string, bg: string, alpha: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')

/**
 * The labels of a `Note`'s actions, `outline` (the ink) and `ghost` (the soft ink), as text at 4.5:1 on the four fills
 * (the soft fill of success, warning and red, and the quiet fill, the ink at 6%, over each background); under the
 * pointer each lays its quiet fill (the ink at 4% and 6%) on the note's, with the ink as its label.
 */
const noteActionsHold = (t: Readonly<Record<string, string>>, backgrounds: readonly string[], at: string) => {
  const fills = [t['success-soft']!, t['warning-soft']!, t['destructive-soft']!, ...backgrounds.map((bg) => mix(t['ink']!, bg, 0.06))]
  for (const fill of fills) {
    expect(contrast(t['ink']!, fill), `${at}: outline label (ink) on the note ${fill}`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['ink-soft']!, fill), `${at}: ghost label (ink-soft) on the note ${fill}`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['ink']!, mix(t['ink']!, fill, 0.04)), `${at}: outline label under the pointer on the note ${fill}`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['ink']!, mix(t['ink']!, fill, 0.06)), `${at}: ghost label under the pointer on the note ${fill}`).toBeGreaterThanOrEqual(AA)
  }
}

const SCHEMES = ['light', 'dark'] as const
const CASES = THEMES.flatMap((t) => SCHEMES.map((scheme) => [`${t.id} ${scheme === 'light' ? 'light' : 'dark'}`, t.id, scheme] as const))
const AA = 4.5

test('adjacent tones have distinct surface lightness after rendering in both schemes', () => {
  const presets = THEMES.filter(t => ['neutro', 'nord', 'catppuccin', 'rosepine', 'everforest'].includes(t.id))
  const generated = PALETTE_COMBOS.map(combo => paletteTheme({ seed: '#ee832e', combo }))
  for (const theme of [...presets, ...generated]) for (const scheme of SCHEMES) {
    const steps = (['calm', 'balanced', 'vivid'] as const).map(tone => tokensFor(theme, scheme, presetTone(tone)).colors)
    for (const [low, high] of [[steps[0]!, steps[1]!], [steps[1]!, steps[2]!]] as const) {
      const lightness = (c: Record<string, string>, role: string) => fromHex(c[role]!).L
      const name = theme.label + ' ' + scheme
      expect(lightness(low, 'sidebar-paper') - lightness(high, 'sidebar-paper'), name).toBeGreaterThan(0.01)
      const selectionStep = lightness(high, 'selected') - lightness(low, 'selected')
      expect(scheme === 'light' ? -selectionStep : selectionStep, name).toBeGreaterThan(0.025)
      expect(low['primary'], name).not.toBe(high['primary'])
    }
    for (const c of steps) {
      expect(contrast(c['primary']!, c['primary-foreground']!)).toBeGreaterThanOrEqual(AA)
      expect(contrast(c['sidebar-selected']!, c['sidebar-selected-ink']!)).toBeGreaterThanOrEqual(AA)
    }
  }
})

describe('the catalog', () => {
  test('16 calm themes aimed at focus, work, calm and study, then 10 with a strong accent, the last 4 in two colors, and 8 curated palettes; Neutral is the default and there are 4 palette profiles', () => {
    expect(THEMES).toHaveLength(34)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(34)
    expect(new Set(THEMES.map((t) => t.label)).size).toBe(34)
    expect(DEFAULT_THEME).toBe('neutro')
    expect(THEMES[0].id).toBe('neutro')
    for (const gone of ['carta', 'corallo', 'rosa', 'prugna']) expect(THEMES.map((t) => t.id)).not.toContain(gone)
    for (const added of ['notte', 'seppia', 'oliva']) expect(THEMES.map((t) => t.id)).toContain(added)
    const defs: readonly ThemeDef[] = THEMES
    // The calm themes come first, all with the quiet sidebar; the strong ones follow, and two of them have the filled sidebar.
    expect(defs.slice(0, 16).every((t) => t.fill === undefined && t.sidebar === 'tenue')).toBe(true)
    expect(defs.filter((t) => t.fill !== undefined).map((t) => t.id)).toEqual(['elettrico', 'fucsia', 'ultravioletto', 'arancio', 'smeraldo', 'segnale', 'ottanio', 'glicine', 'diario', 'blasone'])
    expect(defs.filter((t) => t.surfaces !== undefined).map((t) => t.id)).toEqual(['nord', 'rosepine', 'catppuccin', 'gruvbox', 'solarized', 'tokyonight', 'everforest', 'dracula'])
    expect(defs.filter((t) => t.sidebar === 'piena').map((t) => t.id)).toEqual(['ultravioletto', 'segnale', 'blasone'])
    // A two-color theme always has a strong fill: the second color is the calm one, for the selected item.
    expect(defs.filter((t) => t.second !== undefined).map((t) => t.id)).toEqual(['ottanio', 'glicine', 'diario', 'blasone'])
    expect(defs.filter((t) => t.second !== undefined).every((t) => t.fill !== undefined && t.second![1] !== t.accent[1])).toBe(true)
    for (const t of THEMES) expect(['mono', 'calm', 'crisp', 'soft'], t.id).toContain(t.palette)
  })

  test('in light the page is a cool near-white and the sidebar a clear step below it, in the theme\'s tint (Neutral and Ink apart)', () => {
    const spread = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return Math.max(...ch) - Math.min(...ch)
    }
    const defs: readonly ThemeDef[] = THEMES
    for (const t of defs.filter((x) => x.surfaces === undefined)) {
      const c = themeTokens(t.id as ThemeId, 'light').colors
      // A near-white, never pure white (2026-11-19: "il bianco puro acceca"): light, cool (blue not below red; it was a
      // cream until 2026-11-22), a trace of tint.
      expect(c['paper'], t.id).not.toBe('#ffffff')
      expect(luminance(c['paper']!), t.id).toBeGreaterThan(0.9)
      expect(parseInt(c['paper']!.slice(5, 7), 16), t.id).toBeGreaterThanOrEqual(parseInt(c['paper']!.slice(1, 3), 16))
      expect(spread(c['paper']!), t.id).toBeLessThanOrEqual(16)
      if (t.sidebar === 'tenue') {
        expect(contrast(c['paper']!, c['sidebar-paper']!), `${t.id}: page and sidebar apart`).toBeGreaterThanOrEqual(1.12)
        if (t.id !== 'neutro' && t.id !== 'inchiostro') expect(spread(c['sidebar-paper']!), `${t.id}: tinted sidebar`).toBeGreaterThanOrEqual(8)
        // The selected item still stands out on the sidebar.
        expect(contrast(c['sidebar-paper']!, c['sidebar-selected']!), `${t.id}: selected item`).toBeGreaterThanOrEqual(1.08)
      }
    }
  })

  test('a strong accent is a vivid fill, far more saturated than the calm ones, in light and in dark', () => {
    const saturation = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return (Math.max(...ch) - Math.min(...ch)) / 255
    }
    const defs: readonly ThemeDef[] = THEMES
    for (const scheme of SCHEMES) {
      // As the theme was designed: the default tone (R11, Vivid) moves every fill alike.
      for (const t of defs.filter((x) => x.fill !== undefined)) expect(saturation(themeTokens(t.id as ThemeId, scheme, null, { intensity: 'theme', light: 'theme' }).colors['primary']!), `${t.id} ${scheme}`).toBeGreaterThanOrEqual(0.6)
    }
  })

  test('13 fonts from the sketch, Inter first, Lexend included; IBM Plex Sans is the default; every stack ends with a system fallback', () => {
    expect(FONTS).toHaveLength(13)
    expect(FONTS[0].id).toBe('inter')
    expect(DEFAULT_FONT).toBe('plex')
    expect(FONTS.find((f) => f.id === DEFAULT_FONT)!.stack).toMatch(/^"IBM Plex Sans", "Inter", /)
    expect(FONTS.map((f) => f.label)).toContain('Lexend')
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(13)
    for (const f of FONTS) expect(f.stack, f.id).toMatch(/(sans-serif|serif|monospace)$/)
  })

  test('the engine is pure: the same theme always gives the same values', () => {
    expect(themeTokens('grafite', 'dark')).toEqual(themeTokens('grafite', 'dark'))
  })

  test('an unknown theme is an error, not a random theme', () => {
    // @ts-expect-error: id outside the catalog
    expect(() => themeTokens('carta', 'light')).toThrow()
    // @ts-expect-error: scheme outside the two
    expect(() => themeTokens('neutro', 'gray')).toThrow()
  })

  test('light and dark write the same variables', () => {
    for (const t of THEMES) {
      expect(Object.keys(themeTokens(t.id, 'dark').colors).sort(), t.id).toEqual(Object.keys(themeTokens(t.id, 'light').colors).sort())
      expect(Object.keys(themeTokens(t.id, 'dark').shape).sort(), t.id).toEqual(Object.keys(themeTokens(t.id, 'light').shape).sort())
    }
  })
})

describe.each(CASES)('%s', (_name, themeId, scheme) => {
  const tk = themeTokens(themeId, scheme)
  const t = tk.colors
  const own = tk.attributes['data-sidebar'] === 'own'
  // The backgrounds of the content text; the sidebar counts only when it has no colors of its own.
  const BG = ['paper', 'paper-2', 'raised', ...(own ? [] : ['sidebar-paper'])].map((k) => t[k]!)
  const SEMANTIC = ['background', 'popover'].map((k) => t[k]!)

  test('declares every color token of theme.css, as #rrggbb', () => {
    for (const k of Object.keys(palettes().light)) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/)
    for (const k of ['destructive-foreground', 'selected', 'selected-ink', 'sidebar-ink', 'sidebar-mute', 'sidebar-selected', 'sidebar-selected-ink', 'sidebar-accent', 'sidebar-accent-ink']) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('text: ink and muted hold on every background, with a clear step between the levels', () => {
    for (const bg of [...BG, ...SEMANTIC]) expect(contrast(t['ink-mute']!, bg)).toBeGreaterThanOrEqual(AA)
    for (const bg of BG) {
      expect(contrast(t['ink']!, bg)).toBeGreaterThanOrEqual(7)
      expect(contrast(t['ink-soft']!, bg) - contrast(t['ink-mute']!, bg)).toBeGreaterThanOrEqual(1.5)
      expect(contrast(t['ink']!, bg) - contrast(t['ink-soft']!, bg)).toBeGreaterThanOrEqual(3)
    }
    expect(t['muted-foreground']).toBe(t['ink-mute'])
  })

  test('accent: as text on every background and on its soft background; the filled button holds at rest and on hover, which can be seen', () => {
    for (const bg of [...BG, t['accent-soft']!]) expect(contrast(t['accent']!, bg), 'accent on ' + bg).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['primary-foreground']!, t['primary']!)).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['primary-foreground']!, t['accent-hover']!)).toBeGreaterThanOrEqual(AA)
    // Hover darkens the fill; a fill that is nearly black has no darker step to show, so it lightens instead. Either
    // way the step can be seen: the two are never the same colour.
    if (luminance(t['primary']!) < 0.02) expect(luminance(t['accent-hover']!)).toBeGreaterThan(luminance(t['primary']!) * 1.5)
    else expect(luminance(t['accent-hover']!)).toBeLessThan(luminance(t['primary']!))
  })

  test('the solid fill is visible even without a label (timeline bars, calendar “today”): 3:1 on every background (WCAG 1.4.11)', () => {
    for (const k of ['paper', 'paper-2', 'raised', ...(own ? [] : ['sidebar-paper'])]) {
      expect(contrast(t['primary']!, t[k]!), 'primary on ' + k).toBeGreaterThanOrEqual(3)
    }
    // And the label on the fill stays at 4.5:1: both thresholds together.
    expect(contrast(t['primary-foreground']!, t['primary']!)).toBeGreaterThanOrEqual(AA)
  })

  test('the filled button has a light label (except Ink in the dark, which is a light button with a dark label); a strong accent takes the label that reads better', () => {
    const def: ThemeDef = THEMES.find((x) => x.id === themeId)!
    const mono = def.accent[0] === 0
    if (def.fill || def.surfaces) {
      // The fill is its own color, never the accent as text, and the accent as text reads where the fill would not.
      if (def.fill) expect(t['primary']).not.toBe(t['accent'])
      const label = t['primary-foreground']!
      expect(luminance(label) > 0.8 || luminance(label) < 0.02, label).toBe(true)
      return
    }
    if (scheme === 'dark' && mono) {
      expect(luminance(t['primary']!)).toBeGreaterThan(luminance(t['primary-foreground']!))
      return
    }
    // R11 (2026-11-20): with the default tone (Vivid) a livelier fill may take the dark label, the one that reads better.
    const label = t['primary-foreground']!
    expect(luminance(label) > 0.8 || luminance(label) < 0.02, label).toBe(true)
    expect(contrast(label, t['primary']!)).toBeGreaterThanOrEqual(4.5)
    // R11 (2026-11-20): by default (Vivid) the fill is a livelier tone of the accent; as designed it is the accent itself.
    if (scheme === 'light') {
      const designed = themeTokens(themeId as ThemeId, 'light', null, { intensity: 'theme', light: 'theme' }).colors
      expect(designed['primary']).toBe(designed['accent'])
    }
    // In the dark the fill is a deeper tone of the accent, which as text stays light.
    else expect(luminance(t['primary']!)).toBeLessThan(luminance(t['accent']!))
  })

  test('status: success and warning read on every background and on their soft one; the ink reads on the highlight', () => {
    const fixed = tk.scheme === 'light' ? STATUS.light : STATUS.dark
    for (const name of ['success', 'warning'] as const) {
      expect(t[`${name}-soft`]).toBe(fixed[`${name}-soft`])
      // A theme may move the colour just enough to hold on its own surfaces: the lightness only.
      if (!(THEMES.find((x) => x.id === themeId)! as ThemeDef).surfaces) expect(t[name]).toBe(fixed[name])
      expect(contrast(t[name]!, t[`${name}-soft`]!), `${name} on its soft`).toBeGreaterThanOrEqual(AA)
      for (const bg of BG) expect(contrast(t[name]!, bg), `${name} on ${bg}`).toBeGreaterThanOrEqual(AA)
    }
    expect(contrast(t['ink']!, t['highlight']!), 'ink on highlight').toBeGreaterThanOrEqual(7)
    // The highlight is seen on every background it can sit on.
    for (const bg of BG) expect(t['highlight'], `highlight on ${bg}`).not.toBe(bg)
  })

  test('a Note: its text (the ink) and the labels of its actions read on the soft fill of each tone and on the quiet fill over every background; its icon and the focus ring of its buttons show on them', () => {
    // The icon and the title of a tone are its colour on its soft fill: asserted above (status) and below (red).
    // Information has no status colour: its icon is the soft ink, on the quiet fill.
    const quiet = BG.map((bg) => mix(t['ink']!, bg, 0.06))
    for (const fill of [t['success-soft']!, t['warning-soft']!, t['destructive-soft']!, ...quiet]) {
      expect(contrast(t['ink']!, fill), 'ink on ' + fill).toBeGreaterThanOrEqual(AA)
      expect(contrast(t['ring']!, fill), 'ring on ' + fill).toBeGreaterThanOrEqual(3)
    }
    noteActionsHold(t, BG, 'the theme')
  })

  test('red: the same for every theme of the scheme, and it holds on every background and with its text', () => {
    const fixed = tk.scheme === 'light' ? FIXED.light : FIXED.dark
    // A curated palette may move the red just enough to hold on its own surfaces.
    if (!(THEMES.find((x) => x.id === themeId)! as ThemeDef).surfaces) expect(t['destructive']).toBe(fixed.destructive)
    expect(t['destructive-soft']).toBe(fixed['destructive-soft'])
    expect(contrast(t['destructive']!, t['destructive-soft']!)).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['destructive-foreground']!, t['destructive']!)).toBeGreaterThanOrEqual(AA)
    for (const bg of BG) {
      expect(contrast(t['destructive']!, bg), 'destructive on ' + bg).toBeGreaterThanOrEqual(AA)
      expect(contrast(t['destructive']!, mix(t['destructive-soft']!, bg, 0.8)), 'button on hover').toBeGreaterThanOrEqual(AA)
      expect(contrast(t['destructive']!, mix(t['destructive']!, bg, 0.1)), 'highlighted menu item').toBeGreaterThanOrEqual(AA)
    }
  })

  test('controls (WCAG 1.4.11): field border and focus ring at 3:1, dividers below', () => {
    for (const bg of [...BG, ...SEMANTIC]) {
      expect(contrast(t['input']!, bg), 'input on ' + bg).toBeGreaterThanOrEqual(3)
      // R8: the ring is solid (a 2px outline), so it is measured at full strength, and it is the accent as text,
      // which reaches 4.5:1 on every background (R9).
      expect(contrast(t['ring']!, bg), 'ring on ' + bg).toBeGreaterThanOrEqual(4.5)
    }
    // A focused row that is also the selection: the ring on the selection tint.
    expect(contrast(t['ring']!, t['selected']!), 'ring on selected').toBeGreaterThanOrEqual(3)
    for (const bg of BG) {
      expect(contrast(t['line']!, bg)).toBeLessThan(3)
      expect(contrast(t['input']!, bg)).toBeGreaterThan(contrast(t['line']!, bg))
    }
    // The ink keeps the 3:1 at half strength it had when it was the ring (its values do not move).
    for (const bg of BG) expect(contrast(mix(t['ink']!, bg, 0.5), bg), 'ink/50 on ' + bg).toBeGreaterThanOrEqual(3)
    expect(t['ring']).toBe(t['accent'])
  })

  test('the sidebar and the selected item are readable', () => {
    expect(contrast(t['sidebar-ink']!, t['sidebar-paper']!)).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['sidebar-mute']!, t['sidebar-paper']!)).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['sidebar-selected-ink']!, t['sidebar-selected']!)).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['selected-ink']!, t['selected']!)).toBeGreaterThanOrEqual(AA)
    // The accent on the bar reads as text on it, and as a mark (3:1) on the selection tint.
    expect(contrast(t['sidebar-accent']!, t['sidebar-paper']!)).toBeGreaterThanOrEqual(AA)
    // A filled selection (the solid bar of a strong theme) takes its own ink inside: the bar accent does not sit on it.
    if (!own) expect(contrast(t['sidebar-accent']!, t['sidebar-selected']!)).toBeGreaterThanOrEqual(3)
    expect(contrast(t['sidebar-accent-ink']!, t['sidebar-accent']!)).toBeGreaterThanOrEqual(AA)
  })

  // The dark column (`scura`) is no catalog theme's sidebar any more, but the engine keeps it for whoever asks for it.
  const column = tokensFor({ ...THEMES.find((x) => x.id === themeId)!, sidebar: 'scura' }, scheme)
  test('the dark column, on request: near-black and sober in both schemes, text at 7:1, a lighter selected row', () => {
    const t = column.colors
    expect(luminance(t['sidebar-paper']!)).toBeLessThan(0.02)
    const ch = [1, 3, 5].map((i) => parseInt(t['sidebar-paper']!.slice(i, i + 2), 16))
    expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(12)
    expect(contrast(t['sidebar-ink']!, t['sidebar-paper']!)).toBeGreaterThanOrEqual(7)
    expect(luminance(t['sidebar-selected']!)).toBeGreaterThan(luminance(t['sidebar-paper']!))
    expect(contrast(t['sidebar-selected-ink']!, t['sidebar-selected']!)).toBeGreaterThanOrEqual(7)
  })

  test('the dark column, on request, has its own colors', () => {
    expect(column.attributes['data-sidebar']).toBe('own')
    expect(column.colors['sidebar-ink']).not.toBe(column.colors['ink-soft'])
    expect(column.colors['sidebar-selected']).not.toBe(column.colors['selected'])
    // The rest of the theme does not change with the sidebar (the fill, which holds 3:1 on the ground beside it, may).
    for (const k of ['paper', 'ink', 'accent', 'selected']) expect(column.colors[k], k).toBe(t[k])
  })

  test('the light bar (Park, every theme): the tone of the ground, the content inks, the selected row in the accent tint with a short accent bar', () => {
    const def = THEMES.find((x) => x.id === themeId)!
    // Three strong themes have the solid bar (`piena`, tested above with its own colors); every other one has this one.
    if (def.sidebar === 'piena') return
    expect(def.sidebar).toBe('tenue')
    expect(tk.attributes['data-sidebar']).toBe('shared')
    expect(t['sidebar-ink']).toBe(t['ink-soft'])
    expect(t['sidebar-mute']).toBe(t['ink-mute'])
    expect(t['sidebar-selected']).toBe(t['selected'])
    expect(t['sidebar-selected-ink']).toBe(t['selected-ink'])
    expect(t['sidebar-accent']).toBe(t['accent'])
    // A ground a step below the page in light, below it in dark too: the page reads as a sheet on it.
    expect(luminance(t['sidebar-paper']!)).toBeLessThan(luminance(t['paper']!))
    // A curated palette keeps its own sidebar color, which may sit further below.
    if ((def as ThemeDef).surfaces === undefined) expect(contrast(t['sidebar-paper']!, t['paper']!)).toBeLessThan(1.15)
  })

  test('the scheme shows: three distinct levels (sidebar/lanes, page, raised) and no mud in the dark', () => {
    const curated = (THEMES.find((x) => x.id === themeId)! as ThemeDef).surfaces !== undefined
    if (curated) {
      // A curated palette has its own surfaces (a cream sheet, a tinted dark page): the three levels stay in order.
      const up = scheme === 'light' ? 1 : -1
      expect(up * (luminance(t['paper']!) - luminance(t['ink']!))).toBeGreaterThan(0)
      expect(luminance(t['raised']!)).toBeGreaterThan(luminance(t['paper']!))
      expect(luminance(t['paper']!)).toBeGreaterThan(luminance(t['sidebar-paper']!))
      if (scheme === 'dark') expect(contrast(t['raised']!, t['paper']!)).toBeGreaterThanOrEqual(1.14)
      return
    }
    if (scheme === 'light') {
      expect(luminance(t['paper']!)).toBeGreaterThan(luminance(t['ink']!))
      // A near-white page and lighter sheets, never pure white (2026-11-19); the sidebar sits a clear step below.
      expect(t['paper']).not.toBe('#ffffff')
      expect(t['raised']).not.toBe('#ffffff')
      expect(luminance(t['raised']!)).toBeGreaterThan(luminance(t['paper']!))
      expect(luminance(t['paper']!)).toBeGreaterThan(luminance(t['sidebar-paper']!))
    } else {
      expect(luminance(t['paper']!)).toBeLessThan(luminance(t['ink']!))
      // In the dark: sidebar and lanes below the page, and the sheets («Now») stand out clearly above the page.
      expect(luminance(t['sidebar-paper']!)).toBeLessThan(luminance(t['paper']!))
      expect(luminance(t['paper-2']!)).toBeLessThanOrEqual(luminance(t['paper']!))
      expect(contrast(t['raised']!, t['paper']!)).toBeGreaterThanOrEqual(1.14)
      // No muddy or overly tinted backgrounds in the dark: the paper's RGB spread stays sober.
      const ch = [1, 3, 5].map((i) => parseInt(t['paper']!.slice(i, i + 2), 16))
      expect(Math.max(...ch) - Math.min(...ch)).toBeLessThanOrEqual(12)
    }
  })

  test('the 18 colors of areas, projects and labels adapt to the theme and hold at least 3:1 (dots) on every background', () => {
    const spread = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return Math.max(...ch) - Math.min(...ch)
    }
    for (let n = 1; n <= 18; n++) {
      const dot = t[`mark-${n}`]!
      expect(dot, `mark-${n}`).toMatch(/^#[0-9a-f]{6}$/)
      for (const bg of BG) expect(contrast(dot, bg), `mark-${n} on ${bg}`).toBeGreaterThanOrEqual(3)
      // The correction never crushes a color to black or to white: it stays a color.
      expect(luminance(dot), `${dot} is not black`).toBeGreaterThan(0.03)
      expect(luminance(dot), `${dot} is not white`).toBeLessThan(0.75)
      if (themeId === 'inchiostro') expect(spread(dot), `ink mark-${n}`).toBeLessThanOrEqual(22)
    }
  })

  test('an app can give its own radii: they replace the shape, and a bad value counts as absent', () => {
    const base = THEMES[0]!
    const own = tokensFor({ ...base, radii: { sm: 4, md: 6, lg: 8, xl: 12 } }, 'light')
    expect(own.shape).toMatchObject({ '--radius-sm': '4px', '--radius-md': '6px', '--radius-lg': '8px', '--radius-xl': '12px', '--radius-button': '6px', '--radius-chip': '6px' })
    const apart = tokensFor({ ...base, radii: { sm: 4, md: 6, lg: 8, xl: 12, button: 8, chip: 999 } }, 'light')
    expect(apart.shape).toMatchObject({ '--radius-button': '8px', '--radius-chip': '999px' })
    for (const bad of [{ sm: 4, md: 6, lg: 8 }, { sm: 4, md: 6, lg: 8, xl: 12.5 }, { sm: 4, md: 6, lg: 8, xl: -1 }, { sm: 4, md: 6, lg: 8, xl: 99 }, [4, 6, 8, 12]] as unknown as ThemeDef['radii'][]) {
      expect(tokensFor({ ...base, radii: bad }, 'light').shape).toMatchObject({ '--radius-sm': '4px', '--radius-lg': '10px', '--radius-xl': '10px' })
    }
  })

  test('the shape: Park UI\'s l1/l2/l3 corners a step rounder, 4/6/10px, round checkboxes, stroke 1.75', () => {
    expect(tk.shape).toMatchObject({ '--radius-sm': '4px', '--radius-md': '6px', '--radius-lg': '10px', '--radius-xl': '10px', '--radius-button': '6px', '--radius-chip': '6px' })
    expect(tk.shape['--radius-check']).toBe('9999px')
    expect(tk.shape['--icon-stroke']).toBe('1.75')
  })

  test('the elevation is Park UI\'s: a drop and a 1px ring, from the engine\'s `drop` color (no literal black), deeper in dark', () => {
    for (const k of ['--elevation-xs', '--elevation-sm', '--elevation-md', '--elevation-lg', '--elevation-float']) {
      expect(tk.shape[k], k).toMatch(/color-mix\(in srgb, var\(--color-drop\) \d+%, transparent\)/)
      expect(tk.shape[k], k).not.toMatch(/rgb\(|#[0-9a-f]{3,8}\b/i)
    }
    expect(t['drop']).toMatch(/^#[0-9a-f]{6}$/)
    if (scheme === 'light') expect(t['drop']).toBe(t['ink'])
    else {
      expect(luminance(t['drop']!)).toBeLessThan(luminance(t['sidebar-paper']!))
      expect(tk.shape['--elevation-md']).toContain('inset 0 0 1px color-mix(in srgb, var(--color-ink)')
    }
  })
})

describe('R9: accent text is step 11 of the palette, or step 12 where step 11 falls short', () => {
  const onWhite = (h: string) => contrast(h, '#ffffff') >= 4.5
  test('a step 11 that holds is kept', () => {
    const r = pickTextStep({ L: 0.49, C: 0.1, h: 190 }, { L: 0.39, C: 0.1, h: 190 }, onWhite)
    expect(r.step).toBe(11)
  })
  test('a light step 11 (amber, orange) gives way to step 12', () => {
    const r = pickTextStep({ L: 0.8, C: 0.15, h: 75 }, { L: 0.39, C: 0.1, h: 75 }, onWhite)
    expect(r.step).toBe(12)
    expect(onWhite(toHex(r.c))).toBe(true)
  })
  test('every theme of the engine holds at step 11, in light and dark: the accent is never moved', () => {
    for (const t of THEMES.filter((x) => (x as ThemeDef).surfaces === undefined)) for (const scheme of ['light', 'dark'] as const) expect(themeTokens(t.id, scheme).corrected, `${t.id} ${scheme}`).not.toContain('accent')
  })
})

// The user's own theme on top of a theme of the catalog: an accent, and how the page, the selected item and the
// sidebar follow from it (a rule, or a color that forces them). Whatever is chosen, the same thresholds hold.
describe('the user\'s own theme', () => {
  const OWN = ['#e34432', '#f5a623', '#9bb53a', '#2f9e6e', '#1fa3b4', '#297abc', '#4452c4', '#a35fd0', '#e5659a', '#ffffff', '#000000', '#808080', '#ffff00', '#0000ff', '#ff00ff']

  const holds = (tk: ReturnType<typeof themeTokens>, at: string) => {
    const t = tk.colors
    const own = tk.attributes['data-sidebar'] === 'own'
    const BG = ['paper', 'paper-2', 'raised', ...(own ? [] : ['sidebar-paper'])].map((k) => t[k]!)
    for (const bg of [...BG, t['accent-soft']!]) expect(contrast(t['accent']!, bg), `${at}: accent on ${bg}`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['primary-foreground']!, t['primary']!), `${at}: label`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['primary-foreground']!, t['accent-hover']!), `${at}: label on hover`).toBeGreaterThanOrEqual(AA)
    for (const bg of BG) {
      expect(contrast(t['primary']!, bg), `${at}: fill on ${bg}`).toBeGreaterThanOrEqual(3)
      expect(contrast(t['ink-mute']!, bg), `${at}: muted text on ${bg}`).toBeGreaterThanOrEqual(AA)
      expect(contrast(t['ink']!, bg), `${at}: text on ${bg}`).toBeGreaterThanOrEqual(7)
      expect(contrast(t['input']!, bg), `${at}: field border on ${bg}`).toBeGreaterThanOrEqual(3)
      expect(contrast(t['destructive']!, bg), `${at}: red on ${bg}`).toBeGreaterThanOrEqual(AA)
      for (let n = 1; n <= 18; n++) expect(contrast(t[`mark-${n}`]!, bg), `${at}: mark-${n} on ${bg}`).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(t['selected-ink']!, t['selected']!), `${at}: selected item`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['ink-mute']!, t['selected']!), `${at}: muted text on the selected item`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['sidebar-ink']!, t['sidebar-paper']!), `${at}: sidebar text`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['sidebar-mute']!, t['sidebar-paper']!), `${at}: sidebar muted text`).toBeGreaterThanOrEqual(AA)
    expect(contrast(t['sidebar-selected-ink']!, t['sidebar-selected']!), `${at}: selected item of the sidebar`).toBeGreaterThanOrEqual(AA)
    noteActionsHold(t, BG, at)
  }

  test('only a #rrggbb counts as a color: anything else leaves the theme as it is', () => {
    expect(isAccentColor('#12abEF')).toBe(true)
    for (const no of ['red', '#fff', '#12345g', '', null, undefined, 7]) expect(isAccentColor(no), String(no)).toBe(false)
    expect(themeTokens('neutro', 'light', 'red')).toEqual(themeTokens('neutro', 'light'))
    expect(themeTokens('neutro', 'light', null)).toEqual(themeTokens('neutro', 'light'))
    // @ts-expect-error: without an accent there is no own theme
    expect(themeTokens('neutro', 'light', { background: 'match' })).toEqual(themeTokens('neutro', 'light'))
  })

  test('a saved value keeps only what is valid, and the defaults are not written', () => {
    expect(ownTheme('#ABCDEF')).toEqual({ accent: '#abcdef' })
    expect(ownTheme({ accent: '#abcdef', background: 'theme', tint: 'medium', second: 'accent', sidebar: 'theme' })).toEqual({ accent: '#abcdef' })
    expect(ownTheme({ accent: '#abcdef', background: 'match', tint: 'strong', second: '#112233', sidebar: 'dark' })).toEqual({ accent: '#abcdef', background: 'match', tint: 'strong', second: '#112233', sidebar: 'dark' })
    expect(ownTheme({ accent: '#abcdef', background: 'plaid', tint: '#112233', second: 7, sidebar: 'left', toString: 1 })).toEqual({ accent: '#abcdef' })
    for (const no of [null, undefined, 7, 'red', {}, { accent: 'red' }, { background: 'match' }]) expect(ownTheme(no), JSON.stringify(no)).toBeNull()
  })

  test('with the page left to the theme only the accent changes: the chosen color is the fill when it already holds', () => {
    const own = themeTokens('neutro', 'light', '#4452c4').colors
    const plain = themeTokens('neutro', 'light').colors
    expect(own['primary']).toBe('#4452c4')
    expect(own['accent']).not.toBe(plain['accent'])
    expect(own['selected']).not.toBe(plain['selected'])
    for (const k of ['paper', 'paper-2', 'sidebar-paper', 'raised', 'ink', 'line']) expect(own[k], k).toBe(plain[k])
    expect(themeTokens('neutro', 'light', { accent: '#4452c4' })).toEqual(themeTokens('neutro', 'light', '#4452c4'))
    // On a curated palette too.
    expect(themeTokens('nord', 'dark', '#f5a623').colors['primary']).toBe('#f5a623')
    expect(themeTokens('nord', 'dark', '#f5a623').colors['paper']).toBe(themeTokens('nord', 'dark').colors['paper'])
  })

  const hueOf = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
    const max = Math.max(r, g, b)
    const d = max - Math.min(r, g, b)
    if (d === 0) return null
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return (h * 60 + 360) % 360
  }
  const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

  test('the page follows the accent: its hue, the opposite one, or a gray; a stronger tint is more tinted', () => {
    const spread = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return Math.max(...ch) - Math.min(...ch)
    }
    const blue = '#297abc'
    for (const scheme of SCHEMES) {
      const side = (own: OwnTheme) => themeTokens('neutro', scheme, own).colors['sidebar-paper']!
      const match = side({ accent: blue, background: 'match', tint: 'strong' })
      const complement = side({ accent: blue, background: 'complement', tint: 'strong' })
      expect(apart(hueOf(match)!, hueOf(blue)!), `${scheme}: matched`).toBeLessThan(40)
      expect(apart(hueOf(complement)!, hueOf(blue)!), `${scheme}: complementary`).toBeGreaterThan(120)
      expect(spread(side({ accent: blue, background: 'neutral' })), `${scheme}: neutral`).toBe(0)
      expect(spread(side({ accent: blue, background: 'match', tint: 'soft' }))).toBeLessThan(spread(match))
      // A gray accent has no hue to follow: the page is a gray.
      expect(spread(side({ accent: '#808080', background: 'match', tint: 'strong' }))).toBe(0)
    }
  })

  test('a forced color is the page: a light one in light, a dark one in dark, and the other scheme takes its hue', () => {
    expect(themeTokens('neutro', 'light', { accent: '#297abc', background: '#fff5e0' }).colors['paper']).toBe('#fff5e0')
    expect(themeTokens('neutro', 'dark', { accent: '#297abc', background: '#1e1e2e' }).colors['paper']).toBe('#1e1e2e')
    const dark = themeTokens('neutro', 'dark', { accent: '#297abc', background: '#fff5e0' }).colors['paper']!
    const light = themeTokens('neutro', 'light', { accent: '#297abc', background: '#1e1e2e' }).colors['paper']!
    expect(luminance(dark)).toBeLessThan(0.05)
    expect(luminance(light)).toBeGreaterThan(0.85)
    expect(apart(hueOf(light)!, hueOf('#1e1e2e')!)).toBeLessThan(40)
  })

  test('the selected item: the accent\'s hue, the opposite one, or a forced color', () => {
    const sel = (second?: OwnTheme['second']) => themeTokens('neutro', 'light', { accent: '#297abc', ...(second ? { second } : {}) }).colors['selected']!
    expect(apart(hueOf(sel())!, hueOf('#297abc')!)).toBeLessThan(40)
    expect(apart(hueOf(sel('complement'))!, hueOf('#297abc')!)).toBeGreaterThan(120)
    expect(apart(hueOf(sel('#2f9e6e'))!, hueOf('#2f9e6e')!)).toBeLessThan(40)
  })

  test('the sidebar: dark with the selected item filled in the accent, or light, whatever the theme', () => {
    const dark = themeTokens('neutro', 'light', { accent: '#4452c4', sidebar: 'dark' })
    expect(dark.attributes['data-sidebar']).toBe('own')
    expect(luminance(dark.colors['sidebar-paper']!)).toBeLessThan(0.05)
    expect(dark.colors['sidebar-selected']).toBe(dark.colors['primary'])
    const light = themeTokens('ultravioletto', 'light', { accent: '#4452c4', sidebar: 'light' })
    expect(light.attributes['data-sidebar']).toBe('shared')
    expect(luminance(light.colors['sidebar-paper']!)).toBeGreaterThan(0.7)
    // A derived page with a dark sidebar too.
    expect(themeTokens('neutro', 'light', { accent: '#4452c4', background: 'match', sidebar: 'dark' }).attributes['data-sidebar']).toBe('own')
  })

  test.each(THEMES.map((t) => t.id))('%s: every accent holds the thresholds, in light and in dark', (themeId) => {
    for (const scheme of SCHEMES) for (const color of OWN) holds(themeTokens(themeId, scheme, color), `${color} ${scheme}`)
  })

  const BACKGROUNDS: readonly NonNullable<OwnTheme['background']>[] = ['match', 'complement', 'neutral', '#fff5e0', '#1e1e2e', '#ff0000', '#00ff88', '#808080']
  const SECONDS: readonly NonNullable<OwnTheme['second']>[] = ['accent', 'complement', 'analogous', '#297abc']
  test.each(BACKGROUNDS)('page %s: every rule and every forced color holds the thresholds, with every sidebar', (background) => {
    let n = 0
    for (const themeId of ['neutro', 'nord', 'ultravioletto'] as const) {
      for (const scheme of SCHEMES) {
        for (const sidebar of ['theme', 'light', 'dark'] as const) {
          for (const accent of OWN) {
            const own: OwnTheme = { accent, background, sidebar, tint: (['soft', 'medium', 'strong'] as const)[n % 3]!, second: SECONDS[n % SECONDS.length]! }
            n++
            holds(themeTokens(themeId, scheme, own), `${themeId} ${scheme} ${JSON.stringify(own)}`)
          }
        }
      }
    }
    }, 30_000)

  // The tone: the same hues, more or less saturated, lighter or darker, on any theme and with the user's own colors too.
  const chroma = (hex: string) => {
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return Math.max(...ch) - Math.min(...ch)
  }
  const marks = (tk: ReturnType<typeof themeTokens>) => Array.from({ length: 18 }, (_, i) => tk.colors[`mark-${i + 1}`]!)
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  test('a tone read from anywhere keeps only what is valid; with nothing chosen there is none, and «as designed» is a choice', () => {
    expect(themeTone({ intensity: 'vivid', light: 'darker' })).toEqual({ intensity: 'vivid', light: 'darker' })
    expect(themeTone({ intensity: 'theme', light: 'lighter' })).toEqual({ intensity: 'theme', light: 'lighter' })
    expect(themeTone({ intensity: 'theme', light: 'theme' })).toEqual({ intensity: 'theme', light: 'theme' })
    for (const no of [null, undefined, 'vivid', 7, {}, { intensity: 'neon', light: 3 }]) expect(themeTone(no), JSON.stringify(no)).toBeNull()
    // R11 (2026-11-20): no tone chosen is the default, Vivid with the lightness as designed; «as designed» moves nothing.
    expect([DEFAULT_TONE_INTENSITY, DEFAULT_TONE_LIGHT]).toEqual(['vivid', 'theme'])
    expect(themeTokens('neutro', 'light')).toEqual(themeTokens('neutro', 'light', null, { intensity: 'vivid', light: 'theme' }))
    expect(themeTokens('neutro', 'light', null, { intensity: 'theme', light: 'theme' }).colors['primary']).not.toBe(themeTokens('neutro', 'light').colors['primary'])
  })

  test('the intensity orders the colors from faded to vivid: areas and projects, the fill, the selected item; the page stays', () => {
    for (const scheme of SCHEMES) {
      const at = (intensity?: ThemeTone['intensity']) => themeTokens('professionale', scheme, null, { intensity: intensity ?? 'theme' })
      const steps = [at('faded'), at('soft'), at(), at('bright'), at('vivid')]
      const saturation = steps.map((tk) => mean(marks(tk).map(chroma)))
      for (let i = 1; i < steps.length; i++) expect(saturation[i]!, `${scheme}: marks, step ${i}`).toBeGreaterThan(saturation[i - 1]!)
      expect(chroma(at('vivid').colors['primary']!), `${scheme}: fill`).toBeGreaterThan(chroma(at('faded').colors['primary']!))
      expect(chroma(at('vivid').colors['selected']!), `${scheme}: selected item`).toBeGreaterThan(chroma(at('faded').colors['selected']!))
      for (const k of ['paper', 'raised', 'ink', 'line']) expect(at('vivid').colors[k], k).toBe(at().colors[k])
      // The sidebar and lanes deepen in both schemes. Even a near-gray has visible steps.
      for (const k of ['paper-2', 'sidebar-paper']) {
        if (scheme === 'light') expect(chroma(at('vivid').colors[k]!), k).toBeGreaterThan(chroma(at('faded').colors[k]!))
        expect(luminance(at('vivid').colors[k]!), k).toBeLessThan(luminance(at('faded').colors[k]!))
      }
    }
  })

  test('lighter and darker move the colors as far as readability allows: darker in light and lighter in dark are always seen', () => {
    const lumOf = (tk: ReturnType<typeof themeTokens>) => mean(marks(tk).map(luminance))
    const at = (scheme: 'light' | 'dark', light?: ThemeTone['light']) => themeTokens('professionale', scheme, null, { light: light ?? 'theme' })
    expect(lumOf(at('light', 'darker'))).toBeLessThan(lumOf(at('light')))
    expect(lumOf(at('dark', 'lighter'))).toBeGreaterThan(lumOf(at('dark')))
    // Toward the page the colors stop where they would no longer stand out: never the wrong way.
    expect(lumOf(at('light', 'lighter'))).toBeGreaterThanOrEqual(lumOf(at('light')))
    expect(lumOf(at('dark', 'darker'))).toBeLessThanOrEqual(lumOf(at('dark')))
    expect(luminance(at('light', 'lighter').colors['primary']!)).toBeGreaterThan(luminance(at('light', 'darker').colors['primary']!))
    expect(luminance(at('dark', 'lighter').colors['primary']!)).toBeGreaterThan(luminance(at('dark', 'darker').colors['primary']!))
  })

  const TONES: readonly ThemeTone[] = [
    ...(['faded', 'soft', 'bright', 'vivid'] as const).map((intensity) => ({ intensity })),
    ...(['lighter', 'darker'] as const).map((light) => ({ light })),
    ...(['faded', 'soft', 'bright', 'vivid'] as const).flatMap((intensity) => (['lighter', 'darker'] as const).map((light) => ({ intensity, light }))),
  ]
  test.each(THEMES.map((t) => t.id))('%s: every tone holds the thresholds, in light and in dark, with the user\'s own colors too', (themeId) => {
    for (const scheme of SCHEMES) {
      for (const tone of TONES) {
        holds(themeTokens(themeId, scheme, null, tone), `${scheme} ${JSON.stringify(tone)}`)
        holds(themeTokens(themeId, scheme, { accent: '#f5a623', background: 'match', second: 'complement', sidebar: 'dark' }, tone), `${scheme} own ${JSON.stringify(tone)}`)
        holds(themeTokens(themeId, scheme, '#0000ff', tone), `${scheme} blue ${JSON.stringify(tone)}`)
      }
    }
  }, 30_000)
})

describe('the shape is a parameter of the theme (2026-11-22)', () => {
  const base: ThemeDef = { id: 'shape-test', label: 'Shape', hue: 0, chroma: 0, accent: [0, 0], sidebar: 'tenue', palette: 'mono' }
  const radii = (def: ThemeDef) => {
    const s = tokensFor(def, 'light').shape
    return [s['--radius-sm'], s['--radius-md'], s['--radius-lg'], s['--radius-xl'], s['--radius-button'], s['--radius-chip'], s['--radius-check']]
  }

  test('three presets move the three nested levels together; buttons and labels follow the middle one', () => {
    expect(radii({ ...base, shape: 'sharp' })).toEqual(['2px', '4px', '6px', '6px', '4px', '4px', '9999px'])
    expect(radii({ ...base, shape: 'soft' })).toEqual(['4px', '6px', '10px', '10px', '6px', '6px', '9999px'])
    expect(radii({ ...base, shape: 'round' })).toEqual(['6px', '10px', '14px', '14px', '10px', '10px', '9999px'])
  })

  test('without a shape, or with a value that is not one, the theme is soft', () => {
    expect(radii(base)).toEqual(radii({ ...base, shape: 'soft' }))
    expect(radii({ ...base, shape: 'pill' as never })).toEqual(radii({ ...base, shape: 'soft' }))
    expect(DEFAULT_SHAPE).toBe('soft')
    expect(THEME_SHAPES).toEqual(['sharp', 'soft', 'round'])
    expect(isThemeShape('round')).toBe(true)
    expect(isThemeShape('pill')).toBe(false)
  })

  test('every level of every shape is on the 2px step, and the levels only grow', () => {
    for (const name of THEME_SHAPES) {
      const [l1, l2, l3] = SHAPE_RADII[name]
      expect(l1 < l2 && l2 < l3, name).toBe(true)
      for (const r of [l1, l2, l3]) expect(r % 2, `${name} ${r}`).toBe(0)
    }
  })

  test('the shape changes nothing else of the theme: same colours, same stroke, same elevation', () => {
    const soft = tokensFor({ ...base, shape: 'soft' }, 'dark')
    const round = tokensFor({ ...base, shape: 'round' }, 'dark')
    expect(round.colors).toEqual(soft.colors)
    const rest = (s: Readonly<Record<string, string>>) => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('--radius-')))
    expect(rest(round.shape)).toEqual(rest(soft.shape))
  })
})
