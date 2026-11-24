/**
 * The theme engine: a theme definition (its shape is in theme-catalog.ts; the app brings its own themes), in light or in
 * dark, gives the values of all the `--color-*` tokens and of the shape variables. The starting lightness values are those of the approved sketch
 * (design/bozzetti/lista-attivita.html, `coloriDi`), the same for every theme: that is why every theme reads the same. The colors
 * are computed in OKLCH, brought back to sRGB by reducing chroma, and the contrast is guaranteed in the computation, on the final
 * hex values: a color below the threshold is darkened on light backgrounds and lightened on dark ones until
 * it gets there. Fixed, never from the theme: the destructive red and the status colours.
 * The solid button (`primary`) is the accent as a fill: in light it coincides with the accent as text, in dark it is a
 * solid and deeper tone of the accent with light text, while the accent as text (`accent`) stays light.
 * A theme with a strong accent (`fill` in its definition) has a fill of its own, vivid, in both schemes: its label is the
 * light or the dark one, whichever reads better on it, and the accent as text stays a separate, readable tone.
 */
import { COLORS } from './colors'
import { DEFAULT_DARK_DEPTH, DEFAULT_SHAPE, SHAPE_RADII, isThemeRadii, isThemeShape, themeDark, type DarkDepth, type SidebarKind, type Surfaces, type ThemeDef } from './theme-catalog'

export interface Oklch {
  readonly L: number
  readonly C: number
  readonly h: number
}

/* ———— Color ———— */

function toLinear({ L, C, h }: Oklch): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}

const inGamut = (c: Oklch) => toLinear(c).every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/** Reduces chroma until the color exists in sRGB, with the same lightness and the same hue. */
export function fit(c: Oklch): Oklch {
  const L = Math.min(1, Math.max(0, c.L))
  if (inGamut({ ...c, L })) return { ...c, L }
  let lo = 0
  let hi = c.C
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...c, L, C: mid })) lo = mid
    else hi = mid
  }
  return { L, C: lo, h: c.h }
}

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function toHex(c: Oklch): string {
  return '#' + toLinear(fit(c)).map((v) => Math.round(Math.min(1, Math.max(0, gamma(v))) * 255).toString(16).padStart(2, '0')).join('')
}

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
/** WCAG relative luminance of a `#rrggbb`. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** WCAG contrast ratio between two `#rrggbb`. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
/** `fg` with opacity `alpha` over `bg`, like a class with `/50`. */
export function over(fg: string, bg: string, alpha: number): string {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** A small margin above every threshold: rounded values and browsers must not fall below it. */
const MARGIN = 0.03
/** Under this lightness a fill is nearly black: its hover lightens, a darker step would not be seen. */
const NEAR_BLACK = 0.3

/**
 * Moves the lightness of `c` in direction `dir` (−1 darker, +1 lighter) until `ok` is true on its hex value.
 * It also returns whether it had to move it.
 */
function settle(c: Oklch, dir: -1 | 1, ok: (hex: string, c: Oklch) => boolean): { c: Oklch; moved: boolean } {
  let x = fit(c)
  let moved = false
  // It stops at the end of the scale in the direction it moves, not where it starts: black can still be lightened.
  while (!ok(toHex(x), x) && (dir > 0 ? x.L < 1 : x.L > 0)) {
    x = fit({ ...x, L: Math.min(1, Math.max(0, x.L + dir * 0.004)) })
    moved = true
  }
  return { c: x, moved }
}
/**
 * Moves the lightness of `c` in direction `dir`, in fine steps, until `want` is true, but never beyond the last point where `keep`
 * still holds: hue and chroma stay (at most reduced to fit in sRGB). If `want` is not reached before `keep`
 * breaks, it returns the last color that respects `keep` (the closest to `want`) with `met` false.
 */
function push(c: Oklch, dir: -1 | 1, keep: (hex: string, c: Oklch) => boolean, want: (hex: string, c: Oklch) => boolean): { c: Oklch; met: boolean } {
  let x = c
  for (let L = c.L + dir * 0.001; L >= 0 && L <= 1; L += dir * 0.001) {
    const y = fit({ ...c, L })
    const h = toHex(y)
    if (!keep(h, y)) break
    x = y
    if (want(h, y)) return { c: x, met: true }
  }
  return { c: x, met: false }
}
/**
 * The rule of the 12-step palettes (Park UI, Radix Colors) for text in a colour (R9): step 11, or step 12 where step 11
 * falls short of `ok`. It returns the step taken; when neither holds it returns step 12, the closer one, and the
 * caller moves it until it holds.
 */
export function pickTextStep(step11: Oklch, step12: Oklch, ok: (hex: string) => boolean): { c: Oklch; step: 11 | 12 } {
  const eleven = fit(step11)
  return ok(toHex(eleven)) ? { c: eleven, step: 11 } : { c: fit(step12), step: 12 }
}

const atLeast = (bgs: readonly string[], min: number | ((bg: string) => number)) => (hex: string) => bgs.every((bg) => contrast(hex, bg) >= (typeof min === 'number' ? min : min(bg)) + MARGIN)
/** The direction that moves a color away from this background: lighter on dark backgrounds, darker on light ones. */
const awayFrom = (bg: string): -1 | 1 => (luminance(bg) < 0.18 ? 1 : -1)

/* ———— The destructive red and the status colours: the same for every theme of the same scheme ———— */

export const FIXED = {
  light: { destructive: '#ad2a1e', 'destructive-soft': '#fef1ef' },
  dark: { destructive: '#ff9a8d', 'destructive-soft': '#3d2420' },
} as const

/**
 * The status colours, beside the red: `success` and `warning` are text colours, each with a soft background of its own;
 * `highlight` is a background for a match inside a text (a search hit), with the ink on it. They are meanings, not
 * accents: always with a word or an icon, never the only signal. The same for every theme of the same scheme; a
 * theme whose surfaces would sink one moves its lightness just enough to hold (4.5:1 for the text colours on every
 * background and on their soft one; 7:1 for the ink on the highlight).
 */
export const STATUS = {
  light: { success: '#1c6b3f', 'success-soft': '#eef8f1', warning: '#855000', 'warning-soft': '#fdf4e3', highlight: '#ffe38a' },
  dark: { success: '#7fd3a0', 'success-soft': '#1c3326', warning: '#f0b85a', 'warning-soft': '#3a2c12', highlight: '#4f3f08' },
} as const

export type ThemeScheme = 'light' | 'dark'

export interface ThemeTokens {
  /** The id of the theme definition. */
  readonly theme: string
  readonly scheme: ThemeScheme
  /** The color tokens, without `--color-`, as `#rrggbb`. */
  readonly colors: Readonly<Record<string, string>>
  /** The shape variables, with their full name (`--radius-md`). */
  readonly shape: Readonly<Record<string, string>>
  /** The root attributes that state the shape choices that are not numbers (`data-sidebar`, …). */
  readonly attributes: Readonly<Record<string, string>>
  /** The roles that the computation had to move to reach the contrast. */
  readonly corrected: readonly string[]
}

const ok = (L: number, C: number, h: number): Oklch => ({ L, C, h })

export function fromHex(hex: string): Oklch {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

/** How intense the colors are, from washed out to as saturated as the screen allows; `theme` is as the theme was designed. */
export const TONE_INTENSITIES = ['faded', 'soft', 'theme', 'bright', 'vivid'] as const
/** How light the colors are; `theme` is as the theme was designed. */
export const TONE_LIGHTS = ['lighter', 'theme', 'darker'] as const
/**
 * The tone when the user chose none (R11 of the toolkit's rules, 2026-11-20): Vivid, the lightness as the theme was
 * designed. The owner picked it on a board drawn by this engine: the calm accents read dull without it.
 */
export const DEFAULT_TONE_INTENSITY: (typeof TONE_INTENSITIES)[number] = 'vivid'
export const DEFAULT_TONE_LIGHT: (typeof TONE_LIGHTS)[number] = 'theme'

/**
 * The three tones the settings offer (owner, 2026-11-20: «tonalità dei colori, magari solo tra 3 preset»; then «cambiando
 * tono non vedo cambiamenti»): Calm, Balanced (as the theme was designed) and Vivid (the default, R11). Each one moves the
 * accents, the selection, the data colours and the tint of the sidebar, so the three read apart at a glance.
 */
export const TONE_PRESETS = ['calm', 'balanced', 'vivid'] as const
export type TonePreset = (typeof TONE_PRESETS)[number]
/** The tone a preset saves; Vivid is the default, so it saves none. */
export function presetTone(preset: TonePreset): ThemeTone | null {
  return preset === 'calm' ? { intensity: 'faded', light: 'theme' } : preset === 'balanced' ? { intensity: 'theme', light: 'theme' } : null
}
/** The preset closest to a saved tone, a finer choice saved by an older version included. */
export function tonePresetOf(tone: ThemeTone | null): TonePreset {
  const intensity = tone?.intensity ?? DEFAULT_TONE_INTENSITY
  return intensity === 'faded' || intensity === 'soft' ? 'calm' : intensity === 'theme' ? 'balanced' : 'vivid'
}

/**
 * The tone of the colors, on any theme: the same hues, more or less saturated and lighter or darker. It applies to the
 * accent, the filled button, the selected item and the eighteen free colors; the page and the text stay as they are.
 */
export interface ThemeTone {
  /** Absent: `DEFAULT_TONE_INTENSITY`. `theme` is a choice of its own: as the theme was designed. */
  readonly intensity?: (typeof TONE_INTENSITIES)[number]
  /** Absent: `DEFAULT_TONE_LIGHT`. `theme` is a choice of its own: as the theme was designed. */
  readonly light?: (typeof TONE_LIGHTS)[number]
}

/** A tone read from anywhere (a saved value): only what is valid stays; with nothing chosen, there is none (the default tone). */
export function themeTone(value: unknown): ThemeTone | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const intensity = (TONE_INTENSITIES as readonly unknown[]).includes(v['intensity']) ? (v['intensity'] as ThemeTone['intensity']) : undefined
  const light = (TONE_LIGHTS as readonly unknown[]).includes(v['light']) ? (v['light'] as ThemeTone['light']) : undefined
  if (!intensity && !light) return null
  return { ...(intensity ? { intensity } : {}), ...(light ? { light } : {}) }
}

/**
 * A tone as numbers: `k` multiplies the chroma, `d` moves the lightness, `lift` raises a fill that gets more saturated,
 * `surface` multiplies the tint of the sidebar and the lanes (the large areas, where a tone is seen first).
 */
interface Shift {
  readonly on: boolean
  readonly k: number
  readonly d: number
  readonly lift: number
  readonly surface: number
}
const NO_SHIFT: Shift = { on: false, k: 1, d: 0, lift: 0, surface: 1 }
const INTENSITY = { faded: [0.45, 0, 0.3], soft: [0.7, 0, 0.6], bright: [1.3, 0.03, 1.6], vivid: [1.7, 0.06, 2.2] } as const
function shiftOf(tone: ThemeTone | null): Shift {
  const light = tone?.light ?? DEFAULT_TONE_LIGHT
  const intensity = tone?.intensity ?? DEFAULT_TONE_INTENSITY
  if (intensity === 'theme' && light === 'theme') return NO_SHIFT
  const [k, lift, surface] = intensity === 'theme' ? [1, 0, 1] : INTENSITY[intensity]
  return { on: true, k, lift, surface, d: light === 'lighter' ? 0.06 : light === 'darker' ? -0.07 : 0 }
}

/**
 * The page of the light scheme, in every theme: a near-white with a trace of cool (`#fafcfc`, DESIGN.md's `surface`),
 * not pure white. It was a cream until 2026-11-22: a warm page under neutral grays and cool accents read as two
 * temperatures at once (the owner's decision).
 */
const PAPER_LIGHT: Oklch = fromHex('#fafcfc')
const PAGE_LIGHT = toHex(PAPER_LIGHT)

/** Adapts one of the 18 user colors to the theme's profile and to the scheme, as a dot that holds 3:1 on every background. */
function adaptMarkColor(raw: string, t: ThemeDef, backgrounds: readonly string[], scheme: ThemeScheme, bar: readonly string[] = [], tone: Shift = NO_SHIFT): string {
  const { C: c0, h: h0 } = fromHex(raw)
  const dark = scheme === 'dark'
  const delta = ((t.hue - h0 + 540) % 360) - 180
  const h = t.palette === 'mono' ? h0 : (h0 + delta * 0.06 + 360) % 360
  let L: number
  let C: number
  if (t.palette === 'mono') {
    L = dark ? 0.68 : 0.46
    C = Math.min(c0 * 0.1, 0.015)
  } else if (t.palette === 'calm') {
    L = dark ? 0.69 : 0.54
    C = Math.min(Math.max(c0 * 0.78, 0.05), 0.125)
  } else if (t.palette === 'soft') {
    L = dark ? 0.7 : 0.55
    C = Math.min(Math.max(c0 * 0.84, 0.055), 0.145)
  } else {
    L = dark ? 0.7 : 0.55
    C = Math.min(Math.max(c0 * 0.9, 0.06), 0.17)
  }
  // The chosen tone: the same hue, more or less saturated, lighter or darker (then corrected like any other).
  C *= tone.k
  // «Ink» keeps its colors almost gray whatever the tone: its character is the ink, not the color.
  if (t.palette === 'mono') C = Math.min(C, 0.015)
  L += tone.d
  const min = 3
  // The closest lightness that holds on every background, first in the scheme's direction: with a dark sidebar (`bar`)
  // beside a light page the color must stay between the two, so darkening alone would crush it to black. The search
  // stays near the color (it must remain that color); if there is no room for both, the content wins over the sidebar.
  const everywhere = atLeast([...backgrounds, ...bar], min)
  const dir = dark ? 1 : -1
  for (let k = 0; k <= 70; k++) {
    for (const d of k === 0 ? [0] : [dir * k, -dir * k]) {
      const c = fit(ok(L + d * 0.004, C, h))
      if (c.L > 0 && c.L < 1 && everywhere(toHex(c))) return toHex(c)
    }
  }
  return toHex(settle(ok(L, C, h), dir, atLeast(backgrounds, min)).c)
}

/**
 * The dark ladder of each depth (`ThemeDark.depth`), as OKLCH lightness: the page, the sidebar and the lanes below it,
 * the solid sidebar, the sheets, the dividers, the soft background of the accent, the selected item and the selected
 * row of a sidebar with its own colors. `standard` is the ladder every theme had before the depth was a parameter
 * (2026-11-23), value for value.
 *
 * `deep` keeps its steps as contrast ratios from a darker page (the sidebar about 1.07:1 below; the sheets 1.16:1, the
 * selected item 1.26:1 and the dividers 1.36:1 above): the same ratio is a wider step of lightness there. Its solid
 * sidebar sits closer than the ratio asks, to stay above the drop of the elevation (0.12).
 *
 * `soft` can only bring the page up toward its sheets, because the standard ladder is already at two ceilings: with
 * sheets above 0.285 a fill with a light label no longer holds 3:1 on them, and with a selected item above 0.32 the
 * user's colors no longer hold 3:1 on it. So its sheets are the standard's, a closer step above a lighter page (about
 * 1.11:1), its selected item rises by the little there is, to stay apart from the page in a calm tone, and the
 * sidebar keeps its ratio below.
 */
const DARK_LADDER: Readonly<Record<DarkDepth, { readonly page: number; readonly sidebar: number; readonly solid: number; readonly raised: number; readonly line: number; readonly soft: number; readonly selected: number; readonly row: number }>> = {
  deep: { page: 0.2, sidebar: 0.16, solid: 0.15, raised: 0.26, line: 0.31, soft: 0.265, selected: 0.285, row: 0.275 },
  standard: { page: 0.235, sidebar: 0.205, solid: 0.176, raised: 0.285, line: 0.33, soft: 0.29, selected: 0.31, row: 0.3 },
  soft: { page: 0.25, sidebar: 0.225, solid: 0.2, raised: 0.285, line: 0.335, soft: 0.29, selected: 0.315, row: 0.3 },
}

/**
 * The starting lightness values of a theme, before any correction. Three distinct levels in both schemes: sidebar and lanes
 * (`sidebar-paper`, `paper-2`), page (`paper`) and raised sheets (`raised`, like "Now" and panels). In dark the backgrounds
 * are anthracite, neutral, unless the theme sets its dark parameters (`ThemeDef.dark`): another depth, or its own hue at
 * a low chroma, so as not to turn muddy on warm tones nor tire those who have ADHD.
 */
function startOf(t: ThemeDef, scheme: ThemeScheme, tone: Shift = NO_SHIFT) {
  const [ac0, ah] = t.accent
  // The chosen tone multiplies the chroma of the accents and moves the lightness of the fills.
  const ac = ac0 * tone.k
  const full = t.sidebar === 'piena'
  // The dark column (`scura`): near-black and almost neutral in both schemes, whatever the theme.
  const column = t.sidebar === 'scura'
  // Without chroma ("Ink") the accent is the ink itself.
  const mono = ac === 0
  // A strong accent: the fill has its own lightness and chroma, and its label is the light or the dark one, whichever
  // reads better on it (a vivid orange or green takes dark text, a blue or a magenta takes white).
  const strong = t.fill ? ok(t.fill[0] + tone.d, t.fill[1] * tone.k, ah) : undefined
  // The color of the selected item: the accent's, or the theme's second color.
  const [sc, sh] = t.second ? [t.second[0] * tone.k, t.second[1]] : [ac, ah]
  // The tints of the selection follow the tone, without ever vanishing.
  const tint = (c: number) => Math.max(c * tone.k, Math.min(c, 0.016))
  const labelOn = (fill: Oklch, lightLabel: Oklch): Oklch => {
    const darkLabel = ok(0.13, 0.02, ah)
    return contrast(toHex(lightLabel), toHex(fill)) >= contrast(toHex(darkLabel), toHex(fill)) ? lightLabel : darkLabel
  }
  if (t.surfaces) {
    // A curated palette: its own surfaces, ink and accents. The levels of text and the tints of the selection follow
    // from them; everything is then corrected to the thresholds like in any other theme.
    const s = t.surfaces[scheme]
    const light = scheme === 'light'
    const paper = fromHex(s.paper)
    const ink = fromHex(s.ink)
    const accent0 = fromHex(s.accent)
    const accent = { ...accent0, C: accent0.C * tone.k }
    const fill0 = fromHex(s.fill)
    // A saturated fill can already be at the edge of sRGB. Move its lightness as well,
    // so two intensities still produce different shades after gamut and contrast correction.
    const depth = (tone.k - 1) * (light ? -0.12 : 0.065)
    const fill = tone.on ? fit({ L: fill0.L + tone.d + depth, C: fill0.C * tone.k, h: fill0.h }) : fill0
    const side = fromHex(s.sidebar)
    // The selected item takes the accent's hue, or the theme's second color; in light it sits clearly below the sidebar.
    const [selC, selH] = t.second ? [t.second[0] * tone.k, t.second[1]] : [accent.C, accent.h]
    return {
      raised: fromHex(s.raised), paper, paper2: side, line: fromHex(s.line), input: { ...fromHex(s.line), L: light ? 0.63 : 0.525 },
      ink: { ...ink, L: light ? Math.min(ink.L, 0.28) : ink.L }, inkSoft: { ...ink, L: light ? 0.38 : Math.min(ink.L - 0.08, 0.8) }, inkMute: { ...ink, L: light ? 0.5 : 0.67 },
      accent, accentStrong: light ? ok(0.39, accent.C, accent.h) : ok(0.92, Math.min(accent.C * 0.4, 0.06), accent.h),
      fill, onFill: labelOn(fill, light ? ok(1, 0, 0) : ok(0.99, 0.008, fill.h)),
      accentSoft: ok(light ? paper.L - 0.035 : paper.L + 0.08, tint(0.04), accent.h),
      selected: ok(light ? Math.min(paper.L - 0.06, side.L - 0.04) : paper.L + 0.1, light ? tint(0.05) : Math.max(selC * 0.38, tint(0.032)), selH),
      selectedInk: light ? ok(0.39, selC, selH) : ok(0.94, selC * 0.25, selH),
      // The solid sidebar is dark in light too, with its own inks; the lanes (`paper2`) stay the palette's. The dark
      // column, on request, is the same near-black, sober column as in every other theme.
      sidebar: column ? ok(0.205, 0.008, paper.h) : full && light ? ok(0.215, Math.max(paper.C * 2.4, 0.018), paper.h) : side,
      barInk: column ? ok(0.87, 0.008, paper.h) : light ? ok(0.95, 0.008, paper.h) : { ...ink, L: 0.9 },
      barMute: column ? ok(0.71, 0.012, paper.h) : light ? ok(0.77, 0.012, paper.h) : { ...ink, L: 0.68 },
      barSelected: column ? ok(0.29, 0.012, paper.h) : fill, barSelectedInk: column ? ok(1, 0, 0) : ink,
      barAccent: ok(0.8, Math.min(accent.C * 1.2, 0.13), accent.h), barAccentInk: ok(0.22, 0.03, accent.h),
    }
  }
  if (scheme === 'light') {
    const g = (L: number, k = 1) => ok(L, t.chroma * k, t.hue)
    const accent = mono ? ok(0.24, 0, 0) : ok(0.49, ac, ah)
    const bar = (L: number, c: number) => ok(L, mono ? 0 : c, t.hue)
    // Without a strong fill the button is the accent as text; a lighter, darker or brighter tone gives it a fill of its own.
    const toned = !mono && !strong && (tone.d !== 0 || tone.lift !== 0) ? ok(0.49 + tone.d + tone.lift, ac, ah) : undefined
    const plain = strong ?? toned
    // A more tinted sidebar can read as light as the page: it then goes down until it is a clear step below it.
    const belowPage = (side: Oklch): Oklch => {
      let c = side
      for (let i = 0; i < 20 && contrast(toHex(fit(c)), PAGE_LIGHT) < 1.125; i++) c = { ...c, L: c.L - 0.002 }
      return c
    }
    return {
      // The page is a cool near-white in every theme and the sheets a step lighter, never pure white, which glares (the
      // owner's decisions of 2026-11-19 and 2026-11-22); the theme's tint sits in the sidebar and the lanes, a clear
      // step below the page.
      raised: fromHex('#fdfefe'), paper: PAPER_LIGHT, paper2: g(0.95, 1.3 * tone.surface), line: g(0.895), input: g(0.63),
      ink: g(0.2, 1.5), inkSoft: g(0.36, 1.5), inkMute: g(0.5, 1.2),
      // The accent as text is step 11 of the palette; step 12 is the stronger text step, taken where 11 falls short.
      accent, accentStrong: mono ? ok(0.2, 0, 0) : ok(0.39, ac, ah), fill: plain ?? accent, onFill: plain ? labelOn(plain, ok(1, 0, 0)) : ok(1, 0, 0), accentSoft: ok(0.94, mono ? 0 : tint(strong ? 0.045 : 0.032), ah),
      selected: mono ? ok(0.9, 0, 0) : ok(0.915, tint(strong ? 0.062 : 0.046), sh), selectedInk: mono ? ok(0.2, 0, 0) : ok(0.39, sc, sh),
      // The solid sidebar is dark enough for the user's colors to hold 3:1 on it and on the light page at once.
      // The tone tints the sidebar too: Calm takes it toward gray, Vivid gives it the theme's colour (owner, 2026-11-20).
      sidebar: column ? bar(0.205, 0.008) : full ? ok(0.215, Math.max(t.chroma * 2.4 * tone.surface, 0.018), t.hue) : belowPage(g(0.946, 1.7 * tone.surface)),
      barInk: column ? bar(0.87, 0.008) : ok(0.95, 0.008, t.hue), barMute: column ? bar(0.71, 0.012) : ok(0.77, 0.012, t.hue),
      barSelected: column ? bar(0.29, 0.012) : ok(0.35, 0.036, t.hue), barSelectedInk: ok(1, 0, 0),
      barAccent: mono ? ok(0.93, 0, 0) : ok(0.8, Math.min(ac * 1.2, 0.13), ah), barAccentInk: ok(0.22, mono ? 0 : 0.03, ah),
    }
  }
  const warm = t.hue <= 110 || t.hue >= 325
  // The tint of the dark backgrounds does not follow a stronger tint of the light ones: beyond this it turns muddy.
  const tc = mono ? 0 : warm ? 0.005 : Math.max(Math.min(t.chroma, 0.006) * 1.4, 0.0045)
  const f = (L: number, k = 1) => ok(L, tc * k, t.hue)
  // The dark parameters of the theme: the ladder of its depth, and the chroma of its backgrounds. None unless the theme
  // asks for its own hue and its grays have one; a warm hue takes the soft strength, since it turns muddy sooner.
  const dark = themeDark(t.dark)
  const d = DARK_LADDER[dark?.depth ?? DEFAULT_DARK_DEPTH]
  const bc = dark?.tint === 'theme' && !mono && t.chroma > 0 ? TINT_CHROMA[warm ? 'soft' : 'medium'][1] : 0
  const n = (L: number, k = 1): Oklch => {
    if (!bc) return ok(L, 0, 0)
    // A tinted background is never lighter than its gray: the ladder sits at the thresholds measured on the grays (the
    // fill at 3:1 on the sheets), and at the same lightness a hue can weigh a little more than the gray.
    const most = luminance(toHex(ok(L, 0, 0)))
    let c = ok(L, bc * k, t.hue)
    while (luminance(toHex(c)) > most && c.L > 0) c = { ...c, L: c.L - 0.001 }
    return c
  }
  // The deeper tone of the accent that fills the button in dark, moved by the chosen tone.
  const darkFill = ok(0.52 + tone.d + tone.lift, Math.max(ac0 * 0.88, 0.08) * tone.k, ah)
  return {
    // In dark the backgrounds are a neutral anthracite unless the theme says otherwise, as light has its base white (the
    // owner's decision of 2026-11-19): the theme's character is its accent, and in light the tint of its sidebar. Since
    // 2026-11-23 that is the default of a parameter (`ThemeDef.dark`): the depth picks the ladder, the tint its chroma,
    // spread as on a page the user derives (`surfacesFrom`: the sidebar and the sheets as the page, the lines a little less).
    raised: n(d.raised), paper: n(d.page), paper2: n(d.sidebar), line: n(d.line, 0.9), input: n(0.53, 0.9),
    ink: f(0.92, 0.4), inkSoft: f(0.8, 0.45), inkMute: f(0.67, 0.5),
    // The accent as text is light, to be readable on the dark background; the button fill is a solid and deeper tone,
    // with light text on it. In "Ink" the button stays light with dark text.
    accent: mono ? ok(0.9, 0, 0) : strong ? ok(0.8, Math.min(ac, tone.k > 1 ? 0.2 : 0.17), ah) : ok(0.78, Math.min(ac * 0.78, tone.k > 1 ? 0.16 : 0.125), ah),
    accentStrong: mono ? ok(0.96, 0, 0) : ok(0.92, Math.min(ac * 0.4, 0.06), ah),
    fill: mono ? ok(0.9, 0, 0) : (strong ?? darkFill),
    onFill: mono ? ok(0.16, 0, 0) : strong ? labelOn(strong, ok(0.99, 0.008, ah)) : tone.on ? labelOn(darkFill, ok(0.99, 0.008, ah)) : ok(0.99, 0.008, ah),
    accentSoft: ok(d.soft, mono ? 0 : tint(0.042), ah),
    selected: mono ? ok(d.selected + 0.01, 0, 0) : ok(d.selected, Math.max(sc * 0.38, tint(0.032)), sh), selectedInk: mono ? ok(0.96, 0, 0) : ok(0.94, sc * 0.25, sh),
    sidebar: full ? ok(d.solid, Math.max(tc * 1.1, bc), t.hue) : n(d.sidebar),
    barInk: f(0.9, 0.4), barMute: f(0.68, 0.45),
    barSelected: column ? f(d.row, 1) : ok(d.row, Math.max(ac * 0.45, 0.036), ah), barSelectedInk: column ? f(0.97, 0.3) : ok(0.95, ac * 0.25, ah),
    barAccent: mono ? ok(0.93, 0, 0) : ok(0.8, Math.min(ac * 1.2, 0.13), ah), barAccentInk: ok(0.22, mono ? 0 : 0.03, ah),
  }
}

/** A color token at one of Park's alpha steps: the color of a drop shadow or of its ring. */
const at = (token: string, percent: number) => `color-mix(in srgb, var(--color-${token}) ${percent}%, transparent)`

/**
 * Park UI's elevation (its `shadows` tokens, `packages/preset/src/theme/tokens/shadows.ts`): a soft drop with a 1px ring,
 * in place of a border. The drop is the engine's `drop` color (the theme's darkest gray: the ink in light, a near-black
 * in dark) at Park's alpha steps (its gray a4 9%, a6 15%, a7 19%; in dark its black a8, ~47%). In light the ring is the
 * same drop color around the edge; in dark it is the ink inside the edge (a drop of light ink would be a glow). `float`
 * is what is lifted and dragged (Park's `xl`, with a second, closer drop).
 * The finish is the toolkit's own (the owner, 2026-11-23): the edge is a crisp hairline (the ring at 15%) and the drop under
 * it is wide and faint, with a blur of about three times its offset, so a raised surface reads as lifted off the page
 * and not as resting on a smudge. The higher the surface, the wider the drop.
 */
function elevationOf(scheme: ThemeScheme): Record<string, string> {
  if (scheme === 'light') {
    const soft = at('drop', 9)
    const edge = at('drop', 15)
    return {
      '--elevation-xs': `0 1px 2px ${edge}, 0 0 1px ${at('drop', 19)}`,
      '--elevation-sm': `0 2px 6px ${soft}, 0 0 1px ${edge}`,
      '--elevation-md': `0 6px 16px ${soft}, 0 0 1px ${edge}`,
      '--elevation-lg': `0 12px 32px ${at('drop', 12)}, 0 0 1px ${edge}`,
      '--elevation-float': `0 24px 48px ${edge}, 0 4px 8px ${soft}, 0 0 1px ${edge}`,
    }
  }
  const drop = at('drop', 47)
  const ring = `inset 0 0 1px ${at('ink', 33)}`
  return {
    '--elevation-xs': `0 1px 1px ${drop}, ${ring}`,
    '--elevation-sm': `0 2px 6px ${drop}, ${ring}`,
    '--elevation-md': `0 6px 16px ${drop}, ${ring}`,
    '--elevation-lg': `0 12px 32px ${drop}, ${ring}`,
    '--elevation-float': `0 24px 48px ${at('drop', 55)}, ${ring}`,
  }
}

/**
 * The shape of a theme: its corners (`ThemeDef.shape`: three nested levels l1/l2/l3 as `sm`, `md`, `lg`; `xl` is l3
 * too; buttons and labels take l2), round boxes in `--radius-check` (for an app that rounds its own checkboxes; the
 * toolkit's `Checkbox` keeps l1), 1.75 stroke, rows in the open without a card around the group, and elevation in
 * place of borders. Without a shape the theme is `soft` (4/6/10px). With the scheme only the elevation changes.
 */
function shapeOf(theme: ThemeDef, scheme: ThemeScheme): Record<string, string> {
  const [l1, l2, l3] = SHAPE_RADII[isThemeShape(theme.shape) ? theme.shape : DEFAULT_SHAPE]
  // An app's own radii (`ThemeDef.radii`) replace the shape's.
  const own = isThemeRadii(theme.radii) ? theme.radii : null
  const sm = own?.sm ?? l1, md = own?.md ?? l2, lg = own?.lg ?? l3, xl = own?.xl ?? l3
  return {
    '--radius-sm': `${sm}px`, '--radius-md': `${md}px`, '--radius-lg': `${lg}px`, '--radius-xl': `${xl}px`,
    '--radius-button': `${own?.button ?? md}px`, '--radius-check': '9999px', '--radius-chip': `${own?.chip ?? md}px`,
    '--icon-stroke': '1.75', '--icon-cap': 'round', '--icon-join': 'round',
    '--border-width': '1px',
    ...elevationOf(scheme),
  }
}

/** A color the user may choose as accent: `#rrggbb`. */
export function isAccentColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

/** How the page and the sidebar of the user's own theme are chosen: the theme's, or from the accent, or a gray. */
export const OWN_BACKGROUNDS = ['theme', 'match', 'complement', 'neutral'] as const
/** How strong the tint of a page derived from the accent is. */
export const OWN_TINTS = ['soft', 'medium', 'strong'] as const
/** The color of the selected item: the accent's, its complement, a neighbor of it. */
export const OWN_SECONDS = ['accent', 'complement', 'analogous'] as const
/** The sidebar: the theme's, light like the page, or dark with the selected item filled. */
export const OWN_SIDEBARS = ['theme', 'light', 'dark'] as const

/**
 * The user's own theme: an accent, and how everything else follows from it. Each choice is a rule the engine applies
 * ("match the page to my color") or a color that forces the result (a `#rrggbb`).
 */
export interface OwnTheme {
  /** The accent: the filled button, "today", the bars; its hue goes to the accent as text. */
  readonly accent: string
  /** The page and the sidebar: a rule, or a color that becomes the page. Default: the theme's. */
  readonly background?: (typeof OWN_BACKGROUNDS)[number] | string
  /** The strength of a derived tint (`match`, `complement`). Default: medium. */
  readonly tint?: (typeof OWN_TINTS)[number]
  /** The selected item: a rule, or a color. Default: the accent's. */
  readonly second?: (typeof OWN_SECONDS)[number] | string
  /** The sidebar. Default: the theme's. */
  readonly sidebar?: (typeof OWN_SIDEBARS)[number]
}

/** The user's own theme read from anywhere (a saved value): only what is valid stays, and without an accent there is none. */
export function ownTheme(value: unknown): OwnTheme | null {
  if (isAccentColor(value)) return { accent: value.toLowerCase() }
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (!isAccentColor(v['accent'])) return null
  const pick = <T extends string>(x: unknown, allowed: readonly T[], color: boolean): T | string | undefined =>
    (allowed as readonly unknown[]).includes(x) ? (x as T) : color && isAccentColor(x) ? x.toLowerCase() : undefined
  const background = pick(v['background'], OWN_BACKGROUNDS, true)
  const tint = pick(v['tint'], OWN_TINTS, false) as OwnTheme['tint']
  const second = pick(v['second'], OWN_SECONDS, true)
  const sidebar = pick(v['sidebar'], OWN_SIDEBARS, false) as OwnTheme['sidebar']
  return {
    accent: v['accent'].toLowerCase(),
    ...(background && background !== 'theme' ? { background } : {}),
    ...(tint && tint !== 'medium' ? { tint } : {}),
    ...(second && second !== 'accent' ? { second } : {}),
    ...(sidebar && sidebar !== 'theme' ? { sidebar } : {}),
  }
}

/** The chroma of a derived page, in light and in dark, for each strength. */
const TINT_CHROMA = { soft: [0.006, 0.008], medium: [0.012, 0.016], strong: [0.024, 0.028] } as const

/** The surfaces, in a scheme, that follow from a page color: the sidebar a step away, the sheets above, the ink in its hue. */
function surfacesFrom(p: Oklch, scheme: ThemeScheme, accent: string): Surfaces {
  const tinted = p.C > 0.0005
  const c = (k: number, plus = 0) => (tinted ? p.C * k + plus : 0)
  if (scheme === 'light') {
    return {
      paper: toHex(p), sidebar: toHex(ok(p.L - 0.05, c(1.6, 0.004), p.h)), raised: toHex(ok(Math.min(0.992, p.L + 0.03), c(0.3), p.h)),
      line: toHex(ok(p.L - 0.09, c(1.2), p.h)), ink: toHex(ok(0.2, Math.min(c(1.5, 0.004), 0.03), p.h)), accent, fill: accent,
    }
  }
  return {
    paper: toHex(p), sidebar: toHex(ok(p.L - 0.028, c(1), p.h)), raised: toHex(ok(p.L + 0.056, c(1), p.h)),
    line: toHex(ok(p.L + 0.1, c(0.9), p.h)), ink: toHex(ok(0.92, Math.min(c(0.4), 0.012), p.h)), accent, fill: accent,
  }
}

/**
 * A theme with the user's own choices in place of its own. The accent is the fill and gives its hue to the accent as
 * text; the selected item, the page and the sidebar follow the rules chosen (or the colors forced). With the page left
 * to the theme, only the accent changes.
 */
function withOwn(t: ThemeDef, own: OwnTheme): ThemeDef {
  const color = own.accent.toLowerCase()
  const a = fromHex(color)
  // Never exactly zero: zero chroma means "Ink", whose accent is the ink itself.
  const c = Math.max(a.C, 0.001)
  const sidebar: SidebarKind = own.sidebar === 'light' ? 'tenue' : own.sidebar === 'dark' ? 'piena' : t.sidebar
  const sec = own.second ?? 'accent'
  const forcedSecond = isAccentColor(sec) ? fromHex(sec.toLowerCase()) : undefined
  const second: readonly [number, number] | undefined =
    forcedSecond ? [Math.max(forcedSecond.C, 0.001), forcedSecond.h]
    : sec === 'complement' ? [Math.max(c, 0.08), (a.h + 180) % 360]
    : sec === 'analogous' ? [c, (a.h + 40) % 360]
    : undefined
  const bg = own.background ?? 'theme'
  if (bg === 'theme') {
    if (t.surfaces) {
      const mine = (s: Surfaces): Surfaces => ({ ...s, accent: color, fill: color })
      return { ...t, sidebar, accent: [c, a.h], ...(second ? { second } : {}), surfaces: { light: mine(t.surfaces.light), dark: mine(t.surfaces.dark) } }
    }
    const { second: _second, ...rest } = t
    return { ...rest, sidebar, accent: [c, a.h], fill: [a.L, c], ...(second ? { second } : {}) }
  }
  // The page follows from the accent (its hue, or the opposite one), is a gray, or is the color the user forces.
  let lightPaper: Oklch
  let darkPaper: Oklch
  if (isAccentColor(bg)) {
    const p = fromHex(bg.toLowerCase())
    // A light color is the page in light, a dark one the page in dark; the other scheme takes its hue. Mid tones
    // are brought to the nearest end: a page must leave room for the text.
    if (p.L > 0.6) {
      lightPaper = fit({ ...p, L: Math.max(p.L, 0.9) })
      darkPaper = ok(0.21, Math.min(Math.max(p.C, 0.004) * 1.4, 0.035), p.h)
    } else {
      darkPaper = fit({ ...p, L: Math.min(p.L, 0.26) })
      lightPaper = ok(0.98, Math.min(p.C, 0.02), p.h)
    }
  } else if (bg === 'neutral' || a.C < 0.02) {
    lightPaper = ok(0.985, 0, 0)
    darkPaper = ok(0.235, 0, 0)
  } else {
    const h = bg === 'complement' ? (a.h + 180) % 360 : a.h
    const [cl, cd] = TINT_CHROMA[own.tint ?? 'medium']
    lightPaper = ok(own.tint === 'strong' ? 0.975 : 0.985, cl, h)
    darkPaper = ok(0.235, cd, h)
  }
  return {
    id: t.id, label: t.label, hue: lightPaper.h, chroma: lightPaper.C, accent: [c, a.h], sidebar, palette: t.palette, ...(second ? { second } : {}),
    surfaces: { light: surfacesFrom(lightPaper, 'light', color), dark: surfacesFrom(darkPaper, 'dark', color) },
  }
}

/**
 * The colors and the shape of a theme in a scheme, as the theme is or with the user's own choices on top (`own`: an
 * `OwnTheme`, or just an accent as `#rrggbb`; anything else is ignored) and in the tone they chose (`tone`: more or
 * less saturated, lighter or darker). Pure: same arguments, same result.
 */
export function themeTokens(theme: ThemeDef, scheme: ThemeScheme, own?: OwnTheme | string | null, tone?: ThemeTone | null): ThemeTokens {
  if (scheme !== 'light' && scheme !== 'dark') throw new Error(`unknown scheme: ${scheme}`)
  const mine = ownTheme(own)
  return tokensFor(mine ? withOwn(theme, mine) : theme, scheme, tone, mine !== null)
}

/**
 * The computation behind `themeTokens`, for any theme definition as it is, without the user's own colors merged in:
 * any of the three sidebars, the light one (`tenue`), the dark column (`scura`) or the solid one (`piena`).
 * `custom`: the definition already carries the user's own colors. Exported by the package, for an app that builds its
 * theme definitions itself (a palette from one colour does, in `applyTheme`).
 */
export function tokensFor(theme: ThemeDef, scheme: ThemeScheme, tone?: ThemeTone | null, custom = false): ThemeTokens {
  const light = scheme === 'light'
  const dir: -1 | 1 = light ? -1 : 1
  const column = theme.sidebar === 'scura'
  // The sidebar with its own colors: the solid one in the theme's color, or the dark column.
  const full = theme.sidebar === 'piena' || column
  // The default tone (R11) moves the theme's accent, never the user's own: the color they picked is the fill.
  const chosen = themeTone(tone)
  // The tint of the sidebar and the lanes follows the tone in any case: with the page left to the theme, it stays the theme's.
  const shift = custom ? { ...shiftOf({ intensity: chosen?.intensity ?? 'theme', light: chosen?.light ?? 'theme' }), surface: shiftOf(chosen).surface } : shiftOf(chosen)
  const s = startOf(theme, scheme, shift)
  // The main canvas stays quiet. Give the sidebar, lanes and selections a tonal scale before
  // computing readable inks. Chroma alone barely moves a gray and can clip on saturated colors.
  const strength = shift.surface - 1
  if (theme.accent[0] > 0) {
    const ground = (base: Oklch) => {
      // The generated light surfaces already reach the limit for the fixed red on hover.
      // Use that existing surface as the vivid end, with lighter steps toward the canvas.
      if (light && !theme.surfaces) return { ...base, L: Math.min(s.paper.L - 0.006, base.L + 0.020 * (2.2 - shift.surface)) }
      const hue = base.C > 0.004 ? base.h : theme.hue
      const tint = Math.min(0.022, theme.chroma * 1.6)
      const chroma = strength < 0 ? base.C * shift.surface : base.C + tint * strength
      return ok(Math.min(s.paper.L - 0.008, base.L - 0.022 * strength), chroma, hue)
    }
    s.paper2 = ground(s.paper2)
    if (!column) s.sidebar = ground(s.sidebar)
    // Keep dark selections below the level where their muted labels would erase the text hierarchy.
    const emphasis = light ? -0.045 * strength : 0.043 * (shift.surface - 2.2)
    s.selected = { ...s.selected, L: s.selected.L + emphasis }
  }
  const corrected = new Set<string>()
  const hex = (c: Oklch) => toHex(c)

  const paper = hex(s.paper)
  const paper2 = hex(s.paper2)
  const raised = hex(s.raised)
  const sidebar = hex(s.sidebar)
  // The solid sidebar has its own inks: the content text does not sit on it. The light sidebar uses the content's.
  const backgrounds = full ? [paper, paper2, raised] : [paper, paper2, raised, sidebar]

  const take = (role: string, start: Oklch, d: -1 | 1, okay: (h: string, c: Oklch) => boolean): Oklch => {
    const r = settle(start, d, okay)
    if (r.moved) corrected.add(role)
    return r.c
  }

  // The text, from the faintest to the strongest: each level stands out from the previous one (1.5 points, then 3).
  const selected = hex(s.selected)
  const inkMute = hex(take('inkMute', s.inkMute, dir, atLeast([...backgrounds, selected], 4.5)))
  const inkSoft = hex(take('inkSoft', s.inkSoft, dir, atLeast(backgrounds, (bg) => Math.max(4.5, contrast(inkMute, bg) + 1.5))))
  // The ink also reaches 3:1 at half strength (it was the focus ring before R8): kept, so the ink keeps its values.
  const ringOk = (h: string) => backgrounds.every((bg) => contrast(over(h, bg, 0.5), bg) >= 3 + MARGIN)
  const ink = hex(take('ink', s.ink, dir, (h) => atLeast(backgrounds, (bg) => Math.max(7, contrast(inkSoft, bg) + 3))(h) && ringOk(h)))
  const selectedInk = hex(take('selectedInk', s.selectedInk, awayFrom(selected), atLeast([selected], 4.5)))

  // Dividers below 3:1 (decorative), control border above 3:1 and above the dividers.
  const line = hex(take('line', s.line, (-dir) as -1 | 1, (h) => backgrounds.every((bg) => contrast(h, bg) < 3 - MARGIN)))
  const input = hex(take('input', s.input, dir, (h) => atLeast(backgrounds, 3)(h) && backgrounds.every((bg) => contrast(h, bg) > contrast(line, bg))))

  // The solid button: the text holds on the fill at rest and on hover (which darkens, see `hoverOf`). With light text
  // the fill darkens, with dark text ("Ink" in dark) it lightens.
  // A fill that is nearly black has no room to darken (a step down from it cannot be seen): it lightens instead,
  // by a step that can (the owner, 2026-11-23: the solid button must answer the pointer in every theme).
  const hoverOf = (c: Oklch) => fit({ ...c, L: c.L < NEAR_BLACK ? c.L + 0.07 : c.L - 0.045 })
  // The fill is also a mark to be seen without text (timeline bars, the calendar's "today"): on the backgrounds
  // it holds at 3:1 (WCAG 1.4.11). In dark the deep tone may fall below: it lightens toward the text, but only
  // as long as the text still holds at 4.5:1. If that is not enough, the text wins.
  const graphicOnBackgrounds = atLeast(backgrounds, 3)
  const fillWith = (label: Oklch) => {
    const on = hex(label)
    const textOnFill = (h: string, c: Oklch) => contrast(on, h) >= 4.5 + MARGIN && contrast(on, hex(hoverOf(c))) >= 4.5 + MARGIN
    const first = settle(s.fill, awayFrom(on), textOnFill)
    let c = first.c
    let moved = first.moved
    if (!graphicOnBackgrounds(hex(c))) {
      // Away from the backgrounds: lighter in dark, darker in light, whatever the label.
      c = push(c, dir, textOnFill, graphicOnBackgrounds).c
      moved = true
    }
    return { c, on, moved, met: textOnFill(hex(c), c) && graphicOnBackgrounds(hex(c)) }
  }
  let solved = fillWith(s.onFill)
  if ((custom || shift.on) && !solved.met) {
    // With the user's own color or tone the label that reads better at the start may leave no room for the 3:1: the other
    // label (light instead of dark, or the reverse) is tried before giving up.
    const other = fillWith(luminance(solved.on) > 0.5 ? ok(0.13, 0.02, s.fill.h) : light ? ok(1, 0, 0) : ok(0.99, 0.008, s.fill.h))
    if (other.met) solved = other
  }
  if (solved.moved) corrected.add('primary')
  const fill = solved.c
  const onFill = solved.on
  const primary = hex(fill)
  const accentHover = hex(hoverOf(fill))
  // The accent as text (R9): 4.5:1 on every background and on its soft background. It is also the focus ring (R8),
  // which must reach 3:1 on the selection tint of a row too. The rule of the 12-step palettes: step 11, or step 12
  // where step 11 falls short; then, as the last guarantee, the step is moved until it holds.
  const accentSoft = hex(s.accentSoft)
  const accentOk = (h: string) => atLeast([...backgrounds, accentSoft], 4.5)(h) && atLeast([selected], 3)(h)
  const accentStep = pickTextStep(s.accent, s.accentStrong, accentOk)
  if (accentStep.step === 12) corrected.add('accent')
  const accent = hex(take('accent', accentStep.c, dir, accentOk))

  // The spot color: a fill to be seen without text (3:1 on the backgrounds) with a label readable on it, its soft
  // background, and the spot as text (4.5:1 on the backgrounds and on its soft background). Without a spot color in
  // the theme the four tokens are the theme's own fill and accent, so that whoever uses them needs no second case.
  let spot: Record<string, string> = { spot: primary, 'spot-foreground': onFill, 'spot-soft': accentSoft, 'spot-ink': accent }
  if (theme.spot && isAccentColor(theme.spot)) {
    const base = fit(fromHex(theme.spot))
    const lightLabel = hex(ok(1, 0, 0))
    const darkLabel = hex(ok(0.13, 0.02, base.h))
    const label = contrast(lightLabel, hex(base)) >= contrast(darkLabel, hex(base)) ? lightLabel : darkLabel
    const labelHolds = (h: string) => contrast(label, h) >= 4.5 + MARGIN
    let fillC = take('spot', base, awayFrom(label), labelHolds)
    if (!graphicOnBackgrounds(hex(fillC))) {
      fillC = push(fillC, dir, labelHolds, graphicOnBackgrounds).c
      corrected.add('spot')
    }
    const soft = hex(ok(light ? s.paper.L - 0.035 : s.paper.L + 0.08, Math.min(base.C, 0.045), base.h))
    const inkStart = light ? ok(0.47, base.C, base.h) : ok(0.8, Math.min(base.C, 0.15), base.h)
    const spotInk = hex(take('spotInk', inkStart, dir, atLeast([...backgrounds, soft], 4.5)))
    spot = { spot: hex(fillC), 'spot-foreground': label, 'spot-soft': soft, 'spot-ink': spotInk }
  }

  // The sidebar: with its own colors (solid) or the content's (light).
  let bar: Record<string, string>
  if (full) {
    // With a strong accent the selected item of the solid sidebar is the fill itself, with its label.
    const barSelected = !column && (theme.fill || theme.surfaces) ? primary : hex(s.barSelected)
    const barInk = hex(take('barInk', s.barInk, awayFrom(sidebar), atLeast([sidebar], 7)))
    const barMute = hex(take('barMute', s.barMute, awayFrom(sidebar), atLeast([sidebar], 4.5)))
    const barSelectedInk = !column && (theme.fill || theme.surfaces) ? onFill : hex(take('barSelectedInk', s.barSelectedInk, awayFrom(barSelected), atLeast([barSelected], 4.5)))
    // The accent on the bar (the short bar and the icon of the chosen row, the count of the chosen row as a fill):
    // readable on the bar and on its selected row, and its ink readable on it.
    const barAccentC = take('barAccent', s.barAccent, awayFrom(sidebar), atLeast([sidebar, barSelected], 4.5))
    const barAccent = hex(barAccentC)
    const barAccentInk = hex(take('barAccentInk', s.barAccentInk, awayFrom(barAccent), atLeast([barAccent], 4.5)))
    bar = { 'sidebar-ink': barInk, 'sidebar-mute': barMute, 'sidebar-selected': barSelected, 'sidebar-selected-ink': barSelectedInk, 'sidebar-accent': barAccent, 'sidebar-accent-ink': barAccentInk }
  } else {
    bar = { 'sidebar-ink': inkSoft, 'sidebar-mute': inkMute, 'sidebar-selected': selected, 'sidebar-selected-ink': selectedInk, 'sidebar-accent': accent, 'sidebar-accent-ink': paper }
  }

  // The color of the elevation's drop (`elevationOf`): the ink in light; in dark a near-black in the theme's gray, since a
  // drop of the light ink would be a glow.
  const drop = light ? ink : hex(ok(0.12, Math.min(theme.chroma, 0.004), theme.hue))

  const white = '#ffffff'
  const fixed = light ? FIXED.light : FIXED.dark
  // The red is the same in every theme; on the surfaces of a curated palette (mid tones, tinted) and on a dark scheme
  // with parameters of its own it moves just enough to hold on them, on its soft background and on a highlighted menu item.
  const redHolds = (h: string) =>
    contrast(h, fixed['destructive-soft']) >= 4.5 + MARGIN &&
    backgrounds.every((bg) => contrast(h, bg) >= 4.5 + MARGIN && contrast(h, over(fixed['destructive-soft'], bg, 0.8)) >= 4.5 + MARGIN && contrast(h, over(h, bg, 0.1)) >= 4.5 + MARGIN)
  const ownGround = !!theme.surfaces || (!light && themeDark(theme.dark) !== null)
  const destructive = ownGround && !redHolds(fixed.destructive) ? hex(settle(fromHex(fixed.destructive), dir, redHolds).c) : fixed.destructive
  const onDestructive = [white, '#17161a', paper].sort((a, b) => contrast(b, destructive) - contrast(a, destructive))[0]!

  // The status colours: fixed, moved only where a theme's surfaces would sink them.
  const status = light ? STATUS.light : STATUS.dark
  const statusText = (name: 'success' | 'warning') => {
    const soft = status[`${name}-soft`]
    const holds = (h: string) => contrast(h, soft) >= 4.5 + MARGIN && backgrounds.every((bg) => contrast(h, bg) >= 4.5 + MARGIN)
    return holds(status[name]) ? status[name] : hex(settle(fromHex(status[name]), dir, holds).c)
  }
  // The highlight moves away from the ink (lighter in light, darker in dark) until the ink reads on it.
  const inkHolds = (h: string) => contrast(ink, h) >= 7 + MARGIN
  const highlight = inkHolds(status.highlight) ? status.highlight : hex(settle(fromHex(status.highlight), light ? 1 : -1, inkHolds).c)

  // The user's colors on the content backgrounds; beside a solid bar they also hold on it.
  const marks: Record<string, string> = {}
  const solidBar = theme.sidebar === 'piena' ? [sidebar] : []
  for (let i = 0; i < COLORS.length; i++) {
    marks[`mark-${i + 1}`] = adaptMarkColor(COLORS[i]!, theme, backgrounds, scheme, solidBar, shift)
  }

  const colors: Record<string, string> = {
    paper, 'paper-2': paper2, 'sidebar-paper': sidebar, ink, 'ink-soft': inkSoft, 'ink-mute': inkMute, line,
    accent, 'accent-hover': accentHover, 'accent-soft': accentSoft, raised, drop,
    background: paper, foreground: ink, popover: raised, 'popover-foreground': ink,
    primary, 'primary-foreground': onFill, 'muted-foreground': inkMute,
    // The focus ring is the accent as text (R8): 2px, offset 2px, at least 3:1 on every background and on the selection.
    ...fixed, destructive, 'destructive-foreground': onDestructive, ...status, success: statusText('success'), warning: statusText('warning'), highlight, border: line, input, ring: accent,
    selected, 'selected-ink': selectedInk, ...spot, ...bar, ...marks,
  }
  const attributes: Record<string, string> = {
    // The solid sidebar has its own colors: the CSS redefines the ink there.
    'data-sidebar': full ? 'own' : 'shared',
  }
  return { theme: theme.id, scheme, colors, shape: shapeOf(theme, scheme), attributes, corrected: [...corrected] }
}
