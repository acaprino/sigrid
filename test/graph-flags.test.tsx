// What an app marks on the things and the lines of the canvas (`GraphCanvas`) when it draws a graph of its own model
// (one of its things drawn in several places, a service of another, a group it has not opened, a call and data that
// flow between the same two parts): several things chosen, each with the selection tint, and one Tab stop; the word
// «external»; in the graph mode the count of what a thing hides, in its name; words on a line drawn only while one of
// its ends is chosen; two lines between the same two things. jsdom lays nothing out and React Flow draws a line only
// once it has measured its ends, so the lines are read in what the canvas hands React Flow, and from `linesOf`.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Edge, Node, ReactFlowProps } from '@xyflow/react'
import { WordsProvider } from '../src'
import { linesOf } from '../src/components/GraphCanvas'
import { GraphCanvas, type Graph, type GraphCanvasProps, type GraphChange, type GraphEdge, type GraphNode } from '../src/graph'

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
  { id: 'orders', label: 'Orders', hidden: 12 },
  { id: 'ledger', label: 'Ledger' },
  { id: 'replica', label: 'Replica' },
  { id: 'pay', label: 'Payments', external: true },
]
const EDGES: GraphEdge[] = [
  // Its words only while the gateway or the orders are chosen.
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
const things = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="graph-node"]'))
/** The thing that has the Tab stop, once it is seen to be the only one. */
const stop = () => {
  const all = things().filter((el) => el.tabIndex === 0)
  expect(all).toHaveLength(1)
  return all[0]
}
const classes = (el: Element | null) => (el?.className ?? '').split(' ')
/** What screen readers hear after the name of a thing: the texts its `aria-describedby` points to. */
const description = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' · ')
/** What the canvas handed React Flow at its last draw. */
const flowNodes = () => (handed.props?.nodes ?? []) as Node[]
const flowEdges = () => (handed.props?.edges ?? []) as Edge[]
const between = (from: string, to: string) => flowEdges().filter((edge) => edge.source === from && edge.target === to)
/** Places for `linesOf`, which needs only that both ends of a line are in sight. */
const PLACES = new Map(NODES.map((node, at): [string, { x: number; y: number }] => [node.id, { x: at * 300, y: 0 }]))

describe('several things chosen', () => {
  test('in the graph mode each has the selection tint and is current, the first in the order holds the one Tab stop, and the user still chooses one', () => {
    const chose = vi.fn<(id: string | null) => void>()
    // Given out of the order of the things: the Tab stop is on the first of them in that order.
    render(<GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} onSelect={chose} />)
    for (const name of ['Ledger', 'Replica']) {
      expect(thing(name).getAttribute('aria-current'), name).toBe('true')
      expect(classes(thing(name)), name).toContain(TINT)
    }
    for (const name of ['Gateway', 'Orders, hides 12', 'Payments, external']) {
      expect(thing(name).hasAttribute('aria-current'), name).toBe(false)
      expect(classes(thing(name)), name).not.toContain(TINT)
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

  test('in the tree mode each is selected and the tree says it holds more than one; one id is as before', () => {
    const { rerender } = render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} selected={['replica', 'ledger']} />)
    const tree = screen.getByRole('tree', { name: 'Calls' })
    expect(tree.getAttribute('aria-multiselectable')).toBe('true')
    const items = screen.getAllByRole('treeitem')
    expect(items.filter((el) => el.getAttribute('aria-selected') === 'true').map((el) => el.getAttribute('aria-label')).sort()).toEqual(['Ledger', 'Replica'])
    // The tree's order: the gateway, the orders and what hangs from them, then the replica.
    const tabStops = items.filter((el) => el.tabIndex === 0)
    expect(tabStops).toHaveLength(1)
    expect(tabStops[0]).toBe(screen.getByRole('treeitem', { name: 'Ledger' }))
    rerender(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} selected="replica" />)
    expect(tree.hasAttribute('aria-multiselectable')).toBe(false)
    expect(screen.getByRole('treeitem', { name: 'Replica' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('treeitem', { name: 'Ledger' }).getAttribute('aria-selected')).toBe('false')
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
  test('the word «external» after its name in the muted ink, in its name in both modes, and no border', () => {
    const { unmount } = render(<Calls />)
    const pay = thing('Payments, external')
    const word = pay.querySelector('[data-slot="graph-external"]')
    expect(word?.textContent).toBe('external')
    expect(word?.getAttribute('aria-hidden')).toBe('true')
    expect(classes(word)).toContain('text-ink-mute')
    // Only on the external thing; never a border on the thing (R4).
    expect(document.querySelectorAll('[data-slot="graph-external"]')).toHaveLength(1)
    expect(classes(pay).some((name) => name.startsWith(BORDER))).toBe(false)
    unmount()
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} />)
    expect(screen.getByRole('treeitem', { name: 'Payments, external' }).textContent).toContain('external')
  })

  test('after its steps on the path and before its second line; on the tint, as its second line; in the app’s words', () => {
    const nodes = NODES.map((node) => (node.id === 'pay' ? { ...node, detail: 'Another team' } : node))
    const { unmount } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={nodes} edges={EDGES} steps={new Map([['pay', [2]]])} />)
    const pay = thing('Payments, step 2, external, Another team')
    expect(classes(pay.querySelector('[data-slot="graph-external"]'))).toContain('opacity-80')
    unmount()
    render(
      <WordsProvider words={{ graph: { external: 'esterno' } }}>
        <Calls />
      </WordsProvider>,
    )
    expect(thing('Payments, esterno').querySelector('[data-slot="graph-external"]')?.textContent).toBe('esterno')
  })
})

describe('in the graph mode a thing says how many it hides', () => {
  test('the count at its end, as a closed thing of the tree shows it, and in its name, after «external» and before its second line', () => {
    const nodes = NODES.map((node) => (node.id === 'orders' ? { ...node, detail: '3 files' } : node.id === 'pay' ? { ...node, hidden: 3 } : node))
    render(<GraphCanvas aria-label="Calls" model="graph" nodes={nodes} edges={EDGES} />)
    const orders = thing('Orders, hides 12, 3 files')
    expect(orders.querySelector('[data-slot="count"]')?.textContent).toBe('12')
    expect(thing('Payments, external, hides 3').querySelector('[data-slot="count"]')?.textContent).toBe('3')
    // The others hide nothing: no count.
    expect(thing('Gateway').querySelector('[data-slot="count"]')).toBeNull()
  })

  test('0 shows and says nothing; the words are the app’s; the tree mode counts by itself and does not read it', () => {
    const none = NODES.map((node) => (node.id === 'orders' ? { ...node, hidden: 0 } : node))
    const { unmount } = render(<GraphCanvas aria-label="Calls" model="graph" nodes={none} edges={EDGES} />)
    expect(thing('Orders').querySelector('[data-slot="count"]')).toBeNull()
    unmount()
    const words = render(
      <WordsProvider words={{ graph: { hides: (item, hidden) => `${item}, ne nasconde ${hidden}` } }}>
        <Calls />
      </WordsProvider>,
    )
    expect(thing('Orders, ne nasconde 12')).toBeTruthy()
    words.unmount()
    // In the tree the orders are open, with what hangs from them in sight.
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} />)
    const orders = screen.getByRole('treeitem', { name: 'Orders' })
    expect(orders.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('words on a line drawn only while one of its ends is chosen', () => {
  const options = { direction: 'right', marked: null, dimmed: null, editable: false } as const

  test('linesOf: drawn when an end is the chosen thing or among the chosen ones; a line of `always` (the default) has them always; both are read in the things’ descriptions', () => {
    const label = (chosen: string | ReadonlySet<string> | null, id: string) => linesOf(EDGES, PLACES, { ...options, chosen }).lines.find((line) => line.id === id)?.label
    expect(label(null, 'gateway→orders')).toBeUndefined()
    expect(label('ledger', 'gateway→orders')).toBeUndefined()
    expect(label(new Set(['ledger', 'replica']), 'gateway→orders')).toBeUndefined()
    expect(label('gateway', 'gateway→orders')).toBe('calls')
    expect(label(new Set(['replica', 'orders']), 'gateway→orders')).toBe('calls')
    expect(label(null, 'orders→pay')).toBe('pays')
    expect(label(new Set(['ledger']), 'orders→pay')).toBe('pays')
    // The line with words is not read again, drawn or not: its words are in the description of its things.
    expect(linesOf(EDGES, PLACES, { ...options, chosen: null }).lines.find((line) => line.id === 'gateway→orders')?.domAttributes).toEqual({ 'aria-hidden': true })
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
})

describe('two edges between the same two things are two lines', () => {
  test('each with the app’s id, its words and its dash', () => {
    render(<Calls />)
    const lines = between('orders', 'ledger')
    expect(lines.map((line) => line.id)).toEqual(['call:orders-ledger', 'data:orders-ledger'])
    expect(lines.map((line) => line.label)).toEqual(['calls', 'writes'])
    expect(lines[1]?.className).toBe('sigrid-graph-dashed')
    // Both are said in the description of the orders.
    expect(description(thing('Orders, hides 12'))).toContain('calls, to Ledger. writes, to Ledger')
  })

  test('without ids: the first keeps the name of its two ends, a second one has a number; an id given twice is told apart too', () => {
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
    const { lines, edgeOf } = linesOf(edges, PLACES, { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false })
    expect(lines.map((line) => line.id)).toEqual(['orders→ledger', 'orders→ledger#2', 'orders→ledger#link', 'orders→ledger#link#2', 'same', 'same#2', 'orders→pay'])
    expect(lines.map((line) => line.label)).toEqual(['calls', 'writes', undefined, 'audits', undefined, undefined, undefined])
    for (const [at, line] of lines.entries()) expect(edgeOf.get(line.id), line.id).toBe(edges[at])
  })

  test('editable: taking one line away takes that edge alone', () => {
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
