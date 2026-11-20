// The notices on Ark UI's Toast (`@ark-ui/react/toast`), as a column: the contract of `Toasts` stays as before.
// The caller's list (`items`), `status` region in English, no extra Tab per notice, immediate exit without
// animations and short with them, time that starts over, Esc that does not close on its own. New with the column: at
// most `max` (ten by default; three in these tests), one above the other and all readable, the newest at the bottom, the oldest pushed out from the top by a
// fourth; the pointer on the column or focus inside it holds the time of all of them.
// Ark's machines act in a microtask (never inside React's commit): after a render or an event, `settle()` lets them.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Toasts, type ToastItem } from '../src'
import { preloadMotion } from '../src/internal/motion'
import { TOASTS_LAYER } from '../src/internal/overlay'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
/** Lets Ark's store and machines act (microtasks), inside React's `act`. */
const settle = () => act(async () => {})
/** Fake time passing, with the microtasks of Ark's machines in between. */
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
const two = [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second', undo: { onClick: () => {} } }]
const region = () => screen.getByRole('status')
const card = (text: string) => screen.getByText(text).closest<HTMLElement>('[data-part="root"]')!
/** The notices of the column, from the newest (at the bottom) to the oldest (at the top). */
const column = () =>
  [...region().querySelectorAll<HTMLElement>('[data-part="root"]:not([hidden]):not([inert])')]
    .sort((x, y) => Number(x.dataset['index']) - Number(y.dataset['index']))
    .map((el) => el.querySelector('[data-part="title"]')!.textContent)
const notice = (n: number, extra: Partial<ToastItem> = {}): ToastItem => ({ id: `t${n}`, text: `Notice ${n}`, ...extra })
const pointerOn = (el: Element) => fireEvent.pointerEnter(el, { pointerType: 'mouse' })
const pointerOff = (el: Element) => fireEvent.pointerLeave(el, { pointerType: 'mouse' })

describe('the region', () => {
  test('it is a polite `status` with an English name, not Ark\'s “Notifications” `region`', async () => {
    render(<Toasts max={3} items={two} />)
    await settle()
    const r = region()
    expect(r.getAttribute('aria-live')).toBe('polite')
    expect(r.getAttribute('aria-atomic')).toBe('false')
    expect(r.getAttribute('aria-relevant')).toBe('additions')
    expect(r.getAttribute('aria-label')).toBe('Notices')
    expect(screen.queryByRole('region')).toBeNull()
    expect(document.body.innerHTML).not.toMatch(/Notifications/)
    // The sheets recognize it from here (a click on a notice does not close them), and it sits above them.
    expect(r.hasAttribute('data-toasts')).toBe(true)
    expect(r.className).toContain(TOASTS_LAYER)
    // Ark's group, placed by our classes: its own fixed position and top z-index are not on the element.
    expect(r.getAttribute('data-scope')).toBe('toast')
    expect(r.getAttribute('data-part')).toBe('group')
    expect(r.style.position).toBe('')
    expect(r.style.zIndex).toBe('')
  })

  test('it is Ark\'s toast group: F6 brings the focus to the column', async () => {
    render(<Toasts max={3} items={two} />)
    await settle()
    fireEvent.keyDown(document.body, { key: 'F6', code: 'F6' })
    await settle()
    expect(document.activeElement).toBe(region())
  })
})

describe('the notices', () => {
  test('they are not `dialog` or `status` and add no tab stops: only “Undo” is reached with Tab', async () => {
    render(<Toasts max={3} items={two} />)
    await settle()
    expect(screen.queryAllByRole('dialog')).toEqual([])
    expect(screen.queryAllByRole('alertdialog')).toEqual([])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    for (const text of ['First', 'Second']) {
      expect(card(text).hasAttribute('tabindex'), text).toBe(false)
      expect(card(text).hasAttribute('role'), text).toBe(false)
      expect(card(text).hasAttribute('aria-labelledby'), text).toBe(false)
      expect(card(text).getAttribute('data-scope'), text).toBe('toast')
    }
    // What Tab reaches: native controls and non-negative `tabindex`. The region has `tabindex=-1` (only for F6).
    const tabbable = [...region().querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex]')].filter((el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'))
    expect(tabbable.map((el) => el.textContent)).toEqual(['Undo'])
    expect(region().tabIndex).toBe(-1)
  })

  test('“Undo” calls its inverse once per click', async () => {
    const onClick = vi.fn()
    render(<Toasts max={3} items={[{ id: 'x', text: 'Completed.', undo: { onClick } }]} />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('without animations, a notice removed from `items` is out of the column at once, and leaves nothing in the DOM', async () => {
    const { rerender } = render(<Toasts max={3} items={two} />)
    await settle()
    rerender(<Toasts max={3} items={two.slice(1)} />)
    // In the same render it is hidden and inert; Ark's store drops it right after (a microtask, before any paint).
    expect(column()).toEqual(['Second'])
    await settle()
    expect(screen.queryByText('First')).toBeNull()
    expect(region().children).toHaveLength(1)
    rerender(<Toasts max={3} items={[]} />)
    await settle()
    expect(region().children).toHaveLength(0)
  })

  test('Esc inside a notice does not close it on its own: it stays, and its time keeps counting', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={two} durationMs={3000} onDismiss={onDismiss} />)
    await settle()
    const undo = screen.getByRole('button', { name: 'Undo' })
    act(() => undo.focus())
    fireEvent.keyDown(undo, { key: 'Escape' })
    await settle()
    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.getByText('Second')).toBeTruthy()
    act(() => undo.blur())
    await tick(3100)
    expect(onDismiss.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b'])
  })
})

/** jsdom measures nothing: every notice is as tall as this says (by its text), 40px unless told otherwise. */
function heights(by: Record<string, number> = {}) {
  return vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset['part'] === 'root' ? (by[this.querySelector('[data-part="title"]')?.textContent ?? ''] ?? 40) : 0
  })
}
/** Where a notice sits: its bottom edge above the bottom of the column and its top edge, in px. */
const box = (text: string) => {
  const el = card(text)
  const up = -Number(/translateY\((-?[\d.]+)px\)/.exec(el.style.transform)?.[1] ?? 0) || 0
  return { bottom: up, top: up + el.offsetHeight }
}

describe('the column', () => {
  afterEach(() => vi.restoreAllMocks())

  test('one above the other, the newest at the bottom, 8px apart: no notice covers another, none is smaller or hidden', async () => {
    heights({ 'Notice 1': 60 })
    render(<Toasts max={3} items={[notice(1), notice(2), notice(3)]} />)
    await settle()
    expect(column()).toEqual(['Notice 3', 'Notice 2', 'Notice 1'])
    expect(box('Notice 3')).toEqual({ bottom: 0, top: 40 })
    expect(box('Notice 2')).toEqual({ bottom: 48, top: 88 })
    expect(box('Notice 1')).toEqual({ bottom: 96, top: 156 })
    // The region is as tall as the column, gaps included: the pointer crossing a gap is still on it.
    expect(region().style.height).toBe('156px')
    for (const text of ['Notice 1', 'Notice 2', 'Notice 3']) {
      const el = card(text)
      expect(el.style.transform, text).not.toMatch(/scale/)
      expect(el.style.height, text).toBe('')
      expect(el.outerHTML, text).not.toMatch(/opacity-0|aria-hidden="true"|\binert\b/)
      expect(el.hasAttribute('hidden'), text).toBe(false)
    }
    // Nothing "opens" under the pointer: the places are the same with the pointer on the column.
    pointerOn(region())
    expect(box('Notice 2')).toEqual({ bottom: 48, top: 88 })
    expect(region().style.height).toBe('156px')
  })

  test('without `max` the column holds ten (R12 of the toolkit rules, 2026-11-20): an eleventh pushes the oldest out', async () => {
    const onDismiss = vi.fn()
    render(<Toasts items={Array.from({ length: 11 }, (_, i) => notice(i))} onDismiss={onDismiss} />)
    await settle()
    expect(column()).toHaveLength(10)
    expect(column()[0]).toBe('Notice 10')
    expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['t0'])
  })

  test('at most three: with more in `items` only the three newest are in the column, and none is left inert in the DOM', async () => {
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={Array.from({ length: 6 }, (_, i) => notice(i, { undo: { onClick: () => {} } }))} onDismiss={onDismiss} />)
    await settle()
    expect(column()).toEqual(['Notice 5', 'Notice 4', 'Notice 3'])
    expect(region().querySelectorAll('[inert]')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(3)
    // The ones that did not fit are given back to the caller, oldest first.
    expect(onDismiss.mock.calls.map((c) => c[0])).toEqual(['t0', 't1', 't2'])
  })

  test('first in, first out: a fourth enters at the bottom, the others move up one place and the oldest leaves from the top', async () => {
    heights()
    const onDismiss = vi.fn()
    const { rerender } = render(<Toasts max={3} items={[notice(1), notice(2), notice(3)]} onDismiss={onDismiss} />)
    await settle()
    expect(box('Notice 1').bottom).toBe(96)
    rerender(<Toasts max={3} items={[notice(1), notice(2), notice(3), notice(4)]} onDismiss={onDismiss} />)
    await settle()
    expect(column()).toEqual(['Notice 4', 'Notice 3', 'Notice 2'])
    expect(screen.queryByText('Notice 1')).toBeNull()
    expect([box('Notice 4').bottom, box('Notice 3').bottom, box('Notice 2').bottom]).toEqual([0, 48, 96])
    expect(onDismiss.mock.calls).toEqual([['t1']])
    // A fifth: the next oldest goes. The caller that keeps a pushed-out notice in `items` does not get it back in the column.
    rerender(<Toasts max={3} items={[notice(1), notice(2), notice(3), notice(4), notice(5)]} onDismiss={onDismiss} />)
    await settle()
    expect(column()).toEqual(['Notice 5', 'Notice 4', 'Notice 3'])
    expect(onDismiss.mock.calls).toEqual([['t1'], ['t2']])
    // When the newest is removed the others come down one place; the pushed-out ones do not come back.
    rerender(<Toasts max={3} items={[notice(1), notice(2), notice(3), notice(4)]} onDismiss={onDismiss} />)
    await settle()
    expect(column()).toEqual(['Notice 4', 'Notice 3'])
    expect([box('Notice 4').bottom, box('Notice 3').bottom]).toEqual([0, 48])
    expect(region().style.height).toBe('88px')
  })

  test('a notice removed from the middle: the ones above it close the gap', async () => {
    heights()
    const { rerender } = render(<Toasts max={3} items={[notice(1), notice(2), notice(3)]} />)
    await settle()
    rerender(<Toasts max={3} items={[notice(1), notice(3)]} />)
    await settle()
    expect(column()).toEqual(['Notice 3', 'Notice 1'])
    expect(box('Notice 1')).toEqual({ bottom: 48, top: 88 })
  })

  test('with `animated` off the column is still: plain styles for the places, no motion classes, nothing in between', async () => {
    await preloadMotion()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    heights()
    const items = [notice(1), notice(2), notice(3)]
    const { rerender } = render(<Toasts max={3} inline items={items} />)
    await settle()
    const still = () => {
      // Motion writes the places as it goes (a `transform` and an `opacity` computed per frame): here they are exactly
      // the declared ones, and no class of the column moves anything.
      for (const el of region().querySelectorAll<HTMLElement>('[data-part="root"]')) expect(el.className).not.toMatch(/duration-|ease-|animate-|motion-safe|transition/)
      return [...region().querySelectorAll<HTMLElement>('[data-part="root"]')].map((el) => el.getAttribute('style'))
    }
    expect(still()).toEqual(['z-index: 10;', 'z-index: 9; transform: translateY(-48px);', 'z-index: 8; transform: translateY(-96px);'])
    // A fourth: the oldest is out in the same render; the new one is in right after (a microtask: no frame in between).
    rerender(<Toasts max={3} inline items={[...items, notice(4)]} />)
    expect(column()).toEqual(['Notice 3', 'Notice 2'])
    expect(card('Notice 1').hasAttribute('hidden')).toBe(true)
    await settle()
    expect(column()).toEqual(['Notice 4', 'Notice 3', 'Notice 2'])
    expect(screen.queryByText('Notice 1')).toBeNull()
    expect(still()).toEqual(['z-index: 10;', 'z-index: 9; transform: translateY(-48px);', 'z-index: 8; transform: translateY(-96px);'])
  })
})

describe('the time', () => {
  test('with the pointer on the column no notice counts down; when it leaves each one starts over', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={two} durationMs={3000} onDismiss={onDismiss} />)
    await settle()
    await tick(2000)
    // The pointer enters the column: the time stops for all of them (they would move under the pointer).
    pointerOn(region())
    expect(region().getAttribute('data-paused')).toBe('true')
    await tick(10_000)
    expect(onDismiss).not.toHaveBeenCalled()
    expect(column()).toEqual(['Second', 'First'])
    pointerOff(region())
    expect(region().hasAttribute('data-paused')).toBe(false)
    await tick(2900)
    expect(onDismiss).not.toHaveBeenCalled()
    await tick(200)
    expect(onDismiss.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b'])
  })

  test('a click on the text of a notice does not hold the column: focus on the region itself is not focus on a control', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={two} durationMs={3000} onDismiss={onDismiss} />)
    await settle()
    // The region can take focus (F6), so a click on plain text inside it gives it focus.
    act(() => region().focus())
    expect(document.activeElement).toBe(region())
    expect(region().hasAttribute('data-paused')).toBe(false)
    // From a control back to the region: the time is no longer held.
    const undo = screen.getByRole('button', { name: 'Undo' })
    act(() => undo.focus())
    expect(region().getAttribute('data-paused')).toBe('true')
    act(() => region().focus())
    expect(region().hasAttribute('data-paused')).toBe(false)
    await tick(3100)
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  test('a finger does not hover: its touch does not hold the column', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={two} durationMs={3000} onDismiss={onDismiss} />)
    await settle()
    fireEvent.pointerEnter(region(), { pointerType: 'touch' })
    expect(region().hasAttribute('data-paused')).toBe(false)
    await tick(3100)
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  test('focus inside the column holds the time, moving within it does not restart it, leaving it does', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <>
        <button>Elsewhere</button>
        <Toasts max={3} items={[notice(1, { undo: { onClick: () => {} } }), notice(2, { undo: { onClick: () => {} } })]} durationMs={3000} onDismiss={onDismiss} />
      </>,
    )
    await settle()
    const [newer, older] = screen.getAllByRole('button', { name: 'Undo' })
    act(() => newer!.focus())
    await tick(5000)
    act(() => older!.focus())
    expect(region().getAttribute('data-paused')).toBe('true')
    await tick(5000)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    expect(region().hasAttribute('data-paused')).toBe(false)
    await tick(3100)
    // Focus stays where the user sent it: Ark's "give focus back" does not pull it into the column again.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  test('a notice removed with focus inside it does not leave the column held: the others keep counting down', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    function Host() {
      const [items, setItems] = useState<ToastItem[]>([{ id: 'a', text: 'First' }, { id: 'b', text: 'Second', undo: { onClick: () => setItems((now) => now.filter((t) => t.id !== 'b')) } }])
      return <Toasts max={3} items={items} durationMs={3000} onDismiss={onDismiss} />
    }
    render(<Host />)
    await settle()
    const undo = screen.getByRole('button', { name: 'Undo' })
    act(() => undo.focus())
    expect(region().getAttribute('data-paused')).toBe('true')
    // From the keyboard: the button goes away with its notice, and jsdom (like some browsers) sends no `blur`.
    fireEvent.click(undo, { detail: 0 })
    await settle()
    expect(screen.queryByText('Second')).toBeNull()
    expect(region().hasAttribute('data-paused')).toBe(false)
    await tick(3100)
    expect(onDismiss.mock.calls).toEqual([['a']])
  })

  test('a notice removed and then back (same id) restarts with its time; one removed before its time does not call `onDismiss`', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const one = [{ id: 'a', text: 'First' }]
    const { rerender } = render(<Toasts max={3} items={one} durationMs={3000} onDismiss={onDismiss} />)
    await tick(1000)
    rerender(<Toasts max={3} items={[]} durationMs={3000} onDismiss={onDismiss} />)
    await tick(10_000)
    expect(onDismiss).not.toHaveBeenCalled()
    rerender(<Toasts max={3} items={one} durationMs={3000} onDismiss={onDismiss} />)
    await tick(2900)
    expect(onDismiss).not.toHaveBeenCalled()
    await tick(200)
    expect(onDismiss.mock.calls).toEqual([['a']])
  })

  test('a notice whose time ran out leaves the column even if the caller keeps it in `items`, and does not expire twice', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toasts max={3} items={two} durationMs={3000} onDismiss={onDismiss} />)
    await tick(3100)
    expect(onDismiss).toHaveBeenCalledTimes(2)
    expect(column()).toEqual([])
    await tick(10_000)
    expect(onDismiss).toHaveBeenCalledTimes(2)
    expect(region().children).toHaveLength(0)
  })
})

describe('with animations', () => {
  const fakeMatchMedia = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') ? reduce : false, media: q, addEventListener() {}, removeEventListener() {} }))

  test('the removed notice exits: inert and with “Undo” off during the exit, a double click makes a single inverse', async () => {
    await preloadMotion()
    fakeMatchMedia(false)
    const onUndo = vi.fn()
    function Host() {
      const [items, setItems] = useState([{ id: 'x', text: 'Done', undo: { onClick: () => (onUndo(), setItems([])) } }])
      return <Toasts max={3} inline animated items={items} />
    }
    render(<Host />)
    await settle()
    const undo = screen.getByRole('button', { name: 'Undo' })
    fireEvent.click(undo)
    expect(screen.queryByText('Done')).not.toBeNull()
    expect(undo.closest('[inert]')).not.toBeNull()
    expect((undo as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(undo)
    expect(onUndo).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText('Done')).toBeNull(), { timeout: 3000, interval: 5 })
  })

  test('a notice that arrives after the first ones enters from below; the ones already there at mount do not move', async () => {
    await preloadMotion()
    fakeMatchMedia(false)
    const { rerender } = render(<Toasts max={3} inline animated items={[notice(1)]} />)
    await settle()
    expect(card('Notice 1').getAttribute('style') ?? '').not.toMatch(/opacity:\s*0(?![.\d])/)
    rerender(<Toasts max={3} inline animated items={[notice(1), notice(2)]} />)
    // It starts transparent, a little lower and smaller (`NOTICES.enter`), and ends at the bottom, fully visible.
    await waitFor(() => expect(screen.queryByText('Notice 2')).not.toBeNull())
    await waitFor(() => expect(card('Notice 2').style.opacity).toBe('1'), { timeout: 3000, interval: 5 })
    expect(column()).toEqual(['Notice 2', 'Notice 1'])
  })

  test('animations turned on with notices already shown: they stay where they are, and only a new one enters', async () => {
    await preloadMotion()
    fakeMatchMedia(false)
    // Without animations first (or with the Motion chunk still on its way): the notice is simply there.
    const { rerender } = render(<Toasts max={3} inline items={[notice(1)]} />)
    await settle()
    rerender(<Toasts max={3} inline animated items={[notice(1)]} />)
    // Motion is here now: the column is drawn by it, but a notice the user was already reading does not come in again.
    await waitFor(() => expect(screen.queryByText('Notice 1')).not.toBeNull())
    expect(card('Notice 1').style.opacity).not.toBe('0')
    await settle()
    expect(card('Notice 1').style.opacity).not.toBe('0')
    // The next one is a change the user made: it enters.
    rerender(<Toasts max={3} inline animated items={[notice(1), notice(2)]} />)
    await waitFor(() => expect(screen.queryByText('Notice 2')).not.toBeNull())
    expect(Number(card('Notice 2').style.opacity)).toBeLessThan(1)
    await waitFor(() => expect(card('Notice 2').style.opacity).toBe('1'), { timeout: 3000, interval: 5 })
  })

  test('a fourth pushes the oldest out: it stays in the DOM, inert, while it leaves from the top, then it is gone', async () => {
    await preloadMotion()
    fakeMatchMedia(false)
    const items = [notice(1, { undo: { onClick: () => {} } }), notice(2), notice(3)]
    const { rerender } = render(<Toasts max={3} inline animated items={items} />)
    await settle()
    rerender(<Toasts max={3} inline animated items={[...items, notice(4)]} />)
    expect(card('Notice 1').hasAttribute('inert')).toBe(true)
    expect(column()).toEqual(['Notice 3', 'Notice 2'])
    await waitFor(() => expect(column()).toEqual(['Notice 4', 'Notice 3', 'Notice 2']))
    await waitFor(() => expect(screen.queryByText('Notice 1')).toBeNull(), { timeout: 3000, interval: 5 })
  })

  test('pushed out or closed: the oldest goes up when a new one arrives in a full column (even if the caller removes it itself), a closed one sinks', async () => {
    await preloadMotion()
    fakeMatchMedia(false)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset['part'] === 'root' ? 40 : 0
    })
    try {
      /** Where Motion is taking it: read at the end of its way, when it is as transparent as it gets. */
      const endOf = async (text: string) => {
        const el = card(text)
        let y = 0
        await waitFor(
          () => {
            y = Number(/translateY\((-?[\d.]+)px\)/.exec(el.style.transform)?.[1] ?? 0)
            expect(Number(el.style.opacity)).toBeLessThan(0.2)
          },
          { timeout: 3000, interval: 5 },
        )
        return y
      }
      // The client's way: at most three in `items`, the oldest dropped as the new one is added.
      const { rerender } = render(<Toasts max={3} inline animated items={[notice(1), notice(2), notice(3)]} />)
      await settle()
      rerender(<Toasts max={3} inline animated items={[notice(2), notice(3), notice(4)]} />)
      // From its place (96px up) further up, past the place above the last (144px).
      expect(await endOf('Notice 1')).toBeLessThan(-110)
      await waitFor(() => expect(screen.queryByText('Notice 1')).toBeNull(), { timeout: 3000, interval: 5 })
      // Closed (removed with nothing arriving): it sinks from where it stands (48px up).
      rerender(<Toasts max={3} inline animated items={[notice(2), notice(4)]} />)
      expect(await endOf('Notice 3')).toBeGreaterThan(-48)
    } finally {
      vi.restoreAllMocks()
    }
  })

  test('the column moves with the list transition, from and to the declared places', async () => {
    const { NOTICES, MOTION, DURATION_MS } = await import('../src/internal/motion-impl')
    expect(NOTICES.transition).toEqual(MOTION.list)
    expect(NOTICES.entering).toEqual(MOTION.enter)
    expect(NOTICES.leaving).toEqual(MOTION.leave)
    // In from below; closed, a little down; pushed out by a newer one, a little above the place over the last. A notice
    // enters from further than it leaves by, and keeps its size all the way.
    expect(NOTICES.enter.opacity).toBe(0)
    expect(NOTICES.enter.y).toBeGreaterThan(0)
    expect(NOTICES.close.opacity).toBe(0)
    expect(NOTICES.close.y).toBeGreaterThan(0)
    expect(NOTICES.close.y).toBeLessThan(NOTICES.enter.y)
    expect(NOTICES.pushed.opacity).toBe(0)
    expect(NOTICES.pushed.y).toBe(-NOTICES.close.y)
    expect(JSON.stringify(NOTICES)).not.toMatch(/scale/)
    // How long Ark keeps a leaving notice in the DOM: under 250 ms like every other declared duration.
    expect(DURATION_MS.toast).toBeLessThan(250)
  })

  test('with prefers-reduced-motion the removed notice disappears at once, even with `animated`', async () => {
    await preloadMotion()
    fakeMatchMedia(true)
    const { rerender } = render(<Toasts max={3} inline animated items={[{ id: 'x', text: 'Done' }]} />)
    await settle()
    rerender(<Toasts max={3} inline animated items={[]} />)
    expect(column()).toEqual([])
    await settle()
    expect(screen.queryByText('Done')).toBeNull()
  })
})
