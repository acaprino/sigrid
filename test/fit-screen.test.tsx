// A height is the host's, never a guess (docs/mobile.md, «Heights and orientation»): the height of what the person sees
// (`useAppHeight`, `--app-height`), the frame that is that tall and says how tall its bottom bar is (`AppShell`), and the
// page of exactly one screen whose body gives way (`Page fit`). jsdom lays nothing out: what is checked is the number
// measured, where it is written, and the classes that make the frame and the page take exactly that height. That they
// do is seen in a browser, on the showcase (Practices, «Phone layouts», the fit screen and its conditions).
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { APP_HEIGHT_VAR, AppShell, BOTTOM_BAR_ROOM_VAR, Page, SHORT, Toolbar, ToolbarTab, ToolbarTabs, useAppHeight } from '../src'
import { classes, noop } from './helpers'

const root = document.documentElement
const read = (name = APP_HEIGHT_VAR) => root.style.getPropertyValue(name)

/** A `requestAnimationFrame` that waits to be told: many events in one frame must be one write. */
let frames: FrameRequestCallback[] = []
const flush = () => frames.splice(0).forEach((f) => f(0))
beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f))
  vi.stubGlobal('cancelAnimationFrame', noop)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  root.style.removeProperty(APP_HEIGHT_VAR)
  root.style.removeProperty(BOTTOM_BAR_ROOM_VAR)
})

/** A `visualViewport` that can be moved: `listeners` are what the page subscribed to. */
function visualViewport(height: number, scale = 1) {
  const listeners: Record<string, () => void> = {}
  const view = {
    height,
    scale,
    addEventListener: (type: string, f: () => void) => (listeners[type] = f),
    removeEventListener: (type: string) => delete listeners[type],
  }
  vi.stubGlobal('visualViewport', view)
  return { view, fire: (type: string) => listeners[type]?.(), listeners }
}
function Probe({ on }: { on?: boolean }) {
  useAppHeight(on)
  return null
}

describe('the height of what the person sees', () => {
  test('it is what the browser says is visible, written at once as pixels on the root, and taken off when the page stops', () => {
    visualViewport(741.4)
    const { unmount } = render(<Probe />)
    expect(read()).toBe('741px')
    unmount()
    expect(read()).toBe('')
  })

  test('a pinched-in page is measured in layout pixels: the visible height times the scale', () => {
    visualViewport(370, 2)
    render(<Probe />)
    expect(read()).toBe('740px')
  })

  test('it follows the bars sliding, the keyboard and a rotation, and a stream of events is one write', () => {
    const view = visualViewport(741)
    render(<Probe />)
    view.view.height = 700
    view.fire('resize')
    view.fire('scroll')
    view.fire('resize')
    expect(frames).toHaveLength(1)
    expect(read()).toBe('741px')
    flush()
    expect(read()).toBe('700px')
    // The keyboard opens.
    view.view.height = 441
    view.fire('resize')
    flush()
    expect(read()).toBe('441px')
  })

  test('without a visualViewport the window\'s own height is used, and a window resize is followed', () => {
    vi.stubGlobal('visualViewport', undefined)
    vi.stubGlobal('innerHeight', 600)
    render(<Probe />)
    expect(read()).toBe('600px')
    vi.stubGlobal('innerHeight', 520)
    fireEvent(window, new Event('resize'))
    flush()
    expect(read()).toBe('520px')
  })

  test('off, it writes nothing and listens to nothing', () => {
    const view = visualViewport(741)
    render(<Probe on={false} />)
    expect(read()).toBe('')
    expect(Object.keys(view.listeners)).toEqual([])
  })

  test('many parts share one listener, and the height stays until the last of them stops', () => {
    const view = visualViewport(741)
    const first = render(<Probe />)
    const second = render(<Probe />)
    expect(Object.keys(view.listeners).sort()).toEqual(['resize', 'scroll'])
    first.unmount()
    expect(read()).toBe('741px')
    second.unmount()
    expect(read()).toBe('')
    expect(Object.keys(view.listeners)).toEqual([])
  })
})

/** The frame and its foot laid out: the frame `frame` px tall, the bottom bar `bar` px tall, other parts as named. */
function layOut(frame: number, bar: number, others: Record<string, number> = {}) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.dataset['slot'] === 'app-shell' ? frame : 0
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) } as DOMRect
  })
  const heights: Record<string, number> = { 'app-shell-bottom': bar, ...others }
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return heights[this.dataset['slot'] ?? ''] ?? 0
  })
}

function Frame({ children }: { children?: ReactNode }) {
  return (
    <AppShell
      contentLabel="Today"
      bottomBar={
        <Toolbar aria-label="Views">
          <ToolbarTabs aria-label="Views" value="a" onValueChange={noop} edge="top" layout="stacked">
            <ToolbarTab value="a" icon={<svg />}>Today</ToolbarTab>
            <ToolbarTab value="b" icon={<svg />}>Board</ToolbarTab>
          </ToolbarTabs>
        </Toolbar>
      }
    >
      {children}
    </AppShell>
  )
}
const frame = () => document.querySelector<HTMLElement>('[data-slot="app-shell"]')!
const bar = () => document.querySelector<HTMLElement>('[data-slot="app-shell-bottom"]')!

describe('the frame is as tall as what is seen, and says how tall its bottom bar is', () => {
  test('it is --app-height tall and never taller than its box, and it keeps the height up to date itself', () => {
    visualViewport(741)
    render(<Frame />)
    expect(classes(frame())).toEqual(expect.arrayContaining(['h-(--app-height)', 'max-h-full']))
    expect(classes(frame())).not.toContain('h-full')
    expect(read()).toBe('741px')
  })

  test('the whole screen: it keeps clear of the edges and writes its bar\'s height to --bottom-bar-room, until it goes', () => {
    visualViewport(741)
    layOut(741, 49)
    const { unmount } = render(<Frame />)
    expect(frame().hasAttribute('data-screen')).toBe(true)
    expect(bar().hasAttribute('data-screen')).toBe(true)
    expect(read(BOTTOM_BAR_ROOM_VAR)).toBe('49px')
    expect(classes(frame())).toEqual(expect.arrayContaining(['data-screen:pt-(--safe-area-inset-top)', 'data-screen:ps-(--safe-area-inset-left)', 'data-screen:pe-(--safe-area-inset-right)']))
    // The bar keeps clear of the gesture bar with the MAXIMUM inset (it does not change while the page scrolls), and
    // the frame then does not pad its own foot a second time.
    expect(classes(bar())).toContain('data-screen:pb-(--safe-area-max-inset-bottom)')
    expect(classes(frame())).not.toContain('data-screen:pb-(--safe-area-max-inset-bottom)')
    expect(bar().className).not.toMatch(/env\(safe-area-inset-bottom/)
    unmount()
    expect(read(BOTTOM_BAR_ROOM_VAR)).toBe('')
  })

  test('the room is all that the frame keeps at its foot: the actions and the footer above the bottom bar', () => {
    visualViewport(741)
    layOut(741, 49, { 'app-shell-actions': 53, 'app-shell-footer': 29 })
    render(
      <AppShell contentLabel="Sort" actions={<button type="button">Looks good</button>} footer={<span>Saved</span>} bottomBar={<span>Views</span>}>
        Text
      </AppShell>,
    )
    expect(read(BOTTOM_BAR_ROOM_VAR)).toBe('131px')
  })

  test('a frame in a box of the app\'s (not the whole screen) pads nothing and writes no room', () => {
    visualViewport(741)
    layOut(480, 49)
    render(<Frame />)
    expect(frame().hasAttribute('data-screen')).toBe(false)
    expect(read(BOTTOM_BAR_ROOM_VAR)).toBe('')
  })

  test('without a bottom bar the frame keeps its own foot clear of the gesture bar, and writes no room', () => {
    visualViewport(741)
    layOut(741, 0)
    render(<AppShell contentLabel="Today">Text</AppShell>)
    expect(classes(frame())).toContain('data-screen:pb-(--safe-area-max-inset-bottom)')
    expect(read(BOTTOM_BAR_ROOM_VAR)).toBe('')
  })

  test('a short window (a phone lying down) keeps the bar at 44px and puts each view\'s word beside its icon', () => {
    render(<Frame />)
    expect(SHORT).toBe('(height < 500px)')
    expect(classes(bar())).toEqual(expect.arrayContaining(['min-h-12', 'short:min-h-11']))
    expect(classes(screen.getByRole('button', { name: 'Today' }))).toEqual(expect.arrayContaining(['flex-col', 'short:flex-row']))
  })

  test('without ResizeObserver or visualViewport nothing throws: the frame is still --app-height tall', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    vi.stubGlobal('visualViewport', undefined)
    expect(() => render(<Frame />)).not.toThrow()
    expect(classes(frame())).toContain('h-(--app-height)')
  })
})

const page = () => document.querySelector<HTMLElement>('[data-slot="page"]')!
const part = (slot: string) => document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!

describe('a page of exactly one screen (`Page fit`)', () => {
  const fit = (
    <Page fit aria-label="Sort" header={<p>1 of 12</p>} footer={<button type="button">Looks good</button>}>
      <p>The item</p>
    </Page>
  )

  test('outside a frame it is as tall as what is seen less the bottom bar\'s room; the body gives way, the head and the foot do not', () => {
    render(fit)
    expect(page().getAttribute('data-fit')).toBe('')
    expect(classes(page())).toEqual(expect.arrayContaining(['h-(--fit-height)', 'flex', 'flex-col']))
    expect(classes(part('page-body'))).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain']))
    expect(classes(part('page-header'))).toContain('shrink-0')
    expect(classes(part('page-footer'))).toContain('shrink-0')
    // In this order: the head, the body, the foot.
    expect(Array.from(page().children).map((el) => el.getAttribute('data-slot'))).toEqual(['page-header', 'page-body', 'page-footer'])
    expect(part('page-body').textContent).toBe('The item')
  })

  test('in a frame it is as tall as the frame\'s content: the frame has already taken its bars away', () => {
    render(<Frame>{fit}</Frame>)
    expect(classes(page())).toContain('h-full')
    expect(classes(page())).not.toContain('h-(--fit-height)')
  })

  test('the head stays where it is when a page turns to fit, and a page that does not fit is as it was', () => {
    const { rerender } = render(<Page header={<p>1 of 12</p>}>x</Page>)
    expect(page().hasAttribute('data-fit')).toBe(false)
    expect(classes(page())).toEqual(expect.arrayContaining(['p-6', 'gap-6', 'max-w-(--content-max)']))
    expect(page().firstElementChild!.textContent).toBe('1 of 12')
    rerender(fit)
    // The same margins: what is at the head does not move.
    expect(classes(page())).toContain('p-6')
  })
})
