// `Progress`, `ProgressRing` and `ProgressSegments`: how far a task is. What matters: it is a named progressbar with its
// value and its words (not only a shape and a colour), not knowing how far it is says so in words and draws no range,
// done and failed are said as well as coloured, nothing is clamped wrongly, and the words are the app's.
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Progress, ProgressRing, ProgressSegments, WordsProvider } from '../src'

describe('Progress', () => {
  test('a named progressbar with its value and its text', () => {
    render(<Progress aria-label="Upload" value={45} />)
    const bar = screen.getByRole('progressbar', { name: 'Upload' })
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-valuenow')).toBe('45')
    expect(bar.getAttribute('aria-valuetext')).toBe('45%')
    expect(bar.getAttribute('data-state')).toBe('active')
  })

  test('the range is as wide as the value, on the scale of max', () => {
    const { container } = render(<Progress aria-label="Import" value={3} max={12} />)
    expect((container.querySelector('[data-slot="progress-range"]') as HTMLElement).style.width).toBe('25%')
  })

  test('the value is shown as text only when asked, and not read twice', () => {
    const { container, rerender } = render(<Progress aria-label="Upload" value={45} />)
    expect(container.querySelector('[data-slot="progress-text"]')).toBeNull()
    rerender(<Progress aria-label="Upload" value={45} showValue />)
    const text = container.querySelector('[data-slot="progress-text"]')!
    expect(text.textContent).toBe('45%')
    expect(text.getAttribute('aria-hidden')).toBe('true')
  })

  test('a value out of range is brought into it', () => {
    const { container, rerender } = render(<Progress aria-label="Upload" value={140} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    rerender(<Progress aria-label="Upload" value={-5} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    expect((container.querySelector('[data-slot="progress-range"]') as HTMLElement).style.width).toBe('0%')
  })

  test('done says so in words and in the state', () => {
    const { container } = render(<Progress aria-label="Upload" value={100} showValue />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('data-state')).toBe('complete')
    expect(bar.getAttribute('aria-valuetext')).toBe('Complete')
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Complete')
  })

  test('a countdown starts full and is never «Complete»: the value is what is left', () => {
    const { container } = render(<Progress aria-label="Time left to undo" value={10} max={10} countdown valueText="10 seconds left" />)
    const bar = screen.getByRole('progressbar', { name: 'Time left to undo' })
    expect(bar.getAttribute('data-state')).toBe('active')
    expect(bar.getAttribute('aria-valuetext')).toBe('10 seconds left')
    expect((container.querySelector('[data-slot="progress-range"]') as HTMLElement).style.width).toBe('100%')
    expect(container.querySelector('[data-slot="progress-text"]')).toBeNull()
  })

  test('a failure keeps where it stopped and says so', () => {
    const { container } = render(<Progress aria-label="Upload" value={30} status="error" showValue />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('data-state')).toBe('error')
    expect(bar.getAttribute('aria-valuenow')).toBe('30')
    expect(bar.getAttribute('aria-valuetext')).toBe('Failed')
    expect((container.querySelector('[data-slot="progress-range"]') as HTMLElement).style.width).toBe('30%')
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Failed')
  })

  test('not knowing how far it is: no value, no range, the word is always shown', () => {
    const { container } = render(<Progress aria-label="Import" value={null} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.hasAttribute('aria-valuenow')).toBe(false)
    expect(bar.getAttribute('aria-valuetext')).toBe('In progress')
    expect(bar.getAttribute('data-state')).toBe('indeterminate')
    expect((container.querySelector('[data-slot="progress-range"]') as HTMLElement).style.width).toBe('0%')
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('In progress')
  })

  test('done, failed and not known say their word without showValue; under way it says nothing unless asked', () => {
    const { container, rerender } = render(<Progress aria-label="Upload" value={100} />)
    const word = () => container.querySelector('[data-slot="progress-text"]')?.textContent ?? null
    expect(word()).toBe('Complete')
    rerender(<Progress aria-label="Upload" value={30} status="error" />)
    expect(word()).toBe('Failed')
    rerender(<Progress aria-label="Upload" value={null} />)
    expect(word()).toBe('In progress')
    rerender(<Progress aria-label="Upload" value={30} />)
    expect(word()).toBeNull()
  })

  test('the ring and the blocks say it too', () => {
    const { container, rerender } = render(<ProgressRing aria-label="Ring" value={100} />)
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Complete')
    rerender(<ProgressRing aria-label="Ring" value={20} />)
    expect(container.querySelector('[data-slot="progress-text"]')).toBeNull()
    rerender(<ProgressSegments aria-label="Level" value={10} />)
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Complete')
    rerender(<ProgressSegments aria-label="Level" value={4} status="error" />)
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Failed')
  })

  test('the app can say the value in its own words', () => {
    render(<Progress aria-label="Time left" value={16} max={30} valueText="16 seconds left" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('16 seconds left')
  })

  test('the words are the app’s: replaced once for the whole tree, in any language', () => {
    render(
      <WordsProvider words={{ progress: { value: (value, max) => `${value} su ${max}`, complete: 'Completato', indeterminate: 'In corso', error: 'Non riuscito' } }}>
        <Progress aria-label="Caricamento" value={4} max={10} />
        <Progress aria-label="Fine" value={10} max={10} />
        <Progress aria-label="Attesa" value={null} />
        <Progress aria-label="Errore" value={2} status="error" />
      </WordsProvider>,
    )
    expect(screen.getByRole('progressbar', { name: 'Caricamento' }).getAttribute('aria-valuetext')).toBe('4 su 10')
    expect(screen.getByRole('progressbar', { name: 'Fine' }).getAttribute('aria-valuetext')).toBe('Completato')
    expect(screen.getByRole('progressbar', { name: 'Attesa' }).getAttribute('aria-valuetext')).toBe('In corso')
    expect(screen.getByRole('progressbar', { name: 'Errore' }).getAttribute('aria-valuetext')).toBe('Non riuscito')
  })
})

describe('ProgressRing', () => {
  test('the same progressbar, with the arc as long as the value', () => {
    const { container } = render(<ProgressRing aria-label="Import" value={25} showValue />)
    expect(screen.getByRole('progressbar', { name: 'Import' }).getAttribute('aria-valuenow')).toBe('25')
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(2)
    expect(circles[1]!.getAttribute('stroke-dasharray')).toBe('25 100')
    expect(container.querySelector('[data-slot="progress-ring"] span')!.textContent).toBe('25%')
  })

  test('with a falling value it empties: a countdown, in the app’s words', () => {
    const { container } = render(
      <ProgressRing aria-label="Time left" value={10} max={30} valueText="10 seconds left">
        10
      </ProgressRing>,
    )
    expect(container.querySelectorAll('circle')[1]!.getAttribute('stroke-dasharray')).toBe(`${(10 / 30) * 100} 100`)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('10 seconds left')
    expect(container.querySelector('[data-slot="progress-ring"] span')!.textContent).toBe('10')
  })

  test('done shows a check, a failure a cross, and each its word below', () => {
    const { container, rerender } = render(<ProgressRing aria-label="Import" value={100} showValue />)
    expect(container.querySelector('[role="progressbar"] svg + span svg')).not.toBeNull()
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Complete')
    rerender(<ProgressRing aria-label="Import" value={40} status="error" showValue />)
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('Failed')
  })

  test('an unknown value draws no arc and says so', () => {
    const { container } = render(<ProgressRing aria-label="Import" value={null} />)
    expect(container.querySelectorAll('circle')[1]!.getAttribute('stroke-dasharray')).toBe('0 100')
    expect(container.querySelector('[data-slot="progress-text"]')!.textContent).toBe('In progress')
  })
})

describe('ProgressSegments', () => {
  test('as many blocks as max, the first ones filled', () => {
    const { container } = render(<ProgressSegments aria-label="Level" value={3} max={8} />)
    const blocks = Array.from(container.querySelectorAll('[data-slot="progress-segment"]'))
    expect(blocks).toHaveLength(8)
    expect(blocks.map((b) => b.hasAttribute('data-filled'))).toEqual([true, true, true, false, false, false, false, false])
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3')
  })

  test('ten blocks by default, and never more than twenty-four', () => {
    const { container, rerender } = render(<ProgressSegments aria-label="Level" value={4} />)
    expect(container.querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(10)
    rerender(<ProgressSegments aria-label="Level" value={4} max={100} />)
    expect(container.querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(24)
  })

  test('a part of a block is not filled: the value is rounded to whole blocks', () => {
    const { container } = render(<ProgressSegments aria-label="Level" value={2.6} max={5} />)
    expect(container.querySelectorAll('[data-filled]')).toHaveLength(3)
  })
})
