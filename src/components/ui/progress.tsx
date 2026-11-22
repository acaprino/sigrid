// How far a task is: a bar (`Progress`), a ring (`ProgressRing`) or blocks (`ProgressSegments`), one API for the three.
// Written by hand: Ark's Progress names the bar with its own value («45%») and gives no `aria-valuetext`, and there is no
// keyboard to inherit; here the app names the bar, the toolkit says the value. The form is Park UI's progress recipe
// (102769c): a track 8px (`sm`) or 10px (`md`) tall with the corners of a control (l1), the range filling it from the
// start. Not taken from it: the stripes, the gradient of its indeterminate state and its animation (no gradient, no
// loop but the skeletons: DESIGN.md), and the pill shape (round only for avatars, dots and switches, R7).
// The ring and the blocks are ours; Park's circular recipe was not read.
// The colours: the track is the quiet fill (the ink at 6%), the range is the accent as progress (R2); done is the
// success colour and a failure the destructive one, each with a word (DESIGN.md "Status": a colour is never alone).
// Nothing moves: the range jumps to the value, as the steps do. A progress that changes by events (an upload) is not a
// gesture, so no tween (DESIGN.md Motion). The range is `primary`, the fill of the accent, as in the checkbox and the
// switch (DESIGN.md Colors).
// Not knowing how far it is (`value={null}`) is a track with no range and the word «In progress», not a loop.
// For screen readers: `role="progressbar"` named by the app, with `aria-valuenow` and, always, `aria-valuetext` («45%»,
// «Complete»). The visible text repeats it and is hidden from them. A page that updates a value often should
// announce the end and the failure only, in a live region of its own, not every percent.
import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { useWords } from "../../words"

export type ProgressProps = {
  /** How much is done, from 0 to `max`. `null`: it is not known how far it is. */
  value: number | null
  /** The value that means done. 100 by default; for `ProgressSegments`, 10, and it is the number of blocks. */
  max?: number | undefined
  /** What is progressing («Upload», «Import»), for screen readers. */
  "aria-label": string
  /** What the value says, in place of the toolkit's words («16 seconds left»): read by screen readers and shown by `showValue`. */
  valueText?: string | undefined
  /**
   * The value is what is left (a time running out), not what is done: it empties, a full one is the start, not the end, so it is
   * never «Complete». Say what is left in `valueText` («16 seconds left»).
   */
  countdown?: boolean | undefined
  /** Shows the value as text while it is under way. Done, failed and not knowing how far it is always say their word: a colour is never alone (DESIGN.md Status). */
  showValue?: boolean | undefined
  size?: "sm" | "md" | undefined
  /** `error`: the task failed. The range stays where it stopped, in red, and the text says so. */
  status?: "error" | undefined
  className?: string | undefined
}

type Mood = "active" | "indeterminate" | "complete" | "error"
const FILL: Record<Mood, string> = { active: "bg-primary", indeterminate: "bg-primary", complete: "bg-success", error: "bg-destructive" }
const STROKE: Record<Mood, string> = { active: "stroke-primary", indeterminate: "stroke-primary", complete: "stroke-success", error: "stroke-destructive" }
const TEXT: Record<Mood, string> = { active: "text-ink-soft", indeterminate: "text-ink-soft", complete: "text-success", error: "text-destructive" }

/** What a progress shows: where it is, in what mood, and what it says. */
function useProgress({ value, max = 100, valueText, status, countdown }: Pick<ProgressProps, "value" | "max" | "valueText" | "status" | "countdown">) {
  const words = useWords()
  const top = max > 0 ? max : 100
  const known = value !== null && Number.isFinite(value)
  const now = known ? Math.min(Math.max(value, 0), top) : 0
  const mood: Mood = status === "error" ? "error" : !known ? "indeterminate" : now >= top && !countdown ? "complete" : "active"
  const text = valueText ?? (mood === "error" ? words.progress.error : mood === "indeterminate" ? words.progress.indeterminate : mood === "complete" ? words.progress.complete : words.progress.value(now, top))
  const aria = {
    role: "progressbar" as const,
    "aria-valuemin": 0,
    "aria-valuemax": top,
    "aria-valuenow": known ? now : undefined,
    "aria-valuetext": text,
    "data-state": mood,
  }
  return { mood, now, top, fraction: now / top, text, aria }
}

const TRACK = "bg-ink/6"

/** The text beside the shape: the value, or what became of the task. Said once to screen readers, by `aria-valuetext`. */
const Text = ({ mood, children }: { mood: Mood; children: React.ReactNode }) => (
  <span data-slot="progress-text" aria-hidden="true" className={cn("text-xs font-medium tabular-nums", TEXT[mood])}>
    {children}
  </span>
)

/** A bar that fills from the start. */
function Progress({ size = "md", showValue, className, ...props }: ProgressProps) {
  const p = useProgress(props)
  return (
    <div data-slot="progress" data-state={p.mood} className={cn("flex w-full flex-col gap-1.5", className)}>
      <div {...p.aria} aria-label={props["aria-label"]} className={cn("w-full overflow-hidden rounded-sm", TRACK, size === "sm" ? "h-2" : "h-2.5")}>
        <div data-slot="progress-range" className={cn("h-full", FILL[p.mood])} style={{ width: `${p.fraction * 100}%` }} />
      </div>
      {showValue || p.mood !== "active" ? <Text mood={p.mood}>{p.text}</Text> : null}
    </div>
  )
}

export type ProgressRingProps = ProgressProps & {
  /** What the ring holds, in place of the percent («16» for a countdown: pass the time left as the value and it empties). */
  children?: React.ReactNode
}

/** A ring that fills from the top, clockwise. With the value falling (the time left) it empties: a countdown. */
function ProgressRing({ size = "md", showValue, children, className, ...props }: ProgressRingProps) {
  const p = useProgress(props)
  const inside =
    children ?? (p.mood === "complete" ? <CheckIcon aria-hidden="true" className="size-4" /> : p.mood === "error" ? <XIcon aria-hidden="true" className="size-4" /> : showValue && p.mood === "active" ? p.text : null)
  return (
    <div data-slot="progress-ring" data-state={p.mood} className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <div {...p.aria} aria-label={props["aria-label"]} className={cn("relative flex items-center justify-center", size === "sm" ? "size-10" : "size-16")}>
        <svg viewBox="0 0 36 36" aria-hidden="true" className="size-full -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" strokeWidth="4" className="stroke-ink/6" />
          <circle cx="18" cy="18" r="16" fill="none" strokeWidth="4" pathLength={100} strokeDasharray={`${p.fraction * 100} 100`} strokeLinecap={p.fraction > 0 ? "round" : "butt"} className={STROKE[p.mood]} />
        </svg>
        <span aria-hidden="true" className={cn("absolute font-medium tabular-nums", TEXT[p.mood], size === "sm" ? "text-2xs" : "text-sm")}>
          {inside}
        </span>
      </div>
      {p.mood !== "active" ? <Text mood={p.mood}>{p.text}</Text> : null}
    </div>
  )
}

/** Blocks that fill in one by one, like the level of a meter: `value` of `max` blocks (10 by default, at most 24). */
function ProgressSegments({ size = "md", showValue, className, max = 10, ...props }: ProgressProps) {
  const p = useProgress({ ...props, max: Math.min(Math.max(Math.round(max), 1), 24) })
  const filled = Math.round(p.now)
  return (
    <div data-slot="progress-segments" data-state={p.mood} className={cn("flex w-full flex-col gap-1.5", className)}>
      <div {...p.aria} aria-label={props["aria-label"]} className="flex w-full gap-1">
        {Array.from({ length: p.top }, (_, i) => (
          <span key={i} data-slot="progress-segment" data-filled={i < filled ? "" : undefined} className={cn("flex-1 rounded-sm", size === "sm" ? "h-2" : "h-2.5", i < filled ? FILL[p.mood] : TRACK)} />
        ))}
      </div>
      {showValue || p.mood !== "active" ? <Text mood={p.mood}>{p.text}</Text> : null}
    </div>
  )
}

export { Progress, ProgressRing, ProgressSegments }
