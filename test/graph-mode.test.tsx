// The graph mode of the canvas (`GraphCanvas` with `model="graph"`): the lines are relations (calls, imports, data),
// not «hangs from». Nothing closes and every thing is in sight; the arrows follow the lines; a double press or the ›
// of a thing asks the app to open it; +, − and 0 zoom in both modes. jsdom lays nothing out and React Flow measures
// the page, so the zoom is seen in what the canvas asks of React Flow's view, never in the drawing.
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { GraphCanvas, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'

// What the canvas asks of the view: the rest of React Flow is its own.
const view = vi.hoisted(() => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }))
vi.mock('@xyflow/react', async (importOriginal) => {
  const flow = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...flow,
    useReactFlow: () => ({
      ...flow.useReactFlow(),
      zoomIn: (options?: unknown) => {
        view.zoomIn(options)
        return Promise.resolve(true)
      },
      zoomOut: (options?: unknown) => {
        view.zoomOut(options)
        return Promise.resolve(true)
      },
      fitView: (options?: unknown) => {
        view.fitView(options)
        return Promise.resolve(true)
      },
    }),
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
  for (const fn of Object.values(view)) fn.mockClear()
})

// The calls between the parts of a service, in the app's order. Down and Up go through this order; Right and Left
// follow the first line out of a thing and the first line into it.
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'orders', label: 'Orders' },
  { id: 'auth', label: 'Sign-in' },
  { id: 'store', label: 'Store' },
  { id: 'mail', label: 'Mail' },
]
const EDGES: GraphEdge[] = [
  { from: 'gateway', to: 'auth' },
  { from: 'gateway', to: 'orders' },
  // Two lines into the store: the first one given comes from the orders.
  { from: 'orders', to: 'store' },
  { from: 'auth', to: 'store' },
  { from: 'orders', to: 'mail' },
]

function Calls(props: Partial<GraphCanvasProps>) {
  const [selected, setSelected] = React.useState<string | null>(null)
  return <GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} selected={selected} onSelect={setSelected} {...props} />
}
const thing = (name: string) => screen.getByRole('button', { name })
const things = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="graph-node"]'))
/** The thing that has the Tab stop: where the keys left the focus. */
const stop = () => things().find((el) => el.tabIndex === 0)!

describe('nothing closes', () => {
  test('it is a graph, not a tree: every thing is in sight, none has an arrow, and one is the Tab stop', () => {
    // A closed list passed by mistake closes nothing here.
    render(<Calls defaultCollapsed={['gateway', 'orders']} />)
    const canvas = screen.getByRole('application', { name: 'Calls' })
    expect(canvas.getAttribute('aria-roledescription')).toBe('graph')
    expect(screen.queryByRole('tree')).toBeNull()
    expect(screen.queryAllByRole('treeitem')).toHaveLength(0)
    expect(document.querySelectorAll('[data-slot="graph-toggle"]')).toHaveLength(0)
    expect(things()).toHaveLength(NODES.length)
    for (const node of NODES) {
      const el = thing(node.label)
      expect(el.hasAttribute('aria-expanded')).toBe(false)
      expect(el.hasAttribute('aria-level')).toBe(false)
      expect(el.getAttribute('aria-pressed')).toBe('false')
    }
    expect(things().filter((el) => el.tabIndex === 0)).toHaveLength(1)
    expect(stop()).toBe(thing('Gateway'))
  })

  test('Enter chooses: the chosen thing is pressed, the others are not', () => {
    render(<Calls />)
    fireEvent.keyDown(thing('Orders'), { key: 'Enter' })
    expect(thing('Orders').getAttribute('aria-pressed')).toBe('true')
    expect(thing('Gateway').getAttribute('aria-pressed')).toBe('false')
    expect(things()).toHaveLength(NODES.length)
  })
})

describe('the keys follow the lines', () => {
  test('to the end of the line: Right along the first line out, Left back along the first line in, Down and Up through the order', () => {
    render(<Calls />)
    expect(stop()).toBe(thing('Gateway'))
    fireEvent.keyDown(stop(), { key: 'ArrowRight' })
    expect(stop()).toBe(thing('Sign-in'))
    fireEvent.keyDown(stop(), { key: 'ArrowRight' })
    expect(stop()).toBe(thing('Store'))
    // Back along the first line into the store, which is not the one the focus came by.
    fireEvent.keyDown(stop(), { key: 'ArrowLeft' })
    expect(stop()).toBe(thing('Orders'))
    fireEvent.keyDown(stop(), { key: 'ArrowLeft' })
    expect(stop()).toBe(thing('Gateway'))
    // Nothing comes into the gateway: Left stays.
    fireEvent.keyDown(stop(), { key: 'ArrowLeft' })
    expect(stop()).toBe(thing('Gateway'))
    fireEvent.keyDown(stop(), { key: 'ArrowDown' })
    expect(stop()).toBe(thing('Orders'))
    fireEvent.keyDown(stop(), { key: 'ArrowDown' })
    expect(stop()).toBe(thing('Sign-in'))
    fireEvent.keyDown(stop(), { key: 'ArrowUp' })
    expect(stop()).toBe(thing('Orders'))
    // The keys are the canvas's: the page does not also scroll.
    expect(fireEvent.keyDown(stop(), { key: 'ArrowRight' })).toBe(false)
    expect(stop()).toBe(thing('Store'))
  })

  test('Home and End reach the first and the last thing of the order', () => {
    render(<Calls />)
    fireEvent.keyDown(stop(), { key: 'End' })
    expect(stop()).toBe(thing('Mail'))
    // Nothing goes out of the mail.
    fireEvent.keyDown(stop(), { key: 'ArrowRight' })
    expect(stop()).toBe(thing('Mail'))
    fireEvent.keyDown(stop(), { key: 'Home' })
    expect(stop()).toBe(thing('Gateway'))
  })

  test('downwards the axes swap: Down along the first line out, Up back, Right and Left through the order', () => {
    render(<Calls direction="down" />)
    fireEvent.keyDown(stop(), { key: 'ArrowDown' })
    expect(stop()).toBe(thing('Sign-in'))
    fireEvent.keyDown(stop(), { key: 'ArrowUp' })
    expect(stop()).toBe(thing('Gateway'))
    fireEvent.keyDown(stop(), { key: 'ArrowRight' })
    expect(stop()).toBe(thing('Orders'))
    fireEvent.keyDown(stop(), { key: 'ArrowLeft' })
    expect(stop()).toBe(thing('Gateway'))
  })
})

describe('opening is the app’s', () => {
  test('a double press or the › of a thing calls onOpen with its id; the › chooses nothing, and nothing closes', () => {
    const opened = vi.fn<(id: string) => void>()
    const chose = vi.fn<(id: string | null) => void>()
    render(<Calls onOpen={opened} onSelect={chose} />)
    fireEvent.doubleClick(thing('Orders'))
    expect(opened.mock.calls).toEqual([['orders']])
    fireEvent.click(screen.getByRole('button', { name: 'Open Sign-in' }))
    expect(opened.mock.calls).toEqual([['orders'], ['auth']])
    expect(chose).not.toHaveBeenCalled()
    expect(things()).toHaveLength(NODES.length)
    // The › of the thing with the Tab stop is the next Tab stop: the way to open from the keyboard.
    expect(screen.getByRole('button', { name: 'Open Gateway' }).tabIndex).toBe(0)
    expect(screen.getByRole('button', { name: 'Open Orders' }).tabIndex).toBe(-1)
  })

  test('without onOpen there is no › and a double press opens nothing', () => {
    render(<Calls />)
    expect(document.querySelectorAll('[data-slot="graph-open"]')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Open Orders' })).toBeNull()
    fireEvent.doubleClick(thing('Orders'))
    expect(things()).toHaveLength(NODES.length)
  })

  test("the words are the app's", () => {
    render(
      <WordsProvider words={{ graph: { role: 'grafo', open: (item) => `Apri ${item}` } }}>
        <Calls onOpen={() => {}} />
      </WordsProvider>,
    )
    expect(screen.getByRole('application', { name: 'Calls' }).getAttribute('aria-roledescription')).toBe('grafo')
    expect(screen.getByRole('button', { name: 'Apri Mail' })).toBeTruthy()
  })
})

describe('+, − and 0 zoom in both modes', () => {
  test.each(['graph', 'tree'] as const)('in the %s mode, from a thing, as the buttons do; a field keeps its keys, and with Ctrl they are the browser’s', (model) => {
    render(<Calls model={model} search />)
    const first = things()[0]!
    fireEvent.keyDown(first, { key: '+' })
    expect(view.zoomIn).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(first, { key: '-' })
    expect(view.zoomOut).toHaveBeenCalledTimes(1)
    expect(fireEvent.keyDown(first, { key: '0' })).toBe(false)
    expect(view.fitView).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(first, { key: '+', ctrlKey: true })
    expect(view.zoomIn).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Find' }), { key: '0' })
    expect(view.fitView).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fit the view' }))
    expect(view.zoomIn).toHaveBeenCalledTimes(2)
    expect(view.fitView).toHaveBeenCalledTimes(2)
  })
})

describe('the tree mode is the default and is as it was', () => {
  test('a tree of items with their arrows; onOpen is not the tree’s', () => {
    const opened = vi.fn<(id: string) => void>()
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} onOpen={opened} />)
    expect(screen.getByRole('tree', { name: 'Calls' })).toBeTruthy()
    // React Flow's own box is an application in both modes; the canvas named «Calls» is a tree here.
    expect(screen.queryByRole('application', { name: 'Calls' })).toBeNull()
    expect(screen.getAllByRole('treeitem')).toHaveLength(NODES.length)
    const gateway = screen.getByRole('treeitem', { name: 'Gateway' })
    expect(gateway.getAttribute('aria-expanded')).toBe('true')
    expect(gateway.getAttribute('aria-level')).toBe('1')
    expect(screen.getByRole('button', { name: 'Close Gateway' })).toBeTruthy()
    expect(document.querySelectorAll('[data-slot="graph-open"]')).toHaveLength(0)
    fireEvent.doubleClick(screen.getByRole('treeitem', { name: 'Orders' }))
    expect(opened).not.toHaveBeenCalled()
    // Left on an open thing closes it, as a tree's key does.
    fireEvent.keyDown(gateway, { key: 'ArrowLeft' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(1)
  })
})
