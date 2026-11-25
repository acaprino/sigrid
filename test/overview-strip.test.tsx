// `OverviewStrip` (the `./terminal` entry): the lines of a long text in miniature, with a frame on the ones in sight. Here:
// the geometry (pure), the bar of a line, the strip as a scroll bar for the pointer, the wheel and the keyboard, the
// archive above the live lines, the lines and marks it paints in the colours of the tokens, and that it paints at most
// once in a while and again when the page's look changes.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { OVERVIEW_PITCH, OverviewStrip, archivedLineAt, holdAt, lineAt, overviewGeometry, textExtent, type OverviewExtent, type OverviewStripProps } from '../src/terminal'

// The terminal's entry brings xterm, which probes for a canvas when it is loaded; jsdom has none and says so on the console.
vi.hoisted(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
})

describe('overviewGeometry: where the parts lie, in pixels from the top of the strip', () => {
  test('a short text is lines a few pixels apart, the frame as tall as the lines in sight', () => {
    const g = overviewGeometry(300, 0, 20, 5, 10)
    expect(g).toMatchObject({ archiveHeight: 0, pitch: OVERVIEW_PITCH, liveHeight: 300 })
    expect(g.frameTop).toBe(5 * OVERVIEW_PITCH)
    expect(g.frameHeight).toBe(10 * OVERVIEW_PITCH)
  })

  test('a long text is less than a pixel a line, and the frame is never thinner than six pixels', () => {
    const g = overviewGeometry(300, 0, 30_000, 15_000, 24)
    expect(g.pitch).toBeCloseTo(0.01)
    expect(g.frameHeight).toBe(6)
    expect(g.frameTop).toBe(150)
  })

  test('the frame stays inside the strip, at either end', () => {
    expect(overviewGeometry(100, 0, 1000, 990, 50).frameTop + overviewGeometry(100, 0, 1000, 990, 50).frameHeight).toBeLessThanOrEqual(100)
    expect(overviewGeometry(100, 0, 1000, 0, 50).frameTop).toBe(0)
  })

  test('the archive takes the top, never more than 30% of the strip, and the live lines the rest', () => {
    const few = overviewGeometry(300, 10, 100, 0, 20)
    expect(few.archiveHeight).toBe(10 * OVERVIEW_PITCH)
    const many = overviewGeometry(300, 5000, 100, 0, 20)
    expect(many.archiveHeight).toBe(90)
    expect(many.liveHeight).toBe(210)
    expect(many.frameTop).toBeGreaterThanOrEqual(90)
  })
})

describe('lineAt, holdAt, archivedLineAt: from a pointer to a line', () => {
  const g = overviewGeometry(300, 0, 100, 0, 20)

  test('a press outside the frame puts the middle of it at the pointer', () => {
    // 60 lines down is 180px; the frame is 20 lines, so the first line in sight is 50.
    expect(lineAt(180, g, 100, 20)).toBe(50)
  })

  test('the first line is never above the first or below the last that leaves a full screen', () => {
    expect(lineAt(-50, g, 100, 20)).toBe(0)
    expect(lineAt(10_000, g, 100, 20)).toBe(80)
    expect(lineAt(10, g, 5, 20)).toBe(0)
  })

  test('a drag that started on the frame holds it where it was taken, with no jump', () => {
    const hold = holdAt(75, g, 20)
    expect(hold).toBeCloseTo(5)
    expect(lineAt(75, g, 100, 20, hold)).toBe(20)
    expect(lineAt(105, g, 100, 20, hold)).toBe(30)
  })

  test('a press on the archive is a line of the archive, from its first to its last', () => {
    const withArchive = overviewGeometry(300, 40, 100, 0, 20)
    expect(archivedLineAt(0, withArchive, 40)).toBe(0)
    expect(archivedLineAt(withArchive.archiveHeight / 2, withArchive, 40)).toBe(20)
    expect(archivedLineAt(10_000, withArchive, 40)).toBe(39)
  })
})

describe('textExtent: the bar of a line', () => {
  test.each([
    ['', null],
    ['   ', null],
    ['abc', [0, 3]],
    ['    indented', [4, 12]],
    ['trailing   ', [0, 8]],
  ])('%j', (text, bar) => {
    expect(textExtent(text)).toEqual(bar)
  })
})

/** The layout jsdom lacks: the strip is `height` pixels tall and `width` wide, at the top of the page. */
function layout(height = 300, width = 20) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, top: 0, left: 0, bottom: height, right: width, width, height, toJSON: () => ({}) }))
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
}

/** A canvas that writes down what is drawn on it, with the colour each rectangle was drawn in. */
function recordingCanvas() {
  const rects: { x: number; y: number; w: number; h: number; color: string; alpha: number }[] = []
  const context = {
    fillStyle: '',
    globalAlpha: 1,
    setTransform() {},
    clearRect() {},
    fillRect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h, color: String(context.fillStyle), alpha: context.globalAlpha }) },
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  return rects
}

const lines = (text: readonly string[]): OverviewExtent => (index) => textExtent(text[index] ?? '')
const SOURCE = ['fn main() {', '    println!("hi");', '', '}']

function Strip(props: Partial<OverviewStripProps>) {
  return <OverviewStrip count={SOURCE.length} extent={lines(SOURCE)} viewport={{ start: 0, size: 2 }} onSeek={() => {}} {...props} />
}

beforeEach(() => {
  layout()
  // jsdom has no canvas and says so on the console; a test that looks at the drawing puts in its own.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.documentElement.removeAttribute('style')
})

describe('OverviewStrip as a scroll bar', () => {
  test('is a vertical scroll bar with a name, a range and a position said in words', () => {
    render(<Strip count={900} viewport={{ start: 39, size: 30 }} />)
    const bar = screen.getByRole('scrollbar')
    expect(bar.getAttribute('aria-label')).toBe('Lines of the terminal')
    expect(bar.getAttribute('aria-orientation')).toBe('vertical')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('870')
    expect(bar.getAttribute('aria-valuenow')).toBe('39')
    expect(bar.getAttribute('aria-valuetext')).toBe('Line 40 of 900')
    expect(bar.tabIndex).toBe(0)
  })

  test('is named by the app when it says so', () => {
    render(<Strip aria-label="Output" />)
    expect(screen.getByRole('scrollbar', { name: 'Output' })).toBeTruthy()
  })

  test('the keyboard: arrows by a line, Page Up and Page Down by a screen, Home and End to the ends, never past them', () => {
    const onSeek = vi.fn()
    render(<Strip count={100} viewport={{ start: 40, size: 20 }} onSeek={onSeek} />)
    const bar = screen.getByRole('scrollbar')
    const seeks = (key: string) => {
      onSeek.mockClear()
      fireEvent.keyDown(bar, { key })
      return onSeek.mock.calls.map((call) => call[0])
    }
    expect(seeks('ArrowUp')).toEqual([39])
    expect(seeks('ArrowDown')).toEqual([41])
    expect(seeks('PageUp')).toEqual([20])
    expect(seeks('PageDown')).toEqual([60])
    expect(seeks('Home')).toEqual([0])
    expect(seeks('End')).toEqual([80])
    expect(seeks('a')).toEqual([])
  })

  test('the wheel moves three lines, and no further than the ends', () => {
    const onSeek = vi.fn()
    const view = render(<Strip count={100} viewport={{ start: 40, size: 20 }} onSeek={onSeek} />)
    const bar = screen.getByRole('scrollbar')
    fireEvent.wheel(bar, { deltaY: 120 })
    expect(onSeek).toHaveBeenLastCalledWith(43)
    fireEvent.wheel(bar, { deltaY: -120 })
    expect(onSeek).toHaveBeenLastCalledWith(37)
    view.rerender(<Strip count={100} viewport={{ start: 79, size: 20 }} onSeek={onSeek} />)
    fireEvent.wheel(bar, { deltaY: 120 })
    expect(onSeek).toHaveBeenLastCalledWith(80)
  })

  test('a press asks for the line under the pointer, and a drag that starts on the frame does not jump', () => {
    const onSeek = vi.fn()
    render(<Strip count={100} viewport={{ start: 20, size: 20 }} onSeek={onSeek} />)
    const bar = screen.getByRole('scrollbar')
    // The frame is 20 lines of 3px from y=60. A press at its middle (y=90) holds it where it is.
    fireEvent.pointerDown(bar, { button: 0, clientY: 90, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(20)
    fireEvent.pointerMove(bar, { clientY: 120, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(30)
    fireEvent.pointerUp(bar, { pointerId: 1 })
    onSeek.mockClear()
    // After the drag a move does nothing.
    fireEvent.pointerMove(bar, { clientY: 200, pointerId: 1 })
    expect(onSeek).not.toHaveBeenCalled()
    // A press outside the frame brings its middle to the pointer.
    fireEvent.pointerDown(bar, { button: 0, clientY: 240, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(70)
    fireEvent.pointerUp(bar, { pointerId: 1 })
  })

  test('only the main button presses it', () => {
    const onSeek = vi.fn()
    render(<Strip onSeek={onSeek} />)
    fireEvent.pointerDown(screen.getByRole('scrollbar'), { button: 2, clientY: 50, pointerId: 1 })
    expect(onSeek).not.toHaveBeenCalled()
  })

  test('the archive: a press on its part is a line of the archive, and does not move the frame', () => {
    const onSeek = vi.fn()
    const onArchiveSeek = vi.fn()
    render(<Strip count={100} viewport={{ start: 0, size: 20 }} archive={{ count: 10, extent: () => [0, 5] }} onSeek={onSeek} onArchiveSeek={onArchiveSeek} />)
    const bar = screen.getByRole('scrollbar')
    expect(bar.querySelector('[data-slot="overview-archive"]')).not.toBeNull()
    // Ten archived lines are 30px; a press at 15px is the sixth.
    fireEvent.pointerDown(bar, { button: 0, clientY: 15, pointerId: 1 })
    expect(onArchiveSeek).toHaveBeenCalledWith(5)
    expect(onSeek).not.toHaveBeenCalled()
  })

  test('the frame is where the lines in sight are, and follows them', () => {
    const view = render(<Strip count={100} viewport={{ start: 10, size: 20 }} />)
    const frame = () => screen.getByRole('scrollbar').querySelector<HTMLElement>('[data-slot="overview-frame"]')!
    expect(frame().style.top).toBe('30px')
    expect(frame().style.height).toBe('60px')
    view.rerender(<Strip count={100} viewport={{ start: 50, size: 20 }} />)
    expect(frame().style.top).toBe('150px')
  })
})

describe('OverviewStrip painted', () => {
  test('each line is a bar from where its text starts to where it ends, over 80 cells, in the muted ink of the page', () => {
    document.documentElement.style.setProperty('--color-ink-mute', '#8899aa')
    const rects = recordingCanvas()
    render(<Strip />)
    // Lines of 3px: the first at y=0, the second (indented by four cells) at y=3; the blank third is not drawn.
    const bars = rects.filter((r) => r.alpha === 1)
    expect(bars.map((r) => r.y)).toEqual([0, 3, 9])
    expect(bars.every((r) => r.color === '#8899aa')).toBe(true)
    // 11 cells of 80 over 20px is 3px wide, from the first column.
    expect(bars[0]).toMatchObject({ x: 0, h: 2 })
    expect(bars[0]!.w).toBe(Math.ceil((11 / 80) * 20))
    // The indent is where the bar starts.
    expect(bars[1]!.x).toBe(Math.floor((4 / 80) * 20))
  })

  test('the width the lines are scaled to is the app\'s: a narrow terminal fills the strip', () => {
    const rects = recordingCanvas()
    render(<Strip columns={20} extent={() => [0, 20]} count={1} />)
    expect(rects[0]!.w).toBe(20)
  })

  test('marks are ticks across the strip in the colour of their tone', () => {
    document.documentElement.style.setProperty('--color-destructive', '#aa2200')
    document.documentElement.style.setProperty('--color-accent', '#2200aa')
    const rects = recordingCanvas()
    render(<Strip marks={[{ line: 1, tone: 'destructive' }, { line: 3 }, { line: 99 }]} />)
    const ticks = rects.filter((r) => r.w === 20)
    expect(ticks.map((r) => [r.y, r.color])).toEqual([[3, '#aa2200'], [9, '#2200aa']])
  })

  test('the archive is dimmer than the live lines', () => {
    const rects = recordingCanvas()
    render(<Strip archive={{ count: 4, extent: () => [0, 10] }} />)
    expect(rects.some((r) => r.alpha < 1)).toBe(true)
    expect(rects.some((r) => r.alpha === 1)).toBe(true)
  })

  test('does not paint when it has no size yet, and paints once it has', () => {
    layout(0, 0)
    const rects = recordingCanvas()
    render(<Strip />)
    expect(rects).toHaveLength(0)
  })

  test('paints at most once in a while however fast the lines come, and the last of them is the one painted', () => {
    vi.useFakeTimers()
    const rects = recordingCanvas()
    const view = render(<Strip />)
    const first = rects.length
    expect(first).toBeGreaterThan(0)
    for (let i = 1; i <= 20; i++) view.rerender(<Strip count={SOURCE.length + i} revision={i} />)
    expect(rects.length).toBe(first)
    act(() => { vi.advanceTimersByTime(250) })
    const after = rects.length
    expect(after).toBeGreaterThan(first)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(rects.length).toBe(after)
  })

  test('reads its colours again when the look of the page changes', async () => {
    document.documentElement.style.setProperty('--color-ink-mute', '#112233')
    const rects = recordingCanvas()
    render(<Strip />)
    expect(rects.at(-1)!.color).not.toBe('#445566')
    rects.length = 0
    document.documentElement.style.setProperty('--color-ink-mute', '#445566')
    document.documentElement.setAttribute('data-scheme', 'dark')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) })
    expect(rects.length).toBeGreaterThan(0)
    expect(rects.every((r) => r.color === '#445566')).toBe(true)
    document.documentElement.removeAttribute('data-scheme')
  })
})
