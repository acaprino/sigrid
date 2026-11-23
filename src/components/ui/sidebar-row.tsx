// A line of the sidebar that is not a place: what sits in its `header` or its `footer`, as the account (an avatar and a
// name) or a switch of what the rows show (a check box and its words). It lines up with the rows of the navigation
// (their padding, at every density) and keeps their height, 44px with a finger; its words take the sidebar's ink and
// are cut with an ellipsis; the actions on the whole sidebar (a new folder, close all) sit at its end. It is not a
// button: what can be pressed in it is the controls it holds.
import type * as React from "react"

export type SidebarRowProps = {
  /** Before the words: an avatar, a check box, an icon. */
  leading?: React.ReactNode
  /** At the end: the actions on the whole sidebar, small quiet buttons with their name. */
  end?: React.ReactNode
  /** The words, on one line. */
  children?: React.ReactNode
}

/** A row of the sidebar's head or foot: the account, a switch of the view, the name of the list with its actions. */
function SidebarRow({ leading, end, children }: SidebarRowProps) {
  return (
    <div data-slot="sidebar-row" className="flex min-h-(--control-xs) min-w-0 items-center gap-2 px-(--row-pad) py-1 text-sm text-sidebar-ink pointer-coarse:min-h-11">
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {end ? <span className="flex shrink-0 items-center gap-1">{end}</span> : null}
    </div>
  )
}

export { SidebarRow }
