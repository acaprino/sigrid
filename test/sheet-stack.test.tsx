// `SheetStack`: the open page above, the other pages as heads at the foot; a press on a head asks for that page.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { MOTION_SPRING, springEasing } from '../src'
import { SheetStack } from '../src/layout'

const ITEMS = [
  { value: 'capture', title: 'Capture', description: 'Empty your head' },
  { value: 'decide', title: 'Decide', description: '3 thoughts wait', count: 3 },
  { value: 'do', title: 'Do', description: 'Read the contract', count: 0 },
]

test('the open page is a region named by its head; the others wait at the foot, in their order', () => {
  render(
    <SheetStack aria-label="Steps" items={ITEMS} value="decide" onValueChange={() => {}}>
      <p>the page</p>
    </SheetStack>,
  )
  expect(within(screen.getByRole('region', { name: 'Decide' })).getByText('the page')).toBeTruthy()
  const heads = within(screen.getByRole('navigation', { name: 'Steps' })).getAllByRole('button')
  expect(heads.map((head) => head.textContent)).toEqual(['CaptureEmpty your head', 'DoRead the contract'])
})

test('a press on a head asks for its page; a count is shown only above zero', () => {
  const onValueChange = vi.fn()
  render(
    <SheetStack aria-label="Steps" items={ITEMS} value="capture" onValueChange={onValueChange}>
      <p>the page</p>
    </SheetStack>,
  )
  const [decide, todo] = within(screen.getByRole('navigation', { name: 'Steps' })).getAllByRole('button')
  expect(decide!.textContent).toContain('3')
  expect(todo!.textContent).toBe('DoRead the contract')
  fireEvent.click(todo!)
  expect(onValueChange).toHaveBeenCalledWith('do')
})

test('a page outside the items leaves every head at the foot', () => {
  render(
    <SheetStack aria-label="Steps" items={ITEMS} value="elsewhere" onValueChange={() => {}}>
      <p>the page</p>
    </SheetStack>,
  )
  expect(within(screen.getByRole('navigation', { name: 'Steps' })).getAllByRole('button')).toHaveLength(3)
})

test("the toolkit's spring settles in under 400 ms and overshoots by less than two parts in a hundred", () => {
  const { ms, linear } = springEasing(MOTION_SPRING)
  const points = linear.slice('linear('.length, -1).split(', ').map(Number)
  expect(ms).toBeGreaterThan(300)
  expect(ms).toBeLessThan(400)
  expect(points[0]).toBe(0)
  expect(points[points.length - 1]).toBe(1)
  expect(Math.max(...points)).toBeLessThan(1.02)
})
