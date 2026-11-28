// Park UI (MIT) tree-view 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tree-view.ts)
// A tree of rows: things that hold other things (folders and files, sections and pages, any hierarchy), each a row with
// its name, one of Sigrid's icons, a short fact and a count at its end, and the rows it holds under it, one level in.
// Behaviour: Ark UI's TreeView. The rows are one Tab stop (the chosen row when it is in sight); Down and Up move, Right
// opens a branch and then goes into it, Left closes it and then goes out to the branch that holds the row, Home and End
// reach the first and the last row in sight, the first letters of a name reach it, `*` opens the branches beside the
// row; Enter, Space or a press choose a row, and on a branch also open or close it (with `onOpen`, Enter asks the app and
// does not fold: Right and Left do). One row is chosen, never several. In a language written from the right, Right and
// Left swap (Ark does it, in the direction it is given: `DirectionProvider`, which `AppShell` mounts). Enter, Space,
// Right and Left with Shift, Ctrl, Alt or Meta held are not the tree's.
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
// A row may be `disabled`: it stays in sight and in the keys' way, says so (`aria-disabled`), is drawn quieter, and is
// neither chosen, opened, closed nor taken by `onOpen`.
// `onOpen` is the app's own «do the thing»: Enter, or a double press, on a row, besides the choice (a file opens in an
// editor, a folder is entered); it does not open or close a branch (Right and Left do, and a single press). `followFocus`
// makes the choice follow the focus as the arrows move it, for a tree that is the list of a list and its details.
// `onKeyDown` is asked first about a key on a row, for the app's own keys (`j` and `k` that move the choice): when it calls
// `preventDefault()` the tree does nothing with the key. `typeahead={false}` leaves the letters to the app. When the app
// changes `selected` (a key of its own), the tree scrolls to the row (with `virtual`) and, if the focus is in the tree, takes
// it there, so the keys that follow are on the row chosen.
// `virtual` draws only the rows in sight, for thousands of rows: the open branches are laid flat (each row says its
// level, its place among its siblings and the size of the group: the tree of a screen reader is the same), the room of
// the rows not drawn is kept as padding, and a row the keys reach is scrolled to and takes the focus when it is drawn. The
// row with the focus stays in the page when it is scrolled out of sight, while the focus is in the tree, so the keys do not
// fall to the page after a turn of the wheel.
// The rows are all as tall as the first one, which is read where it is drawn. The box needs a height: `fill` takes the one of the region that holds it
// (a pane, a `Panel`'s body), so an app writes no class for it. This is its own small windowing, not TanStack Virtual (`VirtualList`, `./virtual`): this entry must stay free of libraries.
// It is not the graph: `GraphCanvas` and its tree mode draw things joined by lines; this is a list of nested rows, and
// the two share no code.
import * as React from "react"
import { TreeView as TreeViewPrimitive, createTreeCollection, useTreeViewNodeContext } from "@ark-ui/react/tree-view"
import { cn, isEmptyNode } from "../lib/utils"
import { resendKey } from "../lib/keys"
import { FOCUS_RING_INSET } from "../lib/focus"
import { ROW_CHOSEN, ROW_HOVER } from "../lib/rows"
import { useMotion, useMotionAllowed, type MotionImpl } from "../internal/motion"
import { Icon, type IconName } from "../icons"
import { useWords } from "../words"
import { Count } from "../primitives/count"
import { Logo } from "../primitives/logo"
import { SearchField } from "../components/search-field"

/** A thing of the tree: a row, and the rows it holds. */
export type TreeNode = {
  /** Names the thing among all the others of the tree (a path, a key): the choice and the open branches are ids. */
  id: string
  /** What the row says; the filter by default and the first letters typed look for it. */
  name: string
  /** A meaning of Sigrid's icons (`folder`, `file`…); a name Sigrid does not draw is an empty slot. In a tree where some rows have one, a row without keeps an empty slot (R6). */
  icon?: IconName | (string & {}) | undefined
  /** The icon of a branch while it is open (`folderOpen` for a `folder`). Absent: `icon`, open or closed. */
  openIcon?: IconName | (string & {}) | undefined
  /**
   * A picture of the thing, where it has one of its own (the logo of a service, of a framework): the address of an SVG
   * or a PNG the app serves, drawn in the icon's slot with `Logo`, 16px and whole. The row's icon is in its place
   * while it loads and when it fails. The name of the row says what it is: the picture says nothing to screen readers.
   */
  image?: string | undefined
  /** A short fact at the end of the row, in tabular figures: a size, a date. */
  meta?: React.ReactNode
  /** How many things the node holds or waits on (changed, unread): a `Count` at the end of the row, after `meta`. Zero shows nothing. */
  count?: number | undefined
  /** The rows it holds. With an array (even empty) the row is a branch, which opens and closes. */
  children?: readonly TreeNode[] | undefined
  /** It holds rows the app loads when the branch is opened (`loadChildren`), until then unknown. Read only without `children`; without `loadChildren` the branch holds nothing. */
  hasChildren?: boolean | undefined
  /** The row is there but cannot be chosen, opened or closed, nor taken by `onOpen`: drawn quieter, and still reached by the keys. */
  disabled?: boolean | undefined
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
  /** The person asks to open the thing (Enter, or a double press, on a row): its id, and the node. Besides the choice, which it does not replace; it does not open or close a branch (Right, Left and a single press do). Not for a `disabled` row. */
  onOpen?: ((id: string, node: TreeNode) => void) | undefined
  /** The choice follows the focus: moving it with the arrows chooses the row it reaches, as in a list that shows details beside it. Absent: the choice is made by a press, Enter or Space. `onSelect` is heard once for each move. */
  followFocus?: boolean | undefined
  /** A key on a row, before the tree takes it: the app's own keys (`j` and `k` to move the choice, Delete). `event.preventDefault()` makes the tree do nothing with the key. The id is the row's. */
  onKeyDown?: ((event: React.KeyboardEvent<HTMLElement>, id: string) => void) | undefined
  /** The first letters typed reach a row by its name. Default on; `false` leaves the letters to the app (`onKeyDown`). */
  typeahead?: boolean | undefined
  /** Only the rows in sight are in the page: for thousands of rows. The box needs a height: `fill`, or `className`. */
  virtual?: boolean | undefined
  /** As tall as the region that holds it, which gives it its height (the content of the frame, a pane, a `Panel`'s body, a `Column fill`): the rows scroll inside it, and a field of the filter keeps its place above them. The height `virtual` needs. */
  fill?: boolean | undefined
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
/** A row's height in px before one is measured, the room between two rows, and how many rows are drawn beyond the ones in sight (`virtual`). */
const ROW_ESTIMATE = 32
const ROW_GAP = 2
const OVERSCAN = 10

/** A row of a tree laid flat (`virtual`): its place among its siblings, and how many they are. */
type Flat = { node: Inner; indexPath: number[]; pos: number; size: number }

/** The rows in sight, one after the other: each open branch is followed by what it holds. */
function flatten(nodes: readonly Inner[], open: ReadonlySet<string>, path: readonly number[], into: Flat[]): Flat[] {
  nodes.forEach((node, index) => {
    const indexPath = [...path, index]
    into.push({ node, indexPath, pos: index + 1, size: nodes.length })
    if (node.children && open.has(node.id)) flatten(node.children, open, indexPath, into)
  })
  return into
}

/**
 * A key the tree leaves alone: Ark's handler, which runs after the tree's own and skips an event that is already taken, does
 * nothing with it, and the browser and the app's global keys still have it (the event is not stopped).
 */
function leaveAlone(event: React.SyntheticEvent) {
  ;(event as { defaultPrevented: boolean }).defaultPrevented = true
}

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
      if (node.icon !== undefined || node.openIcon !== undefined || node.image !== undefined) icons = true
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
  /** The branch the person last opened or closed, while motion is on: its rows glide open and shut. */
  pressed: string | null
}
const RowsContext = React.createContext<Rows>({ icons: false, loading: new Map(), failed: new Map(), uid: "", motion: null, pressed: null })

// The row of a branch (Ark's `BranchControl`, made the `treeitem`) and the row of a leaf (Ark's `Item`). `--depth` is the
// level: one level in is 20px, the chevron's slot and its 4px gap, so the chevron of a row sits under the icon of the
// row that holds it.
const ROW = cn(
  "relative flex min-h-(--row-height) w-full cursor-default items-center gap-2 rounded-md pe-(--row-pad) text-start text-sm text-ink-soft pointer-coarse:min-h-11",
  // design-check-ignore-next-line dimension-value: one level in is 20px (the 16px chevron slot and its 4px gap), after the row's own padding
  "ps-[calc(var(--row-pad)_+_(var(--depth)_-_1)_*_1.25rem)]",
  "aria-disabled:pointer-events-none aria-disabled:opacity-50",
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
  /** The picture of the thing, drawn in the icon's slot; the icon is its fallback. */
  image: string | undefined
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
const RowBody = React.memo(function RowBody({ nameId, name, branch, open, chosen, icons, icon, image, meta, count, lazy, status, motion }: BodyProps) {
  const words = useWords()
  // On the chosen row the muted ink would not keep its contrast on the tint: the row's own ink, a step quieter.
  const quiet = chosen ? "opacity-80" : "text-ink-mute"
  const arrow = <Icon name="chevron" className="size-3.5" />
  const detail = lazy || meta !== undefined || count !== undefined
  return (
    <>
      <span className="flex shrink-0 items-center gap-1">
        {/* The chevron of the sidebar's groups, at the start as in every tree; a leaf keeps its slot, empty. */}
        <span aria-hidden="true" data-slot="tree-chevron" className={cn("flex size-4 items-center justify-center", quiet)}>
          {branch ? motion ? <motion.Turn open={open}>{arrow}</motion.Turn> : <span className={cn("inline-flex", open && "rotate-90")}>{arrow}</span> : null}
        </span>
        {icons ? image !== undefined ? <Logo src={image} icon={icon} decorative /> : icon !== undefined ? <Icon name={icon} /> : <span aria-hidden="true" data-slot="tree-icon-empty" className="size-4" /> : null}
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

function TreeRow({ node, indexPath, flat }: { node: Inner; indexPath: number[]; flat?: Flat | undefined }) {
  const { icons, loading, failed, uid, motion, pressed } = React.useContext(RowsContext)
  const state = useTreeViewNodeContext()
  const source = node.source
  if (source === null) return null
  const nameId = `${uid}-${indexPath.join("-")}`
  const busy = node.lazy && loading.get(node.id) === source
  const didFail = node.lazy && !busy && failed.get(node.id) === source
  const open = state.isBranch && state.expanded
  const meta = source.meta
  const hasMeta = !isEmptyNode(meta)
  const hasCount = source.count !== undefined && source.count !== 0
  const names = { "aria-labelledby": nameId, ...(node.lazy || hasMeta || hasCount ? { "aria-describedby": `${nameId}-detail` } : {}) }
  // The level sets the indent; Ark gives it to a leaf's row only.
  const depth = { "--depth": state.depth } as React.CSSProperties
  const disabled = source.disabled === true
  // A row of a tree laid flat says what its place in the nesting would have said.
  const place = flat ? { "aria-level": indexPath.length, "aria-posinset": flat.pos, "aria-setsize": flat.size } : {}
  const dimmed = disabled ? { "aria-disabled": true as const, "data-disabled": "" } : {}
  const body = (
    <RowBody
      nameId={nameId}
      name={node.name}
      branch={state.isBranch}
      open={open}
      chosen={state.selected}
      icons={icons}
      icon={open && source.openIcon !== undefined ? source.openIcon : source.icon}
      image={source.image}
      meta={hasMeta ? meta : undefined}
      count={hasCount ? source.count : undefined}
      lazy={node.lazy}
      status={busy ? "loading" : didFail ? "failed" : null}
      motion={motion}
    />
  )
  if (!state.isBranch) {
    return (
      <TreeViewPrimitive.Item data-slot="tree-row" {...names} {...place} {...dimmed} style={depth} className={ROW}>
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
        aria-owns={open && !flat ? groupId : undefined}
        {...names}
        {...place}
        {...dimmed}
        style={depth}
        className={ROW}
      >
        {body}
      </TreeViewPrimitive.BranchControl>
      {/* The rows of the branch the person just opened or closed glide (theme.css, `[data-reveal]`): closing, they stay
          in the page, hidden, until another branch is pressed. Every other branch draws its rows only while open. */}
      {!flat && (open || pressed === node.id) ? (
        <div role="group" id={groupId} data-slot="tree-group" hidden={!open} {...(pressed === node.id ? { "data-reveal": "" } : {})} className="flex flex-col gap-0.5">
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
  onOpen,
  followFocus = false,
  onKeyDown,
  typeahead = true,
  virtual = false,
  fill = false,
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
  // The row that has the focus in the page now, whoever gave it (a key, a press, the app), or none when it is not in the tree.
  const [has, setHas] = React.useState<string | null>(null)
  // `virtual`: where the box is scrolled to, how tall it is, and how tall a row is (read from the first one drawn).
  const box = React.useRef<HTMLDivElement>(null)
  const holder = React.useRef<HTMLDivElement>(null)
  const [top, setTop] = React.useState(0)
  const [viewport, setViewport] = React.useState(0)
  const [rowSize, setRowSize] = React.useState(ROW_ESTIMATE)
  // The row the focus is to go to once it is drawn (a key reached a row out of sight).
  const wanted = React.useRef<string | null>(null)
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
  // `virtual`: the rows in sight laid flat, and those of them that are drawn.
  const flat = React.useMemo(() => (virtual ? flatten(shown, new Set(view), [], []) : []), [virtual, shown, view])
  const step = rowSize + ROW_GAP
  const from = virtual ? Math.max(0, Math.floor(top / step) - OVERSCAN) : 0
  const to = virtual ? Math.min(flat.length, Math.ceil((top + viewport) / step) + OVERSCAN) : 0
  const tabStop = focused ?? flat[0]?.node.id ?? null
  const stopAt = tabStop === null ? -1 : flat.findIndex((entry) => entry.node.id === tabStop)
  // The row with the focus is kept in the page, whatever the scroll, while the focus is in the tree.
  const heldAt = virtual && has !== null ? flat.findIndex((entry) => entry.node.id === has) : -1
  const held = heldAt >= 0 && (heldAt < from || heldAt >= to) ? heldAt : -1
  const stopDrawn = (stopAt >= from && stopAt < to) || (held >= 0 && flat[held]?.node.id === tabStop)
  // The rows drawn, in one list so that the row with the focus keeps its place in the page (and the focus) as it moves
  // from among them to apart from them: one row above or under, with the room between kept.
  const windowRows: React.ReactNode[] = []
  if (virtual) {
    const draw = (entry: Flat) => (
      <TreeViewPrimitive.NodeProvider key={entry.node.id} node={entry.node} indexPath={entry.indexPath}>
        <TreeRow node={entry.node} indexPath={entry.indexPath} flat={entry} />
      </TreeViewPrimitive.NodeProvider>
    )
    const room = (key: string, rows: number) => (rows > 0 ? <div key={key} aria-hidden="true" data-slot="tree-room" style={{ height: rows * step - ROW_GAP }} /> : null)
    if (held >= 0 && held < from) windowRows.push(draw(flat[held]!), room("room-before", from - held - 1))
    flat.slice(from, to).forEach((entry) => windowRows.push(draw(entry)))
    if (held >= to) windowRows.push(room("room-after", held - to), draw(flat[held]!))
  }
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
  // The one branch the person last opened or closed, kept only with motion on: without it nothing changes in the page.
  const moving = useMotionAllowed(animated)
  const [pressed, setPressed] = React.useState<string | null>(null)
  const rows = React.useMemo(() => ({ icons: tree.icons, loading, failed, uid, motion, pressed: moving ? pressed : null }), [tree.icons, loading, failed, uid, motion, moving, pressed])

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

  // A row reached is chosen once for a press: the focus and the selection both say so, one after the other (a press of the
  // mouse, a key), while a choice the app holds (`selected`) has not come back yet. The next press forgets it.
  const lately = React.useRef<string | null>(null)
  /** The row the app's own choice: not a `disabled` one. */
  const choose = (id: string) => {
    if (id === chosen || id === lately.current) return
    const node = tree.index.get(id)?.source
    if (node?.disabled === true) return
    lately.current = id
    if (selected === undefined) setOwnChoice(id)
    if (node) onSelect?.(id, node)
  }
  const frozen = (id: string) => tree.index.get(id)?.source?.disabled === true

  /** The row the focus is to go to, if it is drawn now. */
  const takeFocus = () => {
    const el = box.current
    if (wanted.current === null || !el) return
    const row = Array.from(el.querySelectorAll<HTMLElement>("[role=treeitem]")).find((candidate) => candidate.dataset.value === wanted.current)
    if (!row) return
    wanted.current = null
    if (row !== document.activeElement) row.focus()
  }
  // `virtual`: the box is as tall as it is, and a row as tall as the first one drawn: read where they are drawn.
  React.useLayoutEffect(() => {
    if (!virtual) return
    const el = box.current
    if (el && el.clientHeight !== viewport) setViewport(el.clientHeight)
    const first = holder.current?.children[0]
    const height = first instanceof HTMLElement ? first.offsetHeight : 0
    if (height > 0 && height !== rowSize) setRowSize(height)
    // A row reached out of sight takes the focus once it is drawn.
    takeFocus()
  })

  React.useEffect(() => {
    const el = box.current
    if (!virtual || !el || typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(() => setViewport(el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [virtual])
  /** Where the box is scrolled to, as the row it begins at: the rows drawn change with a row, not with a pixel. */
  const scrolled = (scrollTop: number) => setTop(Math.floor(scrollTop / step) * step)
  /** Scrolls the box so that the row with this id is in it, by the least it takes. */
  const scrollTo = (id: string) => {
    const el = box.current
    const at = flat.findIndex((entry) => entry.node.id === id)
    if (!virtual || !el || at < 0) return
    const start = at * step
    const next = start < el.scrollTop ? start : start + rowSize > el.scrollTop + el.clientHeight ? start + rowSize - el.clientHeight : el.scrollTop
    if (next !== el.scrollTop) {
      el.scrollTop = next
      scrolled(next)
    }
  }
  /** Gives the row the focus, now or (with `virtual`, once it is scrolled to) when it is drawn. */
  const take = (id: string) => {
    wanted.current = id
    scrollTo(id)
    takeFocus()
  }
  const reveal = (id: string) => {
    if (virtual && box.current && flat.some((entry) => entry.node.id === id)) take(id)
  }
  // The app changed the choice (a key of its own): the row is shown, and the focus, if it is in the tree, goes there, so
  // that Enter and the keys that follow are on the row chosen. A choice the person made is already where the focus is.
  React.useEffect(() => {
    if (chosen === null || !flat.some((entry) => entry.node.id === chosen)) return
    scrollTo(chosen)
    const el = box.current
    if (el && el.contains(document.activeElement) && focus !== chosen && !frozen(chosen)) {
      setFocus(chosen)
      take(chosen)
    }
    // Only a new choice moves things: the rows and the focus change all the time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen])
  /** Home and End of a tree with rows out of sight: the first and the last row of all, not of those drawn. */
  const ends = (event: React.KeyboardEvent) => {
    if (!virtual || (event.key !== "Home" && event.key !== "End") || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    const id = (event.key === "Home" ? flat[0] : flat[flat.length - 1])?.node.id
    if (id === undefined) return
    event.preventDefault()
    event.stopPropagation()
    setFocus(id)
    reveal(id)
    if (followFocus) choose(id)
  }

  /** Enter or a double press on a row: the app is asked to open the thing. */
  const asked = (target: EventTarget) => {
    if (!onOpen || !(target instanceof Element)) return
    const id = target.closest<HTMLElement>("[data-part=branch-control], [data-part=item], [role=treeitem]")?.dataset.value
    const node = id === undefined ? undefined : tree.index.get(id)?.source
    if (id !== undefined && node && node.disabled !== true) onOpen(id, node)
  }

  const setQuery = (value: string) => {
    if (query === undefined) setOwnQuery(value)
    onQueryChange?.(value)
  }

  return (
    <TreeViewPrimitive.Root
      data-slot="tree"
      data-fill={fill || undefined}
      collection={collection}
      selectedValue={chosen === null ? [] : [chosen]}
      expandedValue={view}
      focusedValue={focused}
      onSelectionChange={(details) => {
        const id = details.selectedValue[0]
        if (id !== undefined) choose(id)
      }}
      onExpandedChange={(details) => {
        const next = details.expandedValue
        const before = new Set(view)
        const after = new Set(next)
        // `*` opens every row beside the one in focus, leaves too: only branches are kept.
        const opened = next.filter((id) => {
          const node = tree.index.get(id)
          return !before.has(id) && node !== undefined && (node.lazy || node.children !== undefined) && !frozen(id)
        })
        const closed = new Set(view.filter((id) => !after.has(id) && !frozen(id)))
        // One branch opened or closed is the person's press on it; several at once (`*`) glide nowhere.
        const toggled = [...opened, ...closed]
        setPressed(toggled.length === 1 ? toggled[0]! : null)
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
      onFocusChange={(details) => {
        const id = details.focusedValue
        setFocus(id)
        if (id === null) return
        reveal(id)
        if (followFocus) choose(id)
      }}
      translations={{ treeLabel: label }}
      className={cn("flex min-h-0 flex-col gap-2", fill && "h-full flex-1", className)}
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
        ref={box}
        data-slot="tree-rows"
        onKeyDownCapture={(event) => {
          lately.current = null
          if (virtual) ends(event)
        }}
        onPointerDownCapture={() => {
          lately.current = null
        }}
        onScroll={virtual ? (event) => scrolled(event.currentTarget.scrollTop) : undefined}
        onDoubleClick={onOpen ? (event) => asked(event.target) : undefined}
        // Ark's rows stop the focus events at themselves: the capture phase hears them first.
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHas(null)
        }}
        // Where the row that is the Tab stop is not drawn, the box itself is, and hands the focus to that row.
        tabIndex={virtual && !stopDrawn && tabStop !== null ? 0 : undefined}
        onFocusCapture={(event) => {
          // With `virtual` the row that has the focus stays in the page when it is scrolled out of sight.
          const row = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=treeitem]") : null
          if (row?.dataset.value !== undefined) setHas(row.dataset.value)
          if (virtual && !stopDrawn && tabStop !== null && event.target === event.currentTarget) reveal(tabStop)
        }}
        hidden={shown.length === 0 || undefined}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          const target = event.target instanceof Element ? event.target : null
          const id = target?.closest<HTMLElement>("[data-part=branch-control], [data-part=item], [role=treeitem]")?.dataset.value
          // The app's keys first: what it takes with `preventDefault()`, the tree leaves alone (Ark does the same).
          if (id !== undefined && onKeyDown) {
            onKeyDown(event, id)
            if (event.defaultPrevented) return
          }
          const { key } = event
          const command = event.metaKey || event.ctrlKey || event.altKey
          // Enter, Space, Right and Left with a modifier held are not the tree's; nor are the letters, when the app wants them.
          if (((key === "Enter" || key === " " || key === "ArrowRight" || key === "ArrowLeft") && (command || event.shiftKey)) || (!typeahead && key.length === 1 && key !== " " && key !== "*" && !command)) {
            leaveAlone(event)
            return
          }
          // The app is asked to open the thing, besides the choice, and nothing is opened or closed: Right and Left fold.
          if (key === "Enter" && onOpen && id !== undefined) {
            event.preventDefault()
            choose(id)
            asked(event.target)
            return
          }
          // The key that goes in is Right, or Left where the tree is written from the right: Ark reads the arrows in the
          // `dir` it writes on the tree (the page's, `DirectionProvider`), and the tree reads the same one.
          const goesIn = event.currentTarget.dir === "rtl" ? "ArrowLeft" : "ArrowRight"
          // A branch that loads takes no second opening: Enter and the key that goes in are left to nothing (Ark would ask again).
          if ((key === "Enter" || key === goesIn) && id !== undefined && target?.closest("[data-part=branch-control]") && pending.current.has(id)) {
            event.preventDefault()
            return
          }
          // Ark keeps `a` for Cmd+A (choose all, which a tree of one choice does not do), so a plain `a` reaches no
          // name: it is sent again as `A`, which the first letters typed read the same, ignoring case.
          if (key !== "a" || command) return
          event.preventDefault()
          resendKey(event.target, "A", event)
        }}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
      >
        <RowsContext.Provider value={rows}>
          {virtual ? (
            <div
              ref={holder}
              role="presentation"
              data-slot="tree-window"
              className="flex flex-col gap-0.5"
              // The room of the rows not drawn; the row with the focus, drawn apart from the others, has its own place in it.
              style={{ paddingTop: (held >= 0 && held < from ? held : from) * step, paddingBottom: Math.max(0, flat.length - (held >= to ? held + 1 : to)) * step }}
            >
              {windowRows}
            </div>
          ) : (
            <TreeRows nodes={shown} path={[]} />
          )}
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
