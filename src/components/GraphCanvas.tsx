// A canvas for a graph of things and what joins them (tasks and what they wait for, the parts of a project, notes
// that lead to other notes, the calls between the parts of a program): the user moves over it, looks at one thing and
// what is joined to it, opens and closes what hangs from a thing and, where the app lets them, draws: adds a thing,
// joins two, takes one away. The canvas, its pan and zoom, the lines and the joining by hand are React Flow's
// (`@xyflow/react`), the places of the things are dagre's (`@dagrejs/dagre`): npm dependencies, pinned, see
// THIRD_PARTY.md. The form is the toolkit's. It has its own entry of the package (`./graph`) and its own stylesheet
// (`./graph.css`), so an app without a graph loads neither.
// - The graph is laid out by itself, in ranks: from the start to the end of the line (`direction="right"`) or from
//   the head to the foot (`"down"`). The user does not place things by hand, so nothing can be lost off the canvas.
// - Or the app lays it out, with a layout engine of its own (ELK in a worker) or by hand: a thing with an `x` and a
//   `y` is drawn there, a line with `points` follows that route, and nothing is laid out here. All or nothing: the app's places are read only when every thing it passes has one;
//   when one has none (a thing just added with the plus) dagre places them all again, until the app places it. A
//   thing's `width` and `height` are its size in both cases (dagre lays out with them); without them it is 208px
//   wide and 44px tall, 56px with a second line.
// - After a new layout of the app's (a new `layoutKey`) the view is fitted to the whole graph again; a draw on the
//   same key (another choice, new flags, the same places) keeps the view where the user moved it.
// - A thing is a raised surface with a shadow and no border (R4): an icon or a dot of its colour (R10), a name, a
//   line under it, and on a thing outside what the graph is about (`external`) the word «external» in the muted ink,
//   never a dashed border. The chosen one has the selection tint (R1), or each of the several the app marks when it
//   draws one of its things in several places; what is joined to them stays as it is and the rest is dimmed, so the
//   eye finds the neighbourhood. The app shows the details of the chosen thing where it likes (the `Inspector` of the
//   frame).
// - Two ways to read the lines (`model`). In the tree mode, the default, a line says that a thing hangs from another:
//   - A thing with others hanging from it has an arrow: closed, it says how many it hides, and the graph is laid out
//     again without them. What can be reached another way stays in sight.
//   - The keyboard is the one of a tree, and the things are one Tab stop: Down and Up go through what is in sight,
//     Right opens or goes to the first thing that hangs, Left closes or goes back to what it hangs from, Home and End
//     reach the ends, Enter chooses. Screen readers hear a tree: the name of a thing, its level, whether it is open,
//     how many it hides.
// - In the graph mode (`model="graph"`) a line is a relation (a call, an import, data that flows), not «hangs from»:
//   - Nothing closes: every thing is in sight and none has an arrow. Opening a thing is the app's (going into it,
//     showing what it holds), and only for the things it says it opens: a thing with an `openLabel` («Open Orders»)
//     has a › button of that name, and a double press on it or its › calls `onOpen` with its id. Without `onOpen`,
//     or on a thing without `openLabel`, there is no › and nothing opens. A thing that holds others the app keeps out
//     of sight (a group it has not opened) says how many (`hidden`), at its end as a closed thing of the tree does,
//     and in its name.
//   - The things are one Tab stop, and the › of the one that has it is the next. Along the ranks the arrows follow the
//     lines: with `direction="right"` Right goes to what the thing's first line leads to and Left back to what its
//     first line comes from, while Down and Up go through the things in the order the app gave them; downwards the
//     axes swap. Home and End reach the first and the last thing of that order, Enter chooses. From the › the arrows,
//     Home and End move as from its thing. Screen readers hear a group called a graph, of buttons named by their name
//     and second line, described by where their lines lead and come from, the chosen one `aria-current`.
// - In both modes + (or =, the same key without Shift), − and 0 zoom in, out and fit the whole graph, as the buttons
//   at the head of the canvas do, and with `editable` Delete takes the thing away.
// - Two kinds of line. A `child` line (the default) is the one each mode reads as above: in the tree mode these lines
//   alone make the tree, what opens and closes, what a closed thing hides, the ranks and the keys. A `link` line joins
//   two things without any of that (one waits for the other, one refers to the other, the two never go together) and
//   is drawn only while both ends are in sight. A line may have words on it, a dash (`dashed`, `dotted`), a tone of the
//   theme (`accent`, `warning`, `destructive`) and an arrowhead (a `link` has one unless it goes both ways): what a
//   kind of line means is said by its dash and its words, never by its colour alone. Screen readers hear a thing's
//   `link` lines in its description, with their words and the thing at the other end; the lines are not read twice.
//   The words may be drawn only while one of the two things is chosen (`labelShown: 'chosen'`), and are heard always.
//   Every edge is a line of its own: two between the same two things are two lines (named by the app's `id`, or
//   numbered), each with its words; without the app's routes they lie one on the other.
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
//   chosen thing to hang a new one from it (in the graph mode, to add one after it). Every change is asked of the app
//   with `onChange`, which keeps the graph (and its undo, R12): nothing is kept here but what is open and where the
//   view is.
// The cost is the layout, done again when the graph changes or a thing opens or closes: about 30ms for 200 things in
// sight, 200ms for a thousand, most of a second for three thousand (measured). In the tree mode a larger graph starts
// with its branches closed (`defaultCollapsed`); in the graph mode every thing is in sight, so the whole graph is laid
// out at every change of the nodes, the edges or the direction (choosing a thing or moving the focus lays out
// nothing). With the app's places nothing is laid out here. Moving the view costs little: only what is in it is drawn.
// Nothing moves by itself: the layout and the view jump to their new places, with or without animations, so reduced
// motion is always honoured. The name of React Flow stays at the foot of the canvas, as its makers ask of whoever does
// not pay for it.
import * as React from 'react'
import dagre from '@dagrejs/dagre'
import { Background, BackgroundVariant, BaseEdge, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react'
import { Maximize } from 'lucide-react'
import { Icon, type IconName } from '../icons'
import { markHueAttrs } from '../colors'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { FIELDS } from '../internal/desktop-guard'
import { useWords, type Words } from '../words'
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
  /**
   * In the graph mode, the name of the action that opens the thing and of its › button («Open Orders»): only a thing
   * with it opens (its ›, a double press), and only when `onOpen` is given. The tree mode does not read it.
   */
  openLabel?: string | undefined
  /**
   * The thing is outside what the graph is about (another's service, a library): the word «external» after its name
   * in the muted ink (`graph.external`), also in its name for screen readers. Never a dashed border (R4).
   */
  external?: boolean | undefined
  /**
   * In the graph mode, how many things the app keeps out of sight inside this one (a group it has not opened): a
   * count at its end, as a closed thing of the tree mode shows it, and in its name («Orders, hides 12», the word
   * `graph.hides`). Read when above 0. The tree mode counts what a closed thing hides by itself and does not read it.
   */
  hidden?: number | undefined
  /**
   * Where the app placed the thing, when it lays the graph out itself (a layout engine of its own, by hand): the top
   * left corner of its box, in px. Read only when every thing has an `x` and a `y`; otherwise the canvas places them
   * all.
   */
  x?: number | undefined
  y?: number | undefined
  /** The width and the height of its box in px, also when the canvas places it. Default 208 wide, 44 tall or 56 with a second line. */
  width?: number | undefined
  height?: number | undefined
}

/** What joins two things: by default, in the tree mode `to` hangs from `from`; in the graph mode the line goes from `from` to `to`. */
export type GraphEdge = {
  from: string
  to: string
  /**
   * The app's name for the line, also React Flow's. Every edge is a line of its own, so two between the same two
   * things (a call, and data that flows the same way) are two lines, each with its words; without an `id` the line is
   * named by its two ends, and a second one with the same ends by a number after them.
   */
  id?: string | undefined
  /**
   * `child` (the default): the line of the mode. In the tree mode `to` hangs from `from`, and these lines alone make
   * the tree: what opens and closes, what a closed thing hides, the ranks of the layout, the keys. `link`: a line between two things that changes none of that
   * (one waits for the other, refers to it, never goes with it), and in either mode no rank. Any other value is taken as `child`.
   */
  kind?: 'child' | 'link' | undefined
  /** Words on the line, in its middle. Screen readers hear them too, in the description of the two things. */
  label?: string | undefined
  /** When the words are drawn: `always` (the default), or `chosen`, only while one of the two things is chosen. Screen readers hear them in both cases. */
  labelShown?: 'always' | 'chosen' | undefined
  /** The dash of the line. What a kind of line means is said by its dash and its words, never by its colour alone. Default `solid`. */
  style?: 'solid' | 'dashed' | 'dotted' | undefined
  /** The colour of the line, among the theme's (each keeps 3:1 on the canvas): `accent` is also thicker. Default the muted ink. */
  tone?: 'default' | 'accent' | 'warning' | 'destructive' | undefined
  /** An arrowhead at `to`. Default: a `link` has one, a `child` has none (its rank says which way it goes). `false` for a relation that goes both ways. */
  directed?: boolean | undefined
  /**
   * The route of the line when the app placed the things: its points from start to end, in px (a layout's start
   * point, bends and end point). Read only with the app's places; without it, or with fewer than two points, the line
   * goes from one side of a thing to the facing side of the other.
   */
  points?: readonly { x: number; y: number }[] | null | undefined
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
  /**
   * The name of the layout the places come from, as the app tells one layout from another (the direction, the things
   * and the lines it laid out). When it changes the view fits the whole graph again, once the new places are drawn;
   * while it stays, a new draw (another choice, new flags, the same places) keeps the view where the user moved it.
   * Pass the new key with the new places. Without it the view is fitted at the first paint and at a change of size.
   */
  layoutKey?: string | undefined
  /**
   * The id of the thing chosen: the one whose details the app shows. Or several ids, when the app draws one of its
   * things as several (an entity in each place it is): each has the selection tint and is chosen for screen readers,
   * and the first of them in the order of the things holds the Tab stop. The user still chooses one (`onSelect`).
   */
  selected?: string | readonly string[] | null | undefined
  onSelect?: ((id: string | null) => void) | undefined
  /** In the graph mode, the app opens a thing (goes into it, shows what it holds): asked by a double press on a thing with an `openLabel` or by its › button. Without it nothing opens. */
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

/**
 * The size of a thing in px, which the layout needs before anything is drawn: the app's `width` and `height`, or 208
 * wide and 44 tall, 56 with a second line. React Flow gives its box that size and the thing fills it.
 */
const WIDTH = 208
const finite = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value)
const widthOf = (node: GraphNode) => (finite(node.width) && node.width > 0 ? node.width : WIDTH)
const heightOf = (node: GraphNode) => (finite(node.height) && node.height > 0 ? node.height : node.detail ? 56 : 44)

/**
 * The app's places, when it placed every thing it passes (an `x` and a `y` on each); otherwise null, and the canvas
 * lays the whole graph out. Not some of each: a place of dagre's would land on the places of another layout. Of two
 * things with one id, the first, as everywhere here.
 */
function placesOf(nodes: readonly GraphNode[]): Map<string, { x: number; y: number }> | null {
  if (nodes.length === 0) return null
  const places = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    if (!finite(node.x) || !finite(node.y)) return null
    if (!places.has(node.id)) places.set(node.id, { x: node.x, y: node.y })
  }
  return places
}
// Only `link` is a link: an edge that carries a `kind` field of the app's own (an object with more fields is still a
// `GraphEdge`) hangs, as every edge did before there were kinds.
const isChild = (edge: GraphEdge) => edge.kind !== 'link'
/** The zoom the user can reach with the buttons and the wheel, and the default floor of a fit: names of 14px stay about 11px. */
const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.5
const READABLE = 0.8

/** What hangs from each thing and what each hangs from, in the order the joins were given: the `child` lines only. Joins to things that are not there are left out. */
function links(graph: Graph) {
  const ids = new Set(graph.nodes.map((node) => node.id))
  const below = new Map<string, string[]>()
  const above = new Map<string, string[]>()
  for (const id of ids) {
    below.set(id, [])
    above.set(id, [])
  }
  for (const edge of graph.edges) {
    if (!isChild(edge) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || below.get(edge.from)!.includes(edge.to)) continue
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

/**
 * The place of each thing in sight, by ranks: the top left corner of its box, in px. Each box has the thing's size
 * (`width`, `height`, or the canvas's); the places the app may give (`x`, `y`) are not read here. Only `child` lines
 * make the ranks.
 */
export function layoutGraph(graph: Graph, shown: readonly string[], direction: 'right' | 'down'): Map<string, { x: number; y: number }> {
  const inSight = new Set(shown)
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction === 'right' ? 'LR' : 'TB', nodesep: 16, ranksep: 56, marginx: 16, marginy: 16 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const node of graph.nodes) if (inSight.has(node.id)) g.setNode(node.id, { width: widthOf(node), height: heightOf(node) })
  for (const edge of graph.edges) if (isChild(edge) && inSight.has(edge.from) && inSight.has(edge.to) && edge.from !== edge.to) g.setEdge(edge.from, edge.to)
  dagre.layout(g)
  const places = new Map<string, { x: number; y: number }>()
  for (const node of graph.nodes) {
    if (!inSight.has(node.id)) continue
    const at = g.node(node.id)
    // dagre gives the middle of a box.
    places.set(node.id, { x: Math.round(at.x - widthOf(node) / 2), y: Math.round(at.y - heightOf(node) / 2) })
  }
  return places
}

/** The places of what is in sight: the app's when it gave them all (`given`), otherwise dagre's. */
function placesIn(graph: Graph, shown: readonly string[], direction: 'right' | 'down', given: ReadonlyMap<string, { x: number; y: number }> | null): Map<string, { x: number; y: number }> {
  if (!given) return layoutGraph(graph, shown, direction)
  const places = new Map<string, { x: number; y: number }>()
  for (const id of shown) {
    const at = given.get(id)
    if (at) places.set(id, at)
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
 * The lines React Flow draws for the edges whose two ends are in sight, and the edge each one is. Every edge is a line
 * of its own: one with an `id` is named by it; one without by its two ends, `child` lines plainly and a `link` with
 * `#link` after them (the names they always had), so the two kinds between the same things are two lines; a second
 * edge of a name already taken has a number after it (`#2`), so two edges with the same ends stay two. A line between
 * two things of the path takes the accent; with a path, a line to a dimmed thing is dimmed too. With `routes` (the
 * app placed the things) a line with `points` follows them. `chosen` is the chosen thing, or the several the app
 * marks: their lines are told from the others, and the words of a line drawn only on a choice (`labelShown:
 * 'chosen'`) are drawn while one of its two things is among them.
 */
export function linesOf(
  edges: readonly GraphEdge[],
  places: ReadonlyMap<string, { x: number; y: number }>,
  { direction, chosen, marked, dimmed, editable, routes = false }: { direction: 'right' | 'down'; chosen: string | ReadonlySet<string> | null; marked: ReadonlySet<string> | null; dimmed: ReadonlySet<string> | null; editable: boolean; routes?: boolean },
): { lines: Edge[]; edgeOf: Map<string, GraphEdge> } {
  const lines: Edge[] = []
  const edgeOf = new Map<string, GraphEdge>()
  const isChosen = (id: string) => (typeof chosen === 'string' ? id === chosen : (chosen?.has(id) ?? false))
  for (const edge of edges) {
    const from = places.get(edge.from)
    const to = places.get(edge.to)
    if (!from || !to || edge.from === edge.to) continue
    const child = isChild(edge)
    // An empty `id` names nothing: the line is named by its ends.
    const name = edge.id || (child ? `${edge.from}→${edge.to}` : `${edge.from}→${edge.to}#link`)
    let id = name
    for (let n = 2; edgeOf.has(id); n += 1) id = `${name}#${n}`
    edgeOf.set(id, edge)
    const near = isChosen(edge.from) || isChosen(edge.to)
    // The words of a line drawn only on a choice wait for one of its ends to be chosen; they are heard either way.
    const words = edge.label && (edge.labelShown !== 'chosen' || near) ? edge.label : undefined
    const onPath = marked !== null && marked.has(edge.from) && marked.has(edge.to)
    const tone = onPath ? 'accent' : (edge.tone ?? 'default')
    const style = edge.style ?? 'solid'
    // A `link` to a thing no further along (a sibling, a thing before it) arrives on the far side: the line goes round, not across the boxes.
    // Along the app's route only with the app's places (`routes`): a route of its layout would cross dagre's.
    const route = routes && edge.points && edge.points.length > 1 ? edge.points : null
    const back = !route && !child && (direction === 'right' ? to.x <= from.x : to.y <= from.y)
    lines.push({
      id,
      source: edge.from,
      target: edge.to,
      ...(back ? { targetHandle: 'side' } : {}),
      type: route ? 'route' : 'smoothstep',
      ...(route ? { data: { points: route } } : {}),
      focusable: false,
      selectable: editable,
      className: cn(
        // The lines of the chosen things are told from the others (graph.css).
        near && 'sigrid-graph-near',
        style !== 'solid' && `sigrid-graph-${style}`,
        tone !== 'default' && `sigrid-graph-${tone}`,
        !onPath && dimmed !== null && (dimmed.has(edge.from) || dimmed.has(edge.to)) && 'sigrid-graph-dim',
      ) || undefined,
      ...((edge.directed ?? !child) ? { markerEnd: { type: MarkerType.ArrowClosed, color: STROKE[tone], width: 16, height: 16, markerUnits: 'userSpaceOnUse' } } : {}),
      ...(words ? { label: words, labelShowBg: true, labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4 } : {}),
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
  /** In the graph mode, whether the app opens things (`onOpen`): a thing with an `openLabel` then has a › and opens on a double press. */
  opens: boolean
  /** In the graph mode, the names of what the thing's lines lead to and of what the lines into it come from. */
  leadsTo: readonly string[]
  comesFrom: readonly string[]
  onToggle: (id: string) => void
  onAdd: (id: string) => void
  onOpen: (id: string) => void
  onFocus: (id: string) => void
}

const HANDLE = 'size-2! min-h-0! min-w-0! rounded-full! border-0! bg-ink-mute!'
/** The small buttons on a thing: the plus that hangs a new one, the arrow that opens and closes, the › that opens. */
const ON_THING = 'nodrag nopan inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-ink/6 [&_svg]:size-3.5'
/** With a finger a button on a thing is 44px, as every control (DESIGN.md, the exception to R7; as `Button` does). */
const TOUCH = 'pointer-coarse:min-h-11 pointer-coarse:min-w-11'
/** The element of a thing that takes the focus: the item of the tree, the button of the graph mode. */
const SURFACE = '[data-slot="graph-node"]'

/** The name of a thing as the eye reads it, for screen readers: its name, its steps on the path, the word «external». */
function nameOf(node: GraphNode, steps: readonly number[] | undefined, words: Words['graph']): string {
  const name = steps ? words.onPath(node.label, steps) : node.label
  return node.external ? `${name}, ${words.external}` : name
}

/** What a thing shows: its icon or the dot of its colour, its name and the line under it, and «external» on an external one. */
function Face({ node, tinted }: { node: GraphNode; tinted: boolean }) {
  const words = useWords().graph
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
      {/* Said in words, in the muted ink as the line under the name (on the tint, as that line is): never a dashed border (R4). Read in the thing's name. */}
      {node.external ? (
        <span aria-hidden="true" data-slot="graph-external" className={cn('shrink-0 text-xs font-normal', tinted ? 'opacity-80' : 'text-ink-mute')}>
          {words.external}
        </span>
      ) : null}
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
  const name = nameOf(node, steps, words)
  const tinted = data.chosen || steps !== undefined
  return (
    <div
      role="treeitem"
      data-slot="graph-node"
      data-node-id={node.id}
      data-thing={node.id}
      tabIndex={data.stop ? 0 : -1}
      aria-level={data.level}
      aria-selected={data.chosen}
      aria-expanded={has ? data.open : undefined}
      aria-label={has && !data.open ? words.closed(name, data.hidden) : name}
      aria-describedby={data.about ? data.aboutId : undefined}
      onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
      className={cn(
        // The size of its box, which React Flow is given (`widthOf`, `heightOf`).
        'group relative flex size-full cursor-default items-center gap-2 rounded-md bg-raised px-3 text-sm text-ink shadow-sm',
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
 * button inside another would not be reached. The box around them (`data-thing`) is where the keys pressed on any of
 * them find their thing.
 */
const Point = React.memo(function Point({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const described = React.useId()
  const { node, direction, editable, steps } = data
  const tinted = data.chosen || steps !== undefined
  const add = editable && data.chosen
  // Only a thing the app says it opens has a ›, under the app's name for the action, and opens on a double press.
  const openLabel = data.opens && node.openLabel ? node.openLabel : undefined
  const ends = (add ? 1 : 0) + (openLabel ? 1 : 0)
  // How many the app keeps out of sight inside it: shown and said only above 0.
  const hides = finite(node.hidden) && node.hidden > 0 ? node.hidden : 0
  // Its name, its steps, «external» and how many it hides, then its second line; its relations describe it.
  const named = nameOf(node, steps, words)
  const name = hides > 0 ? words.hides(named, hides) : named
  const relations = [data.leadsTo.length > 0 ? words.leadsTo(data.leadsTo) : '', data.comesFrom.length > 0 ? words.comesFrom(data.comesFrom) : ''].filter(Boolean).join(' · ')
  return (
    // The size of its box, which React Flow is given (`widthOf`, `heightOf`).
    <div data-thing={node.id} className={cn('relative size-full', data.dim && 'opacity-40')}>
      <Handle type="target" position={direction === 'right' ? Position.Left : Position.Top} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
      <div
        role="button"
        data-slot="graph-node"
        data-node-id={node.id}
        tabIndex={data.stop ? 0 : -1}
        // Its name (with its steps on the path, «external», how many it hides) and its second line, as the eye reads them.
        aria-label={node.detail ? `${name}, ${node.detail}` : name}
        // The chosen thing is the one the app shows: a choice, not a toggle that is pressed. When the app marks several
        // (one of its things drawn in several places), each of them is that one thing, so each is current.
        aria-current={data.chosen ? 'true' : undefined}
        aria-describedby={[relations ? described : '', data.about ? data.aboutId : ''].filter(Boolean).join(' ') || undefined}
        onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
        onDoubleClick={openLabel ? () => data.onOpen(node.id) : undefined}
        className={cn(
          'flex size-full cursor-default items-center gap-2 rounded-md bg-raised ps-3 text-sm text-ink shadow-sm',
          // Room at the end for the buttons that lie over it, and more with a finger, where each is 44px.
          ends === 2 ? 'pe-18 pointer-coarse:pe-25' : ends === 1 ? 'pe-10 pointer-coarse:pe-14' : 'pe-3',
          tinted && 'bg-selected text-selected-ink',
          data.chosen && 'font-semibold',
          FOCUS_RING,
        )}
      >
        <Face node={node} tinted={tinted} />
        {steps ? <StepDots steps={steps} /> : null}
        {/* The count of a closed thing of the tree mode, at the same place: read in the name. */}
        <Count value={hides} />
      </div>
      {data.about ? (
        <span id={data.aboutId} hidden>
          {data.about}
        </span>
      ) : null}
      {relations ? (
        <span id={described} className="sr-only">
          {relations}
        </span>
      ) : null}
      {ends > 0 ? (
        <span className="absolute inset-y-0 end-2 flex items-center gap-2 pointer-coarse:gap-0">
          {add ? (
            <Tooltip label={words.addAfter(node.label)}>
              <button type="button" tabIndex={-1} data-slot="graph-add" aria-label={words.addAfter(node.label)} onClick={(event) => { event.stopPropagation(); data.onAdd(node.id) }} className={cn(ON_THING, TOUCH, 'text-selected-ink', FOCUS_RING)}>
                <Icon name="plus" />
              </button>
            </Tooltip>
          ) : null}
          {openLabel ? (
            <Tooltip label={openLabel}>
              <button
                type="button"
                // The next Tab stop after the thing that has it: the way to open from the keyboard.
                tabIndex={data.stop ? 0 : -1}
                data-slot="graph-open"
                aria-label={openLabel}
                onClick={(event) => {
                  event.stopPropagation()
                  // A double press is two clicks: the second one (`detail` 2) opens nothing more. From the keyboard
                  // (`detail` 0) and with one click it opens.
                  if (event.detail > 1) return
                  data.onOpen(node.id)
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onFocus={() => data.onFocus(node.id)}
                className={cn(ON_THING, TOUCH, 'text-ink-mute hover:text-ink', FOCUS_RING)}
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


type Points = readonly { x: number; y: number }[]

/** Where the label of a route sits: the middle of its longest piece, where it has the most room (as Imago's view). */
function middleOf(points: Points): { x: number; y: number } | undefined {
  let middle: { x: number; y: number } | undefined
  let longest = -1
  for (let at = 1; at < points.length; at += 1) {
    const from = points[at - 1]
    const to = points[at]
    if (!from || !to) continue
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (length <= longest) continue
    longest = length
    middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  }
  return middle
}

/**
 * A line along the route the app gave (`points` of a `GraphEdge`, with the app's places): straight pieces from point
 * to point, the corners as the app's layout made them. What React Flow hands a line besides (an arrowhead, a label,
 * a style) is drawn by its `BaseEdge`, as on the other lines. It reads nothing of React Flow's state.
 */
const Route = React.memo(function Route({ id, data, style, markerStart, markerEnd, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, interactionWidth }: EdgeProps<Edge<{ points: Points }, 'route'>>) {
  const points: Points = data?.points ?? []
  const path = points.map((at, index) => `${index === 0 ? 'M' : 'L'}${at.x},${at.y}`).join(' ')
  const middle = middleOf(points)
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      label={label}
      labelX={middle?.x}
      labelY={middle?.y}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      interactionWidth={interactionWidth}
    />
  )
})


const NODE_TYPES = { thing: Thing, point: Point }
const EDGE_TYPES = { route: Route }
/** Room around what is fitted, and at the head for the field and the buttons. */
const PAD = { top: 64, right: 24, bottom: 24, left: 24 }
/** Nothing closed: the graph mode's, the same list at every draw. */
const NOTHING: readonly string[] = []
/** No names: the relations of a thing in the tree mode, which does not say them. */
const NO_NAMES: readonly string[] = []
let made = 0
const freshId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `node-${Date.now()}-${++made}`)

function Canvas({ nodes, edges, model = 'tree', direction = 'right', layoutKey, selected = null, onSelect, onOpen, steps, collapsed, defaultCollapsed, onCollapsedChange, minFitZoom = READABLE, search = false, minimap = false, editable = false, onChange, ref, className, ...props }: GraphCanvasProps) {
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
  // Each thing by its id, once for the graph; the first of two with the same id, as the layout reads them.
  const byId = React.useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const node of nodes) if (!map.has(node.id)) map.set(node.id, node)
    return map
  }, [nodes])
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
  const { below, above } = React.useMemo(() => links(graph), [graph])
  // In the graph mode, the names of what each thing leads to and comes from: its description for screen readers.
  const relations = React.useMemo(() => {
    const named = new Map<string, { leadsTo: readonly string[]; comesFrom: readonly string[] }>()
    if (tree) return named
    const name = (id: string) => byId.get(id)?.label ?? id
    for (const [id, to] of below) named.set(id, { leadsTo: to.map(name), comesFrom: (above.get(id) ?? []).map(name) })
    return named
  }, [tree, below, above, byId])
  const joined = React.useMemo(() => neighbours(edges), [edges])
  const sight = React.useMemo(() => (tree ? visibleGraph(graph, closed) : wholeGraph(graph)), [tree, graph, closed])
  // The app's places when it gave them all, and then nothing is laid out here (in the tree mode a thing opened or
  // closed keeps its place); otherwise dagre's. Either way only what is in sight has a place.
  const given = React.useMemo(() => placesOf(nodes), [nodes])
  const places = React.useMemo(() => placesIn(graph, sight.order, direction, given), [graph, sight, direction, given])
  const [query, setQuery] = React.useState('')
  const word = query.trim().toLowerCase()
  const found = React.useMemo(() => (word ? new Set(nodes.filter((node) => `${node.label} ${node.detail ?? ''}`.toLowerCase().includes(word)).map((node) => node.id)) : null), [nodes, word])
  const [focused, setFocused] = React.useState<string | null>(null)
  // The chosen things in sight, one or the several the app marks, and the first of them in the order of the things:
  // it holds the Tab stop until the user moves it, and stays in sight when the box changes size. Read by their ids, so
  // an app that hands a new list of the same ids at every draw does not have every thing drawn again.
  const selectedKey = selected == null ? '' : typeof selected === 'string' ? selected : selected.join('\n')
  const choice = React.useMemo(() => {
    const ids = new Set<string>(selected == null ? [] : typeof selected === 'string' ? [selected] : selected)
    const inSight = sight.order.filter((id) => ids.has(id))
    return { ids: new Set(inSight), first: inSight[0] ?? null }
    // `selected` is read through its key: the same ids are the same choice.
  }, [selectedKey, sight])
  const chosen = choice.ids
  const stop = focused != null && sight.level.has(focused) ? focused : (choice.first ?? sight.order[0] ?? null)
  // What is joined to the chosen things, one line away on either side, and what is on the path or joined to it.
  const near = React.useMemo(() => (chosen.size > 0 ? new Set([...chosen].flatMap((id) => [id, ...(joined.get(id) ?? [])])) : null), [chosen, joined])
  const pathNear = React.useMemo(() => (path.length > 0 ? new Set(path.flatMap((id) => [id, ...(joined.get(id) ?? [])])) : null), [path, joined])
  // Found by the field, then the chosen things and the path: the rest is dimmed.
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
      void flow.setCenter(at.x + (node ? widthOf(node) : WIDTH) / 2, at.y + (node ? heightOf(node) : 44) / 2, { zoom: flow.getZoom(), duration: 0 })
    }
    return true
  }
  React.useEffect(() => {
    if (wanted.current !== null && sight.level.has(wanted.current) && focus(wanted.current)) wanted.current = null
  })

  const latest = React.useRef({ graph, closed, sight, places, given, below, above, path, size, minFitZoom, direction, byId, chosen: choice.first, onSelect, onOpen, onChange, setClosed, focus, editable, tree })
  latest.current = { graph, closed, sight, places, given, below, above, path, size, minFitZoom, direction, byId, chosen: choice.first, onSelect, onOpen, onChange, setClosed, focus, editable, tree }

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
      if (next !== now.closed) at = placesIn(now.graph, visibleGraph(now.graph, next).order, now.direction, now.given)
      const boxOf = (id: string) => ({ ...at.get(id)!, width: widthOf(now.byId.get(id)!), height: heightOf(now.byId.get(id)!) })
      const all = [...at.keys()].map(boxOf)
      const shown = ids.filter((id) => at.has(id)).map(boxOf)
      if (all.length === 0 || now.size.width === 0 || now.size.height === 0) return next
      const room = aim === 'all' || aim === 'path' ? { ...now.size, ...PAD } : { ...now.size, top: Math.max(PAD.top, padding), right: padding, bottom: padding, left: padding }
      const floor = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, now.minFitZoom))
      // The first thing to read: the first of the things aimed at, or the first thing in sight.
      const leadId = ids.find((id) => at.has(id)) ?? now.sight.order.find((id) => at.has(id))
      let fitted = viewFor(shown.length > 0 ? shown : all, room, floor, 1, all, leadId === undefined ? undefined : boxOf(leadId))
      // `keep` (the first chosen thing, when the box changes size) stays in sight: if the fit leaves it out, the view goes to it.
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
    return { toggle, add, remove, open: (id: string) => latest.current.onOpen?.(id), focus: (id: string) => setFocused(id) }
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

  /**
   * The keys of the things, read at the box; true when one was used. The thing is the one the key was pressed on or,
   * in the graph mode, the one whose button (its ›, its plus) has the focus: from there the arrows, Home and End move
   * as from the thing, while Enter and Space are the button's own (they press it) and Delete is the thing's alone.
   * In the tree mode the keys are the item's own, as a tree's.
   */
  const thingKey = (event: React.KeyboardEvent<HTMLDivElement>, target: Element): boolean => {
    const id = target.closest<HTMLElement>('[data-thing]')?.dataset.thing
    const own = target.matches(SURFACE)
    if (id === undefined || !sight.level.has(id) || (tree && !own)) return false
    const order = sight.order
    const at = order.indexOf(id)
    let to: string | undefined
    if (event.key === 'Home') to = order[0]
    else if (event.key === 'End') to = order[order.length - 1]
    else if (event.key === 'Enter' || event.key === ' ') {
      if (!own) return false
      onSelect?.(id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!own || !editable) return false
      handlers.remove(id)
    } else if (tree) {
      // A tree's: Down and Up through what is in sight, Right opens or goes in, Left closes or goes back.
      const children = below.get(id) ?? []
      const open = !closed.includes(id)
      if (event.key === 'ArrowDown') to = order[at + 1]
      else if (event.key === 'ArrowUp') to = order[at - 1]
      else if (event.key === 'ArrowRight') {
        if (children.length > 0 && !open) handlers.toggle(id)
        else to = children.find((child) => sight.level.has(child))
      } else if (event.key === 'ArrowLeft') {
        if (children.length > 0 && open) handlers.toggle(id)
        else to = (above.get(id) ?? []).find((parent) => sight.level.has(parent))
      } else return false
    } else {
      // A graph's: along the ranks an arrow follows the thing's first line, forwards to where it leads or back to
      // where it comes from (every thing is in sight); across them it goes through the things in the app's order.
      const right = direction === 'right'
      if (event.key === (right ? 'ArrowRight' : 'ArrowDown')) to = below.get(id)?.[0]
      else if (event.key === (right ? 'ArrowLeft' : 'ArrowUp')) to = above.get(id)?.[0]
      else if (event.key === (right ? 'ArrowDown' : 'ArrowRight')) to = order[at + 1]
      else if (event.key === (right ? 'ArrowUp' : 'ArrowLeft')) to = order[at - 1]
      else return false
    }
    if (to !== undefined) focus(to)
    return true
  }

  // Every thing as it is drawn but for the Tab stop, which moves at every arrow: it is set on its own thing below, so
  // the others keep the same data, and React Flow does not draw them again.
  const still = React.useMemo<Node<Drawn>[]>(
    () =>
      sight.order.flatMap((id, index) => {
        const node = byId.get(id)
        const at = places.get(id)
        if (!node || !at) return []
        const numbers = marked?.get(id)
        const related = relations.get(id)
        return [
          {
            id,
            type: tree ? 'thing' : 'point',
            position: at,
            width: widthOf(node),
            height: heightOf(node),
            draggable: false,
            selectable: false,
            focusable: false,
            data: { node, level: sight.level.get(id) ?? 1, children: (below.get(id) ?? []).length, hidden: sight.hidden.get(id) ?? 0, open: !closed.includes(id), chosen: chosen.has(id), steps: numbers && numbers.length > 0 ? numbers : undefined, about: (about.get(id) ?? []).join('. '), aboutId: `${uid}-about-${index}`, dim: dimmed?.has(id) ?? false, stop: false, editable, direction, opens, leadsTo: related?.leadsTo ?? NO_NAMES, comesFrom: related?.comesFrom ?? NO_NAMES, onToggle: handlers.toggle, onAdd: handlers.add, onOpen: handlers.open, onFocus: handlers.focus },
          },
        ]
      }),
    [sight, byId, places, marked, about, uid, dimmed, below, closed, chosen, editable, direction, tree, opens, relations, handlers],
  )
  const drawn = React.useMemo<Node<Drawn>[]>(() => still.map((it) => (it.id === stop ? { ...it, data: { ...it.data, stop: true } } : it)), [still, stop])
  const { lines, edgeOf } = React.useMemo(
    () => linesOf(edges, places, { direction, chosen: chosen.size > 0 ? chosen : null, marked: path.length > 0 ? new Set(path) : null, dimmed: path.length > 0 && !found ? dimmed : null, editable, routes: given !== null }),
    [edges, places, direction, chosen, path, found, dimmed, editable, given],
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
  // After a new layout of the app's (`layoutKey`) the whole graph is fitted again; on a draw of the same layout the view
  // stays where the user put it. Which one it is, the app says, as an app that lays out with an engine of its own knows
  // (the direction, the things and the lines it laid out): the canvas cannot tell, since a draw of the same layout hands
  // it new objects for the same places, and in the tree mode dagre places things again at every opening. The view is
  // computed from the places themselves, so it is fitted in the draw that brings them.
  const fittedTo = React.useRef(layoutKey)
  React.useEffect(() => {
    if (fittedTo.current === layoutKey) return
    fittedTo.current = layoutKey
    view.handle.fit()
  }, [layoutKey, view])
  // The keys of the canvas, read at its box. +, − and 0 from anywhere in it but a field (the search keeps what is
  // typed into it), = as + (the same key without Shift); the others are the things' (`thingKey`). With Ctrl or Cmd
  // they are the browser's own zoom; Shift is let through, since on some keyboards it makes the +.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const target = event.target instanceof Element ? event.target : null
    if (!target || target.closest(FIELDS)) return
    if (event.key === '+' || event.key === '=') zoomIn()
    else if (event.key === '-') zoomOut()
    else if (event.key === '0') fit()
    else if (!thingKey(event, target)) return
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
    // What a screen reader meets is this box, named by the app. Inside it React Flow's own box is always an
    // `application` (the library sets the role after the props it is given, so a `role` passed to it does nothing);
    // a screen reader inside it hands the keys to the canvas.
    // - In the tree mode, a tree of items. The library's application sits between the tree and its items: a known
    //   limit, since that box is the library's to draw. With several things chosen the tree says it holds more than
    //   one (`aria-multiselectable`), while the user still chooses one at a time.
    // - In the graph mode the lines are not «hangs from», so it is not a tree, and not a second application around the
    //   library's: a group, which `aria-roledescription` calls a graph (the word `graph.roleDescription`).
    // - Each thing is a button: its name and second line name it, where its lines lead and come from describe it, and
    //   the chosen one is `aria-current` (a choice, not a toggle; each of the several the app marks). One Tab stop as
    //   in the tree. Not a listbox: an option cannot hold the › that opens it, and inside a listbox the app's commands
    //   give up their keys (`commands.tsx`).
    <div ref={box} role={tree ? 'tree' : 'group'} aria-roledescription={tree ? undefined : words.roleDescription} aria-multiselectable={tree && chosen.size > 1 ? true : undefined} {...props} data-slot="graph" onKeyDown={onKeyDown} className={cn('relative h-96 min-h-0 overflow-hidden rounded-md bg-paper-2', className)}>
      <ReactFlow
        // Not shown until the first view is fitted to the measured box; an empty graph has nothing to fit.
        className={cn(!shown && !empty && size.width > 0 && size.height > 0 && 'invisible')}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        onPaneClick={() => onSelect?.(null)}
        onConnect={editable ? join : undefined}
        onDelete={
          editable
            ? ({ edges: gone }) => {
                // Each line is one edge, so of two edges between the same things only the one picked goes.
                const removed = gone.flatMap((it) => {
                  const edge = edgeOf.get(it.id)
                  return edge ? [edge] : []
                })
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
