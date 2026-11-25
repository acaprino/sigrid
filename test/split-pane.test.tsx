// Two panes with a divider that moves (`SplitPane`): the size by pointer and by keys, its limits, the reset, the size kept
// by the app or by the browser's storage, and one pane at a time where the two do not fit.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SplitPane } from '../src/layout'

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

/** A `ResizeObserver` the test drives: `resize(width)` tells every observer the split's width. */
function observed() {
  const callbacks: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    disconnect() {}
  })
  return (width: number) => act(() => callbacks.forEach((c) => c([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)))
}

const divider = () => screen.getByRole('separator', { name: 'Resize the list' })
const startPane = () => document.querySelector<HTMLElement>('[data-slot="split-pane-start"]')!
const endPane = () => document.querySelector<HTMLElement>('[data-slot="split-pane-end"]')!
const now = () => Number(divider().getAttribute('aria-valuenow'))

function pane(props: Partial<React.ComponentProps<typeof SplitPane>> = {}) {
  return (
    <SplitPane start={<p>The list</p>} startLabel="Sessions" endLabel="Transcript" label="Resize the list" {...props}>
      <p>The transcript</p>
    </SplitPane>
  )
}

test('two named regions and a divider that is one tab stop, with its value between the minimums', () => {
  const resize = observed()
  render(pane({ defaultSize: 300 }))
  resize(1000)
  expect(screen.getByRole('region', { name: 'Sessions' })).toBe(startPane())
  expect(screen.getByRole('region', { name: 'Transcript' })).toBe(endPane())
  const handle = divider()
  expect(handle.tabIndex).toBe(0)
  expect(handle.getAttribute('aria-orientation')).toBe('vertical')
  expect(handle.getAttribute('aria-valuemin')).toBe('180')
  expect(handle.getAttribute('aria-valuemax')).toBe('754')
  expect(now()).toBe(300)
  expect(startPane().style.getPropertyValue('--split-start')).toBe('300px')
})

test('the arrows move it 16px, Shift 64px, Home and End go to the ends, and it never passes a minimum', () => {
  const resize = observed()
  const changed = vi.fn()
  render(pane({ defaultSize: 300, onSizeChange: changed }))
  resize(1000)
  fireEvent.keyDown(divider(), { key: 'ArrowRight' })
  expect(now()).toBe(316)
  fireEvent.keyDown(divider(), { key: 'ArrowLeft', shiftKey: true })
  expect(now()).toBe(252)
  fireEvent.keyDown(divider(), { key: 'Home' })
  expect(now()).toBe(180)
  fireEvent.keyDown(divider(), { key: 'ArrowLeft' })
  expect(now()).toBe(180)
  fireEvent.keyDown(divider(), { key: 'End' })
  expect(now()).toBe(754)
  expect(changed).toHaveBeenLastCalledWith(754)
  fireEvent.keyDown(divider(), { key: 'Enter' })
  expect(now()).toBe(754)
})

test('a drag follows the pointer and tells the app once, at the end', () => {
  const resize = observed()
  const changed = vi.fn()
  render(pane({ defaultSize: 300, onSizeChange: changed }))
  resize(1000)
  fireEvent.pointerDown(divider(), { button: 0, clientX: 300, pointerId: 1 })
  fireEvent.pointerMove(divider(), { clientX: 360, pointerId: 1 })
  expect(now()).toBe(360)
  fireEvent.pointerMove(divider(), { clientX: 1200, pointerId: 1 })
  expect(now()).toBe(754)
  expect(changed).not.toHaveBeenCalled()
  fireEvent.pointerUp(divider(), { pointerId: 1 })
  expect(changed).toHaveBeenCalledTimes(1)
  expect(changed).toHaveBeenCalledWith(754)
  expect(divider().hasAttribute('data-dragging')).toBe(false)
})

test('a double press puts it back to the default and tells the app null', () => {
  const resize = observed()
  const changed = vi.fn()
  render(pane({ defaultSize: 300, onSizeChange: changed }))
  resize(1000)
  fireEvent.keyDown(divider(), { key: 'ArrowRight', shiftKey: true })
  expect(now()).toBe(364)
  fireEvent.doubleClick(divider())
  expect(now()).toBe(300)
  expect(changed).toHaveBeenLastCalledWith(null)
})

test('the app can keep the size: `size` is the width, and null is the default', () => {
  const resize = observed()
  const { rerender } = render(pane({ size: 400, defaultSize: 300 }))
  resize(1000)
  expect(now()).toBe(400)
  fireEvent.keyDown(divider(), { key: 'ArrowRight' })
  expect(now()).toBe(400)
  rerender(pane({ size: null, defaultSize: 300 }))
  expect(now()).toBe(300)
})

test('a size kept under a storageKey comes back, and a reset forgets it', () => {
  const resize = observed()
  const first = render(pane({ defaultSize: 300, storageKey: 'test.split' }))
  resize(1000)
  fireEvent.keyDown(divider(), { key: 'ArrowRight' })
  expect(window.localStorage.getItem('test.split')).toBe('316')
  first.unmount()
  render(pane({ defaultSize: 300, storageKey: 'test.split' }))
  resize(1000)
  expect(now()).toBe(316)
  fireEvent.doubleClick(divider())
  expect(window.localStorage.getItem('test.split')).toBeNull()
})

test('a width kept that no longer fits is held inside the room there is', () => {
  const resize = observed()
  render(pane({ size: 900 }))
  resize(700)
  expect(now()).toBe(454)
})

test('under the two minimums and the divider one pane shows, the one `show` names; the other stays in the page, hidden', () => {
  const resize = observed()
  const panes = vi.fn()
  const { rerender } = render(pane({ onPanesChange: panes }))
  resize(900)
  expect(panes).toHaveBeenLastCalledWith(2)
  resize(425)
  expect(panes).toHaveBeenLastCalledWith(1)
  expect(startPane().hidden).toBe(false)
  expect(endPane().hidden).toBe(true)
  expect(document.querySelector('[role="separator"]')).toBeNull()
  rerender(pane({ onPanesChange: panes, show: 'end' }))
  expect(startPane().hidden).toBe(true)
  expect(startPane().textContent).toBe('The list')
  expect(endPane().hidden).toBe(false)
  resize(426)
  expect(document.querySelector('[data-slot="split-pane"]')!.getAttribute('data-panes')).toBe('2')
})

test('without a way to measure it has its two panes, as it was asked', () => {
  render(pane({ defaultSize: 280 }))
  expect(startPane().hidden).toBe(false)
  expect(endPane().hidden).toBe(false)
  expect(now()).toBe(280)
})
