// The notices (`Toasts`, on Ark UI's Toast): politeness, undo, timers, pausing, the layer above every overlay of the
// toolkit, and a click on a notice that never closes a modal window. (An app's own sheets are tested in the app's
// package.)
import { act, fireEvent, render, screen } from '@testing-library/react'
import { type ReactElement } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { Icon } from '../src/primitives'
import { Dialog, Toasts } from '../src/components'
import { ignoreToasts } from '../src/internal/overlay'
import { noop, settle } from './helpers'

// Ark's toast machines act in a microtask (never inside React's commit): after a render, `settle()` lets them.

test('Toasts are polite and offer undo', async () => {
  const onClick = vi.fn()
  render(<Toasts items={[{ id: 'x', text: 'Completed (12 done).', undo: { onClick } }, { id: 'y', text: 'Saved' }]} />)
  await settle()
  const status = screen.getByRole('status')
  expect(status.getAttribute('aria-live')).toBe('polite')
  // `status` is atomic by default: without these two attributes a new notice would make the others be read again.
  expect(status.getAttribute('aria-atomic')).toBe('false')
  expect(status.getAttribute('aria-relevant')).toBe('additions')
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Saved')).toBeTruthy()
})

test('Toasts can render in flow for documentation', () => {
  render(<Toasts inline items={[{ id: 'x', text: 'Saved' }]} />)
  const status = screen.getByRole('status')
  expect(status.className).not.toMatch(/\bfixed\b/)
})

// durationMs and onDismiss of Toasts: the time and the pause live in the package (Ark's toast timer, which runs on
// animation frames: a notice expires within a frame of its time, so the checks leave 100 ms on each side). Fake clock,
// no real waiting.
afterEach(() => vi.useRealTimers())
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
const card = (text: string) => screen.getByText(text).closest<HTMLElement>('[data-part="root"]')!
const two = [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second', undo: { onClick: () => {} } }]

test('Toasts call onDismiss once per toast after durationMs', async () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<Toasts items={two} durationMs={3000} onDismiss={onDismiss} />)
  await tick(2900)
  expect(onDismiss).not.toHaveBeenCalled()
  await tick(200)
  expect(onDismiss.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b'])
  // Only once per notice: the caller removes them, but even if it did not, it does not repeat.
  await tick(60_000)
  expect(onDismiss).toHaveBeenCalledTimes(2)
})

test('Toasts stay put without durationMs, without onDismiss, or with a non-positive duration', async () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  const { rerender } = render(<Toasts items={two} onDismiss={onDismiss} />)
  await tick(3_600_000)
  rerender(<Toasts items={two} durationMs={0} onDismiss={onDismiss} />)
  await tick(3_600_000)
  rerender(<Toasts items={two} durationMs={-5} onDismiss={onDismiss} />)
  await tick(3_600_000)
  expect(onDismiss).not.toHaveBeenCalled()
  rerender(<Toasts items={two} durationMs={1000} />)
  await tick(3_600_000)
  expect(screen.getByText('First')).toBeTruthy()
})

test('a timed toast shows the seconds left and a close button; an untimed one has neither', async () => {
  const { unmount } = render(<Toasts items={two} />)
  await settle()
  expect(screen.getByText('First')).toBeTruthy()
  expect(document.querySelector('[data-slot="toast-timer"]')).toBeNull()
  expect(screen.queryByRole('button', { name: /^Close the notice/ })).toBeNull()
  unmount()

  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<Toasts items={two} durationMs={3000} onDismiss={onDismiss} />)
  await settle()
  const timer = () => card('First').querySelector('[data-slot="toast-timer"]')!
  expect(timer().textContent).toBe('3')
  // Screen readers do not hear the seconds counting down.
  expect(timer().getAttribute('aria-hidden')).toBe('true')
  await tick(1000)
  expect(timer().textContent).toBe('2')
  // With the pointer on the column it goes back to the full time, like the real timer that starts over when it leaves.
  fireEvent.pointerEnter(screen.getByRole('status'), { pointerType: 'mouse' })
  expect(timer().textContent).toBe('3')
  fireEvent.click(screen.getByRole('button', { name: 'Close the notice: First' }))
  expect(onDismiss).toHaveBeenCalledWith('a')
  vi.useRealTimers()
})

test('an error never counts down: it shows no seconds, keeps its close button and stays when the others have gone', async () => {
  // The drawing of Sigrid's `error`: the one look of a failure, the same as a `Note`'s error.
  const icon = render(<Icon name="error" />)
  const failure = icon.container.querySelector('svg')!.outerHTML
  icon.unmount()
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<Toasts items={[{ id: 'e', text: 'Could not save', kind: 'error' }, { id: 'a', text: 'First' }]} durationMs={3000} onDismiss={onDismiss} />)
  await settle()
  // The mark and the word for screen readers, before the text; no seconds, but the «×».
  expect(card('Could not save').querySelector('[data-slot="toast-error"]')).toBeTruthy()
  expect(card('Could not save').querySelector('svg')!.outerHTML).toBe(failure)
  expect(card('First').querySelector('svg')).toBeNull()
  expect(card('Could not save').textContent).toMatch(/^Error:Could not save/)
  expect(card('Could not save').querySelector('[data-slot="toast-timer"]')).toBeNull()
  expect(card('First').querySelector('[data-slot="toast-timer"]')!.textContent).toBe('3')
  await tick(60_000)
  expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['a'])
  expect(screen.getByText('Could not save')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close the notice: Could not save' }))
  expect(onDismiss).toHaveBeenLastCalledWith('e')
})

test('a full column pushes the plain notices out before an error, and an error only when nothing else is left', async () => {
  const onDismiss = vi.fn()
  const error = (id: string) => ({ id, text: `Error ${id}`, kind: 'error' as const })
  const plain = (id: string) => ({ id, text: `Notice ${id}` })
  const { rerender } = render(<Toasts max={2} items={[error('e1'), plain('a'), plain('b')]} onDismiss={onDismiss} />)
  await settle()
  // The error is the oldest, yet the oldest plain notice is the one that goes.
  expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['a'])
  expect(screen.getByText('Error e1')).toBeTruthy()
  expect(screen.getByText('Notice b')).toBeTruthy()
  onDismiss.mockClear()
  rerender(<Toasts max={2} items={[error('e1'), error('e2'), error('e3')]} onDismiss={onDismiss} />)
  await settle()
  expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['e1'])
})

test('a toast can carry the shortcut next to undo and quick choices on a second row', async () => {
  const pick = vi.fn()
  render(
    <Toasts
      inline
      items={[
        {
          id: 'x',
          text: 'Moved to Home.',
          undo: { hint: 'Z', onClick: () => {} },
          actions: [
            { label: 'When', items: [{ id: 'tomorrow', label: 'Tomorrow', pressed: true, onClick: pick }] },
            { label: 'Priority', items: [{ id: 'p1', label: 'P1', ariaLabel: 'Priority 1', onClick: pick }] },
          ],
        },
      ]}
    />,
  )
  await settle()
  const undo = screen.getByRole('button', { name: 'Undo' })
  expect(undo.querySelector('kbd')?.textContent).toBe('Z')
  expect(undo.getAttribute('aria-keyshortcuts')).toBe('Z')
  expect(screen.getByRole('group', { name: 'When' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Tomorrow' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Priority 1' }))
  expect(pick).toHaveBeenCalledTimes(1)
  // A pointer click does not leave focus in the notice (it would keep the column frozen); from the keyboard the focus stays.
  const p1 = screen.getByRole('button', { name: 'Priority 1' })
  p1.focus()
  fireEvent.click(p1, { detail: 1 })
  expect(document.activeElement).not.toBe(p1)
  p1.focus()
  fireEvent.click(p1, { detail: 0 })
  expect(document.activeElement).toBe(p1)
})

test('from 860px the column sits at the bottom right; on a phone it stays centred above an app\'s bottom bar', () => {
  render(<Toasts items={two} />)
  const region = screen.getByRole('status', { name: 'Notices' })
  // Centred: its left edge in the middle, pulled back by half its own width; from `md` up, against the right edge.
  for (const cls of ['fixed', 'left-1/2', '-translate-x-1/2', 'md:left-auto', 'md:right-4', 'md:translate-x-0']) expect(region.className.split(' ')).toContain(cls)
  expect(region.className).toContain('bottom-[calc(1rem+var(--bottom-bar-room,0px))]')
})

test('Toasts pause while the pointer is on the column and restart when it leaves', async () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<Toasts items={two} durationMs={3000} onDismiss={onDismiss} />)
  await tick(2000)
  fireEvent.pointerEnter(card('First'), { pointerType: 'mouse' })
  await tick(60_000)
  // The pointer is on the column: none of its notices expires (they would move under the pointer).
  expect(onDismiss).not.toHaveBeenCalled()
  fireEvent.pointerLeave(screen.getByRole('status'), { pointerType: 'mouse' })
  await tick(2900)
  expect(onDismiss).not.toHaveBeenCalled()
  await tick(200)
  expect(onDismiss.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b'])
})

test('Toasts pause while focus is inside the column and restart when it leaves', async () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<Toasts items={two} durationMs={3000} onDismiss={onDismiss} />)
  await settle()
  const undo = screen.getByRole('button', { name: 'Undo' })
  act(() => undo.focus())
  await tick(60_000)
  // Focus is in the column: all its notices wait.
  expect(onDismiss).not.toHaveBeenCalled()
  // Focus moving inside the column does not restart them.
  fireEvent.focusOut(undo, { relatedTarget: card('First') })
  await tick(60_000)
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => undo.blur())
  await tick(2900)
  expect(onDismiss).not.toHaveBeenCalled()
  await tick(200)
  expect(onDismiss.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b'])
})

test('a new onDismiss on every render does not restart the timer, and the latest one is called', async () => {
  vi.useFakeTimers()
  const first = vi.fn()
  const second = vi.fn()
  const { rerender } = render(<Toasts items={two} durationMs={3000} onDismiss={first} />)
  await tick(2000)
  rerender(<Toasts items={two} durationMs={3000} onDismiss={second} />)
  await tick(900)
  expect(second).not.toHaveBeenCalled()
  await tick(200)
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledTimes(2)
})

test('a toast that leaves items before its time is never dismissed', async () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  const { rerender } = render(<Toasts items={two} durationMs={3000} onDismiss={onDismiss} />)
  await tick(1000)
  rerender(<Toasts items={two.slice(1)} durationMs={3000} onDismiss={onDismiss} />)
  await tick(60_000)
  expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['b'])
})

// ---------- Round 3, M-2: notices stay clickable with a modal window open ----------
// The real test (elementFromPoint with a real overlay) is in the browser; here the structure and Radix's behavior.

test('the toast layer is above every overlay of the package', async () => {
  const status = render(<Toasts items={[{ id: 'x', text: 'Deleted.' }]} />).container.querySelector('[role="status"]')!
  await settle()
  const toastZ = Number(/(?:^|\s)z-\[(\d+)\]/.exec(status.className)?.[1])
  expect(Number.isFinite(toastZ), 'the notices layer has a z-index').toBe(true)
  // The maximum z-index of windows, sheets, menus and popovers: read from the sources, so a new layer does not silently overtake it.
  const overlayZ = ['src/primitives/', 'src/layout/']
    .flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => dir + f))
    .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/(?:^|[\s"'`])z-(\d+)(?=[\s"'`])/g)].map((m) => Number(m[1])))
  expect(overlayZ.length).toBeGreaterThan(0)
  expect(toastZ).toBeGreaterThan(Math.max(...overlayZ))
  // The cards of a notice stay clickable even when a modal window puts `pointer-events: none` on the body.
  expect(status.querySelector('[data-part="root"]')!.className).toMatch(/pointer-events-auto/)
  expect(status.hasAttribute('data-toasts')).toBe(true)
})

test('inline toasts keep the page layer, they are not on top of anything', () => {
  render(<Toasts inline items={[{ id: 'x', text: 'Saved' }]} />)
  expect(screen.getByRole('status').className).not.toMatch(/z-\[/)
})

// A modal window closes with a click outside; a click on a notice (which sits above, outside the window) does not, or
// «Undo» would also close the sheet. Wait for Ark's deferred outside listeners before dispatching a complete click.
const click = (el: Element) => {
  for (const type of ['pointerDown', 'mouseDown', 'pointerUp', 'mouseUp', 'click'] as const) fireEvent[type](el, { button: 0 })
}
const modals: [string, (close: () => void) => ReactElement][] = [
  ['Dialog', (close) => <Dialog open onOpenChange={(open) => !open && close()} title="Area name" />],
]
for (const [name, modal] of modals) {
  test(`${name}: a click on a notice does not close the window, a click outside does`, async () => {
    const close = vi.fn()
    render(
      <>
        {modal(close)}
        <Toasts items={[{ id: 'x', text: 'Deleted.', undo: { onClick: noop } }]} />
      </>,
    )
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    const toast = await screen.findByRole('button', { name: 'Undo', hidden: true })
    click(toast)
    await settle(10)
    expect(close).not.toHaveBeenCalled()
    // Positive check: without it the test would pass even if jsdom triggered nothing.
    click(document.body)
    await settle(10)
    expect(close).toHaveBeenCalledTimes(1)
  })
}

test('ignoreToasts: the handler of the caller speaks first and may decide, a toast target is ignored, others are not', () => {
  const toast = document.createElement('div')
  toast.setAttribute('data-toasts', '')
  const inner = document.createElement('button')
  toast.appendChild(inner)
  document.body.append(toast)
  const event = (target: Element) => {
    const e = new Event('interact', { cancelable: true })
    Object.defineProperty(e, 'target', { value: target })
    return e
  }
  const plain = ignoreToasts()
  const onToast = event(inner)
  plain(onToast)
  expect(onToast.defaultPrevented).toBe(true)
  const onPage = event(document.body)
  plain(onPage)
  expect(onPage.defaultPrevented).toBe(false)
  // The caller's handler goes first: if it lets an outside click through, it stays as is; if it stops it, no other decision.
  const next = vi.fn((e: Event) => e.preventDefault())
  const other = event(document.body)
  ignoreToasts(next)(other)
  expect(next).toHaveBeenCalledTimes(1)
  expect(other.defaultPrevented).toBe(true)
  toast.remove()
})
