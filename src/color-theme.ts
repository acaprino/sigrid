// A theme from two colours (owner, 2026-11-22: «due colori e poi un accento»): the theme colour sets the buttons, the
// selection, the links and the focus ring; the spot colour is the accent, the one loud colour, kept for the few things
// that ask for attention now. The grays of the page are the third, quiet colour. The spot is not picked from the whole
// wheel: three colours that go with the theme colour are proposed, from quiet to loud, and the engine then moves each
// one until its contrast thresholds hold.
import type { ThemeDef } from './theme-catalog'
import { fit, fromHex, isAccentColor, toHex } from './theme-engine'

/** The three spot colours proposed for a theme colour, from the quietest to the loudest. */
export const SPOT_KINDS = ['quiet', 'balanced', 'loud'] as const
export type SpotKind = (typeof SPOT_KINDS)[number]

export function isSpotKind(value: unknown): value is SpotKind {
  return (SPOT_KINDS as readonly unknown[]).includes(value)
}

/** The hue of the fixed red (errors, deleting): a spot colour keeps away from it, so that attention never reads as an error. */
const RED_HUE = 27
const RED_ROOM = 24
const turn = (h: number) => ((h % 360) + 360) % 360
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/** A hue moved out of the red's room, to the side it was already on. */
function awayFromRed(h: number): number {
  if (apart(h, RED_HUE) >= RED_ROOM) return h
  const side = turn(h - RED_HUE) < 180 ? 1 : -1
  return turn(RED_HUE + side * RED_ROOM)
}

/** How each proposal sits against the theme colour: how far around the wheel, how saturated, how light. */
const SPOTS: Record<SpotKind, { readonly turn: number; readonly C: number; readonly L: number }> = {
  // A neighbour on the wheel: it reads as a second voice of the same colour.
  quiet: { turn: 55, C: 0.11, L: 0.6 },
  // A split complement: clearly another colour, without the vibration of the exact opposite.
  balanced: { turn: -150, C: 0.16, L: 0.68 },
  // The complement: the strongest pair there is.
  loud: { turn: 180, C: 0.2, L: 0.66 },
}

/** Below this the theme colour is a gray and has no hue to start from: the proposals start from a blue-green. */
const GRAY = 0.02
const GRAY_HUE = 190

/** The three spot colours that go with a theme colour (`#rrggbb`), as `#rrggbb`. */
export function spotSuggestions(color: string): Record<SpotKind, string> {
  const base = isAccentColor(color) ? fromHex(color) : { L: 0.5, C: 0, h: GRAY_HUE }
  const hue = base.C < GRAY ? GRAY_HUE : base.h
  const one = (kind: SpotKind) => {
    const s = SPOTS[kind]
    return toHex(fit({ L: s.L, C: s.C, h: awayFromRed(turn(hue + s.turn)) }))
  }
  return { quiet: one('quiet'), balanced: one('balanced'), loud: one('loud') }
}

/** What a colour theme is made from. */
export interface ColorThemePick {
  readonly id: string
  readonly label: string
  /** The theme colour, `#rrggbb`. */
  readonly color: string
  /** The spot colour: one of the three proposals, or a colour of the user's own (`#rrggbb`). Absent: no spot. */
  readonly spot?: SpotKind | string | null
}

const gray = (L: number) => toHex({ L, C: 0, h: 0 })

/** The spot colour a pick asks for, as `#rrggbb`, or nothing. */
export function spotOf(pick: Pick<ColorThemePick, 'color' | 'spot'>): string | undefined {
  if (isSpotKind(pick.spot)) return spotSuggestions(pick.color)[pick.spot]
  return isAccentColor(pick.spot) ? pick.spot.toLowerCase() : undefined
}

/**
 * The theme the engine builds a colour theme's tokens from: neutral grays in both schemes and in every tone (the theme
 * has no chroma of its own, so no tone tints the sidebar; `hue` only turns the user's colours, as in every theme). The
 * sidebar is the ground, a step below the page in both schemes (about 1.07:1 in light and 1.09:1 in dark with the tone as designed); the
 * sheets are a step above the page: pure white in light, and only there, on a near-white page about as light as the
 * catalog's, which does not glare; in dark the catalog's anthracite. The colour is in the buttons and the selection,
 * the spot in what asks for attention; in dark it is lifted to stay brilliant.
 *
 * The lightness values are bound by what the engine derives from them (`startOf` and `tokensFor` in theme-engine.ts).
 * In dark, with the tone as designed, the selection is the page plus 0.048 and the muted text must hold 4.5:1 on it:
 * a page above 0.245 makes the engine move the muted text. In light the soft background of the accent is the page
 * minus 0.035, and the picked colour must hold 4.5:1 on it to stay the accent as text: a darker page turns more picks
 * to the darker step. A light sidebar below 0.964 turns the label of some mid-tone fills in the default tone.
 */
export function colorTheme(pick: ColorThemePick): ThemeDef {
  const p = fromHex(pick.color)
  // Never exactly zero: zero chroma would be a theme whose accent is the ink itself.
  const chroma = Math.max(p.C, 0.001)
  const spot = spotOf(pick)
  return {
    id: pick.id, label: pick.label, hue: 80, chroma: 0, accent: [chroma, p.h], sidebar: 'tenue', palette: 'crisp',
    ...(spot ? { spot } : {}),
    surfaces: {
      light: { paper: gray(0.988), sidebar: gray(0.965), raised: gray(1), line: gray(0.9), ink: gray(0.2), accent: pick.color, fill: pick.color },
      dark: {
        paper: gray(0.235), sidebar: gray(0.195), raised: gray(0.285), line: gray(0.33), ink: gray(0.92),
        accent: toHex({ L: 0.8, C: Math.min(p.C, 0.15), h: p.h }), fill: toHex({ L: 0.62, C: p.C, h: p.h }),
      },
    },
  }
}
