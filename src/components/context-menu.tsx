// A menu on a thing, opened with the right button or with the Menu key (Shift+F10): the actions of a row, a tab, a
// file, listed once and found where the pointer is. It wraps what it is for (a row, a list, a pane, a tab) and lays no box
// of its own around it (a `div` with `display: contents`), so the thing keeps its place. The entries are data: an action (a label, its icon, its
// key as a hint, `destructive` for the one that deletes), a submenu, a heading, a separator. The card and the rows are
// `DropdownMenu`'s, so the menu is the one of every other: the arrows, Home and End, a letter, Enter, Escape, which brings
// the focus back to where it was.
// - The pointer's menu opens at the point pressed; the keyboard's, under the thing that has the focus. A text field and
//   its kin keep the system's own menu (copy, paste). A menu inside a menu is the inner one's: the outer one leaves a
//   press that was taken.
// - The entries are read when the menu opens (`items` may be a function, given the element pressed or in focus), so a menu
//   always says what the thing is now; and one menu around a whole list can read which row it is on from that element.
// - An action is also a button somewhere the person can reach without the menu: a menu is a shortcut, never the only
//   way (a touch screen has no right button).
import * as React from "react"
import { Icon, type IconName } from "../icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../primitives/dropdown-menu"
import { useWords } from "../words"

/** One action of the menu. */
export type ContextMenuAction = {
  /** What it does, in a verb («Rename»). */
  label: string
  /** Its icon, by one of Sigrid's names; without one the row keeps the empty slot (R6). */
  icon?: IconName | undefined
  /** The key that does the same outside the menu, as a hint («F2», «Del»). */
  shortcut?: string | undefined
  /** Not available now: it stays, dim, so the menu does not change shape. */
  disabled?: boolean | undefined
  /** The one that deletes: in the red of every delete. */
  destructive?: boolean | undefined
  /** Chosen (click, Enter or Space); the menu closes. */
  onSelect: () => void
}

/** A row that opens a menu of its own beside it. */
export type ContextMenuSubmenu = {
  label: string
  icon?: IconName | undefined
  disabled?: boolean | undefined
  items: readonly ContextMenuEntry[]
}

/** A heading over the entries that follow («Move to…»). */
export type ContextMenuHeading = { heading: string }

/** An entry of the menu: an action, a submenu, a heading, or `"separator"` between groups. */
export type ContextMenuEntry = ContextMenuAction | ContextMenuSubmenu | ContextMenuHeading | "separator"

export type ContextMenuProps = {
  /**
   * The entries, or a function that gives them when the menu opens, told the element that was pressed (or has the focus):
   * around a whole list it says which row the menu is for. An empty list opens nothing.
   */
  items: readonly ContextMenuEntry[] | ((target: Element) => readonly ContextMenuEntry[])
  /** The menu's name for screen readers («Actions for the session»). Default: the toolkit's word. */
  label?: string | undefined
  /** No menu: the press and the key go where they would have gone. */
  disabled?: boolean | undefined
  /** The menu opened or closed. */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** The card enters with a short fade (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  /** What the menu is for: any element or several. */
  children?: React.ReactNode
}

type Opened = { x: number; y: number; entries: readonly ContextMenuEntry[] }

/** A point as the rectangle a menu is placed against. */
function pointAt(x: number, y: number) {
  return { getBoundingClientRect: () => ({ x, y, width: 0, height: 0, top: y, left: x, right: x, bottom: y, toJSON: () => ({}) }) }
}

/** Where a text is typed the system's own menu is the right one (copy, paste, spelling). */
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

function entriesOf(entries: readonly ContextMenuEntry[]): React.ReactNode {
  return entries.map((entry, at) => {
    if (entry === "separator") return <DropdownMenuSeparator key={at} />
    if ("heading" in entry) return <DropdownMenuLabel key={at}>{entry.heading}</DropdownMenuLabel>
    if ("items" in entry) {
      return (
        <DropdownMenuSub key={at}>
          <DropdownMenuSubTrigger disabled={entry.disabled === true}>
            <Icon name={entry.icon ?? ""} />
            {entry.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>{entriesOf(entry.items)}</DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    }
    return (
      <DropdownMenuItem key={at} disabled={entry.disabled === true} variant={entry.destructive ? "destructive" : "default"} onSelect={() => entry.onSelect()}>
        <Icon name={entry.icon ?? ""} />
        {entry.label}
        {entry.shortcut ? <DropdownMenuShortcut>{entry.shortcut}</DropdownMenuShortcut> : null}
      </DropdownMenuItem>
    )
  })
}

function ContextMenu({ items, label, disabled = false, onOpenChange, animated, children }: ContextMenuProps) {
  const words = useWords()
  const [opened, setOpened] = React.useState<Opened | null>(null)
  // Where the focus was, to give it back when the menu closes.
  const before = React.useRef<HTMLElement | null>(null)
  const anchor = React.useMemo(() => (opened ? pointAt(opened.x, opened.y) : undefined), [opened?.x, opened?.y])

  const open = (x: number, y: number, target: Element) => {
    const entries = typeof items === "function" ? items(target) : items
    if (entries.length === 0) return
    before.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpened({ x, y, entries })
    onOpenChange?.(true)
  }
  const close = () => {
    setOpened(null)
    onOpenChange?.(false)
  }

  // A press or a key inside the card (a portal, which React still bubbles through) is not the thing's.
  const mine = (event: React.SyntheticEvent<HTMLElement>) => event.target instanceof Node && event.currentTarget.contains(event.target)
  const editable = (event: React.SyntheticEvent<HTMLElement>) => event.target instanceof Element && event.target.closest(EDITABLE) !== null

  return (
    <div
      data-slot="context-menu"
      className="contents"
      onContextMenu={(event) => {
        if (disabled || event.defaultPrevented || !mine(event) || editable(event)) return
        event.preventDefault()
        // Open already (a key opened it before the system sent its own event): it stays where it is.
        if (opened) return
        const target = event.target instanceof Element ? event.target : event.currentTarget
        let x = event.clientX
        let y = event.clientY
        // A key's event comes with no place: the thing under the focus is the place.
        if (x === 0 && y === 0) {
          const box = target.getBoundingClientRect()
          x = box.left
          y = box.bottom
        }
        open(x, y, target)
      }}
      onKeyDown={(event) => {
        const key = event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)
        if (!key || disabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !mine(event) || editable(event)) return
        event.preventDefault()
        if (opened || !(event.target instanceof Element)) return
        const box = event.target.getBoundingClientRect()
        open(box.left, box.bottom, event.target)
      }}
    >
      {children}
      <DropdownMenu
        open={opened !== null}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        {opened ? (
          <DropdownMenuContent anchor={anchor} side="bottom" align="start" sideOffset={0} aria-label={label ?? words.contextMenu.label} finalFocus={before} animated={animated}>
            {entriesOf(opened.entries)}
          </DropdownMenuContent>
        ) : null}
      </DropdownMenu>
    </div>
  )
}

export { ContextMenu }
