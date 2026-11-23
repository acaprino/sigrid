// Where the page runs, and the mark of the bar that moves the window. Both are plain reading: nothing of Tauri is
// called or loaded, so they work in a browser and on a server too.
// - A page in a Tauri window finds `__TAURI_INTERNALS__` on its window; a page in a browser does not.
// - A window of its own is Tauri on a computer: its decorations are off, and the app draws the bar and its three
//   buttons (`TitleBar` with `WindowControls`). On a phone the system draws its own.
// - `DRAG_REGION` goes to `TitleBar`'s `dragProps`: Tauri moves the window from a press on an element that carries
//   it, and maximizes it with a double press. It counts only on the element under the pointer, which is why the bar
//   hands it to its toolbar, its title and its spacers.

/** Where the page runs. */
export type TauriHost = {
  /** In a Tauri window. */
  readonly native: boolean
  /** On a phone or a tablet, in Tauri or in a browser. */
  readonly mobile: boolean
  /** In a window of its own on a computer (Tauri, not on a phone): the app draws the window's bar and buttons. */
  readonly ownWindow: boolean
}

type Scope = { readonly __TAURI_INTERNALS__?: unknown; readonly navigator?: { readonly userAgent?: string; readonly maxTouchPoints?: number } }

/**
 * Reads where the page runs. `scope` is the page's window (a test passes its own); on a server there is none and all
 * three are false.
 */
export function readHost(scope: object | undefined = typeof window === 'undefined' ? undefined : window): TauriHost {
  if (scope === undefined || scope === null) return { native: false, mobile: false, ownWindow: false }
  const page = scope as Scope
  const native = '__TAURI_INTERNALS__' in page
  const agent = page.navigator?.userAgent ?? ''
  // An iPad asks for the pages of a computer and says «Macintosh»: it is told apart by its touch points.
  const mobile = /android|iphone|ipad|ipod/i.test(agent) || (/macintosh/i.test(agent) && (page.navigator?.maxTouchPoints ?? 0) > 1)
  return { native, mobile, ownWindow: native && !mobile }
}

/** The attribute Tauri reads to move the window, for `TitleBar dragProps`. */
export const DRAG_REGION = { 'data-tauri-drag-region': '' } as const
