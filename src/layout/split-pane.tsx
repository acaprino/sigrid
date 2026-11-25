// Two panes side by side with a divider the person moves: the list and the thing read beside it, where each wants the
// width the person gives it (a session list and its transcript, a file tree and a file). `ContentSplit` is the fixed
// column; this is the one whose column moves.
// - The divider is a window splitter: one tab stop, `role="separator"` with its value in px between the two minimums.
//   A pointer drags it (the pane follows while it moves, and the size is kept when the pointer is let go). The arrows
//   move it 16px (Shift, 64px; the end the arrow points to), Home takes the first pane to its minimum and End to its
//   largest, a double press puts it back to the size it started with. In a language written from the right the arrows
//   and the drag follow the panes.
// - Each pane keeps `minStart` and `minEnd` px. A split narrower than the two minimums and the divider shows one pane
//   at a time, the one `show` names, as `ContentSplit` does; the other stays in the page, hidden, and the app is told of
//   the form (`onPanesChange`) to put its way back in the bar.
// - The size is the person's, and the app can keep it: `size` and `onSizeChange` (null: put back to the default), or
//   just a `storageKey`, under which the size is kept in the browser's storage (a store that fails keeps nothing, and
//   the split works the same).
// - It measures its own width, as the frame does, never the screen's. Without a way to measure (a server, a test) it
//   has its two panes and keeps the size as it is.
// A hairline at the divider (R4: a line, not a box); the divider is wider where a finger is the pointer.
import * as React from "react"
import { cn } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { useWords } from "../words"

/** The room of the divider, in px: its hit area; the line inside it is 1px. */
const HANDLE = 6
/** A key moves the divider this far, in px; with Shift, four times. */
const STEP = 16

export type SplitPaneProps = {
  /** The pane at the start: the list. */
  start: React.ReactNode
  /** The start pane's name for screen readers («Sessions»): it is a region of its own. */
  startLabel: string
  /** The other pane's name for screen readers («Transcript»). */
  endLabel: string
  /** The divider's name for screen readers («Resize the sessions list»); its hint says how to move it. */
  label: string
  /** The width of the start pane, in px, when the app keeps it; `null` is the default width. With it, the size is the app's: pass what `onSizeChange` gives. */
  size?: number | null | undefined
  /** The width at first, and the one a double press puts back, in px. Default 320. */
  defaultSize?: number | undefined
  /** The person moved the divider (a drag is told once, when it ends) or put it back (`null`). */
  onSizeChange?: ((size: number | null) => void) | undefined
  /** Where the browser keeps the size, when the app does not (`size`): a name of the app's («mukade.split.sessions»). */
  storageKey?: string | undefined
  /** The least width of the start pane, in px. Default 180. */
  minStart?: number | undefined
  /** The least width of the end pane, in px. Default 240. */
  minEnd?: number | undefined
  /** The pane on screen when only one fits: the start pane (the default) or the end pane (`end`). */
  show?: "start" | "end" | undefined
  /** The form changed: 2 panes side by side, or 1 at a time. Told once at first, when the split has measured itself. */
  onPanesChange?: ((panes: 1 | 2) => void) | undefined
  /** The end pane: the thing read, in the room that is left. */
  children?: React.ReactNode
}

function readKept(key: string | undefined): number | null {
  if (!key) return null
  try {
    const stored = Number(window.localStorage.getItem(key))
    return Number.isFinite(stored) && stored > 0 ? stored : null
  } catch {
    return null
  }
}

function writeKept(key: string | undefined, size: number | null): void {
  if (!key) return
  try {
    if (size === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, String(Math.round(size)))
  } catch {
    // A store that fails keeps nothing: the split moves all the same.
  }
}

/** Two panes with a divider that moves with the pointer and the keys, the size kept where the app says. */
function SplitPane({ start, startLabel, endLabel, label, size, defaultSize = 320, onSizeChange, storageKey, minStart = 180, minEnd = 240, show = "start", onPanesChange, children }: SplitPaneProps) {
  const words = useWords()
  const root = React.useRef<HTMLDivElement>(null)
  const id = React.useId()
  const [width, setWidth] = React.useState(0)
  const [own, setOwn] = React.useState<number | null>(() => readKept(storageKey))
  // The size while the pointer is down: the pane follows, and the app hears of it once, at the end.
  const [drag, setDrag] = React.useState<number | null>(null)
  const kept = size === undefined ? own : size
  const wanted = drag ?? kept ?? defaultSize
  const measured = width > 0
  const room = Math.max(minStart, width - HANDLE - minEnd)
  const current = measured ? Math.min(Math.max(wanted, minStart), room) : wanted
  const panes: 1 | 2 = measured && width < minStart + HANDLE + minEnd ? 1 : 2

  React.useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === "undefined") return
    const read = (w: number) => {
      // A split not laid out yet measures nothing: the two panes stay.
      if (w > 0) setWidth(w)
    }
    read(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) read(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const told = React.useRef<1 | 2 | null>(null)
  const tell = React.useRef(onPanesChange)
  tell.current = onPanesChange
  React.useEffect(() => {
    if (told.current === panes) return
    told.current = panes
    tell.current?.(panes)
  }, [panes])

  const commit = (next: number | null) => {
    if (size === undefined) setOwn(next)
    writeKept(storageKey, next)
    onSizeChange?.(next)
  }
  const clamp = (value: number) => Math.min(Math.max(value, minStart), measured ? room : Math.max(value, minStart))
  // The side the end of the line is on: the arrows of a language written from the right point the other way.
  const rtl = () => (root.current ? window.getComputedStyle(root.current).direction === "rtl" : false)

  const press = React.useRef<{ x: number; size: number; id: number } | null>(null)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    press.current = { x: event.clientX, size: current, id: event.pointerId }
    event.currentTarget.focus()
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const from = press.current
    if (!from || from.id !== event.pointerId) return
    const delta = (event.clientX - from.x) * (rtl() ? -1 : 1)
    setDrag(clamp(from.size + delta))
  }
  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    const from = press.current
    if (!from || from.id !== event.pointerId) return
    press.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (drag !== null && drag !== from.size) commit(drag)
    setDrag(null)
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const by = event.shiftKey ? STEP * 4 : STEP
    let next: number | null = null
    if (event.key === "ArrowRight") next = current + (rtl() ? -by : by)
    else if (event.key === "ArrowLeft") next = current + (rtl() ? by : -by)
    else if (event.key === "Home") next = minStart
    else if (event.key === "End") next = measured ? room : current
    if (next === null) return
    event.preventDefault()
    const clamped = clamp(next)
    if (clamped !== current) commit(clamped)
  }
  const reset = () => {
    if (kept === null) return
    commit(null)
  }

  const one = panes === 1
  return (
    <div
      ref={root}
      data-slot="split-pane"
      data-panes={panes}
      data-show={one ? show : undefined}
      className="flex h-full min-h-0 min-w-0"
    >
      <div
        id={`${id}-start`}
        role="region"
        aria-label={startLabel}
        data-slot="split-pane-start"
        hidden={one && show !== "start"}
        style={one ? undefined : ({ "--split-start": `${current}px` } as React.CSSProperties)}
        className={cn("min-h-0 overflow-y-auto", one ? "min-w-0 flex-1" : "w-(--split-start) shrink-0")}
      >
        {start}
      </div>
      {one ? null : (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={label}
          aria-controls={`${id}-start`}
          aria-valuemin={minStart}
          aria-valuemax={measured ? room : undefined}
          aria-valuenow={Math.round(current)}
          title={words.splitPane.hint}
          data-slot="split-pane-divider"
          data-dragging={drag !== null ? "" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={onKeyDown}
          onDoubleClick={reset}
          className={cn(
            "group relative w-1.5 shrink-0 cursor-col-resize touch-none pointer-coarse:w-3",
            FOCUS_RING_INSET,
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-line group-hover:w-0.5 group-hover:bg-ink-mute group-data-dragging:w-0.5 group-data-dragging:bg-ink-mute rtl:translate-x-1/2"
          />
        </div>
      )}
      <div
        data-slot="split-pane-end"
        role="region"
        aria-label={endLabel}
        hidden={one && show !== "end"}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        {children}
      </div>
    </div>
  )
}

export { SplitPane }
