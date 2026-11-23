// The zoom of the page, as a program has it: Ctrl with + or = (in), - (out) and 0 (back to 100%), or Ctrl and the
// wheel, from 50% to 200% in steps of 10% (WCAG 1.4.4 asks for 200%). Tauri leaves the engine's own zoom keys off
// (`zoomHotkeysEnabled`), so the page does it and gives the level to the webview (`setZoom`). On a Mac, Command takes
// the place of Ctrl for the keys.
// The level is kept in the webview's `localStorage`, which is the app's on that machine, and set again at the next
// start. A level the webview refuses goes back to the last one it took, and is not kept.
// A key or a wheel whose default a part of the page already took (a canvas that zooms itself) is left to that part.
// `createZoom` is the controller without React (the settings of an app share it with the keys); `useZoom` puts it on
// the document for as long as a component is mounted and gives the level to show.
import { useCallback, useEffect, useRef, useState } from 'react'
import { actsWhen, apiOf, reporter, run, type TauriApi, type TauriErrorHandler } from './api'
import { readHost } from './host'

const MIN_TENTHS = 5
const MAX_TENTHS = 20

/** A level from 0.5 to 2, to the nearest tenth: 1.75 is 1.8. What is not a number is 1. */
export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_TENTHS, Math.max(MIN_TENTHS, Math.round(value * 10))) / 10
}

/** The level one step of 10% from `level`: 1 in, -1 out, 0 back to 100%. */
export function stepZoom(level: number, direction: 1 | -1 | 0): number {
  if (direction === 0) return 1
  return clampZoom(clampZoom(level) + direction / 10)
}

/** What `zoomKey` reads of a key. */
export type ZoomKey = {
  readonly key: string
  readonly code?: string | undefined
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
}

/**
 * The step a key asks for, or null: Ctrl (or Command, not both) with + or =, - or 0, also on the keypad, read by
 * character or by the key's place, so it works on any layout.
 */
export function zoomKey(event: ZoomKey): 1 | -1 | 0 | null {
  if (event.altKey || event.ctrlKey === event.metaKey) return null
  const { key, code } = event
  if (key === '+' || key === '=' || code === 'NumpadAdd' || (!event.shiftKey && code === 'Equal')) return 1
  if (event.shiftKey) return null
  if (key === '-' || code === 'NumpadSubtract' || code === 'Minus') return -1
  if (key === '0' || code === 'Digit0' || code === 'Numpad0') return 0
  return null
}

/** How far the wheel turns for one step, in pixels at 100%: a notch of a mouse is about 100, a touchpad adds small ones up. */
const WHEEL_STEP = 50

/** A wheel's `deltaY` in pixels at 100%: the engine gives pixels of the page, which grow smaller as it zooms in. */
const wheelPixels = (deltaY: number, deltaMode: number, level: number): number => (deltaMode === 1 ? deltaY * 40 : deltaMode === 2 ? deltaY * 800 : deltaY * level)

type Store = Pick<Storage, 'getItem' | 'setItem'>

const pageStorage = (): Store | undefined => {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
}

function savedLevel(storage: Store | undefined, key: string): number {
  try {
    const raw = storage?.getItem(key) ?? null
    return raw === null || raw.trim() === '' ? 1 : clampZoom(Number(raw))
  } catch {
    return 1
  }
}

export type ZoomOptions = {
  /** Where the level is kept. Default `sigrid.zoom`; an app gives its own to keep a level it already saved. */
  storageKey?: string | undefined
  /** Default: the page's `localStorage`. `null` keeps nothing. */
  storage?: Store | null | undefined
  /** Where a refused or failed `setZoom` goes. */
  onError?: TauriErrorHandler | undefined
  /** What to call instead of Tauri's API (a fake webview in a test). */
  api?: Partial<TauriApi> | undefined
  /** Called with the level at each change, also when a refused one goes back. Not for the first one. */
  onChange?: ((level: number) => void) | undefined
}

/** One zoom for the page: the keys, the wheel and an app's own control share it. */
export type ZoomController = {
  /** Settles when the saved level was given to the webview (or refused, and the level is back at 100%). */
  readonly ready: Promise<void>
  /** The level shown now: 1 is 100%. */
  level(): number
  /** Shows `level` at once and resolves to whether the webview took it. */
  set(level: number): Promise<boolean>
  /** One step: 1 in, -1 out, 0 back to 100%. */
  step(direction: 1 | -1 | 0): Promise<boolean>
  /** Takes the zoom keys and Ctrl with the wheel on `doc`; returns the function that lets them go. */
  attach(doc: Document): () => void
}

/** The zoom of the webview, with the level saved on this machine. */
export function createZoom(options: ZoomOptions = {}): ZoomController {
  const key = options.storageKey ?? 'sigrid.zoom'
  const storage = options.storage === undefined ? pageStorage() : (options.storage ?? undefined)
  const api = apiOf(options.api)
  const fail = reporter(() => options.onError)

  let level = savedLevel(storage, key)
  // What the webview took last, and the number of that request: it starts at 100%.
  let taken = 1
  let takenAt = 0
  let asked = 0
  const pending = new Map<number, number>()
  const show = (value: number) => {
    if (value === level) return
    level = value
    options.onChange?.(value)
  }
  const apply = (wanted: number, keep: boolean): Promise<boolean> => {
    const mine = ++asked
    pending.set(mine, wanted)
    return run(() => api.webview())
      .then((webview) => webview.setZoom(wanted))
      .then(
        () => {
          if (mine > takenAt) {
            takenAt = mine
            taken = wanted
            if (keep) {
              try {
                storage?.setItem(key, String(wanted))
              } catch {
                // The window keeps its zoom; the next start does not.
              }
            }
          }
          return true
        },
        (error: unknown) => {
          fail('setZoom', error)
          return false
        },
      )
      .then((accepted) => {
        pending.delete(mine)
        // The last level the webview took, unless a later one is still on its way.
        let shown = taken
        for (const [at, value] of pending) if (at > takenAt) shown = value
        show(shown)
        return accepted
      })
  }
  const ready = level === 1 ? Promise.resolve() : apply(level, false).then(() => {})
  const set = (value: number): Promise<boolean> => {
    const wanted = clampZoom(value)
    show(wanted)
    return apply(wanted, true)
  }
  const step = (direction: 1 | -1 | 0): Promise<boolean> => {
    const wanted = stepZoom(level, direction)
    return wanted === level ? Promise.resolve(true) : set(wanted)
  }
  const attach = (doc: Document): (() => void) => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const direction = zoomKey(event)
      if (direction === null) return
      event.preventDefault()
      if (event.repeat && direction === 0) return
      void step(direction)
    }
    let travel = 0
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.defaultPrevented) {
        travel = 0
        return
      }
      event.preventDefault()
      travel += wheelPixels(event.deltaY, event.deltaMode, level)
      if (Math.abs(travel) < WHEEL_STEP) return
      const direction = travel < 0 ? 1 : -1
      travel = 0
      void step(direction)
    }
    doc.addEventListener('keydown', keydown)
    doc.addEventListener('wheel', wheel, { passive: false })
    return () => {
      doc.removeEventListener('keydown', keydown)
      doc.removeEventListener('wheel', wheel)
    }
  }
  return { ready, level: () => level, set, step, attach }
}

/** The options of `useZoom`: those of `createZoom`, and whether it acts. The level comes back from the hook. */
export interface UseZoomOptions extends Omit<ZoomOptions, 'onChange'> {
  /** Default: in a window of its own (`readHost().ownWindow`), or when `api` is given. */
  enabled?: boolean | undefined
}

/** The zoom of the webview with its keys and wheel, while the component is mounted: the level to show, and a way to set it. */
export function useZoom(options: UseZoomOptions = {}): { zoom: number; setZoom: (level: number) => Promise<boolean> } {
  const latest = useRef(options)
  latest.current = options
  const enabled = actsWhen(options.enabled, options.api, () => readHost().ownWindow)
  const key = options.storageKey
  const [zoom, setLevel] = useState(1)
  const controller = useRef<ZoomController | null>(null)

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    const made = createZoom({
      storageKey: key,
      storage: latest.current.storage,
      api: latest.current.api,
      onError: (what, error) => latest.current.onError?.(what, error),
      onChange: setLevel,
    })
    controller.current = made
    setLevel(made.level())
    const detach = made.attach(document)
    return () => {
      detach()
      if (controller.current === made) controller.current = null
    }
  }, [enabled, key])

  const setZoom = useCallback((level: number) => controller.current?.set(level) ?? Promise.resolve(false), [])
  return { zoom, setZoom }
}
