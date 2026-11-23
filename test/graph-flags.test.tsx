// What an app marks on the things and the lines of the canvas (`GraphCanvas`) when it draws a graph of its own model
// (one of its things drawn in several places, a service of another, a group it has not opened, a call and data that
// flow between the same two parts): several things chosen, each with the selection tint, one of them the choice that
// is heard, holds the Tab stop and has the plus; the word «external»; in the graph mode the count of what a thing
// hides (`hiddenCount`), in its name; words on a line drawn only while one of its ends is chosen or has the focus, or
// while it is the path's; two lines between the same two things, drawn side by side, and exact copies drawn once; one
// line of the path between two of its things, its tone kept. jsdom lays nothing out and React Flow draws a line only
// once it has measured its ends, so the lines are read in what the canvas hands React Flow, and from `linesOf`; a line
// drawn side by side is drawn here from what the canvas hands React Flow, as in test/graph-places.test.tsx.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { Position, type Edge, type EdgeProps, type Node, type ReactFlowProps } from '@xyflow/react'
import { WordsProvider } from '../src'
import { linesOf } from '../src/components/GraphCanvas'
import { GraphCanvas, type Graph, type GraphCanvasProps, type GraphChange, type GraphEdge, type GraphNode } from '../src/graph'
import { classes } from './helpers'

// What the canvas hands React Flow, kept to be read (as in test/graph-places.test.tsx): React Flow draws as ever.
const handed = vi.hoisted(() => ({ props: null as ReactFlowProps | null }))
vi.mock('@xyflow/react', async (importOriginal) => {
  const flow = await importOriginal<typeof import('@xyflow/react')>()
  const { createElement } = await import('react')
  return {
    ...flow,
    ReactFlow: (props: ReactFlowProps) => {
      handed.props = props
      return createElement(flow.ReactFlow, props)
    },
  }
})

beforeAll(() => {
  // React Flow reads the page's matrix; jsdom has none (as in test/graph.test.tsx).
  if (!('DOMMatrixReadOnly' in globalThis)) {
    class Matrix {
      m22 = 1
      constructor(_transform?: string) {}
    }
    Object.defineProperty(globalThis, 'DOMMatrixReadOnly', { value: Matrix, configurable: true })
  }
})

beforeEach(() => {
  handed.props = null
})

// The parts of a service, in the app's order. The ledger is one thing of the app's drawn in two places (the ledger
// and its replica), the payments are another's service, the orders a group of the app's it has not opened (12 inside).
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'orders', label: 'Orders', hiddenCount: 12 },
  { id: 'ledger', label: 'Ledger' },
  { id: 'replica', label: 'Replica' },
  { id: 'pay', label: 'Payments', external: true },
]
const EDGES: GraphEdge[] = [
  // Its words only while the gateway or the orders are chosen or have the focus, or while it is the path's.
  { from: 'gateway', to: 'orders', label: 'calls', labelShown: 'chosen' },
  // Two lines between the orders and the ledger, each with its own name and words.
  { id: 'call:orders-ledger', from: 'orders', to: 'ledger', label: 'calls' },
  { id: 'data:orders-ledger', from: 'orders', to: 'ledger', label: 'writes', style: 'dashed' },
  { from: 'orders', to: 'pay', label: 'pays' },
  { from: 'gateway', to: 'replica' },
]

/** The selection tint and the start of a border class, composed: Tailwind reads the tests too, and would make a class named here. */
const TINT = ['bg', 'selected'].join('-')
const BORDER = ['bor', 'der'].join('')

function Calls(props: Partial<GraphCanvasProps>) {
  const [selected, setSelected] = React.useState<string | null>(null)
  return <GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={selected} onSelect={setSelected} {...props} />
}
const thing = (name: string) => screen.getByRole('button', { name })
const item = (name: string) => screen.getByRole('treeitem', { name })
const things = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="graph-node"]'))
/** The thing that has the Tab stop, once it is seen to be the only one. */
const stop = () => {
  const all = things().filter((el) => el.tabIndex === 0)
  expect(all).toHaveLength(1)
  return all[0]
}
/** What screen readers hear after the name of a thing: the texts its `aria-describedby` points to. */
const description = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' · ')
/** What the canvas handed React Flow at its last draw. */
const flowNodes = () => (handed.props?.nodes ?? []) as Node[]
const flowEdges = () => (handed.props?.edges ?? []) as Edge[]
const between = (from: string, to: string) => flowEdges().filter((edge) => edge.source === from && edge.target === to)
/** Places for `linesOf`, which needs only that both ends of a line are in sight. */
const PLACES = new Map(NODES.map((node, at): [string, { x: number; y: number }] => [node.id, { x: at * 300, y: 0 }]))
const OPTIONS = { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false } as const
/** How far across its sides a line drawn side by side is moved (`data.offset`), or undefined for a line of its own. */
const offsetOf = (line: Edge | undefined) => (line?.data as { offset?: number } | undefined)?.offset
/** The points a path goes through, in order: its moves and its straight pieces (as in test/graph-places.test.tsx). */
const pointsOf = (d: string) => Array.from(d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g), (match) => ({ x: Number(match[1]), y: Number(match[2]) }))

describe('several things chosen', () => {
  test('in the graph mode each has the selection tint; the first in the order is the one current and holds the one Tab stop, the others are described as chosen with it; the user still chooses one', () => {
    const chose = vi.fn<(id: string | null) => void>()
    // Given out of the order of the things: the choice is the first of them in that order.
    render(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} onSelect={chose} />)
    for (const name of ['Ledger', 'Replica']) expect(classes(thing(name)), name).toContain(TINT)
    // One choice is heard.
    const current = things().filter((el) => el.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]).toBe(thing('Ledger'))
    expect(description(thing('Replica'))).toContain('chosen with Ledger')
    expect(description(thing('Ledger'))).not.toContain('chosen with')
    for (const name of ['Gateway', 'Orders, hides 12', 'Payments, external']) {
      expect(thing(name).hasAttribute('aria-current'), name).toBe(false)
      expect(classes(thing(name)), name).not.toContain(TINT)
      expect(description(thing(name)), name).not.toContain('chosen with')
    }
    expect(stop()).toBe(thing('Ledger'))
    // What is joined to any of them stays; the rest is dimmed.
    expect(classes(thing('Gateway').closest('[data-thing]'))).not.toContain('opacity-40')
    expect(classes(thing('Orders, hides 12').closest('[data-thing]'))).not.toContain('opacity-40')
    expect(classes(thing('Payments, external').closest('[data-thing]'))).toContain('opacity-40')
    // The lines of each of them are told from the others.
    expect(between('gateway', 'replica')[0]?.className).toBe('sigrid-graph-near')
    expect(between('orders', 'pay')[0]?.className).toBeUndefined()
    // The user chooses one thing.
    fireEvent.keyDown(thing('Gateway'), { key: 'Enter' })
    expect(chose.mock.calls).toEqual([['gateway']])
  })

  test('in the tree mode one item is selected, the first in the order, and the tree is not multiselectable; one id is as before', () => {
    const { rerender } = render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} />)
    const tree = screen.getByRole('tree', { name: 'Calls' })
    expect(tree.hasAttribute('aria-multiselectable')).toBe(false)
    const items = screen.getAllByRole('treeitem')
    // The tree's order: the gateway, the orders and what hangs from them, then the replica.
    expect(items.filter((el) => el.getAttribute('aria-selected') === 'true').map((el) => el.getAttribute('aria-label'))).toEqual(['Ledger'])
    expect(classes(item('Replica'))).toContain(TINT)
    expect(item('Replica').getAttribute('aria-selected')).toBe('false')
    expect(description(item('Replica'))).toBe('chosen with Ledger')
    const tabStops = items.filter((el) => el.tabIndex === 0)
    expect(tabStops).toHaveLength(1)
    expect(tabStops[0]).toBe(item('Ledger'))
    rerender(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} selected="replica" />)
    expect(item('Replica').getAttribute('aria-selected')).toBe('true')
    expect(item('Replica').hasAttribute('aria-describedby')).toBe(false)
    expect(item('Ledger').getAttribute('aria-selected')).toBe('false')
    expect(classes(item('Ledger'))).not.toContain(TINT)
  })

  test('with `editable` the plus is on the choice alone, in both modes; the words are the app’s', () => {
    const plus = () => screen.queryAllByRole('button', { name: /^Add (after|under) / }).map((el) => el.getAttribute('aria-label'))
    const { unmount } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} editable />)
    expect(plus()).toEqual(['Add after Ledger'])
    unmount()
    const tree = render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} editable />)
    expect(plus()).toEqual(['Add under Ledger'])
    tree.unmount()
    render(
      <WordsProvider words={{ graph: { chosenToo: (item) => `scelto con ${item}` } }}>
        <GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} />
      </WordsProvider>,
    )
    expect(description(thing('Replica'))).toContain('scelto con Ledger')
  })

  test('a new list of the same ids at every draw draws nothing again; an id not in the graph is left out', () => {
    const { rerender } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['ledger', 'replica']} />)
    const before = flowNodes().find((node) => node.id === 'gateway')?.data
    expect(before).toBeDefined()
    rerender(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['ledger', 'replica']} />)
    expect(flowNodes().find((node) => node.id === 'gateway')?.data).toBe(before)
    rerender(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['gone', 'replica']} />)
    const current = things().filter((el) => el.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]).toBe(thing('Replica'))
    expect(stop()).toBe(thing('Replica'))
    // None at all: the Tab stop is on the first thing, as with nothing chosen.
    rerender(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={[]} />)
    expect(things().some((el) => el.hasAttribute('aria-current'))).toBe(false)
    expect(stop()).toBe(thing('Gateway'))
  })
})

describe('an external thing says so in words', () => {
  test('the word «external» after its name, 12px in the muted ink, in its name in both modes, and no border; the name keeps its room and the word is cut first', () => {
    const { unmount } = render(<Calls />)
    const pay = thing('Payments, external')
    const word = pay.querySelector('[data-slot="graph-external"]')
    expect(word?.textContent).toBe('external')
    expect(word?.getAttribute('aria-hidden')).toBe('true')
    expect(classes(word)).toEqual(expect.arrayContaining(['text-2xs', 'text-ink-mute']))
    // In a narrow box the word gives way (it may be cut), while the name keeps 64px.
    expect(classes(word)).toEqual(expect.arrayContaining(['min-w-0', 'truncate']))
    expect(classes(word?.previousElementSibling)).toContain('min-w-16')
    // A thing without the word keeps the name as it was.
    expect(classes(thing('Gateway').querySelector('.truncate')?.parentElement)).toContain('min-w-0')
    // Only on the external thing; never a border on the thing (R4).
    expect(document.querySelectorAll('[data-slot="graph-external"]')).toHaveLength(1)
    expect(classes(pay).some((name) => name.startsWith(BORDER))).toBe(false)
    unmount()
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} />)
    expect(item('Payments, external').textContent).toContain('external')
  })

  test('after its steps on the path and before its second line; on the tint, as its second line; in the app’s words', () => {
    const nodes = NODES.map((node) => (node.id === 'pay' ? { ...node, detail: 'Another team' } : node))
    const { unmount } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={nodes} edges={EDGES} steps={new Map([['pay', [2]]])} />)
    const pay = thing('Payments, step 2, external, Another team')
    expect(classes(pay.querySelector('[data-slot="graph-external"]'))).toEqual(expect.arrayContaining(['text-2xs', 'opacity-80']))
    expect(classes(pay.querySelector('[data-slot="graph-external"]'))).not.toContain('text-ink-mute')
    unmount()
    render(
      <WordsProvider words={{ graph: { external: 'esterno' } }}>
        <Calls />
      </WordsProvider>,
    )
    expect(thing('Payments, esterno').querySelector('[data-slot="graph-external"]')?.textContent).toBe('esterno')
  })
})

describe('in the graph mode a thing says how many it hides (`hiddenCount`)', () => {
  test('the count at its end, as a closed thing of the tree shows it, and in its name, after «external» and before its second line', () => {
    const nodes = NODES.map((node) => (node.id === 'orders' ? { ...node, detail: '3 files' } : node.id === 'pay' ? { ...node, hiddenCount: 3 } : node))
    render(<GraphCanvas aria-label="Calls" model="graph" nodes={nodes} edges={EDGES} />)
    const orders = thing('Orders, hides 12, 3 files')
    expect(orders.querySelector('[data-slot="count"]')?.textContent).toBe('12')
    expect(thing('Payments, external, hides 3').querySelector('[data-slot="count"]')?.textContent).toBe('3')
    // The others hide nothing: no count.
    expect(thing('Gateway').querySelector('[data-slot="count"]')).toBeNull()
  })

  test('0 shows and says nothing; the words are the app’s; the tree mode counts by itself and does not read it', () => {
    const none = NODES.map((node) => (node.id === 'orders' ? { ...node, hiddenCount: 0 } : node))
    const { unmount } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={none} edges={EDGES} />)
    expect(thing('Orders').querySelector('[data-slot="count"]')).toBeNull()
    unmount()
    const words = render(
      <WordsProvider words={{ graph: { hides: (item, count) => `${item}, ne nasconde ${count}` } }}>
        <Calls />
      </WordsProvider>,
    )
    expect(thing('Orders, ne nasconde 12')).toBeTruthy()
    words.unmount()
    // In the tree the orders are open, with what hangs from them in sight.
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} />)
    expect(item('Orders').getAttribute('aria-expanded')).toBe('true')
  })
})

describe('words on a line drawn only while one of its ends is chosen or has the focus, or while it is the path’s', () => {
  test('linesOf: drawn when an end is the chosen thing or among the chosen ones, or when the line is the path’s; a line of `always` (the default) has them always; both are read in the things’ descriptions', () => {
    const label = (chosen: string | ReadonlySet<string> | null, id: string, marked: ReadonlySet<string> | null = null) => linesOf(EDGES, PLACES, { ...OPTIONS, chosen, marked }).lines.find((line) => line.id === id)?.label
    expect(label(null, 'gateway→orders')).toBeUndefined()
    expect(label('ledger', 'gateway→orders')).toBeUndefined()
    expect(label(new Set(['ledger', 'replica']), 'gateway→orders')).toBeUndefined()
    expect(label('gateway', 'gateway→orders')).toBe('calls')
    expect(label(new Set(['replica', 'orders']), 'gateway→orders')).toBe('calls')
    // On the path: the gateway and the orders are two of its things.
    expect(label(null, 'gateway→orders', new Set(['gateway', 'orders']))).toBe('calls')
    expect(label(null, 'gateway→orders', new Set(['orders', 'ledger']))).toBeUndefined()
    expect(label(null, 'orders→pay')).toBe('pays')
    expect(label(new Set(['ledger']), 'orders→pay')).toBe('pays')
    // The line with words is not read again, drawn or not: its words are in the description of its things.
    expect(linesOf(EDGES, PLACES, OPTIONS).lines.find((line) => line.id === 'gateway→orders')?.domAttributes).toEqual({ 'aria-hidden': true })
  })

  test('on the canvas: absent, drawn once the user chooses one of its ends, gone when another thing is chosen; heard all along', () => {
    render(<Calls />)
    const line = () => between('gateway', 'orders')[0]
    expect(line()).toBeDefined()
    expect(line()?.label).toBeUndefined()
    expect(description(thing('Orders, hides 12'))).toContain('calls, from Gateway')
    fireEvent.keyDown(thing('Gateway'), { key: 'Enter' })
    expect(line()?.label).toBe('calls')
    fireEvent.keyDown(thing('Payments, external'), { key: 'Enter' })
    expect(line()?.label).toBeUndefined()
    // A line of `always` keeps its words whatever is chosen.
    expect(between('orders', 'pay')[0]?.label).toBe('pays')
    fireEvent.keyDown(thing('Orders, hides 12'), { key: 'Enter' })
    expect(line()?.label).toBe('calls')
  })

  test('on the canvas: drawn while one of its ends has the focus, with the arrows too, and gone once the focus is on another thing or out of the canvas; the other lines are handed over as they were', () => {
    render(<Calls />)
    const line = () => between('gateway', 'orders')[0]
    const other = between('orders', 'pay')[0]
    act(() => thing('Orders, hides 12').focus())
    expect(line()?.label).toBe('calls')
    // Only the line whose words show is new: the others are the same lines.
    expect(between('orders', 'pay')[0]).toBe(other)
    act(() => thing('Payments, external').focus())
    expect(line()?.label).toBeUndefined()
    // Left from the orders goes back along their first line in, to the gateway: one of its ends.
    fireEvent.keyDown(thing('Orders, hides 12'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(thing('Gateway'))
    expect(line()?.label).toBe('calls')
    act(() => thing('Gateway').blur())
    expect(line()?.label).toBeUndefined()
  })

  test('on the canvas: drawn while the line is the path’s, with nothing chosen', () => {
    render(<Calls steps={new Map([['gateway', [1]], ['orders', [2]]])} />)
    expect(between('gateway', 'orders')[0]?.label).toBe('calls')
  })
})

describe('two edges between the same two things are two lines', () => {
  test('each with the app’s id, its words and its dash, drawn side by side', () => {
    render(<Calls />)
    const lines = between('orders', 'ledger')
    expect(lines.map((line) => line.id)).toEqual(['call:orders-ledger', 'data:orders-ledger'])
    expect(lines.map((line) => line.label)).toEqual(['calls', 'writes'])
    expect(lines[1]?.className).toBe('sigrid-graph-dashed')
    expect(lines.map((line) => line.type)).toEqual(['apart', 'apart'])
    expect(lines.map(offsetOf)).toEqual([-10, 10])
    // A line alone between its two things is drawn as before.
    expect(between('orders', 'pay')[0]?.type).toBe('smoothstep')
    expect(offsetOf(between('orders', 'pay')[0])).toBeUndefined()
    // Both are said in the description of the orders.
    expect(description(thing('Orders, hides 12'))).toContain('calls, to Ledger. writes, to Ledger')
  })

  test('without ids: the first keeps the name of its two ends, a second one that differs has a number; an id given twice is told apart too', () => {
    const edges: GraphEdge[] = [
      { from: 'orders', to: 'ledger', label: 'calls' },
      { from: 'orders', to: 'ledger', label: 'writes' },
      { from: 'orders', to: 'ledger', kind: 'link' },
      { from: 'orders', to: 'ledger', kind: 'link', label: 'audits' },
      { id: 'same', from: 'gateway', to: 'orders' },
      { id: 'same', from: 'gateway', to: 'replica' },
      // An empty id names nothing.
      { id: '', from: 'orders', to: 'pay' },
    ]
    const { lines, edgeOf } = linesOf(edges, PLACES, OPTIONS)
    expect(lines.map((line) => line.id)).toEqual(['orders→ledger', 'orders→ledger#2', 'orders→ledger#link', 'orders→ledger#link#2', 'same', 'same#2', 'orders→pay'])
    expect(lines.map((line) => line.label)).toEqual(['calls', 'writes', undefined, 'audits', undefined, undefined, undefined])
    for (const [at, line] of lines.entries()) expect(edgeOf.get(line.id), line.id).toBe(edges[at])
    // The four lines between the orders and the ledger, side by side within 16px of the middle of their sides.
    expect(lines.slice(0, 4).map((line) => Math.round((offsetOf(line) ?? Number.NaN) * 100) / 100)).toEqual([-16, -5.33, 5.33, 16])
  })

  test('linesOf: lines side by side are moved apart, two or three, around the middle; with the app’s routes each follows its own; a line that goes round keeps to its own group', () => {
    const two = linesOf(EDGES, PLACES, OPTIONS).lines.filter((line) => line.source === 'orders' && line.target === 'ledger')
    expect(two.map(offsetOf)).toEqual([-10, 10])
    const three = linesOf([...EDGES, { from: 'orders', to: 'ledger', kind: 'link', label: 'audits' }], PLACES, OPTIONS).lines.filter((line) => line.source === 'orders' && line.target === 'ledger')
    expect(three.map(offsetOf)).toEqual([-16, 0, 16])
    expect(new Set(three.map(offsetOf)).size).toBe(3)
    // With the app's places and routes, a line with a route follows it; one without is alone, as before.
    const route = [{ x: 0, y: 0 }, { x: 300, y: 0 }]
    const routed = linesOf([{ id: 'a', from: 'orders', to: 'ledger', points: route }, { id: 'b', from: 'orders', to: 'ledger', points: route }, { id: 'c', from: 'orders', to: 'ledger' }], PLACES, { ...OPTIONS, routes: true }).lines
    expect(routed.map((line) => line.type)).toEqual(['route', 'route', 'smoothstep'])
    expect(routed.map(offsetOf)).toEqual([undefined, undefined, undefined])
    // Two `link` lines from the ledger back to the orders arrive on the far side: a group of their own.
    const back = linesOf([{ from: 'ledger', to: 'orders', kind: 'link', label: 'reads' }, { from: 'ledger', to: 'orders', kind: 'link', label: 'audits' }, { from: 'orders', to: 'ledger' }], PLACES, OPTIONS).lines
    expect(back.map((line) => [line.targetHandle, line.type, offsetOf(line)])).toEqual([['side', 'apart', -10], ['side', 'apart', 10], [undefined, 'smoothstep', undefined]])
  })

  test('drawn side by side: two lines between the same two sides, as React Flow draws them, never on each other', () => {
    render(<Calls />)
    const [call, data] = between('orders', 'ledger')
    const Line = (handed.props?.edgeTypes ?? {})['apart'] as React.ComponentType<EdgeProps> | undefined
    expect(Line).toBeDefined()
    if (!Line || !call || !data) return
    // React Flow hands a line the ends it measures, which jsdom cannot: two things at the same height, one rank apart.
    const draw = (line: Edge, targetY: number) => {
      const { container, unmount } = render(
        <svg>
          <Line id={line.id} source={line.source} target={line.target} data={line.data} sourceX={0} sourceY={0} targetX={200} targetY={targetY} sourcePosition={Position.Right} targetPosition={Position.Left} markerEnd="url('#arrow')" />
        </svg>,
      )
      const path = container.querySelector('path.react-flow__edge-path')
      const d = path?.getAttribute('d') ?? ''
      const marker = path?.getAttribute('marker-end')
      unmount()
      return { d, marker, points: pointsOf(d) }
    }
    const level = [draw(call, 0), draw(data, 0)]
    // Straight across, 20px apart: every point of one line 10px above the middle, of the other 10px below.
    expect(level[0]?.points.length).toBeGreaterThan(1)
    expect(level[0]?.points.every((at) => at.y === -10)).toBe(true)
    expect(level[1]?.points.every((at) => at.y === 10)).toBe(true)
    expect(level[0]?.d).not.toBe(level[1]?.d)
    expect(level[0]?.marker).toBe("url('#arrow')")
    // To a thing lower down: both bend, each at its own place, so neither runs along the other.
    const lower = [draw(call, 80), draw(data, 80)]
    expect(lower[0]?.d).not.toBe(lower[1]?.d)
    const xs = lower.map((it) => new Set(it.points.map((at) => at.x)))
    expect([...(xs[0] ?? [])].filter((x) => x !== 0 && x !== 200 && xs[1]?.has(x))).toEqual([])
  })

  test('exact copies of an edge without an id are one line, said once; an edge with an id is always its own; editable takes the copies away together', () => {
    const copies: GraphEdge[] = [
      { from: 'orders', to: 'pay', label: 'pays' },
      // The same, its defaults written out.
      { from: 'orders', to: 'pay', label: 'pays', kind: 'child', style: 'solid', tone: 'default', directed: false, labelShown: 'always' },
      // The same with an id: a line of its own.
      { id: 'refund', from: 'orders', to: 'pay', label: 'pays' },
      // Another tone: a line of its own, numbered.
      { from: 'orders', to: 'pay', label: 'pays', tone: 'warning' },
    ]
    const edges = [...EDGES.filter((edge) => edge.to !== 'pay'), ...copies]
    const { lines, edgeOf } = linesOf(edges, PLACES, OPTIONS)
    const toPay = lines.filter((line) => line.target === 'pay')
    expect(toPay.map((line) => line.id)).toEqual(['orders→pay', 'refund', 'orders→pay#2'])
    expect(edgeOf.get('orders→pay')).toBe(copies[0])
    expect(edgeOf.get('orders→pay#2')).toBe(copies[3])
    // Three lines side by side: the copy is not one of them.
    expect(toPay.map(offsetOf)).toEqual([-16, 0, 16])
    // Two exact copies alone are one line, drawn as a line alone.
    const alone = linesOf([copies[0]!, copies[1]!], PLACES, OPTIONS).lines
    expect(alone.map((line) => [line.id, line.type, offsetOf(line)])).toEqual([['orders→pay', 'smoothstep', undefined]])
    // A route of its own makes an edge a line of its own.
    expect(linesOf([copies[0]!, { ...copies[0]!, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }], PLACES, OPTIONS).lines).toHaveLength(2)

    const changed = vi.fn<(next: Graph, change: GraphChange) => void>()
    render(<Calls edges={edges} editable onChange={changed} />)
    // Said once in the description of the payments for the two copies, then for the line with an id and the warning.
    expect(description(thing('Payments, external'))).toContain('pays, from Orders. pays, from Orders. pays, from Orders')
    expect(description(thing('Payments, external'))).not.toContain('pays, from Orders. pays, from Orders. pays, from Orders. pays')
    const line = between('orders', 'pay').find((it) => it.id === 'orders→pay')
    expect(line).toBeDefined()
    if (!line) return
    act(() => handed.props?.onDelete?.({ nodes: [], edges: [line] }))
    expect(changed).toHaveBeenCalledTimes(1)
    const [next, change] = changed.mock.calls[0]!
    expect(change).toEqual({ kind: 'remove', nodes: [], edges: [copies[0], copies[1]] })
    expect(next.edges).toEqual(edges.filter((edge) => edge !== copies[0] && edge !== copies[1]))
  })

  test('editable: taking one line away of two with ids takes that edge alone', () => {
    const changed = vi.fn<(next: Graph, change: GraphChange) => void>()
    render(<Calls editable onChange={changed} />)
    const data = between('orders', 'ledger').find((line) => line.id === 'data:orders-ledger')
    expect(data).toBeDefined()
    if (!data) return
    act(() => handed.props?.onDelete?.({ nodes: [], edges: [data] }))
    expect(changed).toHaveBeenCalledTimes(1)
    const [next, change] = changed.mock.calls[0]!
    expect(change).toEqual({ kind: 'remove', nodes: [], edges: [EDGES[2]] })
    expect(next.edges).toEqual(EDGES.filter((_, at) => at !== 2))
  })
})

describe('the path has one line between two of its things', () => {
  test('the first of the lines between them, in the order of the edges: the accent, or the line’s own tone kept, thicker; the others as they are', () => {
    const edges: GraphEdge[] = [
      { from: 'gateway', to: 'orders', tone: 'warning', directed: true },
      { id: 'call', from: 'orders', to: 'ledger', label: 'calls' },
      { id: 'data', from: 'orders', to: 'ledger', label: 'writes', style: 'dashed' },
      // Back the other way between the same two things: not a second line of the path.
      { from: 'ledger', to: 'orders', kind: 'link', tone: 'destructive' },
      { from: 'orders', to: 'pay' },
    ]
    const marked = new Set(['gateway', 'orders', 'ledger'])
    const { lines } = linesOf(edges, PLACES, { ...OPTIONS, marked, dimmed: new Set(['pay', 'replica']) })
    const line = (id: string) => lines.find((it) => it.id === id)
    // A warning stays a warning on the path, its arrowhead too.
    expect(line('gateway→orders')?.className).toBe('sigrid-graph-warning sigrid-graph-path')
    expect(line('gateway→orders')?.markerEnd).toMatchObject({ color: 'var(--color-warning)' })
    // One line of the two between the orders and the ledger takes the accent.
    expect(line('call')?.className).toBe('sigrid-graph-accent sigrid-graph-path')
    expect(line('data')?.className).toBe('sigrid-graph-dashed')
    expect(line('ledger→orders#link')?.className).toBe('sigrid-graph-destructive')
    expect(line('ledger→orders#link')?.markerEnd).toMatchObject({ color: 'var(--color-destructive)' })
    expect(lines.filter((it) => (it.className ?? '').split(' ').includes('sigrid-graph-path')).map((it) => it.id)).toEqual(['gateway→orders', 'call'])
    // Off the path, to a dimmed thing: dimmed.
    expect(line('orders→pay')?.className).toBe('sigrid-graph-dim')
  })

  test('on the canvas: with two lines between two things of the path, one has the accent', () => {
    render(<Calls steps={new Map([['orders', [1]], ['ledger', [2]]])} />)
    expect(between('orders', 'ledger').map((line) => line.className)).toEqual(['sigrid-graph-accent sigrid-graph-path', 'sigrid-graph-dashed'])
  })
})
