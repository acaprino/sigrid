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
// - Two kinds of line. A `child` line (the default) is the one each mode reads as above: in the tree mode these lines
//   alone make the tree, what opens and closes, what a closed thing hides, the ranks and the keys. A `link` line joins
//   two things without any of that (one waits for the other, one refers to the other, the two never go together) and
//   is drawn only while both ends are in sight. A line may have words on it, a dash (`dashed`, `dotted`), a tone of the
//   theme (`accent`, `warning`, `destructive`) and an arrowhead (a `link` has one unless it goes both ways): what a
//   kind of line means is said by its dash and its words, never by its colour alone. Screen readers hear a thing's
//   `link` lines in its description, with their words and the thing at the other end; the lines are not read twice.
// - With `steps` the app numbers a path through the graph (the steps of a plan, the answer to a question): each
//   thing on it has the selection tint and its numbers in small dots and in its name, the lines between two of them
//   take the accent, what is neither on the path nor joined to it is dimmed, and what hides a thing of the path opens.
// - The view is fitted at the first paint (on the path, when there is one), again whenever the box changes size, and
//   with the button or the key: never smaller than a name can be read (`minFitZoom`, about 11px names). A graph too
//   large for that starts at its top left, and the edges of the view fall between things wherever the layout leaves
//   a gap between the floor and 1.5 (a dense graph in a small box may still have one cut). The app
//   moves the view through a `ref`: `focus` (onto some things, opening what hides them), `fit`, `zoomTo`.
// - With `search` a field finds things by name; the others are dimmed, and Enter goes to the first one found,
//   opening what hides it.
// - With `editable` a thing shows its handles: drag from one to another thing to join them, press the plus on the
//   chosen thing to hang a new one from it. Every change is asked of the app with `onChange`, which keeps the graph
//   (and its undo, R12): nothing is kept here but what is open and where the view is.
// The cost is the layout, done again when the graph changes or a thing opens or closes: about 30ms for 200 things in
// sight, 200ms for a thousand, most of a second for three thousand (measured). A larger graph starts with its
// branches closed (`defaultCollapsed`). Moving the view costs little: only what is in it is drawn.
// Nothing moves by itself: the layout and the view jump to their new places, with or without animations, so reduced
// motion is always honoured. The name of React Flow stays at the foot of the canvas, as its makers ask of whoever does
// not pay for it.
import * as React from 'react'
import dagre from '@dagrejs/dagre'
import { Background, BackgroundVariant, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
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

/** What joins two things: by default, in the tree mode `to` hangs from `from`; in the graph mode the line goes from `from` to `to`. */
export type GraphEdge = {
  from: string
  to: string
  /**
   * `child` (the default): the line of the mode. In the tree mode `to` hangs from `from`, and these lines alone make
   * the tree: what opens and closes, what a closed thing hides, the ranks of the layout, the keys. `link`: a line between two things that changes none of that
   * (one waits for the other, refers to it, never goes with it), and in either mode no rank. Any other value is taken as `child`.
   */
  kind?: 'child' | 'link' | undefined
  /** Words on the line, in its middle. Screen readers hear them too, in the description of the two things. */
  label?: string | undefined
  /** The dash of the line. What a kind of line means is said by its dash and its words, never by its colour alone. Default `solid`. */
  style?: 'solid' | 'dashed' | 'dotted' | undefined
  /** The colour of the line, among the theme's (each keeps 3:1 on the canvas): `accent` is also thicker. Default the muted ink. */
  tone?: 'default' | 'accent' | 'warning' | 'destructive' | undefined
  /** An arrowhead at `to`. Default: a `link` has one, a `child` has none (its rank says which way it goes). `false` for a relation that goes both ways. */
  directed?: boolean | undefined
}

export type Graph = { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }

/** What the user did to the graph: a thing hung from another, two things joined, things and joins taken away. */
export type GraphChange = { kind: 'add'; node: GraphNode; edge: GraphEdge } | { kind: 'join'; edge: GraphEdge } | { kind: 'remove'; nodes: readonly string[]; edges: readonly GraphEdge[] }

/** What the app can do to the view, through the canvas's `ref`. The view jumps: nothing moves by itself. */
export type GraphCanvasHandle = {
  /** Brings these things into the view, as large as fits and never smaller than `minFitZoom`, opening what hides them. The keyboard focus stays where it is. `padding`: px around them (default 24). */
  focus: (ids: readonly string[], options?: { padding?: number | undefined }) => void
  /** The whole graph in the view, as the button does: never smaller than `minFitZoom`, from the top left when it is too large for that. */
  fit: () => void
  /** The scale of the view (1 is the things' own size), about the middle of the view. */
  zoomTo: (scale: number) => void
}

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
  /**
   * A path the app numbers through the graph: the id of each thing on it and its step numbers (a thing may be several
   * steps). Each has the selection tint and its numbers, the lines between two of them take the accent, what is neither
   * on it nor joined to it is dimmed. When the things on it change, what hides one of them opens (through
   * `onCollapsedChange` when the app keeps what is closed); the first view is on them.
   */
  steps?: ReadonlyMap<string, readonly number[]> | undefined
  /** In the tree mode, the ids of the things that are closed, when the app keeps them; otherwise the canvas keeps its own, from `defaultCollapsed`. */
  collapsed?: readonly string[] | undefined
  defaultCollapsed?: readonly string[] | undefined
  onCollapsedChange?: ((ids: string[]) => void) | undefined
  /**
   * The smallest scale the view is fitted at (the first view, a change of size, the button, `fit`, `focus`): below it
   * a name could not be read, so a graph too large starts at its top left instead. Default 0.8, names of about 11px; 0
   * fits the whole graph whatever its size, down to the smallest zoom (0.2). The user can still zoom out by hand.
   */
  minFitZoom?: number | undefined
  /** A field that finds things by name. */
  search?: boolean | undefined
  /** A small map of the whole graph in a corner. */
  minimap?: boolean | undefined
  /** The user can hang a new thing, join two and take one away. Each change is asked for with `onChange`. */
  editable?: boolean | undefined
  /** The graph after a change, and the change: the app keeps the graph. */
  onChange?: ((next: Graph, change: GraphChange) => void) | undefined
  /** What the app can do to the view: `focus`, `fit`, `zoomTo`. */
  ref?: React.Ref<GraphCanvasHandle> | undefined
  /** Classes of the box: its height (`h-96`, or a place in a column that gives it one). */
  className?: string | undefined
}

/** The sizes of a thing in px, which the layout needs before anything is drawn: `w-52`, and `h-11` or `h-14` with a second line. */
const WIDTH = 208
const heightOf = (node: GraphNode) => (node.detail ? 56 : 44)
// Only `link` is a link: an edge that carries a `kind` field of the app's own (an object with more fields is still a
// `GraphEdge`) hangs, as every edge did before there were kinds.
const isChild = (edge: GraphEdge) => edge.kind !== 'link'
/** The zoom the user can reach with the buttons and the wheel, and the default floor of a fit: names of 14px stay about 11px. */
const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.5
const READABLE = 0.8

/**
 * What hangs from each thing and what each hangs from, in the order the joins were given: the `child` lines only,
 * or with `all` every line (the graph mode's keys follow a `link` too). Joins to things that are not there are left out.
 */
function links(graph: Graph, all = false) {
  const ids = new Set(graph.nodes.map((node) => node.id))
  const below = new Map<string, string[]>()
  const above = new Map<string, string[]>()
  for (const id of ids) {
    below.set(id, [])
    above.set(id, [])
  }
  for (const edge of graph.edges) {
    if ((!all && !isChild(edge)) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || below.get(edge.from)!.includes(edge.to)) continue
    below.get(edge.from)!.push(edge.to)
    above.get(edge.to)!.push(edge.from)
  }
  return { below, above }
}

/** What each thing is joined to by a line of any kind, either way. */
function neighbours(edges: readonly GraphEdge[]) {
  const joined = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    const set = joined.get(a) ?? new Set<string>()
    set.add(b)
    joined.set(a, set)
  }
  for (const edge of edges) {
    if (edge.from === edge.to) continue
    add(edge.from, edge.to)
    add(edge.to, edge.from)
  }
  return joined
}

/**
 * What is in sight with some things closed, in the order of a tree read from its roots: a thing is in sight if it
 * hangs from nothing, or if some way to it passes through no closed thing. `level` counts from 1; `hidden` is how
 * many things a closed one keeps out of sight. Only `child` lines count: a `link` changes nothing here.
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

/** The place of each thing in sight, by ranks: the top left corner of its box, in px. Only `child` lines make the ranks. */
export function layoutGraph(graph: Graph, shown: readonly string[], direction: 'right' | 'down'): Map<string, { x: number; y: number }> {
  const inSight = new Set(shown)
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction === 'right' ? 'LR' : 'TB', nodesep: 16, ranksep: 56, marginx: 16, marginy: 16 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const node of graph.nodes) if (inSight.has(node.id)) g.setNode(node.id, { width: WIDTH, height: heightOf(node) })
  for (const edge of graph.edges) if (isChild(edge) && inSight.has(edge.from) && inSight.has(edge.to) && edge.from !== edge.to) g.setEdge(edge.from, edge.to)
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

/** What is closed once every closed thing on a way up to one of `ids` is opened (the same array when nothing changes). */
export function openedFor(graph: Graph, closed: readonly string[], ids: Iterable<string>): readonly string[] {
  const { above } = links(graph)
  const up = new Set<string>()
  const climb = (from: string) => {
    for (const parent of above.get(from) ?? []) {
      if (up.has(parent)) continue
      up.add(parent)
      climb(parent)
    }
  }
  for (const id of ids) climb(id)
  return closed.some((id) => up.has(id)) ? closed.filter((id) => !up.has(id)) : closed
}

type Box = { x: number; y: number; width: number; height: number }
type Room = { width: number; height: number; top: number; right: number; bottom: number; left: number }

/** One side of the view: where the aimed boxes start and end, the middle of the one to keep in sight, the room, and the places where an edge cuts no box. */
type Side = { start: number; end: number; lead: number; inner: number; full: number; pad: number; clean: [number, number][] }

function sideOf(aim: readonly Box[], all: readonly Box[], lead: Box | undefined, at: 'x' | 'y', size: 'width' | 'height', full: number, pad: number, padEnd: number): Side {
  // Between the boxes, once those that overlap are taken together: an edge there cuts none.
  const spans = all.map((b) => [b[at], b[at] + b[size]] as const).sort((p, q) => p[0] - q[0])
  const clean: [number, number][] = []
  let reach = -Infinity
  for (const [s, e] of spans) {
    if (s >= reach) clean.push([reach, s])
    reach = Math.max(reach, e)
  }
  clean.push([reach, Infinity])
  const start = Math.min(...aim.map((b) => b[at]))
  return { start, end: Math.max(...aim.map((b) => b[at] + b[size])), lead: lead ? lead[at] + lead[size] / 2 : start, inner: full - pad - padEnd, full, pad, clean }
}

/**
 * The near edge of the view on one side at `zoom`, in the graph's px: the aimed boxes centred when they fit; else the
 * lead in the middle, never past the start or the end of the boxes (with no lead, from their start). Moved as little
 * as it takes for both edges of the canvas to fall where they cut no box, or null.
 */
function edgeOf(side: Side, zoom: number): { want: number; clean: number | null } {
  const span = (side.end - side.start) * zoom
  const fits = span <= side.inner + 0.5
  // Where the aimed boxes start on the screen, and how far that may move: within the room when they fit; when they do
  // not, a quarter of the room either way, never so far that the view starts before them or ends after them.
  const first = side.pad + side.inner - span
  const wanted = fits ? side.pad + (side.inner - span) / 2 : Math.min(side.pad, Math.max(first, side.pad + side.inner / 2 - (side.lead - side.start) * zoom))
  const [low, high] = fits ? [side.pad, side.pad + side.inner - span] : [Math.max(first, wanted - side.inner / 4), Math.min(side.pad + side.inner / 4, wanted + side.inner / 4)]
  const want = side.start - wanted / zoom
  const from = side.start - high / zoom
  const to = side.start - low / zoom
  const width = side.full / zoom
  let best: number | null = null
  for (const [c0, c1] of side.clean) {
    const lo = Math.max(c0, from)
    const hi = Math.min(c1, to)
    if (lo > hi) continue
    for (const [k0, k1] of side.clean) {
      if (k1 < lo + width || k0 > hi + width) continue
      const a = Math.max(lo, k0 - width)
      const b = Math.min(hi, k1 - width)
      if (a > b) continue
      const near = Math.min(b, Math.max(a, want))
      if (best === null || Math.abs(near - want) < Math.abs(best - want)) best = near
    }
  }
  return { want, clean: best }
}

/**
 * Where the view goes to show the `aim` boxes in a canvas of `room` (its size and the padding to keep): as large as
 * fits, between `minZoom` and `maxZoom`, centred on each side where they fit; where they do not fit at `minZoom`, on
 * `lead` (the first thing to read: the root, the first step), never past their top or left. The edges of the canvas
 * then fall where they cut none of `all` (every box in sight): the view
 * moves a little, or is a little smaller or larger (never under `minZoom`, never over 1.5), until they do.
 */
export function viewFor(aim: readonly Box[], room: Room, minZoom: number, maxZoom: number, all: readonly Box[] = aim, lead?: Box): { x: number; y: number; zoom: number } {
  const sides = [sideOf(aim, all, lead, 'x', 'width', room.width, room.left, room.right), sideOf(aim, all, lead, 'y', 'height', room.height, room.top, room.bottom)] as const
  const base = Math.min(maxZoom, Math.max(minZoom, Math.min(...sides.map((side) => side.inner / Math.max(1, side.end - side.start)))))
  // The zoom as fitted first, then a step of 2% smaller or larger at a time, the smaller first.
  const tries = [base]
  for (let k = 1; k <= 40; k++) tries.push(base / 1.02 ** k, base * 1.02 ** k)
  for (const zoom of tries.filter((z) => z >= minZoom && z <= Math.max(maxZoom, MAX_ZOOM))) {
    const [x, y] = sides.map((side) => edgeOf(side, zoom).clean)
    if (x != null && y != null) return { x: -x * zoom, y: -y * zoom, zoom }
  }
  // shortcut: no clean edge within the search (things that overlap across the whole view): the aimed boxes where they belong, an edge may cut one.
  return { x: -edgeOf(sides[0], base).want * base, y: -edgeOf(sides[1], base).want * base, zoom: base }
}

/** The colour of a line and of its arrowhead (the arrowheads are drawn apart from the lines, so they take it by name). */
const STROKE = { default: 'var(--color-ink-mute)', accent: 'var(--color-accent)', warning: 'var(--color-warning)', destructive: 'var(--color-destructive)' } as const

/**
 * The lines React Flow draws for the edges whose two ends are in sight, and the edge each one is: `child` lines keep
 * the name of their two ends, a `link` has its own, so the two kinds between the same things are two lines. A line
 * between two things of the path takes the accent; with a path, a line to a dimmed thing is dimmed too.
 */
export function linesOf(
  edges: readonly GraphEdge[],
  places: ReadonlyMap<string, { x: number; y: number }>,
  { direction, chosen, marked, dimmed, editable }: { direction: 'right' | 'down'; chosen: string | null; marked: ReadonlySet<string> | null; dimmed: ReadonlySet<string> | null; editable: boolean },
): { lines: Edge[]; edgeOf: Map<string, GraphEdge> } {
  const lines: Edge[] = []
  const edgeOf = new Map<string, GraphEdge>()
  for (const edge of edges) {
    const from = places.get(edge.from)
    const to = places.get(edge.to)
    if (!from || !to || edge.from === edge.to) continue
    const child = isChild(edge)
    const id = child ? `${edge.from}→${edge.to}` : `${edge.from}→${edge.to}#link`
    if (edgeOf.has(id)) continue
    edgeOf.set(id, edge)
    const onPath = marked !== null && marked.has(edge.from) && marked.has(edge.to)
    const tone = onPath ? 'accent' : (edge.tone ?? 'default')
    const style = edge.style ?? 'solid'
    // A `link` to a thing no further along (a sibling, a thing before it) arrives on the far side: the line goes round, not across the boxes.
    const back = !child && (direction === 'right' ? to.x <= from.x : to.y <= from.y)
    lines.push({
      id,
      source: edge.from,
      target: edge.to,
      ...(back ? { targetHandle: 'side' } : {}),
      type: 'smoothstep',
      focusable: false,
      selectable: editable,
      className: cn(
        // The lines of the chosen thing are told from the others (graph.css).
        chosen !== null && (edge.from === chosen || edge.to === chosen) && 'sigrid-graph-near',
        style !== 'solid' && `sigrid-graph-${style}`,
        tone !== 'default' && `sigrid-graph-${tone}`,
        !onPath && dimmed !== null && (dimmed.has(edge.from) || dimmed.has(edge.to)) && 'sigrid-graph-dim',
      ) || undefined,
      ...((edge.directed ?? !child) ? { markerEnd: { type: MarkerType.ArrowClosed, color: STROKE[tone], width: 16, height: 16, markerUnits: 'userSpaceOnUse' } } : {}),
      ...(edge.label ? { label: edge.label, labelShowBg: true, labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4 } : {}),
      // What a `link` or a line with words says is in the description of its two things: the line is not read again.
      ...(!child || edge.label ? { domAttributes: { 'aria-hidden': true } } : {}),
    })
  }
  return { lines, edgeOf }
}

type Drawn = {
  node: GraphNode
  level: number
  /** How many things hang from it, and how many of them a closed one hides. */
  children: number
  hidden: number
  open: boolean
  chosen: boolean
  /** Its numbers on the path the app marks. */
  steps: readonly number[] | undefined
  /** What screen readers hear after its name: the `link` lines it has. */
  about: string
  aboutId: string
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
function Face({ node, tinted }: { node: GraphNode; tinted: boolean }) {
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
        {node.detail ? <span className={cn('truncate text-xs font-normal', tinted ? 'opacity-80' : 'text-ink-mute')}>{node.detail}</span> : null}
      </span>
    </>
  )
}

/** The numbers of the path, round as the dots of `Steps`, on the raised ground so they show on the tint in both schemes: read in the name of the thing. */
function StepDots({ steps }: { steps: readonly number[] }) {
  return (
    <span aria-hidden="true" data-slot="graph-steps" className="flex shrink-0 gap-0.5">
      {steps.map((step, index) => (
        <span key={index} className="inline-flex size-5 items-center justify-center rounded-full bg-raised text-xs font-medium text-accent tabular-nums">
          {step}
        </span>
      ))}
    </span>
  )
}

/** Where a `link` from a thing no further along arrives: the far side, so the line goes round the boxes. */
function SideHandle({ direction }: { direction: 'right' | 'down' }) {
  return <Handle type="target" id="side" position={direction === 'right' ? Position.Right : Position.Bottom} isConnectable={false} className={cn(HANDLE, 'opacity-0')} />
}

/** A thing on the canvas in the tree mode: an item of the tree. */
const Thing = React.memo(function Thing({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const { node, direction, editable, steps } = data
  const has = data.children > 0
  const name = steps ? words.onPath(node.label, steps) : node.label
  const tinted = data.chosen || steps !== undefined
  return (
    <div
      role="treeitem"
      data-slot="graph-node"
      data-node-id={node.id}
      tabIndex={data.stop ? 0 : -1}
      aria-level={data.level}
      aria-selected={data.chosen}
      aria-expanded={has ? data.open : undefined}
      aria-label={has && !data.open ? words.closed(name, data.hidden) : name}
      aria-describedby={data.about ? data.aboutId : undefined}
      onKeyDown={(event) => data.onKey(event, node.id)}
      onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
      className={cn(
        'group relative flex w-52 cursor-default items-center gap-2 rounded-md bg-raised px-3 text-sm text-ink shadow-sm',
        node.detail ? 'h-14' : 'h-11',
        tinted && 'bg-selected text-selected-ink',
        data.chosen && 'font-semibold',
        data.dim && 'opacity-40',
        FOCUS_RING,
      )}
    >
      {/* Where a line arrives and where it leaves: in sight only where the user may draw one. */}
      <Handle type="target" position={direction === 'right' ? Position.Left : Position.Top} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
      <Face node={node} tinted={tinted} />
      {steps ? <StepDots steps={steps} /> : null}
      {data.about ? (
        <span id={data.aboutId} hidden>
          {data.about}
        </span>
      ) : null}
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
      <SideHandle direction={direction} />
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
  const { node, direction, editable, steps } = data
  const tinted = data.chosen || steps !== undefined
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
        aria-label={steps ? words.onPath(node.label, steps) : node.label}
        aria-pressed={data.chosen}
        aria-describedby={data.about ? data.aboutId : undefined}
        onKeyDown={(event) => data.onKey(event, node.id)}
        onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
        onDoubleClick={data.opens ? () => data.onOpen(node.id) : undefined}
        className={cn(
          'flex size-full cursor-default items-center gap-2 rounded-md bg-raised ps-3 text-sm text-ink shadow-sm',
          // Room at the end for the buttons that lie over it.
          ends === 2 ? 'pe-18' : ends === 1 ? 'pe-10' : 'pe-3',
          tinted && 'bg-selected text-selected-ink',
          data.chosen && 'font-semibold',
          FOCUS_RING,
        )}
      >
        <Face node={node} tinted={tinted} />
        {steps ? <StepDots steps={steps} /> : null}
      </div>
      {data.about ? (
        <span id={data.aboutId} hidden>
          {data.about}
        </span>
      ) : null}
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
      <SideHandle direction={direction} />
    </div>
  )
})

const NODE_TYPES = { thing: Thing, point: Point }
/** Room around what is fitted, and at the head for the field and the buttons. */
const PAD = { top: 64, right: 24, bottom: 24, left: 24 }
/** Nothing closed: the graph mode's, the same list at every draw. */
const NOTHING: readonly string[] = []
/** A field keeps the keys typed into it. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
let made = 0
const freshId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `node-${Date.now()}-${++made}`)

function Canvas({ nodes, edges, model = 'tree', direction = 'right', selected = null, onSelect, onOpen, steps, collapsed, defaultCollapsed, onCollapsedChange, minFitZoom = READABLE, search = false, minimap = false, editable = false, onChange, ref, className, ...props }: GraphCanvasProps) {
  const words = useWords().graph
  const flow = useReactFlow()
  // The library's helpers, as they are now: the view's own helpers below are made once.
  const flowNow = React.useRef(flow)
  flowNow.current = flow
  const uid = React.useId()
  const box = React.useRef<HTMLDivElement>(null)
  const tree = model === 'tree'
  const opens = !tree && onOpen !== undefined
  const graph = React.useMemo<Graph>(() => ({ nodes, edges }), [nodes, edges])
  const byId = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  // The path: the things on it that are in the graph, in the order of their first step.
  const marked = steps && steps.size > 0 ? steps : null
  const path = React.useMemo(() => (marked ? [...marked.keys()].filter((id) => byId.has(id) && (marked.get(id) ?? []).length > 0).sort((a, b) => Math.min(...marked.get(a)!) - Math.min(...marked.get(b)!)) : []), [marked, byId])
  const pathKey = path.join('\n')
  const [ownClosed, setOwnClosed] = React.useState<readonly string[]>(() => openedFor(graph, defaultCollapsed ?? [], path))
  // In the graph mode nothing closes, whatever the app passes.
  const closed = tree ? (collapsed ?? ownClosed) : NOTHING
  const setClosed = (next: readonly string[]) => {
    if (collapsed === undefined) setOwnClosed(next)
    onCollapsedChange?.([...next])
  }
  const { below, above } = React.useMemo(() => links(graph, !tree), [graph, tree])
  const joined = React.useMemo(() => neighbours(edges), [edges])
  const sight = React.useMemo(() => (tree ? visibleGraph(graph, closed) : wholeGraph(graph)), [tree, graph, closed])
  const places = React.useMemo(() => layoutGraph(graph, sight.order, direction), [graph, sight, direction])
  const [query, setQuery] = React.useState('')
  const word = query.trim().toLowerCase()
  const found = React.useMemo(() => (word ? new Set(nodes.filter((node) => `${node.label} ${node.detail ?? ''}`.toLowerCase().includes(word)).map((node) => node.id)) : null), [nodes, word])
  const [focused, setFocused] = React.useState<string | null>(null)
  const chosen = selected != null && sight.level.has(selected) ? selected : null
  const stop = focused != null && sight.level.has(focused) ? focused : (chosen ?? sight.order[0] ?? null)
  // What is joined to the chosen thing, one line away on either side, and what is on the path or joined to it.
  const near = React.useMemo(() => (chosen ? new Set([chosen, ...(joined.get(chosen) ?? [])]) : null), [chosen, joined])
  const pathNear = React.useMemo(() => (path.length > 0 ? new Set(path.flatMap((id) => [id, ...(joined.get(id) ?? [])])) : null), [path, joined])
  // Found by the field, then the chosen thing and the path: the rest is dimmed.
  const dimmed = React.useMemo(() => {
    if (!found && !near && !pathNear) return null
    return new Set(sight.order.filter((id) => (found ? !found.has(id) : !(near?.has(id) || pathNear?.has(id)))))
  }, [sight, found, near, pathNear])

  // When the things on the path change, what hides one of them opens; after that the user may close it again. The
  // canvas that keeps its own opened them from the start; one the app keeps asks at once.
  const openedPath = React.useRef(collapsed === undefined ? pathKey : '')
  React.useEffect(() => {
    if (openedPath.current === pathKey) return
    openedPath.current = pathKey
    const next = openedFor(graph, closed, path)
    if (next !== closed) setClosed(next)
  })

  // The size of the box, measured by the canvas itself: the view is fitted again whenever it changes.
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  React.useLayoutEffect(() => {
    const el = box.current!
    const measure = () => setSize((now) => (now.width === el.clientWidth && now.height === el.clientHeight ? now : { width: el.clientWidth, height: el.clientHeight }))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
      const node = byId.get(id)
      void flow.setCenter(at.x + WIDTH / 2, at.y + (node ? heightOf(node) : 44) / 2, { zoom: flow.getZoom(), duration: 0 })
    }
    return true
  }
  React.useEffect(() => {
    if (wanted.current !== null && sight.level.has(wanted.current) && focus(wanted.current)) wanted.current = null
  })

  const latest = React.useRef({ graph, closed, sight, places, below, above, path, size, minFitZoom, direction, byId, chosen, onSelect, onOpen, onChange, setClosed, focus, editable, tree })
  latest.current = { graph, closed, sight, places, below, above, path, size, minFitZoom, direction, byId, chosen, onSelect, onOpen, onChange, setClosed, focus, editable, tree }

  // What the view was last brought to, fitted again when the box changes size: the path (the first view), the whole
  // graph (the button, `fit`), or some things (`focus`).
  const target = React.useRef<{ ids: readonly string[] | 'path' | 'all'; padding: number }>({ ids: 'path', padding: PAD.right })
  const view = React.useMemo(() => {
    /**
     * Fits the view onto the target. With `opening`, on the layout it will have once what hides the things is opened
     * (the first view, `focus`); otherwise on the layout as it is. Returns what is then closed.
     */
    const apply = (opening: boolean, keep: string | null = null) => {
      const now = latest.current
      const { ids: aim, padding } = target.current
      const ids = aim === 'all' ? [] : aim === 'path' ? now.path : aim
      let at = now.places
      const next = opening && ids.length > 0 ? openedFor(now.graph, now.closed, ids) : now.closed
      if (next !== now.closed) at = layoutGraph(now.graph, visibleGraph(now.graph, next).order, now.direction)
      const boxOf = (id: string) => ({ ...at.get(id)!, width: WIDTH, height: heightOf(now.byId.get(id)!) })
      const all = [...at.keys()].map(boxOf)
      const shown = ids.filter((id) => at.has(id)).map(boxOf)
      if (all.length === 0 || now.size.width === 0 || now.size.height === 0) return next
      const room = aim === 'all' || aim === 'path' ? { ...now.size, ...PAD } : { ...now.size, top: Math.max(PAD.top, padding), right: padding, bottom: padding, left: padding }
      const floor = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, now.minFitZoom))
      // The first thing to read: the first of the things aimed at, or the first thing in sight.
      const leadId = ids.find((id) => at.has(id)) ?? now.sight.order.find((id) => at.has(id))
      let fitted = viewFor(shown.length > 0 ? shown : all, room, floor, 1, all, leadId === undefined ? undefined : boxOf(leadId))
      // `keep` (the chosen thing, when the box changes size) stays in sight: if the fit leaves it out, the view goes to it.
      const kept = keep !== null && at.has(keep) ? boxOf(keep) : null
      if (kept) {
        const left = fitted.x + kept.x * fitted.zoom
        const top = fitted.y + kept.y * fitted.zoom
        if (left < 0 || top < 0 || left + kept.width * fitted.zoom > now.size.width || top + kept.height * fitted.zoom > now.size.height) fitted = viewFor([kept], { ...now.size, ...PAD }, floor, 1, all)
      }
      void flowNow.current.setViewport(fitted, { duration: 0 })
      return next
    }
    return {
      apply,
      handle: {
        focus: (ids, options) => {
          target.current = { ids: [...ids], padding: options?.padding ?? PAD.right }
          const now = latest.current
          const next = apply(true)
          if (next !== now.closed) now.setClosed(next)
        },
        fit: () => {
          target.current = { ids: 'all', padding: PAD.right }
          apply(false)
        },
        zoomTo: (scale) => void flowNow.current.zoomTo(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale)), { duration: 0 }),
      } satisfies GraphCanvasHandle,
    }
  }, [])
  React.useImperativeHandle(ref, () => view.handle, [view])
  // The first view, and the view again at every change of size, once the library's pan and zoom exist. Until the
  // first one the canvas is not shown, so no thing is ever painted cut by its edge.
  const [shown, setShown] = React.useState(false)
  const empty = sight.order.length === 0
  const first = React.useRef(true)
  React.useEffect(() => {
    if (size.width === 0 || size.height === 0 || !flow.viewportInitialized || empty) return
    // At the first view on the path; after it, at a change of size, with the chosen thing kept in sight.
    view.apply(first.current, first.current ? null : latest.current.chosen)
    first.current = false
    setShown(true)
  }, [size, flow.viewportInitialized, empty, view])

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

  // What screen readers hear of each thing's `link` lines: their words, which way, the thing at the other end.
  const about = React.useMemo(() => {
    const said = new Map<string, string[]>()
    const say = (id: string, text: string) => said.set(id, [...(said.get(id) ?? []), text])
    for (const edge of edges) {
      if ((isChild(edge) && !edge.label) || edge.from === edge.to || !byId.has(edge.from) || !byId.has(edge.to)) continue
      const both = edge.directed === false
      say(edge.from, words.line(byId.get(edge.to)!.label, both ? 'with' : 'to', edge.label))
      say(edge.to, words.line(byId.get(edge.from)!.label, both ? 'with' : 'from', edge.label))
    }
    return said
  }, [edges, byId, words])

  const drawn = React.useMemo<Node<Drawn>[]>(
    () =>
      sight.order.flatMap((id, index) => {
        const node = byId.get(id)
        const at = places.get(id)
        if (!node || !at) return []
        const numbers = marked?.get(id)
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
            data: { node, level: sight.level.get(id) ?? 1, children: (below.get(id) ?? []).length, hidden: sight.hidden.get(id) ?? 0, open: !closed.includes(id), chosen: id === chosen, steps: numbers && numbers.length > 0 ? numbers : undefined, about: (about.get(id) ?? []).join('. '), aboutId: `${uid}-about-${index}`, dim: dimmed?.has(id) ?? false, stop: id === stop, editable, direction, opens, onToggle: handlers.toggle, onAdd: handlers.add, onOpen: handlers.open, onKey: handlers.key, onFocus: handlers.focus },
          },
        ]
      }),
    [sight, byId, places, marked, about, uid, dimmed, below, closed, chosen, stop, editable, direction, tree, opens, handlers],
  )
  const { lines, edgeOf } = React.useMemo(
    () => linesOf(edges, places, { direction, chosen, marked: path.length > 0 ? new Set(path) : null, dimmed: path.length > 0 && !found ? dimmed : null, editable }),
    [edges, places, direction, chosen, path, found, dimmed, editable],
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
  const fit = () => view.handle.fit()
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
    if (edge.from === edge.to || edges.some((it) => isChild(it) && it.from === edge.from && it.to === edge.to)) return
    onChange?.({ nodes, edges: [...edges, edge] }, { kind: 'join', edge })
  }
  const found1 = found ? nodes.find((node) => found.has(node.id)) : undefined
  const reveal = (id: string) => {
    // Every closed thing on a way to it is opened.
    const next = openedFor(graph, closed, [id])
    if (next !== closed) setClosed(next)
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
        // Not shown until the first view is fitted to the measured box; an empty graph has nothing to fit.
        className={cn(!shown && !empty && size.width > 0 && size.height > 0 && 'invisible')}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        onPaneClick={() => onSelect?.(null)}
        onConnect={editable ? join : undefined}
        onDelete={
          editable
            ? ({ edges: gone }) => {
                // A line is every edge with its two ends and its kind: an edge given twice goes with it.
                const lines = gone.flatMap((it) => (edgeOf.has(it.id) ? [edgeOf.get(it.id)!] : []))
                const same = (a: GraphEdge, b: GraphEdge) => a.from === b.from && a.to === b.to && isChild(a) === isChild(b)
                const removed = edges.filter((edge) => lines.some((line) => same(line, edge)))
                if (removed.length > 0) onChange?.({ nodes, edges: edges.filter((edge) => !removed.includes(edge)) }, { kind: 'remove', nodes: [], edges: removed })
              }
            : undefined
        }
        nodesDraggable={false}
        nodesConnectable={editable}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={editable}
        deleteKeyCode={editable ? ['Delete', 'Backspace'] : null}
        // The keys are the canvas's own, on the things and on the box.
        disableKeyboardA11y
        onlyRenderVisibleElements
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
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
