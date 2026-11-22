// SmoothUI (MIT) toast 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/toast.json)
// Park UI (MIT) toast 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/toast.ts)
//
// From SmoothUI the surface of a notice is left: the dark card (the ink, with the paper as its text, as in the approved
// preview), with the text, the action and the close button on one row, the quick choices on a second one. Park's
// toast recipe is a light surface card: of it we take the form (l3 corners, the lg elevation, 16px of side padding, the
// action in semibold) and the keys as outline keys, not its colors. Everything it does rests on Ark UI's Toast (`@ark-ui/react/toast`): a
// toaster store, the `Toaster` region and one toast machine per notice (its time, its leaving). What Ark gives and what
// stays ours:
// - Ark: the region (F6 moves focus to it), the life of a notice (its timer, the "dismissing" phase that keeps it in
//   the DOM while it leaves, `removeDelay`), the root and title parts, and the region as a branch of Ark's dismissable
//   layers (a click on a notice is not "outside" an Ark popover).
// - Ours: the list is the caller's (`items`); an effect carries it into the store (adds the new ones, closes the removed
//   ones). The column: at most `COLUMN_MAX` notices one above the other, all readable, the newest at the bottom; a
//   fourth pushes the oldest out from the top (Ark's `max` would keep the new one waiting instead) and the others move
//   up one place. Ark's own layouts are not used (`overlap` off): its places follow its own list, which still holds a
//   notice while it leaves, so the others would wait for it to be gone before closing the gap.
// - the region is `role="status"` with `aria-relevant="additions"` and a name in English; a notice is not a `status`
//   with `tabIndex=0` of its own: no extra Tab stop per notice;
// - the time is Ark's, but it starts over: while the pointer is on the column or focus is inside it no notice counts
//   down (`duration` Infinity), and when it is left each one is rearmed from the start;
// - Esc does not close a notice on its own: only `durationMs` (which calls `onDismiss`), a fourth notice or the caller.
// Motion: with `animated` the notices move with the list transition (`NOTICES` in `motion-impl`); without it, or with
// prefers-reduced-motion, the same places are plain styles and nothing moves.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Toast, Toaster, createToaster, useToastContext } from '@ark-ui/react/toast'
import { Button } from './ui/button'
import { TOASTS_ATTR, TOASTS_LAYER, TOASTS_ROOM_VAR } from '../internal/overlay'
import { useMotion } from '../internal/motion'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { CircleAlert } from 'lucide-react'
import { FOCUS_RING } from '../lib/focus'

/** An extra action on a notice (a quick choice after a gesture): `pressed` marks it as already chosen. */
export type ToastAction = { id: string; label: string; ariaLabel?: string | undefined; pressed?: boolean | undefined; onClick: () => void }

export type ToastItem = {
  id: string
  text: string
  /** «Undo». `hint` is the key that does the same thing right now (for example «Z»): it is shown next to the button. */
  undo?: { label?: string; hint?: string | undefined; onClick: () => void }
  /** Quick choices, on a second row: groups of buttons (each group has a name for screen readers). */
  actions?: { label: string; items: ToastAction[] }[] | undefined
  /**
   * `error`: something failed and the user has to know. It never counts down (`durationMs` does not apply to it), it
   * shows no seconds, and newer notices push the others out before it: it stays until it is closed (the «×», with
   * `onDismiss`) or the caller removes it. A mark before the text says what it is, and screen readers hear «Error».
   */
  kind?: 'error' | undefined
}

export type ToastsProps = {
  /** The notices, oldest first. The column shows the `max` newest: one more pushes the oldest out (and calls `onDismiss`). */
  items: ToastItem[]
  /** How many the column holds, up to `COLUMN_MAX` (ten, R12 of the toolkit's rules, 2026-11-20). */
  max?: number | undefined
  /** In the page flow instead of fixed at the bottom: for documentation and previews. */
  inline?: boolean
  /**
   * After how many milliseconds a notice calls `onDismiss`. Without it (or without `onDismiss`) the notices stay until the
   * caller removes them, as before. With the pointer on the column or focus inside it the time is suspended; when it is
   * left the time starts over.
   */
  durationMs?: number | undefined
  /** Called once per notice when `durationMs` runs out, or when newer notices push it out of the column: the caller removes it from `items`. */
  onDismiss?: ((id: string) => void) | undefined
  /** The column moves: a notice enters and leaves, the others slide into place (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

type Motion = ReturnType<typeof useMotion>

/**
 * The focus ring inside a notice: the toast's own text colour, since the accent of the ring would not reach 3:1 on the
 * dark surface (R8 asks for 3:1 first; the paper on the ink is far above it).
 */
const ON_TOAST_FOCUS = 'focus-visible:outline-paper'

/** The most notices the column holds (R12 of the toolkit's rules, 2026-11-20: ten): one more pushes the oldest out from the top. */
const COLUMN_MAX = 10
/** The space between two notices of the column, in px. */
const GAP = 8

/** The place of a notice in the column: 0 is the newest, at the bottom; `y` is how far up it sits, in px (negative). */
type Spot = { index: number; y: number }

type ColumnState = {
  items: Map<string, ToastItem>
  spots: Map<string, Spot>
  /** The notices pushed out by newer ones (they leave from the top, not downwards). */
  pushed: Set<string>
  /** The pointer is on the column, or focus is inside it: no notice counts down. */
  paused: boolean
  armed: boolean
  durationMs: number | undefined
  motion: Motion
  /** True once the notices that were there at mount are in: from then on a new one enters animated. */
  settled: { current: boolean }
  /** The notices already shown: one of them drawn again (the column redrawn when Motion arrives) does not enter again. */
  shown: { current: Set<string> }
  close: ((id: string) => void) | undefined
  measured: (id: string, height: number | null) => void
  /** True once every notice shown has a measured height: their places are then the real ones. */
  sized: boolean
}

const ColumnContext = createContext<ColumnState | null>(null)

// What Ark writes on the region to place it (fixed, at the bottom, above everything) and to lay its notices out: here
// the place is given by classes (phone, desktop, `inline`) and the column by `Spot`.
const NO_ARK_PLACEMENT: CSSProperties = {
  position: undefined,
  zIndex: undefined,
  display: undefined,
  flexDirection: undefined,
  alignItems: undefined,
  pointerEvents: undefined,
  top: undefined,
  bottom: undefined,
  insetInlineStart: undefined,
  insetInlineEnd: undefined,
  ...({ '--gap': undefined, '--first-height': undefined, '--viewport-offset-left': undefined, '--viewport-offset-right': undefined, '--viewport-offset-top': undefined, '--viewport-offset-bottom': undefined } as CSSProperties),
}

/** A notice of the column: Ark's toast root (without its `status` role and Tab stop), in its place. */
function Notice({ id }: { id: string }) {
  const column = useContext(ColumnContext)!
  const words = useWords()
  const toast = useToastContext()
  // What it showed last: a notice that leaves is no longer in `items`, but it stays in the DOM while it goes.
  const current = column.items.get(id)
  const kept = useRef(current)
  if (current) kept.current = current
  const item = kept.current
  const spot = column.spots.get(id)
  const last = useRef<Spot>(spot ?? { index: 0, y: 0 })
  if (spot) last.current = spot
  const [enter] = useState(() => column.settled.current && !column.shown.current.has(id))
  // Until the column knows the height of its notices, one that does not enter is put in its place, it does not glide
  // there: the heights are measured after the notices mount (later still if the styles arrive late), and what was
  // already on the page must not move when the page (or Motion) arrives.
  const [placed, setPlaced] = useState(false)
  useEffect(() => {
    if (column.sized) setPlaced(true)
  }, [column.sized])
  // Remembered until the caller drops it from its items (the column forgets it then), not until this card unmounts:
  // the column redrawn by Motion unmounts every card and mounts it again a moment later.
  useEffect(() => void column.shown.current.add(id), [column.shown, id])
  const why = useRef<'closed' | 'pushed'>('closed')
  const gone = !spot || !toast.visible
  if (gone && column.pushed.has(id)) why.current = 'pushed'
  const leaving = gone ? why.current : false

  const { armed, durationMs, paused, motion, measured } = column
  // How much is left, in whole seconds: it is shown next to the close button. While the column is held (pointer or focus)
  // it goes back to the full time, like the real timer (which starts over when it is left). A number that counts down,
  // not a moving bar.
  const total = armed && durationMs && item?.kind !== 'error' ? Math.ceil(durationMs / 1000) : 0
  const [left, setLeft] = useState(total)
  useEffect(() => {
    setLeft(total)
    if (total === 0 || paused) return
    const tick = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(tick)
  }, [total, paused])

  // Its height, for the places of the ones above it.
  const card = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (card.current) measured(id, card.current.offsetHeight)
  })
  useLayoutEffect(() => {
    const el = card.current
    const observer = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measured(id, el.offsetHeight)) : null
    if (el) observer?.observe(el)
    return () => {
      observer?.disconnect()
      measured(id, null)
    }
  }, [id, measured])

  if (!item) return null
  const { index, y } = last.current
  const ark = toast.getRootProps() as Record<string, unknown>
  const root = {
    // Ark's root, without `role="status"`, `aria-atomic`, `tabIndex=0` and its Esc handler: the notice is a piece of the
    // `status` region, not a region to reach with the Tab key, and Esc does not close it.
    id: ark['id'] as string,
    'data-scope': 'toast',
    'data-part': 'root',
    'data-state': toast.visible ? 'open' : 'closed',
    'data-index': index,
    // A notice that is leaving stays in the DOM for the animation: it must not be clickable (a double click on «Undo»
    // would run the inverse twice). `inert` removes pointer, keyboard and screen reader.
    inert: leaving !== false,
    // `pointer-events-auto`: a notice stays clickable when a modal window turns the pointer off on the body.
    className: 'pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-lg bg-ink py-2 pr-2 pl-4 text-sm text-paper shadow-lg',
  }
  const style: CSSProperties = { zIndex: COLUMN_MAX - index }
  const out = leaving !== false
  const body = (
    <>
      <div className="flex items-center gap-3">
        {item.kind === 'error' ? (
          // The mark of an error: an icon in the toast's own text colour (no red on the inverted surface), and the word
          // for screen readers, read before the text.
          <>
            <CircleAlert data-slot="toast-error" aria-hidden="true" className="-ml-1 size-4 shrink-0" />
            <span className="sr-only">{words.common.error}:</span>
          </>
        ) : null}
        <Toast.Title asChild>
          <span className="min-w-0 flex-1">{item.text}</span>
        </Toast.Title>
        {item.undo ? (
          <Button
            variant="ghost"
            size="xs"
            className={cn('font-semibold text-paper hover:bg-paper/15 hover:text-paper', ON_TOAST_FOCUS)}
            disabled={out}
            // The key is announced to screen readers as the button's shortcut, not as part of its name.
            aria-keyshortcuts={item.undo.hint}
            onClick={out ? undefined : item.undo.onClick}
          >
            {item.undo.label ?? words.common.undo}
            {item.undo.hint ? (
              // A key hint (R5): plain 12px text in the toast's own colour, only with a fine pointer.
              <kbd aria-hidden="true" data-slot="toast-hint" className="hidden font-sans text-2xs leading-none font-medium any-pointer-fine:inline">
                {item.undo.hint}
              </kbd>
            ) : null}
          </Button>
        ) : null}
        {column.close ? (
          <>
            {total > 0 ? (
              // For those who can see: how much is left. Screen readers do not hear it count down every second.
              <span aria-hidden="true" data-slot="toast-timer" className="w-5 text-right text-xs text-paper tabular-nums">
                {left}
              </span>
            ) : null}
            <Button variant="ghost" size="xs" aria-label={`Close the notice: ${item.text}`} className={cn('text-paper hover:bg-paper/15 hover:text-paper', ON_TOAST_FOCUS)} disabled={out} onClick={out ? undefined : () => column.close?.(id)}>
              <span aria-hidden="true">×</span>
            </Button>
          </>
        ) : null}
      </div>
      {item.actions?.length ? (
        <div data-slot="toast-actions" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-1">
          {item.actions.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="flex items-center gap-1">
              {group.items.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="xs"
                  aria-label={action.ariaLabel}
                  aria-pressed={action.pressed === true}
                  disabled={out}
                  onClick={
                    out
                      ? undefined
                      : (e) => {
                          action.onClick()
                          // A click with the pointer leaves focus on the button, and focus inside the column stops its
                          // time: the notices would never go away. From the keyboard (`detail` 0) focus stays, for the
                          // next choice.
                          if (e.detail > 0) e.currentTarget.blur()
                        }
                  }
                  className={cn('border border-paper/40 text-paper hover:bg-paper/15 hover:text-paper', ON_TOAST_FOCUS, action.pressed && 'bg-paper text-ink hover:bg-paper hover:text-ink')}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
  if (motion) {
    // The place above this one: where a pushed-out notice goes.
    const beyond = y - ((card.current?.offsetHeight ?? 0) + GAP)
    return (
      <motion.NoticeCard {...root} ref={card} style={style} y={y} enter={enter} still={!enter && !placed} leaving={leaving} beyond={beyond}>
        {body}
      </motion.NoticeCard>
    )
  }
  // Without animations a notice that leaves is gone at once, and the others are simply in their places.
  return (
    <div {...root} ref={card} hidden={out} style={y === 0 ? style : { ...style, transform: `translateY(${y}px)` }}>
      {body}
    </div>
  )
}

function Column({ items, max, inline, durationMs, onDismiss, motion }: { items: ToastItem[]; max: number; inline: boolean; durationMs: number | undefined; onDismiss: ((id: string) => void) | undefined; motion: Motion }) {
  const words = useWords()
  // Ark's toaster store, one per column. `pause` and `resume` are the region's (pointer or focus inside): Ark would resume
  // each notice with the time it had left, here the time starts over and is driven by `paused` below.
  const [store] = useState(() => ({ ...createToaster({ placement: 'bottom-end', overlap: false, max: Number.MAX_SAFE_INTEGER, gap: GAP, hotkey: ['F6'], pauseOnPageIdle: false, removeDelay: 0 }), pause() {}, resume() {} }))
  // The latest `onDismiss`, without making it a dependency: a caller that passes a new one on every render
  // must not make the timer restart.
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })

  // The notices that are still in `items` but no longer in the column: their time ran out, or newer ones pushed them out.
  // They are not shown again (and do not expire a second time) until the caller removes them and gives them back.
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set())
  const alive = items.filter((t) => !gone.has(t.id))
  // Over `max`, the oldest go: the plain notices first, an error only when nothing else is left to push out.
  const excess = Math.max(0, alive.length - max)
  const dropped = new Set<string>()
  for (const t of alive) if (dropped.size < excess && t.kind !== 'error') dropped.add(t.id)
  for (const t of alive) if (dropped.size < excess) dropped.add(t.id)
  const shown = alive.filter((t) => !dropped.has(t.id))
  const over = alive.filter((t) => dropped.has(t.id))
  const pushedOut = useRef(new Set<string>())
  for (const t of over) pushedOut.current.add(t.id)
  // A caller that keeps the list short itself (the client holds three) removes the oldest as it adds a new one: for the
  // column that is the same thing, the oldest pushed out from the top, not a notice closed.
  const before = useRef<string[]>([])
  const now = shown.map((t) => t.id)
  const arrived = now.filter((id) => !before.current.includes(id)).length
  const pushed = new Set(pushedOut.current)
  if (arrived > 0 && before.current.length === max) for (const id of before.current.slice(0, arrived)) if (!now.includes(id)) pushed.add(id)
  const nowKey = JSON.stringify(now)
  useEffect(() => {
    before.current = JSON.parse(nowKey) as string[]
  }, [nowKey])
  const overKey = JSON.stringify(over.map((t) => t.id))
  const itemsKey = JSON.stringify(items.map((t) => t.id))
  useEffect(() => {
    const ids = JSON.parse(overKey) as string[]
    if (ids.length === 0) return
    setGone((prev) => new Set([...prev, ...ids]))
    for (const id of ids) dismiss.current?.(id)
  }, [overKey])
  useEffect(() => {
    const present = new Set(JSON.parse(itemsKey) as string[])
    for (const id of [...pushedOut.current]) if (!present.has(id)) pushedOut.current.delete(id)
    setGone((prev) => ([...prev].every((id) => present.has(id)) ? prev : new Set([...prev].filter((id) => present.has(id)))))
  }, [itemsKey])

  // No notice counts down while a mouse is on the column or focus is inside it (a finger does not hover: its tap
  // would hold the column until the next tap elsewhere).
  const region = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const paused = hover || focus

  // The heights of the notices, read by each one: the places of the ones above and the room of the column need them.
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map())
  const measured = useCallback((id: string, height: number | null) => {
    setHeights((prev) => {
      if (height === null ? !prev.has(id) : prev.get(id) === height) return prev
      const next = new Map(prev)
      if (height === null) next.delete(id)
      else next.set(id, height)
      return next
    })
    // A notice that goes away with focus inside it (its «Undo» pressed from the keyboard) does not always say so with a
    // `blur`: the column would stay held, and the others would never count down.
    if (height === null) queueMicrotask(() => {
      const el = region.current
      if (el && (el === el.ownerDocument.activeElement || !el.contains(el.ownerDocument.activeElement))) setFocus(false)
    })
  }, [])

  // The places: the newest at the bottom, the others above it, each as far up as the ones below it are tall.
  const spots = new Map<string, Spot>()
  let height = 0
  ;[...shown].reverse().forEach((t, index) => {
    spots.set(t.id, { index, y: index === 0 ? 0 : -height })
    height += (heights.get(t.id) ?? 0) + GAP
  })
  // As tall as its notices and the gaps between them: the pointer crossing a gap is still on the column.
  const tall = shown.length === 0 ? 0 : height - GAP

  const armed = durationMs !== undefined && durationMs > 0 && onDismiss !== undefined
  const leaveMs = motion ? motion.DURATION_MS.toast : 0
  // What the store holds: the id of each notice given to it and still wanted, with the time it was last given.
  const made = useRef(new Map<string, string>())
  const settled = useRef(false)
  const shownOnce = useRef(new Set<string>())
  useEffect(() => {
    for (const id of shownOnce.current) if (!items.some((item) => item.id === id)) shownOnce.current.delete(id)
  })
  const later = useRef(new Set<ReturnType<typeof setTimeout>>())
  // An error has no time of its own: it never counts down.
  const wanted = { ids: shown.map((t) => t.id), errors: shown.filter((t) => t.kind === 'error').map((t) => t.id), duration: armed && !paused && durationMs !== undefined ? durationMs : Infinity, leaveMs }
  const latest = useRef(wanted)
  const wantedKey = JSON.stringify([wanted.ids, wanted.errors, wanted.duration === Infinity ? null : wanted.duration, wanted.leaveMs])
  useLayoutEffect(() => {
    latest.current = wanted
    let live = true
    // In a microtask: Ark's store renders each change at once (`flushSync`), which React refuses inside an effect.
    queueMicrotask(() => {
      if (!live) return
      const { ids, errors, duration: timed, leaveMs } = latest.current
      const want = new Set(ids)
      for (const id of [...made.current.keys()]) {
        if (want.has(id)) continue
        made.current.delete(id)
        if (leaveMs === 0) {
          store.remove(id)
          continue
        }
        store.dismiss(id)
        // Ark drops a "dismiss" that reaches a notice in the instant its time is being rearmed: it must not stay forever.
        const timer = setTimeout(() => {
          later.current.delete(timer)
          if (!made.current.has(id) && store.isVisible(id)) store.remove(id)
        }, leaveMs + 100)
        later.current.add(timer)
      }
      for (const id of ids) {
        const duration = errors.includes(id) ? Infinity : timed
        const time = `${duration}/${leaveMs}`
        if (made.current.get(id) === time) continue
        if (made.current.has(id)) store.update(id, { duration, removeDelay: leaveMs })
        else {
          // The same id given back while the old notice is still leaving: the old one goes at once, this is a new one.
          if (store.isVisible(id)) store.remove(id)
          store.create({
            id,
            duration,
            removeDelay: leaveMs,
            // Ark closes a notice when its time runs out, or when this column closes it: only the first case is an `onDismiss`.
            onStatusChange: (change) => {
              if (change.status !== 'dismissing' || change.src !== 'timer' || !made.current.has(id)) return
              made.current.delete(id)
              setGone((prev) => new Set([...prev, id]))
              dismiss.current?.(id)
            },
          })
        }
        made.current.set(id, time)
      }
      settled.current = true
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey, store])
  useEffect(() => {
    const timers = later.current
    return () => timers.forEach(clearTimeout)
  }, [])

  // The column tells the sheets how much space it takes at the bottom, so they do not cover its foot (variable on the
  // root).
  const room = tall > 0 ? Math.ceil(tall) + 16 : 0
  useLayoutEffect(() => {
    if (inline) return
    document.documentElement.style.setProperty(TOASTS_ROOM_VAR, `${room}px`)
  }, [inline, room])
  useLayoutEffect(() => {
    if (inline) return
    return () => void document.documentElement.style.removeProperty(TOASTS_ROOM_VAR)
  }, [inline])

  const byId = useMemo(() => new Map(items.map((t) => [t.id, t])), [items])
  const state: ColumnState = { items: byId, spots, pushed, paused, armed, durationMs, motion, settled, shown: shownOnce, close: onDismiss ? (id) => dismiss.current?.(id) : undefined, measured, sized: shown.every((t) => (heights.get(t.id) ?? 0) > 0) }
  const column = (
    <Toaster
      ref={region}
      toaster={store}
      role="status"
      aria-label={words.common.notices}
      aria-relevant="additions"
      data-paused={paused || undefined}
      {...{ [TOASTS_ATTR]: '' }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setHover(true)
      }}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => {
        // Focus on a control of a notice holds the time. Focus on the region itself does not: a click on the text of a
        // notice lands there (the region can take focus, for F6), and the column would stay held after the pointer left.
        if (e.target !== e.currentTarget) setFocus(true)
        // Ark remembers what had focus before the region, to give focus back to it when the region is left. It takes
        // for it whatever focus came from, a button of another notice included, and then pulls focus back into the
        // column from wherever the user went. Its handler runs after this one, on the same event: without a
        // `relatedTarget` it remembers nothing, and focus simply goes where the user sends it.
        ;(e as { relatedTarget: EventTarget | null }).relatedTarget = null
      }}
      onBlur={(e) => {
        // Focus moving from one control to another of the column does not restart the time.
        if (e.relatedTarget === e.currentTarget || !e.currentTarget.contains(e.relatedTarget)) setFocus(false)
      }}
      style={{ ...NO_ARK_PLACEMENT, height: tall }}
      // On the phone in the middle, above an app's bottom bar (`BOTTOM_BAR_ROOM_VAR`, 0px without one); from 860px up at
      // the bottom right.
      className={cn(
        'pointer-events-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg',
        FOCUS_RING,
        inline ? 'relative mx-auto my-4' : cn('fixed bottom-[calc(1rem+var(--bottom-bar-room,0px))] left-1/2 -translate-x-1/2 md:right-4 md:left-auto md:translate-x-0', TOASTS_LAYER),
      )}
    >
      {(toast) => <Notice id={toast.id ?? ''} />}
    </Toaster>
  )
  return <ColumnContext.Provider value={state}>{motion ? <motion.Notices>{column}</motion.Notices> : column}</ColumnContext.Provider>
}

/**
 * The notices: a column at the bottom right (in the middle on the phone), read by screen readers without interrupting.
 * At most `max` (ten by default), one above the other, the newest at the bottom; one more pushes the oldest out from the top. With
 * `durationMs` and `onDismiss` each notice shows the seconds left and a «×» to close it at once.
 */
export function Toasts({ items, max = COLUMN_MAX, inline = false, durationMs, onDismiss, animated }: ToastsProps) {
  const motion = useMotion(animated)
  return <Column items={items} max={Math.max(1, Math.min(max, COLUMN_MAX))} inline={inline} durationMs={durationMs} onDismiss={onDismiss} motion={motion} />
}
