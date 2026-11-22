// A theme from two colours, and the accents that go with a base colour (owner, 2026-11-22: «due colori: la base, che
// di suo è il bianco ma si può cambiare, portata sulle tonalità chiarissime, e un accento scelto con i principi della
// colorimetria, suggerito in automatico»).
// - The base is the page. Whatever colour is chosen, only its hue stays: it is brought to a very light tone (an OKLCH
//   lightness of 0.985 and a chroma of 0.018 at most), so the page is a white with a breath of that colour and the text
//   keeps its contrast. No base, or a gray one, is the neutral white. In dark the same hue is a very dark tone.
// - The accent is what the eye is led by (R2). It is not picked from the whole wheel: from the base's hue the classical
//   harmonies give the hues that go with it, all on one wheel, OKLCH's, where equal turns are equal steps for the eye:
//   the split complement (150° to either side), the complement (180°), the triad (120°), the neighbours (30°) and the
//   base's own hue. Each is drawn at the lightness and saturation of a button, inside what a screen can show.
// - They are ranked. A split complement comes first: it is clearly another colour without the vibration of the exact
//   opposite. A hue that would read as the red of an error is moved out of its room and ranked lower, and one beside
//   the green of success or the amber of a warning loses a little: an accent must never be taken for a status. A hue
//   between yellow and lime loses more: yellow is itself only when it is light, and at the lightness a button needs
//   under its label it turns to olive.
// A white or gray base has no hue to start from: the proposals are then eight hues spread round the wheel, the blue
// first. The theme engine then moves every colour until its contrast thresholds hold, as for any theme.
import { FIXED, STATUS, fit, fromHex, isAccentColor, toHex, type OwnTheme } from './theme-engine'

/** The principle a proposed accent comes from. `spread`: the base has no hue, the proposals are spread round the wheel. */
export const HARMONIES = ['split', 'complement', 'triad', 'analogous', 'mono', 'spread'] as const
export type Harmony = (typeof HARMONIES)[number]

export interface AccentSuggestion {
  /** Stable for a base: `split+150`, `mono`, `spread-264`. */
  readonly id: string
  readonly harmony: Harmony
  /** How far round the wheel from the base's hue, in degrees. Zero for `mono` and for `spread`. */
  readonly turn: number
  /** The accent, `#rrggbb`. */
  readonly color: string
  /** The first of the list: what the toolkit would choose. */
  readonly recommended: boolean
  /** The hue fell in the red of errors and was moved out of it. */
  readonly moved: boolean
}

/** Below this chroma a colour is a gray and has no hue to build on. */
const GRAY = 0.02
/** The page in light: almost white, with at most this much of the base's colour. */
const PAGE_L = 0.985
const PAGE_C = 0.018
/** An accent as a button: mid lightness, where a hue is most itself, and as saturated as a screen allows up to this. */
const ACCENT_L = 0.56
const ACCENT_C = 0.17

const turned = (h: number) => ((h % 360) + 360) % 360
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const hueOf = (hex: string) => fromHex(hex).h
const RED = hueOf(FIXED.light.destructive)
const RED_ROOM = 24
const STATUS_HUES = [hueOf(STATUS.light.success), hueOf(STATUS.light.warning)]
/** The hues that are olive, not yellow, at the lightness of a button. */
const OLIVE = [85, 120] as const

/** A hue moved out of the red's room, to the side it was already on. */
function awayFromRed(h: number): { h: number; moved: boolean } {
  if (apart(h, RED) >= RED_ROOM) return { h, moved: false }
  const side = turned(h - RED) < 180 ? 1 : -1
  return { h: turned(RED + side * RED_ROOM), moved: true }
}

const accentAt = (h: number) => toHex(fit({ L: ACCENT_L, C: ACCENT_C, h }))

/** How much a harmony is worth before the penalties: the order the proposals come in when nothing else speaks. */
const WORTH: Record<Harmony, number> = { split: 5, complement: 4, triad: 3, analogous: 2, mono: 1, spread: 0 }
const TURNS: readonly (readonly [Harmony, number])[] = [['split', 150], ['split', -150], ['complement', 180], ['triad', 120], ['triad', -120], ['analogous', 30], ['analogous', -30], ['mono', 0]]
/** For a base with no hue: blue first, then round the wheel, the red left out. */
const SPREAD = [264, 293, 200, 160, 75, 50, 340, 135]

/** The hue of a base colour, or nothing if there is no base or it is a gray. */
function baseHue(base: string | null | undefined): number | null {
  if (!isAccentColor(base)) return null
  const c = fromHex(base)
  return c.C < GRAY ? null : c.h
}

/**
 * The page a base colour gives, in light, as `#rrggbb`: its hue at a very light tone. A colour as saturated as a
 * button leaves a breath of itself on the page; a pale one leaves less; white, a gray or no base is the neutral white.
 */
export function pageTint(base: string | null | undefined): string {
  if (!isAccentColor(base)) return toHex({ L: PAGE_L, C: 0, h: 0 })
  const c = fromHex(base)
  if (c.C < GRAY) return toHex({ L: PAGE_L, C: 0, h: 0 })
  return toHex(fit({ L: PAGE_L, C: Math.min(c.C * 0.12, PAGE_C), h: c.h }))
}

/**
 * The accents that go with a base colour, the best first. Eight at most, none two of which are the same hue to the
 * eye. `recommended` marks the first.
 */
export function accentSuggestions(base: string | null | undefined): AccentSuggestion[] {
  const hue = baseHue(base)
  const drafts =
    hue === null
      ? SPREAD.map((h, i) => ({ id: `spread-${h}`, harmony: 'spread' as Harmony, turn: 0, h, moved: false, score: -i }))
      : TURNS.map(([harmony, turn]) => {
          const { h, moved } = awayFromRed(turned(hue + turn))
          const nearStatus = STATUS_HUES.some((status) => apart(h, status) < 25)
          const olive = h >= OLIVE[0] && h <= OLIVE[1]
          const score = WORTH[harmony] - (moved ? 2.5 : 0) - (nearStatus ? 0.5 : 0) - (olive ? 2 : 0)
          return { id: turn === 0 ? 'mono' : `${harmony}${turn > 0 ? '+' : ''}${turn}`, harmony, turn, h, moved, score }
        })
  // The best first; among equals, the order of the list (a stable sort).
  const ranked = [...drafts].sort((a, b) => b.score - a.score)
  const kept: typeof ranked = []
  for (const draft of ranked) if (!kept.some((other) => apart(other.h, draft.h) < 12)) kept.push(draft)
  return kept.map(({ id, harmony, turn, h, moved }, i) => ({ id, harmony, turn, color: accentAt(h), recommended: i === 0, moved }))
}

/** What a theme of two colours is made from. */
export interface DuoPick {
  /** The base: the colour of the page, brought to a very light tone. Absent, null or a gray: the neutral white. */
  readonly base?: string | null
  /** The accent, `#rrggbb`: one of `accentSuggestions(base)`, or a colour of the user's own. */
  readonly accent: string
}

/**
 * The two colours as the engine takes them (`applyTheme`'s `own`, on any theme): the page from the base, and the
 * accent. The sidebar, the sheets, the lines and the ink follow from the page; in dark the base's hue is a very dark
 * tone. Every contrast threshold is the engine's to hold.
 */
export function duoTheme(pick: DuoPick): OwnTheme {
  // With no hue the page is the engine's neutral one in both schemes: a gray written as a colour would lend the dark
  // page the hue a gray happens to have.
  const background = baseHue(pick.base) === null ? 'neutral' : pageTint(pick.base)
  return { accent: pick.accent.toLowerCase(), background, sidebar: 'light' }
}
