// The three buttons of a window of its own, wired to the Tauri window: what `useWindowControls` gives is the props of
// the toolkit's `WindowControls`, so an app writes `<WindowControls {...useWindowControls({ onError })} />`.
// Whether the window is maximized is read at once and again at each change of its size; when several answers are on
// their way (a window resized fast) only the last one asked is shown. A refused or failed call goes to `onError`, never
// into an unhandled rejection. The listening stops on unmount, also when Tauri answers after it.
import { useEffect, useMemo, useRef, useState } from 'react'
import { actsWhen, apiOf, listening, reporter, run, type TauriApi, type TauriErrorHandler } from './api'
import { readHost } from './host'

export type WindowControlsOptions = {
  /** Where a refused or failed call goes. Without it a failure is dropped, never thrown. */
  onError?: TauriErrorHandler | undefined
  /** Default: in a window of its own (`readHost().ownWindow`), or when `api` is given. Off, the buttons do nothing. */
  enabled?: boolean | undefined
  /** What to call instead of Tauri's API (a fake window in a test). */
  api?: Partial<TauriApi> | undefined
}

/** The props of `WindowControls`, wired to the window. */
export type WindowControlsWiring = {
  maximized: boolean
  onMinimize: () => void
  onMaximizeToggle: () => void
  onClose: () => void
}

/** The window's three buttons and whether it is maximized, for `WindowControls`. */
export function useWindowControls(options: WindowControlsOptions = {}): WindowControlsWiring {
  const latest = useRef(options)
  latest.current = options
  const enabled = actsWhen(options.enabled, options.api, () => readHost().ownWindow)
  const on = useRef(enabled)
  on.current = enabled
  const [maximized, setMaximized] = useState(false)
  const fail = useMemo(() => reporter(() => latest.current.onError), [])

  const actions = useMemo(() => {
    const act = (what: 'minimize' | 'toggleMaximize' | 'close') => () => {
      if (!on.current) return
      const api = apiOf(latest.current.api)
      run(() => api.window())
        .then((win) => win[what]())
        .catch((error: unknown) => fail(what, error))
    }
    return { onMinimize: act('minimize'), onMaximizeToggle: act('toggleMaximize'), onClose: act('close') }
  }, [fail])

  useEffect(() => {
    if (!enabled) return
    let live = true
    let asked = 0
    const api = apiOf(latest.current.api)
    const current = run(() => api.window())
    // Told by each call that needs the window, below.
    current.catch(() => {})
    const read = () => {
      const mine = ++asked
      current
        .then((win) => win.isMaximized())
        .then(
          (value) => {
            if (live && mine === asked) setMaximized(value)
          },
          (error: unknown) => fail('isMaximized', error),
        )
    }
    read()
    const stop = listening(() => current.then((win) => win.onResized(read)), 'onResized', fail)
    return () => {
      live = false
      stop()
    }
  }, [enabled, fail])

  return { maximized: enabled && maximized, ...actions }
}
