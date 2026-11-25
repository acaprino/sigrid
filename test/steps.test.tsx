// `Steps`: the steps of a task as a path. What matters: the state of each step is in the markup and in words (not
// only in a colour), the step the user is on is `aria-current="step"`, only steps already done can be gone back to, and
// the words are the app's to translate.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { Icon } from '../src/primitives'
import { Steps, type StepItem } from '../src/components'

const STEPS = [{ label: 'Account' }, { label: 'Profile', description: 'Your name and photo' }, { label: 'Plan' }, { label: 'Done' }]

describe('Steps', () => {
  test('an ordered list of the steps, the one the user is on marked as current', () => {
    render(<Steps aria-label="Signup" steps={STEPS} current={1} />)
    const list = screen.getByRole('list', { name: 'Signup' })
    expect(list.tagName).toBe('OL')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['done', 'current', 'upcoming', 'upcoming'])
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([null, 'step', null, null])
  })

  test('each step says its state in words, so no colour has to be seen', () => {
    render(<Steps aria-label="Signup" steps={STEPS} current={1} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]!.textContent).toContain('Account, done')
    expect(items[1]!.textContent).toContain('Profile, current step')
    expect(items[2]!.textContent).toContain('Plan, not started')
    expect(screen.getByText('Your name and photo')).toBeTruthy()
  })

  test('a done step shows a check and the others their number', () => {
    const { container } = render(<Steps aria-label="Signup" steps={STEPS} current={2} />)
    const dots = Array.from(container.querySelectorAll('[data-slot="step-dot"]'))
    expect(dots.map((dot) => dot.textContent)).toEqual(['', '', '3', '4'])
    expect(dots[0]!.querySelector('svg')).not.toBeNull()
  })

  test('the line is the accent as far as the steps done, and none after the last step', () => {
    const { container } = render(<Steps aria-label="Signup" steps={STEPS} current={2} />)
    const lines = Array.from(container.querySelectorAll('[data-slot="step-line"]'))
    expect(lines).toHaveLength(STEPS.length - 1)
    expect(lines.map((line) => line.className.includes('bg-primary'))).toEqual([true, true, false])
  })

  test('with every step done none is current', () => {
    render(<Steps aria-label="Signup" steps={STEPS} current={STEPS.length} />)
    const items = screen.getAllByRole('listitem')
    expect(items.every((item) => item.getAttribute('data-state') === 'done')).toBe(true)
    expect(items.some((item) => item.hasAttribute('aria-current'))).toBe(false)
  })

  test('only a done step is a button, and it goes back to that step', () => {
    const onStepSelect = vi.fn()
    render(<Steps aria-label="Signup" steps={STEPS} current={2} onStepSelect={onStepSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Account, done', 'Profile, done'])
    fireEvent.click(buttons[1]!)
    expect(onStepSelect).toHaveBeenCalledWith(1)
  })

  test('without onStepSelect nothing is a button', () => {
    render(<Steps aria-label="Signup" steps={STEPS} current={2} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  test('the row form keeps the same markup and says so', () => {
    const { container } = render(<Steps aria-label="Signup" steps={STEPS} current={0} orientation="horizontal" />)
    expect(container.querySelector('ol')!.getAttribute('data-orientation')).toBe('horizontal')
    expect(screen.getAllByRole('listitem')).toHaveLength(STEPS.length)
  })

  test('a step that failed is red with the mark of a failure, says so in words, and the line before it stays the accent', () => {
    // Sigrid's `error`, at 14px in the dot: the one look of a failure, in a `Note`, a toast and a progress too.
    const icon = render(<Icon name="error" className="size-3.5" />)
    const mark = icon.container.querySelector('svg')!.outerHTML
    icon.unmount()
    const failing = [{ label: 'Upload' }, { label: 'Convert', status: 'error' as const }, { label: 'Publish' }]
    const { container } = render(<Steps aria-label="Import" steps={failing} current={1} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['done', 'error', 'upcoming'])
    expect(items[1]!.textContent).toContain('Convert, failed')
    expect(items[1]!.getAttribute('aria-current')).toBe('step')
    expect(container.querySelectorAll('[data-slot="step-dot"]')[1]!.querySelector('svg')!.outerHTML).toBe(mark)
    expect(Array.from(container.querySelectorAll('[data-slot="step-line"]')).map((line) => line.className.includes('bg-primary'))).toEqual([true, false])
  })

  test('the row says where it is for a place too narrow for the names, the column does not', () => {
    const { container, rerender } = render(<Steps aria-label="Signup" steps={STEPS} current={1} orientation="horizontal" />)
    expect(container.querySelector('[data-slot="steps-summary"]')!.textContent).toBe('Step 2 of 4')
    rerender(<Steps aria-label="Signup" steps={STEPS} current={1} />)
    expect(container.querySelector('[data-slot="steps-summary"]')).toBeNull()
  })

  test('the words are the app’s: replaced once for the whole tree, in any language', () => {
    render(
      <WordsProvider words={{ steps: { done: 'fatto', current: 'passo attuale', upcoming: 'da fare', summary: (position, total) => `Passo ${position} di ${total}` } }}>
        <Steps aria-label="Iscrizione" steps={STEPS} current={1} />
      </WordsProvider>,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]!.textContent).toContain('Account, fatto')
    expect(items[1]!.textContent).toContain('Profile, passo attuale')
    expect(items[3]!.textContent).toContain('Done, da fare')
  })
})

describe('Steps, each step with its own state', () => {
  const dots = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-slot="step-dot"]'))
  const names = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-slot="step-name"]'))
  const PIPELINE: StepItem[] = [
    { label: 'Read', status: 'done', meta: '2 min' },
    { label: 'Tests', status: 'skipped' },
    { label: 'Security', status: 'error' },
    { label: 'Architecture', status: 'running' },
    { label: 'Report', status: 'todo', disabled: true, reason: 'After the analysis ends' },
    { label: 'Share' },
  ]

  test('without a status the steps draw as before: the classes of the dots, the names and the lines', () => {
    const { container } = render(<Steps aria-label="Signup" steps={STEPS} current={1} onStepSelect={() => {}} />)
    const dot = 'flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-medium tabular-nums '
    expect(dots(container).map((d) => d.className)).toEqual([dot + 'bg-accent-soft text-accent', dot + 'bg-primary text-primary-foreground', dot + 'bg-ink/6 text-ink-soft', dot + 'bg-ink/6 text-ink-soft'])
    const drawn = names(container).map((n) => `${n.tagName} ${n.className}`)
    expect(drawn[0]).toMatch(/^BUTTON rounded-sm text-start text-sm hover:text-ink text-ink-soft /)
    expect(drawn.slice(1)).toEqual(['P text-sm font-semibold text-ink', 'P text-sm text-ink-mute', 'P text-sm text-ink-mute'])
    expect(Array.from(container.querySelectorAll('[data-slot="step-line"]')).map((line) => line.className)).toEqual(['my-1 min-h-4 w-px flex-1 bg-primary', 'my-1 min-h-4 w-px flex-1 bg-line', 'my-1 min-h-4 w-px flex-1 bg-line'])
    expect(container.querySelector('[data-slot="step-meta"]')).toBeNull()
    expect(container.querySelector('[data-slot="step-reason"]')).toBeNull()
    expect(Array.from(container.querySelectorAll('[data-slot="step"]')).map((li) => li.className)).toEqual(['flex gap-3 relative pointer-coarse:min-h-11', 'flex gap-3', 'flex gap-3', 'flex gap-3'])
  })

  test('a status wins over the place, and each is a mark and a word', () => {
    const { container } = render(<Steps aria-label="Analysis" steps={PIPELINE} current={-1} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['done', 'skipped', 'error', 'running', 'upcoming', 'upcoming'])
    expect(items.some((item) => item.hasAttribute('aria-current'))).toBe(false)
    expect(names(container).map((n) => n.textContent)).toEqual(['Read, done', 'Tests, skipped', 'Security, failed', 'Architecture, in progress', 'Report, not started', 'Share, not started'])
    // A mark for every status, each its own; a step to do shows its number.
    const marks = dots(container).map((d) => d.querySelector('svg')?.outerHTML ?? d.textContent)
    expect(marks.slice(4)).toEqual(['5', '6'])
    expect(new Set(marks).size).toBe(marks.length)
    // The line is the accent only after a step done.
    expect(Array.from(container.querySelectorAll('[data-slot="step-line"]')).map((line) => line.className.includes('bg-primary'))).toEqual([true, false, false, false, false])
  })

  test('the step on the screen is the one solid dot and keeps the mark of its status; a failure stays red', () => {
    const { container, rerender } = render(<Steps aria-label="Analysis" steps={PIPELINE} current={0} />)
    const first = dots(container)[0]!
    expect(first.className).toContain('bg-primary text-primary-foreground')
    expect(first.querySelector('svg')).not.toBeNull()
    expect(screen.getAllByRole('listitem')[0]!.getAttribute('aria-current')).toBe('step')
    expect(screen.getAllByRole('listitem')[0]!.getAttribute('data-state')).toBe('done')
    expect(names(container)[0]!.className).toContain('font-semibold text-ink')
    expect(dots(container).filter((d) => d.className.includes('bg-primary'))).toHaveLength(1)
    rerender(<Steps aria-label="Analysis" steps={PIPELINE} current={2} />)
    expect(dots(container)[2]!.className).toContain('bg-destructive-soft text-destructive')
    expect(dots(container).some((d) => d.className.includes('bg-primary'))).toBe(false)
  })

  test('a running step says so where it is seen, and a fact of the app is at the end of its row, in a column only', () => {
    const { container, rerender } = render(<Steps aria-label="Analysis" steps={PIPELINE} current={-1} />)
    const metas = Array.from(container.querySelectorAll('[data-slot="step-meta"]'))
    expect(metas.map((m) => m.textContent)).toEqual(['2 min', 'in progress'])
    expect(metas[0]!.className).toContain('tabular-nums')
    // The word is already in the name for screen readers; the fact is read.
    expect(metas.map((m) => m.getAttribute('aria-hidden'))).toEqual([null, 'true'])
    rerender(<Steps aria-label="Analysis" steps={PIPELINE} current={-1} orientation="horizontal" />)
    expect(container.querySelector('[data-slot="step-meta"]')).toBeNull()
    // No step is on the screen: there is no «Step 0 of 6».
    expect(container.querySelector('[data-slot="steps-summary"]')).toBeNull()
  })

  test('done, running, skipped and failed steps are buttons; one to come only with a status given, a disabled one never and it says why', () => {
    const onStepSelect = vi.fn()
    const steps: StepItem[] = [...PIPELINE.slice(0, 5), { label: 'Share', status: 'todo' }, { label: 'Archive', status: 'done', disabled: true, reason: 'Kept for a day' }, { label: 'Close' }]
    const { container } = render(<Steps aria-label="Analysis" steps={steps} current={0} onStepSelect={onStepSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Read, done', 'Tests, skipped', 'Security, failed', 'Architecture, in progress', 'Share, not started'])
    fireEvent.click(buttons[3]!)
    expect(onStepSelect).toHaveBeenCalledWith(3)
    expect(Array.from(container.querySelectorAll('[data-slot="step-reason"]')).map((r) => r.textContent)).toEqual(['After the analysis ends', 'Kept for a day'])
    expect(screen.getAllByRole('listitem').map((item) => item.hasAttribute('data-disabled'))).toEqual([false, false, false, false, true, false, true, false])
  })

  test('in a column the whole row is the target and takes the focus ring; in a row the name does', () => {
    const { rerender } = render(<Steps aria-label="Analysis" steps={PIPELINE} current={0} onStepSelect={() => {}} />)
    const button = screen.getAllByRole('button')[0]!
    expect(button.closest('li')!.className).toContain('relative pointer-coarse:min-h-11')
    expect(button.className).toContain('after:absolute after:inset-x-0')
    expect(button.className).toContain('focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring')
    rerender(<Steps aria-label="Analysis" steps={PIPELINE} current={0} onStepSelect={() => {}} orientation="horizontal" />)
    const inRow = screen.getAllByRole('button')[0]!
    expect(inRow.className).toContain('pointer-coarse:min-h-11')
    expect(inRow.className).toContain('focus-visible:outline-ring')
    expect(inRow.className).not.toContain('after:absolute')
  })

  test('the words of the new states are the app’s too', () => {
    render(
      <WordsProvider words={{ steps: { running: 'in corso', skipped: 'saltato' } }}>
        <Steps aria-label="Analisi" steps={PIPELINE} current={-1} />
      </WordsProvider>,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[1]!.textContent).toContain('Tests, saltato')
    expect(items[3]!.textContent).toContain('Architecture, in corso')
  })
})
