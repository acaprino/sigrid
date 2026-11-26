// The look of a graph's lines, in one place: the dash, the width and the colour of each `style` and `tone` a
// `GraphEdge` takes, and how the canvas marks a line of the chosen thing, the chosen line or the path's. `GraphCanvas` draws its lines
// with it and `GraphLegend` the sample of each entry of its key, so a change to a line changes its key. A line and a
// sample carry their look as four custom properties (`lineVars`), which one rule of graph.css draws; graph.css adds
// only what is the canvas's own state there (a line picked to take away, a dimmed one).
import type { CSSProperties } from 'react'
import type { GraphEdge } from './GraphCanvas'

/** The dash of a line, as a `GraphEdge` takes it. */
export type LineStyle = NonNullable<GraphEdge['style']>
/** The colour of a line, as a `GraphEdge` takes it. */
export type LineTone = NonNullable<GraphEdge['tone']>

/** What a line is drawn with: its colour (a token of the theme), its width in px, its dash (SVG's `stroke-dasharray`) and its ends. */
export type LineLook = { stroke: string; width: number; dash: string; cap: 'butt' | 'round' }

/**
 * The dash of each style and its width. What a kind of line means is said by its dash and its words, never by its
 * colour alone. A dotted line is round dots every 4px, 2px thick so its dots are seen.
 */
export const LINE_STYLES = {
  solid: { dash: 'none', width: 1, cap: 'butt' },
  dashed: { dash: '6 4', width: 1, cap: 'butt' },
  dotted: { dash: '0 4', width: 2, cap: 'round' },
} as const satisfies Record<LineStyle, Omit<LineLook, 'stroke'>>

/** The colour of each tone, from the theme (each keeps 3:1 on the canvas), and its width: the accent, the path's, is thicker. */
export const LINE_TONES = {
  default: { stroke: 'var(--color-ink-mute)', width: 1 },
  accent: { stroke: 'var(--color-accent)', width: 2 },
  warning: { stroke: 'var(--color-warning)', width: 1 },
  destructive: { stroke: 'var(--color-destructive)', width: 1 },
} as const satisfies Record<LineTone, Pick<LineLook, 'stroke' | 'width'>>

/** A line of the chosen thing: the soft ink on a line of the default tone (a tone of its own stays), a little thicker. */
export const LINE_NEAR = { stroke: 'var(--color-ink-soft)', width: 1.5 } as const
/** The chosen line (`selectedEdge`): the accent on a line of the default tone (a tone of its own stays), and thicker than any other line, so it is told by its weight and not by its colour alone. */
export const LINE_CHOSEN = { stroke: 'var(--color-accent)', width: 3 } as const
/** The path's line (`steps`): as thick as the accent, also when it keeps a tone of its own. */
export const LINE_PATH = { width: 2 } as const

const has = (table: object, key: unknown) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key)

/**
 * The look of a line of this style and tone: at rest (what the key shows), or marked by the canvas as a line of the
 * chosen thing (`near`), of the path (`path`) or as the chosen line itself (`chosen`). A style or a tone the types do not have (from JavaScript) is drawn as
 * the default one, solid and in the muted ink.
 */
export function lineLook(style?: LineStyle, tone?: LineTone, { near = false, path = false, chosen = false }: { near?: boolean; path?: boolean; chosen?: boolean } = {}): LineLook {
  const dash = has(LINE_STYLES, style) ? LINE_STYLES[style as LineStyle] : LINE_STYLES.solid
  const own = has(LINE_TONES, tone) ? (tone as LineTone) : 'default'
  return {
    stroke: chosen && own === 'default' ? LINE_CHOSEN.stroke : near && own === 'default' ? LINE_NEAR.stroke : LINE_TONES[own].stroke,
    width: Math.max(dash.width, LINE_TONES[own].width, near ? LINE_NEAR.width : 0, path ? LINE_PATH.width : 0, chosen ? LINE_CHOSEN.width : 0),
    dash: dash.dash,
    cap: dash.cap,
  }
}

/** The custom properties of each look given so far, by its four values: the few dozen looks `lineLook` makes, at most. */
const given = new Map<string, CSSProperties>()

/**
 * The look as the custom properties graph.css draws a line with: on a line of the canvas, on a sample of the key. The
 * same look is always the same object, so a line whose look a change of choice leaves as it was hands React Flow's
 * memoised line the `style` it had, and the line is not drawn again. The object is shared: nothing changes it.
 */
export function lineVars(look: LineLook): CSSProperties {
  const key = [look.stroke, look.width, look.dash, look.cap].join('|')
  let vars = given.get(key)
  if (vars === undefined) {
    vars = { '--sigrid-line-stroke': look.stroke, '--sigrid-line-width': String(look.width), '--sigrid-line-dash': look.dash, '--sigrid-line-cap': look.cap } as CSSProperties
    given.set(key, vars)
  }
  return vars
}
