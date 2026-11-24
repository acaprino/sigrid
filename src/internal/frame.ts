// The frame around, for the parts that change with it: `AppShell` (src/layout/app-shell.tsx) gives it, and what is
// below the frame reads it without importing the frame (a `Page`, a primitive, keeps the frame's margins only inside
// one). The frame hands both out again under the same names.
import { createContext } from 'react'

export type AppShellLayout = {
  /** `full`: the user's choice holds. `rail`: forced to its icons. `drawer`: out of the layout, opened over the page. */
  sidebar: 'full' | 'rail' | 'drawer'
  /** `docked` beside the content, or a `drawer` over its end. */
  inspector: 'docked' | 'drawer'
}

/** The frame around, for the parts that change with its width. Absent outside an `AppShell`. */
export const AppShellContext = createContext<AppShellLayout | undefined>(undefined)
