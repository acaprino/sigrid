// A canvas for a graph (`GraphCanvas`, the `./graph` entry, on React Flow and dagre). jsdom lays nothing out and
// React Flow draws no line in it, so the canvas itself (pan, zoom, the lines as drawn, joining two things by hand,
// what is drawn of a thousand) is driven in a browser, on the showcase (section «GraphCanvas»). Here: what is in sight
// with some things closed, where the layout puts things, what a path opens, where the view goes, which lines are drawn
// and how, and what the canvas is for a keyboard and a screen reader.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { linesOf, openedFor, viewFor } from '../src/components/GraphCanvas'
import { GraphCanvas, layoutGraph, visibleGraph, type Graph, type GraphCanvasHandle, type GraphChange, type GraphEdge, type GraphNode } from '../src/graph'

const GRAPH: Graph = {
  nodes: [
    { id: 'root', label: 'Launch' },
    { id: 'a', label: 'Content' },
    { id: 'b', label: 'Design' },
    { id: 'a1', label: 'Copy' },
    { id: 'a2', label: 'Photos' },
    { id: 'b1', label: 'Screens' },
    { id: 'shared', label: 'Pages' },
  ],
  edges: [
    { from: 'root', to: 'a' },
    { from: 'root', to: 'b' },
    { from: 'a', to: 'a1' },
    { from: 'a', to: 'a2' },
    { from: 'b', to: 'b1' },
    // A thing that hangs from two.
    { from: 'a', to: 'shared' },
    { from: 'b1', to: 'shared' },
  ],
}

describe('what is in sight', () => {
  test('with nothing closed, everything, in the order of a tree read from its root', () => {
    const sight = visibleGraph(GRAPH, [])
    expect(sight.order).toEqual(['root', 'a', 'a1', 'a2', 'shared', 'b', 'b1'])
    expect(sight.level.get('root')).toBe(1)
    expect(sight.level.get('a1')).toBe(3)
    expect(sight.hidden.size).toBe(0)
  })

  test('a closed thing hides what hangs from it, but not what can be reached another way', () => {
    const sight = visibleGraph(GRAPH, ['a'])
    // «Pages» hangs from «Content» and from «Screens»: it stays, under «Screens».
    expect(sight.order).toEqual(['root', 'a', 'b', 'b1', 'shared'])
    expect(sight.hidden.get('a')).toBe(2)
    const both = visibleGraph(GRAPH, ['a', 'b'])
    expect(both.order).toEqual(['root', 'a', 'b'])
    expect(both.hidden.get('a')).toBe(3)
    expect(both.hidden.get('b')).toBe(2)
  })

  test('a join to a thing that is not there, a thing joined to itself and a ring do not break it', () => {
    const odd: Graph = { nodes: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }], edges: [{ from: 'x', to: 'y' }, { from: 'y', to: 'x' }, { from: 'x', to: 'x' }, { from: 'x', to: 'gone' }] }
    expect(visibleGraph(odd, []).order).toEqual(['x', 'y'])
    expect(visibleGraph({ nodes: [], edges: [] }, ['x']).order).toEqual([])
  })
})

describe('the layout', () => {
  test('to the end: each rank is further along the line, and two things never share a place', () => {
    const shown = visibleGraph(GRAPH, []).order
    const places = layoutGraph(GRAPH, shown, 'right')
    expect([...places.keys()].sort()).toEqual([...shown].sort())
    expect(places.get('a')!.x).toBeGreaterThan(places.get('root')!.x)
    expect(places.get('a1')!.x).toBeGreaterThan(places.get('a')!.x)
    // A thing is always further along than what it hangs from, whatever rank the layout gives it.
    for (const edge of GRAPH.edges) expect(places.get(edge.to)!.x, `${edge.from} → ${edge.to}`).toBeGreaterThan(places.get(edge.from)!.x)
    const spots = [...places.values()].map((at) => `${at.x},${at.y}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  test('downwards the ranks go down, and only what is in sight has a place', () => {
    const places = layoutGraph(GRAPH, ['root', 'a', 'b'], 'down')
    expect([...places.keys()].sort()).toEqual(['a', 'b', 'root'])
    expect(places.get('a')!.y).toBeGreaterThan(places.get('root')!.y)
    expect(places.get('a')!.y).toBe(places.get('b')!.y)
  })
})

/** The graph with lines that join without hanging: a `link` on the same pair as a `child` line, across two branches, between two siblings. */
const LINKED: Graph = {
  nodes: GRAPH.nodes,
  edges: [
    ...GRAPH.edges,
    { from: 'root', to: 'a', kind: 'link' },
    { from: 'a1', to: 'b1', kind: 'link', style: 'dashed', tone: 'warning', label: 'waits for' },
    { from: 'a2', to: 'a1', kind: 'link', style: 'dotted', tone: 'destructive', directed: false, label: 'never with' },
  ],
}

/** 37 things in 15 groups, each group with a second line, and two `link` lines across groups. */
const GROUPS: Graph = (() => {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  for (let g = 1; g <= 15; g++) {
    nodes.push({ id: `g${g}`, label: `Group ${g}`, detail: `What group ${g} is for` })
    for (let i = 1; i <= (g <= 7 ? 3 : 2); i++) {
      nodes.push({ id: `g${g}-${i}`, label: `Thing ${g}.${i}` })
      edges.push({ from: `g${g}`, to: `g${g}-${i}` })
    }
  }
  edges.push({ from: 'g2-1', to: 'g9-1', kind: 'link', style: 'dashed', label: 'needs' }, { from: 'g3-2', to: 'g12-1', kind: 'link', style: 'dotted', tone: 'destructive', directed: false })
  return { nodes, edges }
})()
const ALL_GROUPS = GROUPS.nodes.filter((node) => node.detail).map((node) => node.id)

/** The boxes of what is in sight, as the canvas lays them out. */
function boxesOf(graph: Graph, closed: readonly string[], direction: 'right' | 'down' = 'right') {
  const order = visibleGraph(graph, closed).order
  const at = layoutGraph(graph, order, direction)
  return order.map((id) => ({ id, ...at.get(id)!, width: 208, height: graph.nodes.find((node) => node.id === id)!.detail ? 56 : 44 }))
}
type View = { x: number; y: number; zoom: number }
/** A box the edge of the canvas runs across: part of it in sight, part out. */
function cut(box: { x: number; y: number; width: number; height: number }, view: View, width: number, height: number) {
  const left = view.x + box.x * view.zoom
  const top = view.y + box.y * view.zoom
  const right = left + box.width * view.zoom
  const bottom = top + box.height * view.zoom
  const seen = left < width - 0.5 && right > 0.5 && top < height - 0.5 && bottom > 0.5
  const whole = left >= -0.5 && right <= width + 0.5 && top >= -0.5 && bottom <= height + 0.5
  return seen && !whole
}
const ROOM = { width: 1280, height: 800, top: 64, right: 24, bottom: 24, left: 24 }

describe('lines that do not hang', () => {
  test('a `link` changes nothing of what is in sight, of what a closed thing hides, of the levels or of the places', () => {
    for (const closed of [[], ['a'], ['b'], ['a', 'b'], ['root']]) {
      expect(visibleGraph(LINKED, closed), closed.join()).toEqual(visibleGraph(GRAPH, closed))
      const shown = visibleGraph(GRAPH, closed).order
      expect(layoutGraph(LINKED, shown, 'right'), closed.join()).toEqual(layoutGraph(GRAPH, shown, 'right'))
    }
    // An edge with a `kind` of the app's own hangs, as every edge did before there were kinds.
    const own = { nodes: GRAPH.nodes, edges: GRAPH.edges.map((edge) => ({ ...edge, kind: 'member' }) as unknown as GraphEdge) }
    expect(visibleGraph(own, ['a'])).toEqual(visibleGraph(GRAPH, ['a']))
    expect(linesOf(own.edges, layoutGraph(own, visibleGraph(own, []).order, 'right'), { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false }).lines.every((line) => !line.id.endsWith('#link') && line.markerEnd === undefined)).toBe(true)
    // A `link` to a hidden thing does not make it «reached another way», as a `child` line would.
    expect(visibleGraph(LINKED, ['a']).hidden.get('a')).toBe(2)
    expect(visibleGraph({ nodes: GRAPH.nodes, edges: [...GRAPH.edges, { from: 'b1', to: 'a1' }] }, ['a']).hidden.get('a')).toBe(1)
  })

  test('the lines drawn: a `child` line as before, a `link` with its own name, its arrowhead, its dash, its tone and its words', () => {
    const at = layoutGraph(LINKED, visibleGraph(LINKED, []).order, 'right')
    const { lines, edgeOf } = linesOf(LINKED.edges, at, { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false })
    const line = (id: string) => lines.find((it) => it.id === id)!
    // The same two things, joined both ways: two lines.
    expect(line('root→a').markerEnd).toBeUndefined()
    expect(line('root→a').className).toBeUndefined()
    expect(line('root→a#link').markerEnd).toMatchObject({ type: 'arrowclosed', color: 'var(--color-ink-mute)' })
    expect(edgeOf.get('root→a#link')).toBe(LINKED.edges[7])
    const waits = line('a1→b1#link')
    expect(waits.label).toBe('waits for')
    expect(waits.className).toBe('sigrid-graph-dashed sigrid-graph-warning')
    expect(waits.markerEnd).toMatchObject({ color: 'var(--color-warning)' })
    // What a `link` says is read in the description of its two things, not again on the line.
    expect(waits.domAttributes).toEqual({ 'aria-hidden': true })
    // Both ways: no arrowhead. Between two things of the same rank it arrives on the far side and goes round them.
    const never = line('a2→a1#link')
    expect(never.markerEnd).toBeUndefined()
    expect(never.targetHandle).toBe('side')
    expect(never.className).toBe('sigrid-graph-dotted sigrid-graph-destructive')
    // «Copy» and «Screens» are of the same rank too; a `link` to a thing further along arrives where a `child` line does.
    expect(waits.targetHandle).toBe('side')
    expect(line('root→a#link').targetHandle).toBeUndefined()
    // Only between two things in sight.
    const closed = layoutGraph(LINKED, visibleGraph(LINKED, ['a']).order, 'right')
    expect(linesOf(LINKED.edges, closed, { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false }).lines.map((it) => it.id)).not.toContain('a1→b1#link')
  })

  test('a line between two things of the path takes the accent, keeping its dash; with a path, a line to a dimmed thing is dimmed', () => {
    const at = layoutGraph(LINKED, visibleGraph(LINKED, []).order, 'right')
    const { lines } = linesOf(LINKED.edges, at, { direction: 'right', chosen: 'b', marked: new Set(['a1', 'b1']), dimmed: new Set(['a2', 'root']), editable: false })
    const line = (id: string) => lines.find((it) => it.id === id)!
    expect(line('a1→b1#link').className).toBe('sigrid-graph-dashed sigrid-graph-accent')
    expect(line('a1→b1#link').markerEnd).toMatchObject({ color: 'var(--color-accent)' })
    expect(line('a2→a1#link').className).toContain('sigrid-graph-dim')
    expect(line('b→b1').className).toBe('sigrid-graph-near')
  })
})

describe('what a path opens', () => {
  test('every closed thing on a way up to a thing of the path opens, and nothing else', () => {
    expect(openedFor(GRAPH, ['a', 'b'], ['a1'])).toEqual(['b'])
    expect(openedFor(GRAPH, ['root', 'a', 'b'], ['a1'])).toEqual(['b'])
    // «Pages» hangs from «Content» and from «Screens»: both ways open.
    expect(openedFor(GRAPH, ['a', 'b'], ['shared'])).toEqual([])
    // A closed thing of the path itself stays closed; nothing to open is the same array.
    const closed = ['a']
    expect(openedFor(GRAPH, closed, ['a', 'b1'])).toBe(closed)
    // `link` lines are no way up.
    expect(openedFor(LINKED, ['a'], ['b1'])).toEqual(['a'])
  })
})

describe('where the view goes', () => {
  test('15 closed groups at 1280×800: not 0.67 as a whole fit would be, but the readable floor, from the top left, with no group cut by the edge', () => {
    const boxes = boxesOf(GROUPS, ALL_GROUPS)
    expect(boxes).toHaveLength(15)
    const whole = viewFor(boxes, ROOM, 0.2, 1)
    expect(whole.zoom).toBeCloseTo(0.669, 3)
    const view = viewFor(boxes, ROOM, 0.8, 1)
    expect(view.zoom).toBeCloseTo(0.8, 3)
    // Names of 14px stay at least 11px.
    expect(14 * view.zoom).toBeGreaterThanOrEqual(11)
    // The first group at the top, below the room of the field and the buttons; the column centred across.
    expect(view.y + boxes[0]!.y * view.zoom).toBeCloseTo(64, 3)
    expect(view.x + (boxes[0]!.x + 104) * view.zoom).toBeCloseTo(24 + (1280 - 48) / 2, 3)
    for (const box of boxes) expect(cut(box, view, 1280, 800), box.id).toBe(false)
  })

  test('at any size the edge of the canvas falls between two things, never across one, and the scale never goes under the floor', () => {
    const boxes = boxesOf(GROUPS, ALL_GROUPS)
    const open = boxesOf(GROUPS, ALL_GROUPS.slice(3))
    for (let height = 300; height <= 1000; height += 13) {
      for (const set of [boxes, open]) {
        const view = viewFor(set, { ...ROOM, width: 900, height }, 0.8, 1)
        expect(view.zoom).toBeGreaterThanOrEqual(0.8)
        // A little larger than the things' own size only where no gap falls at the edge before it.
        expect(view.zoom).toBeLessThanOrEqual(1.5)
        for (const box of set) expect(cut(box, view, 900, height), `${box.id} at ${height}`).toBe(false)
      }
    }
  })

  test('a view on some things (a path, `focus`) cuts none of the others in sight either', () => {
    const all = boxesOf(GROUPS, ALL_GROUPS.filter((id) => id !== 'g9' && id !== 'g12'))
    const aim = all.filter((box) => box.id === 'g9-1' || box.id === 'g12-2')
    for (const [width, height] of [[896, 448], [1280, 800], [700, 520], [1100, 610], [640, 900]] as const) {
      const view = viewFor(aim, { ...ROOM, width, height }, 0.8, 1, all)
      expect(view.zoom).toBeGreaterThanOrEqual(0.8)
      for (const box of aim) {
        const left = view.x + box.x * view.zoom
        const top = view.y + box.y * view.zoom
        expect(left >= 0 && top >= 0 && left + box.width * view.zoom <= width && top + box.height * view.zoom <= height, `${box.id} in sight at ${width}×${height}`).toBe(true)
      }
      for (const box of all) expect(cut(box, view, width, height), `${box.id} at ${width}×${height}`).toBe(false)
    }
  })

  test('a graph that fits is centred, never larger than its own size', () => {
    const boxes = boxesOf(GRAPH, [])
    const view = viewFor(boxes, ROOM, 0.8, 1)
    expect(view.zoom).toBe(1)
    const left = Math.min(...boxes.map((b) => b.x))
    const right = Math.max(...boxes.map((b) => b.x + b.width))
    const top = Math.min(...boxes.map((b) => b.y))
    const bottom = Math.max(...boxes.map((b) => b.y + b.height))
    expect(view.x + left - 24).toBeCloseTo(1280 - 24 - (view.x + right), 3)
    expect(view.y + top - 64).toBeCloseTo(800 - 24 - (view.y + bottom), 3)
  })
})

describe('the canvas', () => {
  beforeAll(() => {
    // React Flow reads the size of its box and of the page's matrix; jsdom has neither.
    if (!('DOMMatrixReadOnly' in globalThis)) {
      class Matrix {
        m22 = 1
        constructor(_transform?: string) {}
      }
      Object.defineProperty(globalThis, 'DOMMatrixReadOnly', { value: Matrix, configurable: true })
    }
  })

  function Sample({ onChange, editable = false }: { onChange?: (next: Graph, change: GraphChange) => void; editable?: boolean }) {
    const [selected, setSelected] = React.useState<string | null>(null)
    return <GraphCanvas aria-label="Plan" nodes={GRAPH.nodes} edges={GRAPH.edges} selected={selected} onSelect={setSelected} defaultCollapsed={['a']} editable={editable} onChange={onChange} search />
  }
  const item = (name: string | RegExp) => screen.getByRole('treeitem', { name })

  test('it is a tree with a name: each thing has its level, says whether it is open, and a closed one how many it hides', () => {
    render(<Sample />)
    expect(screen.getByRole('tree', { name: 'Plan' })).toBeTruthy()
    expect(screen.getAllByRole('treeitem')).toHaveLength(5)
    expect(item('Launch').getAttribute('aria-level')).toBe('1')
    expect(item('Launch').getAttribute('aria-expanded')).toBe('true')
    const closed = item('Content, closed, hides 2')
    expect(closed.getAttribute('aria-expanded')).toBe('false')
    expect(closed.getAttribute('aria-level')).toBe('2')
    // A thing with nothing hanging from it neither opens nor closes.
    expect(item('Pages').hasAttribute('aria-expanded')).toBe(false)
    // One Tab stop.
    expect(screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0)).toHaveLength(1)
  })

  test('the keys of a tree: Right opens, Left closes, Enter chooses', () => {
    render(<Sample />)
    fireEvent.keyDown(item('Content, closed, hides 2'), { key: 'ArrowRight' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(7)
    expect(item('Content').getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(item('Content'), { key: 'ArrowLeft' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(5)
    fireEvent.keyDown(item('Design'), { key: 'Enter' })
    expect(item('Design').getAttribute('aria-selected')).toBe('true')
    expect(item('Launch').getAttribute('aria-selected')).toBe('false')
  })

  test('the arrow of a thing opens and closes it with the pointer, and has a name that says which', () => {
    render(<Sample />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Content' }))
    expect(screen.getAllByRole('treeitem')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Close Design' }))
    expect(screen.queryByRole('treeitem', { name: 'Screens' })).toBeNull()
    // «Pages» is still reached through «Content».
    expect(item('Pages')).toBeTruthy()
  })

  test('read only, nothing can be added or taken away', () => {
    const changed = vi.fn()
    render(<Sample onChange={changed} />)
    fireEvent.keyDown(item('Design'), { key: 'Enter' })
    expect(screen.queryByRole('button', { name: 'Add under Design' })).toBeNull()
    fireEvent.keyDown(item('Design'), { key: 'Delete' })
    expect(changed).not.toHaveBeenCalled()
  })

  test('editable: the plus of the chosen thing asks for a new one under it, Delete for the thing to go with its joins', () => {
    const changed = vi.fn<(next: Graph, change: GraphChange) => void>()
    render(<Sample onChange={changed} editable />)
    fireEvent.keyDown(item('Design'), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Add under Design' }))
    const [next, change] = changed.mock.calls[0]!
    expect(change.kind).toBe('add')
    expect(next.nodes).toHaveLength(GRAPH.nodes.length + 1)
    expect(next.edges[next.edges.length - 1]).toEqual({ from: 'b', to: next.nodes[next.nodes.length - 1]!.id })
    expect(next.nodes[next.nodes.length - 1]!.label).toBe('New')
    fireEvent.keyDown(item('Design'), { key: 'Delete' })
    const [after, removal] = changed.mock.calls[1]!
    expect(removal).toEqual({ kind: 'remove', nodes: ['b'], edges: [{ from: 'root', to: 'b' }, { from: 'b', to: 'b1' }] })
    expect(after.nodes.map((node) => node.id)).not.toContain('b')
    expect(after.edges).toHaveLength(GRAPH.edges.length - 2)
  })

  test('the field finds a thing that is hidden: Enter opens what hides it and chooses it', () => {
    render(<Sample />)
    const field = screen.getByRole('searchbox', { name: 'Find' })
    fireEvent.change(field, { target: { value: 'photo' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(item('Photos').getAttribute('aria-selected')).toBe('true')
    expect(item('Content').getAttribute('aria-expanded')).toBe('true')
  })

  test("the words are the app's", () => {
    render(
      <WordsProvider words={{ graph: { open: (thing) => `Apri ${thing}`, closed: (thing, hidden) => `${thing}, chiuso, ne nasconde ${hidden}`, find: 'Trova' } }}>
        <Sample />
      </WordsProvider>,
    )
    expect(screen.getByRole('button', { name: 'Apri Content' })).toBeTruthy()
    expect(item('Content, chiuso, ne nasconde 2')).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Trova' })).toBeTruthy()
  })
})

describe('the canvas with a path and with lines that do not hang', () => {
  beforeAll(() => {
    if (!('DOMMatrixReadOnly' in globalThis)) {
      class Matrix {
        m22 = 1
        constructor(_transform?: string) {}
      }
      Object.defineProperty(globalThis, 'DOMMatrixReadOnly', { value: Matrix, configurable: true })
    }
  })
  const item = (name: string | RegExp) => screen.getByRole('treeitem', { name })
  const description = (el: HTMLElement) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent ?? ''
  const dim = (el: HTMLElement) => el.className.includes('opacity-40')

  test('a thing of the path says its steps in its name and shows them as numbers; what hides it opens', () => {
    const { container } = render(<GraphCanvas aria-label="Plan" nodes={GRAPH.nodes} edges={GRAPH.edges} steps={new Map([['a1', [1]], ['b1', [2, 4]]])} defaultCollapsed={['a', 'b']} />)
    expect(item('Copy, step 1')).toBeTruthy()
    expect(item('Screens, steps 2 and 4')).toBeTruthy()
    expect(item('Content').getAttribute('aria-expanded')).toBe('true')
    // The path is not the choice: nothing is selected.
    expect(item('Copy, step 1').getAttribute('aria-selected')).toBe('false')
    const numbers = [...container.querySelectorAll('[data-slot="graph-steps"]')].map((el) => [el.getAttribute('aria-hidden'), el.textContent])
    expect(numbers).toEqual([['true', '1'], ['true', '24']])
    // On the path or joined to it: in full; the rest is dimmed.
    expect(dim(item('Copy, step 1'))).toBe(false)
    expect(dim(item('Content'))).toBe(false)
    expect(dim(item('Pages'))).toBe(false)
    expect(dim(item('Photos'))).toBe(true)
    expect(dim(item('Launch'))).toBe(true)
  })

  test('what is dimmed: the field first, then the chosen thing and the path together', () => {
    function Sample() {
      const [selected, setSelected] = React.useState<string | null>(null)
      return <GraphCanvas aria-label="Plan" nodes={GRAPH.nodes} edges={GRAPH.edges} steps={new Map([['a1', [1]]])} selected={selected} onSelect={setSelected} search />
    }
    render(<Sample />)
    expect(dim(item('Screens'))).toBe(true)
    fireEvent.keyDown(item('Screens'), { key: 'Enter' })
    // The chosen thing and its neighbours come back; the path stays.
    expect(dim(item('Screens'))).toBe(false)
    expect(dim(item('Design'))).toBe(false)
    expect(dim(item('Copy, step 1'))).toBe(false)
    expect(dim(item('Photos'))).toBe(true)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find' }), { target: { value: 'photo' } })
    expect(dim(item('Photos'))).toBe(false)
    expect(dim(item('Copy, step 1'))).toBe(true)
  })

  test('the lines that do not hang are read in the description of their two things, with their words and their way', () => {
    render(<GraphCanvas aria-label="Plan" nodes={LINKED.nodes} edges={LINKED.edges} />)
    expect(description(item('Copy'))).toBe('waits for, to Screens. never with, with Photos')
    expect(description(item('Screens'))).toBe('waits for, from Copy')
    expect(description(item('Content'))).toBe('from Launch')
    expect(item('Design').hasAttribute('aria-describedby')).toBe(false)
    // Still one Tab stop, and the keys follow only what hangs: Right from «Launch» goes to «Content», not along a link.
    expect(screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0)).toHaveLength(1)
    fireEvent.keyDown(item('Launch'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(item('Content'))
  })

  test('a `link` to a hidden thing neither shows it nor changes how many a closed thing hides', () => {
    render(<GraphCanvas aria-label="Plan" nodes={LINKED.nodes} edges={LINKED.edges} defaultCollapsed={['a']} />)
    expect(item('Content, closed, hides 2')).toBeTruthy()
    expect(screen.queryByRole('treeitem', { name: 'Copy' })).toBeNull()
  })

  test('when the app keeps what is closed, the path asks for its groups to open once, and the user may close them again', () => {
    const asked = vi.fn<(ids: string[]) => void>()
    function Kept({ steps }: { steps: ReadonlyMap<string, readonly number[]> }) {
      const [closed, setClosed] = React.useState<string[]>(['a', 'b'])
      return (
        <GraphCanvas
          aria-label="Plan"
          nodes={GRAPH.nodes}
          edges={GRAPH.edges}
          steps={steps}
          collapsed={closed}
          onCollapsedChange={(ids) => {
            asked(ids)
            setClosed(ids)
          }}
        />
      )
    }
    const { rerender } = render(<Kept steps={new Map([['a1', [1]]])} />)
    expect(asked).toHaveBeenCalledTimes(1)
    expect(asked).toHaveBeenLastCalledWith(['b'])
    fireEvent.click(screen.getByRole('button', { name: 'Close Content' }))
    expect(asked).toHaveBeenLastCalledWith(['b', 'a'])
    // The same path again, in a new Map: nothing is asked.
    rerender(<Kept steps={new Map([['a1', [1]]])} />)
    expect(asked).toHaveBeenCalledTimes(2)
    expect(item('Content, closed, hides 3')).toBeTruthy()
    // Another path: its groups open.
    rerender(<Kept steps={new Map([['b1', [1]]])} />)
    expect(asked).toHaveBeenLastCalledWith(['a'])
  })

  describe('the view, in a box of a given size', () => {
    let width = 1280
    let height = 800
    const watchers: (() => void)[] = []
    beforeAll(() => {
      // jsdom keeps the sizes on `Element`: the ones laid on `HTMLElement` here are taken away after.
      const saved = globalThis.ResizeObserver
      // The box of the canvas has a size, which changes when the test says; the observers are told.
      const isBox = (el: HTMLElement) => el.dataset['slot'] === 'graph'
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get(this: HTMLElement) { return isBox(this) ? width : 0 } })
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get(this: HTMLElement) { return isBox(this) ? height : 0 } })
      class Watch {
        constructor(private readonly told: ResizeObserverCallback) {}
        observe() {
          watchers.push(() => this.told([], this as unknown as ResizeObserver))
        }
        unobserve() {}
        disconnect() {}
      }
      Object.defineProperty(globalThis, 'ResizeObserver', { value: Watch, configurable: true, writable: true })
      return () => {
        delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
        delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight
        Object.defineProperty(globalThis, 'ResizeObserver', { value: saved, configurable: true, writable: true })
      }
    })
    afterEach(() => {
      width = 1280
      height = 800
      watchers.length = 0
    })
    const resize = (w: number, h: number) =>
      act(() => {
        width = w
        height = h
        for (const tell of watchers) tell()
      })
    function viewOf(container: HTMLElement): View {
      const transform = container.querySelector<HTMLElement>('.react-flow__viewport')!.style.transform
      const [, x, y, zoom] = /translate\((-?[\d.e-]+)px,\s*(-?[\d.e-]+)px\)\s*scale\(([\d.e-]+)\)/.exec(transform)!
      return { x: Number(x), y: Number(y), zoom: Number(zoom) }
    }
    /** The boxes of the things drawn, where the canvas put them. */
    function drawnBoxes(container: HTMLElement, graph: Graph) {
      return [...container.querySelectorAll<HTMLElement>('.react-flow__node')].map((el) => {
        const id = el.getAttribute('data-id')!
        const [, x, y] = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(el.style.transform)!
        return { id, x: Number(x), y: Number(y), width: 208, height: graph.nodes.find((node) => node.id === id)!.detail ? 56 : 44 }
      })
    }

    test('the first view is fitted to the box and cuts no thing; when the box changes size the view is fitted and centred again', async () => {
      const { container } = render(<GraphCanvas aria-label="Groups" nodes={GROUPS.nodes} edges={GROUPS.edges} defaultCollapsed={ALL_GROUPS.slice(2)} />)
      await act(async () => {})
      const first = viewOf(container)
      expect(first.zoom).toBeGreaterThanOrEqual(0.8)
      const boxes = drawnBoxes(container, GROUPS)
      expect(boxes.length).toBe(15 + 6)
      for (const box of boxes) expect(cut(box, first, 1280, 800), box.id).toBe(false)
      expect(container.querySelector('.react-flow')!.className).not.toContain('invisible')
      // An inspector opens beside it: the box is narrower and shorter.
      resize(860, 620)
      const after = viewOf(container)
      expect(after).not.toEqual(first)
      for (const box of boxes) expect(cut(box, after, 860, 620), box.id).toBe(false)
    })

    test('a graph that fits is centred in its box, and again in the box after a change of size', async () => {
      const { container } = render(<GraphCanvas aria-label="Plan" nodes={GRAPH.nodes} edges={GRAPH.edges} />)
      await act(async () => {})
      const centred = (w: number, h: number) => {
        const view = viewOf(container)
        const all = drawnBoxes(container, GRAPH)
        const left = view.x + Math.min(...all.map((b) => b.x)) * view.zoom
        const right = view.x + Math.max(...all.map((b) => b.x + b.width)) * view.zoom
        const top = view.y + Math.min(...all.map((b) => b.y)) * view.zoom
        const bottom = view.y + Math.max(...all.map((b) => b.y + b.height)) * view.zoom
        expect(left - 24).toBeCloseTo(w - 24 - right, 1)
        expect(top - 64).toBeCloseTo(h - 24 - bottom, 1)
        for (const box of all) expect(cut(box, view, w, h), box.id).toBe(false)
      }
      centred(1280, 800)
      // Narrower and shorter, still room for all of it.
      resize(1100, 600)
      centred(1100, 600)
    })

    test('the first view is on the path; `focus` opens what hides things and brings them into view; `fit` and `zoomTo` move the view', async () => {
      const view = React.createRef<GraphCanvasHandle>()
      const { container } = render(<GraphCanvas ref={view} aria-label="Groups" nodes={GROUPS.nodes} edges={GROUPS.edges} defaultCollapsed={ALL_GROUPS} steps={new Map([['g12-1', [1]], ['g12-2', [2]]])} />)
      await act(async () => {})
      const inSight = (id: string) => {
        const v = viewOf(container)
        const box = drawnBoxes(container, GROUPS).find((b) => b.id === id)!
        const left = v.x + box.x * v.zoom
        const top = v.y + box.y * v.zoom
        return left >= 0 && top >= 0 && left + box.width * v.zoom <= 1280 && top + box.height * v.zoom <= 800
      }
      expect(item('Thing 12.1, step 1')).toBeTruthy()
      expect(inSight('g12-1')).toBe(true)
      expect(inSight('g12-2')).toBe(true)
      // «Thing 15.2» is hidden in its closed group: `focus` opens it and brings it into view.
      act(() => view.current!.focus(['g15-2']))
      expect(item('Group 15').getAttribute('aria-expanded')).toBe('true')
      expect(inSight('g15-2')).toBe(true)
      act(() => view.current!.fit())
      expect(viewOf(container).zoom).toBeGreaterThanOrEqual(0.8)
      expect(inSight('g1')).toBe(true)
      act(() => view.current!.zoomTo(1.2))
      expect(viewOf(container).zoom).toBeCloseTo(1.2, 3)
    })

    test('`minFitZoom` 0 fits the whole graph, however small it gets', async () => {
      const { container } = render(<GraphCanvas aria-label="Groups" nodes={GROUPS.nodes} edges={GROUPS.edges} defaultCollapsed={ALL_GROUPS} minFitZoom={0} />)
      await act(async () => {})
      expect(viewOf(container).zoom).toBeCloseTo(0.669, 3)
    })
  })
})
