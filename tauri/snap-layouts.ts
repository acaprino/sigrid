// Snap Layouts on Windows 11, for a native side that offers them: opt-in, with the names the app's shell uses.
// Windows opens its layouts from the system's own maximize button. A window without a frame has none, so a shell
// can lay the system's hit area over the page's maximize button; then the pointer never reaches the page's button,
// and the shell sends back its hover and press. This file does the page's half:
// - it sends the button's rectangle to the app's command (`command`), in physical pixels (the page's pixels times
//   `devicePixelRatio`, rounded) as `{ x, y, width, height }`, when it changes, again at each resize of the window
//   (maximized, the shell places its area again) and after a change of zoom; a send that fails is sent again at the
//   next change. When the button goes away a rectangle of zero size is sent, so the shell takes its area away;
// - it listens to the app's event (`event`), whose payload is `{ hover, pressed }`, and gives `maximizeState`.
// `useSnapLayouts` gives `maximizeRef` and `maximizeState`, the two props of `WindowControls` for it. The plain
// skeleton of a Tauri app has no such command: without one, an app does not use this.
import { useEffect, useMemo, useRef, useState } from 'react'
import { actsWhen, apiOf, listening, reporter, run, type TauriApi, type TauriErrorHandler } from './api'
import { readHost } from './host'

/** A rectangle in physical pixels. */
export type CaptionRect = { x: number; y: number; width: number; height: number }

export type SnapLayoutsOptions = {
  /** The app's command that takes the maximize button's rectangle (Imago's is `window_caption_maximize`). */
  command: string
  /** The app's event with `{ hover, pressed }` of that button (Imago's is `caption-maximize`). */
  event: string
  /** Where a refused or failed call goes: `snapLayouts` for the command, `listen` for the event. */
  onError?: TauriErrorHandler | undefined
  /** Default: in a window of its own (`readHost().ownWindow`), or when `api` is given. */
  enabled?: boolean | undefined
  /** What to call instead of Tauri's API (a fake `invoke` and `listen` in a test). */
  api?: Partial<TauriApi> | undefined
}

/** The props of `WindowControls` for Snap Layouts. */
export type SnapLayoutsWiring = {
  maximizeRef: (button: HTMLButtonElement | null) => void
  maximizeState: 'hover' | 'pressed' | undefined
}

const NONE = '0 0 0 0'

/** Keeps the command told where `button` is. Returns the function that stops it. */
function watchRect(button: HTMLElement, send: (rect: CaptionRect) => Promise<unknown>, fail: TauriErrorHandler): () => void {
  const win = button.ownerDocument.defaultView
  if (!win) return () => {}
  let sent = ''
  let frame = 0
  const tell = (rect: CaptionRect, key: string) => {
    sent = key
    run(() => send(rect)).catch((error: unknown) => {
      if (sent === key) sent = ''
      fail('snapLayouts', error)
    })
  }
  const measure = () => {
    frame = 0
    const box = button.getBoundingClientRect()
    const ratio = win.devicePixelRatio || 1
    const rect = { x: Math.round(box.left * ratio), y: Math.round(box.top * ratio), width: Math.round(box.width * ratio), height: Math.round(box.height * ratio) }
    const key = `${rect.x} ${rect.y} ${rect.width} ${rect.height}`
    if (key !== sent) tell(rect, key)
  }
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(measure)
  }
  const resend = () => {
    sent = ''
    schedule()
  }
  const sizes = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(schedule) : undefined
  sizes?.observe(button)
  win.addEventListener('resize', resend)
  // A change of zoom changes the pixel ratio: the query is for the ratio of now, and is asked again after each change.
  let stopRatio = () => {}
  const watchRatio = () => {
    if (typeof win.matchMedia !== 'function') return
    const query = win.matchMedia(`(resolution: ${win.devicePixelRatio || 1}dppx)`)
    const changed = () => {
      schedule()
      watchRatio()
    }
    query.addEventListener('change', changed, { once: true })
    stopRatio = () => query.removeEventListener('change', changed)
  }
  watchRatio()
  schedule()
  return () => {
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    sizes?.disconnect()
    win.removeEventListener('resize', resend)
    stopRatio()
    if (sent !== '' && sent !== NONE) tell({ x: 0, y: 0, width: 0, height: 0 }, NONE)
  }
}

/** Snap Layouts over the page's maximize button, through the app's command and event. */
export function useSnapLayouts(options: SnapLayoutsOptions): SnapLayoutsWiring {
  const latest = useRef(options)
  latest.current = options
  const enabled = actsWhen(options.enabled, options.api, () => readHost().ownWindow)
  const [button, setButton] = useState<HTMLButtonElement | null>(null)
  const [state, setState] = useState<'hover' | 'pressed' | undefined>(undefined)
  const fail = useMemo(() => reporter(() => latest.current.onError), [])
  const { command, event } = options

  useEffect(() => {
    if (!enabled || !button) return
    const api = apiOf(latest.current.api)
    return watchRect(button, (rect) => api.invoke(command, rect), fail)
  }, [enabled, button, command, fail])

  useEffect(() => {
    if (!enabled) return
    const api = apiOf(latest.current.api)
    const stop = listening(
      () => api.listen<{ hover?: boolean; pressed?: boolean } | null>(event, ({ payload }) => setState(payload?.pressed ? 'pressed' : payload?.hover ? 'hover' : undefined)),
      'listen',
      fail,
    )
    return () => {
      stop()
      setState(undefined)
    }
  }, [enabled, event, fail])

  return { maximizeRef: setButton, maximizeState: enabled ? state : undefined }
}
