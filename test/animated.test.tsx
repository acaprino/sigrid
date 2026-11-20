// Optional animations (ADR-0009: only as a response to a gesture, off by default, never with prefers-reduced-motion).
// The snapshots in this file pin the DOM without `animated` of the toolkit's animated primitives (the one from before
// the animations, plus the later fixes: ARIA attributes of the notices). An app's components are pinned in its own package. The `useId` ids are
// numbered in the order they appear (`stripIds`): they do not depend on the React format or on the cases rendered before.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Checkbox, Toasts } from '../src'
import { preloadMotion } from '../src/internal/motion'

const noop = () => {}

type Extra = Record<string, unknown>
/** The components touched, with fixed data. `extra` adds props (for example `animated`). */
export const cases: Record<string, (extra: Extra) => ReactElement> = {
  Checkbox: (extra) => <Checkbox defaultChecked aria-label="Complete" {...extra} />,
  Toasts: (extra) => <Toasts inline items={[{ id: 'x', text: 'Done', undo: { onClick: noop } }, { id: 'y', text: 'Moved' }]} {...extra} />,
}

/**
 * React ids (`useId`) depend on how many components were rendered before and on the React format (`_r_0_`,
 * `radix-_r_3_`, `«r0»`). In the DOM that is compared or recorded they are numbered in the order they appear (`ID1`, `ID2`…): the
 * same id stays the same, and one more component rendered before does not break the snapshots.
 */
export function stripIds(s: string): string {
  const seen = new Map<string, string>()
  return s.replace(/_r_[0-9a-z]+_|“r[0-9a-z]+”|:r[0-9a-z]+:/g, (id) => {
    if (!seen.has(id)) seen.set(id, `ID${seen.size + 1}`)
    return seen.get(id)!
  })
}

/** Ark's machines (the notices, the date field, the labels, the upload zone) act in a microtask after the render. */
const settle = () => act(async () => {})

export const html = async (el: ReactElement) => {
  const { baseElement } = render(el)
  await settle()
  const out = stripIds(baseElement.innerHTML)
  cleanup()
  return out
}

/** `prefers-reduced-motion: reduce` on or off (jsdom has no matchMedia). */
const systemMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') ? reduce : false, media: q, addEventListener() {}, removeEventListener() {} }))

/** Fake Web Animations (jsdom does not have them): records every call to `element.animate`. */
function fakeAnimations() {
  const calls: { el: Element; duration: number }[] = []
  const original = Element.prototype.animate
  Element.prototype.animate = function (this: Element, _k: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions) {
    calls.push({ el: this, duration: typeof o === 'number' ? o : Number(o?.duration) })
    return {} as Animation
  } as Element['animate']
  return { calls, restore: () => void (Element.prototype.animate = original) }
}

afterEach(() => vi.unstubAllGlobals())

describe('without animations the DOM is the same as today', () => {
  // The worst case: Motion already loaded and no system preference. Without `animated` nothing must change.
  beforeEach(async () => {
    await preloadMotion()
    systemMotion(false)
  })
  for (const [name, sample] of Object.entries(cases)) {
    test(name, async () => {
      expect(await html(sample({}))).toMatchSnapshot()
    })
  }
})

// --- The three rules: off = today's DOM; prefers-reduced-motion = nothing moves; on = under 250 ms. ---


describe('rule 1: without the setting nothing changes', () => {
  for (const [name, sample] of Object.entries(cases)) {
    test(`${name}: animated={false} and absent give the same DOM`, async () => {
      systemMotion(false)
      expect(await html(sample({ animated: false }))).toBe(await html(sample({})))
    })
  }
})

describe('rule 2: with prefers-reduced-motion nothing animates, even with the setting on', () => {
  beforeEach(async () => {
    await preloadMotion()
    systemMotion(true)
  })
  for (const [name, sample] of Object.entries(cases)) {
    test(`${name}: same DOM as when it is off`, async () => {
      expect(await html(sample({ animated: true }))).toBe(await html(sample({})))
    })
  }
  test('Toasts: a removed notice disappears at once', async () => {
    const { rerender } = render(<Toasts inline animated items={[{ id: 'x', text: 'Done' }]} />)
    await settle()
    expect(screen.queryByText('Done')).not.toBeNull()
    rerender(<Toasts inline animated items={[]} />)
    // Hidden in the same render; out of the DOM as soon as Ark's store has acted (a microtask: no frame in between).
    expect(screen.getByText('Done').closest('[hidden]')).not.toBeNull()
    await settle()
    expect(screen.queryByText('Done')).toBeNull()
  })
})

describe('rule 3: setting on and no system preference: it animates, in under 250 ms', () => {
  beforeEach(async () => {
    await preloadMotion()
    systemMotion(false)
  })
  test('the declared durations are all under 250 ms, and they are the ones Motion receives', async () => {
    const { DURATION_MS, ROW_EXIT } = await import('../src/internal/motion-impl')
    for (const [k, ms] of Object.entries(DURATION_MS)) expect(ms, k).toBeLessThan(250)
    // The duration in seconds of each animation (read from JSON: writing the property name here would make Tailwind,
    // which also scans `test/`, generate a CSS class with motion).
    const seconds = (animation: object) => Number(/"duration":([0-9.]+)/.exec(JSON.stringify(animation))![1])
    expect(seconds(ROW_EXIT) * 1000).toBeCloseTo(DURATION_MS.row, 6)
  })
  test('the column of notices moves with the list transition, over before a leaving notice leaves the DOM', async () => {
    const { DURATION_MS, GESTURE_MS, MOTION, NOTICES } = await import('../src/internal/motion-impl')
    expect(NOTICES.transition).toEqual(MOTION.list)
    expect(DURATION_MS.toast).toBeLessThan(250)
    expect(GESTURE_MS.list).toBeLessThanOrEqual(DURATION_MS.toast)
  })
  test('every gesture is a short decelerating tween: under 250 ms, never a spring, never repeated', async () => {
    const { EASE_OUT, GESTURE_MS, LIST_ITEM, MOTION } = await import('../src/internal/motion-impl')
    for (const [name, ms] of Object.entries(GESTURE_MS)) expect(ms, name).toBeLessThan(250)
    for (const [name, transition] of Object.entries(MOTION)) {
      expect(transition.ease, name).toEqual(EASE_OUT)
      expect(transition.duration * 1000, name).toBeCloseTo(GESTURE_MS[name as keyof typeof GESTURE_MS], 6)
      expect(JSON.stringify(transition), name).not.toMatch(/repeat|spring|stiffness/)
    }
    // Fast start, soft landing: the curve never overshoots its end.
    expect(EASE_OUT.every((v) => v >= 0 && v <= 1)).toBe(true)
    expect(LIST_ITEM.transition).toMatchObject(MOTION.list)
  })
  // No test measures real time (neither a millisecond ceiling nor a fake clock: Motion's frame loop runs on jsdom's
  // real timers and a fake clock leaves it half done). The order of events is tested, which does not depend on how
  // loaded the machine is; the 250 ms are in the declared durations above, which are the ones Motion receives.
  test('Toasts: the removed notice leaves animated: it stays in the DOM during the exit and then disappears', async () => {
    const { rerender } = render(<Toasts inline animated items={[{ id: 'x', text: 'Done' }]} />)
    await settle()
    rerender(<Toasts inline animated items={[]} />)
    await settle()
    expect(screen.queryByText('Done')).not.toBeNull() // the exit is in progress
    await waitFor(() => expect(screen.queryByText('Done')).toBeNull(), { timeout: 3000, interval: 5 })
  })
  test('a list item slides into place: `layout` with the list transition; it comes down 8px and leaves giving a little', async () => {
    const { LIST_ITEM, MOTION } = await import('../src/internal/motion-impl')
    expect(LIST_ITEM.transition.layout).toEqual(MOTION.list)
    expect(LIST_ITEM.initial).toEqual({ opacity: 0, y: -8 })
    expect(LIST_ITEM.exit).toEqual({ opacity: 0, scale: 0.98 })
  })
  test('Toasts: a leaving notice can no longer be clicked, “Undo” with a double click fires only once', async () => {
    const onUndo = vi.fn()
    function Host() {
      const [items, setItems] = useState<{ id: string; text: string; undo: { onClick: () => void } }[]>([
        {
          id: 'x',
          text: 'Done',
          undo: {
            onClick: () => {
              onUndo()
              setItems([])
            },
          },
        },
      ])
      return <Toasts inline animated items={items} />
    }
    render(<Host />)
    await settle()
    const undoButton = screen.getByRole('button', { name: 'Undo' })
    fireEvent.click(undoButton)
    expect(screen.queryByText('Done')).not.toBeNull() // the exit is in progress: the button is still in the DOM
    fireEvent.click(undoButton)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(undoButton.closest('[inert]')).not.toBeNull() // and for the browser it is inert: neither pointer nor keyboard
  })
  test('Checkbox: the mark animates only after the user\'s click, under 250 ms', () => {
    const wa = fakeAnimations()
    try {
      render(<Checkbox animated defaultChecked aria-label="Already done" />)
      expect(wa.calls).toEqual([]) // already checked on mount: still
      render(<Checkbox animated aria-label="Complete" />)
      fireEvent.click(screen.getByRole('checkbox', { name: 'Complete' }))
      expect(wa.calls.length).toBe(1)
      expect(wa.calls[0]!.duration).toBeLessThan(250)
    } finally {
      wa.restore()
    }
  })
})
