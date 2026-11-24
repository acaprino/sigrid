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
 * it ships; the default since the owner's decision of 2026-11-24, which asked for less round corners), `soft` 4/6/10px
 * (a step rounder, the default before), `round` 6/10/14px. A theme chooses its own with `ThemeDef.shape`.
 */
export type ThemeShape = 'sharp' | 'soft' | 'round'
export const THEME_SHAPES = ['sharp', 'soft', 'round'] as const satisfies readonly ThemeShape[]
export const DEFAULT_SHAPE: ThemeShape = 'sharp'
/** The corner radii of each shape, in px: l1, l2, l3. */
export const SHAPE_RADII: Readonly<Record<ThemeShape, readonly [number, number, number]>> = { sharp: [2, 4, 6], soft: [4, 6, 10], round: [6, 10, 14] }
/** The corner radii of a theme in px (`ThemeDef.radii`). */
export interface ThemeRadii {
  readonly sm: number
  readonly md: number
  readonly lg: number
  readonly xl: number
  readonly button?: number | undefined
  readonly chip?: number | undefined
}
export function isThemeRadii(value: unknown): value is ThemeRadii {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  const whole = (n: unknown, most: number) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= most
  // `button` and `chip` may be a pill (9999); the four steps of the scale stay under 64.
  return whole(r.sm, 64) && whole(r.md, 64) && whole(r.lg, 64) && whole(r.xl, 64) && (r.button === undefined || whole(r.button, 9999)) && (r.chip === undefined || whole(r.chip, 9999))
}

export function isThemeShape(value: unknown): value is ThemeShape {
  return (THEME_SHAPES as readonly unknown[]).includes(value)
}

/**
 * How deep the dark scheme of a theme is: how dark its page is and how far below it the sidebar sits; the sheets, the
 * lines and the selection follow the page. `standard` is the anthracite every theme had before 2026-11-23; `deep` is a
 * near-black page with a wider step down to the sidebar; `soft` is a lighter charcoal, the page closer to its sheets
 * and its sidebar (the engine's contrast thresholds leave no room for lighter sheets: `DARK_LADDER` in theme-engine.ts).
 */
export type DarkDepth = 'deep' | 'standard' | 'soft'
export const DARK_DEPTHS = ['deep', 'standard', 'soft'] as const satisfies readonly DarkDepth[]
export const DEFAULT_DARK_DEPTH: DarkDepth = 'standard'
/**
 * The tint of the dark backgrounds: `neutral` grays, or `theme`, the hue of the theme's grays (`ThemeDef.hue`) at a low
 * chroma the engine sets. A theme whose grays have no chroma has no hue to give and stays neutral.
 */
export type DarkTint = 'neutral' | 'theme'
export const DARK_TINTS = ['neutral', 'theme'] as const satisfies readonly DarkTint[]
export const DEFAULT_DARK_TINT: DarkTint = 'neutral'

/** The dark scheme of a theme, as parameters the engine computes the backgrounds from (`ThemeDef.dark`). */
export interface ThemeDark {
  /** Absent: `DEFAULT_DARK_DEPTH`. */
  readonly depth?: DarkDepth | undefined
  /** Absent: `DEFAULT_DARK_TINT`. */
  readonly tint?: DarkTint | undefined
}

/** The dark parameters read from anywhere (a saved value): only what is valid and not the default stays; with nothing left, there are none. */
export function themeDark(value: unknown): ThemeDark | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const depth = (DARK_DEPTHS as readonly unknown[]).includes(v['depth']) && v['depth'] !== DEFAULT_DARK_DEPTH ? (v['depth'] as DarkDepth) : undefined
  const tint = (DARK_TINTS as readonly unknown[]).includes(v['tint']) && v['tint'] !== DEFAULT_DARK_TINT ? (v['tint'] as DarkTint) : undefined
  if (!depth && !tint) return null
  return { ...(depth ? { depth } : {}), ...(tint ? { tint } : {}) }
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
  /** How round the corners are. Absent: `sharp` (2/4/6px). A value that is not a shape counts as absent. */
  readonly shape?: ThemeShape | undefined
  /**
   * The corner radii in px, for an app whose corners are none of the three shapes (for example 4/6/8/12): `sm`, `md`, `lg`
   * and `xl` go to `--radius-sm`, `-md`, `-lg` and `-xl`; `button` and `chip` default to `md`. Absent, or not whole
   * numbers (0 to 64; `button` and `chip` to 9999, a pill): the radii of `shape`.
   */
  readonly radii?: ThemeRadii | undefined
  /**
   * How a key hint is drawn (`Kbd`, `Shortcut`). Absent, `plain` or any other value: plain 12px text (R5). `boxed`: a
   * 20px cap with a hairline, an exception to R5 a theme asks for; the engine writes `data-keys="boxed"` on the root.
   */
  readonly keys?: 'plain' | 'boxed' | undefined
  /**
   * The border of fields and of the outline button. Absent, `divider` or any other value: the light divider (`line`;
   * the owner, 2026-11-22). `strong`: the control border (`input`, 3:1), an exception a theme asks for; the engine
   * writes `data-controls="strong"` on the root.
   */
  readonly controls?: 'divider' | 'strong' | undefined
  /**
   * How the chosen view of a bar (`ToolbarTab`) and the chosen item of a segment (`ToggleGroup`) are marked. Absent,
   * `plain` or any other value: as the toolkit draws them (weight 600; a round line under the view; a raised thumb in
   * the segment). `bold`: the mark is the weight and the accent, an exception to R7 a theme asks for: the chosen one is
   * weight 700 on the ink and the others 500 and muted; the view has a square 2px line that grows from its middle
   * (with motion on); the segment is a track with 2px inside it and the chosen item has the accent at 16% as its fill
   * and at 55% as its border. The engine writes `data-tabs="bold"` on the root. The toolkit's own fonts stop at 600:
   * a theme that asks for this takes a font with a 700 (`SYSTEM_FONT`).
   */
  readonly tabs?: 'plain' | 'bold' | undefined
  /**
   * The height of the status strip of `AppShell`. Absent, `slim` or any other value: a dense control tall (28px at
   * compact). `tall`: 40px, so a 20px badge has room above and below it. The engine writes `data-status-strip="tall"`.
   */
  readonly statusStrip?: 'slim' | 'tall' | undefined
  /**
   * The dark scheme: how deep it is and whether its backgrounds take the theme's hue. Absent, or with no valid value:
   * the standard neutral anthracite. A curated palette (`surfaces`) keeps its own backgrounds, whatever is here.
   */
  readonly dark?: ThemeDark | undefined
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
  /**
   * The border of the controls (checkbox, radio, and fields under `controls: 'strong'`), stated by the palette. The
   * engine moves it until it holds 3:1 on the page, the sidebar, the sheets and the chosen row. Absent, or not a
   * `#rrggbb`: the engine derives one from the dividers and holds it on the page, the sidebar and the sheets only.
   */
  readonly input?: string | undefined
}


export interface FontDef {
  readonly id: string
  readonly label: string
  /** The `font-family` stack: the font, then Inter (always in the app) and the system fallback. */
  readonly stack: string
}

/**
 * The fonts to choose from, all with an open license (OFL) and inside the app (no network): IBM Plex Sans (the default)
 * and Inter are in `styles/fonts.css`; an app that offers another one loads its faces itself (from `@fontsource`, for
 * instance). Inter stays in the stack
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

/**
 * The system's own interface font (Segoe UI on Windows): nothing is shipped or fetched for it, and it has a 700. It is
 * not one of `FONTS`, so no list of fonts an app shows to a person has it: an app sets it by name
 * (`applyFont(el, 'system')`). With it the monospace of keys and code is the system's too (`[data-font="system"]` in
 * styles/theme.css).
 */
export const SYSTEM_FONT = { id: 'system', label: 'System', stack: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif' } as const satisfies FontDef

/** A font `applyFont` can set: one of `FONTS`, or the system's own (`SYSTEM_FONT`). */
export type FontId = (typeof FONTS)[number]['id'] | (typeof SYSTEM_FONT)['id']

/** The font before any choice (the default). */
export const DEFAULT_FONT: FontId = 'plex'
