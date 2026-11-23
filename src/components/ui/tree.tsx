// Park UI (MIT) tree-view 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tree-view.ts)
// A tree of rows: things that hold other things (folders and files, sections and pages, any hierarchy), each a row with
// its name, an icon of the user's pack, a short fact at its end, and the rows it holds under it, one level in.
// Behaviour: Ark UI's TreeView. The rows are one Tab stop (the chosen row when it is in sight); Down and Up move, Right
// opens a branch and then goes into it, Left closes it and then goes out to the branch that holds the row, Home and End
// reach the first and the last row in sight, the first letters of a name reach it, `*` opens the branches beside the
// row; Enter, Space or a press choose a row, and on a branch also open or close it. One row is chosen, never several.
// Branches whose children the app loads (`hasChildren` and `loadChildren`) load them when they are opened: the row says
// «Loading» meanwhile, and if the load fails it says so and stays closed, so opening it again tries again.
// With `search` a field above the rows filters them by name: what is found is shown with the branches that lead to it
// opened, and clearing the field gives back what the person had opened (and what they opened while it was filtered).
// Form: Park's `tree-view` recipe on the toolkit's tokens: rows of the density's row height (44px with a finger), l2,
// 14px, one level in 20px (Park's 22px, on the 4px grid), a 16px chevron that turns a quarter when open, the icon after
// it, the fact at the end in 12px tabular figures. The chosen row has the selection tint and stronger text (R1); under
// the pointer a row takes a share of that tint, as in every list of the toolkit. Not taken from Park: the chevron in the
// accent (R2: it is chrome, in the muted ink), the semibold of the first level (semibold says «chosen»), the line that
// guides the eye down a branch and the accent bar of the chosen row (2026-11-23), the transitions (nothing moves).
// It is not the graph: `GraphCanvas` and its tree mode draw things joined by lines; this is a list of nested rows, and
// the two share no code.
import * as React from "react"
import { ChevronRight } from "lucide-react"
import { TreeView as TreeViewPrimitive, createTreeCollection, useTreeViewNodeContext } from "@ark-ui/react/tree-view"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"
import { SearchField } from "./search-field"

/** A thing of the tree: a row, and the rows it holds. */
export type TreeNode = {
  /** Names the thing among all the others of the tree (a path, a key): the choice and the open branches are ids. */
  id: string
  /** What the row says; the filter and the first letters typed look for it. */
  name: string
  /** A meaning of the toolkit's icons (`newFolder`, `attach`…) or of the app's own (`IconPackProvider`'s `icons`), drawn in the user's pack. In a tree where some rows have one, a row without keeps an empty slot (R6). */
  icon?: IconName | (string & {}) | undefined
  /** A short fact at the end of the row, in tabular figures: a size, a count, a date. */
  meta?: React.ReactNode
  /** The rows it holds. With an array (even empty) the row is a branch, which opens and closes. */
  children?: readonly TreeNode[] | undefined
  /** It holds rows the app loads when the branch is opened (`loadChildren`), until then unknown. Read only without `children`. */
  hasChildren?: boolean | undefined
}

export type TreeProps = {
  /** Name of the tree for screen readers («Files»). */
  "aria-label": string
  /** The first level of the tree. */
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
  /** The person opened or closed a branch: the whole list of the branches they opened. */
  onExpandedChange?: ((expanded: string[]) => void) | undefined
  /** Loads the rows of a branch with `hasChildren`, when it is first opened. A promise that fails leaves the branch closed, saying so; opening it again tries again. The signal says the tree no longer waits. */
  loadChildren?: ((node: TreeNode, signal: AbortSignal) => Promise<readonly TreeNode[]>) | undefined
  /** A field above the rows that filters them by name. */
  search?: boolean | undefined
  /** The name and placeholder of that field. Absent: the toolkit's words («Filter by name»). */
  searchLabel?: string | undefined
  className?: string | undefined
}

/** A node as the tree draws it: the app's, with the children it loaded, or the ones the filter keeps. */
type Inner = {
  id: string
  name: string
  /** The app's node; null for the root, which is not drawn. */
  source: TreeNode | null
  /** Its children are the app's to load (`hasChildren` without `children`). */
  lazy: boolean
  /** Undefined: a leaf, or a branch whose children are still to load. */
  children?: Inner[] | undefined
}

/** The value of the root of Ark's collection: no id of the app's can be it. */
const ROOT = "\u0000tree-root"
/** What a load Ark gave up fails with, in place of the app's error: it is not a failure to show. */
const ABORTED = new Error("The tree no longer waits for these children.")

/** The nodes of the app with the children loaded for them, every node by its id, and whether any row has an icon. */
function resolve(nodes: readonly TreeNode[], loaded: ReadonlyMap<string, readonly TreeNode[]>) {
  const index = new Map<string, Inner>()
  let icons = false
  const walk = (list: readonly TreeNode[]): Inner[] =>
    list.map((node) => {
      if (node.icon !== undefined) icons = true
      const lazy = node.children === undefined && node.hasChildren === true
      const held = node.children ?? (lazy ? loaded.get(node.id) : undefined)
      const inner: Inner = { id: node.id, name: node.name, source: node, lazy, children: held ? walk(held) : undefined }
      index.set(node.id, inner)
      return inner
    })
  return { nodes: walk(nodes), index, icons }
}

/**
 * What the filter keeps: a node whose name holds the text, with all it holds, and a node that leads to one, with what
 * it keeps of its own. The branches that lead to a find go into `open`.
 */
function filterTree(nodes: readonly Inner[], text: string, open: Set<string>): Inner[] {
  const kept: Inner[] = []
  for (const node of nodes) {
    const below = node.children ? filterTree(node.children, text, open) : []
    if (below.length > 0) open.add(node.id)
    if (node.name.toLowerCase().includes(text)) kept.push(node)
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

const RowsContext = React.createContext<{ icons: boolean; failed: ReadonlySet<string>; uid: string }>({ icons: false, failed: new Set<string>(), uid: "" })

// The row of a branch (Ark's `BranchControl`) and the row of a leaf (Ark's `Item`). Ark sets `--depth` on each: one level
// in is 20px, the chevron and its 4px gap, so the chevron of a row sits under the icon of the row that holds it.
const ROW = cn(
  "relative flex min-h-(--row-height) w-full cursor-default items-center gap-2 rounded-md pe-(--row-pad) text-start text-sm text-ink-soft pointer-coarse:min-h-11",
  // design-check-ignore-next-line dimension-value: one level in is 20px (the 16px chevron and its 4px gap), after the row's own padding
  "ps-[calc(var(--row-pad)_+_(var(--depth)_-_1)_*_1.25rem)]",
  "hover:bg-selected/60 hover:text-ink data-[selected]:bg-selected data-[selected]:text-selected-ink",
  FOCUS_RING_INSET,
)

function TreeRow({ node, indexPath }: { node: Inner; indexPath: number[] }) {
  const words = useWords()
  const { icons, failed, uid } = React.useContext(RowsContext)
  const state = useTreeViewNodeContext()
  // The row is named by its name alone; what it says at its end (the fact, or that it loads) describes it.
  const nameId = `${uid}-${indexPath.join("-")}`
  const detailId = `${nameId}-detail`
  const didFail = node.lazy && failed.has(node.id) && !state.loading
  const status = state.loading ? words.tree.loading : didFail ? words.tree.failed : null
  const meta = node.source?.meta
  const hasMeta = meta !== undefined && meta !== null && meta !== false && meta !== ""
  const described = node.lazy || hasMeta
  // On the chosen row the muted ink would not keep its contrast on the tint: the row's own ink, a step quieter.
  const quiet = state.selected ? "opacity-80" : "text-ink-mute"
  const names = { "aria-labelledby": nameId, ...(described ? { "aria-describedby": detailId } : {}) }
  const icon = node.source?.icon
  const content = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {state.isBranch ? (
          <TreeViewPrimitive.BranchIndicator data-slot="tree-chevron" className={cn("flex size-4 items-center justify-center data-[state=open]:rotate-90", quiet)}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </TreeViewPrimitive.BranchIndicator>
        ) : (
          <span aria-hidden="true" className="size-4" />
        )}
        {icons ? icon !== undefined ? <Icon name={icon} /> : <span aria-hidden="true" data-slot="tree-icon-empty" className="size-4" /> : null}
      </div>
      {state.isBranch ? (
        <TreeViewPrimitive.BranchText id={nameId} data-slot="tree-name" className={cn("min-w-0 flex-1 truncate", state.selected && "font-semibold")}>
          {node.name}
        </TreeViewPrimitive.BranchText>
      ) : (
        <TreeViewPrimitive.ItemText id={nameId} data-slot="tree-name" className={cn("min-w-0 flex-1 truncate", state.selected && "font-semibold")}>
          {node.name}
        </TreeViewPrimitive.ItemText>
      )}
      {described ? (
        <span id={detailId} className="flex shrink-0 items-center gap-2 text-2xs">
          {node.lazy ? (
            // Always in the page for a branch that loads, so a screen reader hears it start and fail.
            <span data-slot="tree-status" aria-live="polite" className={didFail && !state.selected ? "text-destructive" : quiet}>
              {status}
              {didFail ? <span className="sr-only"> {words.tree.retry}</span> : null}
            </span>
          ) : null}
          {hasMeta && status === null ? (
            <span data-slot="tree-meta" className={cn("tabular-nums", quiet)}>
              {meta}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )
  if (!state.isBranch) {
    return (
      <TreeViewPrimitive.Item data-slot="tree-row" {...names} className={ROW}>
        {content}
      </TreeViewPrimitive.Item>
    )
  }
  return (
    <TreeViewPrimitive.Branch data-slot="tree-branch" {...names} className="flex flex-col gap-0.5">
      <TreeViewPrimitive.BranchControl data-slot="tree-row" {...names} className={ROW}>
        {content}
      </TreeViewPrimitive.BranchControl>
      <TreeViewPrimitive.BranchContent data-slot="tree-group" className="flex flex-col gap-0.5">
        <TreeRows nodes={node.children ?? []} path={indexPath} />
      </TreeViewPrimitive.BranchContent>
    </TreeViewPrimitive.Branch>
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

function Tree({ nodes, selected, defaultSelected = null, onSelect, expanded, defaultExpanded, onExpandedChange, loadChildren, search = false, searchLabel, className, ...aria }: TreeProps) {
  const words = useWords()
  const label = aria["aria-label"]
  const uid = React.useId()
  const [loaded, setLoaded] = React.useState<ReadonlyMap<string, readonly TreeNode[]>>(() => new Map())
  const [failed, setFailed] = React.useState<ReadonlySet<string>>(() => new Set())
  const [ownChoice, setOwnChoice] = React.useState<string | null>(defaultSelected)
  const [ownOpen, setOwnOpen] = React.useState<readonly string[]>(defaultExpanded ?? [])
  const [focus, setFocus] = React.useState<string | null>(null)
  const [typed, setTyped] = React.useState("")
  // The branches open while the field filters, once the person opened or closed one: for the text they were filtered by.
  const [filtered, setFiltered] = React.useState<{ text: string; open: readonly string[] } | null>(null)

  const chosen = selected !== undefined ? selected : ownChoice
  const open = expanded ?? ownOpen
  const text = search ? typed.trim().toLowerCase() : ""
  const tree = React.useMemo(() => resolve(nodes, loaded), [nodes, loaded])
  const found = React.useMemo(() => {
    if (text === "") return null
    const leading = new Set<string>()
    return { nodes: filterTree(tree.nodes, text, leading), leading }
  }, [tree, text])
  const shown = found ? found.nodes : tree.nodes
  // What is open in sight: the person's branches or, while the field filters, those that lead to a find as well. A branch
  // still to load opens only through Ark, which loads it first: an id of one is held back until its children are here.
  const view = React.useMemo(() => {
    const ids = found ? (filtered !== null && filtered.text === text ? filtered.open : [...new Set([...found.leading, ...open])]) : open
    return ids.filter((id) => {
      const node = tree.index.get(id)
      return node !== undefined && !(node.lazy && node.children === undefined)
    })
  }, [found, filtered, text, open, tree])
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
  const rows = React.useMemo(() => ({ icons: tree.icons, failed, uid }), [tree.icons, failed, uid])

  // The app's loader of the last paint, read when a branch opens, so `load` stays one function for Ark.
  const loader = React.useRef(loadChildren)
  loader.current = loadChildren
  // Children that came, kept here until Ark has marked their branch loaded (`onLoadChildrenComplete`): Ark marks it in
  // place, without a paint of its own, so the paint that shows them must come after.
  const arrived = React.useRef(new Map<string, readonly TreeNode[]>())
  const load = React.useCallback(({ node, signal }: { node: Inner; signal: AbortSignal }): Promise<Inner[]> => {
    const own = loader.current
    const source = node.source
    // A branch given with no children: Ark asks for them too, and there are none.
    if (!own || !node.lazy || source === null) return Promise.resolve([])
    setFailed((before) => {
      if (!before.has(node.id)) return before
      const after = new Set(before)
      after.delete(node.id)
      return after
    })
    // One chain: a loader that throws is a promise that fails, and Ark hears the failure (no rejection is left unheard).
    return new Promise<readonly TreeNode[]>((done) => done(own(source, signal))).then(
      (children) => {
        arrived.current.set(node.id, children)
        return []
      },
      (error: unknown) => {
        // A load Ark gave up for a newer one is not a failure: the newer one says how it went.
        throw signal.aborted ? ABORTED : error
      },
    )
  }, [])

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
        if (found) setFiltered({ text, open: next })
        if (opened.length === 0 && closed.size === 0) return
        // What the person did, kept in their own list: the branches the filter opened are not theirs.
        const mine = [...new Set([...open, ...opened])].filter((id) => !closed.has(id))
        if (expanded === undefined) setOwnOpen(mine)
        onExpandedChange?.(mine)
      }}
      onFocusChange={(details) => setFocus(details.focusedValue)}
      {...(loadChildren ? { loadChildren: load } : {})}
      onLoadChildrenComplete={() => {
        if (arrived.current.size === 0) return
        const batch = new Map(arrived.current)
        arrived.current.clear()
        setLoaded((before) => new Map([...before, ...batch]))
      }}
      onLoadChildrenError={(details) => {
        const ids = details.nodes.filter((failure) => failure.error !== ABORTED).map((failure) => failure.node.id)
        // Always a new set, so the row is painted again once Ark has taken its «loading» away.
        setFailed((before) => new Set([...before, ...ids]))
      }}
      translations={{ treeLabel: label }}
      lazyMount
      unmountOnExit
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      {/* The tree's name: Ark names the tree by its label. Hidden, it is read as the name and nowhere else. */}
      <TreeViewPrimitive.Label asChild>
        <span hidden>{label}</span>
      </TreeViewPrimitive.Label>
      {search ? (
        <SearchField
          value={typed}
          onValueChange={(value) => {
            setTyped(value)
            // Cleared: what the person opened while filtering is in their own list already; the next filter starts afresh.
            if (value.trim() === "") setFiltered(null)
          }}
          aria-label={searchLabel ?? words.tree.filter}
          placeholder={searchLabel ?? words.tree.filter}
          className="shrink-0"
        />
      ) : null}
      <TreeViewPrimitive.Tree
        data-slot="tree-rows"
        hidden={shown.length === 0 || undefined}
        onKeyDown={(event) => {
          // Ark keeps `a` for Cmd+A (choose all, which a tree of one choice does not do), so a plain `a` reaches no
          // name: it is sent again as `A`, which the first letters typed read the same, ignoring case.
          if (event.key !== "a" || event.metaKey || event.ctrlKey || event.altKey || event.nativeEvent.isComposing) return
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
          {words.tree.empty}
        </p>
      ) : null}
    </TreeViewPrimitive.Root>
  )
}

export { Tree }
