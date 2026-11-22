// What makes a page behave as the window of a program and not as a page in a browser. An app that runs in a window of
// its own (no address bar, no browser around it) calls `useDesktopGuard()` once; in a browser tab it does not.
// - The keys a browser engine keeps for itself do nothing: reload, print, find, history, the page's source, the
//   developer tools, back and forward. They are refused in the capture phase and not stopped, so the app's own handler
//   for the same key (Ctrl+F for its search, Ctrl+S in its editor) still runs.
// - The engine's own menu on a right press is refused, except where it is useful: in a field (it offers editing) and
//   over selected text (Copy). An app's own context menu is not touched: it shows its own.
// - The back and forward buttons of a mouse do not navigate.
// - A picture or a link is not dragged out of the window, unless the app made it draggable.
// `ownKeysIn` names the places that run their own keys and menus (a terminal, a code editor): there nothing is refused.
// The technique is the one Imago's windows use (its `guardDesktop`); this is the toolkit's own writing of it. The
// native side of the same guard (navigation limited to the app's origin, new windows refused) is the app's host.
import { useEffect } from 'react'

export type DesktopGuardOptions = {
  /** A selector for the places that keep the engine's keys and menu: `'.xterm, .cm-editor'`. */
  ownKeysIn?: string | undefined
}

type Keys = { readonly key: string; readonly ctrlKey: boolean; readonly altKey: boolean; readonly metaKey: boolean; readonly shiftKey: boolean }

const ALONE = new Set(['F5', 'F7', 'F12', 'BrowserBack', 'BrowserForward', 'BrowserRefresh'])
const WITH_ALT = new Set(['ArrowLeft', 'ArrowRight', 'Home'])
// Reload, print, source, find, find next, save, history, downloads, bookmark, open, new window.
const WITH_CTRL = new Set(['r', 'p', 'u', 'f', 'g', 's', 'h', 'j', 'd', 'o', 'n'])
// Hard reload, find previous, and the three ways into the developer tools.
const WITH_CTRL_SHIFT = new Set(['r', 'g', 'i', 'j', 'c'])
const FIELDS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/** True for a key combination a browser engine acts on by itself. */
export function isBrowserKey({ key, ctrlKey, altKey, metaKey, shiftKey }: Keys): boolean {
  if (metaKey) return false
  if (ALONE.has(key)) return !altKey
  if (altKey) return !ctrlKey && WITH_ALT.has(key)
  if (!ctrlKey || key.length !== 1) return false
  return (shiftKey ? WITH_CTRL_SHIFT : WITH_CTRL).has(key.toLowerCase())
}

const within = (event: Event, selector: string): boolean => {
  const target = event.target as { closest?: (s: string) => unknown } | null
  return target !== null && typeof target.closest === 'function' && target.closest(selector) !== null
}

/** Puts the guard on a document and returns the function that takes it away. */
export function guardDesktop(doc: Document, options: DesktopGuardOptions = {}): () => void {
  const own = options.ownKeysIn
  const keys = (event: KeyboardEvent) => {
    if (isBrowserKey(event) && !(own && within(event, own))) event.preventDefault()
  }
  const menu = (event: MouseEvent) => {
    if (within(event, own ? `${FIELDS}, ${own}` : FIELDS)) return
    const selection = doc.getSelection?.()
    const overSelection = !!selection && !selection.isCollapsed && event.target instanceof Node && selection.containsNode(event.target, true)
    if (!overSelection) event.preventDefault()
  }
  const sideButtons = (event: MouseEvent) => {
    if (event.button === 3 || event.button === 4) event.preventDefault()
  }
  const drag = (event: DragEvent) => {
    if (within(event, 'img, a') && !within(event, '[draggable="true"]')) event.preventDefault()
  }
  doc.addEventListener('keydown', keys, { capture: true })
  doc.addEventListener('contextmenu', menu)
  doc.addEventListener('mouseup', sideButtons)
  doc.addEventListener('dragstart', drag)
  return () => {
    doc.removeEventListener('keydown', keys, { capture: true })
    doc.removeEventListener('contextmenu', menu)
    doc.removeEventListener('mouseup', sideButtons)
    doc.removeEventListener('dragstart', drag)
  }
}

/** The guard for as long as the component is mounted and `active` is true (an app passes «am I in a window of my own»). */
export function useDesktopGuard(active = true, options: DesktopGuardOptions = {}): void {
  const own = options.ownKeysIn
  useEffect(() => {
    if (!active || typeof document === 'undefined') return
    return guardDesktop(document, { ownKeysIn: own })
  }, [active, own])
}
