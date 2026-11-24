// `Steps`: the steps of a task as a path. What matters: the state of each step is in the markup and in words (not
// only in a colour), the step the user is on is `aria-current="step"`, only steps already done can be gone back to, and
// the words are the app's to translate.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Icon, Steps, WordsProvider } from '../src'

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
