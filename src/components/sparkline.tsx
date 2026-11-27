// A tiny inline trend line for a KPI or a table cell: pure SVG with zero external chart dependencies, styled purely
// through the theme's tokens (`currentColor`), with no gradients and no looping animations (DESIGN.md). When `area`
// is set, a flat translucent fill sits under the line; `highlightLast` marks the final point with a crisp dot.
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
  /** Mark the last point with a small dot. Default false. */
  highlightLast?: boolean | undefined
  /** Height in pixels (default 32). */
  height?: number | undefined
  className?: string | undefined
}

const WIDTH = 120
const PAD = 3

/** A lightweight inline trend line in pure SVG, suitable inside `Metric` cards and dense rows. */
export function Sparkline({ values, label, tone = "accent", area = false, highlightLast = false, height = 32, className }: SparklineProps) {
  const clean = values.filter((n) => Number.isFinite(n))
  if (clean.length < 2) return null

  const h = Math.max(16, height)
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = max - min
  const innerW = WIDTH - PAD * 2
  const innerH = h - PAD * 2

  const points = clean.map((v, i) => {
    const x = PAD + (i / (clean.length - 1)) * innerW
    const y = span === 0 ? h / 2 : PAD + innerH - ((v - min) / span) * innerH
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
      viewBox={`0 0 ${WIDTH} ${h}`}
      height={h}
      preserveAspectRatio="none"
      className={cn("block w-full overflow-visible", TONE[tone], className)}
    >
      {area ? <path d={fillPath} fill="currentColor" fillOpacity={0.12} stroke="none" /> : null}
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {highlightLast ? <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  )
}
