// A level meter: a few thin bars whose heights follow a live level the app reads (a microphone's volume while it
// listens, a transfer's rate), oldest first, the newest at the end. It moves only with its data, never by itself and
// never in a loop, and only where the app turned motion on and the system allows it; otherwise the bars rest at half
// their height and the words beside it say what is going on. The bars are 3px wide, 20px tall at most, in the accent:
// something is on (R2). A height is one of eight steps, so a level never draws a size off the scale.
import { cn } from "../lib/utils"
import { useMotionAllowed } from "../internal/motion"

export type LevelMeterProps = {
  /** The levels from 0 to 1, oldest first: one bar each (five to seven read best). */
  levels: readonly number[]
  /** What it measures, for screen readers («Microphone level»). */
  label: string
  /** Motion for this meter only, over `MotionProvider`. */
  animated?: boolean | undefined
  className?: string | undefined
}

/** The heights a bar takes, in eighths of the meter's height. */
const STEPS = ["scale-y-12", "scale-y-25", "scale-y-37", "scale-y-50", "scale-y-62", "scale-y-75", "scale-y-87", "scale-y-100"] as const
/** A bar at rest: half its height. */
const REST = 3

/** The step of a level: 0 to 1, anything else (a missing or broken reading) as 0. */
function stepOf(level: number): number {
  const sure = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0
  return Math.round(sure * (STEPS.length - 1))
}

function LevelMeter({ levels, label, animated, className }: LevelMeterProps) {
  const live = useMotionAllowed(animated)
  const last = levels.length ? stepOf(levels[levels.length - 1]!) : 0
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((last / (STEPS.length - 1)) * 100)}
      data-slot="level-meter"
      data-live={live || undefined}
      className={cn("inline-flex h-5 shrink-0 items-center gap-0.5", className)}
    >
      {levels.map((level, at) => (
        // The bars are a row of the same thing: their place is what tells them apart.
        <span key={at} aria-hidden="true" data-slot="level-bar" className={cn("h-full w-0.75 origin-center rounded-full bg-accent", STEPS[live ? stepOf(level) : REST])} />
      ))}
    </span>
  )
}

export { LevelMeter }
