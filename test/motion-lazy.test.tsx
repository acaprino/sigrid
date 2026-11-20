// The Motion chunk (`motion-impl`) loads only when needed, breaks nothing if it does not arrive, and the components do not
// each subscribe a `matchMedia` listener. Every test starts from fresh modules (`vi.resetModules`): the chunk is
// not already loaded by another test, and `loads` counts how many times it was really requested.
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const noop = () => {}
let loads = 0
let failures = 0

beforeEach(() => {
  vi.resetModules()
  loads = 0
  failures = 0
  vi.doMock('../src/internal/motion-impl', async () => {
    loads++
    if (failures > 0) {
      failures--
      throw new Error('chunk unreachable')
    }
    return await vi.importActual('../src/internal/motion-impl')
  })
})

afterEach(() => {
  vi.doUnmock('../src/internal/motion-impl')
  vi.unstubAllGlobals()
})

/** A fake `matchMedia` with a single `MediaQueryList`, and the counters of who creates it and who listens to it. */
function fakeMatchMedia(reduce = false) {
  const query = { matches: reduce, media: '', addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const matchMedia = vi.fn(() => query)
  vi.stubGlobal('matchMedia', matchMedia)
  return { query, matchMedia }
}

/** After mounting, lets effects and microtasks pass: a load that was never requested stays never requested. */
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 25))))

async function loadModules() {
  const { Checkbox } = await import('../src/components/ui/checkbox')
  const { Toasts } = await import('../src/components/Toasts')
  const motion = await import('../src/internal/motion')
  return { Checkbox, Toasts, ...motion }
}


describe('with animations off the chunk does not reach the browser', () => {
  test('without `animated`, or with `animated` false, the chunk is never loaded and nobody reads matchMedia', async () => {
    const media = fakeMatchMedia(false)
    const { Checkbox, Toasts } = await loadModules()
    render(
      <>
        {Array.from({ length: 30 }, (_, i) => (
          <Checkbox key={i} aria-label={`Row ${i}`} animated={i % 2 === 0 ? false : undefined} />
        ))}
        <Toasts inline items={[{ id: 'x', text: 'Done' }]} />
        <Toasts inline animated={false} items={[{ id: 'y', text: 'Moved' }]} />
      </>,
    )
    await settle()
    expect(loads).toBe(0)
    // Off = zero cost: nobody asks for prefers-reduced-motion, not even a `MediaQueryList` per Checkbox.
    expect(media.matchMedia).not.toHaveBeenCalled()
  })

  test('positive control: with `animated` the chunk is loaded, only once', async () => {
    fakeMatchMedia(false)
    const { Checkbox, Toasts } = await loadModules()
    render(
      <>
        <Checkbox animated aria-label="A" />
        <Toasts inline animated items={[{ id: 'x', text: 'Done' }]} />
      </>,
    )
    await waitFor(() => expect(loads).toBe(1))
    await settle()
    expect(loads).toBe(1)
  })

  test('with `animated` but `prefers-reduced-motion` on, the chunk is not loaded', async () => {
    fakeMatchMedia(true)
    const { Checkbox, Toasts } = await loadModules()
    render(
      <>
        <Checkbox animated aria-label="A" />
        <Toasts inline animated items={[{ id: 'x', text: 'Done' }]} />
      </>,
    )
    await settle()
    expect(loads).toBe(0)
  })
})

describe('a single matchMedia listener for all the components that animate', () => {
  test('thirty animated Checkboxes: one `MediaQueryList`, one listener, removed when the last one unmounts', async () => {
    const media = fakeMatchMedia(false)
    const { Checkbox } = await loadModules()
    const { unmount } = render(
      <>
        {Array.from({ length: 30 }, (_, i) => (
          <Checkbox key={i} animated aria-label={`Row ${i}`} />
        ))}
      </>,
    )
    await waitFor(() => expect(loads).toBe(1))
    expect(media.matchMedia).toHaveBeenCalledTimes(1)
    expect(media.query.addEventListener).toHaveBeenCalledTimes(1)
    expect(media.query.removeEventListener).not.toHaveBeenCalled()
    unmount()
    expect(media.query.removeEventListener).toHaveBeenCalledTimes(1)
  })

})

describe('if the chunk does not arrive', () => {

  test('the failed attempt is not kept in memory: the next use retries and this time it arrives', async () => {
    failures = 1
    fakeMatchMedia(false)
    const { loadMotion } = await loadModules()
    expect(await loadMotion()).toBeNull() // resolves, does not reject
    expect(loads).toBe(1)
    const impl = await loadMotion()
    expect(impl).not.toBeNull()
    expect(loads).toBe(2)
    expect(await loadMotion()).toBe(impl) // then only once
    expect(loads).toBe(2)
  })

  test('preloadMotion (the client function) says false if the chunk does not arrive, without rejecting, and true on the next attempt', async () => {
    failures = 1
    fakeMatchMedia(false)
    const { preloadMotion } = await loadModules()
    expect(await preloadMotion()).toBe(false)
    expect(await preloadMotion()).toBe(true)
    expect(await preloadMotion()).toBe(true)
    expect(loads).toBe(2)
  })
})
