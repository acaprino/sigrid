// Park UI (MIT) tree-view 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tree-view.ts)
// A tree of rows: things that hold other things (folders and files, sections and pages, any hierarchy), each a row with
// its name, an icon of the user's pack, a short fact and a count at its end, and the rows it holds under it, one level in.
// Behaviour: Ark UI's TreeView. The rows are one Tab stop (the chosen row when it is in sight); Down and Up move, Right
// opens a branch and then goes into it, Left closes it and then goes out to the branch that holds the row, Home and End
// reach the first and the last row in sight, the first letters of a name reach it, `*` opens the branches beside the
// row; Enter, Space or a press choose a row, and on a branch also open or close it. One row is chosen, never several.
// The row that has the focus is the `treeitem` itself, with its level, whether it is open and whether it is chosen: on a
// branch Ark's control is made the `treeitem`, and the rows it holds are its `group` (`aria-owns`). A closed branch's
// rows are not in the page.
// Branches whose children the app loads (`hasChildren` and `loadChildren`) load them when they are opened: the row says
// «Loading» meanwhile and takes no second opening (Enter and Right do nothing on it), and if the load fails it says so
// and stays closed, so opening it again tries again. The tree loads them itself, not through Ark, which would keep a
// branch «loaded» for ever: children belong to the node object they were loaded for, and when the app gives another
// object for that id (another project, the same folder read again), or none, they are dropped.
// The filter (`query`, typed in the field of `search` or given by the app) keeps what `match` finds (by default: the name
// holds the text) with all it holds, and the branches that lead to a find, opened. What the person opens or closes
// meanwhile is theirs: when the filter is cleared their own branches come back, with those changes.
// Form: Park's `tree-view` recipe on the toolkit's tokens: rows of the density's row height (44px with a finger), l2,
// 14px, one level in 20px (Park's 22px, on the 4px grid). At the start the chevron of the sidebar's groups (14px in a
// 16px slot, a quarter turn when open, turning only with `animated`), then the icon, the name, and at the end the fact
// in 12px tabular figures and a `Count` (R5). The row's look is that of every list of things (`lib/rows.ts`, as
// `ItemRow`): under the pointer a share of the selection tint; the chosen row has the whole tint, its ink and the short
// accent bar at its start (R1), and its name in semibold. Not taken from Park: the chevron in the accent (R2: it is
// chrome, in the muted ink), the semibold of the first level (semibold says «chosen»), the line that guides the eye
// down a branch, the transitions.
// What a row draws is memoised: a move of the focus paints Ark's own parts again (its context is new at each move), not
// the icons, names and facts of every row.
// It is not the graph: `GraphCanvas` and its tree mode draw things joined by lines; this is a list of nested rows, and
// the two share no code.
import * as React from "react"
import { ChevronRight } from "lucide-react"
import { TreeView as TreeViewPrimitive, createTreeCollection, useTreeViewNodeContext } from "@ark-ui/react/tree-view"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { ROW_CHOSEN, ROW_HOVER } from "../../lib/rows"
import { useMotion, type MotionImpl } from "../../internal/motion"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"
import { Count } from "./count"
import { SearchField } from "./search-field"

/** A thing of the tree: a row, and the rows it holds. */
export type TreeNode = {
  /** Names the thing among all the others of the tree (a path, a key): the choice and the open branches are ids. */
  id: string
  /** What the row says; the filter by default and the first letters typed look for it. */
  name: string
  /** A meaning of the toolkit's icons (`folder`, `file`…) or of the app's own (`IconPackProvider`'s `icons`), drawn in the user's pack. In a tree where some rows have one, a row without keeps an empty slot (R6). */
  icon?: IconName | (string & {}) | undefined
  /** The icon of a branch while it is open (`folderOpen` for a `folder`). Absent: `icon`, open or closed. */
  openIcon?: IconName | (string & {}) | undefined
  /** A short fact at the end of the row, in tabular figures: a size, a date. */
  meta?: React.ReactNode
  /** How many things the node holds or waits on (changed, unread): a `Count` at the end of the row, after `meta`. Zero shows nothing. */
  count?: number | undefined
  /** The rows it holds. With an array (even empty) the row is a branch, which opens and closes. */
  children?: readonly TreeNode[] | undefined
  /** It holds rows the app loads when the branch is opened (`loadChildren`), until then unknown. Read only without `children`; without `loadChildren` the branch holds nothing. */
  hasChildren?: boolean | undefined
}

export type TreeProps = {
  /** Name of the tree for screen readers («Files»). */
  "aria-label": string
  /** The first level of the tree. Children loaded for a node stay while the app gives the same node object: build the nodes once (a constant, state, `useMemo`), and give a new object for a node whose children must be read again (another project, a refresh). */
  nodes: readonly TreeNode[]
  /** The chosen row, by its id, or null for none. With it the choice is the app's: pass the id `onSelect` gives. */
  selected?: string | null | undefined
  /** The row chosen at first, when the choice is the tree's own. */
  defaultSelected?: string | null | undefined
  /** The person chose a row (a press, Enter or Space): its id, and the node. */
  onSelect?: ((id: string, node: TreeNode) => void) | undefined
  /** The branches the person opened, by id. With it they are the app's: pass the list `onExpandedChange` gives. The branches the filter opens are not in it. A branch still to load stays closed until the person opens it. */
  expanded?: readonly string[] | undefined
  /** The branches open at first, when they are the tree's own. */
  defaultExpanded?: readonly string[] | undefined
  /** The person opened or closed a branch: the whole list of the branches they opened. A branch that loads joins it once its rows are here. Not called when the list did not change. */
  onExpandedChange?: ((expanded: string[]) => void) | undefined
  /** Loads the rows of a branch with `hasChildren`, when it is first opened. A promise that fails leaves the branch closed, saying so; opening it again tries again. The signal says the tree no longer waits (the node changed or left, the tree left the page). */
  loadChildren?: ((node: TreeNode, signal: AbortSignal) => Promise<readonly TreeNode[]>) | undefined
  /** A field above the rows that filters them (`query`). */
  search?: boolean | undefined
  /** The name and placeholder of that field. Absent: the toolkit's words («Filter by name»). */
  searchLabel?: string | undefined
  /** The text that filters the rows. With it the text is the app's: pass what `onQueryChange` gives. It filters with the tree's field (`search`) or without it, from a field of the app's (`ToolbarSearch`). Only spaces, or nothing: no filter. */
  query?: string | undefined
  /** The text the filter starts with, when it is the tree's own. */
  defaultQuery?: string | undefined
  /** The text of the filter changed: typed in the tree's field, or cleared. */
  onQueryChange?: ((query: string) => void) | undefined
  /** Whether a node is found by the text, given as it is (`query`), only when it holds more than spaces. Absent: its name holds the text, whatever the case and the spaces at its ends. A node found shows with all it holds; a branch that leads to one shows with what it keeps, opened. Branches never loaded are not searched: to have them searched, give their children. An app counts the finds with the same function over its own nodes. A constant, or memoised: a new function filters again. */
  match?: ((node: TreeNode, query: string) => boolean) | undefined
  /** The chevron of a branch turns when it opens or closes, as the sidebar's groups (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
}

/** A node as the tree draws it: the app's, with the children it loaded, or the ones the filter keeps. */
type Inner = {
  id: string
  name: string
  /** The app's node; null for the root, which is not drawn. */
  source: TreeNode | null
  /** Its children are the app's to load (`hasChildren` without `children`, and a `loadChildren`). */
  lazy: boolean
  /** Undefined: a leaf, or a branch whose children are still to load. */
  children?: Inner[] | undefined
}

/** Children that came, and the node object they came for. */
type Loaded = { node: TreeNode; children: readonly TreeNode[] }

/** The value of the root of Ark's collection: no id of the app's can be it. */
const ROOT = "\u0000tree-root"
const NONE: ReadonlySet<string> = new Set()

/** The filter by default: the name holds the text, whatever the case and the spaces at its ends. */
const byName = (node: TreeNode, query: string) => node.name.toLowerCase().includes(query.trim().toLowerCase())

function without<V>(map: ReadonlyMap<string, V>, id: string): ReadonlyMap<string, V> {
  if (!map.has(id)) return map
  const next = new Map(map)
  next.delete(id)
  return next
}

function sameIds(a: Iterable<string>, b: Iterable<string>): boolean {
  const one = new Set(a)
  const two = new Set(b)
  return one.size === two.size && [...two].every((id) => one.has(id))
}

/**
 * The nodes of the app with the children loaded for them (for that very node object: another object with the same id
 * is another branch), every node by its id, and whether any row has an icon.
 */
function resolve(nodes: readonly TreeNode[], loaded: ReadonlyMap<string, Loaded>, canLoad: boolean) {
  const index = new Map<string, Inner>()
  let icons = false
  const walk = (list: readonly TreeNode[]): Inner[] =>
    list.map((node) => {
      if (node.icon !== undefined || node.openIcon !== undefined) icons = true
      const toLoad = node.children === undefined && node.hasChildren === true
      const lazy = toLoad && canLoad
      const entry = lazy ? loaded.get(node.id) : undefined
      const held = node.children ?? (lazy ? (entry?.node === node ? entry.children : undefined) : toLoad ? [] : undefined)
      const inner: Inner = { id: node.id, name: node.name, source: node, lazy, children: held ? walk(held) : undefined }
      index.set(node.id, inner)
      return inner
    })
  return { nodes: walk(nodes), index, icons }
}

/**
 * What the filter keeps: a node found, with all it holds, and a node that leads to one, with what it keeps of its own.
 * The branches that lead to a find go into `leading`.
 */
function filterTree(nodes: readonly Inner[], found: (node: TreeNode) => boolean, leading: Set<string>): Inner[] {
  const kept: Inner[] = []
  for (const node of nodes) {
    const below = node.children ? filterTree(node.children, found, leading) : []
    if (below.length > 0) leading.add(node.id)
    if (node.source !== null && found(node.source)) kept.push(node)
    else if (below.length > 0) kept.push({ ...node, children: below })
  }
  return kept
}

/** The ids of the rows in sight: the first level, and what the open branches hold. */
function inSight(nodes: readonly Inner[], open: ReadonlySet<string>, into: Set<string>): Set<string> {
  for (const node of nodes) {
    into.add(node.id)
    if (node.children && open.has(node.id)) inSight(node.children, open, into)
  }
  return into
}

type Rows = {
  icons: boolean
  /** The branches that load, and the node they load for. */
  loading: ReadonlyMap<string, TreeNode>
  /** The branches whose load failed, and the node it failed for. */
  failed: ReadonlyMap<string, TreeNode>
  uid: string
  motion: MotionImpl | null
}
const RowsContext = React.createContext<Rows>({ icons: false, loading: new Map(), failed: new Map(), uid: "", motion: null })

// The row of a branch (Ark's `BranchControl`, made the `treeitem`) and the row of a leaf (Ark's `Item`). `--depth` is the
// level: one level in is 20px, the chevron's slot and its 4px gap, so the chevron of a row sits under the icon of the
// row that holds it.
const ROW = cn(
  "relative flex min-h-(--row-height) w-full cursor-default items-center gap-2 rounded-md pe-(--row-pad) text-start text-sm text-ink-soft pointer-coarse:min-h-11",
  // design-check-ignore-next-line dimension-value: one level in is 20px (the 16px chevron slot and its 4px gap), after the row's own padding
  "ps-[calc(var(--row-pad)_+_(var(--depth)_-_1)_*_1.25rem)]",
  ROW_HOVER,
  ROW_CHOSEN,
  FOCUS_RING_INSET,
)

type BodyProps = {
  nameId: string
  name: string
  branch: boolean
  open: boolean
  chosen: boolean
  /** The tree has icons: every row keeps the slot. */
  icons: boolean
  icon: string | undefined
  meta: React.ReactNode
  count: number | undefined
  /** A branch whose rows load: its state is said in a live part, there from the start. */
  lazy: boolean
  status: "loading" | "failed" | null
  motion: MotionImpl | null
}

/**
 * What a row draws, from plain values: the same values, no paint. Ark's parts around it are painted again at each move
 * of the focus (Ark's context is new at each change); this is not.
 */
const RowBody = React.memo(function RowBody({ nameId, name, branch, open, chosen, icons, icon, meta, count, lazy, status, motion }: BodyProps) {
  const words = useWords()
  // On the chosen row the muted ink would not keep its contrast on the tint: the row's own ink, a step quieter.
  const quiet = chosen ? "opacity-80" : "text-ink-mute"
  const arrow = <ChevronRight aria-hidden="true" className="size-3.5" />
  const detail = lazy || meta !== undefined || count !== undefined
  return (
    <>
      <span className="flex shrink-0 items-center gap-1">
        {/* The chevron of the sidebar's groups, at the start as in every tree; a leaf keeps its slot, empty. */}
        <span aria-hidden="true" data-slot="tree-chevron" className={cn("flex size-4 items-center justify-center", quiet)}>
          {branch ? motion ? <motion.Turn open={open}>{arrow}</motion.Turn> : <span className={cn("inline-flex", open && "rotate-90")}>{arrow}</span> : null}
        </span>
        {icons ? icon !== undefined ? <Icon name={icon} /> : <span aria-hidden="true" data-slot="tree-icon-empty" className="size-4" /> : null}
      </span>
      <span id={nameId} data-slot="tree-name" className={cn("min-w-0 flex-1 truncate", chosen && "font-semibold")}>
        {name}
      </span>
      {detail ? (
        // The row is named by its name alone; what it says at its end describes it.
        <span id={`${nameId}-detail`} className="flex shrink-0 items-center gap-2 text-2xs">
          {lazy ? (
            // Always in the page for a branch that loads, so a screen reader hears it start and fail.
            <span data-slot="tree-status" aria-live="polite" className={status === "failed" && !chosen ? "text-destructive" : quiet}>
              {status === "loading" ? words.tree.loading : status === "failed" ? words.tree.failed : null}
              {status === "failed" ? <span className="sr-only"> {words.tree.retry}</span> : null}
            </span>
          ) : null}
          {meta !== undefined && status === null ? (
            <span data-slot="tree-meta" className={cn("tabular-nums", quiet)}>
              {meta}
            </span>
          ) : null}
          {count !== undefined ? <Count value={count} className={chosen ? "text-current opacity-80" : undefined} /> : null}
        </span>
      ) : null}
    </>
  )
})

function TreeRow({ node, indexPath }: { node: Inner; indexPath: number[] }) {
  const { icons, loading, failed, uid, motion } = React.useContext(RowsContext)
  const state = useTreeViewNodeContext()
  const source = node.source
  if (source === null) return null
  const nameId = `${uid}-${indexPath.join("-")}`
  const busy = node.lazy && loading.get(node.id) === source
  const didFail = node.lazy && !busy && failed.get(node.id) === source
  const open = state.isBranch && state.expanded
  const meta = source.meta
  const hasMeta = meta !== undefined && meta !== null && meta !== false && meta !== ""
  const hasCount = source.count !== undefined && source.count !== 0
  const names = { "aria-labelledby": nameId, ...(node.lazy || hasMeta || hasCount ? { "aria-describedby": `${nameId}-detail` } : {}) }
  // The level sets the indent; Ark gives it to a leaf's row only.
  const depth = { "--depth": state.depth } as React.CSSProperties
  const body = (
    <RowBody
      nameId={nameId}
      name={node.name}
      branch={state.isBranch}
      open={open}
      chosen={state.selected}
      icons={icons}
      icon={open && source.openIcon !== undefined ? source.openIcon : source.icon}
      meta={hasMeta ? meta : undefined}
      count={hasCount ? source.count : undefined}
      lazy={node.lazy}
      status={busy ? "loading" : didFail ? "failed" : null}
      motion={motion}
    />
  )
  if (!state.isBranch) {
    return (
      <TreeViewPrimitive.Item data-slot="tree-row" {...names} style={depth} className={ROW}>
        {body}
      </TreeViewPrimitive.Item>
    )
  }
  const groupId = `${nameId}-group`
  return (
    <>
      {/* The branch's row takes the focus (Ark's keys and focus find a row by its part and its id): it is the treeitem. */}
      <TreeViewPrimitive.BranchControl
        data-slot="tree-row"
        role="treeitem"
        aria-level={state.depth}
        aria-expanded={open}
        aria-selected={state.selected}
        aria-current={state.selected ? "true" : undefined}
        aria-busy={busy || undefined}
        aria-owns={open ? groupId : undefined}
        {...names}
        style={depth}
        className={ROW}
      >
        {body}
      </TreeViewPrimitive.BranchControl>
      {open ? (
        <div role="group" id={groupId} data-slot="tree-group" className="flex flex-col gap-0.5">
          <TreeRows nodes={node.children ?? []} path={indexPath} />
        </div>
      ) : null}
    </>
  )
}

function TreeRows({ nodes, path }: { nodes: readonly Inner[]; path: readonly number[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const indexPath = [...path, index]
        return (
          <TreeViewPrimitive.NodeProvider key={node.id} node={node} indexPath={indexPath}>
            <TreeRow node={node} indexPath={indexPath} />
          </TreeViewPrimitive.NodeProvider>
        )
      })}
    </>
  )
}

function Tree({
  nodes,
  selected,
  defaultSelected = null,
  onSelect,
  expanded,
  defaultExpanded,
  onExpandedChange,
  loadChildren,
  search = false,
  searchLabel,
  query,
  defaultQuery = "",
  onQueryChange,
  match = byName,
  animated,
  className,
  ...aria
}: TreeProps) {
  const words = useWords()
  const label = aria["aria-label"]
  const uid = React.useId()
  const motion = useMotion(animated)
  const canLoad = loadChildren !== undefined
  const [loaded, setLoaded] = React.useState<ReadonlyMap<string, Loaded>>(() => new Map())
  const [loading, setLoading] = React.useState<ReadonlyMap<string, TreeNode>>(() => new Map())
  const [failed, setFailed] = React.useState<ReadonlyMap<string, TreeNode>>(() => new Map())
  const [ownChoice, setOwnChoice] = React.useState<string | null>(defaultSelected)
  const [ownOpen, setOwnOpen] = React.useState<readonly string[]>(defaultExpanded ?? [])
  const [ownQuery, setOwnQuery] = React.useState(defaultQuery)
  const [focus, setFocus] = React.useState<string | null>(null)
  // The branches the filter opened and the person closed, for the text they filtered by: another text, or none, forgets them.
  const [shut, setShut] = React.useState<{ text: string; ids: ReadonlySet<string> }>({ text: "", ids: NONE })

  const chosen = selected !== undefined ? selected : ownChoice
  const open = expanded ?? ownOpen
  const typed = query ?? ownQuery
  const text = typed.trim() === "" ? "" : typed
  const tree = React.useMemo(() => resolve(nodes, loaded, canLoad), [nodes, loaded, canLoad])
  const found = React.useMemo(() => {
    if (text === "") return null
    const leading = new Set<string>()
    return { nodes: filterTree(tree.nodes, (node) => match(node, text), leading), leading }
  }, [tree, text, match])
  const shown = found ? found.nodes : tree.nodes
  const closedNow = shut.text === text ? shut.ids : NONE
  // What is open in sight: the person's branches and, while the filter is on, those that lead to a find (from the nodes
  // as they are now, so a new find shows opened), less those the person closed. A branch still to load is held back
  // until its children are here.
  const view = React.useMemo(() => {
    const ids = found ? [...new Set([...[...found.leading].filter((id) => !closedNow.has(id)), ...open])] : open
    return ids.filter((id) => {
      const node = tree.index.get(id)
      return node !== undefined && !(node.lazy && node.children === undefined)
    })
  }, [found, closedNow, open, tree])
  // The Tab stop: the row last reached, else the chosen row, else the first, whichever is in sight. A row the filter
  // hid can no longer hold it, or the tree would have none.
  const visible = React.useMemo(() => inSight(shown, new Set(view), new Set()), [shown, view])
  const focused = focus !== null && visible.has(focus) ? focus : chosen !== null && visible.has(chosen) ? chosen : null
  const collection = React.useMemo(
    () =>
      createTreeCollection<Inner>({
        rootNode: { id: ROOT, name: "", source: null, lazy: false, children: shown },
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        nodeToChildren: (node) => node.children ?? [],
        // A branch: children given (even none) or to load. Ark reads a count that is not undefined as «a branch».
        nodeToChildrenCount: (node) => (node.lazy || node.children !== undefined ? (node.children?.length ?? 0) : undefined),
      }),
    [shown],
  )
  const rows = React.useMemo(() => ({ icons: tree.icons, loading, failed, uid, motion }), [tree.icons, loading, failed, uid, motion])

  // What a load that ends after the paint it started in reads: the person's list and the app's callbacks as they are now.
  const latest = React.useRef({ open, controlled: expanded !== undefined, onExpandedChange, loadChildren })
  latest.current = { open, controlled: expanded !== undefined, onExpandedChange, loadChildren }
  // The loads under way: the node each is for, and how to give it up.
  const pending = React.useRef(new Map<string, { node: TreeNode; controller: AbortController }>())

  /** The person's list of open branches, when it changed: the tree's own, or the app's to take. */
  const commitOpen = (next: readonly string[]) => {
    const now = latest.current
    if (sameIds(next, now.open)) return
    // A second change before the next paint builds on this one.
    now.open = next
    if (!now.controlled) setOwnOpen(next)
    now.onExpandedChange?.([...next])
  }

  const startLoad = (node: Inner) => {
    const source = node.source
    const own = latest.current.loadChildren
    const id = node.id
    const under = pending.current.get(id)
    // A load under way for this node: no second request.
    if (source === null || !own || under?.node === source) return
    under?.controller.abort()
    const controller = new AbortController()
    pending.current.set(id, { node: source, controller })
    setLoading((before) => new Map(before).set(id, source))
    setFailed((before) => without(before, id))
    // Only the load the tree still waits for is heard: one given up (the node changed or left) says nothing.
    const waited = () => pending.current.get(id)?.controller === controller
    const settle = () => {
      pending.current.delete(id)
      setLoading((before) => without(before, id))
    }
    // One chain: a loader that throws is a promise that fails.
    new Promise<readonly TreeNode[]>((take) => take(own(source, controller.signal))).then(
      (children) => {
        if (!waited()) return
        settle()
        setLoaded((before) => new Map(before).set(id, { node: source, children }))
        const mine = latest.current.open
        commitOpen(mine.includes(id) ? mine : [...mine, id])
      },
      () => {
        if (!waited()) return
        settle()
        setFailed((before) => new Map(before).set(id, source))
      },
    )
  }

  // New nodes: what was loaded, is loading or failed for a node object the app no longer gives is dropped.
  React.useEffect(() => {
    const live = (id: string, node: TreeNode) => tree.index.get(id)?.source === node
    for (const [id, under] of pending.current) {
      if (live(id, under.node)) continue
      under.controller.abort()
      pending.current.delete(id)
    }
    const prune =
      <V,>(nodeOf: (value: V) => TreeNode) =>
      (before: ReadonlyMap<string, V>): ReadonlyMap<string, V> => {
        const after = new Map([...before].filter(([id, value]) => live(id, nodeOf(value))))
        return after.size === before.size ? before : after
      }
    setLoaded(prune((entry: Loaded) => entry.node))
    setLoading(prune((node: TreeNode) => node))
    setFailed(prune((node: TreeNode) => node))
  }, [tree])
  // The tree leaves the page: it waits for nothing more.
  React.useEffect(() => {
    const loads = pending.current
    return () => {
      for (const { controller } of loads.values()) controller.abort()
      loads.clear()
    }
  }, [])

  const setQuery = (value: string) => {
    if (query === undefined) setOwnQuery(value)
    onQueryChange?.(value)
  }

  return (
    <TreeViewPrimitive.Root
      data-slot="tree"
      collection={collection}
      selectedValue={chosen === null ? [] : [chosen]}
      expandedValue={view}
      focusedValue={focused}
      onSelectionChange={(details) => {
        const id = details.selectedValue[0]
        if (id === undefined || id === chosen) return
        if (selected === undefined) setOwnChoice(id)
        const node = tree.index.get(id)?.source
        if (node) onSelect?.(id, node)
      }}
      onExpandedChange={(details) => {
        const next = details.expandedValue
        const before = new Set(view)
        const after = new Set(next)
        // `*` opens every row beside the one in focus, leaves too: only branches are kept.
        const opened = next.filter((id) => {
          const node = tree.index.get(id)
          return !before.has(id) && node !== undefined && (node.lazy || node.children !== undefined)
        })
        const closed = new Set(view.filter((id) => !after.has(id)))
        // A branch whose rows are still to come loads them first, and opens once they are here.
        const ready = opened.filter((id) => {
          const node = tree.index.get(id)
          if (node === undefined || !(node.lazy && node.children === undefined)) return true
          startLoad(node)
          return false
        })
        if (found) {
          // A branch the filter opened and the person closed stays closed while the text is the same; opened again, it is theirs.
          const ids = new Set(closedNow)
          for (const id of closed) if (found.leading.has(id)) ids.add(id)
          for (const id of ready) ids.delete(id)
          if (!sameIds(ids, closedNow)) setShut({ text, ids })
        }
        // What the person did, kept in their own list: the branches the filter opened are not theirs.
        const mine = latest.current.open
        commitOpen([...new Set([...mine, ...ready])].filter((id) => !closed.has(id)))
      }}
      onFocusChange={(details) => setFocus(details.focusedValue)}
      translations={{ treeLabel: label }}
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      {/* The tree's name: Ark names the tree by its label. Hidden, it is read as the name and nowhere else. */}
      <TreeViewPrimitive.Label asChild>
        <span hidden>{label}</span>
      </TreeViewPrimitive.Label>
      {search ? (
        <SearchField
          value={typed}
          onValueChange={setQuery}
          aria-label={searchLabel ?? words.tree.filter}
          placeholder={searchLabel ?? words.tree.filter}
          className="shrink-0"
        />
      ) : null}
      <TreeViewPrimitive.Tree
        data-slot="tree-rows"
        hidden={shown.length === 0 || undefined}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          // A branch that loads takes no second opening: Enter and Right are left to nothing (Ark would ask again).
          const row = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-part=branch-control]") : null
          const id = row?.dataset.value
          if (id !== undefined && pending.current.has(id) && (event.key === "Enter" || event.key === "ArrowRight")) {
            event.preventDefault()
            return
          }
          // Ark keeps `a` for Cmd+A (choose all, which a tree of one choice does not do), so a plain `a` reaches no
          // name: it is sent again as `A`, which the first letters typed read the same, ignoring case.
          if (event.key !== "a" || event.metaKey || event.ctrlKey || event.altKey) return
          event.preventDefault()
          event.target.dispatchEvent(new KeyboardEvent("keydown", { key: "A", bubbles: true, cancelable: true }))
        }}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
      >
        <RowsContext.Provider value={rows}>
          <TreeRows nodes={shown} path={[]} />
        </RowsContext.Provider>
      </TreeViewPrimitive.Tree>
      {found && shown.length === 0 ? (
        <p data-slot="tree-empty" role="status" className="px-(--row-pad) py-2 text-sm text-ink-mute">
          {words.sidebar.empty}
        </p>
      ) : null}
    </TreeViewPrimitive.Root>
  )
}

export { Tree }
