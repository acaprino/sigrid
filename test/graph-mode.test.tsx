// The graph mode of the canvas (`GraphCanvas` with `model="graph"`): the lines are relations (calls, imports, data),
// not «hangs from». Nothing closes and every thing is in sight; the arrows follow the lines, from a thing or from its
// ›; a double press or the › of a thing the app opens (`openLabel`) asks the app to open it; +, − and 0 zoom in both
// modes. jsdom lays nothing out and React Flow measures the page, so the zoom is seen in what the canvas asks of React
// Flow's view, never in the drawing.
import { act, fireEvent, render, screen } from '@testing-library/react'
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
// follow the first line out of a thing and the first line into it. The app opens the gateway and the orders (they
// hold parts of their own), not the others.
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway', openLabel: 'Open Gateway' },
  { id: 'orders', label: 'Orders', openLabel: 'Open Orders' },
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
/** The names of the › buttons drawn. */
const opens = () => Array.from(document.querySelectorAll('[data-slot="graph-open"]')).map((el) => el.getAttribute('aria-label')).sort()
/** What screen readers hear after the name of a thing: the text its `aria-describedby` points to. */
const described = (el: HTMLElement) => {
  const id = el.getAttribute('aria-describedby')
  return id ? (document.getElementById(id)?.textContent ?? '') : ''
}

describe('nothing closes', () => {
  test('it is a graph, not a tree: a group named by the app and called a graph, every thing in sight, none with an arrow, one Tab stop', () => {
    // A closed list passed by mistake closes nothing here.
    render(<Calls defaultCollapsed={['gateway', 'orders']} />)
    // React Flow's own box is an application in both modes: the canvas named by the app is a group, not a second one.
    const canvas = screen.getByRole('group', { name: 'Calls' })
    expect(canvas.getAttribute('data-slot')).toBe('graph')
    expect(canvas.getAttribute('aria-roledescription')).toBe('graph')
    expect(screen.queryByRole('application', { name: 'Calls' })).toBeNull()
    expect(screen.queryByRole('tree')).toBeNull()
    expect(screen.queryAllByRole('treeitem')).toHaveLength(0)
    expect(document.querySelectorAll('[data-slot="graph-toggle"]')).toHaveLength(0)
    expect(things()).toHaveLength(NODES.length)
    for (const node of NODES) {
      const el = thing(node.label)
      expect(el.hasAttribute('aria-expanded')).toBe(false)
      expect(el.hasAttribute('aria-level')).toBe(false)
      expect(el.hasAttribute('aria-pressed')).toBe(false)
      expect(el.hasAttribute('aria-current')).toBe(false)
    }
    expect(things().filter((el) => el.tabIndex === 0)).toHaveLength(1)
    expect(stop()).toBe(thing('Gateway'))
  })

  test('Enter and Space choose: the chosen thing is the current one, a single choice and not a toggle', () => {
    render(<Calls />)
    fireEvent.keyDown(thing('Orders'), { key: 'Enter' })
    expect(thing('Orders').getAttribute('aria-current')).toBe('true')
    expect(thing('Orders').hasAttribute('aria-pressed')).toBe(false)
    expect(thing('Gateway').hasAttribute('aria-current')).toBe(false)
    fireEvent.keyDown(thing('Mail'), { key: ' ' })
    expect(thing('Mail').getAttribute('aria-current')).toBe('true')
    expect(thing('Orders').hasAttribute('aria-current')).toBe(false)
    expect(things()).toHaveLength(NODES.length)
  })
})

describe('what a screen reader hears of a thing', () => {
  test('its name holds its second line, and its description says where its lines lead and where they come from', () => {
    render(<Calls nodes={NODES.map((node) => (node.id === 'orders' ? { ...node, detail: '12 functions' } : node))} />)
    expect(described(thing('Orders, 12 functions'))).toBe('leads to Store, Mail · comes from Gateway')
    expect(described(thing('Gateway'))).toBe('leads to Sign-in, Orders')
    // The lines into the store in the order the app gave them.
    expect(described(thing('Store'))).toBe('comes from Orders, Sign-in')
    expect(described(thing('Mail'))).toBe('comes from Orders')
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

  test('from the › of a thing the arrows, Home and End move as from the thing; Enter is the ›’s own', () => {
    render(<Calls onOpen={() => {}} />)
    const gateway = screen.getByRole('button', { name: 'Open Gateway' })
    act(() => gateway.focus())
    fireEvent.keyDown(gateway, { key: 'ArrowRight' })
    expect(stop()).toBe(thing('Sign-in'))
    expect(document.activeElement).toBe(thing('Sign-in'))
    // From the › of the orders, which is not the Tab stop: Left back along their first line in, End, Home.
    const orders = screen.getByRole('button', { name: 'Open Orders' })
    fireEvent.keyDown(orders, { key: 'ArrowLeft' })
    expect(stop()).toBe(thing('Gateway'))
    fireEvent.keyDown(orders, { key: 'End' })
    expect(stop()).toBe(thing('Mail'))
    fireEvent.keyDown(orders, { key: 'Home' })
    expect(stop()).toBe(thing('Gateway'))
    fireEvent.keyDown(orders, { key: 'ArrowDown' })
    expect(stop()).toBe(thing('Sign-in'))
    // Enter and Space press the ›: the canvas leaves them to it and chooses nothing.
    expect(fireEvent.keyDown(orders, { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(orders, { key: ' ' })).toBe(true)
    expect(things().some((el) => el.hasAttribute('aria-current'))).toBe(false)
  })
})

describe('opening is the app’s', () => {
  test('only a thing with an openLabel has a ›, named by it, and only it opens on a double press; the › chooses nothing', () => {
    const opened = vi.fn<(id: string) => void>()
    const chose = vi.fn<(id: string | null) => void>()
    render(<Calls onOpen={opened} onSelect={chose} />)
    // The others have none, so no Tab stop more.
    expect(opens()).toEqual(['Open Gateway', 'Open Orders'])
    fireEvent.doubleClick(thing('Orders'))
    expect(opened.mock.calls).toEqual([['orders']])
    fireEvent.doubleClick(thing('Store'))
    fireEvent.doubleClick(thing('Mail'))
    expect(opened.mock.calls).toEqual([['orders']])
    fireEvent.click(screen.getByRole('button', { name: 'Open Gateway' }))
    expect(opened.mock.calls).toEqual([['orders'], ['gateway']])
    expect(chose).not.toHaveBeenCalled()
    expect(things()).toHaveLength(NODES.length)
    // The › of the thing with the Tab stop is the next Tab stop: the way to open from the keyboard.
    expect(screen.getByRole('button', { name: 'Open Gateway' }).tabIndex).toBe(0)
    expect(screen.getByRole('button', { name: 'Open Orders' }).tabIndex).toBe(-1)
  })

  test('a double press on the › opens once: its second click opens nothing more', () => {
    const opened = vi.fn<(id: string) => void>()
    render(<Calls onOpen={opened} />)
    const open = screen.getByRole('button', { name: 'Open Orders' })
    // What a browser sends for a double press: two clicks, counted, then the double click.
    fireEvent.click(open, { detail: 1 })
    fireEvent.click(open, { detail: 2 })
    fireEvent.doubleClick(open, { detail: 2 })
    expect(opened.mock.calls).toEqual([['orders']])
    // Pressed from the keyboard a click has no count: it opens.
    fireEvent.click(open, { detail: 0 })
    expect(opened.mock.calls).toEqual([['orders'], ['orders']])
  })

  test('Enter, Space and Right on a thing choose and move: with onOpen given they open nothing', () => {
    const opened = vi.fn<(id: string) => void>()
    render(<Calls onOpen={opened} />)
    fireEvent.keyDown(thing('Orders'), { key: 'Enter' })
    fireEvent.keyDown(thing('Orders'), { key: ' ' })
    fireEvent.keyDown(thing('Orders'), { key: 'ArrowRight' })
    expect(opened).not.toHaveBeenCalled()
    expect(thing('Orders').getAttribute('aria-current')).toBe('true')
    expect(stop()).toBe(thing('Store'))
  })

  test('without onOpen there is no › and a double press opens nothing', () => {
    render(<Calls />)
    expect(opens()).toEqual([])
    expect(screen.queryByRole('button', { name: 'Open Orders' })).toBeNull()
    fireEvent.doubleClick(thing('Orders'))
    expect(things()).toHaveLength(NODES.length)
  })

  test('the › and the plus of the chosen thing are 44px with a finger, and the plus adds after the thing', () => {
    render(<Calls editable selected="orders" onOpen={() => {}} />)
    const add = screen.getByRole('button', { name: 'Add after Orders' })
    expect(screen.queryByRole('button', { name: 'Add under Orders' })).toBeNull()
    for (const el of [add, screen.getByRole('button', { name: 'Open Orders' })]) {
      expect(el.className.split(' ')).toEqual(expect.arrayContaining(['pointer-coarse:min-h-11', 'pointer-coarse:min-w-11']))
    }
  })

  test("the words are the app's; the name of the › is the thing's", () => {
    render(
      <WordsProvider words={{ graph: { roleDescription: 'grafo', addAfter: (item) => `Aggiungi dopo ${item}`, leadsTo: (items) => `porta a ${items.join(', ')}`, comesFrom: (items) => `viene da ${items.join(', ')}` } }}>
        <Calls editable selected="orders" onOpen={() => {}} />
      </WordsProvider>,
    )
    expect(screen.getByRole('group', { name: 'Calls' }).getAttribute('aria-roledescription')).toBe('grafo')
    expect(described(thing('Orders'))).toBe('porta a Store, Mail · viene da Gateway')
    expect(screen.getByRole('button', { name: 'Aggiungi dopo Orders' })).toBeTruthy()
    expect(opens()).toEqual(['Open Gateway', 'Open Orders'])
  })
})

describe('+, − and 0 zoom in both modes', () => {
  test.each(['graph', 'tree'] as const)('in the %s mode, from a thing, as the buttons do; = is +; a field keeps its keys, and with Ctrl they are the browser’s', (model) => {
    render(<Calls model={model} search />)
    const first = things()[0]!
    fireEvent.keyDown(first, { key: '+' })
    expect(view.zoomIn).toHaveBeenCalledTimes(1)
    // The same key without Shift.
    fireEvent.keyDown(first, { key: '=' })
    expect(view.zoomIn).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(first, { key: '-' })
    expect(view.zoomOut).toHaveBeenCalledTimes(1)
    expect(fireEvent.keyDown(first, { key: '0' })).toBe(false)
    expect(view.fitView).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(first, { key: '+', ctrlKey: true })
    expect(view.zoomIn).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Find' }), { key: '0' })
    expect(view.fitView).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fit the view' }))
    expect(view.zoomIn).toHaveBeenCalledTimes(3)
    expect(view.fitView).toHaveBeenCalledTimes(2)
  })
})

describe('the tree mode is the default and is as it was', () => {
  test('a tree of items with their arrows; onOpen and openLabel are not the tree’s', () => {
    const opened = vi.fn<(id: string) => void>()
    render(<GraphCanvas aria-label="Calls" nodes={NODES} edges={EDGES} onOpen={opened} />)
    expect(screen.getByRole('tree', { name: 'Calls' })).toBeTruthy()
    // React Flow's own box is an application in both modes; the canvas named «Calls» is a tree here.
    expect(screen.queryByRole('application', { name: 'Calls' })).toBeNull()
    expect(screen.getAllByRole('treeitem')).toHaveLength(NODES.length)
    const gateway = screen.getByRole('treeitem', { name: 'Gateway' })
    expect(gateway.getAttribute('aria-expanded')).toBe('true')
    expect(gateway.getAttribute('aria-level')).toBe('1')
    expect(gateway.hasAttribute('aria-describedby')).toBe(false)
    expect(screen.getByRole('button', { name: 'Close Gateway' })).toBeTruthy()
    expect(opens()).toEqual([])
    fireEvent.doubleClick(screen.getByRole('treeitem', { name: 'Orders' }))
    expect(opened).not.toHaveBeenCalled()
    // Left on an open thing closes it, as a tree's key does.
    fireEvent.keyDown(gateway, { key: 'ArrowLeft' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(1)
  })
})
