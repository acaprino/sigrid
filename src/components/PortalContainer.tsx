import { createContext, useContext, type ReactNode } from 'react'

const Context = createContext<HTMLElement | null>(null)

/**
 * Where the overlays of this subtree mount: menus, popovers, selects, tooltips and dialogs. By default the page's
 * `document.body`. An app that draws part of its React tree into another document (a popup window, an iframe) wraps
 * that part with the other document's body, so its overlays open there and not in the page that owns the tree.
 */
export function PortalContainerProvider({ container, children }: { container: HTMLElement; children: ReactNode }) {
  return <Context.Provider value={container}>{children}</Context.Provider>
}

/** The element the overlays mount into; `undefined` is the page's body, the primitives' default. */
export const usePortalContainer = (): HTMLElement | undefined => useContext(Context) ?? undefined
