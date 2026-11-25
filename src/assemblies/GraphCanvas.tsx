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
//   same key (another choice, new flags, the same places) keeps the view where the user moved it, and so does a change
//   of the box's size.
// - A thing is a raised surface with a shadow and no border (R4): an icon or a dot of its colour (R10), a name, a
//   line under it, and on a thing outside what the graph is about (`external`) the word «external», 12px in the muted
//   ink, never a dashed border; the name keeps some room and the word gives way first (the word, not the icon of that
//   name, which leaves the app: `icons.tsx`). The chosen one has the selection
//   tint (R1), or each of the several the app marks when it draws one of its things in several places; what is joined
//   to them stays as it is and the rest is dimmed, so the eye finds the neighbourhood. Of the several, one is the
//   choice: the first in the order of the things, which holds the Tab stop and is the one screen readers hear chosen;
//   the others say in their description that they are chosen with it. The app shows the details of the chosen thing
//   where it likes (the `Inspector` of the frame).
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
//     has a → button of that name, and a double press on it or its → calls `onOpen` with its id. Without `onOpen`,
//     or on a thing without `openLabel`, there is no → and nothing opens. A thing that holds others the app keeps out
//     of sight (a group it has not opened) says how many (`hiddenCount`), at its end as a closed thing of the tree does,
//     and in its name.
//   - The things are one Tab stop, and the → of the one that has it is the next. Along the ranks the arrows follow the
//     lines: with `direction="right"` Right goes to what the thing's first line leads to and Left back to what its
//     first line comes from, while Down and Up go through the things in the order the app gave them; downwards the
//     axes swap. Home and End reach the first and the last thing of that order, Enter chooses. From the → the arrows,
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
//   The words may be drawn only while one of the two things is chosen or has the focus, or while the line is the
//   path's (`labelShown: 'chosen'`), and are heard always.
//   Words are drawn on their line only where they have room: over no thing and over no other words (`wordsOf`). The
//   others are listed under the view's buttons, each with a sample of its line and the two things it joins
//   (`LineWords`). No room is made for them: the places are the same with a thing chosen or not, so a choice never
//   makes the layout jump, and the app's own places and routes are kept as they are.
//   An edge with an `id` is a line of its own: two between the same two things are two lines, each with its words. An
//   edge without one is one line with its exact copies (the same ends, kind, words, dash, tone and arrowhead, and no
//   route), and taking that line away takes them all; edges without ids that differ in any of those are lines of
//   their own, numbered after their ends. Without the app's routes, two lines or more between the same two things are
//   drawn side by side (a line type of the canvas's, `apart`), so the lines and their words do not lie on each
//   other; with the routes each follows its own.
// - With `steps` the app numbers a path through the graph (the steps of a plan, the answer to a question): each
//   thing on it has the selection tint and its numbers in small dots and in its name, one line between two of them
//   (the first in the order of the edges) is the path's, in the accent or in a tone of its own and thicker, what is
//   neither on the path nor joined to it is dimmed, and what hides a thing of the path opens.
// - The view is fitted at the first paint (on the path, when there is one), again whenever the box changes size, and
//   with the button or the key: never smaller than a name can be read (`minFitZoom`, about 11px names). With a
//   `layoutKey`, a view the user moved is not fitted again when the box changes size: it stays, panned only by what
//   brings the chosen thing back into it. A graph too
//   large for that starts at its top left, and the edges of the view fall between things wherever the layout leaves
//   a gap between the floor and 1.5 (a dense graph in a small box may still have one cut). The app
//   moves the view through a `ref`: `focus` (onto some things, opening what hides them), `fit`, `zoomTo`.
// - With `search` a field finds things by name; the others are dimmed, and Enter goes to the first one found,
//   opening what hides it.
// - The box is 384px tall, or with `fill` as tall as the region that holds it (the content of the frame, a pane, the
//   body of a `Page fit`, a `Column fill`), as `VirtualList fill` is: an app writes no class for it. Beside other parts
//   in a pile (a row of filters above it, its key under it) it takes what they leave, and gives way when the region
//   does; the view is fitted again. Never under 224px (232px with a finger): the field and the small map, one over the
//   other at the start, are both whole (`FILL`). In less than that the region scrolls, and the canvas covers nothing
//   that follows it (`Column fill`); in a region with no height of its own (a plain `Column`, a page that grows with
//   what it holds) the box is that tall.
// - With `editable` a thing shows its handles: drag from one to another thing to join them, press the plus on the
//   chosen thing (the first of several, alone) to hang a new one from it (in the graph mode, to add one after it).
//   Every change is asked of the app with `onChange`, which keeps the graph (and its undo, R12): nothing is kept here
//   but what is open and where the view is.
// The cost is the layout, done again when the graph changes or a thing opens or closes: about 30ms for 200 things in
// sight, 200ms for a thousand, most of a second for three thousand (measured). In the tree mode a larger graph starts
// with its branches closed (`defaultCollapsed`); in the graph mode every thing is in sight, so the whole graph is laid
// out at every change of the nodes, the edges or the direction (choosing a thing or moving the focus lays out
// nothing). With the app's places nothing is laid out here. Moving the view costs little: only what is in it is drawn.
// - Groups opened in place (the graph mode). A thing with `open: true` is a frame: its title (the thing's own face
//   and count), a button that closes it («Close Orders», `onToggle`), a line around it and a quiet fill, under the
//   things and the lines. A thing whose `group` is the id of an open group is drawn inside it (React Flow's
//   `parentId`): its `x` and `y` are then from the top left corner of the group, as a nested layout answers them; the
//   routes of the lines (`points`) stay in the canvas's own px. Without the app's places the canvas lays each open
//   group out by itself (dagre, the innermost first) and then the group as one box among the others. A group that is
//   not open (`open: false`) is a thing as ever, with a button that opens it («Open Orders»). `onOpen` and `openLabel`
//   are another thing: the app goes into the thing and shows something else; `onToggle` keeps the rest in sight.
// - Things that move (`movable`): a drag (after 4px, so a press is not one) puts a thing elsewhere, and so do Alt and
//   an arrow, 16px a step. The place is kept here until `layoutKey` changes or the person presses «Reset the layout»,
//   which is among the view's buttons only while something was moved. A group is dragged by its title (its ground lets
//   a press through to the canvas) and takes what it holds with it; a line to a moved thing leaves its route and goes
//   from side to side.
// - Motion (`animated`, or a `MotionProvider` around it, and never with reduced motion): after a gesture that changes
//   the places the things glide there in 200ms, the lines are hidden meanwhile and drawn again at the end, with what
//   is new, and the view goes where a gesture sends it in the same time. The gesture is the canvas's own (a group
//   opened or closed, the reset) that new places follow within a second, or a press or a key in the canvas
//   that a new `layoutKey` follows within a second. A new layout the app pushes by itself jumps. Nothing moves at the
//   first paint, while a thing is dragged, or by itself. Without it everything jumps.
// The name of React Flow stays at the foot of the canvas, as its makers ask of whoever does not pay for it.
import * as React from 'react'
import dagre from '@dagrejs/dagre'
import { Background, BackgroundVariant, BaseEdge, getSmoothStepPath, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react'
import { Maximize } from '../internal/sigrid-icons'
import { Icon, type IconName } from '../icons'
import { markHueAttrs } from '../colors'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { FIELDS } from '../internal/desktop-guard'
import { motionMs, useMotionAllowed } from '../internal/motion'
import { useWords, type Words } from '../words'
import { Count } from '../primitives/count'
import { Logo } from '../primitives/logo'
import { lineLook, lineVars } from './graph-lines'
import { SearchField } from '../components/search-field'
import { Button } from '../primitives/button'
import { Tooltip } from '../primitives/tooltip'

export type GraphNode = {
  id: string
  /** The name of the thing: one line, cut with an ellipsis. */
  label: string
  /** A second line under the name: a state, a date, a person. */
  detail?: string | undefined
  /** One of Sigrid's icons before the name. */
  icon?: IconName | undefined
  /**
   * A picture of the thing, where it has one of its own (the logo of a service, of a framework, of a library): the
   * address of an image the app serves (an SVG or a PNG of its own origin), drawn before the name in the icon's place,
   * 16px, whole (never cropped): the toolkit's `Logo`. It is content, not an icon of the interface (those are `icon`, Sigrid's one set), and
   * it names nothing: the name says what the thing is. While it loads and when it fails the `icon` (or the dot of the
   * `color`) is drawn in the same 16px, so nothing shifts.
   */
  image?: string | undefined
  /** The colour the user gave the thing (`#rrggbb`): an 8px dot before the name (R10). */
  color?: string | undefined
  /**
   * In the graph mode, the thing is a group the app opens in place. `true`: it is drawn as a frame, with its title, a
   * button that closes it and, inside, the things whose `group` is its id; give it the `width` and `height` of the
   * frame with the app's places (the title takes its first 44px). `false`: a thing as the others, with a button that
   * opens it. Both buttons call `onToggle` of the canvas, and are drawn only with it. Absent: not a group.
   */
  open?: boolean | undefined
  /**
   * In the graph mode, the id of the open group (`open: true`) the thing is in: it is drawn inside that frame and
   * moves with it, and its `x` and `y` are then from the top left corner of the group (what a nested layout answers,
   * and React Flow's `parentId` takes). Read only while that thing is there and open; otherwise the thing is on the
   * canvas as the others.
   */
  group?: string | undefined
  /**
   * In the graph mode, the name of the action that opens the thing and of its → button («Open Orders»): only a thing
   * with it opens (its →, a double press), and only when `onOpen` is given. The tree mode does not read it.
   */
  openLabel?: string | undefined
  /**
   * The thing is outside what the graph is about (another's service, a library): the word «external» after its name,
   * 12px in the muted ink (`graph.external`), also in its name for screen readers. Never a dashed border (R4). In a
   * narrow box the name keeps some room and the word is cut first. It is a word and draws no icon: `icon` says what the
   * thing is (`globe` for the web), and the icon `external` is for a press that leaves the app.
   */
  external?: boolean | undefined
  /**
   * In the graph mode, how many things the app keeps out of sight inside this one (a group it has not opened): a
   * count at its end, as a closed thing of the tree mode shows it, and in its name («Orders, hides 12», the word
   * `graph.hides`). Read when above 0. The tree mode counts what a closed thing hides by itself and does not read it.
   */
  hiddenCount?: number | undefined
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
   * The app's name for the line, also React Flow's. An edge with an `id` is always a line of its own, so two between
   * the same two things (a call, and data that flows the same way) are two lines, each with its words. Without one
   * the line is named by its two ends, and a second one with the same ends by a number after them; an exact copy of
   * an edge without an `id` (the same ends, `kind`, `label`, `labelShown`, `style`, `tone`, `directed` and `path`, and
   * no `points`) is the same line, and taking that line away takes every copy.
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
  /**
   * When the words are drawn: `always` (the default), or `chosen`, only while one of the two things is chosen or has
   * the keyboard focus, or while the line is the one of the path (`steps`) between its two things. Screen readers
   * hear them in both cases.
   */
  labelShown?: 'always' | 'chosen' | undefined
  /** The dash of the line. What a kind of line means is said by its dash and its words, never by its colour alone. Default `solid`. */
  style?: 'solid' | 'dashed' | 'dotted' | undefined
  /** The colour of the line, among the theme's (each keeps 3:1 on the canvas): `accent` is also thicker. Default the muted ink. Kept on the path (`steps`), which takes the accent only on a line without a tone of its own. */
  tone?: 'default' | 'accent' | 'warning' | 'destructive' | undefined
  /** An arrowhead at `to`. Default: a `link` has one, a `child` has none (its rank says which way it goes). `false` for a relation that goes both ways. */
  directed?: boolean | undefined
  /**
   * The route of the line when the app placed the things: its points from start to end, in px (a layout's start
   * point, bends and end point). Read only with the app's places; without it, or with fewer than two points, the line
   * goes from one side of a thing to the facing side of the other.
   */
  points?: readonly { x: number; y: number }[] | null | undefined
  /**
   * The line is one of the path's own (the flow the app shows). When any edge of the graph has it, those lines alone
   * are the path's (the accent or their own tone, thicker, their words drawn) and every other line is dimmed as off
   * the path; the rule of `steps` (the first line between two things of the path) is then not applied.
   */
  path?: boolean | undefined
}

export type Graph = { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }

/** What the user did to the graph: a thing hung from another, two things joined, things and joins taken away. */
export type GraphChange = { kind: 'add'; node: GraphNode; edge: GraphEdge } | { kind: 'join'; edge: GraphEdge } | { kind: 'remove'; nodes: readonly string[]; edges: readonly GraphEdge[] }

/** What the app can do to the view, through the canvas's `ref`. The view jumps, or with `animated` goes there in 200ms. */
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
   * Pass the new key with the new places. A change of the box's size keeps a view the user moved, with the chosen thing
   * still in it, and fits again one nobody moved. Without a key the view is fitted at the first paint and at every
   * change of size. With a thing chosen, a change of the box's size never fits again: the view stays, panned only by
   * what keeps the chosen thing in it (an inspector that opens on a first press moves nothing under a second press).
   */
  layoutKey?: string | undefined
  /**
   * The id of the thing chosen: the one whose details the app shows. Or several ids, when the app draws one of its
   * things as several (an entity in each place it is): each has the selection tint and what is joined to it stays.
   * One of them is the choice: the first in the order of the things, which holds the Tab stop, is the one screen
   * readers hear chosen (`aria-selected` in the tree, `aria-current` in the graph mode) and, with `editable`, has the
   * plus; the others say in their description that they are chosen with it (`graph.chosenToo`). The user still
   * chooses one (`onSelect`).
   */
  selected?: string | readonly string[] | null | undefined
  onSelect?: ((id: string | null) => void) | undefined
  /** In the graph mode, the app opens a thing (goes into it, shows what it holds): asked by a double press on a thing with an `openLabel` or by its → button. Without it nothing opens. */
  onOpen?: ((id: string) => void) | undefined
  /**
   * In the graph mode, the person asks to open or close a group in place: the button of a thing with `open: false`
   * («Open Orders»), a double press on it (when it has no `openLabel`), or the button of an open group's frame
   * («Close Orders»). The app then passes the thing with the other `open`, and what it holds or not. It differs from
   * `onOpen`: that one goes into the thing (the app shows something else), this one keeps the rest of the graph in sight.
   */
  onToggle?: ((id: string) => void) | undefined
  /**
   * The person can move the things: a drag (after 4px), or Alt and an arrow on the thing that has the focus (16px a
   * step). The canvas keeps the place until `layoutKey` changes or «Reset the layout» is pressed (a button among the
   * view's, there only while something was moved). An open group moves what it holds; a thing in a group stays in it.
   */
  movable?: boolean | undefined
  /** A thing was moved: its id and its new place, the top left corner of its box in px, in the same terms as its `x` and `y` (from its group's corner when it is in one). The canvas keeps the place by itself; this is for an app that keeps it too. */
  onMove?: ((id: string, place: { x: number; y: number }) => void) | undefined
  /**
   * After a gesture that changes the places the things glide to them and the view goes where a gesture sends it (the
   * buttons, the keys, `fit`, `focus`), in 200ms. A gesture is the canvas's own (a group opened or closed with its
   * button, the reset) that new places follow within a second, or a press or a key in the canvas that a
   * new `layoutKey` follows within a second; a layout or places the app pushes by itself jump. Absent: what the
   * `MotionProvider` around it says. Never with reduced motion, at the first paint or while a thing is dragged.
   */
  animated?: boolean | undefined
  /**
   * A path the app numbers through the graph: the id of each thing on it and its step numbers (a thing may be several
   * steps). Each has the selection tint and its numbers; of the lines between two of them, the first in the order of
   * the edges is the path's (the accent, or the line's own `tone`, thicker), so an app that wants another one there
   * gives it first; what is neither on it nor joined to it is dimmed. When the things on it change, what hides one of
   * them opens (through `onCollapsedChange` when the app keeps what is closed); the first view is on them.
   */
  steps?: ReadonlyMap<string, readonly number[]> | undefined
  /** In the tree mode, the ids of the things that are closed, when the app keeps them; otherwise the canvas keeps its own, from `defaultCollapsed`. */
  collapsed?: readonly string[] | undefined
  defaultCollapsed?: readonly string[] | undefined
  onCollapsedChange?: ((ids: string[]) => void) | undefined
  /**
   * The smallest scale the view is fitted at (the first view, a change of size, the button, `fit`, `focus`): below it
   * a name could not be read, so a graph too large starts at its top left instead. Default 0.8, names of about 11px; 0
   * fits the whole graph whatever its size, down to the smallest zoom (0.2): for a map that is read whole first
   * (`minFitZoom={0}`). The user can still zoom out by hand.
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
  /**
   * As tall as the region that holds it, which gives it its height (the content of the frame, a pane, the body of a
   * `Page fit`, a `Column fill`): it takes what the parts beside it leave and gives way with it, never under 224px
   * (232px with a finger), where the field and the small map are both whole. In a plain `Column`, which has no height to
   * give, it is that tall and no more. Absent: 384px.
   */
  fill?: boolean | undefined
  /** Classes of the box: its height, where it is neither 384px nor `fill`. */
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
/** The size of a thing's box: the app's, or the canvas's own. */
type Size = { width: number; height: number }
const sizeOfNode = (node: GraphNode | undefined): Size => (node ? { width: widthOf(node), height: heightOf(node) } : { width: WIDTH, height: 44 })
/** The title of an open group's frame, in px: what it holds starts under it. */
const HEAD = 44
/** How far a thing goes at each press of Alt and an arrow: the step of the canvas's dots. */
const STEP = 16
/** A drag starts after this many px, so a press, or a pan that starts on a thing, is not one. */
const DRAG_AFTER = 4
/** How long the things take to glide to their new places and the view to go where a gesture sends it: Fluent's `normal`, on its easy-ease curve (graph.css). */
const GLIDE_MS = 200
/**
 * How long after a gesture new places are its answer: the canvas's own gesture (a group opened or closed, the reset),
 * or a press or a key in the canvas for a new layout of the app's (`layoutKey`). Later, they are the app's own doing
 * and are not animated.
 */
const ARMED_MS = 1000
/** No ids: the same set at every draw. */
const NO_IDS: ReadonlySet<string> = new Set()
/** Nothing moved: the same map at every draw. */
const NOT_MOVED: ReadonlyMap<string, { x: number; y: number }> = new Map()
/**
 * The ground of an open group takes no press: a press on it reaches the canvas (a pan, a press that chooses nothing)
 * and the lines under it, and with `movable` the group is dragged by its title, never by a pan that starts on its
 * ground. Its title and its button take theirs back (`pointer-events-auto`). React Flow lays a node's `style` over its own.
 */
const FRAME_STYLE: React.CSSProperties = { pointerEvents: 'none' }
const ARROWS: Readonly<Record<string, readonly [number, number]>> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

/** The groups opened in place: which things are frames, the group each thing is in, and what each group holds, in the order of the things. */
type Nest = { frames: ReadonlySet<string>; parent: ReadonlyMap<string, string>; held: ReadonlyMap<string, readonly string[]> }

/**
 * The open groups of the graph mode, or null when there is none (and nothing below costs anything). A `group` that
 * names no open group, the thing itself or a ring of groups is not read: the thing is on the canvas as the others.
 */
function nestOf(byId: ReadonlyMap<string, GraphNode>): Nest | null {
  const frames = new Set<string>()
  for (const [id, node] of byId) if (node.open === true) frames.add(id)
  if (frames.size === 0) return null
  const parent = new Map<string, string>()
  for (const [id, node] of byId) if (node.group !== undefined && node.group !== id && frames.has(node.group)) parent.set(id, node.group)
  // A ring of groups holds nothing: the thing where it is found is let out.
  for (const id of [...parent.keys()]) {
    const seen = new Set<string>([id])
    for (let up = parent.get(id); up !== undefined; up = parent.get(up)) {
      if (seen.has(up)) {
        parent.delete(id)
        break
      }
      seen.add(up)
    }
  }
  const held = new Map<string, string[]>()
  for (const [id, up] of parent) held.set(up, [...(held.get(up) ?? []), id])
  return { frames, parent, held }
}

/**
 * The places when the app gave none and some groups are open: each group is laid out by itself (dagre, the innermost
 * first), then it is one box among the others, as large as what it holds and its title. A line that crosses a frame
 * counts, in each layout, between the two things of that layout it reaches. The places of what a group holds are from
 * the group's corner, as the app's are.
 */
function layoutNested(graph: Graph, shown: readonly string[], direction: 'right' | 'down', nest: Nest): { rel: Map<string, { x: number; y: number }>; sizes: Map<string, Size> } {
  const inSight = new Set(shown)
  const rel = new Map<string, { x: number; y: number }>()
  const sizes = new Map<string, Size>()
  // The thing of a group (or of the canvas: undefined) that holds `id`, or is it.
  const memberOf = (id: string, holder: string | undefined): string | undefined => {
    for (let at = id; ; ) {
      const up = nest.parent.get(at)
      if (up === holder) return at
      if (up === undefined) return undefined
      at = up
    }
  }
  // Of two things with one id, the first, as everywhere here.
  const taken = new Set<string>()
  const things = graph.nodes.filter((node) => inSight.has(node.id) && !taken.has(node.id) && taken.add(node.id))
  const layoutIn = (holder: string | undefined): Size => {
    const members = things.filter((node) => nest.parent.get(node.id) === holder)
    const boxes = members.map((node) => (nest.frames.has(node.id) ? { ...node, ...layoutIn(node.id) } : node))
    for (const box of boxes) if (nest.frames.has(box.id)) sizes.set(box.id, sizeOfNode(box))
    const ids = new Set(members.map((node) => node.id))
    const lines: GraphEdge[] = []
    for (const edge of graph.edges) {
      const from = memberOf(edge.from, holder)
      const to = memberOf(edge.to, holder)
      if (from === undefined || to === undefined || from === to || !ids.has(from) || !ids.has(to)) continue
      lines.push({ from, to, kind: edge.kind })
    }
    const places = layoutGraph({ nodes: boxes, edges: lines }, [...ids], direction)
    let width = WIDTH
    let height = 0
    for (const box of boxes) {
      const at = places.get(box.id)
      if (!at) continue
      // Under the title of the group that holds them; dagre's own 16px are the room around them.
      rel.set(box.id, holder === undefined ? at : { x: at.x, y: at.y + HEAD })
      width = Math.max(width, at.x + widthOf(box) + 16)
      height = Math.max(height, at.y + heightOf(box) + 16)
    }
    return { width, height: HEAD + height }
  }
  layoutIn(undefined)
  return { rel, sizes }
}

/** The places on the canvas, from places that are each from the corner of the group that holds the thing. */
function absolute(rel: ReadonlyMap<string, { x: number; y: number }>, parent: ReadonlyMap<string, string>): Map<string, { x: number; y: number }> {
  const places = new Map<string, { x: number; y: number }>()
  const at = (id: string): { x: number; y: number } | undefined => {
    const known = places.get(id)
    if (known) return known
    const own = rel.get(id)
    if (!own) return undefined
    const up = parent.get(id)
    const base = up === undefined ? undefined : at(up)
    const place = base ? { x: base.x + own.x, y: base.y + own.y } : own
    places.set(id, place)
    return place
  }
  for (const id of rel.keys()) at(id)
  return places
}

/**
 * The thing that stands in for the Tab stop when the one that holds it is out of the view, and so not drawn: the first
 * thing, in the order given, with a part of its box in the view. Null when the stop is in the view (it needs none) or
 * when no thing is. It names a thing and nothing more: the focus, the choice and the view are not its business.
 */
export function standInFor(stop: string, order: readonly string[], boxOf: (id: string) => Box | undefined, view: { x: number; y: number; zoom: number }, room: Size): string | null {
  const inView = (id: string) => {
    const box = boxOf(id)
    return box !== undefined && view.x + (box.x + box.width) * view.zoom > 0 && view.y + (box.y + box.height) * view.zoom > 0 && view.x + box.x * view.zoom < room.width && view.y + box.y * view.zoom < room.height
  }
  return inView(stop) ? null : (order.find(inView) ?? null)
}

/**
 * The view moved by what keeps a box whole in a canvas of `room`, `pad` px from its edges, at the same scale; the same
 * view when the box is whole already. A box larger than the room is kept by its start.
 */
export function viewKeeping<View extends { x: number; y: number; zoom: number }>(view: View, box: Box, room: Size, pad = 0): View | { x: number; y: number; zoom: number } {
  const along = (at: number, start: number, length: number, full: number) => {
    const end = at + (start + length) * view.zoom
    const back = end > full - pad ? at - (end - (full - pad)) : at
    return back + start * view.zoom < pad ? pad - start * view.zoom : back
  }
  const x = along(view.x, box.x, box.width, room.width)
  const y = along(view.y, box.y, box.height, room.height)
  return x === view.x && y === view.y ? view : { x, y, zoom: view.zoom }
}

/** Two sets of places are the same places: the same things, each where it was. */
function samePlaces(a: ReadonlyMap<string, { x: number; y: number }>, b: ReadonlyMap<string, { x: number; y: number }>): boolean {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const [id, at] of a) {
    const to = b.get(id)
    if (!to || to.x !== at.x || to.y !== at.y) return false
  }
  return true
}

/** The focus is nobody's: on the page itself, or on something that is no longer in it. Only then may the canvas take it by itself. */
const focusIsFree = () => {
  const active = typeof document === 'undefined' ? null : document.activeElement
  return active === null || active === document.body || !active.isConnected
}

/**
 * Two things as the canvas hands them to React Flow are the same: the same place, size, group and data, value by
 * value. The one handed before is then handed again, so React Flow does not draw the thing again.
 */
function sameThing(a: Node<Drawn>, b: Node<Drawn>): boolean {
  if (a.type !== b.type || a.position.x !== b.position.x || a.position.y !== b.position.y || a.width !== b.width || a.height !== b.height || a.parentId !== b.parentId || a.draggable !== b.draggable || a.zIndex !== b.zIndex || a.style !== b.style) return false
  const from = a.extent
  const to = b.extent
  if (from !== to && !(Array.isArray(from) && Array.isArray(to) && from[0][0] === to[0][0] && from[0][1] === to[0][1] && from[1][0] === to[1][0] && from[1][1] === to[1][1])) return false
  const was = a.data as Record<string, unknown>
  const now = b.data as Record<string, unknown>
  for (const key in now) if (was[key] !== now[key]) return false
  return true
}

/**
 * What React Flow is handed, from what it has (`now`) and the things as they are now drawn (`drawn`). A thing that is
 * as it was stays the very object React Flow has. One that changed is the new one, with what React Flow measured of
 * it (`measured`: with it React Flow keeps the thing's size and where its handles are, and does not measure again)
 * only while that measure still holds: the same part (`type`), the same `width` and `height`, the same direction (the
 * handles are on other sides in another). Otherwise it is handed without, and React Flow measures it again. A thing
 * being dragged (`held`) stays where React Flow has it, and dragged.
 */
export function handOver(now: readonly Node<Drawn>[], drawn: readonly Node<Drawn>[], held: ReadonlySet<string>): Node<Drawn>[] {
  const at = new Map(now.map((it) => [it.id, it]))
  return drawn.map((it) => {
    const was = at.get(it.id)
    if (!was || was === it) return it
    const measured = was.measured && was.type === it.type && was.width === it.width && was.height === it.height && was.data.direction === it.data.direction ? { measured: was.measured } : {}
    if (held.has(it.id)) return { ...it, position: was.position, dragging: true, ...measured }
    if (!was.dragging && sameThing(was, it)) return was
    return 'measured' in measured ? { ...it, ...measured } : it
  })
}

/** On the small map an open group is its outline, so the things it holds are told from it. */
const mapClass = (node: Node) => (node.type === 'frame' ? 'sigrid-graph-map-group' : '')

// Only `link` is a link: an edge that carries a `kind` field of the app's own (an object with more fields is still a
// `GraphEdge`) hangs, as every edge did before there were kinds.
const isChild = (edge: GraphEdge) => edge.kind !== 'link'
/** One id or several, as a set: what the app passes as `selected`, and the chosen things `linesOf` is handed. */
function idSet(ids: string | Iterable<string> | null | undefined): ReadonlySet<string> {
  return new Set<string>(ids == null ? [] : typeof ids === 'string' ? [ids] : ids)
}
/**
 * What makes an edge without an `id` the same line as its exact copies: its ends, its kind, its words and when they are
 * drawn, its dash, its tone and its arrowhead, as they are read. Null for an edge that is always a line of its own:
 * one with an `id` (an empty one names nothing), or with a route of its own (`points`).
 */
function copyOf(edge: GraphEdge): string | null {
  if (edge.id || (edge.points && edge.points.length > 0)) return null
  const child = isChild(edge)
  return JSON.stringify([edge.from, edge.to, child, edge.label || '', edge.labelShown === 'chosen', edge.style ?? 'solid', edge.tone ?? 'default', edge.directed ?? !child, edge.path === true])
}
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

/** The words on a line, on the canvas's own ground so the line stops around them. */
const wordsOn = (label: string) => ({ label, labelShowBg: true, labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4 })
/**
 * Two lines or more between the same two things, without the app's routes, are drawn side by side (`Apart`): 20px
 * apart, about the height of their words, so the words of two lines do not lie on each other; never further than 16px
 * from the middle of the side they leave, so their ends stay on a thing 44px tall. From three lines on they share that
 * room, closer, and their words may touch.
 */
const APART = 20
const SPREAD = 16
/** How far a line goes straight out of a side before it bends: React Flow's own (`offset` of its smoothstep path). */
const STUB = 20

/**
 * The lines React Flow draws for the edges whose two ends are in sight, and the edge each one is (the first of its
 * copies). An edge with an `id` is a line of its own, named by it. One without is named by its two ends, `child` lines
 * plainly and a `link` with `#link` after them (the names they always had), so the two kinds between the same things
 * are two lines; a second edge of a name already taken has a number after it (`#2`), so two edges with the same ends
 * stay two, unless it is an exact copy of an edge without an `id` (`copyOf`): that is the same line, drawn once. Two
 * lines or more between the same two things, from the same side to the same side and without a route, are drawn side
 * by side: the line type `apart`, each `data.offset` px across its sides from the middle. Of the lines between two
 * things of the path (`marked`) the first is the path's: the accent, or the line's own tone, and thicker; with a path,
 * a line to a dimmed thing is dimmed too. When any edge says it is the path's (`path`), those alone are, and every
 * other line is dimmed. With `routes` (the app placed the things) a line with `points` follows them, unless one of its
 * two things is in `loose` (moved by the person: the route no longer reaches it).
 * `chosen` is the chosen thing, or the several the app marks: their lines are told from the others, and the words of
 * a line drawn only on a choice (`labelShown: 'chosen'`) are drawn while one of its two things is among them, or while
 * it is the path's (the canvas draws them too while one of its two things has the focus).
 */
export function linesOf(
  edges: readonly GraphEdge[],
  places: ReadonlyMap<string, { x: number; y: number }>,
  { direction, chosen, marked, dimmed, editable, routes = false, loose = null }: { direction: 'right' | 'down'; chosen: string | ReadonlySet<string> | null; marked: ReadonlySet<string> | null; dimmed: ReadonlySet<string> | null; editable: boolean; routes?: boolean; loose?: ReadonlySet<string> | null },
): { lines: Edge[]; edgeOf: Map<string, GraphEdge> } {
  const lines: Edge[] = []
  const edgeOf = new Map<string, GraphEdge>()
  const picked = idSet(chosen)
  // The copies drawn already, the two things of the path whose line is drawn already, and the lines without a route
  // by their two ends and the side they reach.
  const copies = new Set<string>()
  const stepped = new Set<string>()
  const beside = new Map<string, Edge[]>()
  // The app says which lines are the path's: then those alone are, and the others are off it.
  const said = edges.some((edge) => edge.path === true)
  for (const edge of edges) {
    const from = places.get(edge.from)
    const to = places.get(edge.to)
    if (!from || !to || edge.from === edge.to) continue
    // An exact copy of an edge without an `id` is the line drawn for the first of them.
    const copy = copyOf(edge)
    if (copy !== null) {
      if (copies.has(copy)) continue
      copies.add(copy)
    }
    const child = isChild(edge)
    // An empty `id` names nothing: the line is named by its ends.
    const name = edge.id || (child ? `${edge.from}→${edge.to}` : `${edge.from}→${edge.to}#link`)
    let id = name
    for (let n = 2; edgeOf.has(id); n += 1) id = `${name}#${n}`
    edgeOf.set(id, edge)
    const near = picked.has(edge.from) || picked.has(edge.to)
    // Of the lines between two things of the path, the first is the path's: one line for each two of them.
    const pair = edge.from < edge.to ? `${edge.from}\n${edge.to}` : `${edge.to}\n${edge.from}`
    const onPath = said ? edge.path === true : marked !== null && marked.has(edge.from) && marked.has(edge.to) && !stepped.has(pair)
    if (onPath && !said) stepped.add(pair)
    // The words of a line drawn only on a choice wait for one of its ends to be chosen, or for the path; they are heard either way.
    const words = edge.label && (edge.labelShown !== 'chosen' || near || onPath) ? edge.label : undefined
    // The path takes the accent, but a tone of the line's own stays (a warning stays a warning): its thickness says the path.
    const own = edge.tone ?? 'default'
    const tone = onPath && own === 'default' ? 'accent' : own
    const style = edge.style ?? 'solid'
    // Its look (colour, width, dash, ends) comes from the module that also draws the key (`GraphLegend`): a line of the
    // chosen things is told from the others, the path's is thicker.
    const look = lineLook(style, tone, { near, path: onPath })
    // A `link` to a thing no further along (a sibling, a thing before it) arrives on the far side: the line goes round, not across the boxes.
    // Along the app's route only with the app's places (`routes`): a route of its layout would cross dagre's.
    const route = routes && edge.points && edge.points.length > 1 && !(loose !== null && (loose.has(edge.from) || loose.has(edge.to))) ? edge.points : null
    const back = !route && !child && (direction === 'right' ? to.x <= from.x : to.y <= from.y)
    const line: Edge = {
      id,
      source: edge.from,
      target: edge.to,
      ...(back ? { targetHandle: 'side' } : {}),
      type: route ? 'route' : 'smoothstep',
      ...(route ? { data: { points: route } } : {}),
      focusable: false,
      selectable: editable,
      // Its look is all in `style`; the one class is for graph.css to dim a line to a dimmed thing.
      className: !onPath && (said || (dimmed !== null && (dimmed.has(edge.from) || dimmed.has(edge.to)))) ? 'sigrid-graph-dim' : undefined,
      // One object for one look (`lineVars`): a line whose look a change of choice leaves as it was keeps its `style`.
      style: lineVars(look),
      // The arrowheads are drawn apart from the lines, so they take the colour of the line's tone by name.
      ...((edge.directed ?? !child) ? { markerEnd: { type: MarkerType.ArrowClosed, color: lineLook(style, tone).stroke, width: 16, height: 16, markerUnits: 'userSpaceOnUse' } } : {}),
      ...(words ? wordsOn(words) : {}),
      // What a `link` or a line with words says is in the description of its two things: the line is not read again.
      ...(!child || edge.label ? { domAttributes: { 'aria-hidden': true } } : {}),
    }
    lines.push(line)
    if (route) continue
    const key = `${edge.from}\n${edge.to}\n${back ? 'side' : ''}`
    const group = beside.get(key)
    if (group) group.push(line)
    else beside.set(key, [line])
  }
  // Side by side, about the middle of their sides: -10 and 10 for two lines, -16, 0 and 16 for three.
  for (const group of beside.values()) {
    if (group.length < 2) continue
    const gap = Math.min(APART, (2 * SPREAD) / (group.length - 1))
    group.forEach((line, at) => {
      line.type = 'apart'
      line.data = { offset: (at - (group.length - 1) / 2) * gap }
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
  /** Among the things chosen: the selection tint. */
  chosen: boolean
  /** The choice itself, the first of the things chosen: the one screen readers hear chosen, and the one with the plus. */
  primary: boolean
  /** Its numbers on the path the app marks. */
  steps: readonly number[] | undefined
  /** What screen readers hear after its name: that it is chosen with the choice (when it is one of several), the `link` lines it has. */
  about: string
  aboutId: string
  dim: boolean
  stop: boolean
  editable: boolean
  direction: 'right' | 'down'
  /** In the graph mode, whether the app opens things (`onOpen`): a thing with an `openLabel` then has a → and opens on a double press. */
  opens: boolean
  /** In the graph mode, the names of what the thing's lines lead to and of what the lines into it come from. */
  leadsTo: readonly string[]
  comesFrom: readonly string[]
  /** In the graph mode, a group the app opens in place (`open` of the node, with `onToggle`): it has the button that opens it, or closes it. */
  toggles: boolean
  /** An open group: how many things it holds, and the ids of their surfaces in the page, which screen readers hear inside it (`aria-owns`). */
  holds: number
  owns: string
  /** The id of its surface in the page, where a group may own it; otherwise empty. */
  domId: string
  /** The id of the text that says how a thing is moved from the keyboard (`movable`); otherwise empty. */
  keysId: string
  onToggle: (id: string) => void
  onAdd: (id: string) => void
  onOpen: (id: string) => void
  onFocus: (id: string) => void
  /** Opens or closes a group in place: asked of the app. */
  onGroup: (id: string) => void
  /** The thing was drawn (it came into the view, or is new): the canvas gives it the focus it was keeping for it. */
  onDrawn: (id: string) => void
}

const HANDLE = 'size-2! min-h-0! min-w-0! rounded-full! border-0! bg-ink-mute!'
/** The small buttons on a thing: the plus that hangs a new one, the arrow that opens and closes, the → that opens. */
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

/** What a thing shows: its picture, its icon or the dot of its colour, its name and the line under it, and «external» on an external one. */
function Face({ node, tinted, words }: { node: GraphNode; tinted: boolean; words: Words['graph'] }) {
  const mark = node.icon ? (
    <span aria-hidden="true" className="inline-flex shrink-0 text-ink-mute [&_svg]:size-4">
      <Icon name={node.icon} />
    </span>
  ) : node.color ? (
    <span {...markHueAttrs(node.color)} data-mark-dot="" aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--mark-dot)" />
  ) : null
  return (
    <>
      {/* The picture of the thing (a logo) is the toolkit's `Logo`, 16px and whole: the icon or the dot is in its box while it loads and when it fails. The name of the thing says what it is. */}
      {node.image ? (
        <Logo src={node.image} decorative>
          {mark}
        </Logo>
      ) : (
        mark
      )}
      {/* Beside «external» the name keeps 64px: in a narrow box the word is cut first. */}
      <span className={cn('flex flex-1 flex-col', node.external ? 'min-w-16' : 'min-w-0')}>
        <span className="truncate">{node.label}</span>
        {node.detail ? <span className={cn('truncate text-xs font-normal', tinted ? 'opacity-80' : 'text-ink-mute')}>{node.detail}</span> : null}
      </span>
      {/* Said in words, 12px in the muted ink (on the tint, as the line under the name is): never a dashed border (R4). Read in the thing's name. */}
      {node.external ? (
        <span aria-hidden="true" data-slot="graph-external" className={cn('min-w-0 truncate text-2xs font-normal', tinted ? 'opacity-80' : 'text-ink-mute')}>
          {words.external}
        </span>
      ) : null}
    </>
  )
}

/**
 * The numbers of the path, round as the dots of `Steps`, on the raised ground so they show on the tint in both schemes:
 * read in the name of the thing. One or two are shown; of more, the first and how many more («+3», `graph.moreSteps`),
 * so the name of the thing keeps its room. All of them are in the name screen readers hear.
 */
function StepDots({ steps, words }: { steps: readonly number[]; words: Words['graph'] }) {
  const folded = steps.length > 2
  return (
    <span aria-hidden="true" data-slot="graph-steps" className="flex shrink-0 gap-0.5">
      {(folded ? steps.slice(0, 1) : steps).map((step, index) => (
        <span key={index} className="inline-flex size-5 items-center justify-center rounded-full bg-raised text-xs font-medium text-accent tabular-nums">
          {step}
        </span>
      ))}
      {folded ? (
        <span data-slot="graph-steps-more" className="inline-flex h-5 items-center justify-center rounded-full bg-raised px-1.5 text-xs font-medium text-accent tabular-nums">
          {words.moreSteps(steps.length - 1)}
        </span>
      ) : null}
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
  const { node, direction, editable, steps, onDrawn } = data
  const has = data.children > 0
  const name = nameOf(node, steps, words)
  const tinted = data.chosen || steps !== undefined
  React.useEffect(() => onDrawn(node.id), [onDrawn, node.id])
  return (
    <div
      role="treeitem"
      data-slot="graph-node"
      data-node-id={node.id}
      data-thing={node.id}
      tabIndex={data.stop ? 0 : -1}
      aria-level={data.level}
      // One thing is the choice, also when the app marks several: the others say so in their description.
      aria-selected={data.primary}
      aria-expanded={has ? data.open : undefined}
      aria-label={has && !data.open ? words.closed(name, data.hidden) : name}
      aria-describedby={[data.about ? data.aboutId : '', data.keysId].filter(Boolean).join(' ') || undefined}
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
      <Face node={node} tinted={tinted} words={words} />
      {steps ? <StepDots steps={steps} words={words} /> : null}
      {data.about ? (
        <span id={data.aboutId} hidden>
          {data.about}
        </span>
      ) : null}
      {/* One clear action: the plus on the choice alone, not on each of the several chosen. */}
      {editable && data.primary ? (
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
          className={cn('nodrag nopan -me-1 inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-md px-1 text-ink-mute hover:bg-ink/6 hover:text-ink [&_svg]:size-3.5', TOUCH, FOCUS_RING)}
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
 * → that opens) lie over its end, beside that button and not inside it: what a button holds is read as its name, so a
 * button inside another would not be reached. The box around them (`data-thing`) is where the keys pressed on any of
 * them find their thing.
 */
const Point = React.memo(function Point({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const described = React.useId()
  const { node, direction, editable, steps, onDrawn } = data
  const tinted = data.chosen || steps !== undefined
  // One clear action: the plus on the choice alone, not on each of the several chosen.
  const add = editable && data.primary
  // Only a thing the app says it opens has a →, under the app's name for the action, and opens on a double press.
  const openLabel = data.opens && node.openLabel ? node.openLabel : undefined
  // A group the app opens in place has the arrow of every list that opens (a chevron), before the → that goes into it
  // (an arrow): one control for each action, and no two drawn alike.
  const toggles = data.toggles
  const ends = (add ? 1 : 0) + (toggles ? 1 : 0) + (openLabel ? 1 : 0)
  React.useEffect(() => onDrawn(node.id), [onDrawn, node.id])
  // How many the app keeps out of sight inside it: shown and said only above 0.
  const hides = finite(node.hiddenCount) && node.hiddenCount > 0 ? node.hiddenCount : 0
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
        id={data.domId || undefined}
        data-slot="graph-node"
        data-node-id={node.id}
        tabIndex={data.stop ? 0 : -1}
        // Its name (with its steps on the path, «external», how many it hides) and its second line, as the eye reads them.
        aria-label={node.detail ? `${name}, ${node.detail}` : name}
        // A group that opens in place is closed here: open, it is a frame.
        aria-expanded={toggles ? false : undefined}
        // The chosen thing is the one the app shows: a choice, not a toggle that is pressed. When the app marks several
        // (one of its things drawn in several places), the first is current and the others say in their description
        // that they are chosen with it: one choice is heard, as the user makes one.
        aria-current={data.primary ? 'true' : undefined}
        aria-describedby={[relations ? described : '', data.about ? data.aboutId : '', data.keysId].filter(Boolean).join(' ') || undefined}
        onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
        // A double press goes into the thing the app opens; on a group that only opens in place, it opens it.
        onDoubleClick={openLabel ? () => data.onOpen(node.id) : toggles ? () => data.onGroup(node.id) : undefined}
        className={cn(
          'flex size-full cursor-default items-center gap-2 rounded-md bg-raised ps-3 text-sm text-ink shadow-sm',
          // Room at the end for the buttons that lie over it, and more with a finger, where each is 44px.
          ends === 3 ? 'pe-26 pointer-coarse:pe-36' : ends === 2 ? 'pe-18 pointer-coarse:pe-25' : ends === 1 ? 'pe-10 pointer-coarse:pe-14' : 'pe-3',
          tinted && 'bg-selected text-selected-ink',
          data.chosen && 'font-semibold',
          FOCUS_RING,
        )}
      >
        <Face node={node} tinted={tinted} words={words} />
        {steps ? <StepDots steps={steps} words={words} /> : null}
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
          {toggles ? (
            <Tooltip label={words.open(node.label)}>
              <button
                type="button"
                // A Tab stop after the thing that has it, as its → is.
                tabIndex={data.stop ? 0 : -1}
                data-slot="graph-toggle"
                aria-label={words.open(node.label)}
                onClick={(event) => {
                  event.stopPropagation()
                  // The second click of a double press opens nothing more.
                  if (event.detail > 1) return
                  data.onGroup(node.id)
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onFocus={() => data.onFocus(node.id)}
                className={cn(ON_THING, TOUCH, tinted ? 'text-selected-ink' : 'text-ink-mute hover:text-ink', FOCUS_RING)}
              >
                <Icon name="chevron" />
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
                {/* An arrow, never the chevron: that one is the arrow of what opens in place (a group, beside it here). */}
                <Icon name="moveRight" />
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

/**
 * A group opened in place, in the graph mode: a frame as large as the app (or the canvas's layout) made it, a line
 * around it and a quiet fill, no shadow (R4), under the things and the lines. Its title is the thing's own face, the
 * button that chooses it as on any thing, with the count of what it holds; at its end the button that closes it, the
 * arrow of every list that opens, turned down. What it holds is drawn by React Flow beside it, not inside it, so the
 * frame is a group that owns those things for screen readers (`aria-owns`), named by its name and how many they are.
 */
const Frame = React.memo(function Frame({ data }: NodeProps<Node<Drawn>>) {
  const words = useWords().graph
  const described = React.useId()
  const { node, direction, editable, steps, onDrawn } = data
  const tinted = data.chosen || steps !== undefined
  const name = nameOf(node, steps, words)
  const relations = [data.leadsTo.length > 0 ? words.leadsTo(data.leadsTo) : '', data.comesFrom.length > 0 ? words.comesFrom(data.comesFrom) : ''].filter(Boolean).join(' · ')
  React.useEffect(() => onDrawn(node.id), [onDrawn, node.id])
  return (
    <div data-thing={node.id} data-slot="graph-group" role="group" aria-label={words.holds(name, data.holds)} aria-owns={data.owns || undefined} className="relative size-full rounded-md border border-line bg-ink/6">
      <Handle type="target" position={direction === 'right' ? Position.Left : Position.Top} isConnectable={editable} className={cn(HANDLE, !editable && 'opacity-0')} />
      <div
        role="button"
        id={data.domId || undefined}
        data-slot="graph-node"
        data-node-id={node.id}
        tabIndex={data.stop ? 0 : -1}
        aria-label={node.detail ? `${name}, ${node.detail}` : name}
        aria-expanded="true"
        aria-current={data.primary ? 'true' : undefined}
        aria-describedby={[relations ? described : '', data.about ? data.aboutId : '', data.keysId].filter(Boolean).join(' ') || undefined}
        onFocus={(event) => (event.target === event.currentTarget ? data.onFocus(node.id) : undefined)}
        className={cn(
          // The title: the first 44px of the frame (`HEAD`), which what it holds starts under.
          'pointer-events-auto absolute inset-x-0 top-0 flex h-11 cursor-default items-center gap-2 rounded-md ps-3 text-sm font-medium text-ink',
          data.toggles ? 'pe-10 pointer-coarse:pe-14' : 'pe-3',
          tinted && 'bg-selected text-selected-ink',
          data.chosen && 'font-semibold',
          data.dim && 'opacity-40',
          FOCUS_RING,
        )}
      >
        <Face node={node} tinted={tinted} words={words} />
        {steps ? <StepDots steps={steps} words={words} /> : null}
        <Count value={data.holds} />
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
      {data.toggles ? (
        <span className="pointer-events-auto absolute end-2 top-0 flex h-11 items-center">
          <Tooltip label={words.close(node.label)}>
            <button
              type="button"
              // The next Tab stop after the title that has it.
              tabIndex={data.stop ? 0 : -1}
              data-slot="graph-toggle"
              aria-label={words.close(node.label)}
              onClick={(event) => {
                event.stopPropagation()
                if (event.detail > 1) return
                data.onGroup(node.id)
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              onFocus={() => data.onFocus(node.id)}
              className={cn(ON_THING, TOUCH, tinted ? 'text-selected-ink' : 'text-ink-mute hover:text-ink', FOCUS_RING)}
            >
              {/* Down, as the arrow of an open list. */}
              <span aria-hidden="true" className="inline-flex rotate-90">
                <Icon name="chevron" />
              </span>
            </button>
          </Tooltip>
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

/**
 * A line beside the others between the same two things, when the app gave no route (`linesOf`): React Flow's own
 * smoothstep path (`getSmoothStepPath`), with its two ends moved `data.offset` px across the sides they leave and
 * reach and its bend moved as far, the inner line of a turn bending first, so the lines run side by side, never across
 * each other, and their words sit apart. A line that goes round to the far side of a thing (both ends on the same
 * side) has its ends moved opposite ways and goes further out the further out it is, so the lines nest. What React Flow
 * hands a line besides is drawn by its `BaseEdge`, as on the other lines. It reads nothing of React Flow's state.
 */
const Apart = React.memo(function Apart({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style, markerStart, markerEnd, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, interactionWidth }: EdgeProps<Edge<{ offset: number }, 'apart'>>) {
  const [path, labelX, labelY] = apartPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }, data?.offset ?? 0)
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      interactionWidth={interactionWidth}
    />
  )
})

/** Where a line leaves a thing and where it reaches the other, and the sides they are on. */
type Ends = { sourceX: number; sourceY: number; targetX: number; targetY: number; sourcePosition: Position; targetPosition: Position }

/** The path of a line beside the others (`Apart`), `offset` px across its sides from the middle, and where its words are: the middle of the path. */
function apartPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: Ends, offset: number): [path: string, labelX: number, labelY: number] {
  // The start and the end of a thing (`direction="right"`) are moved up or down, its head and its foot along.
  const across = sourcePosition === Position.Left || sourcePosition === Position.Right
  const round = sourcePosition === targetPosition
  const end = round ? -offset : offset
  const [x0, y0, x1, y1] = across ? [sourceX, sourceY + offset, targetX, targetY + end] : [sourceX + offset, sourceY, targetX + end, targetY]
  // Which way the line turns on its way: the line on the inside of the turn bends first.
  const turn = Math.sign(across ? y1 - y0 : x1 - x0)
  // The bend, kept between the straight pieces out of the two sides, so a line never goes back on itself in a narrow gap.
  const out = (position: Position) => (position === Position.Right || position === Position.Bottom ? STUB : -STUB)
  const [g0, g1] = across ? [x0 + out(sourcePosition), x1 + out(targetPosition)] : [y0 + out(sourcePosition), y1 + out(targetPosition)]
  const bend = Math.min(Math.max(g0, g1), Math.max(Math.min(g0, g1), (g0 + g1) / 2 - offset * turn))
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: x0,
    sourceY: y0,
    sourcePosition,
    targetX: x1,
    targetY: y1,
    targetPosition,
    ...(round ? { offset: STUB + SPREAD - offset * turn } : across ? { centerX: bend } : { centerY: bend }),
  })
  return [path, labelX, labelY]
}

/**
 * The room the words of a line take on the canvas, in the graph's own px: 12px text (about 6px a letter), 4px of their
 * ground at each side and 2px above and below, as `wordsOn` asks of React Flow. It is reckoned, not measured: the
 * canvas places the words before anything is drawn, and a line 20px from another (`APART`) keeps its words clear of
 * the other's.
 */
// shortcut: 6px a letter is the mean of lower-case words in the interface face; capitals, digits and wide scripts are wider, so such words may be kept on a line and reach a thing: measure the text (a canvas's `measureText`) when an app draws those.
const WORD = { letter: 6, pad: 4, lead: 2, height: 20 }
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** The box the words of a line take, their middle at `at`. */
export function wordBox(label: string, at: { x: number; y: number }): Box {
  const width = label.length * WORD.letter + 2 * WORD.pad
  return { x: at.x - width / 2, y: at.y - WORD.height / 2, width, height: WORD.height }
}

/** Where a line's words are drawn: the middle of its path, as React Flow reckons it from the sides of its two things; of a route, the middle of its longest piece. */
function wordPoint(line: Edge, boxes: ReadonlyMap<string, Box>, direction: 'right' | 'down'): { x: number; y: number } | undefined {
  if (line.type === 'route') return middleOf((line.data as { points?: Points } | undefined)?.points ?? [])
  const from = boxes.get(line.source)
  const to = boxes.get(line.target)
  if (!from || !to) return undefined
  // The handles: the middle of the side a line leaves and of the side it reaches (`Thing`, `Point`, `Frame`), the far
  // side for a line that goes round (`SideHandle`).
  const round = line.targetHandle === 'side'
  const ends: Ends =
    direction === 'right'
      ? { sourceX: from.x + from.width, sourceY: from.y + from.height / 2, sourcePosition: Position.Right, targetX: round ? to.x + to.width : to.x, targetY: to.y + to.height / 2, targetPosition: round ? Position.Right : Position.Left }
      : { sourceX: from.x + from.width / 2, sourceY: from.y + from.height, sourcePosition: Position.Bottom, targetX: to.x + to.width / 2, targetY: round ? to.y + to.height : to.y, targetPosition: round ? Position.Bottom : Position.Top }
  const [, x, y] = line.type === 'apart' ? apartPath(ends, (line.data as { offset?: number } | undefined)?.offset ?? 0) : getSmoothStepPath(ends)
  return { x, y }
}

/**
 * Which lines have room for their words where the words are drawn, and which have not. The words of a line stay on it
 * (`on`: the id of the line and the box they take) when their letters lie over no thing (the ground around them may
 * touch one, as two short words side by side between two ranks do) and their box over no words already kept, the lines
 * read in their order (the app gives the path's first); of an open group only the title counts, its ground is free. The others (`off`, in the same order) are not drawn on the canvas: it lists them beside it (`LineWords`), so
 * no words are ever under a thing or on other words. `boxes` are the things in sight, on the canvas. Nothing is moved
 * to make room: the places are the layout's, the same with a thing chosen or not.
 */
export function wordsOf(lines: readonly Edge[], boxes: ReadonlyMap<string, Box>, direction: 'right' | 'down', frames: ReadonlySet<string> = NO_IDS): { on: Map<string, Box>; off: string[] } {
  const on = new Map<string, Box>()
  const off: string[] = []
  let solid: Box[] | null = null
  for (const line of lines) {
    if (typeof line.label !== 'string' || line.label === '') continue
    solid ??= [...boxes].map(([id, box]) => (frames.has(id) ? { ...box, height: Math.min(box.height, HEAD) } : box))
    const things = solid
    const at = wordPoint(line, boxes, direction)
    const box = at ? wordBox(line.label, at) : undefined
    // The letters alone, without the ground around them.
    const letters = box ? { x: box.x + WORD.pad, y: box.y + WORD.lead, width: box.width - 2 * WORD.pad, height: box.height - 2 * WORD.lead } : undefined
    if (box !== undefined && letters !== undefined && !things.some((thing) => meets(letters, thing)) && ![...on.values()].some((kept) => meets(box, kept))) on.set(line.id, box)
    else off.push(line.id)
  }
  return { on, off }
}

/** A line without its words, as the canvas hands it to React Flow when they have no room on it: the same one for the same line. */
const bared = new WeakMap<Edge, Edge>()
function bare(line: Edge): Edge {
  let without = bared.get(line)
  if (!without) {
    const { label: _label, labelShowBg: _bg, labelBgPadding: _pad, labelBgBorderRadius: _radius, ...rest } = line
    without = rest
    bared.set(line, without)
  }
  return without
}

/** A row of the list of words: the line's id, its look on the canvas, the names of its two things, whether it goes both ways, its words. */
type WordRow = { id: string; look: React.CSSProperties | undefined; from: string; to: string; both: boolean; words: string }

/**
 * The words that have no room on their lines, listed under the view's buttons: for each line a sample of it as it is
 * drawn (its dash, its tone, thicker on the path), the two things it joins and its words. A raised surface (R4), 256px
 * wide and at most 144px tall (it scrolls with the wheel); the eye's alone, since each thing already says its lines in
 * its description, as for the words drawn on a line.
 */
function LineWords({ rows }: { rows: readonly WordRow[] }) {
  return (
    <ul data-slot="graph-words" aria-hidden="true" className="nowheel nodrag nopan pointer-events-auto flex max-h-36 w-64 max-w-full flex-col gap-1 overflow-y-auto rounded-md bg-raised p-2 text-2xs text-ink-soft shadow-sm">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start gap-2">
          {/* The sample of the key (`GraphLegend`), in the look the line has on the canvas. */}
          <svg viewBox="0 0 24 8" className="mt-1 h-2 w-6 shrink-0">
            <line x1="2" y1="4" x2="22" y2="4" className="sigrid-graph-sample" style={row.look} />
          </svg>
          <span className="min-w-0 break-words">
            <span className="font-medium text-ink">
              {row.from} {row.both ? '–' : '→'} {row.to}
            </span>{' '}
            {row.words}
          </span>
        </li>
      ))}
    </ul>
  )
}

const NODE_TYPES = { thing: Thing, point: Point, frame: Frame }
const EDGE_TYPES = { route: Route, apart: Apart }
/** Room around what is fitted, and at the head for the field and the buttons. */
const PAD = { top: 64, right: 24, bottom: 24, left: 24 }
/**
 * The box with `fill`: the whole height of a region that is a block (`h-full`), what the other parts leave of one that
 * is a pile (`flex-1`), and the whole width of either (nothing in the box has a width of its own, so a pile that does
 * not stretch its parts would give it none). Its floor is what the field and the small map need, one over the other at
 * the start: the 15px the library keeps at the head, the field (`--control-md`: 36px, 44px with a finger, the density's),
 * 8px between the two, the map's 150px, and 15px at the foot. The map has no better corner: the buttons of the view and
 * the library's name have the other two. It is one floor, with the field and the map or without.
 */
const FILL = 'h-full min-h-[calc(var(--control-md)_+_188px)] w-full flex-1'
/** Nothing closed: the graph mode's, the same list at every draw. */
const NOTHING: readonly string[] = []
/** No names: the relations of a thing in the tree mode, which does not say them. */
const NO_NAMES: readonly string[] = []
let made = 0
const freshId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `node-${Date.now()}-${++made}`)

function Canvas({ nodes, edges, model = 'tree', direction = 'right', layoutKey, selected = null, onSelect, onOpen, onToggle, movable = false, onMove, animated, steps, collapsed, defaultCollapsed, onCollapsedChange, minFitZoom = READABLE, search = false, minimap = false, editable = false, onChange, ref, fill = false, className, ...props }: GraphCanvasProps) {
  const words = useWords().graph
  const flow = useReactFlow()
  // The library's helpers, as they are now: the view's own helpers below are made once.
  const flowNow = React.useRef(flow)
  flowNow.current = flow
  const uid = React.useId()
  const box = React.useRef<HTMLDivElement>(null)
  const tree = model === 'tree'
  const opens = !tree && onOpen !== undefined
  // A group opens in place only where the app can be asked to.
  const groups = !tree && onToggle !== undefined
  // The time of what moves after a gesture: none unless the app turned motion on and the system allows it.
  // At the app's pace (`applyMotionFeel`): the stylesheet's glide reads the same time from its variable.
  const glide = useMotionAllowed(animated) ? motionMs(GLIDE_MS) : 0
  const graph = React.useMemo<Graph>(() => ({ nodes, edges }), [nodes, edges])
  // Each thing by its id, once for the graph; the first of two with the same id, as the layout reads them.
  const byId = React.useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const node of nodes) if (!map.has(node.id)) map.set(node.id, node)
    return map
  }, [nodes])
  // The groups opened in place, in the graph mode; null when there is none.
  const nest = React.useMemo(() => (tree ? null : nestOf(byId)), [tree, byId])
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
  // The place of each thing from the corner of the group that holds it (from the canvas's, for the others), and the
  // sizes the canvas gave the open groups it laid out itself.
  const layout = React.useMemo<{ rel: Map<string, { x: number; y: number }>; sizes: ReadonlyMap<string, Size> | null }>(
    () => (nest && !given ? layoutNested(graph, sight.order, direction, nest) : { rel: placesIn(graph, sight.order, direction, given), sizes: null }),
    [graph, sight, direction, given, nest],
  )
  // Where the person put the things they moved, kept for the layout they were moved on: another `layoutKey` forgets them.
  const [movedOn, setMovedOn] = React.useState<{ key: string | undefined; at: ReadonlyMap<string, { x: number; y: number }> }>({ key: layoutKey, at: NOT_MOVED })
  // Forgotten for good: going back to a layout does not bring back what was moved on it before.
  if (movedOn.key !== layoutKey) setMovedOn({ key: layoutKey, at: NOT_MOVED })
  const moved = movable && movedOn.key === layoutKey ? movedOn.at : NOT_MOVED
  // The things being dragged now. The ref is the truth (it is read where a draw has not happened yet); the state draws.
  const [dragged, setDragged] = React.useState<ReadonlySet<string>>(NO_IDS)
  const draggedNow = React.useRef<ReadonlySet<string>>(NO_IDS)
  const rel = React.useMemo(() => {
    if (moved.size === 0) return layout.rel
    const next = new Map(layout.rel)
    for (const [id, at] of moved) if (next.has(id)) next.set(id, at)
    return next
  }, [layout, moved])
  // The places on the canvas: what the view, the lines and the focus read.
  const places = React.useMemo(() => (nest && nest.parent.size > 0 ? absolute(rel, nest.parent) : rel), [rel, nest])
  const sizeOf = React.useCallback((id: string): Size => layout.sizes?.get(id) ?? sizeOfNode(byId.get(id)), [layout, byId])
  // What was moved or is being dragged, and what such a group holds: a route the app gave no longer reaches them, so
  // their lines go from side to side, and follow a thing while it is dragged.
  const loose = React.useMemo(() => {
    if (moved.size === 0 && dragged.size === 0) return null
    const set = new Set<string>()
    const take = (id: string) => {
      if (set.has(id)) return
      set.add(id)
      for (const inside of nest?.held.get(id) ?? []) take(inside)
    }
    for (const id of moved.keys()) take(id)
    for (const id of dragged) take(id)
    return set
  }, [moved, dragged, nest])
  const [query, setQuery] = React.useState('')
  const word = query.trim().toLowerCase()
  const found = React.useMemo(() => (word ? new Set(nodes.filter((node) => `${node.label} ${node.detail ?? ''}`.toLowerCase().includes(word)).map((node) => node.id)) : null), [nodes, word])
  const [focused, setFocused] = React.useState<string | null>(null)
  // The thing that has the keyboard focus now (its surface or a button on it), or null once the focus is out of the
  // things: the words of its lines drawn only on a choice show while it has it. `focused` is where the Tab stop stays.
  const [held, setHeld] = React.useState<string | null>(null)
  // The chosen things in sight, one or the several the app marks, and the first of them in the order of the things:
  // the choice itself, which screen readers hear chosen and which has the plus; it holds the Tab stop until the user
  // moves it, and stays in sight when the box changes size. Read by their ids, so an app that hands a new list of the
  // same ids at every draw does not have every thing drawn again.
  const selectedIds = idSet(selected)
  const selectedKey = [...selectedIds].join('\n')
  const choice = React.useMemo(() => {
    const inSight = sight.order.filter((id) => selectedIds.has(id))
    return { ids: new Set(inSight), first: inSight[0] ?? null }
    // `selected` is read through its key: the same ids are the same choice.
  }, [selectedKey, sight])
  const chosen = choice.ids
  const stop = focused != null && sight.level.has(focused) ? focused : (choice.first ?? sight.order[0] ?? null)
  // Only what is in the view is drawn, so a stop out of it would be no Tab stop at all: after the view moved, a thing
  // in the view stands in for it (`keepStop`), by its tabindex alone. The stop itself is as ever: it follows the
  // focus, then the choice; the stand-in is for that stop only, and nothing else reads it.
  const [stoodIn, setStoodIn] = React.useState<{ stop: string; id: string } | null>(null)
  const tabStop = stoodIn !== null && stoodIn.stop === stop && sight.level.has(stoodIn.id) ? stoodIn.id : stop
  // What is joined to the chosen things, one line away on either side, and what is on the path or joined to it.
  // What a chosen open group holds is near it too, at every depth: choosing a frame never dims its own things.
  const near = React.useMemo(() => {
    if (chosen.size === 0) return null
    const set = new Set([...chosen].flatMap((id) => [id, ...(joined.get(id) ?? [])]))
    const take = (id: string) => {
      for (const inside of nest?.held.get(id) ?? []) {
        set.add(inside)
        take(inside)
      }
    }
    for (const id of chosen) take(id)
    return set
  }, [chosen, joined, nest])
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

  // The thing to give the focus to once it is drawn where it now is: after a search, an opening, an addition, an arrow
  // towards a thing out of the view.
  const wanted = React.useRef<string | null>(null)
  // Until when the view is being fitted: a thing that takes the focus meanwhile does not move the view (the fit wins,
  // and the thing is measured where it was, not where it goes).
  const fitUntil = React.useRef(0)
  // The wanted thing is the Tab stop, wanted because the thing that had the focus left the graph: that thing's id, or
  // empty when the focus had already fallen to the page. Null for any other wanted thing.
  const orphan = React.useRef<string | null>(null)
  /** The view goes to a thing: its middle (the title's, for an open group) in the middle of the box, at the same scale. */
  const panTo = (id: string) => {
    const at = places.get(id)
    if (!at) return
    const size = sizeOf(id)
    void flow.setCenter(at.x + size.width / 2, at.y + (nest?.frames.has(id) ? HEAD : size.height) / 2, { zoom: flow.getZoom(), duration: glide })
  }
  const focus = (id: string, bring = true) => {
    const el = box.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)
    const at = places.get(id)
    if (!el || !at) return false
    el.focus({ preventScroll: true })
    if (!bring || Date.now() < fitUntil.current) return true
    // Brought into the view only if it is out of it: a view that moved at every step would lose the user.
    const frame = box.current!.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    if (rect.left < frame.left || rect.right > frame.right || rect.top < frame.top || rect.bottom > frame.bottom) panTo(id)
    return true
  }
  /**
   * The focus goes to a thing, also one React Flow has not drawn because it is out of the view: the view goes to it,
   * and the thing takes the focus as it is drawn (`handlers.drawn`).
   */
  const reach = (id: string) => {
    if (focus(id) || !places.has(id)) return
    wanted.current = id
    panTo(id)
  }
  React.useEffect(() => {
    // The thing that had the focus left the graph: the focus goes to the Tab stop, not to the page.
    // Only a focus that is still on that thing (it is drawn until React Flow is handed the graph without it) or that
    // is nobody's (the thing was out of the view, so not drawn, and the focus fell to the page). A focus the person
    // put elsewhere meanwhile (a field of the app that filters the graph) is theirs: nothing takes it, nothing moves.
    if (held !== null && !sight.level.has(held)) {
      const active = document.activeElement
      const onIt = active !== null && box.current !== null && box.current.contains(active) && active.closest<HTMLElement>('[data-thing]')?.dataset.thing === held
      setHeld(null)
      if (wanted.current === null && tabStop !== null && (onIt || focusIsFree())) {
        wanted.current = tabStop
        orphan.current = onIt ? held : ''
      }
    }
    const id = wanted.current
    if (id === null || !sight.level.has(id)) return
    if (orphan.current !== null) {
      // Taken for a thing that left: by now the focus may be someone's.
      const active = document.activeElement
      const still = focusIsFree() || (active !== null && active.closest<HTMLElement>('[data-thing]')?.dataset.thing === orphan.current)
      orphan.current = null
      wanted.current = null
      // The view is not moved for it.
      if (still) focus(id, false)
      return
    }
    if (focus(id)) wanted.current = null
  })

  const latest = React.useRef({ graph, closed, sight, places, given, below, above, path, size, minFitZoom, direction, byId, chosen: choice.first, onSelect, onOpen, onToggle, onChange, setClosed, focus, editable, tree, sizeOf, glide, stop, held })
  latest.current = { graph, closed, sight, places, given, below, above, path, size, minFitZoom, direction, byId, chosen: choice.first, onSelect, onOpen, onToggle, onChange, setClosed, focus, editable, tree, sizeOf, glide, stop, held }
  // When a gesture that changes the places was made (a group opened or closed, the reset): the next change of places
  // is its answer and, with motion, glides. And the group whose button was pressed: it is drawn again as another part
  // (a thing, a frame), and takes the focus its button had.
  const armed = React.useRef(0)
  const reborn = React.useRef<{ id: string; at: number } | null>(null)
  // When the person last pressed or typed in the canvas: a new layout of the app's that follows at once is its answer.
  const touched = React.useRef(0)
  // Whether the change of places being drawn glides: the fit of a new layout then takes the same time.
  const glides = React.useRef(false)

  // What the view was last brought to, fitted again when the box changes size: the path (the first view), the whole
  // graph (the button, `fit`), or some things (`focus`). And the view that fit gave: while it is still that one, nobody
  // has moved it.
  const target = React.useRef<{ ids: readonly string[] | 'path' | 'all'; padding: number }>({ ids: 'path', padding: PAD.right })
  const brought = React.useRef<{ x: number; y: number; zoom: number } | null>(null)
  const view = React.useMemo(() => {
    /**
     * Fits the view onto the target. With `opening`, on the layout it will have once what hides the things is opened
     * (the first view, `focus`); otherwise on the layout as it is. Returns what is then closed.
     */
    const apply = (opening: boolean, keep: string | null = null, duration = 0) => {
      const now = latest.current
      const { ids: aim, padding } = target.current
      const ids = aim === 'all' ? [] : aim === 'path' ? now.path : aim
      let at = now.places
      const next = opening && ids.length > 0 ? openedFor(now.graph, now.closed, ids) : now.closed
      if (next !== now.closed) at = placesIn(now.graph, visibleGraph(now.graph, next).order, now.direction, now.given)
      const boxOf = (id: string) => ({ ...at.get(id)!, ...now.sizeOf(id) })
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
      brought.current = fitted
      if (duration > 0) fitUntil.current = Date.now() + duration + 40
      void flowNow.current.setViewport(fitted, { duration })
      return next
    }
    /** The view is not the one it was last brought to: the user moved it (a drag, the wheel, the buttons, a key), or the app (`zoomTo`). */
    const moved = () => {
      const from = brought.current
      const now = flowNow.current.getViewport()
      return from !== null && (Math.abs(now.x - from.x) > 0.5 || Math.abs(now.y - from.y) > 0.5 || Math.abs(now.zoom - from.zoom) > 0.001)
    }
    /** Keeps the view in a box that was of another size: panned only if the chosen thing was whole in that one and is not in this one, by what brings it back. */
    const hold = (was: { width: number; height: number }) => {
      const now = latest.current
      const at = now.chosen === null ? undefined : now.places.get(now.chosen)
      if (now.chosen === null || !at) return
      const own = now.sizeOf(now.chosen)
      const { x, y, zoom } = flowNow.current.getViewport()
      const left = x + at.x * zoom
      const top = y + at.y * zoom
      const right = left + own.width * zoom
      const bottom = top + own.height * zoom
      const inside = (room: { width: number; height: number }) => left >= 0 && top >= 0 && right <= room.width && bottom <= room.height
      if (!inside(was) || inside(now.size)) return
      // It was whole, so only the end or the foot of the box, which came nearer, cuts it.
      const overX = right > now.size.width ? right + PAD.right - now.size.width : 0
      const overY = bottom > now.size.height ? bottom + PAD.bottom - now.size.height : 0
      void flowNow.current.setViewport({ x: x - overX, y: y - overY, zoom }, { duration: 0 })
    }
    return {
      apply,
      moved,
      hold,
      handle: {
        focus: (ids, options) => {
          target.current = { ids: [...ids], padding: options?.padding ?? PAD.right }
          const now = latest.current
          const next = apply(true, null, now.glide)
          if (next !== now.closed) now.setClosed(next)
        },
        fit: () => {
          target.current = { ids: 'all', padding: PAD.right }
          apply(false, null, latest.current.glide)
        },
        zoomTo: (scale) => void flowNow.current.zoomTo(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale)), { duration: latest.current.glide }),
      } satisfies GraphCanvasHandle,
    }
  }, [])
  React.useImperativeHandle(ref, () => view.handle, [view])
  // The first view, and the view again at every change of size, once the library's pan and zoom exist. Until the
  // first one the canvas is not shown, so no thing is ever painted cut by its edge.
  const [shown, setShown] = React.useState(false)
  const empty = sight.order.length === 0
  // The size of the box at the last view; null before the first.
  const seenIn = React.useRef<typeof size | null>(null)
  React.useEffect(() => {
    if (size.width === 0 || size.height === 0 || !flow.viewportInitialized || empty) return
    const was = seenIn.current
    seenIn.current = size
    // At a change of size, over a layout of the app's (`layoutKey`), a view that was moved stays; and so does any view
    // while a thing is chosen: an inspector that opens on a first press must move nothing under the second.
    if (was !== null && was !== size && layoutKey !== undefined && (latest.current.chosen !== null || view.moved())) {
      view.hold(was)
      return
    }
    // At the first view on the path; after it, at a change of size, with the chosen thing kept in sight.
    view.apply(was === null, was === null ? null : latest.current.chosen)
    setShown(true)
  }, [size, flow.viewportInitialized, empty, view])

  // After a gesture that changes the places, with motion, the things glide to them: the box is marked for the time of
  // the glide, and graph.css moves the things and hides the lines while it is (they are drawn again at the end, where
  // the things then are). The mark is set before React Flow is handed the new places. A gesture is the canvas's own (a
  // group opened or closed, the reset), whose new places may come late (a layout in a worker), or a press or a key in
  // the canvas that a new `layoutKey` follows within a second. Never at the first paint; new places or a new layout
  // nobody asked for here (the app's data) jump.
  const seenPlaces = React.useRef(places)
  const seenKey = React.useRef(layoutKey)
  const gliding = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const endGlide = () => {
    clearTimeout(gliding.current)
    const el = box.current
    if (!el) return
    el.removeAttribute('data-gliding')
    el.querySelectorAll('[data-arriving]').forEach((it) => it.removeAttribute('data-arriving'))
  }
  React.useLayoutEffect(() => {
    // New places are places that differ: the same ones in a new object (a draw of the app's) change nothing, and do
    // not spend the gesture that waits for its answer.
    const changed = !samePlaces(seenPlaces.current, places)
    const rekeyed = seenKey.current !== layoutKey
    seenPlaces.current = places
    seenKey.current = layoutKey
    if (!changed && !rekeyed) return
    const asked = Date.now() - armed.current < ARMED_MS || (rekeyed && Date.now() - touched.current < ARMED_MS)
    glides.current = asked && glide > 0 && shown
    if (!changed) return
    armed.current = 0
    const el = box.current
    if (!el || !glides.current) return
    el.setAttribute('data-gliding', '')
    clearTimeout(gliding.current)
    gliding.current = setTimeout(endGlide, glide + 40)
  }, [places, layoutKey, glide, shown])
  React.useEffect(() => () => clearTimeout(gliding.current), [])

  const handlers = React.useMemo(() => {
    const toggle = (id: string) => {
      const now = latest.current
      now.setClosed(now.closed.includes(id) ? now.closed.filter((it) => it !== id) : [...now.closed, id])
      wanted.current = id
      armed.current = Date.now()
    }
    /** A group opens or closes in place: asked of the app, which passes the thing with the other `open`. */
    const group = (id: string) => {
      armed.current = Date.now()
      reborn.current = { id, at: Date.now() }
      latest.current.onToggle?.(id)
    }
    /** A thing was drawn: it takes the focus kept for it (it was out of the view, or is a group just opened or closed). */
    const drawn = (id: string) => {
      // A thing drawn while the others glide (what a group just opened holds, its frame) is shown with the lines, at
      // the end: not before the frame it belongs to is there.
      const el = box.current
      if (el?.hasAttribute('data-gliding')) el.querySelector(`.react-flow__node[data-id="${CSS.escape(id)}"]`)?.setAttribute('data-arriving', '')
      const again = reborn.current !== null && reborn.current.id === id && Date.now() - reborn.current.at < 5 * ARMED_MS
      if (wanted.current !== id && !again) return
      if (wanted.current !== id) {
        // A group drawn again takes the focus only if nothing else took it meanwhile.
        reborn.current = null
        const active = document.activeElement
        if (active !== null && active !== document.body && active.isConnected) return
      }
      // A group drawn again is where it was pressed: the view is not moved for it.
      if (latest.current.focus(id, wanted.current === id) && wanted.current === id) wanted.current = null
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
    return { toggle, add, remove, group, drawn, open: (id: string) => latest.current.onOpen?.(id), focus: (id: string) => setFocused(id) }
  }, [words.newNode])

  // What screen readers hear of each thing's `link` lines: their words, which way, the thing at the other end.
  const about = React.useMemo(() => {
    const said = new Map<string, string[]>()
    const say = (id: string, text: string) => said.set(id, [...(said.get(id) ?? []), text])
    // The exact copies of an edge without an `id` are one line: said once.
    const copies = new Set<string>()
    for (const edge of edges) {
      if ((isChild(edge) && !edge.label) || edge.from === edge.to || !byId.has(edge.from) || !byId.has(edge.to)) continue
      const copy = copyOf(edge)
      if (copy !== null) {
        if (copies.has(copy)) continue
        copies.add(copy)
      }
      const both = edge.directed === false
      say(edge.from, words.line(byId.get(edge.to)!.label, both ? 'with' : 'to', edge.label))
      say(edge.to, words.line(byId.get(edge.from)!.label, both ? 'with' : 'from', edge.label))
    }
    return said
  }, [edges, byId, words])

  /**
   * The keys of the things, read at the box; true when one was used. The thing is the one the key was pressed on or,
   * in the graph mode, the one whose button (its →, its plus) has the focus: from there the arrows, Home and End move
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
      // An open group is entered the way the lines go, before any line of its own, and left the way they come from a
      // thing in it that no line leads to.
      const right = direction === 'right'
      if (event.key === (right ? 'ArrowRight' : 'ArrowDown')) to = nest?.held.get(id)?.[0] ?? below.get(id)?.[0]
      else if (event.key === (right ? 'ArrowLeft' : 'ArrowUp')) to = above.get(id)?.[0] ?? nest?.parent.get(id)
      else if (event.key === (right ? 'ArrowDown' : 'ArrowRight')) to = order[at + 1]
      else if (event.key === (right ? 'ArrowUp' : 'ArrowLeft')) to = order[at - 1]
      else return false
    }
    if (to !== undefined) reach(to)
    return true
  }

  /** A thing is put at a place (from the corner of its group, when it is in one): kept here, and told to the app. */
  const put = (id: string, to: { x: number; y: number }) => {
    setMovedOn((now) => ({ key: layoutKey, at: new Map(now.key === layoutKey ? now.at : NOT_MOVED).set(id, to) }))
    onMove?.(id, to)
  }
  // What screen readers hear when a thing was moved with the keys.
  const [said, setSaid] = React.useState('')
  /** Alt and an arrow: the thing goes a step that way, and stays in the group that holds it, under its title. */
  const nudge = (id: string, from: { x: number; y: number }, [dx, dy]: readonly [number, number]) => {
    let to = { x: from.x + dx * STEP, y: from.y + dy * STEP }
    const up = nest?.parent.get(id)
    if (up !== undefined) {
      const room = sizeOf(up)
      const own = sizeOf(id)
      to = { x: Math.max(0, Math.min(room.width - own.width, to.x)), y: Math.max(HEAD, Math.min(room.height - own.height, to.y)) }
    }
    // The view follows a thing that would leave it: it stays drawn, with the focus it has.
    const at = places.get(id)
    if (at && size.width > 0 && size.height > 0) {
      const view = flow.getViewport()
      const kept = viewKeeping(view, { x: at.x + to.x - from.x, y: at.y + to.y - from.y, ...sizeOf(id) }, size, STEP / 2)
      if (kept !== view) void flow.setViewport(kept, { duration: 0 })
    }
    put(id, to)
    setSaid(words.moved(byId.get(id)?.label ?? id, to.x, to.y))
  }
  const viewRow = React.useRef<HTMLDivElement>(null)
  const reset = () => {
    // The button goes with what was moved: the focus it had goes to the next button of the row, not to the page.
    const row = viewRow.current
    if (row && row.contains(document.activeElement)) Array.from(row.querySelectorAll('button')).find((it) => it.getAttribute('aria-label') !== words.resetLayout)?.focus()
    armed.current = Date.now()
    setMovedOn({ key: layoutKey, at: NOT_MOVED })
    setSaid('')
  }
  // While a thing is dragged its place is React Flow's: what is handed over meanwhile (a choice, new data) keeps it
  // there (below). A drag that ends without React Flow saying so (a second finger, a cancelled pointer, the window
  // losing the focus, the thing leaving the graph) is ended here, after React Flow's own handlers have run.
  const startDrag = (ids: readonly string[]) => {
    draggedNow.current = new Set(ids)
    setDragged(draggedNow.current)
    endGlide()
  }
  const endDrag = () => {
    if (draggedNow.current.size === 0) return
    draggedNow.current = NO_IDS
    setDragged(NO_IDS)
  }
  React.useEffect(() => {
    if (dragged.size === 0) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(endDrag, 0)
    }
    const fingers = (event: TouchEvent) => {
      if (event.touches.length > 1) later()
    }
    // The names of the events as keys, not as words in quotes: the last one is the window losing the focus, and the
    // design check reads every quoted word as a class.
    const ends = Object.keys({ pointerup: 0, pointercancel: 0, touchend: 0, touchcancel: 0, blur: 0 })
    for (const name of ends) window.addEventListener(name, later)
    window.addEventListener('touchstart', fingers)
    return () => {
      clearTimeout(timer)
      for (const name of ends) window.removeEventListener(name, later)
      window.removeEventListener('touchstart', fingers)
    }
  }, [dragged])
  React.useEffect(() => {
    for (const id of draggedNow.current) if (!sight.level.has(id)) return endDrag()
  }, [sight])
  /**
   * After the view moved: if the thing that holds the Tab stop is out of the view (and so not drawn), the first thing
   * in the view stands in for it, by its tabindex alone. Nothing else changes: not the focus, not the choice, not the
   * view, not what Delete takes away. Not while a thing is dragged (the view moves with it, and its place is not known here yet).
   */
  const keepStop = () => {
    const now = latest.current
    if (draggedNow.current.size > 0 || now.stop === null || now.size.width === 0 || now.size.height === 0) return
    const stop = now.stop
    const boxOf = (id: string) => {
      const at = now.places.get(id)
      return at ? { ...at, ...now.sizeOf(id) } : undefined
    }
    const id = standInFor(stop, now.sight.order, boxOf, flowNow.current.getViewport(), now.size)
    setStoodIn((was) => (id === null ? null : was !== null && was.stop === stop && was.id === id ? was : { stop, id }))
  }
  // A place being told to the app, until the canvas has drawn it: the same place is told once.
  const told = React.useRef(new Map<string, { x: number; y: number }>())
  /** A thing was let go at a place: kept and told if it is not where the canvas has it. */
  const settle = (id: string, at: { x: number; y: number }) => {
    // A thing that left the graph while it was dragged is nowhere: nothing is kept or told for it.
    if (!rel.has(id)) return
    const to = { x: Math.round(at.x), y: Math.round(at.y) }
    const from = told.current.get(id) ?? rel.get(id)
    if (from && Math.abs(from.x - to.x) < 1 && Math.abs(from.y - to.y) < 1) return
    told.current.set(id, to)
    put(id, to)
  }
  React.useEffect(() => told.current.clear(), [rel])
  // The things handed to React Flow before, by their id: one that is the same is handed again as it was.
  const handedBefore = React.useRef(new Map<string, Node<Drawn>>())

  // Every thing as it is drawn but for the Tab stop, which moves at every arrow: it is set on its own thing below, so
  // the others keep the same data, and React Flow does not draw them again.
  const primary = choice.first
  const still = React.useMemo<Node<Drawn>[]>(() => {
    // With open groups, each thing has a name in the page, so a group can say which it holds.
    const nameIn = nest ? new Map(sight.order.map((id, index) => [id, `${uid}-thing-${index}`])) : null
    const all = sight.order.flatMap((id, index): Node<Drawn>[] => {
      const node = byId.get(id)
      const at = places.get(id)
      if (!node || !at) return []
      const numbers = marked?.get(id)
      const related = relations.get(id)
      // One of several chosen, not the choice itself: it says it is chosen with it, before its lines.
      const too = primary !== null && id !== primary && chosen.has(id) ? words.chosenToo(byId.get(primary)?.label ?? primary) : ''
      // An open group is a frame; a thing in one is placed from its corner and belongs to it (React Flow's `parentId`).
      const frame = nest?.frames.has(id) ?? false
      const up = nest?.parent.get(id)
      const inside = frame ? (nest?.held.get(id) ?? NOTHING) : NOTHING
      const within = up === undefined ? '' : words.inGroup(byId.get(up)?.label ?? up)
      const size = sizeOf(id)
      const room = up === undefined ? undefined : sizeOf(up)
      return [
        {
          id,
          type: tree ? 'thing' : frame ? 'frame' : 'point',
          position: up === undefined ? at : (rel.get(id) ?? at),
          width: size.width,
          height: size.height,
          ...(up === undefined ? {} : { parentId: up }),
          // Dragged, a thing stays in the group that holds it, under its title.
          ...(room && movable ? { extent: [[0, HEAD], [Math.max(room.width, size.width), Math.max(room.height, HEAD + size.height)]] as [[number, number], [number, number]] } : {}),
          // Under the things and the lines.
          ...(frame ? { zIndex: -1, style: FRAME_STYLE } : {}),
          draggable: movable,
          selectable: false,
          focusable: false,
          data: { node, level: sight.level.get(id) ?? 1, children: (below.get(id) ?? []).length, hidden: sight.hidden.get(id) ?? 0, open: !closed.includes(id), chosen: chosen.has(id), primary: id === primary, steps: numbers && numbers.length > 0 ? numbers : undefined, about: [too, within, ...(about.get(id) ?? [])].filter(Boolean).join('. '), aboutId: `${uid}-about-${index}`, dim: dimmed?.has(id) ?? false, stop: false, editable, direction, opens, leadsTo: related?.leadsTo ?? NO_NAMES, comesFrom: related?.comesFrom ?? NO_NAMES, toggles: groups && node.open !== undefined, holds: inside.length, owns: inside.map((it) => nameIn?.get(it) ?? '').filter(Boolean).join(' '), domId: nameIn?.get(id) ?? '', keysId: movable ? `${uid}-keys` : '', onToggle: handlers.toggle, onAdd: handlers.add, onOpen: handlers.open, onFocus: handlers.focus, onGroup: handlers.group, onDrawn: handlers.drawn },
        },
      ]
    })
    // A thing that is as it was handed before is handed again as that very object: one thing moved, chosen or renamed
    // draws one thing again, not all.
    const next = new Map<string, Node<Drawn>>()
    const same = all.map((it) => {
      const was = handedBefore.current.get(it.id)
      const one = was !== undefined && sameThing(was, it) ? was : it
      next.set(it.id, one)
      return one
    })
    handedBefore.current = next
    if (!nest || nest.parent.size === 0) return same
    // React Flow reads a group before what it holds: the things by how deep they are, otherwise in their order.
    const depth = (id: string) => {
      let deep = 0
      for (let up = nest.parent.get(id); up !== undefined; up = nest.parent.get(up)) deep += 1
      return deep
    }
    const deep = new Map(same.map((it) => [it.id, depth(it.id)]))
    return same.sort((a, b) => deep.get(a.id)! - deep.get(b.id)!)
  }, [sight, byId, places, rel, sizeOf, nest, marked, about, uid, dimmed, below, closed, chosen, primary, words, editable, direction, tree, opens, groups, movable, relations, handlers])
  const drawn = React.useMemo<Node<Drawn>[]>(() => still.map((it) => (it.id === tabStop ? { ...it, data: { ...it.data, stop: true } } : it)), [still, tabStop])
  const { lines: placed, edgeOf } = React.useMemo(
    () => linesOf(edges, places, { direction, chosen: chosen.size > 0 ? chosen : null, marked: path.length > 0 ? new Set(path) : null, dimmed: path.length > 0 && !found ? dimmed : null, editable, routes: given !== null, loose }),
    [edges, places, direction, chosen, path, found, dimmed, editable, given, loose],
  )
  // The words that wait for a choice show too while one of the line's two things has the focus: only those lines are
  // handed over anew as the focus moves, so the others are not drawn again at every arrow.
  const lines = React.useMemo(() => {
    if (held === null) return placed
    let changed = false
    const next = placed.map((line) => {
      // A line without its words drawn, whose edge has some: they wait for a choice.
      const waiting = line.label === undefined && (line.source === held || line.target === held) ? edgeOf.get(line.id)?.label : undefined
      if (!waiting) return line
      changed = true
      return { ...line, ...wordsOn(waiting) }
    })
    return changed ? next : placed
  }, [placed, edgeOf, held])
  // The words that have no room on their line (they would lie under a thing or on other words) are not drawn on it:
  // the line is handed over without them, and they are listed under the view's buttons. The others are the same lines.
  const worded = React.useMemo(() => {
    if (!lines.some((line) => line.label !== undefined)) return null
    const boxes = new Map<string, Box>()
    for (const [id, at] of places) boxes.set(id, { ...at, ...sizeOf(id) })
    return wordsOf(lines, boxes, direction, nest?.frames)
  }, [lines, places, sizeOf, direction, nest])
  const fitted = React.useMemo(() => {
    if (!worded || worded.off.length === 0) return lines
    const off = new Set(worded.off)
    return lines.map((line) => (off.has(line.id) ? bare(line) : line))
  }, [lines, worded])
  const listed = React.useMemo<WordRow[] | null>(() => {
    if (!worded || worded.off.length === 0) return null
    const at = new Map(lines.map((line) => [line.id, line]))
    return worded.off.flatMap((id) => {
      const line = at.get(id)
      if (!line || typeof line.label !== 'string') return []
      return [{ id, look: line.style, from: byId.get(line.source)?.label ?? line.source, to: byId.get(line.target)?.label ?? line.target, both: edgeOf.get(id)?.directed === false, words: line.label }]
    })
  }, [lines, worded, byId, edgeOf])
  // The library keeps what it measures and what the user picks on the nodes it is given: they are handed over whole
  // at every change of the graph, and its own changes are laid over them.
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<Drawn>>(drawn)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>(fitted)
  React.useEffect(() => {
    const held = draggedNow.current
    // What React Flow has is kept where nothing changed, and what it measured only while the measure holds (`handOver`).
    setFlowNodes((now) => handOver(now, drawn, held))
  }, [drawn, dragged, setFlowNodes])
  /**
   * React Flow's own changes to the things. One of them is a place told after a drag the canvas had already ended (a
   * second finger aborts the drag, and React Flow tells the last place when the finger lifts, with no drag stop): it
   * is where the thing was let go, so it is kept and told as any other, and «Reset the layout» puts it back.
   */
  const onThingsChange: typeof onNodesChange = (changes) => {
    onNodesChange(changes)
    if (!movable) return
    for (const change of changes) if (change.type === 'position' && change.dragging === false && change.position && !draggedNow.current.has(change.id)) settle(change.id, change.position)
  }
  React.useEffect(() => setFlowEdges(fitted), [fitted, setFlowEdges])

  // The view: the buttons at the head of the canvas and the keys +, − and 0 do the same.
  const zoomIn = () => void flow.zoomIn({ duration: glide })
  const zoomOut = () => void flow.zoomOut({ duration: glide })
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
    // In the time of the glide when the new layout answers a gesture; at once when it is the app's own doing.
    target.current = { ids: 'all', padding: PAD.right }
    view.apply(false, null, glides.current ? glide : 0)
  }, [layoutKey, view, glide])
  // The keys of the canvas, read at its box. +, − and 0 from anywhere in it but a field (the search keeps what is
  // typed into it), = as + (the same key without Shift); the others are the things' (`thingKey`). With Ctrl or Cmd
  // they are the browser's own zoom; Shift is let through, since on some keyboards it makes the +. With `movable`, Alt
  // and an arrow move the thing that has the focus (or whose button has it) a step: a drag is not the only way.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target || target.closest(FIELDS)) return
    if (movable && event.altKey && !event.ctrlKey && !event.metaKey) {
      const step = ARROWS[event.key]
      const id = target.closest<HTMLElement>('[data-thing]')?.dataset.thing
      const from = id === undefined ? undefined : rel.get(id)
      if (!step || id === undefined || !from) return
      nudge(id, from, step)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
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
    //   limit, since that box is the library's to draw. One item is selected, also with several things chosen (the
    //   first of them; the others say in their description that they are chosen with it): the user chooses one, so
    //   the tree is not multiselectable.
    // - In the graph mode the lines are not «hangs from», so it is not a tree, and not a second application around the
    //   library's: a group, which `aria-roledescription` calls a graph (the word `graph.roleDescription`).
    // - Each thing is a button: its name and second line name it, where its lines lead and come from describe it, and
    //   the chosen one is `aria-current` (a choice, not a toggle; the first of the several the app marks). One Tab stop
    //   as in the tree. Not a listbox: an option cannot hold the → that opens it, and inside a listbox the app's
    //   commands give up their keys (`commands.tsx`).
    // The focus is followed here, where it moves from thing to thing: the words of a line drawn on a choice show while
    // one of its things has it.
    <div
      ref={box}
      role={tree ? 'tree' : 'group'}
      aria-roledescription={tree ? undefined : words.roleDescription}
      {...props}
      data-slot="graph"
      data-fill={fill || undefined}
      onKeyDown={onKeyDown}
      // A press or a key here is a gesture: a new layout of the app's that follows at once may glide (`animated`).
      onPointerDownCapture={() => (touched.current = Date.now())}
      onKeyDownCapture={() => (touched.current = Date.now())}
      onFocus={(event) => setHeld(event.target instanceof Element ? (event.target.closest<HTMLElement>('[data-thing]')?.dataset.thing ?? null) : null)}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setHeld(null)
      }}
      className={cn('relative h-96 min-h-0 overflow-hidden rounded-md bg-paper-2', fill && FILL, className)}
    >
      <ReactFlow
        // Filling, the library's box is laid over this one: its own height (100%, inline) is nothing in a box that has
        // no height but its floor.
        // Not shown until the first view is fitted to the measured box; an empty graph has nothing to fit.
        className={cn(fill && 'absolute! inset-0', !shown && !empty && size.width > 0 && size.height > 0 && 'invisible')}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onThingsChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        onPaneClick={() => onSelect?.(null)}
        onConnect={editable ? join : undefined}
        onDelete={
          editable
            ? ({ edges: gone }) => {
                // The edge of each line picked, and every exact copy of an edge without an `id` (one line, drawn once);
                // of two edges between the same things that differ, only the one picked goes.
                const picked = gone.flatMap((it) => {
                  const edge = edgeOf.get(it.id)
                  return edge ? [edge] : []
                })
                const copies = new Set(picked.map(copyOf).filter((key): key is string => key !== null))
                const removed = edges.filter((edge) => picked.includes(edge) || copies.has(copyOf(edge) ?? ''))
                if (removed.length > 0) onChange?.({ nodes, edges: edges.filter((edge) => !removed.includes(edge)) }, { kind: 'remove', nodes: [], edges: removed })
              }
            : undefined
        }
        nodesDraggable={movable}
        // A drag starts after 4px: a press is not one, and neither is a pan that starts on a thing by mistake. With a
        // finger a drag on a thing moves it and a drag on the ground moves the view, as with a mouse.
        {...(movable
          ? {
              nodeDragThreshold: DRAG_AFTER,
              selectNodesOnDrag: false,
              // Nothing glides while a thing is dragged (`startDrag`).
              onNodeDragStart: (_: unknown, __: unknown, taken: readonly Node<Drawn>[]) => startDrag(taken.map((it) => it.id)),
              onNodeDragStop: (_: unknown, __: unknown, dropped: readonly Node<Drawn>[]) => {
                endDrag()
                for (const it of dropped) settle(it.id, it.position)
              },
            }
          : {})}
        onMoveEnd={keepStop}
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
        {minimap ? <MiniMap position="bottom-left" pannable zoomable ariaLabel={words.map} nodeBorderRadius={4} nodeClassName={mapClass} /> : null}
        {search ? (
          <Panel position="top-left">
            <SearchField
              aria-label={words.find}
              placeholder={words.find}
              value={query}
              onValueChange={setQuery}
              onKeyDown={(event) => {
                // With an IME, Enter confirms the candidate being composed: it must not reveal a thing.
                if (event.key !== 'Enter' || event.nativeEvent.isComposing || !found1) return
                event.preventDefault()
                reveal(found1.id)
              }}
              className="w-56 rounded-md bg-raised shadow-sm"
            />
          </Panel>
        ) : null}
        {/* The box of the two takes no press: beside the buttons, over the list's width, a press or a pan reaches the canvas. */}
        <Panel position="top-right" className="pointer-events-none flex flex-col items-end gap-2">
          <div ref={viewRow} role="group" aria-label={words.view} className="pointer-events-auto flex items-center gap-0.5 rounded-md bg-raised p-0.5 shadow-sm">
            {/* Only while something was moved, and at the start of the row, which is held at its end: the other buttons stay where they are (R14). */}
            {moved.size > 0 ? (
              <Tooltip label={words.resetLayout}>
                <Button variant="ghost" size="icon-sm" data-slot="graph-reset" aria-label={words.resetLayout} onClick={reset}>
                  <Icon name="undo" />
                </Button>
              </Tooltip>
            ) : null}
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
          {/* Under the buttons, which stay where they are (R14): the words that have no room on their lines. */}
          {listed ? <LineWords rows={listed} /> : null}
        </Panel>
      </ReactFlow>
      {movable ? (
        <>
          {/* How a thing is moved without a drag: in the description of each thing. And what the keys did, said as it happens. */}
          <span id={`${uid}-keys`} hidden>
            {words.moveKeys}
          </span>
          <span role="status" className="sr-only">
            {said}
          </span>
        </>
      ) : null}
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
