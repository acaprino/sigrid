/**
 * The theme and the font on an element: how a choice (a theme definition in a scheme, with its own colours, a tone or a
 * palette; a font) becomes CSS variables and attributes. Parametric: the app passes its own theme definitions. The
 * blocks of `styles/theme.css` carry `BASE_THEME` for the first paint, before the script sets the
 * choice (`test/first-paint.test.ts` keeps them equal to the computation); an app paints its own default over them.
 */
import { DENSITY_VARIABLES } from './density'
import { DEFAULT_FONT, FONTS, SYSTEM_FONT } from './theme-catalog'
import type { FontDef, FontId, ThemeDef } from './theme-catalog'
import { GLASS_VARIABLES, themeTokens, tokensFor } from './theme-engine'
import type { OwnTheme, ThemeScheme, ThemeTokens, ThemeTone } from './theme-engine'
import { paletteTheme } from './palette'
import type { PalettePick } from './palette'

export type { ThemeScheme } from './theme-engine'

/** A theme in one of the two schemes: what is seen. */
export interface ThemePick {
  readonly theme: ThemeDef
  readonly scheme: ThemeScheme
  /** The user's own theme on top of this one (an accent, and how the rest follows); absent or null, the theme as it is. */
  readonly own?: OwnTheme | null
  /** The tone of the colors (more or less saturated, lighter or darker); absent or null, as the theme was designed. */
  readonly tone?: ThemeTone | null
  /** The user's palette from one base colour: when present it replaces the theme and its own colours. */
  readonly palette?: PalettePick | null
}

/** The tokens of a pick: the palette from one colour when there is one, otherwise the theme with its own colours. */
function tokensOf(pick: ThemePick): ThemeTokens {
  // A palette replaces the theme's colours, not how the app draws its keys and its control borders, nor its material.
  return pick.palette ? tokensFor({ ...paletteTheme(pick.palette), keys: pick.theme.keys, controls: pick.theme.controls, tabs: pick.theme.tabs, statusStrip: pick.theme.statusStrip, material: pick.theme.material }, pick.scheme, pick.tone) : themeTokens(pick.theme, pick.scheme, pick.own, pick.tone)
}

/** A plain gray theme with no accent: the toolkit's baseline for the first paint and the names of the variables. */
export const BASE_THEME: ThemeDef = { id: 'base', label: 'Base', hue: 0, chroma: 0, accent: [0, 0], sidebar: 'tenue', palette: 'mono' }

/** The root attributes that carry the theme, the font and the density: another document that shows part of the app copies them (`copyTheme`). */
export const THEME_ATTRIBUTES = ['data-theme', 'data-scheme', 'data-sidebar', 'data-keys', 'data-controls', 'data-tabs', 'data-status-strip', 'data-material', 'data-float', 'data-font', 'data-density'] as const

/** The attributes only a theme that asks for them writes (`ThemeDef.keys`, `controls`, `tabs`, `statusStrip`, `material`, and `data-float` with a stated `Surfaces.glass.float`): the next theme takes them away. */
const ASKED_ATTRIBUTES = ['data-keys', 'data-controls', 'data-tabs', 'data-status-strip', 'data-material', 'data-float'] as const

/** The font variable, written by `applyFont`. */
export const FONT_VARIABLE = '--font-sans'

/**
 * The names of the variables that `applyTheme`, `applyFont` and `applyDensity` write: they are the same for every
 * theme, scheme and density, but for the surfaces of a glass page (`GLASS_VARIABLES`), which only a glass theme writes.
 */
export const THEME_VARIABLES: readonly string[] = (() => {
  const t = themeTokens(BASE_THEME, 'light')
  return [...Object.keys(t.colors).map((k) => `--color-${k}`), ...Object.keys(t.shape), ...GLASS_VARIABLES, FONT_VARIABLE, ...DENSITY_VARIABLES]
})()

export function isFontId(value: unknown): value is FontId {
  return value === SYSTEM_FONT.id || FONTS.some((f) => f.id === value)
}
export function fontById(id: FontId): FontDef {
  if (id === SYSTEM_FONT.id) return SYSTEM_FONT
  return (FONTS as readonly FontDef[]).find((f) => f.id === id) ?? FONTS[0]
}

/** The CSS variables of a theme in a scheme, as an inline style (the picker's thumbnails, or the root). */
export function themeVariables(pick: ThemePick): Record<string, string> {
  const t = tokensOf(pick)
  return { ...Object.fromEntries(Object.entries(t.colors).map(([k, v]) => [`--color-${k}`, v])), ...t.shape }
}

/** The least difference, in one channel of 255, that reads as another colour beside the first. */
const VISIBLE_STEP = 12

/**
 * True if the tone changes a colour of this theme, in this scheme, by an amount an eye can see. A theme with no hue
 * (the gray baseline) keeps every colour of the interface in every tone, and its data colours move by a few units of
 * 255: the three tones look the same. An app that offers the tone as a choice asks this first, so it never shows three
 * previews that are one and the same.
 */
export function toneHasEffect(pick: Omit<ThemePick, 'tone'>): boolean {
  const calm = tokensOf({ ...pick, tone: { intensity: 'faded', light: 'theme' } }).colors as Record<string, string>
  const vivid = tokensOf({ ...pick, tone: null }).colors as Record<string, string>
  const channels = (hex: string) => (/^#[0-9a-f]{6}/i.test(hex) ? [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)) : null)
  return Object.keys(calm).some((name) => {
    const a = channels(calm[name]!)
    const b = channels(vivid[name] ?? '')
    // A colour not written as six hexadecimal digits is compared as it is written.
    if (!a || !b) return calm[name] !== vivid[name]
    return a.some((value, at) => Math.abs(value - b[at]!) >= VISIBLE_STEP)
  })
}

/** The mark on an element whose theme is being changed: under it nothing eases (theme.css). */
const THEME_SWAP_ATTR = 'data-theme-swap'

/**
 * A theme put over another changes every colour at once: for two frames the element is marked, and under the mark no
 * transition runs, so the controls do not fade after the page has already changed. Not on the first theme of an
 * element (nothing to change from), and not where there are no frames (a server, a test without them).
 */
function holdTransitions(el: HTMLElement): void {
  const frame = el.ownerDocument.defaultView?.requestAnimationFrame
  if (!frame || !el.hasAttribute('data-scheme')) return
  el.setAttribute(THEME_SWAP_ATTR, '')
  frame(() => frame(() => el.removeAttribute(THEME_SWAP_ATTR)))
}

/**
 * Puts a theme in a scheme on an element: the color and shape variables as an inline style, and the attributes
 * (`data-theme`, `data-scheme` and the shape ones). On the document root it also updates the browser bar's
 * color (`<meta name="theme-color">`) with the paper.
 */
export function applyTheme(el: HTMLElement, pick: ThemePick): void {
  const t = tokensOf(pick)
  holdTransitions(el)
  for (const [k, v] of Object.entries(themeVariables(pick))) el.style.setProperty(k, v)
  el.setAttribute('data-theme', t.theme)
  el.setAttribute('data-scheme', t.scheme)
  for (const [k, v] of Object.entries(t.attributes)) el.setAttribute(k, v)
  for (const name of ASKED_ATTRIBUTES) if (!(name in t.attributes)) el.removeAttribute(name)
  for (const name of GLASS_VARIABLES) if (!(name in t.shape)) el.style.removeProperty(name)
  if (el === el.ownerDocument.documentElement) {
    for (const meta of el.ownerDocument.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = t.colors['paper']!
  }
}

/**
 * Puts a font on an element: `--font-sans` (which `body` and the `font-sans` class use) and `data-font`. IBM Plex Sans,
 * the default, removes both: the one from `@theme` applies.
 */
export function applyFont(el: HTMLElement, font: FontId): void {
  if (font === DEFAULT_FONT) {
    el.style.removeProperty(FONT_VARIABLE)
    el.removeAttribute('data-font')
    return
  }
  el.style.setProperty(FONT_VARIABLE, fontById(font).stack)
  el.setAttribute('data-font', font)
}

/** Copies the theme, font and density of one element onto another (separate windows copy those of the main one). */
export function copyTheme(from: HTMLElement, to: HTMLElement): void {
  for (const name of THEME_ATTRIBUTES) {
    const value = from.getAttribute(name)
    if (value === null) to.removeAttribute(name)
    else to.setAttribute(name, value)
  }
  for (const name of THEME_VARIABLES) {
    const value = from.style.getPropertyValue(name)
    if (value === '') to.style.removeProperty(name)
    else to.style.setProperty(name, value)
  }
}
