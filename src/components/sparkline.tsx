// A tiny inline trend line for a KPI or a table cell: pure SVG with zero external chart dependencies, styled purely
// through the theme's tokens (`currentColor`), with no gradients and no looping animations (DESIGN.md). When `area`
// is set, a flat translucent fill sits under the line; `highlightLast` marks the final point with a circular dot that
// stays round at any aspect ratio via `vectorEffect="non-scaling-stroke"`.
import { cn } from "../lib/utils"

/** Token colour of the trend line: accent (default), neutral, success or danger. */
export type SparklineTone = "accent" | "neutral" | "success" | "danger"

const TONE: Record<SparklineTone, string> = {
  accent: "text-primary",
  neutral: "text-ink-soft",
  success: "text-success",
  danger: "text-destructive",
}

export type SparklineProps = {
  /** Ordered numeric values, oldest first. Fewer than two finite numbers render nothing. */
  values: readonly number[]
  /** Accessible name describing what the trend represents («Daily active users»). */
  label: string
  /** Colour role of the line. Default `accent`. */
  tone?: SparklineTone | undefined
  /** Draw a flat, translucent fill under the line (no gradient). Default false. */
  area?: boolean | undefined
  /** Mark the last point with a crisp circular dot. Default false. */
  highlightLast?: boolean | undefined
  /** Height in pixels (default 32). */
  height?: number | undefined
  /** Optional fixed width in pixels (useful inside a `Cluster` or table cell with `own-class` enabled). Absent: fills container width. */
  width?: number | undefined
  className?: string | undefined
}

const VIEW_WIDTH = 120
const PAD = 3

/** A lightweight inline trend line in pure SVG, suitable inside `Metric` cards and dense rows. */
export function Sparkline({ values, label, tone = "accent", area = false, highlightLast = false, height = 32, width, className }: SparklineProps) {
  const clean: number[] = []
  let min = Infinity
  let max = -Infinity
  for (const n of values) {
    if (!Number.isFinite(n)) continue
    clean.push(n)
    if (n < min) min = n
    if (n > max) max = n
  }
  if (clean.length < 2) return null

  const h = Number.isFinite(height) ? Math.max(16, height) : 32
  const w = width !== undefined && Number.isFinite(width) && width > 0 ? width : undefined
  const span = max - min
  const halfMin = min / 2
  const halfSpan = max / 2 - halfMin
  const innerW = VIEW_WIDTH - PAD * 2
  const innerH = h - PAD * 2

  const points = clean.map((v, i) => {
    const x = PAD + (i / (clean.length - 1)) * innerW
    const ratio = span === 0 ? 0.5 : Number.isFinite(span) ? (v - min) / span : halfSpan === 0 ? 0.5 : (v / 2 - halfMin) / halfSpan
    const y = PAD + innerH - ratio * innerH
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")
  const first = points[0]!
  const last = points[points.length - 1]!
  const fillPath = `${line} L${last[0]} ${h - PAD} L${first[0]} ${h - PAD} Z`

  return (
    <svg
      role="img"
      aria-label={label}
      data-slot="sparkline"
      viewBox={`0 0 ${VIEW_WIDTH} ${h}`}
      width={w}
      height={h}
      preserveAspectRatio="none"
      className={cn("block overflow-visible", w === undefined && "w-full", TONE[tone], className)}
    >
      {area ? <path d={fillPath} fill="currentColor" fillOpacity={0.12} stroke="none" /> : null}
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {highlightLast ? (
        // Zero-length rounded stroke stays circular under non-uniform SVG scaling (`preserveAspectRatio="none"`).
        <path
          data-slot="sparkline-dot"
          d={`M${last[0]} ${last[1]} h 0.001`}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  )
}
