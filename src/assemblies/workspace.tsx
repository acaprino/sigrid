// A tiling area: panes in a split tree, each pane a group of tabs, the person making the layout (a terminal beside the
// code, the code over a log). The app owns the tree, plain data (`WorkspaceNode`, `workspace-model.ts`), and is told of
// every change (`onChange`); the area draws it and what is in each tab is the app's (`renderTab`).
// - Nothing in a tab is lost by moving things: the content of every tab is drawn once, in one flat list keyed by the
//   tab, and placed over the box of its pane; so a tab dragged to another pane, a pane divided or closed around it, keeps
//   its content mounted (a terminal keeps running, a page keeps its state). The tabs that are not shown stay mounted,
//   hidden (`keepMounted="active"` unmounts them). The panes are laid out by percent, from the weights, with no
//   measuring; only a drag of a divider measures.
// - A divider is a window splitter like `SplitPane`'s: one tab stop, `role="separator"` with the share of its first
//   neighbour (`aria-valuenow`), the pointer moves it and the pane follows, the arrows move it 16px (Shift, 64px), Home and
//   End take it to the least each neighbour keeps (`minSize`), a double press shares the two alike. The arrows follow
//   the panes in a language written from the right. The weights are told once, when the pointer is let go.
// - A tab is chosen with a press or the arrows (the strip is `Tabs`, so one tab stop and Home/End), closed with its ×,
//   Delete or a middle press (`onCloseTab` lets the app ask first), and put in order or in another pane by hand: a
//   drag shows where it will go (a mark in a strip to put it in that place, the middle of a pane to join it, a side of a
//   pane to divide it there, with a box that says so; Escape drops it). The same is done without a pointer: Shift+←/→ puts
//   it earlier or later, Alt+Shift+arrow divides the pane in that direction (a pane's only tab joins the pane there),
//   and the tab's menu (right button, Menu key) lists them with Close; a polite status says where it went. A strip that
//   is longer than the pane scrolls and brings the chosen tab into sight.
// - A pane is the focused one while the person works in it (`focusedId`, told with `onFocusedChange`); with
//   `onMaximizedChange` its bar has a button that fills the whole area with it, the others stay mounted.
import * as React from "react"
import { Icon } from "../icons"
import { Button } from "../primitives/button"
import { Tabs, TabsList, TabsTrigger } from "../primitives/tabs"
import { Dot } from "../primitives/dot"
import { Tooltip } from "../primitives/tooltip"
import { ContextMenu, type ContextMenuEntry } from "../components/context-menu"
import { steadyLabel } from "../internal/steady-label"
import { FOCUS_RING_INSET } from "../lib/focus"
import { cn } from "../lib/utils"
import { useWords } from "../words"
import {
  closeWorkspaceTab,
  findWorkspaceTab,
  layoutWorkspace,
  moveWorkspaceTab,
  normalizeWorkspace,
  resizeWorkspace,
  shiftWorkspaceWeights,
  workspaceGroups,
  workspaceMinimum,
  workspaceNeighbor,
  workspaceNodeAt,
  workspaceZone,
  activateWorkspaceTab,
  type WorkspaceDrop,
  type WorkspaceEdge,
  type WorkspaceNode,
  type WorkspacePath,
  type WorkspaceRect,
  type WorkspaceSash,
  type WorkspaceTab,
  type WorkspaceTabs,
} from "./workspace-model"

/** A key moves a divider this far, in px; with Shift, four times (as `SplitPane`'s). */
const STEP = 16
/** How far the pointer goes with a tab before it is a drag and not a press, in px. */
const DRAG_START = 6

/** What a tab's content is told about its place. */
export type WorkspaceTabState = {
  /** The tab is the one its pane shows. */
  active: boolean
  /** It is on screen: shown by its pane, and its pane is not hidden behind a maximized one. A terminal fits itself when this turns true. */
  visible: boolean
  /** Its pane is the one the person works in. */
  focused: boolean
  groupId: string
}

export type WorkspaceProps<T extends WorkspaceTab = WorkspaceTab> = {
  /** The layout: panes and their tabs. The app keeps it and passes what `onChange` gives. */
  tree: WorkspaceNode<T>
  /** The person changed the layout: a tab chosen, closed, moved or divided off, a divider moved. Not told for what the app itself did to the tree. */
  onChange: (tree: WorkspaceNode<T>) => void
  /** The content of a tab. It is called for every tab, shown or not (see `keepMounted`), so keep it light and let the content keep its own state. */
  renderTab: (tab: T, state: WorkspaceTabState) => React.ReactNode
  /** The name of the area for screen readers («Terminals»). */
  label: string
  /** `all` (the default): every tab stays mounted, hidden when it is not shown. `active`: only the shown tab of each pane is drawn. */
  keepMounted?: "all" | "active" | undefined
  /** What a pane with no tab shows. Default: the toolkit's sentence, and a button when `onAddTab` is given. */
  empty?: React.ReactNode | ((groupId: string) => React.ReactNode) | undefined
  /** The bar of each pane has a button that adds a tab; this is told which pane. The app makes the tab and puts it in the tree (`addWorkspaceTab`). */
  onAddTab?: ((groupId: string) => void) | undefined
  /** A tab's close was asked (its ×, Delete, a middle press, the menu). Given, the app decides (it may ask first, and closes with `closeWorkspaceTab`); absent, the tab closes. */
  onCloseTab?: ((tab: T, groupId: string) => void) | undefined
  /** The app's own entries of a tab's menu, above the toolkit's. */
  tabMenu?: ((tab: T, groupId: string) => readonly ContextMenuEntry[]) | undefined
  /** The pane the person works in, when the app keeps it; otherwise the area keeps it (the first at first). */
  focusedId?: string | null | undefined
  /** The person began to work in another pane (a press or the focus went in). */
  onFocusedChange?: ((groupId: string) => void) | undefined
  /** The pane that fills the whole area, `null` for none, when the app keeps it. With `onMaximizedChange` each bar has the button. */
  maximizedId?: string | null | undefined
  onMaximizedChange?: ((groupId: string | null) => void) | undefined
  /** The least width and height of a pane, in px, a divider keeps. Default 160 by 120. */
  minSize?: { width?: number | undefined; height?: number | undefined } | undefined
  /** Makes the id of a pane the person divides off. Default: `pane-1`, `pane-2`… the first that the tree does not have. */
  newGroupId?: (() => string) | undefined
  /** The chosen tab's tint slides to a new tab, and the card of a menu and a hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/** Where a dragged tab would land, and what the box that shows it says; in px from the start and top of the area. */
type Preview = { x: number; y: number; width: number; height: number; label: string | null }
type Drag = { title: string; x: number; y: number; preview: Preview | null }
type Gesture = { tabId: string; title: string; groupId: string; pointerId: number; x: number; y: number; started: boolean; drop: WorkspaceDrop | null }

type TabContentProps<T extends WorkspaceTab> = WorkspaceTabState & { tab: T; render: (tab: T, state: WorkspaceTabState) => React.ReactNode }

/**
 * The app's content of a tab. It is drawn again only when the app's tree, its `renderTab` or the tab's state change, not
 * when the area itself moves (a divider being dragged, a tab being dragged, the ghost): the content of every tab is on the
 * page, and a terminal should not be asked to draw at the rate of the pointer.
 */
function TabContentImpl<T extends WorkspaceTab>({ tab, render, active, visible, focused, groupId }: TabContentProps<T>) {
  return <>{render(tab, { active, visible, focused, groupId })}</>
}
const TabContent = React.memo(TabContentImpl) as typeof TabContentImpl

/** The box of a node as the variables the classes read: a percent of the area. */
function place(rect: WorkspaceRect): React.CSSProperties {
  const pc = (n: number) => `${Math.round(n * 1e6) / 1e4}%`
  return { "--ws-x": pc(rect.x), "--ws-y": pc(rect.y), "--ws-w": pc(rect.width), "--ws-h": pc(rect.height) } as React.CSSProperties
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`

/** The arrow keys and the edge each divides toward; `start` and `end` follow the language. */
function edgeOf(key: string, rtl: boolean): WorkspaceEdge | null {
  if (key === "ArrowLeft") return rtl ? "end" : "start"
  if (key === "ArrowRight") return rtl ? "start" : "end"
  if (key === "ArrowUp") return "top"
  if (key === "ArrowDown") return "bottom"
  return null
}

/** The id a tab's strip, its button and its panel are known by: the app's id without what an `id` cannot hold. */
const safe = (id: string) => id.replace(/\s+/g, "_")

function Workspace<T extends WorkspaceTab = WorkspaceTab>({
  tree,
  onChange,
  renderTab,
  label,
  keepMounted = "all",
  empty,
  onAddTab,
  onCloseTab,
  tabMenu,
  focusedId,
  onFocusedChange,
  maximizedId,
  onMaximizedChange,
  minSize,
  newGroupId,
  animated,
}: WorkspaceProps<T>) {
  const all = useWords()
  const words = all.workspace
  const hint = all.splitPane.hint
  const uid = React.useId()
  const root = React.useRef<HTMLDivElement>(null)
  const canvas = React.useRef<HTMLDivElement>(null)

  const normal = React.useMemo(() => normalizeWorkspace(tree), [tree])
  // A divider being dragged: the weights it has now, shown before the app is told.
  const [live, setLive] = React.useState<{ path: WorkspacePath; boundary: number; weights: number[] } | null>(null)
  const shown = React.useMemo(() => (live ? resizeWorkspace(normal, live.path, live.weights) : normal), [normal, live])
  const groups = workspaceGroups(shown)
  const maximized = maximizedId !== undefined && maximizedId !== null && groups.some((g) => g.id === maximizedId) ? maximizedId : null
  const layout = React.useMemo(() => layoutWorkspace(shown), [shown])
  const [ownFocused, setOwnFocused] = React.useState<string | null>(null)
  const focusedWanted = focusedId === undefined ? ownFocused : focusedId
  const focused = groups.some((g) => g.id === focusedWanted) ? focusedWanted : (groups[0]?.id ?? null)
  const [drag, setDrag] = React.useState<Drag | null>(null)
  const [said, setSaid] = React.useState("")

  // The tabs of every group, by id; and the order their content is drawn in. React keeps a node where it is as long as
  // its place among its brothers does not change, and a node taken out and put back in the page (an iframe, a view that
  // is not a React part) starts again: so the order here only grows, whatever the tree does.
  const tabs = new Map<string, { tab: T; group: WorkspaceTabs<T> }>()
  for (const group of groups) for (const tab of group.tabs) tabs.set(tab.id, { tab, group })
  const order = React.useRef<string[]>([])
  order.current = [...order.current.filter((id) => tabs.has(id)), ...[...tabs.keys()].filter((id) => !order.current.includes(id))]

  // Read by what runs outside a render (the listeners of a drag), so it always sees the tree as it is.
  const latest = React.useRef({ normal, layout, maximized, onChange })
  latest.current = { normal, layout, maximized, onChange }
  const counter = React.useRef(0)
  const freshGroupId = (): string => {
    if (newGroupId) return newGroupId()
    const taken = new Set(workspaceGroups(latest.current.normal).map((g) => g.id))
    let id: string
    do id = `pane-${++counter.current}`
    while (taken.has(id))
    return id
  }

  const rtl = () => (root.current ? window.getComputedStyle(root.current).direction === "rtl" : false)
  const focusGroup = (groupId: string) => {
    if (groupId === focused) return
    if (focusedId === undefined) setOwnFocused(groupId)
    onFocusedChange?.(groupId)
  }

  // After a change made with a key the person is still on the tab: the button comes back with it.
  const refocus = React.useRef<string | null>(null)
  /** The tab to put the focus on after the change that is being made. It lasts for the event: a change the app does not make leaves the focus alone. */
  const wantFocus = (id: string | null) => {
    refocus.current = id
    setTimeout(() => {
      if (refocus.current === id) refocus.current = null
    }, 0)
  }
  React.useEffect(() => {
    const id = refocus.current
    if (id === null) return
    refocus.current = null
    for (const el of root.current?.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]') ?? []) {
      if (el.dataset["tabId"] === id) el.focus({ preventScroll: true })
    }
  })

  const changed = (next: WorkspaceNode<T>) => {
    if (next !== latest.current.normal) latest.current.onChange(next)
  }

  const closeTab = (tab: T, group: WorkspaceTabs<T>, byKey = false) => {
    if (tab.closable === false) return
    if (onCloseTab) {
      onCloseTab(tab, group.id)
      return
    }
    if (byKey) {
      // The tab that takes its place has the focus.
      const at = group.tabs.findIndex((t) => t.id === tab.id)
      wantFocus((group.tabs[at + 1] ?? group.tabs[at - 1])?.id ?? null)
    }
    changed(closeWorkspaceTab(latest.current.normal, tab.id))
  }

  const placeOf = (groupId: string) => workspaceGroups(latest.current.normal).findIndex((g) => g.id === groupId) + 1

  /** Put a tab in order, or divide its pane (or join the one beside it), as a key or the menu asks. */
  const reorder = (tab: T, group: WorkspaceTabs<T>, step: -1 | 1) => {
    const at = group.tabs.findIndex((t) => t.id === tab.id)
    const to = at + step
    if (to < 0 || to >= group.tabs.length) return
    const next = moveWorkspaceTab(latest.current.normal, tab.id, { groupId: group.id, index: step < 0 ? to : to + 1 })
    if (next === latest.current.normal) return
    wantFocus(tab.id)
    setSaid(words.reordered(tab.title, to + 1, group.tabs.length))
    changed(next)
  }
  const divide = (tab: T, group: WorkspaceTabs<T>, edge: WorkspaceEdge) => {
    const now = latest.current.normal
    let drop: WorkspaceDrop | null = null
    if (group.tabs.length > 1) drop = { groupId: group.id, edge, newId: freshGroupId() }
    else {
      const beside = workspaceNeighbor(now, group.id, edge)
      if (beside) drop = { groupId: beside }
    }
    if (!drop) return
    const next = moveWorkspaceTab(now, tab.id, drop)
    if (next === now) return
    wantFocus(tab.id)
    const home = findWorkspaceTab(next, tab.id)
    if (home) setSaid(words.moved(tab.title, workspaceGroups(next).findIndex((g) => g.id === home.group.id) + 1))
    changed(next)
  }

  const menuOf = (tab: T, group: WorkspaceTabs<T>): ContextMenuEntry[] => {
    const own = tabMenu?.(tab, group.id) ?? []
    const at = group.tabs.findIndex((t) => t.id === tab.id)
    const can = (edge: WorkspaceEdge) => group.tabs.length > 1 || workspaceNeighbor(latest.current.normal, group.id, edge) !== null
    const left = rtl()
    const entries: ContextMenuEntry[] = [
      ...own,
      ...(own.length > 0 ? (["separator"] as const) : []),
      { label: words.moveEarlier, shortcut: "Shift+←", disabled: at <= 0, onSelect: () => reorder(tab, group, -1) },
      { label: words.moveLater, shortcut: "Shift+→", disabled: at >= group.tabs.length - 1, onSelect: () => reorder(tab, group, 1) },
      "separator",
      { label: words.splitStart, icon: "split", shortcut: "Alt+Shift+←", disabled: !can(left ? "end" : "start"), onSelect: () => divide(tab, group, left ? "end" : "start") },
      { label: words.splitEnd, icon: "split", shortcut: "Alt+Shift+→", disabled: !can(left ? "start" : "end"), onSelect: () => divide(tab, group, left ? "start" : "end") },
      { label: words.splitTop, icon: "split", shortcut: "Alt+Shift+↑", disabled: !can("top"), onSelect: () => divide(tab, group, "top") },
      { label: words.splitBottom, icon: "split", shortcut: "Alt+Shift+↓", disabled: !can("bottom"), onSelect: () => divide(tab, group, "bottom") },
    ]
    if (tab.closable !== false) entries.push("separator", { label: words.close(tab.title), icon: "close", shortcut: "Del", onSelect: () => closeTab(tab, group) })
    return entries
  }

  // ---- The drag of a tab ----

  /** Where a point is in the area, as the drop it means and the box that shows it; null where nothing can be dropped. */
  const hit = (g: Gesture, x: number, y: number): { drop: WorkspaceDrop; preview: Preview } | null => {
    const el = canvas.current
    if (!el) return null
    const box = el.getBoundingClientRect()
    if (!(box.width > 0) || !(box.height > 0)) return null
    const mirrored = rtl()
    const fromStart = (clientX: number) => (mirrored ? box.right - clientX : clientX - box.left)
    const fx = fromStart(x) / box.width
    const fy = (y - box.top) / box.height
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null
    const { normal: now, layout: map, maximized: only } = latest.current
    let found: { id: string; rect: WorkspaceRect } | null = null
    for (const [id, rect] of map.groups) {
      if (only !== null && id !== only) continue
      const r = only === null ? rect : { x: 0, y: 0, width: 1, height: 1 }
      if (fx >= r.x && fx <= r.x + r.width && fy >= r.y && fy <= r.y + r.height) {
        found = { id, rect: r }
        break
      }
    }
    if (!found) return null
    const pane = [...el.querySelectorAll<HTMLElement>('[data-slot="workspace-group"]')].find((p) => p.dataset["groupId"] === found.id)
    const header = pane?.querySelector<HTMLElement>('[data-slot="workspace-header"]')
    const headerHeight = header?.getBoundingClientRect().height ?? 0
    const left = found.rect.x * box.width
    const top = found.rect.y * box.height
    const width = found.rect.width * box.width
    const height = found.rect.height * box.height
    const valid = (drop: WorkspaceDrop) => moveWorkspaceTab(now, g.tabId, drop) !== now
    if (y - box.top - top < headerHeight) {
      // In the strip: the slot is the number of tabs whose middle the pointer has passed.
      const buttons = [...(header?.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]') ?? [])]
      let slot = 0
      for (const button of buttons) {
        const b = button.getBoundingClientRect()
        const middle = b.left + b.width / 2
        if (mirrored ? x < middle : x > middle) slot += 1
      }
      const drop: WorkspaceDrop = { groupId: found.id, index: slot }
      if (!valid(drop)) return null
      const edgeButton = buttons[Math.min(slot, buttons.length - 1)]?.getBoundingClientRect()
      let at = left + 4
      if (edgeButton) {
        const start = slot < buttons.length
        at = mirrored ? box.right - (start ? edgeButton.right : edgeButton.left) : (start ? edgeButton.left : edgeButton.right) - box.left
      }
      return { drop, preview: { x: at - 1, y: top, width: 2, height: headerHeight, label: null } }
    }
    const bodyTop = top + headerHeight
    const bodyHeight = Math.max(height - headerHeight, 1)
    const zone = workspaceZone((fromStart(x) - left) / width, (y - box.top - bodyTop) / bodyHeight)
    if (zone === "center") {
      const drop: WorkspaceDrop = { groupId: found.id }
      // The middle of its own pane is where the tab already is, not a place to put it last.
      if (found.id === g.groupId || !valid(drop)) return null
      return { drop, preview: { x: left, y: bodyTop, width, height: bodyHeight, label: words.dropHere } }
    }
    const drop: WorkspaceDrop = { groupId: found.id, edge: zone, newId: g.drop && "edge" in g.drop && g.drop.groupId === found.id && g.drop.edge === zone ? g.drop.newId : freshGroupId() }
    if (!valid(drop)) return null
    const half = { start: [left, bodyTop, width / 2, bodyHeight], end: [left + width / 2, bodyTop, width / 2, bodyHeight], top: [left, bodyTop, width, bodyHeight / 2], bottom: [left, bodyTop + bodyHeight / 2, width, bodyHeight / 2] } as const
    const [hx, hy, hw, hh] = half[zone]
    const text = { start: words.dropStart, end: words.dropEnd, top: words.dropTop, bottom: words.dropBottom }[zone]
    return { drop, preview: { x: hx, y: hy, width: hw, height: hh, label: text } }
  }

  const gesture = React.useRef<Gesture | null>(null)
  const stop = React.useRef<(() => void) | null>(null)
  // The listener that swallows the click after a drag, until it has or its moment has passed.
  const unswallow = React.useRef<(() => void) | null>(null)
  React.useEffect(
    () => () => {
      stop.current?.()
      unswallow.current?.()
    },
    [],
  )

  const startDrag = (event: React.PointerEvent<HTMLElement>, tab: T, group: WorkspaceTabs<T>) => {
    // A pen and a mouse drag; a finger scrolls the strip (the tab's menu does the rest).
    if (event.button !== 0 || event.pointerType === "touch" || gesture.current) return
    const g: Gesture = { tabId: tab.id, title: tab.title, groupId: group.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: false, drop: null }
    gesture.current = g
    const finish = () => {
      window.removeEventListener("pointermove", move, true)
      window.removeEventListener("pointerup", up, true)
      window.removeEventListener("pointercancel", cancel, true)
      window.removeEventListener("keydown", key, true)
      gesture.current = null
      stop.current = null
      setDrag(null)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== g.pointerId) return
      if (!g.started) {
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < DRAG_START) return
        g.started = true
      }
      const target = hit(g, e.clientX, e.clientY)
      g.drop = target?.drop ?? null
      setDrag({ title: g.title, x: e.clientX, y: e.clientY, preview: target?.preview ?? null })
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== g.pointerId) return
      const { started, drop } = g
      finish()
      if (!started) return
      // The press that ends a drag is not a click on what is under the pointer.
      const swallow = (click: MouseEvent) => {
        click.stopPropagation()
        click.preventDefault()
      }
      window.addEventListener("click", swallow, { capture: true, once: true })
      const lift = () => {
        window.removeEventListener("click", swallow, true)
        unswallow.current = null
      }
      unswallow.current = lift
      setTimeout(lift, 0)
      if (!drop) return
      const now = latest.current.normal
      const next = moveWorkspaceTab(now, g.tabId, drop)
      if (next === now) return
      wantFocus(g.tabId)
      const home = findWorkspaceTab(next, g.tabId)
      if (home && home.group.id !== g.groupId) setSaid(words.moved(g.title, workspaceGroups(next).findIndex((x) => x.id === home.group.id) + 1))
      changed(next)
    }
    const cancel = (e: PointerEvent) => {
      if (e.pointerId === g.pointerId) finish()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      finish()
    }
    stop.current = finish
    window.addEventListener("pointermove", move, true)
    window.addEventListener("pointerup", up, true)
    window.addEventListener("pointercancel", cancel, true)
    window.addEventListener("keydown", key, true)
  }

  const onTabKey = (event: React.KeyboardEvent<HTMLElement>, tab: T, group: WorkspaceTabs<T>) => {
    if (event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return
    if (event.key === "Delete" && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      closeTab(tab, group, true)
      return
    }
    if (event.shiftKey && event.altKey) {
      const edge = edgeOf(event.key, rtl())
      if (!edge) return
      event.preventDefault()
      divide(tab, group, edge)
      return
    }
    if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      // Earlier is toward the start of the line.
      reorder(tab, group, (event.key === "ArrowLeft") !== rtl() ? -1 : 1)
    }
  }

  // ---- The dividers ----

  const sashDrag = React.useRef<{ pointerId: number; start: number; weights: number[]; extent: number; minimums: number[]; mirrored: boolean; sash: WorkspaceSash; now: number[] } | null>(null)
  /** What a divider needs to be moved: the room of its split in px, and what each child keeps. */
  const measure = (sash: WorkspaceSash) => {
    const box = canvas.current?.getBoundingClientRect()
    const wide = sash.direction === "horizontal"
    const extent = box ? sash.span * (wide ? box.width : box.height) : 0
    const split = workspaceNodeAt(latest.current.normal, sash.path)
    const least = wide ? (minSize?.width ?? 160) : (minSize?.height ?? 120)
    const minimums = split && split.kind === "split" ? split.children.map((child) => workspaceMinimum(child, sash.direction, least)) : []
    return { extent, minimums }
  }
  const moveSash = (sash: WorkspaceSash, delta: number) => {
    const { extent, minimums } = measure(sash)
    const weights = shiftWorkspaceWeights(sash.weights, sash.boundary, delta, extent, minimums)
    changed(resizeWorkspace(latest.current.normal, sash.path, weights))
  }
  const onSashDown = (event: React.PointerEvent<HTMLElement>, sash: WorkspaceSash) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.focus()
    const wide = sash.direction === "horizontal"
    const { extent, minimums } = measure(sash)
    sashDrag.current = { pointerId: event.pointerId, start: wide ? event.clientX : event.clientY, weights: [...sash.weights], extent, minimums, mirrored: wide && rtl(), sash, now: [...sash.weights] }
  }
  const onSashMove = (event: React.PointerEvent<HTMLElement>) => {
    const from = sashDrag.current
    if (!from || from.pointerId !== event.pointerId) return
    const wide = from.sash.direction === "horizontal"
    const delta = ((wide ? event.clientX : event.clientY) - from.start) * (from.mirrored ? -1 : 1)
    from.now = shiftWorkspaceWeights(from.weights, from.sash.boundary, delta, from.extent, from.minimums)
    setLive({ path: from.sash.path, boundary: from.sash.boundary, weights: from.now })
  }
  const onSashUp = (event: React.PointerEvent<HTMLElement>) => {
    const from = sashDrag.current
    if (!from || from.pointerId !== event.pointerId) return
    sashDrag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setLive(null)
    changed(resizeWorkspace(latest.current.normal, from.sash.path, from.now))
  }
  const onSashKey = (event: React.KeyboardEvent<HTMLElement>, sash: WorkspaceSash) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const wide = sash.direction === "horizontal"
    const by = event.shiftKey ? STEP * 4 : STEP
    const sign = wide && rtl() ? -1 : 1
    const { extent } = measure(sash)
    let delta: number | null = null
    if (event.key === (wide ? "ArrowRight" : "ArrowDown")) delta = by * sign
    else if (event.key === (wide ? "ArrowLeft" : "ArrowUp")) delta = -by * sign
    // To the least each neighbour keeps: the clamp does the rest.
    else if (event.key === "Home") delta = -extent
    else if (event.key === "End") delta = extent
    if (delta === null) return
    event.preventDefault()
    moveSash(sash, delta)
  }
  const shareAlike = (sash: WorkspaceSash) => {
    const pair = (sash.weights[sash.boundary]! + sash.weights[sash.boundary + 1]!) / 2
    const weights = [...sash.weights]
    weights[sash.boundary] = pair
    weights[sash.boundary + 1] = pair
    changed(resizeWorkspace(latest.current.normal, sash.path, weights))
  }

  // ---- The drawing ----

  const emptyOf = (group: WorkspaceTabs<T>): React.ReactNode => {
    const given = typeof empty === "function" ? empty(group.id) : empty
    if (given !== undefined) return given
    return (
      <div data-slot="workspace-empty" className="flex flex-col items-center gap-3 text-center text-sm text-ink-mute">
        <p>{words.empty}</p>
        {onAddTab ? (
          <Button variant="outline" size="sm" onClick={() => onAddTab(group.id)}>
            <Icon name="plus" />
            {words.newTab}
          </Button>
        ) : null}
      </div>
    )
  }

  const tabId = (id: string) => `${uid}-tab-${safe(id)}`
  const panelId = (id: string) => `${uid}-panel-${safe(id)}`
  const boxOf = (groupId: string): WorkspaceRect => (maximized === groupId ? { x: 0, y: 0, width: 1, height: 1 } : (layout.groups.get(groupId) ?? { x: 0, y: 0, width: 1, height: 1 }))

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      data-slot="workspace"
      data-dragging={drag ? "" : undefined}
      className={cn("relative size-full min-h-0 min-w-0 overflow-hidden [--ws-header:var(--control-md)] pointer-coarse:[--ws-header:--spacing(11)]", drag && "select-none")}
    >
      <div ref={canvas} data-slot="workspace-canvas" className="absolute inset-0">
        {groups.map((group, at) => {
          const hidden = maximized !== null && maximized !== group.id
          const isFocused = focused === group.id
          const active = group.tabs.find((tab) => tab.id === group.activeId)
          return (
            <section
              key={group.id}
              data-slot="workspace-group"
              data-group-id={group.id}
              data-focused={isFocused ? "" : undefined}
              aria-label={words.pane(at + 1)}
              hidden={hidden}
              style={place(boxOf(group.id))}
              onPointerDownCapture={() => focusGroup(group.id)}
              onFocusCapture={() => focusGroup(group.id)}
              className={cn("absolute start-(--ws-x) top-(--ws-y) h-(--ws-h) w-(--ws-w) min-h-0 min-w-0 flex-col bg-paper", hidden ? "hidden" : "flex")}
            >
              <div
                data-slot="workspace-header"
                className="relative flex h-(--ws-header) shrink-0 items-center gap-1 px-1 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line data-[focused]:after:bg-primary"
                data-focused={isFocused && groups.length > 1 ? "" : undefined}
              >
                <Tabs
                  value={group.activeId ?? ""}
                  onValueChange={(value) => changed(activateWorkspaceTab(latest.current.normal, value))}
                  ids={{ trigger: tabId, content: panelId }}
                  className="min-w-0 flex-1 gap-0"
                  animated={animated}
                >
                  <TabsList aria-label={words.tabs} scroll>
                    {group.tabs.map((tab) => {
                      const closable = tab.closable !== false
                      const trigger = (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          data-tab-id={tab.id}
                          className={cn("max-w-56", closable && "pe-8")}
                          onPointerDown={(event) => startDrag(event, tab, group)}
                          onKeyDown={(event) => onTabKey(event, tab, group)}
                          onAuxClick={(event) => {
                            if (event.button !== 1 || !closable) return
                            event.preventDefault()
                            closeTab(tab, group)
                          }}
                          end={
                            closable ? (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                tabIndex={-1}
                                aria-label={words.close(tab.title)}
                                className="absolute end-1 top-1/2 -translate-y-1/2"
                                onClick={() => closeTab(tab, group)}
                              >
                                <Icon name="close" className="size-3.5" />
                              </Button>
                            ) : undefined
                          }
                        >
                          {tab.color ? <Dot color={tab.color} /> : null}
                          {tab.icon ? <Icon name={tab.icon} /> : null}
                          <span className="min-w-0 truncate">{steadyLabel(tab.title)}</span>
                        </TabsTrigger>
                      )
                      return (
                        <ContextMenu key={tab.id} items={() => menuOf(tab, group)} label={tab.title} animated={animated}>
                          {trigger}
                        </ContextMenu>
                      )
                    })}
                  </TabsList>
                </Tabs>
                {onAddTab ? (
                  <Tooltip label={words.newTab} animated={animated}>
                    <Button variant="ghost" size="icon-sm" aria-label={words.newTab} onClick={() => onAddTab(group.id)}>
                      <Icon name="plus" />
                    </Button>
                  </Tooltip>
                ) : null}
                {onMaximizedChange && (groups.length > 1 || maximized === group.id) ? (
                  <Tooltip label={maximized === group.id ? words.restore : words.maximize} animated={animated}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={maximized === group.id ? words.restore : words.maximize}
                      aria-pressed={maximized === group.id}
                      onClick={() => onMaximizedChange(maximized === group.id ? null : group.id)}
                    >
                      <Icon name={maximized === group.id ? "windowRestore" : "windowMaximize"} />
                    </Button>
                  </Tooltip>
                ) : null}
              </div>
              {active ? null : <div className="flex min-h-0 flex-1 items-center justify-center p-4">{emptyOf(group)}</div>}
            </section>
          )
        })}
        {order.current.map((id) => {
          const entry = tabs.get(id)
          if (!entry) return null
          const { tab, group } = entry
          const isActive = group.activeId === tab.id
          if (keepMounted === "active" && !isActive) return null
          const visible = isActive && (maximized === null || maximized === group.id)
          return (
            <div
              key={id}
              data-slot="workspace-content"
              data-group-id={group.id}
              hidden={!visible}
              style={place(boxOf(group.id))}
              className="pointer-events-none absolute start-(--ws-x) top-(--ws-y) h-(--ws-h) w-(--ws-w) pt-(--ws-header)"
            >
              <div
                role="tabpanel"
                id={panelId(tab.id)}
                aria-labelledby={tabId(tab.id)}
                onPointerDownCapture={() => focusGroup(group.id)}
                onFocusCapture={() => focusGroup(group.id)}
                className="pointer-events-auto size-full min-h-0 min-w-0 overflow-auto bg-paper"
              >
                <TabContent tab={tab} render={renderTab} active={isActive} visible={visible} focused={focused === group.id} groupId={group.id} />
              </div>
            </div>
          )
        })}
        {maximized !== null
          ? null
          : layout.sashes.map((sash) => {
              const wide = sash.direction === "horizontal"
              const share = sash.weights[sash.boundary]! / (sash.weights[sash.boundary]! + sash.weights[sash.boundary + 1]!)
              const pc = (n: number) => `${Math.round(n * 1e6) / 1e4}%`
              return (
                <div
                  key={`${sash.path.join(".")}/${sash.boundary}`}
                  role="separator"
                  tabIndex={0}
                  aria-orientation={wide ? "vertical" : "horizontal"}
                  aria-label={words.resize}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(share * 100)}
                  title={hint}
                  data-slot="workspace-sash"
                  data-direction={sash.direction}
                  data-dragging={live && live.boundary === sash.boundary && live.path.join(".") === sash.path.join(".") ? "" : undefined}
                  style={{ "--ws-x": pc(wide ? sash.at : sash.from), "--ws-y": pc(wide ? sash.from : sash.at), "--ws-len": pc(sash.length) } as React.CSSProperties}
                  onPointerDown={(event) => onSashDown(event, sash)}
                  onPointerMove={onSashMove}
                  onPointerUp={onSashUp}
                  onPointerCancel={onSashUp}
                  onKeyDown={(event) => onSashKey(event, sash)}
                  onDoubleClick={() => shareAlike(sash)}
                  className={cn(
                    "group absolute z-10 touch-none",
                    FOCUS_RING_INSET,
                    wide
                      ? "start-(--ws-x) top-(--ws-y) h-(--ws-len) w-1.5 -translate-x-1/2 cursor-col-resize pointer-coarse:w-3 pointer-coarse:after:absolute pointer-coarse:after:inset-y-0 pointer-coarse:after:-inset-x-4 pointer-coarse:after:content-[''] rtl:translate-x-1/2"
                      : "start-(--ws-x) top-(--ws-y) h-1.5 w-(--ws-len) -translate-y-1/2 cursor-row-resize pointer-coarse:h-3 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute bg-line group-hover:bg-ink-mute group-data-dragging:bg-ink-mute",
                      wide ? "inset-y-0 start-1/2 w-px -translate-x-1/2 group-hover:w-0.5 group-data-dragging:w-0.5 rtl:translate-x-1/2" : "inset-x-0 top-1/2 h-px -translate-y-1/2 group-hover:h-0.5 group-data-dragging:h-0.5",
                    )}
                  />
                </div>
              )
            })}
        {drag?.preview ? (
          <div
            aria-hidden="true"
            data-slot="workspace-drop"
            style={{ "--ws-px": px(drag.preview.x), "--ws-py": px(drag.preview.y), "--ws-pw": px(drag.preview.width), "--ws-ph": px(drag.preview.height) } as React.CSSProperties}
            className={cn(
              "pointer-events-none absolute start-(--ws-px) top-(--ws-py) z-20 h-(--ws-ph) w-(--ws-pw)",
              drag.preview.label === null ? "bg-primary" : "flex items-center justify-center bg-selected/60 outline-2 -outline-offset-2 outline-primary",
            )}
          >
            {drag.preview.label === null ? null : <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-ink">{drag.preview.label}</span>}
          </div>
        ) : null}
      </div>
      {drag ? (
        <div
          aria-hidden="true"
          data-slot="workspace-ghost"
          style={{ left: drag.x + 14, top: drag.y + 12 }}
          className="pointer-events-none fixed z-50 max-w-56 truncate rounded-md bg-raised px-3 py-1 text-sm font-medium text-ink shadow-md"
        >
          {drag.title}
        </div>
      ) : null}
      <div role="status" aria-live="polite" data-slot="workspace-status" className="sr-only">
        {said}
      </div>
    </div>
  )
}

export { Workspace }
