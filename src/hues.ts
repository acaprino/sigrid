// Tints with a name, and the twelve-step scale of each (owner, 2026-11-24: a colour system like Radix Colors, in the
// three tones). The names are those of the eighteen free colours (colors.ts): one vocabulary for what the user colours
// and for a theme. Two things are made from a name, and neither changes a colour of a theme that exists:
// - a theme: `namedTheme({ accent: 'blue' })` is a theme definition like any other, which the engine computes with
//   every one of its thresholds;
// - a scale: `hueScale('blue', 'vivid', 'light')` is the tint in twelve steps, by the roles of the 12-step palettes.
//   Steps 1 and 2 are backgrounds, 3 to 5 the backgrounds of a component (at rest, under the pointer, chosen), 6 to 8
//   borders (8 is the border of a control, and holds 3:1), 9 and 10 the fill and the fill under the pointer, 11 and 12
//   text (4.5:1 and 7:1). The three tones are the engine's (Calm, Balanced, Vivid), with its numbers; beside each
//   tint is its gray (`grayScale`), which the page, the lines and the ink are made of.
// The steps are those the engine's roles sit on: in light the page is step 1 of the gray, the sidebar step 2, the
// lines step 6, the border of a control step 8, the muted ink step 11 and the ink step 12; the accent's soft
// background is step 3 of the tone, the selection step 4, the fill step 9, its hover step 10, the accent as text step
// 11 and the ink of the selection step 12. In dark the sidebar sits below the page: the sidebar is step 1 and the
// page step 2. The engine does not read its roles from a scale: a scale is for a board, a chart or a picker, and no
// part of the toolkit offers its steps as classes (R2, R10).
import { COLORS } from './colors'
import type { SidebarKind, ThemeDef } from './theme-catalog'
import { MARGIN, contrast, fit, fromHex, hoverOf, luminance, toHex, toneChroma, type Oklch, type ThemeScheme, type TonePreset } from './theme-engine'

/** The eighteen tints, in the order of `COLORS` (from red to pink): each is the name of the colour at its place. */
export const HUE_NAMES = ['red', 'coral', 'orange', 'brown', 'amber', 'lime', 'green', 'emerald', 'teal', 'turquoise', 'blue', 'slate', 'indigo', 'violet', 'orchid', 'magenta', 'pink', 'burgundy'] as const
export type HueName = (typeof HUE_NAMES)[number]

export function isHueName(value: unknown): value is HueName {
  return (HUE_NAMES as readonly unknown[]).includes(value)
}

/** The colour a tint is named after, `#rrggbb`: one of the eighteen of `COLORS`. */
export function hueColor(hue: HueName): string {
  const at = HUE_NAMES.indexOf(hue)
  if (at < 0) throw new Error(`unknown hue: ${String(hue)}`)
  return COLORS[at]!
}

/** The chroma of a tint's gray: a tenth of the tint's own, never none and never enough to read as a colour. */
const grayChroma = (tint: Oklch) => Math.min(Math.max(tint.C * 0.09, 0.005), 0.013)

/** What a theme written by names is made from. */
export interface NamedThemePick {
  readonly id: string
  readonly label: string
  /** The accent: the solid button, the selection, the links and the focus ring. */
  readonly accent: HueName
  /** The tint of the grays (the sidebar, the lines, the ink): a tint's gray, or `gray` for grays with no hue. Absent: the accent's. */
  readonly ground?: HueName | 'gray' | undefined
  /** Another tint for the selected item, when it is not the accent's. */
  readonly second?: HueName | undefined
  /** Absent: the light sidebar (`tenue`). */
  readonly sidebar?: SidebarKind | undefined
}

/**
 * The theme definition of a theme written by names. The accent is the named colour itself, as the fill (as for a
 * colour the user picks); the engine then holds every threshold, and the tone the user chose moves it like any theme.
 */
export function namedTheme(pick: NamedThemePick): ThemeDef {
  const accent = fromHex(hueColor(pick.accent))
  const ground = pick.ground === 'gray' ? null : fromHex(hueColor(pick.ground ?? pick.accent))
  const second = pick.second ? fromHex(hueColor(pick.second)) : null
  return {
    id: pick.id, label: pick.label,
    // With no hue of their own the grays still say which way the user's colours turn: the accent's.
    hue: ground ? ground.h : accent.h, chroma: ground ? grayChroma(ground) : 0,
    accent: [accent.C, accent.h], fill: [accent.L, accent.C],
    ...(second ? { second: [second.C, second.h] as const } : {}),
    sidebar: pick.sidebar ?? 'tenue', palette: 'crisp',
  }
}

/** A tint in twelve steps. */
export interface HueScale {
  /** The twelve steps as `#rrggbb`: step 1 is at index 0. */
  readonly steps: readonly string[]
  /** The label that reads on steps 9 and 10 (4.5:1): white, or a near-black in the tint. */
  readonly on: string
}

/**
 * The lightness of steps 1 to 8, the same for every tint, so every scale reads the same. They are the engine's own
 * levels: in light the page (0.988), the accent's soft background (0.94), the selection (0.915) and the border of a
 * control (0.63); in dark the sidebar (0.205), the page (0.235), the soft background (0.29), the selection (0.31),
 * the lines (0.33) and the border of a control (0.53).
 */
const LADDER: Readonly<Record<ThemeScheme, readonly number[]>> = {
  light: [0.988, 0.955, 0.94, 0.915, 0.895, 0.87, 0.78, 0.63],
  dark: [0.205, 0.235, 0.27, 0.29, 0.31, 0.33, 0.4, 0.53],
}
/** How much of the tone's chroma steps 1 to 8 carry: a breath on the backgrounds, most of it on the borders. */
const CURVE = [0.05, 0.12, 0.2, 0.3, 0.38, 0.46, 0.6, 0.8] as const
/** The share of a gray's chroma on steps 1 to 8: the two backgrounds are the quietest. */
const GRAY_CURVE = [0.5, 0.8, 1, 1, 1, 1, 1, 1] as const

/**
 * A Vivid tone is also a step deeper on the backgrounds of a component and the borders (steps 3 to 7): darker in
 * light, lighter in dark, as the engine's selection is. A pale red or violet has little chroma to gain, and would
 * otherwise read as its Balanced tone.
 */
const VIVID_DEPTH: Readonly<Record<ThemeScheme, number>> = { light: -0.02, dark: 0.015 }

/** The most chroma a screen can show at a lightness and a hue. */
const most = (L: number, h: number) => fit({ L, C: 0.4, h }).C
/**
 * A chroma brought inside what a screen can show at that lightness, without ever reaching its edge: the more is
 * asked, the closer it gets. Cutting at the edge instead would give two tones of a saturated tint the same colour.
 */
function within(C: number, L: number, h: number): number {
  const max = most(L, h)
  return max > 0 ? max * (1 - Math.exp(-C / max)) : 0
}

const WHITE = toHex({ L: 1, C: 0, h: 0 })
const holds = (grounds: readonly string[], min: number) => (hex: string) => grounds.every((bg) => contrast(hex, bg) >= min + MARGIN)

/**
 * A fill and its label. The label is the white or a near-black, whichever reads better at the start; the fill moves
 * away from it until the label holds 4.5:1 on it and on its hover, then away from the grounds until it is seen
 * without text (3:1), as long as the label still holds: the label wins, as in the engine.
 */
function solid(start: Oklch, grounds: readonly string[], scheme: ThemeScheme): { c: Oklch; on: string } {
  const at = (L: number) => fit({ ...start, L })
  let c = at(start.L)
  const ink = toHex({ L: 0.13, C: 0.02, h: start.h })
  const on = contrast(WHITE, toHex(c)) >= contrast(ink, toHex(c)) ? WHITE : ink
  const reads = (x: Oklch) => holds([toHex(x), toHex(hoverOf(x))], 4.5)(on)
  const away = luminance(on) > 0.5 ? -1 : 1
  while (!reads(c) && c.L > 0 && c.L < 1) c = at(c.L + away * 0.004)
  const seen = holds(grounds, 3)
  const dir = scheme === 'light' ? -1 : 1
  while (!seen(toHex(c)) && c.L > 0 && c.L < 1) {
    const next = at(c.L + dir * 0.002)
    if (!reads(next)) break
    c = next
  }
  return { c, on }
}

/** A colour moved away from the grounds (darker in light, lighter in dark) until it holds `min` on each of them. */
function apart(start: Oklch, grounds: readonly string[], min: number, scheme: ThemeScheme): string {
  const ok = holds(grounds, min)
  const dir = scheme === 'light' ? -1 : 1
  let c = fit(start)
  while (!ok(toHex(c)) && c.L > 0 && c.L < 1) c = fit({ ...start, L: c.L + dir * 0.004 })
  return toHex(c)
}

function schemeOf(scheme: ThemeScheme): ThemeScheme {
  if (scheme !== 'light' && scheme !== 'dark') throw new Error(`unknown scheme: ${String(scheme)}`)
  return scheme
}

/**
 * The gray of a tint in twelve steps: its hue at a chroma too low to read as a colour. `null` is the gray with no hue.
 * Step 8 holds 3:1 on steps 1 and 2, step 11 holds 4.5:1 and step 12 7:1 on steps 1 to 5. Pure: same arguments, same
 * result.
 */
export function grayScale(hue: HueName | null, scheme: ThemeScheme): HueScale {
  const light = schemeOf(scheme) === 'light'
  const tint = hue === null ? { L: 0, C: 0, h: 0 } : fromHex(hueColor(hue))
  const C = hue === null ? 0 : grayChroma(tint)
  const h = tint.h
  const steps = LADDER[scheme].map((L, i) => toHex({ L, C: C * GRAY_CURVE[i]!, h }))
  const grounds = [steps[0]!, steps[1]!]
  steps[7] = apart({ L: LADDER[scheme][7]!, C, h }, grounds, 3, scheme)
  const fill = solid({ L: light ? 0.55 : 0.6, C, h }, grounds, scheme)
  const under = steps.slice(0, 5)
  return {
    steps: [...steps, toHex(fill.c), toHex(hoverOf(fill.c)), apart({ L: light ? 0.5 : 0.67, C, h }, under, 4.5, scheme), apart({ L: light ? 0.2 : 0.92, C: C * (light ? 1.5 : 0.5), h }, under, 7, scheme)],
    on: fill.on,
  }
}

/**
 * A tint in twelve steps, in one of the three tones (the engine's: Calm 0.45, Balanced 1 and Vivid 1.7 times the
 * tint's chroma, inside what a screen can show) and in a scheme. Steps 3 to 8 are another colour in each tone, for
 * every tint; the fill and the text of a tint already at the edge of the screen (amber, lime and turquoise in light)
 * are the same in Balanced and in Vivid. Step 8 holds 3:1 on its own steps 1 and 2 and on the
 * gray's; step 9 holds 3:1 on the gray's steps 1 and 2 (the page and the sidebar) and its label 4.5:1 on steps 9 and
 * 10; step 11 holds 4.5:1 on steps 1 to 3 and on the gray's 1 and 2; step 12 holds 7:1 on steps 1 to 5. A tint that
 * is light by nature (amber, lime) gets a darker fill in light, since a fill must be seen on the page. Pure: same
 * arguments, same result.
 */
export function hueScale(hue: HueName, tone: TonePreset, scheme: ThemeScheme): HueScale {
  const light = schemeOf(scheme) === 'light'
  const tint = fromHex(hueColor(hue))
  const peak = tint.C * toneChroma(tone)
  const h = tint.h
  const gray = grayScale(hue, scheme).steps
  const page = [gray[0]!, gray[1]!]
  const pale = LADDER[scheme].map((L0, i) => {
    const L = tone === 'vivid' && i >= 2 && i <= 6 ? L0 + VIVID_DEPTH[scheme] : L0
    return { L, C: within(peak * CURVE[i]!, L, h), h }
  })
  const steps = pale.map(toHex)
  steps[7] = apart(pale[7]!, [steps[0]!, steps[1]!, ...page], 3, scheme)
  // The fill is the named colour at its own lightness, kept where a label can still read on it.
  const fill = solid({ L: Math.min(Math.max(tint.L, 0.5), 0.8), C: peak, h }, page, scheme)
  // The accent as text and the ink of a selection start where the engine's do.
  const text = light ? { L: 0.49, C: peak, h } : { L: 0.78, C: Math.min(peak * 0.78, tone === 'vivid' ? 0.16 : 0.125), h }
  const strong = light ? { L: 0.36, C: peak * 0.7, h } : { L: 0.93, C: Math.min(peak * 0.3, 0.06), h }
  return {
    steps: [...steps, toHex(fill.c), toHex(hoverOf(fill.c)), apart(text, [...steps.slice(0, 3), ...page], 4.5, scheme), apart(strong, steps.slice(0, 5), 7, scheme)],
    on: fill.on,
  }
}
