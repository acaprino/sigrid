// A path of steps taken one at a time: a form too long for one screen, a setup, a signup. One question on the
// screen, the path above it (`Steps`: where one is, what is done, what is left), and two buttons at its foot that
// never move (R14): «Back» at the start, off on the first step, and the one solid button at the end, «Continue»
// until the last step and then the app's own word («Create the account»).
// The app holds where the person is (`current`) and what they answered; the wizard draws the step and asks to move.
// A step that is not answered yet keeps the person there: its button is off (`canContinue: false`), and the app says
// what is missing in the step itself. A step already done is a button of the path: going back never loses an answer,
// since the answers are the app's. Enter in a field of the step goes on, as in any form.
// When the step changes, its title takes the focus, so a screen reader reads where it now is; with motion on the
// step comes in from the side it was asked from.
import * as React from 'react'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { Button } from '../primitives/button'
import { Steps } from '../components/steps'

/** One step of a path. */
export type WizardStep = {
  id: string
  /** The name of the step in the path («Account», «Plan»): short. */
  label: string
  /** The question of the step, as its title when it is the one on the screen. Absent: its `label`. */
  title?: string | undefined
  /** A line under the title: what is asked, and why. */
  description?: string | undefined
  /** `false` while the step is not answered: the button that goes on is off. Default `true`. */
  canContinue?: boolean | undefined
}

export type WizardProps = {
  /** The name of the path for screen readers («Signup»). */
  label: string
  steps: readonly WizardStep[]
  /** The step on the screen, counting from 0, which the app holds. */
  current: number
  onCurrentChange: (index: number) => void
  /** The last step was confirmed. */
  onFinish: () => void
  /** The word of the button of the last step («Create the account»). Absent: the toolkit's word («Finish»). */
  finishLabel?: string | undefined
  /** The last step is being saved: its button waits in its place. */
  busy?: boolean | undefined
  /** The step comes in with a movement, and the buttons answer the press. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
  /** What the step on the screen asks: its fields, drawn by the app for that step. */
  children: (step: WizardStep, index: number) => React.ReactNode
}

/** A path of steps taken one at a time, with the path above the step and two buttons at its foot. */
function Wizard({ label, steps, current, onCurrentChange, onFinish, finishLabel, busy = false, animated, className, children }: WizardProps) {
  const words = useWords().wizard
  const at = Math.min(Math.max(current, 0), Math.max(steps.length - 1, 0))
  const step = steps[at]
  const last = at === steps.length - 1
  const title = React.useRef<HTMLHeadingElement>(null)
  // Where the step came from, once the person has moved: never at first.
  const before = React.useRef(at)
  const from = React.useRef<'start' | 'end' | null>(null)
  if (before.current !== at) {
    from.current = at > before.current ? 'end' : 'start'
    before.current = at
  }
  const moved = from.current
  React.useEffect(() => {
    if (moved) title.current?.focus()
  }, [at, moved])
  if (step === undefined) return null
  const ready = step.canContinue !== false && !busy
  const go = () => {
    if (!ready) return
    if (last) onFinish()
    else onCurrentChange(at + 1)
  }
  return (
    <div data-slot="wizard" className={cn('flex min-w-0 flex-col gap-6', className)}>
      <Steps aria-label={label} orientation="horizontal" steps={steps.map((item) => ({ label: item.label }))} current={at} onStepSelect={busy ? undefined : onCurrentChange} className="w-full" />
      <form
        data-slot="wizard-step"
        noValidate
        className="flex min-w-0 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          go()
        }}
      >
        {/* A new element for each step, so that it is the step that comes in, not the form that changes. */}
        <div key={step.id} data-slot="wizard-body" {...(moved ? { 'data-reveal': 'fade', 'data-from': moved } : {})} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            {/* The title of a section (20px), written out: it takes the focus when the step changes. */}
            <h2 ref={title} tabIndex={-1} data-slot="wizard-title" className="min-w-0 text-xl font-semibold text-ink outline-hidden">
              {step.title ?? step.label}
            </h2>
            {step.description ? <p className="text-sm text-ink-soft">{step.description}</p> : null}
          </div>
          {children(step, at)}
        </div>
        <div data-slot="wizard-actions" className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" disabled={at === 0 || busy} animated={animated} onClick={() => onCurrentChange(at - 1)}>
            {words.back}
          </Button>
          <Button type="submit" disabled={step.canContinue === false} loading={busy} animated={animated}>
            {last ? (finishLabel ?? words.finish) : words.next}
          </Button>
        </div>
      </form>
    </div>
  )
}

export { Wizard }
