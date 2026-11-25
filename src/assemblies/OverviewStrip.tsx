// A strip that shows the lines of a long text in miniature and moves them: each line is a bar from where its text starts
// to where it ends, a frame marks the lines in sight, a mark is a line the app wants seen, and a part above the live
// lines can hold an archive (lines that scrolled out of what the app keeps in memory), dimmer. It is a scroll bar by
// another face: a press or a drag on it asks for the line it stands for (`onSeek`), a wheel moves by three lines, and
// it is a scroll bar for the keyboard and for screen readers (Up and Down, Page Up and Page Down, Home and End).
// It is drawn on a canvas in the colours of the toolkit's tokens, read again when the page's look changes. It knows no
// terminal: it is on the `./terminal` entry because that is what it is made for (a terminal's `buffer` gives it its
// lines), and `textExtent` turns a line of text into the bar it is.
// - Few lines are bars a few pixels apart; more than fit are one pixel row for several lines, so the cost of a drawing is
//   the height of the strip and not the length of the text; at most once every 200ms, however fast the lines change.
// - The geometry is pure (`overviewGeometry`, `lineAt`, `holdAt`, `archivedLineAt`) and exported for what draws another way.
import * as React from 'react'
import { readColor, watchLook, type Hex } from '../internal/look'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { themeTokens } from '../theme-engine'
import { BASE_THEME } from '../themes'

/** The share of the strip that the archive takes at most, however long it is. */
const ARCHIVE_SHARE = 0.3
/** Pixels for a line at most: a short text reads as lines, not as stretched blocks. */
export const OVERVIEW_PITCH = 3
/** A line this many cells long fills the strip's width: scaled to a wide text, a short line would be a few pixels. */
export const OVERVIEW_COLUMNS = 80
/** The frame is never thinner than this, so it stays in sight over a long text. */
const MIN_FRAME = 6
/** The painting is at most once in this many milliseconds. */
const REPAINT_MS = 200
/** Lines a turn of the wheel moves. */
const WHEEL_LINES = 3

/** What a mark says by its colour: the toolkit's status tokens and the accent. */
export type OverviewTone = 'accent' | 'info' | 'success' | 'warning' | 'destructive'

export interface OverviewMark {
  /** The line (0-based, in the live lines). */
  readonly line: number
  /** `accent` by default. */
  readonly tone?: OverviewTone | undefined
}

/** The bar of a line: from the first cell with text to the end of it; null for a blank line. */
export type OverviewExtent = (index: number) => readonly [start: number, end: number] | null

export type OverviewStripProps = {
  /** The name of the strip for screen readers; «Lines of the terminal» by default (`words.terminal.overview`). */
  'aria-label'?: string | undefined
  /** How many live lines there are. */
  count: number
  /** The bar of each live line. */
  extent: OverviewExtent
  /** The lines in sight: the first, and how many. */
  viewport: { start: number; size: number }
  /** How many cells of a line fill the strip's width; 80 by default. */
  columns?: number | undefined
  /** Lines to be seen at a glance (an error, a search hit): a tick across the strip. */
  marks?: readonly OverviewMark[] | undefined
  /** Lines older than the live ones, kept elsewhere: their part of the strip is dimmer and a press on it is `onArchiveSeek`. */
  archive?: { count: number; extent: OverviewExtent } | undefined
  /** Changes when the text did, so the strip is drawn again (the lines are read through `extent`, which is not a value). */
  revision?: unknown
  /** The first line in sight the strip asks for, from a press, a drag, the wheel or a key. */
  onSeek: (line: number) => void
  /** The archived line a press on the archive stands for. */
  onArchiveSeek?: ((line: number) => void) | undefined
  className?: string | undefined
}

/** Where the parts of the strip lie, in pixels from its top. */
export type OverviewGeometry = {
  /** The archive takes the top, then the live lines at `pitch` pixels each. */
  archiveHeight: number
  liveHeight: number
  pitch: number
  /** The frame around the lines in sight. */
  frameTop: number
  frameHeight: number
}

/** The geometry of a strip `height` pixels tall, with `archived` lines in the archive and `count` live ones, `size` of them in sight from `start`. Pure. */
export function overviewGeometry(height: number, archived: number, count: number, start: number, size: number): OverviewGeometry {
  const archiveHeight = archived > 0 ? Math.min(Math.round(height * ARCHIVE_SHARE), Math.ceil(archived * OVERVIEW_PITCH)) : 0
  const liveHeight = Math.max(1, height - archiveHeight)
  const lines = Math.max(1, count)
  const pitch = Math.min(OVERVIEW_PITCH, liveHeight / lines)
  const frameHeight = Math.min(liveHeight, Math.max(MIN_FRAME, Math.round(Math.min(size, lines) * pitch)))
  const frameTop = Math.max(archiveHeight, Math.min(height - frameHeight, archiveHeight + Math.round(start * pitch)))
  return { archiveHeight, liveHeight, pitch, frameTop, frameHeight }
}

/** The first line in sight that a pointer at `y` asks for; `hold` is how many lines below the frame's top the pointer holds it (the middle of the frame for a press outside it). */
export function lineAt(y: number, geometry: OverviewGeometry, count: number, size: number, hold = geometry.frameHeight / 2 / geometry.pitch): number {
  const line = Math.round((y - geometry.archiveHeight) / geometry.pitch - hold)
  return Math.max(0, Math.min(Math.max(0, count - size), line))
}

/** Where a pointer at `y` holds a frame whose first line is `start`, in lines below that first line. */
export function holdAt(y: number, geometry: OverviewGeometry, start: number): number {
  return (y - geometry.archiveHeight) / geometry.pitch - start
}

/** The archived line a pointer at `y`, in the archive part, stands for. */
export function archivedLineAt(y: number, geometry: OverviewGeometry, archived: number): number {
  return Math.max(0, Math.min(archived - 1, Math.floor((y / Math.max(1, geometry.archiveHeight)) * archived)))
}

/** The bar of a line of text: from its indent to its end; null for a line with nothing in it. */
export function textExtent(text: string): readonly [number, number] | null {
  const end = text.trimEnd().length
  return end === 0 ? null : [text.length - text.trimStart().length, end]
}

/** Paints `count` lines from `top`, `pitch` pixels each, as the bars `extent` gives over `cols` cells. Below a pixel a line, each pixel row shows the first of its lines. */
function paintLines(context: CanvasRenderingContext2D, top: number, pitch: number, count: number, width: number, cols: number, extent: OverviewExtent): void {
  const bar = (y: number, height: number, index: number) => {
    const found = extent(index)
    if (!found || found[1] <= found[0]) return
    const left = Math.min(width - 1, (found[0] / cols) * width)
    context.fillRect(Math.floor(left), y, Math.max(1, Math.ceil(Math.min(1, found[1] / cols) * width - left)), height)
  }
  if (pitch >= 1) {
    // A gap of a pixel between lines once there is room for it.
    const height = pitch >= 2 ? Math.max(1, Math.floor(pitch) - 1) : 1
    for (let index = 0; index < count; index++) bar(Math.floor(top + index * pitch), height, index)
  } else {
    const rows = Math.ceil(count * pitch)
    for (let row = 0; row < rows; row++) bar(top + row, 1, Math.min(count - 1, Math.floor(row / pitch)))
  }
}

/** The tokens the strip is drawn in, by what they are for. */
const INK = { trace: 'ink-mute', accent: 'accent', info: 'info', success: 'success', warning: 'warning', destructive: 'destructive' } as const
const BASELINE = themeTokens(BASE_THEME, 'light').colors

const heightOf = (el: Element) => el.getBoundingClientRect().height || (el as HTMLElement).clientHeight || 0

function OverviewStrip({ 'aria-label': ariaLabel, count, extent, viewport, columns = OVERVIEW_COLUMNS, marks, archive, revision, onSeek, onArchiveSeek, className }: OverviewStripProps) {
  const words = useWords().terminal
  const strip = React.useRef<HTMLDivElement>(null)
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = React.useState(0)
  // What the painting reads, kept where it can be reached without being a dependency of it.
  const state = React.useRef({ count, extent, viewport, columns, marks, archive, height })
  state.current = { count, extent, viewport, columns, marks, archive, height }
  /** While a drag lasts: where the pointer holds the frame, in lines below its top. */
  const hold = React.useRef<number | null>(null)
  const ink = React.useRef<Record<keyof typeof INK, Hex> | null>(null)

  const archived = archive?.count ?? 0
  const shape = overviewGeometry(height, archived, count, viewport.start, viewport.size)
  const last = Math.max(0, count - viewport.size)

  /** Draws the lines and the marks. */
  const paint = React.useCallback(() => {
    const el = canvas.current
    const now = state.current
    if (!el || typeof el.getContext !== 'function') return
    const width = el.clientWidth
    const tall = el.clientHeight
    // Parked or not laid out yet: the observer calls again once the strip has a size.
    if (width < 2 || tall < 8) return
    const ratio = el.ownerDocument.defaultView?.devicePixelRatio || 1
    if (el.width !== Math.round(width * ratio) || el.height !== Math.round(tall * ratio)) {
      el.width = Math.round(width * ratio)
      el.height = Math.round(tall * ratio)
    }
    const context = el.getContext('2d')
    if (!context) return
    const colors = (ink.current ??= Object.fromEntries(Object.entries(INK).map(([key, name]) => [key, readColor(el, `--color-${name}`, BASELINE[name] as Hex)])) as Record<keyof typeof INK, Hex>)
    const geometry = overviewGeometry(tall, now.archive?.count ?? 0, now.count, now.viewport.start, now.viewport.size)
    const cols = Math.max(1, now.columns)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, tall)
    if (now.archive && geometry.archiveHeight) {
      context.globalAlpha = 0.6
      context.fillStyle = colors.trace
      paintLines(context, 0, geometry.archiveHeight / now.archive.count, now.archive.count, width, cols, now.archive.extent)
    }
    context.globalAlpha = 1
    context.fillStyle = colors.trace
    paintLines(context, geometry.archiveHeight, geometry.pitch, now.count, width, cols, now.extent)
    for (const mark of now.marks ?? []) {
      if (mark.line < 0 || mark.line >= now.count) continue
      context.fillStyle = colors[mark.tone ?? 'accent']
      context.fillRect(0, Math.floor(geometry.archiveHeight + mark.line * geometry.pitch), width, Math.max(2, Math.ceil(geometry.pitch)))
    }
  }, [])

  // At most one painting per interval, however fast the lines come; the frame follows at once (it is not painted).
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const schedule = React.useCallback(() => {
    if (timer.current !== undefined) return
    timer.current = setTimeout(() => {
      timer.current = undefined
      paint()
    }, REPAINT_MS)
  }, [paint])
  React.useEffect(() => () => clearTimeout(timer.current), [])

  // The first painting is at once; the text that changes after it is drawn at the pace above.
  const first = React.useRef(true)
  React.useEffect(() => {
    if (first.current) {
      first.current = false
      paint()
    } else schedule()
  }, [count, revision, columns, marks, archived, height, paint, schedule])

  // The strip's size (a frame that follows it) and the look of the page (the colours are read again).
  React.useLayoutEffect(() => {
    const el = strip.current
    if (!el) return
    setHeight(heightOf(el))
    const observer = new ResizeObserver(() => {
      setHeight(heightOf(el))
      paint()
    })
    observer.observe(el)
    const stop = watchLook(el.ownerDocument, () => {
      ink.current = null
      paint()
    })
    return () => {
      observer.disconnect()
      stop()
    }
  }, [paint])

  const seekTo = (y: number) => {
    const now = state.current
    const geometry = overviewGeometry(strip.current ? heightOf(strip.current) : now.height, now.archive?.count ?? 0, now.count, now.viewport.start, now.viewport.size)
    onSeek(lineAt(y, geometry, now.count, now.viewport.size, hold.current ?? undefined))
  }
  const pointerY = (event: React.PointerEvent) => event.clientY - (strip.current?.getBoundingClientRect().top ?? 0)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !strip.current) return
    const now = state.current
    const geometry = overviewGeometry(heightOf(strip.current), now.archive?.count ?? 0, now.count, now.viewport.start, now.viewport.size)
    const y = pointerY(event)
    if (now.archive && geometry.archiveHeight && y < geometry.archiveHeight) {
      onArchiveSeek?.(archivedLineAt(y, geometry, now.archive.count))
      return
    }
    // On the frame the drag holds it where it was taken; elsewhere the frame jumps to the pointer.
    const onFrame = y >= geometry.frameTop && y <= geometry.frameTop + geometry.frameHeight
    hold.current = onFrame ? holdAt(y, geometry, now.viewport.start) : geometry.frameHeight / 2 / geometry.pitch
    seekTo(y)
    strip.current.setPointerCapture?.(event.pointerId)
    strip.current.focus({ preventScroll: true })
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (hold.current !== null) seekTo(pointerY(event))
  }
  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (hold.current === null) return
    hold.current = null
    strip.current?.releasePointerCapture?.(event.pointerId)
  }
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY === 0) return
    onSeek(Math.max(0, Math.min(last, viewport.start + Math.sign(event.deltaY) * WHEEL_LINES)))
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const to: Record<string, number> = {
      ArrowUp: viewport.start - 1,
      ArrowDown: viewport.start + 1,
      PageUp: viewport.start - viewport.size,
      PageDown: viewport.start + viewport.size,
      Home: 0,
      End: last,
    }
    const at = to[event.key]
    if (at === undefined) return
    event.preventDefault()
    onSeek(Math.max(0, Math.min(last, at)))
  }

  return (
    <div
      ref={strip}
      data-slot="overview-strip"
      role="scrollbar"
      aria-orientation="vertical"
      aria-label={ariaLabel ?? words.overview}
      aria-valuemin={0}
      aria-valuemax={last}
      aria-valuenow={Math.min(last, viewport.start)}
      aria-valuetext={words.overviewAt(viewport.start + 1, count)}
      tabIndex={0}
      className={cn('relative w-5 shrink-0 touch-none select-none overflow-hidden', FOCUS_RING, className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />
      {shape.archiveHeight > 0 ? <div data-slot="overview-archive" aria-hidden="true" className="absolute inset-x-0 top-0 border-b border-line" style={{ height: shape.archiveHeight }} /> : null}
      {height > 0 ? <div data-slot="overview-frame" aria-hidden="true" className="absolute inset-x-0 rounded-sm border border-accent bg-accent/10" style={{ top: shape.frameTop, height: shape.frameHeight }} /> : null}
    </div>
  )
}

export { OverviewStrip }
