// What moves with its data rather than after a gesture: a count that rolls (`Count rolling`) and a level meter
// (`LevelMeter`). Each moves only where the app turned motion on and the system allows it; the stylesheet moves them.
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Count, LevelMeter } from '../src/primitives'
import { systemMotion } from './helpers'

afterEach(() => vi.unstubAllGlobals())

const count = () => document.querySelector('[data-slot="count"]')!

test('a rolling count rolls a new value in, never its first one, and only with motion on', () => {
  systemMotion(false)
  const { rerender } = render(<Count value={1} rolling animated />)
  expect(count().hasAttribute('data-rolling')).toBe(false)
  expect(count().textContent).toBe('1')
  rerender(<Count value={2} rolling animated />)
  expect(count().hasAttribute('data-rolling')).toBe(true)
  expect(count().querySelector('[data-slot="count-value"]')?.textContent).toBe('2')
})

test('without motion, with reduced motion or without rolling, the number changes at once', () => {
  const cases = [
    { reduce: false, animated: undefined, rolling: true },
    { reduce: true, animated: true, rolling: true },
    { reduce: false, animated: true, rolling: false },
  ]
  for (const { reduce, animated, rolling } of cases) {
    systemMotion(reduce)
    const { rerender, unmount } = render(<Count value={1} rolling={rolling} animated={animated} />)
    rerender(<Count value={2} rolling={rolling} animated={animated} />)
    expect(count().hasAttribute('data-rolling')).toBe(false)
    expect(count().textContent).toBe('2')
    unmount()
  }
})

const bars = (meter: HTMLElement) => [...meter.querySelectorAll('[data-slot="level-bar"]')].map((bar) => bar.className.match(/scale-y-\d+/)?.[0])

test('a level meter draws one bar per level, in eighths, the newest as its value, with motion on', () => {
  systemMotion(false)
  render(<LevelMeter label="Microphone level" levels={[0, 1, Number.NaN, 2]} animated />)
  const meter = screen.getByRole('meter', { name: 'Microphone level' })
  // A broken reading is 0 and a level over 1 is 1.
  expect(bars(meter)).toEqual(['scale-y-12', 'scale-y-100', 'scale-y-12', 'scale-y-100'])
  expect(meter.getAttribute('aria-valuenow')).toBe('100')
  expect(meter.hasAttribute('data-live')).toBe(true)
})

test('without motion, or with reduced motion, the bars rest at half their height and do not follow the data', () => {
  for (const [reduce, animated] of [[false, undefined], [true, true]] as const) {
    systemMotion(reduce)
    const { unmount } = render(<LevelMeter label="Microphone level" levels={[0, 1, 0.2]} animated={animated} />)
    const meter = screen.getByRole('meter', { name: 'Microphone level' })
    expect(bars(meter)).toEqual(['scale-y-50', 'scale-y-50', 'scale-y-50'])
    expect(meter.hasAttribute('data-live')).toBe(false)
    unmount()
  }
})

test('the stylesheet moves them inside the reduced-motion guard, at the app’s pace, with no time of their own', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(`${process.cwd()}/src/styles/theme.css`, 'utf8')
  for (const selector of ['[data-slot="count"][data-rolling] > [data-slot="count-value"]', '[data-slot="level-meter"][data-live] > [data-slot="level-bar"]']) {
    const at = css.indexOf(selector)
    expect(at, selector).toBeGreaterThan(-1)
    const guard = css.lastIndexOf('@media (prefers-reduced-motion: no-preference) {', at)
    expect(guard, selector).toBeGreaterThan(-1)
    expect(css.slice(guard, at), selector).not.toMatch(/^\}/m)
    const rule = css.slice(at, css.indexOf('}', at))
    expect(rule, selector).toMatch(/var\(--motion-(faster|fast|normal)\)/)
    expect(rule, selector).not.toMatch(/\d+m?s\b/)
  }
  for (const file of ['src/primitives/count.tsx', 'src/primitives/level-meter.tsx']) {
    expect(readFileSync(`${process.cwd()}/${file}`, 'utf8'), file).not.toMatch(/duration|transition|animate-/)
  }
})
