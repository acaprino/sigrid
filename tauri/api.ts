// The calls the `./tauri` entry makes to a Tauri window, and the one place that loads Tauri's API. Each part of the
// entry takes an `api` to call instead (a test passes a fake window, webview, `invoke` or `listen`); what it leaves out
// is `tauriApi`, which imports `@tauri-apps/api` only inside its functions, the first time one is called. So a page in
// a browser that imports the entry loads nothing of Tauri. The types are the entry's own: they name no type of
// `@tauri-apps/api`, and `tauriApi` checks that Tauri's window and webview fit them.

/** The function that stops listening. Tauri's own returns a promise. */
export type Unlisten = () => unknown

/** The window as the entry calls it: what `getCurrentWindow()` gives, or a fake one. */
export type TauriWindow = {
  minimize(): Promise<unknown>
  toggleMaximize(): Promise<unknown>
  close(): Promise<unknown>
  isMaximized(): Promise<boolean>
  /** Calls `handler` at each change of the window's size, until the returned function is called. */
  onResized(handler: () => void): Promise<Unlisten>
  setTheme(theme: 'light' | 'dark' | null): Promise<unknown>
}

/** The webview as the entry calls it: what `getCurrentWebview()` gives, or a fake one. */
export type TauriWebview = {
  /** 1 is 100%. */
  setZoom(scale: number): Promise<unknown>
}

/** What the entry calls in Tauri. */
export type TauriApi = {
  window(): TauriWindow | Promise<TauriWindow>
  webview(): TauriWebview | Promise<TauriWebview>
  /** A command of the app's native side. */
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>
  /** An event the native side sends. */
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<Unlisten>
}

/** The calls that can fail, as `onError` names them. */
export type TauriCall =
  | 'minimize'
  | 'toggleMaximize'
  | 'close'
  | 'isMaximized'
  | 'onResized'
  | 'unlisten'
  | 'setZoom'
  | 'snapLayouts'
  | 'listen'
  | 'setTheme'

/**
 * Where a refused or failed call goes: which call, and the error. A window that cannot be reached at all (no Tauri,
 * a missing permission) is told for each call that needed it.
 */
export type TauriErrorHandler = (what: TauriCall, error: unknown) => void

/** Tauri's own API, imported the first time a function is called. */
export const tauriApi: TauriApi = {
  window: async () => (await import('@tauri-apps/api/window')).getCurrentWindow(),
  webview: async () => (await import('@tauri-apps/api/webview')).getCurrentWebview(),
  invoke: async (command, args) => (await import('@tauri-apps/api/core')).invoke(command, args),
  listen: async (event, handler) => (await import('@tauri-apps/api/event')).listen(event, handler),
}

/** The app's API laid over Tauri's: what it gives is called, what it leaves out is Tauri's. */
export const apiOf = (api: Partial<TauriApi> | undefined): TauriApi => ({ ...tauriApi, ...api })

/** Runs a call as a promise: a throw becomes a rejection. */
export const run = <T>(call: () => T | PromiseLike<T>): Promise<T> => new Promise<T>((resolve) => resolve(call()))

/** The app's `onError`, read when a call fails. A reporter that throws itself does not turn a click into an uncaught error. */
export function reporter(get: () => TauriErrorHandler | undefined): TauriErrorHandler {
  return (what, error) => {
    try {
      get()?.(what, error)
    } catch {
      // Nothing is left to tell.
    }
  }
}

/**
 * Starts listening and gives the function that stops it. It stops whether the listening began already or begins
 * later (a component unmounted before Tauri answered); a listening that fails is told as `what`.
 */
export function listening(start: () => Promise<Unlisten>, what: TauriCall, fail: TauriErrorHandler): () => void {
  const began = run(start)
  began.catch((error: unknown) => fail(what, error))
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    began.then(
      (unlisten) => run(unlisten).catch((error: unknown) => fail('unlisten', error)),
      () => {},
    )
  }
}

/** Whether a part acts: as the app says, or when the app gives an API, or in a window of its own. */
export const actsWhen = (enabled: boolean | undefined, api: Partial<TauriApi> | undefined, ownWindow: () => boolean): boolean => enabled ?? (api !== undefined || ownWindow())
