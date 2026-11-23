// A canvas for a graph of things and what joins them (tasks and what they wait for, the parts of a project, notes
// that lead to other notes, the calls between the parts of a program): the user moves over it, looks at one thing and
// what is joined to it, opens and closes what hangs from a thing and, where the app lets them, draws: adds a thing,
// joins two, takes one away. The canvas, its pan and zoom, the lines and the joining by hand are React Flow's
// (`@xyflow/react`), the places of the things are dagre's (`@dagrejs/dagre`): npm dependencies, pinned, see
// THIRD_PARTY.md. The form is the toolkit's. It has its own entry of the package (`./graph`) and its own stylesheet
// (`./graph.css`), so an app without a graph loads neither.
// - The graph is laid out by itself, in ranks: from the start to the end of the line (`direction="right"`) or from
//   the head to the foot (`"down"`). The user does not place things by hand, so nothing can be lost off the canvas.
// - A thing is a raised surface with a shadow and no border (R4): an icon or a dot of its colour (R10), a name, a
//   line under it. The chosen one has the selection tint (R1); what is joined to it stays as it is and the rest is
//   dimmed, so the eye finds the neighbourhood. The app shows the details of the chosen thing where it likes (the
//   `Inspector` of the frame).
// - Two ways to read the lines (`model`). In the tree mode, the default, a line says that a thing hangs from another:
//   - A thing with others hanging from it has an arrow: closed, it says how many it hides, and the graph is laid out
//     again without them. What can be reached another way stays in sight.
//   - The keyboard is the one of a tree, and the things are one Tab stop: Down and Up go through what is in sight,
//     Right opens or goes to the first thing that hangs, Left closes or goes back to what it hangs from, Home and End
//     reach the ends, Enter chooses. Screen readers hear a tree: the name of a thing, its level, whether it is open,
//     how many it hides.
// - In the graph mode (`model="graph"`) a line is a relation (a call, an import, data that flows), not «hangs from»:
//   - Nothing closes: every thing is in sight and none has an arrow. Opening a thing is the app's (going into it,
//     showing what it holds): a double press on it or its › button calls `onOpen` with its id. Without `onOpen` there
//     is no › and nothing opens.
//   - The things are one Tab stop, and the › of the one that has it is the next. Along the ranks the arrows follow the
//     lines: with `direction="right"` Right goes to what the thing's first line leads to and Left back to what its
//     first line comes from, while Down and Up go through the things in the order the app gave them; downwards the
//     axes swap. Home and End reach the first and the last thing of that order, Enter chooses. Screen readers hear a
//     graph of buttons, each saying whether it is chosen.
// - In both modes +, − and 0 zoom in, out and fit the whole graph, as the buttons at the head of the canvas do, and
//   with `editable` Delete takes the thing away.
// - With `search` a field finds things by name; the others are dimmed, and Enter goes to the first one found,
//   opening what hides it.
// - With `editable` a thing shows its handles: drag from one to another thing to join them, press the plus on the
//   chosen thing to hang a new one from it. Every change is asked of the app with `onChange`, which keeps the graph
//   (and its undo, R12): nothing is kept here but what is open and where the view is.
// The cost is the layout, done again when the graph changes or a thing opens or closes: about 30ms for 200 things in
// sight, 200ms for a thousand, most of a second for three thousand (measured). A larger graph starts with its
// branches closed (`defaultCollapsed`). Moving the view costs little: only what is in it is drawn.
// Nothing moves by itself: the layout jumps to its new places, with or without animations. The name of React Flow
// stays at the foot of the canvas, as its makers ask of whoever does not pay for it.
import * as React from 'react'
import dagre from '@dagrejs/dagre'
import { Background, BackgroundVariant, Handle, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { Maximize } from 'lucide-react'
import { Icon, type IconName } from '../icons'
import { markHueAttrs } from '../colors'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { Count } from './ui/count'
import { SearchField } from './ui/search-field'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'

export type GraphNode = {
  id: string
  /** The name of the thing: one line, cut with an ellipsis. */
  label: string
  /** A second line under the name: a state, a date, a person. */
  detail?: string | undefined
  /** An icon of the user's pack before the name. */
  icon?: IconName | undefined
  /** The colour the user gave the thing (`#rrggbb`): an 8px dot before the name (R10). */
  color?: string | undefined
}

/** What joins two things: in the tree mode `to` hangs from `from`; in the graph mode the line goes from `from` to `to`. */
export type GraphEdge = { from: string; to: string }

export type Graph = { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }

/** What the user did to the graph: a thing hung from another, two things joined, things and joins taken away. */
export type GraphChange = { kind: 'add'; node: GraphNode; edge: GraphEdge } | { kind: 'join'; edge: GraphEdge } | { kind: 'remove'; nodes: readonly string[]; edges: readonly GraphEdge[] }

export type GraphCanvasProps = {
  /** The name of the graph for screen readers («Dependencies»). */
  'aria-label': string
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  /**
   * How the lines are read. `tree` (the default): a thing hangs from another, so a thing with others hanging from it
   * opens and closes, and the keys and the roles are a tree's. `graph`: a line is a relation (a call, an import, data),
   * every thing stays in sight with nothing that closes, the arrows follow the lines, and opening is the app's (`onOpen`).
   */
  model?: 'tree' | 'graph' | undefined
  /** The ranks go from the start of the line to its end, or from the head to the foot. Default `right`. */
  direction?: 'right' | 'down' | undefined
  /** The id of the thing chosen: the one whose details the app shows. */
  selected?: string | null | undefined
  onSelect?: ((id: string | null) => void) | undefined
  /** In the graph mode, the app opens a thing (goes into it, shows what it holds): asked by a double press on it or by its › button. Without it nothing opens. */
  onOpen?: ((id: string) => void) | undefined
  /** In the tree mode, the ids of the things that are closed, when the app keeps them; otherwise the canvas keeps its own, from `defaultCollapsed`. */
  collapsed?: readonly string[] | undefined
  defaultCollapsed?: readonly string[] | undefined
  onCollapsedChange?: ((ids: string[]) => void) | undefined
  /** A field that finds things by name. */
  search?: boolean | undefined
  /** A small map of the whole graph in a corner. */
  minimap?: boolean | undefined
  /** The user can hang a new thing, join two and take one away. Each change is asked for with `onChange`. */
  editable?: boolean | undefined
  /** The graph after a change, and the change: the app keeps the graph. */
  onChange?: ((next: Graph, change: GraphChange) => void) | undefined
  /** Classes of the box: its height (`h-96`, or a place in a column that gives it one). */
  className?: string | undefined
}

/** The sizes of a thing in px, which the layout needs before anything is drawn: `w-52`, and `h-11` or `h-14` with a second line. */
const WIDTH = 208
const heightOf = (node: GraphNode) => (node.detail ? 56 : 44)

/** What hangs from each thing and what each hangs from, in the order the joins were given. Joins to things that are not there are left out. */
function links(graph: Graph) {
  const ids = new Set(graph.nodes.map((node) => node.id))
  const below = new Map<string, string[]>()
  const above = new Map<string, string[]>()
  for (const id of ids) {
    below.set(id, [])
    above.set(id, [])
  }
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || below.get(edge.from)!.includes(edge.to)) continue
    below.get(edge.from)!.push(edge.to)
    above.get(edge.to)!.push(edge.from)
  }
  return { below, above }
}

/**
 * What is in sight with some things closed, in the order of a tree read from its roots: a thing is in sight if it
 * hangs from nothing, or if some way to it passes through no closed thing. `level` counts from 1; `hidden` is how
 * many things a closed one keeps out of sight.
 */
export function visibleGraph(graph: Graph, collapsed: readonly string[]): { order: string[]; level: Map<string, number>; hidden: Map<string, number> } {
  const { below, above } = links(graph)
  const closed = new Set(collapsed)
  const order: string[] = []
  const level = new Map<string, number>()
  const walk = (id: string, depth: number) => {
    if (level.has(id)) return
    level.set(id, depth)
    order.push(id)
    if (!closed.has(id)) for (const next of below.get(id) ?? []) walk(next, depth + 1)
  }
  const roots = graph.nodes.filter((node) => (above.get(node.id) ?? []).length === 0).map((node) => node.id)
  // What a start reaches with nothing closed: a thing reached and not in sight is hidden by something closed.
  const reached = new Set<string>()
  const reach = (id: string) => {
    if (reached.has(id)) return
    reached.add(id)
    for (const next of below.get(id) ?? []) reach(next)
  }
  // A graph that is all one ring hangs from nothing: its first thing is where it is read from.
  for (const id of roots.length > 0 ? roots : graph.nodes.slice(0, 1).map((node) => node.id)) {
    reach(id)
    walk(id, 1)
  }
  // What no start reaches at all (a ring beside the rest) is read after it, from its first thing.
  for (const node of graph.nodes) {
    if (reached.has(node.id)) continue
    reach(node.id)
    walk(node.id, 1)
  }
  const hidden = new Map<string, number>()
  for (const id of closed) {
    if (!level.has(id)) continue
    const seen = new Set<string>()
    const count = (from: string) => {
      for (const next of below.get(from) ?? []) {
        if (seen.has(next) || level.has(next)) continue
        seen.add(next)
        count(next)
      }
    }
    count(id)
    hidden.set(id, seen.size)
  }
  return { order, level, hidden }
}

/** What is in sight in the graph mode, where nothing closes: every thing, in the order the app gave, all at one level. */
function wholeGraph(graph: Graph): { order: string[]; level: Map<string, number>; hidden: Map<string, number> } {
  const order: string[] = []
  const level = new Map<string, number>()
  for (const node of graph.nodes) {
    if (level.has(node.id)) continue
    level.set(node.id, 1)
    order.push(node.id)
  }
  return { order, level, hidden: new Map<string, number>() }
}

/** The place of each thing in sight, by ranks: the top left corner of its box, in px. */
export function layoutGraph(graph: Graph, shown: readonly string[], direction: 'right' | 'down'): Map<string, { x: number; y: number }> {
  const inSight = new Set(shown)
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction === 'right' ? 'LR' : 'TB', nodesep: 16, ranksep: 56, marginx: 16, marginy: 16 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const node of graph.nodes) if (inSight.has(node.id)) g.setNode(node.id, { width: WIDTH, height: heightOf(node) })
  for (const edge of graph.edges) if (inSight.has(edge.from) && inSight.has(edge.to) && edge.from !== edge.to) g.setEdge(edge.from, edge.to)
  dagre.layout(g)
  const places = new Map<string, { x: number; y: number }>()
  for (const node of graph.nodes) {
    if (!inSight.has(node.id)) continue
    const at = g.node(node.id)
    // dagre gives the middle of a box.
    places.set(node.id, { x: Math.round(at.x - WIDTH / 2), y: Math.round(at.y - heightOf(node) / 2) })
  }
  return places
}

type Drawn = {
  node: GraphNode
  level: number
  /** How many things hang from it, and how many of them a closed one hides. */
  children: number
  hidden: number
  open: boolean
  chosen: boolean
  dim: boolean
  stop: boolean
  editable: boolean
  direction: 'right' | 'down'
  /** In the graph mode, whether the app opens things: the › of a thing and a double press on it. */
  opens: boolean
  onToggle: (id: string) => void
  onAdd: (id: string) => void
  onOpen: (id: string) => void
  onKey: (event: React.KeyboardEvent<HTMLDivElement>, id: string) => void
  onFocus: (id: string) => void
}

const HANDLE = 'size-2! min-h-0! min-w-0! rounded-full! border-0! bg-ink-mute!'
/** The small buttons on a thing: the plus that hangs a new one, the arrow that opens and closes, the › that opens. */
const ON_THING = 'nodrag nopan inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-ink/6 [&_svg]:size-3.5'

/** What a thing shows: its icon or the dot of its colour, its name and the line under it. */
function Face({ node, chosen }: { node: GraphNode; chosen: boolean }) {
  return (
    <>
      {node.icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 text-ink-mute [&_svg]:size-4">
          <Icon name={node.icon} />
        </span>
      ) : node.color ? (
        <span {...markHueAttrs(node.color)} data-mark-dot="" aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--mark-dot)" />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{node.label}</span>
        {node.detail ? <span className={cn('truncate text-xs font-normal', chosen ? 'opacity-80' : 'text-ink-mute')}>{node.detail}</span> : null}
      </span>
    </>
  )
}

/** A thing on the canvas in the tree mode: an item of the tree. */
const Thing = React.memo(function Thing({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const { node, direction, editable } = data
  const has = data.children > 0
  return (
    <div
      role="treeitem"
      data-slot="graph-node"
      data-node-id={node.id}
      tabIndex={data.stop ? 0 : -1}
      aria-level={data.level}
      aria-selected={data.chosen}
      aria-expanded={has ? data.open : undefined}
      aria-label={has && !data.open ? words.closed(node.label, data.hidden) : node.label}
      onKeyDown={(event) => data.onKey(event, node.id)}
      onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
      className={cn(
        'group relative flex w-52 cursor-default items-center gap-2 rounded-md bg-raised px-3 text-sm text-ink shadow-sm',
        node.detail ? 'h-14' : 'h-11',
        data.chosen && 'bg-selected font-semibold text-selected-ink',
        data.dim && 'opacity-40',
        FOCUS_RING,
      )}
    >
      {/* Where a line arrives and where it leaves: in sight only where the user may draw one. */}
      <Handle type="target" position={direction === 'right' ? Position.Left : Position.Top} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
      <Face node={node} chosen={data.chosen} />
      {editable && data.chosen ? (
        <button type="button" tabIndex={-1} data-slot="graph-add" aria-label={words.add(node.label)} onClick={(event) => { event.stopPropagation(); data.onAdd(node.id) }} className={cn(ON_THING, FOCUS_RING)}>
          <Icon name="plus" />
        </button>
      ) : null}
      {has ? (
        <button
          type="button"
          tabIndex={-1}
          data-slot="graph-toggle"
          aria-label={data.open ? words.close(node.label) : words.open(node.label)}
          onClick={(event) => {
            event.stopPropagation()
            data.onToggle(node.id)
          }}
          className={cn('nodrag nopan -me-1 inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1 text-ink-mute hover:bg-ink/6 hover:text-ink [&_svg]:size-3.5', FOCUS_RING)}
        >
          {data.open ? null : <Count value={data.hidden} />}
          {/* The arrow of every list that opens: to the side when closed, down when open. */}
          <span aria-hidden="true" className={cn('inline-flex', data.open && 'rotate-90')}>
            <Icon name="chevron" />
          </span>
        </button>
      ) : null}
      <Handle type="source" position={direction === 'right' ? Position.Right : Position.Bottom} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
    </div>
  )
})

/**
 * A thing on the canvas in the graph mode. The surface is the button that chooses it; the buttons on it (the plus, the
 * › that opens) lie over its end, beside that button and not inside it: what a button holds is read as its name, so a
 * button inside another would not be reached.
 */
const Point = React.memo(function Point({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const { node, direction, editable } = data
  const add = editable && data.chosen
  const ends = (add ? 1 : 0) + (data.opens ? 1 : 0)
  return (
    <div className={cn('relative w-52', node.detail ? 'h-14' : 'h-11', data.dim && 'opacity-40')}>
      <Handle type="target" position={direction === 'right' ? Position.Left : Position.Top} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
      <div
        role="button"
        data-slot="graph-node"
        data-node-id={node.id}
        tabIndex={data.stop ? 0 : -1}
        aria-label={node.label}
        aria-pressed={data.chosen}
        onKeyDown={(event) => data.onKey(event, node.id)}
        onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
        onDoubleClick={data.opens ? () => data.onOpen(node.id) : undefined}
        className={cn(
          'flex size-full cursor-default items-center gap-2 rounded-md bg-raised ps-3 text-sm text-ink shadow-sm',
          // Room at the end for the buttons that lie over it.
          ends === 2 ? 'pe-18' : ends === 1 ? 'pe-10' : 'pe-3',
          data.chosen && 'bg-selected font-semibold text-selected-ink',
          FOCUS_RING,
        )}
      >
        <Face node={node} chosen={data.chosen} />
      </div>
      {ends > 0 ? (
        <span className="absolute inset-y-0 end-2 flex items-center gap-2">
          {add ? (
            <button type="button" tabIndex={-1} data-slot="graph-add" aria-label={words.add(node.label)} onClick={(event) => { event.stopPropagation(); data.onAdd(node.id) }} className={cn(ON_THING, 'text-selected-ink', FOCUS_RING)}>
              <Icon name="plus" />
            </button>
          ) : null}
          {data.opens ? (
            <Tooltip label={words.open(node.label)}>
              <button
                type="button"
                // The next Tab stop after the thing that has it: the way to open from the keyboard.
                tabIndex={data.stop ? 0 : -1}
                data-slot="graph-open"
                aria-label={words.open(node.label)}
                onClick={(event) => {
                  event.stopPropagation()
                  data.onOpen(node.id)
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onFocus={() => data.onFocus(node.id)}
                className={cn(ON_THING, 'text-ink-mute hover:text-ink', FOCUS_RING)}
              >
                <Icon name="chevron" />
              </button>
            </Tooltip>
          ) : null}
        </span>
      ) : null}
      <Handle type="source" position={direction === 'right' ? Position.Right : Position.Bottom} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
    </div>
  )
})

const NODE_TYPES = { thing: Thing, point: Point }
/** The whole graph in the view, never larger than it is, with room around it and, at the head, for the field and the buttons. */
const FIT = { maxZoom: 1, padding: { top: '64px', bottom: '24px', x: '24px' } } as const
/** Nothing closed: the graph mode's, the same list at every draw. */
const NOTHING: readonly string[] = []
/** A field keeps the keys typed into it. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
let made = 0
const freshId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `node-${Date.now()}-${++made}`)

function Canvas({ nodes, edges, model = 'tree', direction = 'right', selected = null, onSelect, onOpen, collapsed, defaultCollapsed, onCollapsedChange, search = false, minimap = false, editable = false, onChange, className, ...props }: GraphCanvasProps) {
  const words = useWords().graph
  const flow = useReactFlow()
  const box = React.useRef<HTMLDivElement>(null)
  const tree = model === 'tree'
  const opens = !tree && onOpen !== undefined
  const graph = React.useMemo<Graph>(() => ({ nodes, edges }), [nodes, edges])
  const [ownClosed, setOwnClosed] = React.useState<readonly string[]>(defaultCollapsed ?? [])
  // In the graph mode nothing closes, whatever the app passes.
  const closed = tree ? (collapsed ?? ownClosed) : NOTHING
  const setClosed = (next: string[]) => {
    if (collapsed === undefined) setOwnClosed(next)
    onCollapsedChange?.(next)
  }
  const { below, above } = React.useMemo(() => links(graph), [graph])
  const sight = React.useMemo(() => (tree ? visibleGraph(graph, closed) : wholeGraph(graph)), [tree, graph, closed])
  const places = React.useMemo(() => layoutGraph(graph, sight.order, direction), [graph, sight, direction])
  const [query, setQuery] = React.useState('')
  const word = query.trim().toLowerCase()
  const found = React.useMemo(() => (word ? new Set(nodes.filter((node) => `${node.label} ${node.detail ?? ''}`.toLowerCase().includes(word)).map((node) => node.id)) : null), [nodes, word])
  const [focused, setFocused] = React.useState<string | null>(null)
  const chosen = selected != null && sight.level.has(selected) ? selected : null
  const stop = focused != null && sight.level.has(focused) ? focused : (chosen ?? sight.order[0] ?? null)
  // What is joined to the chosen thing, one step away on either side.
  const near = React.useMemo(() => (chosen ? new Set([chosen, ...(below.get(chosen) ?? []), ...(above.get(chosen) ?? [])]) : null), [chosen, below, above])

  // The thing to give the focus to once it is drawn where it now is: after a search, an opening, an addition.
  const wanted = React.useRef<string | null>(null)
  const focus = (id: string) => {
    const el = box.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)
    const at = places.get(id)
    if (!el || !at) return false
    el.focus({ preventScroll: true })
    // Brought into the view only if it is out of it: a view that moved at every step would lose the user.
    const frame = box.current!.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    if (rect.left < frame.left || rect.right > frame.right || rect.top < frame.top || rect.bottom > frame.bottom) {
      const node = nodes.find((it) => it.id === id)
      void flow.setCenter(at.x + WIDTH / 2, at.y + (node ? heightOf(node) : 44) / 2, { zoom: flow.getZoom(), duration: 0 })
    }
    return true
  }
  React.useEffect(() => {
    if (wanted.current !== null && sight.level.has(wanted.current) && focus(wanted.current)) wanted.current = null
  })

  const latest = React.useRef({ graph, closed, sight, below, above, onSelect, onOpen, onChange, setClosed, focus, editable, tree, direction })
  latest.current = { graph, closed, sight, below, above, onSelect, onOpen, onChange, setClosed, focus, editable, tree, direction }
  const handlers = React.useMemo(() => {
    const toggle = (id: string) => {
      const now = latest.current
      now.setClosed(now.closed.includes(id) ? now.closed.filter((it) => it !== id) : [...now.closed, id])
      wanted.current = id
    }
    const add = (id: string) => {
      const now = latest.current
      const node: GraphNode = { id: freshId(), label: words.newNode }
      const edge: GraphEdge = { from: id, to: node.id }
      // A new thing under a closed one would not be seen: it is opened.
      if (now.closed.includes(id)) now.setClosed(now.closed.filter((it) => it !== id))
      now.onChange?.({ nodes: [...now.graph.nodes, node], edges: [...now.graph.edges, edge] }, { kind: 'add', node, edge })
      now.onSelect?.(node.id)
      wanted.current = node.id
    }
    const remove = (id: string) => {
      const now = latest.current
      const gone = now.graph.edges.filter((edge) => edge.from === id || edge.to === id)
      const at = now.sight.order.indexOf(id)
      wanted.current = now.sight.order[at - 1] ?? now.sight.order[at + 1] ?? null
      now.onChange?.({ nodes: now.graph.nodes.filter((node) => node.id !== id), edges: now.graph.edges.filter((edge) => !gone.includes(edge)) }, { kind: 'remove', nodes: [id], edges: gone })
      now.onSelect?.(null)
    }
    const key = (event: React.KeyboardEvent<HTMLDivElement>, id: string) => {
      if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return
      const now = latest.current
      const order = now.sight.order
      const at = order.indexOf(id)
      let to: string | undefined
      if (event.key === 'Home') to = order[0]
      else if (event.key === 'End') to = order[order.length - 1]
      else if (event.key === 'Enter' || event.key === ' ') now.onSelect?.(id)
      else if ((event.key === 'Delete' || event.key === 'Backspace') && now.editable) remove(id)
      else if (now.tree) {
        // A tree's: Down and Up through what is in sight, Right opens or goes in, Left closes or goes back.
        const children = now.below.get(id) ?? []
        const open = !now.closed.includes(id)
        if (event.key === 'ArrowDown') to = order[at + 1]
        else if (event.key === 'ArrowUp') to = order[at - 1]
        else if (event.key === 'ArrowRight') {
          if (children.length > 0 && !open) toggle(id)
          else to = children.find((child) => now.sight.level.has(child))
        } else if (event.key === 'ArrowLeft') {
          if (children.length > 0 && open) toggle(id)
          else to = (now.above.get(id) ?? []).find((parent) => now.sight.level.has(parent))
        } else return
      } else {
        // A graph's: along the ranks an arrow follows the thing's first line, forwards to where it leads or back to
        // where it comes from (every thing is in sight); across them it goes through the things in the app's order.
        const right = now.direction === 'right'
        if (event.key === (right ? 'ArrowRight' : 'ArrowDown')) to = now.below.get(id)?.[0]
        else if (event.key === (right ? 'ArrowLeft' : 'ArrowUp')) to = now.above.get(id)?.[0]
        else if (event.key === (right ? 'ArrowDown' : 'ArrowRight')) to = order[at + 1]
        else if (event.key === (right ? 'ArrowUp' : 'ArrowLeft')) to = order[at - 1]
        else return
      }
      event.preventDefault()
      event.stopPropagation()
      if (to !== undefined) now.focus(to)
    }
    return { toggle, add, key, open: (id: string) => latest.current.onOpen?.(id), focus: (id: string) => setFocused(id) }
  }, [words.newNode])

  const drawn = React.useMemo<Node<Drawn>[]>(
    () =>
      sight.order.flatMap((id) => {
        const node = nodes.find((it) => it.id === id)
        const at = places.get(id)
        if (!node || !at) return []
        const dim = found ? !found.has(id) : near ? !near.has(id) : false
        return [
          {
            id,
            type: tree ? 'thing' : 'point',
            position: at,
            width: WIDTH,
            height: heightOf(node),
            draggable: false,
            selectable: false,
            focusable: false,
            data: { node, level: sight.level.get(id) ?? 1, children: (below.get(id) ?? []).length, hidden: sight.hidden.get(id) ?? 0, open: !closed.includes(id), chosen: id === chosen, dim, stop: id === stop, editable, direction, opens, onToggle: handlers.toggle, onAdd: handlers.add, onOpen: handlers.open, onKey: handlers.key, onFocus: handlers.focus },
          },
        ]
      }),
    [sight, nodes, places, found, near, below, closed, chosen, stop, editable, direction, tree, opens, handlers],
  )
  const lines = React.useMemo<Edge[]>(
    () =>
      edges
        .filter((edge) => sight.level.has(edge.from) && sight.level.has(edge.to) && edge.from !== edge.to)
        .map((edge) => ({
          id: `${edge.from}→${edge.to}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          focusable: false,
          selectable: editable,
          // The lines of the chosen thing are told from the others (graph.css).
          className: chosen && (edge.from === chosen || edge.to === chosen) ? 'sigrid-graph-near' : undefined,
        })),
    [edges, sight, chosen, editable],
  )
  // The library keeps what it measures and what the user picks on the nodes it is given: they are handed over whole
  // at every change of the graph, and its own changes are laid over them.
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<Drawn>>(drawn)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>(lines)
  React.useEffect(() => setFlowNodes(drawn), [drawn, setFlowNodes])
  React.useEffect(() => setFlowEdges(lines), [lines, setFlowEdges])

  // The view: the buttons at the head of the canvas and the keys +, − and 0 do the same.
  const zoomIn = () => void flow.zoomIn({ duration: 0 })
  const zoomOut = () => void flow.zoomOut({ duration: 0 })
  const fit = () => void flow.fitView({ ...FIT, duration: 0 })
  // From anywhere in the canvas but a field (the search keeps what is typed into it). With Ctrl or Cmd they are the
  // browser's own zoom; Shift is let through, since on some keyboards it makes the +.
  const zoomKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target instanceof Element && event.target.closest(FIELD)) return
    if (event.key === '+' || event.key === '=') zoomIn()
    else if (event.key === '-') zoomOut()
    else if (event.key === '0') fit()
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  const join = (connection: Connection) => {
    const edge: GraphEdge = { from: connection.source, to: connection.target }
    if (edge.from === edge.to || edges.some((it) => it.from === edge.from && it.to === edge.to)) return
    onChange?.({ nodes, edges: [...edges, edge] }, { kind: 'join', edge })
  }
  const found1 = found ? nodes.find((node) => found.has(node.id)) : undefined
  const reveal = (id: string) => {
    // Every closed thing on a way to it is opened.
    const up = new Set<string>()
    const climb = (from: string) => {
      for (const parent of above.get(from) ?? []) {
        if (up.has(parent)) continue
        up.add(parent)
        climb(parent)
      }
    }
    climb(id)
    if (closed.some((it) => up.has(it))) setClosed(closed.filter((it) => !up.has(it)))
    onSelect?.(id)
    wanted.current = id
  }

  return (
    // What a screen reader meets is this box; the library's own canvas inside it says nothing of its own.
    // - In the tree mode, a tree of items.
    // - In the graph mode the lines are not «hangs from», so it is not a tree. The box is an application: its keys are
    //   its own (the arrows along the lines, Home, End, Enter, +, − and 0), so a screen reader hands them over instead
    //   of reading the page with them. `aria-roledescription` names it a graph.
    // - Each thing is a button that says whether it is chosen (`aria-pressed`, which holds for several), one Tab stop
    //   as in the tree. Not a listbox: an option cannot hold the › that opens it, and inside a listbox the app's
    //   commands give up their keys (`commands.tsx`).
    <div ref={box} role={tree ? 'tree' : 'application'} aria-roledescription={tree ? undefined : words.role} {...props} data-slot="graph" onKeyDown={zoomKey} className={cn('relative h-96 min-h-0 overflow-hidden rounded-md bg-paper-2', className)}>
      <ReactFlow
        role="presentation"
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        onPaneClick={() => onSelect?.(null)}
        onConnect={editable ? join : undefined}
        onDelete={editable ? ({ edges: gone }) => (gone.length > 0 ? onChange?.({ nodes, edges: edges.filter((edge) => !gone.some((it) => it.source === edge.from && it.target === edge.to)) }, { kind: 'remove', nodes: [], edges: gone.map((it) => ({ from: it.source, to: it.target })) }) : undefined) : undefined}
        nodesDraggable={false}
        nodesConnectable={editable}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={editable}
        deleteKeyCode={editable ? ['Delete', 'Backspace'] : null}
        // The keys are the canvas's own, on the things and on the box.
        disableKeyboardA11y
        onlyRenderVisibleElements
        fitView
        fitViewOptions={FIT}
        minZoom={0.2}
        maxZoom={1.5}
        zoomOnDoubleClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        {/* At the start of the foot: the end of the foot is the library's own name, which it asks to be left in sight. */}
        {minimap ? <MiniMap position="bottom-left" pannable zoomable ariaLabel={words.map} nodeBorderRadius={4} /> : null}
        {search ? (
          <Panel position="top-left">
            <SearchField
              aria-label={words.find}
              placeholder={words.find}
              value={query}
              onValueChange={setQuery}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !found1) return
                event.preventDefault()
                reveal(found1.id)
              }}
              className="w-56 rounded-md bg-raised shadow-sm"
            />
          </Panel>
        ) : null}
        <Panel position="top-right">
          <div role="group" aria-label={words.view} className="flex items-center gap-0.5 rounded-md bg-raised p-0.5 shadow-sm">
            <Tooltip label={words.zoomOut}>
              <Button variant="ghost" size="icon-sm" aria-label={words.zoomOut} onClick={zoomOut}>
                <Icon name="minus" />
              </Button>
            </Tooltip>
            <Tooltip label={words.zoomIn}>
              <Button variant="ghost" size="icon-sm" aria-label={words.zoomIn} onClick={zoomIn}>
                <Icon name="plus" />
              </Button>
            </Tooltip>
            <Tooltip label={words.fit}>
              <Button variant="ghost" size="icon-sm" aria-label={words.fit} onClick={fit}>
                <Maximize aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

/** The canvas with the store the library needs around it. */
function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

export { GraphCanvas }
