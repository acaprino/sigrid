// The frame around, for the parts that change with it: `AppShell` (src/layout/app-shell.tsx) gives it, and what is
// below the frame reads it without importing the frame (a `Page`, a primitive, keeps the frame's margins only inside
// one). The frame hands both out again under the same names.
import { createContext } from 'react'
import { FOCUS_RING_INSET } from '../lib/focus'
import { cn } from '../lib/utils'

export type AppShellLayout = {
  /** `full`: the user's choice holds. `rail`: forced to its icons. `drawer`: out of the layout, opened over the page. */
  sidebar: 'full' | 'rail' | 'drawer'
  /** `docked` beside the content, or a `drawer` over its end. */
  inspector: 'docked' | 'drawer'
}

/** The frame around, for the parts that change with its width. Absent outside an `AppShell`. */
export const AppShellContext = createContext<AppShellLayout | undefined>(undefined)

/**
 * What `AppShell frame="sheet"` shares with the parts that sit in its one top row. The frame owns that row: the button
 * that shrinks and widens the sidebar, and the tabs that join the sheet, are drawn there, so the `Sidebar` below keeps
 * no button of its own and reads its form from here. Absent outside such a frame.
 */
export type UnifiedShellState = {
  /** The frame draws the one top row: the sidebar has no head and no button of its own. */
  readonly unifiedTop: boolean
  /** The sidebar is shrunk to its rail: the frame's choice, the sidebar follows it. */
  readonly collapsed: boolean
  /** The frame's button asks for this; where it is missing the sidebar cannot be shrunk by the user. */
  readonly onCollapsedChange?: ((collapsed: boolean) => void) | undefined
  /** The document tabs rise from the top edge of the sheet, as one piece with it. */
  readonly attachedTabs: boolean
  /**
   * The strip of tabs starts where the sheet does (beside the sidebar, or across a sheet as wide as the frame): the first
   * tab's side drops straight into the sheet's side, with no corner. `false` where something stands before the strip
   * (the button that opens the sidebar as a drawer): the first tab curves into the sheet's top line as the others do.
   * Absent: flush.
   */
  readonly flushStart?: boolean | undefined
}

export const UnifiedShellContext = createContext<UnifiedShellState | undefined>(undefined)

/**
 * The button that shrinks and widens the sidebar, one wherever it is drawn: in the `Sidebar` (at its foot or in its
 * head row) and in the one top row of `AppShell frame="sheet"`, on the sidebar's surface. As tall as the smallest
 * control, 44px with a finger; the frame's row disables it where the width forces the rail.
 */
export const SIDEBAR_TOGGLE = cn(
  'flex size-(--control-xs) shrink-0 items-center justify-center rounded-md text-sidebar-mute pointer-coarse:size-11 hover:bg-sidebar-selected/70 hover:text-sidebar-selected-ink disabled:pointer-events-none disabled:opacity-50',
  FOCUS_RING_INSET,
)

/**
 * Where that button starts, from the sidebar's outer edge, as `--sidebar-toggle-inset` on the element that sets this
 * class: over the middle of the rail's icons (the rail is one row and the sidebar's 8px on each side), never less than
 * 8px nor more than 16px. So it is at one place in the column and on the rail (R14), and inside the rail at every
 * density and with a finger (`--control-xs` and `--row-height` are 44px then). The sidebar's head row starts at it
 * less the sidebar's own 8px; the frame's cell over the sidebar at it after the system's buttons (`--titlebar-start`).
 */
// design-check-ignore-next-line dimension-value: the middle of the rail (one row and 8px on each side) less half the button, from 8px to 16px
export const SIDEBAR_TOGGLE_INSET = '[--sidebar-toggle-inset:clamp(0.5rem,(var(--row-height)_+_1rem_-_var(--control-xs))_/_2,1rem)]'
