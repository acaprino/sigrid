// The steps of a task as a path (a signup, an import, a lesson, a pipeline): numbered dots joined by a line. It shows
// what is done, where the user is and what is left, and the next step by its name: people finish when they know what
// remains. Two facts are kept apart: what became of a step (`status`: done, running, to do, skipped, failed; without
// it, what comes before `current` is done) and which step is on the screen (`current`). The accent is progress (R2):
// a step done is a check on the accent tint, a running one a clock on it, the step on the screen is the one solid dot
// (with its number, or the mark of its status: a done step looked at keeps its check), the steps to come and the
// skipped ones (a dash) are a quiet fill, and the line is the accent after each step done. Round, as a dot may be (R7).
// Nothing moves: the toolkit has no loop to reuse (a progress that does not know how far it is stands still too), so a
// running step is told by its mark and its word («in progress», shown at the end of its row in a column).
// With `onStepSelect` a step that is done, running, skipped or failed is a button that goes to it; one to come only when
// the app gave it a `status` itself; a `disabled` one never, and it shows why (`reason`). In a column the whole row is
// the target and takes the focus ring.
// For screen readers it is an ordered list; the step on the screen has `aria-current="step"`, and each step says what
// became of it (`words.steps`, in any language).
// A step that failed has the one look of a failure: Sigrid's `error` icon (the circle with an X) in its dot, in red.
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { FOCUS_RING } from "../lib/focus"
import { useWords } from "../words"

export type StepItem = {
  /** The name of the step («Account», «Choose a plan»): short, as it is the next thing the user reads. */
  label: string
  /** A line under the name, for the step the user is on or the one next: what it asks. */
  description?: string | undefined
  /**
   * What became of the step, whatever its place: `done`, `running` (a clock, and the words «in progress»), `todo`,
   * `skipped` (a dash) or `error` (it failed: red, with Sigrid's `error` icon). Absent: the steps before `current` are done and the others are to come.
   */
  status?: "done" | "running" | "todo" | "skipped" | "error" | undefined
  /** A short fact at the end of the row («2 min», «3 of 6»), in figures of one width. In a column only. */
  meta?: string | undefined
  /** The step cannot be gone to yet: it is never a button. Say why in `reason`. */
  disabled?: boolean | undefined
  /** Why a `disabled` step cannot be gone to yet («Run the analysis first»): shown under its name, so read by everyone. */
  reason?: string | undefined
}

export type StepsProps = {
  /** Name of the path for screen readers («Signup»). */
  "aria-label": string
  steps: readonly StepItem[]
  /**
   * The step on the screen, counting from 0: it has `aria-current` and the one solid dot, whatever its status. Steps
   * without a `status` are done before it and to come after it; `steps.length` means all are done, -1 that none is on the screen.
   */
  current: number
  /**
   * With it, each step that is done, running, skipped or failed is a button that goes to it; a step to come only when
   * its `status` is given, and a `disabled` one never. In a column the whole row is the target.
   */
  onStepSelect?: ((index: number) => void) | undefined
  /**
   * `vertical` (the default): a column, with the descriptions beside the dots. `horizontal`: a row; it measures its own
   * width, so it needs one of its own (`w-full`, or a width), and in a place too narrow for the names it keeps the
   * current one and says «Step 2 of 4».
   */
  orientation?: "vertical" | "horizontal" | undefined
  className?: string | undefined
}

type Status = NonNullable<StepItem["status"]>
type State = "done" | "current" | "upcoming" | "error" | "running" | "skipped"

// The dot is the one place where the state is a shape and a colour at once: the check, the solid dot, the quiet one.
const DOT: Record<State, string> = {
  done: "bg-accent-soft text-accent",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-ink/6 text-ink-soft",
  error: "bg-destructive-soft text-destructive",
  running: "bg-accent-soft text-accent",
  skipped: "bg-ink/6 text-ink-soft",
}
const LABEL: Record<State, string> = {
  done: "text-ink-soft",
  current: "font-semibold text-ink",
  upcoming: "text-ink-mute",
  error: "font-semibold text-destructive",
  running: "font-medium text-ink",
  skipped: "text-ink-mute",
}
// The mark of a status in its dot; a step to do shows its number.
const MARK = { done: "check", running: "clock", skipped: "minus", error: "error" } as const
// In a column the button's target and its focus ring (R8) are the whole row: 8px over the row's own box at each end, so
// the rows meet and the ring is even around the name. Under forced colours the system's outline is on the name.
const ROW_TARGET =
  "outline-hidden after:absolute after:inset-x-0 after:-top-2 after:rounded-sm after:content-[''] focus-visible:after:outline-solid focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"

function Steps({ steps, current, onStepSelect, orientation = "vertical", className, ...props }: StepsProps) {
  const words = useWords()
  const horizontal = orientation === "horizontal"
  return (
    <div className={cn(horizontal && "@container", className)}>
      <ol data-slot="steps" data-orientation={orientation} role="list" aria-label={props["aria-label"]} className={cn("flex", horizontal ? "items-start gap-2" : "flex-col")}>
        {steps.map((step, index) => {
          const status: Status = step.status ?? (index < current ? "done" : "todo")
          const on = index === current
          const state: State = status === "todo" ? (on ? "current" : "upcoming") : status
          const last = index === steps.length - 1
          // The step on the screen is the one solid dot and the strong name, whatever became of it; a failure stays red.
          const shown: State = on && state !== "error" ? "current" : state
          const mark = status === "todo" ? null : MARK[status]
          const button = onStepSelect !== undefined && !step.disabled && (status !== "todo" || step.status !== undefined)
          const dot = (
            <span data-slot="step-dot" aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-medium tabular-nums", DOT[shown])}>
              {mark ? <Icon name={mark} className="size-3.5" /> : index + 1}
            </span>
          )
          // The line to the next step: the accent after a step done (without a status: as far as the steps before `current`), the divider after.
          const lit = step.status === undefined || step.status === "error" ? index < current : step.status === "done"
          const line = last ? null : <span data-slot="step-line" aria-hidden="true" className={cn(horizontal ? "h-px min-w-4 flex-1" : "my-1 min-h-4 w-px flex-1", lit ? "bg-primary" : "bg-line")} />
          // A running step says so where it is seen, at the end of its row, unless the app has a fact to put there.
          const meta = horizontal ? undefined : (step.meta ?? (status === "running" ? words.steps.running : undefined))
          const text = (
            <>
              {step.label}
              <span className="sr-only">, {words.steps[state]}</span>
            </>
          )
          const body = (
            // A row too narrow for the names keeps the current one; the others are still read, and the summary says where it is.
            <div className={cn("min-w-0", horizontal ? cn("pe-2", index !== current && "@max-md:sr-only") : last ? "" : "pb-4")}>
              {button ? (
                <button
                  type="button"
                  data-slot="step-name"
                  onClick={() => onStepSelect?.(index)}
                  className={cn("rounded-sm text-start text-sm hover:text-ink", LABEL[shown], horizontal ? cn("pointer-coarse:min-h-11", FOCUS_RING) : cn(ROW_TARGET, last ? "after:-bottom-2" : "after:bottom-2"))}
                >
                  {text}
                </button>
              ) : (
                <p data-slot="step-name" className={cn("text-sm", LABEL[shown])}>
                  {text}
                </p>
              )}
              {step.description ? <p className="text-xs text-ink-mute">{step.description}</p> : null}
              {step.disabled && step.reason ? (
                <p data-slot="step-reason" className="text-xs text-ink-mute">
                  {step.reason}
                </p>
              ) : null}
            </div>
          )
          return (
            <li
              key={index}
              data-slot="step"
              data-state={state}
              data-disabled={step.disabled ? "" : undefined}
              aria-current={on ? "step" : undefined}
              className={cn("flex", horizontal ? cn("min-w-0 flex-col gap-2", last ? "flex-none" : "flex-1") : cn("gap-3", button && "relative pointer-coarse:min-h-11"))}
            >
              {horizontal ? (
                <>
                  <div className="flex items-center gap-2">
                    {dot}
                    {line}
                  </div>
                  {body}
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    {dot}
                    {line}
                  </div>
                  {body}
                  {meta === undefined ? null : (
                    // The word of a running step is already in its name for screen readers; a fact of the app is read.
                    <span data-slot="step-meta" aria-hidden={step.meta === undefined ? true : undefined} className="ms-auto shrink-0 ps-2 pt-0.5 text-xs text-ink-mute tabular-nums">
                      {meta}
                    </span>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>
      {horizontal && current >= 0 ? (
        <p data-slot="steps-summary" aria-hidden="true" className="mt-2 text-xs text-ink-mute @md:hidden">
          {words.steps.summary(Math.min(current + 1, steps.length), steps.length)}
        </p>
      ) : null}
    </div>
  )
}

export { Steps }
