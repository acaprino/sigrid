// The shape of a theme definition, and the fonts. The toolkit ships no themes: each app passes its own definitions
// and the engine (theme-engine.ts) derives every colour from them, guaranteeing the contrast
// thresholds. Four things make a theme: the tint of the grays (`hue`) and how strong it is (`chroma`), the accent
// (saturation and hue) and the sidebar: `tenue` (light, the tone of the app's ground), `scura` (a near-black, almost
// neutral column in both schemes) or `piena` (in the theme's colour, with the selected item solid). Optional: a strong
// `fill`, a `second` colour for the selection, or a curated palette's own `surfaces`.

export type SidebarKind = 'tenue' | 'piena' | 'scura'

/**
 * How round the corners of a theme are. The three nested levels (what sits inside a control, a control, what holds
 * controls) move together, so a preset is a choice of character, not three free numbers: `sharp` 2/4/6px (Park UI as
 * it ships), `soft` 4/6/10px (the default), `round` 6/10/14px.
 */
export type ThemeShape = 'sharp' | 'soft' | 'round'
export const THEME_SHAPES = ['sharp', 'soft', 'round'] as const satisfies readonly ThemeShape[]
export const DEFAULT_SHAPE: ThemeShape = 'soft'
/** The corner radii of each shape, in px: l1, l2, l3. */
export const SHAPE_RADII: Readonly<Record<ThemeShape, readonly [number, number, number]>> = { sharp: [2, 4, 6], soft: [4, 6, 10], round: [6, 10, 14] }
export function isThemeShape(value: unknown): value is ThemeShape {
  return (THEME_SHAPES as readonly unknown[]).includes(value)
}

/** How the 18 free colors (marks and their icons) adapt to the theme's character. */
export type PaletteProfile = 'mono' | 'calm' | 'crisp' | 'soft'

export interface ThemeDef {
  readonly id: string
  readonly label: string
  /** OKLCH hue of the grays (page, lines, ink). */
  readonly hue: number
  /** OKLCH chroma of the grays: almost zero, just a tint. */
  readonly chroma: number
  /** The accent: OKLCH saturation and hue. Zero saturation ("Ink"): the accent is the ink itself. */
  readonly accent: readonly [number, number]
  readonly sidebar: SidebarKind
  readonly palette: PaletteProfile
  /** How round the corners are. Absent: `soft` (4/6/10px). A value that is not a shape counts as absent. */
  readonly shape?: ThemeShape | undefined
  /**
   * A strong accent: the OKLCH lightness and chroma of the fill (the hue is the accent's). Without it the fill is the
   * accent as text in light, and a deeper tone of it in dark. The engine still guarantees the label and the 3:1.
   */
  readonly fill?: readonly [number, number]
  /**
   * A second color (OKLCH chroma and hue) for the selected item, when it is not the accent's: the page and the selection
   * are one calm color, the filled button another that stands out ("teal to focus, orange to act").
   */
  readonly second?: readonly [number, number]
  /**
   * The spot color (`#rrggbb`): a second, louder color for the few things that ask for attention now (what is due, what
   * is running), never for structure. Without it the spot tokens are the theme's own fill and accent.
   */
  readonly spot?: string
  /**
   * A curated palette: the theme's own surfaces, ink and accents in each scheme, as `#rrggbb`, instead of the common
   * lightness ladder. The engine still corrects text, accents and borders until they hold the contrast thresholds.
   */
  readonly surfaces?: { readonly light: Surfaces; readonly dark: Surfaces }
}

export interface Surfaces {
  /** The page. */
  readonly paper: string
  /** The sidebar and the lanes, a step away from the page. */
  readonly sidebar: string
  /** The raised sheets ("Now", panels, menus). */
  readonly raised: string
  /** The dividers. */
  readonly line: string
  /** The strongest text. */
  readonly ink: string
  /** The accent as text. */
  readonly accent: string
  /** The filled button, "today", the bars. */
  readonly fill: string
}


export interface FontDef {
  readonly id: string
  readonly label: string
  /** The `font-family` stack: the font, then Inter (always in the app) and the system fallback. */
  readonly stack: string
}

/**
 * The fonts to choose from, all with an open license (OFL) and inside the app (no network): IBM Plex Sans (the default)
 * and Inter are in `styles/fonts.css`, the client imports the others from `@fontsource` (client/src/fonts.ts). Inter stays in the stack
 * of each one: a glyph that a font does not have (outside the Latin alphabet) is drawn in Inter.
 */
export const FONTS = [
  { id: 'inter', label: 'Inter', stack: '"Inter", system-ui, sans-serif' },
  { id: 'lexend', label: 'Lexend', stack: '"Lexend", "Inter", system-ui, sans-serif' },
  { id: 'plex', label: 'IBM Plex Sans', stack: '"IBM Plex Sans", "Inter", system-ui, sans-serif' },
  { id: 'source', label: 'Source Sans', stack: '"Source Sans 3", "Inter", system-ui, sans-serif' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', stack: '"Atkinson Hyperlegible", "Inter", system-ui, sans-serif' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' },
  { id: 'dm', label: 'DM Sans', stack: '"DM Sans", "Inter", system-ui, sans-serif' },
  { id: 'manrope', label: 'Manrope', stack: '"Manrope", "Inter", system-ui, sans-serif' },
  { id: 'figtree', label: 'Figtree', stack: '"Figtree", "Inter", system-ui, sans-serif' },
  { id: 'work', label: 'Work Sans', stack: '"Work Sans", "Inter", system-ui, sans-serif' },
  { id: 'nunito', label: 'Nunito', stack: '"Nunito", "Inter", system-ui, sans-serif' },
  { id: 'serif', label: 'Source Serif', stack: '"Source Serif 4", Georgia, serif' },
  { id: 'mono', label: 'JetBrains Mono', stack: '"JetBrains Mono", ui-monospace, Consolas, monospace' },
] as const satisfies readonly FontDef[]

export type FontId = (typeof FONTS)[number]['id']

/** The font before any choice (the default). */
export const DEFAULT_FONT: FontId = 'plex'
