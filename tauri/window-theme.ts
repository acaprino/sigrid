// The theme of the window, opt-in: the scheme the page draws (`light` or `dark`) told to the window, so that what the
// system draws around and behind the page (the frame on a computer that keeps one, a backdrop) matches it. It goes
// through the window's `setTheme`, or, when the app names a command of its own, to that command with
// `{ theme: 'light' | 'dark' }` (`args` gives other arguments). It is sent when the scheme changes, not at each draw;
// a send that fails goes to `onError` and the next change tries again.
import { useEffect, useMemo, useRef } from 'react'
import { actsWhen, apiOf, reporter, run, type TauriApi, type TauriErrorHandler } from './api'
import { readHost } from './host'

export type WindowThemeOptions = {
  /** The app's command that takes the theme. Without it, the window's own `setTheme`. */
  command?: string | undefined
  /** The arguments of `command` for a scheme. Default `{ theme: scheme }`. */
  args?: ((scheme: 'light' | 'dark') => Record<string, unknown>) | undefined
  /** Where a refused or failed send goes, as `setTheme`. */
  onError?: TauriErrorHandler | undefined
  /** Default: in a window of its own (`readHost().ownWindow`), or when `api` is given. */
  enabled?: boolean | undefined
  /** What to call instead of Tauri's API (a fake window or `invoke` in a test). */
  api?: Partial<TauriApi> | undefined
}

/** Tells the window the scheme the page draws. */
export function useWindowTheme(scheme: 'light' | 'dark', options: WindowThemeOptions = {}): void {
  const latest = useRef(options)
  latest.current = options
  const enabled = actsWhen(options.enabled, options.api, () => readHost().ownWindow)
  const fail = useMemo(() => reporter(() => latest.current.onError), [])
  const { command } = options

  useEffect(() => {
    if (!enabled) return
    const { api, args } = latest.current
    const tauri = apiOf(api)
    const sent = command ? run(() => tauri.invoke(command, args ? args(scheme) : { theme: scheme })) : run(() => tauri.window()).then((win) => win.setTheme(scheme))
    sent.catch((error: unknown) => fail('setTheme', error))
  }, [enabled, scheme, command, fail])
}
