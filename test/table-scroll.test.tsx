// A table wider than its box scrolls sideways: the box is then a region with a name that the keyboard reaches, so
// that the columns past the edge can be read without a pointer (WCAG 2.1.1). A table that fits is left alone.
import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Table, TableBody, TableCell, TableRow } from '../src/primitives'

afterEach(() => vi.unstubAllGlobals())

/** A `ResizeObserver` the test drives. */
function observed() {
  const callbacks: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  return () => act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)))
}

/** The box measures `scrollWidth` wide content in a `clientWidth` box. */
function measure(box: Element, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(box, 'scrollWidth', { configurable: true, value: scrollWidth })
  Object.defineProperty(box, 'clientWidth', { configurable: true, value: clientWidth })
}

const rows = (
  <TableBody>
    <TableRow><TableCell>anna@example.com</TableCell><TableCell>Active</TableCell></TableRow>
  </TableBody>
)

test('a table that scrolls sideways is a named region the keyboard reaches, and stops being one once it fits', () => {
  const resize = observed()
  render(<Table aria-label="Users">{rows}</Table>)
  const box = document.querySelector('[data-slot="table-container"]')!
  measure(box, 800, 300)
  resize()
  const region = screen.getByRole('region', { name: 'Users' })
  expect(region).toBe(box)
  expect(region.getAttribute('tabindex')).toBe('0')
  measure(box, 300, 300)
  resize()
  expect(screen.queryByRole('region')).toBeNull()
  expect(box.hasAttribute('tabindex')).toBe(false)
})

test('a table without a name of its own takes the words', () => {
  const resize = observed()
  render(<Table>{rows}</Table>)
  measure(document.querySelector('[data-slot="table-container"]')!, 800, 300)
  resize()
  expect(screen.getByRole('region', { name: 'Table' })).toBeTruthy()
})
