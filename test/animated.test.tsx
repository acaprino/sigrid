// Optional animations (only as a response to a gesture, off by default, never with prefers-reduced-motion).
// The snapshots in this file pin the DOM without `animated` of the toolkit's animated primitives (the one from before
// the animations, plus the later fixes: ARIA attributes of the notices). An app's components are pinned in its own package. The `useId` ids are
// numbered in the order they appear (`stripIds`): they do not depend on the React format or on the cases rendered before.
import { DEFAULT_MOTION_FEEL, applyMotionFeel } from '../src'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Checkbox } from '../src/primitives'
import { Toasts } from '../src/components'
import { preloadMotion, useEntrance } from '../src/internal/motion'
import { noop, settle, systemMotion } from './helpers'

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

// `settle()`: Ark's machines (the notices, the date field, the labels, the upload zone) act in a microtask after the render.
export const html = async (el: ReactElement) => {
  const { baseElement } = render(el)
  await settle()
  const out = stripIds(baseElement.innerHTML)
  cleanup()
  return out
}

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
  /** The curve as a function of time: the progress (0..1) at `t` (0..1) of a cubic Bézier through the four values. */
  const progress = ([x1, y1, x2, y2]: readonly number[], t: number) => {
    const at = (a: number, b: number, u: number) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u
    let low = 0
    let high = 1
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2
      if (at(x1!, x2!, mid) < t) low = mid
      else high = mid
    }
    return at(y1!, y2!, low)
  }
  // The duration in seconds of each animation (read from JSON: writing the property name here would make Tailwind,
  // which also scans `test/`, generate a CSS class with motion).
  const seconds = (animation: object) => Number(/"duration":([0-9.]+)/.exec(JSON.stringify(animation))![1])
  test('every declared duration is one of Fluent\'s, under 250 ms, and it is the one Motion receives', async () => {
    const { CARD_DURATION_MS, DURATION_MS, FLUENT_DURATIONS, GESTURE_MS, ROW_EXIT } = await import('../src/internal/motion-impl')
    const tokens: number[] = Object.values(FLUENT_DURATIONS)
    const all = { ...DURATION_MS, ...GESTURE_MS, card: CARD_DURATION_MS }
    for (const [name, ms] of Object.entries(all)) {
      expect(ms, name).toBeLessThan(250)
      // No duration is a one-off: each is a token of the scale.
      expect(tokens, name).toContain(ms)
    }
    expect(seconds(ROW_EXIT) * 1000).toBeCloseTo(DURATION_MS.row, 6)
  })
  test('the notices that stay move with the list transition; one that leaves is gone before it leaves the DOM', async () => {
    const { DURATION_MS, GESTURE_MS, MOTION, NOTICES } = await import('../src/internal/motion-impl')
    expect(NOTICES.transition).toEqual(MOTION.list)
    expect(NOTICES.entering).toEqual(MOTION.enter)
    expect(NOTICES.leaving).toEqual(MOTION.leave)
    expect(DURATION_MS.toast).toBeLessThan(250)
    expect(GESTURE_MS.leave).toBeLessThan(DURATION_MS.toast)
  })
  test('what enters decelerates, what leaves accelerates, what moves in place eases at both ends', async () => {
    const { FLUENT_CURVES, GESTURE_MS, LIST_ITEM, MOTION, ROW_EXIT } = await import('../src/internal/motion-impl')
    const kinds = {
      enter: ['enter', 'press', 'release'],
      leave: ['leave'],
      move: ['list', 'slide', 'follow', 'turn'],
    } as const
    // Every transition is of one kind, and takes its duration from the declared gestures.
    expect(Object.keys(MOTION).sort()).toEqual(Object.values(kinds).flat().sort())
    for (const [name, transition] of Object.entries(MOTION)) {
      expect(transition.duration * 1000, name).toBeCloseTo(GESTURE_MS[name as keyof typeof GESTURE_MS], 6)
      expect(JSON.stringify(transition), name).not.toMatch(/repeat|spring|stiffness/)
    }
    for (const name of kinds.enter) expect(MOTION[name].ease, name).toEqual(FLUENT_CURVES.decelerateMid)
    for (const name of kinds.leave) expect(MOTION[name].ease, name).toEqual(FLUENT_CURVES.accelerateMin)
    for (const name of kinds.move) expect(MOTION[name].ease, name).toEqual(FLUENT_CURVES.easyEase)
    // The shape of each curve, whatever its numbers: where it is at the middle of its time, and that it never goes
    // back or past its end.
    const half = (curve: readonly number[]) => progress(curve, 0.5)
    expect(half(FLUENT_CURVES.decelerateMid)).toBeGreaterThan(0.75) // most of the way early, then it settles
    expect(half(FLUENT_CURVES.accelerateMin)).toBeLessThan(0.25) // hardly moved yet, then it is gone
    expect(half(FLUENT_CURVES.easyEase)).toBeCloseTo(0.5, 2) // the same at both ends
    expect(progress(FLUENT_CURVES.easyEase, 0.1)).toBeLessThan(0.1) // a gentle start
    expect(progress(FLUENT_CURVES.easyEase, 0.9)).toBeGreaterThan(0.9) // a gentle end
    for (const [name, curve] of Object.entries(FLUENT_CURVES)) {
      expect(curve.every((v) => v >= 0 && v <= 1), name).toBe(true)
      let before = 0
      for (let t = 0.05; t < 1; t += 0.05) {
        const now = progress(curve, t)
        expect(now, `${name} at ${t}`).toBeGreaterThanOrEqual(before)
        expect(now, `${name} at ${t}`).toBeLessThanOrEqual(1)
        before = now
      }
    }
    // A list: the new item enters, the others make room as a movement in place.
    expect(LIST_ITEM.transition).toMatchObject(MOTION.enter)
    expect(LIST_ITEM.transition.layout).toEqual(MOTION.list)
    // A row that closes up: the row leaves (its fade accelerates), the room it took closes as a movement in place.
    expect(ROW_EXIT.transition.ease).toEqual(FLUENT_CURVES.easyEase)
    expect(ROW_EXIT.transition.opacity.ease).toEqual(FLUENT_CURVES.accelerateMin)
  })
  test('what goes down under the finger is not slower than what comes back, nor that than what travels together', async () => {
    const { GESTURE_MS } = await import('../src/internal/motion-impl')
    expect(GESTURE_MS.press).toBeLessThan(GESTURE_MS.release)
    expect(GESTURE_MS.release).toBeLessThanOrEqual(GESTURE_MS.slide)
    expect(GESTURE_MS.slide).toBeLessThan(GESTURE_MS.list)
    // What leaves a list is gone before the others have closed up over its place.
    expect(GESTURE_MS.leave).toBeLessThan(GESTURE_MS.list)
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
  test('a list item slides into place: `layout` with the list transition; it comes down a little and leaves with a quick fade', async () => {
    const { LIST_ITEM, MOTION, TRAVEL_PX } = await import('../src/internal/motion-impl')
    expect(LIST_ITEM.transition.layout).toEqual(MOTION.list)
    expect(LIST_ITEM.initial).toEqual({ opacity: 0, y: -TRAVEL_PX.row })
    expect(LIST_ITEM.exit).toEqual({ opacity: 0, transition: MOTION.leave })
    // In the plane: a list item is never resized on its way in or out.
    expect(JSON.stringify(LIST_ITEM)).not.toMatch(/scale/)
  })
  test('what opens enters once, from the side it was placed on, and ends on its own style', async () => {
    const { CARD_DURATION_MS, FLUENT_CURVES, GESTURE_MS, TRAVEL_PX, enterPopup, enterTooltip, enterSheet, landCard, popCheck } = await import('../src/internal/motion-impl')
    // Fluent's own curves and times are what this pins: the `fluent` feel, at the toolkit's pace.
    applyMotionFeel({ ease: 'fluent', pace: 1 })
    type Call = { el: Element; keyframes: Record<string, string[]>; options: KeyframeAnimationOptions }
    const calls: Call[] = []
    const original = Element.prototype.animate
    Element.prototype.animate = function (this: Element, keyframes: Record<string, string[]>, options: KeyframeAnimationOptions) {
      calls.push({ el: this, keyframes, options })
      return { cancel: vi.fn() } as unknown as Animation
    } as Element['animate']
    const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()))
    /** A surface in its positioner, in the page; the side is written where each positioning library writes it. */
    const at = (side: string | null, attribute = 'data-side') => {
      const positioner = document.body.appendChild(document.createElement('div'))
      const el = positioner.appendChild(document.createElement('div'))
      if (side) (attribute === 'data-side' ? el : positioner).setAttribute(attribute, side)
      return el
    }
    const track = (el: Element, property: string) => calls.find(c => c.el === el && property in c.keyframes)
    const start = (el: Element) => track(el, 'translate')?.keyframes['translate']?.[0]
    try {
      const flipped = at('bottom')
      enterPopup(flipped)
      expect(track(flipped, 'opacity')?.keyframes).toEqual({ opacity: ['0', ''] })
      expect(start(flipped)).toBeUndefined()
      flipped.setAttribute('data-side', 'top')
      await frame()
      expect(start(flipped)).toBe(`0px ${TRAVEL_PX.card}px`)
      expect(track(flipped, 'translate')!.options.duration).toBe(CARD_DURATION_MS)
      // A side that is not there yet when it mounts (the other library writes it on the positioner, later).
      const late = at(null)
      enterPopup(late)
      late.parentElement!.setAttribute('data-placement', 'bottom-start')
      // Below its button it comes down from it, above it comes up; beside it, from that side.
      const right = at('right')
      enterPopup(right)
      const hint = at('left')
      enterTooltip(hint)
      // With its anchor given the side is measured, whatever the attribute says: this library writes it a few frames
      // late and keeps the one of the last opening until then. Here it still says below, and the card is above.
      const rect = (top: number, bottom: number) => () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) })
      const stale = at('bottom-start', 'data-placement')
      const field = document.body.appendChild(document.createElement('div'))
      field.getBoundingClientRect = rect(400, 440)
      stale.getBoundingClientRect = rect(96, 396)
      enterPopup(stale, field)
      // An anchor that is not laid out tells nothing: the attribute is read.
      const unplaced = at('top')
      enterPopup(unplaced, document.body.appendChild(document.createElement('div')))
      // A logical side follows the direction of the text.
      const logical = at('inline-start')
      enterPopup(logical)
      const logicalRtl = at('inline-start')
      logicalRtl.style.direction = 'rtl'
      enterPopup(logicalRtl)
      const logicalEnd = at('inline-end')
      enterPopup(logicalEnd)
      // With no side known it does not guess: it only fades.
      const nowhere = at(null)
      enterTooltip(nowhere)
      // Closed before the frame: nothing is played on what is gone.
      const gone = at('bottom')
      enterPopup(gone)
      gone.parentElement!.remove()
      await frame()
      expect(start(late)).toBe(`0px -${TRAVEL_PX.card}px`)
      expect(start(right)).toBe(`-${TRAVEL_PX.card}px 0px`)
      expect(start(hint)).toBe(`${TRAVEL_PX.hint}px 0px`)
      expect(track(hint, 'translate')!.options.duration).toBe(GESTURE_MS.tooltip)
      expect(start(logical)).toBe(`${TRAVEL_PX.card}px 0px`)
      expect(start(logicalRtl)).toBe(`-${TRAVEL_PX.card}px 0px`)
      expect(start(logicalEnd)).toBe(`-${TRAVEL_PX.card}px 0px`)
      expect(start(stale)).toBe(`0px ${TRAVEL_PX.card}px`)
      expect(start(unplaced)).toBe(`0px ${TRAVEL_PX.card}px`)
      expect(start(nowhere)).toBeUndefined()
      expect(track(nowhere, 'opacity')).toBeDefined()
      expect(start(gone)).toBeUndefined()
      for (const [side, offset] of [['left', '-32px 0px'], ['right', '32px 0px'], ['top', '0px -32px'], ['bottom', '0px 32px']] as const) {
        const panel = at(null)
        enterSheet(panel, side)
        expect(start(panel)).toBe(offset)
        expect(track(panel, 'transform')).toBeUndefined() // the primitive owns the swipe transform
      }
      const card = at(null)
      card.style.opacity = '0.7'
      landCard(card)
      expect(track(card, 'opacity')?.keyframes).toEqual({ opacity: ['0', '0.7'] })
      expect(start(card)).toBe(`0px -${TRAVEL_PX.card}px`)
      const mark = at(null)
      popCheck(mark)
      expect(track(mark, 'scale')?.keyframes).toEqual({ scale: ['0.5', ''] })
      expect(calls.filter(c => c.keyframes['scale'])).toHaveLength(1)
      for (const { options } of calls) {
        expect(String(options.easing).replace(/\s/g, '')).toBe(`cubic-bezier(${FLUENT_CURVES.decelerateMid.join(',')})`)
        expect(options.iterations).toBe(1)
        expect(Number(options.duration)).toBeLessThan(250)
      }
    } finally {
      applyMotionFeel(DEFAULT_MOTION_FEEL)
      Element.prototype.animate = original
      document.body.replaceChildren()
    }
  })
  test('the further a surface travels the larger it is: all on the 4px grid, none across the screen', async () => {
    const { TRAVEL_PX } = await import('../src/internal/motion-impl')
    for (const [name, px] of Object.entries(TRAVEL_PX)) {
      expect(px % 4, name).toBe(0)
      expect(px, name).toBeLessThanOrEqual(32)
    }
    expect(TRAVEL_PX.hint).toBeLessThan(TRAVEL_PX.card)
    expect(TRAVEL_PX.card).toBeLessThan(TRAVEL_PX.notice)
    expect(TRAVEL_PX.notice).toBeLessThan(TRAVEL_PX.sheet)
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
      expect(wa.calls.length).toBe(2)
      expect(wa.calls[0]!.duration).toBeLessThan(250)
    } finally {
      wa.restore()
    }
  })
  test('an entrance is played once per opening: not again on a render, a new `ref`, or when Motion comes with it open', () => {
    const enter = vi.fn()
    function Surface({ animated, open }: { animated: boolean; open: boolean }) {
      const entered = useEntrance<HTMLDivElement>(animated, (_motion, el) => enter(el))
      // A caller's `ref` that is a new function at every render, as an inline one is.
      return open ? <div data-testid="surface" ref={(el) => entered(el)} /> : null
    }
    // Open before animations are on (the Motion chunk not asked for yet): it is simply there.
    const { rerender } = render(<Surface animated={false} open />)
    expect(enter).not.toHaveBeenCalled()
    // Animations turned on, renders, new refs: it is already open and must not move.
    rerender(<Surface animated open />)
    rerender(<Surface animated open />)
    expect(enter).not.toHaveBeenCalled()
    // Closed and opened again: the gesture. Once.
    rerender(<Surface animated open={false} />)
    rerender(<Surface animated open />)
    expect(enter).toHaveBeenCalledTimes(1)
    expect(enter).toHaveBeenLastCalledWith(screen.getByTestId('surface'))
    rerender(<Surface animated open />)
    expect(enter).toHaveBeenCalledTimes(1)
  })
})

describe('state changes ease only where motion is on', () => {
  test('MotionProvider marks the document root while motion is on, and only then; two providers share the mark', async () => {
    const { render: mount } = await import('@testing-library/react')
    const { MotionProvider } = await import('../src')
    const root = document.documentElement
    expect(root.hasAttribute('data-motion')).toBe(false)
    const off = mount(<MotionProvider animated={false}><p>x</p></MotionProvider>)
    expect(root.hasAttribute('data-motion')).toBe(false)
    off.unmount()
    const a = mount(<MotionProvider animated><p>a</p></MotionProvider>)
    const b = mount(<MotionProvider animated><p>b</p></MotionProvider>)
    expect(root.hasAttribute('data-motion')).toBe(true)
    a.unmount()
    expect(root.hasAttribute('data-motion')).toBe(true)
    b.rerender(<MotionProvider animated={false}><p>b</p></MotionProvider>)
    expect(root.hasAttribute('data-motion')).toBe(false)
    b.unmount()
  })

  test('the easing is in theme.css under that mark, inside the reduced-motion guard, for colours only and in the time of a press', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(`${process.cwd()}/src/styles/theme.css`, 'utf8')
    const property = css.indexOf('transition-property: background-color, border-color, color;')
    expect(property).toBeGreaterThan(-1)
    const at = css.lastIndexOf(':where(:root[data-motion])', property)
    expect(at).toBeGreaterThan(-1)
    // Every rule that moves something is inside the one guard, which nothing closes before the last of them.
    const guard = css.lastIndexOf('@media (prefers-reduced-motion: no-preference) {', at)
    expect(guard).toBeGreaterThan(-1)
    expect(css.slice(guard, at)).not.toMatch(/^\}/m)
    const rule = css.slice(at, css.indexOf('}', at))
    expect(rule).toMatch(/transition-duration:\s*var\(--motion-faster\);/)
    expect(css).toMatch(/--motion-faster:\s*100ms;/)
    expect(rule).not.toMatch(/transform|opacity|outline|all/)
  })
})
