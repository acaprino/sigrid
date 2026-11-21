// The key hints, and the press gesture of the button, which exists only with `animated` and without
// prefers-reduced-motion. Off, the DOM is the one from before. (An app's
// own uses of these motions are tested in the app's package.)
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Button } from '../src'
import { Kbd, Shortcut } from '../src/components/ui/kbd'
import { preloadMotion } from '../src/internal/motion'

/** `prefers-reduced-motion: reduce` on or off (jsdom has no matchMedia). */
const systemMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') ? reduce : false, media: q, addEventListener() {}, removeEventListener() {} }))

afterEach(() => vi.unstubAllGlobals())

describe('Kbd and Shortcut', () => {
  test('a key hint is Park\'s plain `<kbd>` (R5): 12px muted text, no box, hidden on a phone, at every size', () => {
    render(
      <>
        <Kbd>Esc</Kbd>
        <Kbd size="md">Z</Kbd>
        <Kbd size="lg">Tab</Kbd>
      </>,
    )
    const [sm, md, lg] = ['Esc', 'Z', 'Tab'].map((t) => screen.getByText(t))
    for (const key of [sm!, md!, lg!]) {
      expect(key.tagName).toBe('KBD')
      const c = key.className.split(' ')
      for (const want of ['text-2xs', 'text-ink-mute', 'font-medium', 'max-md:pointer-coarse:hidden']) expect(c, want).toContain(want)
      // No box: no fill, no border, no corners, no fixed height.
      expect(c.filter((x) => /^(bg-|border|rounded|h-|min-w-|px-)/.test(x))).toEqual([])
    }
    expect([sm, md, lg].map((k) => k!.getAttribute('data-size'))).toEqual(['sm', 'md', 'lg'])
  })

  test('inside a button a key hint takes the button\'s text colour, so it reads on a solid fill', () => {
    render(
      <Button>
        Looks good <Kbd>Enter</Kbd>
      </Button>,
    )
    expect(screen.getByText('Enter').className.split(' ')).toContain('[[data-slot=button]_&]:text-current')
  })

  test('a shortcut is separate keys with one accessible name: held together or one after the other', () => {
    render(
      <>
        <Shortcut keys={['Ctrl', 'Enter']} />
        <Shortcut keys={['G', 'T']} separator="›" />
      </>,
    )
    const together = screen.getByRole('img', { name: 'Ctrl + Enter' })
    expect([...together.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['Ctrl', 'Enter'])
    // The keys and the separator are not read one by one: the name says it once.
    expect([...together.children].every((c) => c.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(screen.getByRole('img', { name: 'G then T' })).toBeTruthy()
  })
})

describe('the button\'s press gesture', () => {
  beforeEach(async () => {
    await preloadMotion()
  })

  test('on or off it is the same `<button>`: the gestures are attached, nothing is wrapped or remounted', () => {
    systemMotion(false)
    const { container: off } = render(<Button>Save</Button>)
    const { container: on } = render(<Button animated>Save</Button>)
    expect(on.innerHTML).toBe(off.innerHTML)
  })

  test('the caller keeps its ref, object or function', () => {
    systemMotion(false)
    const object = { current: null as HTMLButtonElement | null }
    const fn = vi.fn()
    render(
      <>
        <Button animated ref={object}>
          One
        </Button>
        <Button animated ref={fn}>
          Two
        </Button>
      </>,
    )
    expect(object.current).toBe(screen.getByRole('button', { name: 'One' }))
    expect(fn).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Two' }))
  })

  test('`pressable` goes down when pressed, stays still under the pointer, and gives the element back clean', async () => {
    const { pressable, PRESS_SCALE } = await import('../src/internal/motion-impl')
    // Still under the pointer; pressed, it goes down by little: seen, never a bounce.
    expect(PRESS_SCALE.hover).toBe(1)
    expect(PRESS_SCALE.tap).toBeLessThan(1)
    expect(PRESS_SCALE.tap).toBeGreaterThanOrEqual(0.95)
    render(
      <>
        <button type="button">Plain</button>
        <button type="button" aria-disabled="true">
          Busy
        </button>
      </>,
    )
    const el = screen.getByRole('button', { name: 'Plain' })
    const busy = screen.getByRole('button', { name: 'Busy' })
    const stop = pressable(el)
    const stopBusy = pressable(busy)
    /** The scale Motion has written on the element, or null when it is at rest with nothing written. */
    const scale = (b: HTMLElement) => {
      const found = /scale\(([\d.]+)\)/.exec(b.style.transform)?.[1] ?? (b.style.getPropertyValue('scale') || null)
      return found === null ? null : Number(found)
    }
    const pointer = { pointerType: 'mouse', isPrimary: true, button: 0 }
    expect(el.getAttribute('style')).toBeNull() // at rest nothing is written on the element
    // Under the pointer it stays as it is: a desktop button does not grow on hover.
    fireEvent.pointerEnter(el, { pointerType: 'mouse' })
    expect(el.getAttribute('style')).toBeNull()
    // Pressed, it goes down to the declared scale and stays there while held.
    fireEvent.pointerDown(el, pointer)
    await waitFor(() => expect(scale(el)).toBeCloseTo(PRESS_SCALE.tap, 5), { timeout: 3000, interval: 5 })
    // Released, it comes all the way back.
    fireEvent.pointerUp(window, pointer)
    await waitFor(() => expect(scale(el) ?? 1).toBe(1), { timeout: 3000, interval: 5 })
    // On a wide button Space has the same travel as a pointer. Losing focus releases it.
    Object.defineProperty(el, 'offsetWidth', { value: 320 })
    fireEvent.keyDown(el, { key: ' ' })
    await waitFor(() => expect(scale(el)).toBeCloseTo(0.9875, 5))
    fireEvent.focusOut(el)
    await waitFor(() => expect(scale(el) ?? 1).toBe(1))
    // A button that is busy or disabled does not answer.
    fireEvent.pointerDown(busy, pointer)
    fireEvent.pointerUp(window, pointer)
    await new Promise((done) => setTimeout(done, 60))
    expect(busy.getAttribute('style')).toBeNull()
    // The cleanup stops a movement still running and leaves nothing on the element, then or later.
    fireEvent.pointerDown(el, pointer)
    stop()
    stopBusy()
    expect(el.style.transform).toBe('')
    expect(el.style.getPropertyValue('scale')).toBe('')
    await new Promise((done) => setTimeout(done, 60))
    expect(el.style.transform).toBe('')
    expect(el.style.getPropertyValue('scale')).toBe('')
    fireEvent.pointerUp(window, pointer)
  })
})
