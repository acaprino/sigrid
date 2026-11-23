// The key of a graph's lines, under a `GraphCanvas`: each kind of line the app draws (its dash and its tone, as a
// `GraphEdge` takes them), its word and, when the app gives it, how many there are (a `Count`, R5). Each sample is
// drawn by the same definitions the canvas draws its lines with (`graph-lines.ts`, and one rule of graph.css), so a
// change to a line changes its key. What a kind of line means is said by its word, never by its colour alone. A list
// named by the app for screen readers, which hide the samples; a row that wraps on a narrow window. It keys the lines
// only, not the things.
import { lineLook, lineVars } from './graph-lines'
import type { GraphEdge } from './GraphCanvas'
import { Count } from './ui/count'
import { Cluster } from './ui/layout'

/** One kind of line in the key. */
export type GraphLegendEntry = {
  /** The dash of the line, as a `GraphEdge` takes it. Default `solid`. */
  style?: GraphEdge['style']
  /** The colour of the line, as a `GraphEdge` takes it. Default the muted ink. */
  tone?: GraphEdge['tone']
  /** What a line of this kind means («calls», «waits for»): always written, so the colour is never alone. */
  label: string
  /** How many lines of this kind the graph has: a `Count` after the word. Zero, or none, shows nothing. */
  count?: number | undefined
}

export type GraphLegendProps = {
  /** The kinds of line, in the order given. */
  entries: readonly GraphLegendEntry[]
  /** The name of the list for screen readers («Kinds of line»). */
  'aria-label': string
}

/** The key of a graph's lines: a sample of each kind, its word and its count, in a row that wraps. Nothing to key, nothing drawn. */
export function GraphLegend({ entries, 'aria-label': label }: GraphLegendProps) {
  if (entries.length === 0) return null
  return (
    <Cluster as="ul" gap="md" aria-label={label}>
      {entries.map((entry, at) => (
        <li key={at} data-slot="graph-legend-entry" className="inline-flex min-w-0 items-center gap-2 text-2xs text-ink-soft">
          {/* A short piece of the line, 24 by 8px, its ends kept in by the width of a dot. */}
          <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6 shrink-0">
            <line x1="2" y1="4" x2="22" y2="4" className="sigrid-graph-sample" style={lineVars(lineLook(entry.style, entry.tone))} />
          </svg>
          <span>{entry.label}</span>
          <Count value={entry.count} />
        </li>
      ))}
    </Cluster>
  )
}
