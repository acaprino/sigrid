// The steps of a task as a path (a signup, an import, a lesson): numbered dots joined by a line, that light up one by one
// as the user goes. It shows what is done, where the user is and what is left, and the next step by its name: people
// finish when they know what remains. The accent is progress (R2): a step done is a check on the accent tint, the step
// the user is on is the one solid dot, the steps to come are a quiet fill with their number, and the line is the accent
// as far as the steps done. Round, as a dot may be (R7). Nothing moves: the state is always on the screen, which
// is what an ADHD eye needs. Steps done can be buttons that go back to them (`onStepSelect`), never the ones to come.
// For screen readers it is an ordered list; the step the user is on has `aria-current="step"`, and each step says whether it
// is done, current or not started (`words.steps`, in any language).
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
  /** `error`: this step failed (a processing that stopped here). It is shown in red with Sigrid's `error` icon and says so in words; the line before it stays the accent. */
  status?: "error" | undefined
}

export type StepsProps = {
  /** Name of the path for screen readers («Signup»). */
  "aria-label": string
  steps: readonly StepItem[]
  /** The step the user is on, counting from 0. The ones before it are done; `steps.length` means all are done. */
  current: number
  /** With it, each step already done is a button that goes back to it. The step the user is on and those to come are not. */
  onStepSelect?: ((index: number) => void) | undefined
  /**
   * `vertical` (the default): a column, with the descriptions beside the dots. `horizontal`: a row; it measures its own
   * width, so it needs one of its own (`w-full`, or a width), and in a place too narrow for the names it keeps the
   * current one and says «Step 2 of 4».
   */
  orientation?: "vertical" | "horizontal" | undefined
  className?: string | undefined
}

type State = "done" | "current" | "upcoming" | "error"

// The dot is the one place where the state is a shape and a colour at once: the check, the solid dot, the quiet one.
const DOT: Record<State, string> = {
  done: "bg-accent-soft text-accent",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-ink/6 text-ink-soft",
  error: "bg-destructive-soft text-destructive",
}
const LABEL: Record<State, string> = {
  done: "text-ink-soft",
  current: "font-semibold text-ink",
  upcoming: "text-ink-mute",
  error: "font-semibold text-destructive",
}

function Steps({ steps, current, onStepSelect, orientation = "vertical", className, ...props }: StepsProps) {
  const words = useWords()
  const horizontal = orientation === "horizontal"
  return (
    <div className={cn(horizontal && "@container", className)}>
      <ol data-slot="steps" data-orientation={orientation} role="list" aria-label={props["aria-label"]} className={cn("flex", horizontal ? "items-start gap-2" : "flex-col")}>
        {steps.map((step, index) => {
          const state: State = step.status === "error" ? "error" : index < current ? "done" : index === current ? "current" : "upcoming"
          const last = index === steps.length - 1
          const dot = (
            <span data-slot="step-dot" aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-medium tabular-nums", DOT[state])}>
              {state === "done" ? <Icon name="check" className="size-3.5" /> : state === "error" ? <Icon name="error" className="size-3.5" /> : index + 1}
            </span>
          )
          // The line to the next step: the accent as far as the steps done, the divider after.
          const line = last ? null : <span data-slot="step-line" aria-hidden="true" className={cn(horizontal ? "h-px min-w-4 flex-1" : "my-1 min-h-4 w-px flex-1", index < current ? "bg-primary" : "bg-line")} />
          const text = (
            <>
              {step.label}
              <span className="sr-only">, {words.steps[state]}</span>
            </>
          )
          const body = (
            // A row too narrow for the names keeps the current one; the others are still read, and the summary says where it is.
            <div className={cn("min-w-0", horizontal ? cn("pe-2", index !== current && "@max-md:sr-only") : last ? "" : "pb-4")}>
              {state === "done" && onStepSelect ? (
                <button type="button" onClick={() => onStepSelect(index)} className={cn("rounded-sm text-start text-sm hover:text-ink", LABEL[state], FOCUS_RING)}>
                  {text}
                </button>
              ) : (
                <p className={cn("text-sm", LABEL[state])}>{text}</p>
              )}
              {step.description ? <p className="text-xs text-ink-mute">{step.description}</p> : null}
            </div>
          )
          return (
            <li key={index} data-slot="step" data-state={state} aria-current={index === current ? "step" : undefined} className={cn("flex", horizontal ? cn("min-w-0 flex-col gap-2", last ? "flex-none" : "flex-1") : "gap-3")}>
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
                </>
              )}
            </li>
          )
        })}
      </ol>
      {horizontal ? (
        <p data-slot="steps-summary" aria-hidden="true" className="mt-2 text-xs text-ink-mute @md:hidden">
          {words.steps.summary(Math.min(current + 1, steps.length), steps.length)}
        </p>
      ) : null}
    </div>
  )
}

export { Steps }
