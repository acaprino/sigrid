// Things that move, and motion, on the canvas: with `movable` a thing is dragged (React Flow's own drag, after 4px) or
// moved with Alt and an arrow, the canvas keeps its place until the layout changes (`layoutKey`) or the person resets
// it, and tells the app (`onMove`); with `animated` the view goes where a gesture sends it in 200ms and the things
// glide after a gesture that changes the places. jsdom lays nothing out and drags nothing: what is checked is what the
// canvas hands React Flow, what it asks of the view, the words, the keys and the reset button.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { NodeChangeset, type ReactFlowProps } from '@xyflow/react'
import { MotionProvider } from '../src'
import { handOver, standInFor, viewKeeping } from '../src/components/GraphCanvas'
import { GraphCanvas, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'
import { systemMotion } from './helpers'

// What the canvas hands React Flow, kept to be read, and what it asks of the view: React Flow draws as ever.
const handed = vi.hoisted(() => ({ props: null as ReactFlowProps | null }))
const view = vi.hoisted(() => ({ zoomIn: vi.fn(), setViewport: vi.fn(), setCenter: vi.fn() }))
vi.mock('@xyflow/react', async (importOriginal) => {
  const flow = await importOriginal<typeof import('@xyflow/react')>()
  const { createElement } = await import('react')
  return {
    ...flow,
    ReactFlow: (props: ReactFlowProps) => {
      handed.props = props
      return createElement(flow.ReactFlow, props)
    },
    useReactFlow: () => ({
      ...flow.useReactFlow(),
      viewportInitialized: true,
      zoomIn: (options?: unknown) => {
        view.zoomIn(options)
        return Promise.resolve(true)
      },
      setViewport: (viewport?: unknown, options?: unknown) => {
        view.setViewport(viewport, options)
        return Promise.resolve(true)
      },
      setCenter: (x?: unknown, y?: unknown, options?: unknown) => {
        view.setCenter(x, y, options)
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
  handed.props = null
  for (const fn of Object.values(view)) fn.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** The canvas's box is 1280 by 800 until `restore` (jsdom keeps the sizes on `Element`), so it has a first view. */
function sized() {
  for (const side of ['clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, side, {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset['slot'] === 'graph' ? (side === 'clientWidth' ? 1280 : 800) : 0
      },
    })
  }
  return () => {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight
  }
}

// Laid out by the app, with a route on one line; the orders are an open group that holds the cart.
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway', x: 28, y: 100 },
  { id: 'orders', label: 'Orders', open: true, x: 332, y: 28, width: 260, height: 180 },
  { id: 'cart', label: 'Cart', group: 'orders', x: 16, y: 60 },
  { id: 'store', label: 'Store', x: 700, y: 172 },
]
const EDGES: GraphEdge[] = [
  { from: 'gateway', to: 'store', points: [{ x: 236, y: 122 }, { x: 700, y: 194 }] },
  { from: 'gateway', to: 'orders' },
]

function Chart(props: Partial<GraphCanvasProps>) {
  return <GraphCanvas aria-label="Map" model="graph" nodes={NODES} edges={EDGES} layoutKey="a" {...props} />
}
const thing = (name: string) => screen.getByRole('button', { name })
const node = (id: string) => handed.props!.nodes!.find((it) => it.id === id)!
const line = (id: string) => handed.props!.edges!.find((it) => it.id === id)!
const reset = () => screen.queryByRole('button', { name: 'Reset the layout' })
const described = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' | ')
/** The person lets go of a thing they dragged there: what React Flow tells the canvas. */
const drop = (id: string, position: { x: number; y: number }) => act(() => handed.props!.onNodeDragStop!({} as never, { ...node(id), position } as never, [{ ...node(id), position }] as never))

describe('things that move', () => {
  test('by default nothing moves: no drag, no reset, Alt and an arrow do nothing', () => {
    const onMove = vi.fn()
    render(<Chart onMove={onMove} />)
    expect(handed.props!.nodesDraggable).toBe(false)
    expect(handed.props!.nodes!.every((it) => it.draggable === false)).toBe(true)
    expect('nodeDragThreshold' in handed.props!).toBe(false)
    expect(handed.props!.onNodeDragStop).toBeUndefined()
    act(() => thing('Gateway').focus())
    fireEvent.keyDown(thing('Gateway'), { key: 'ArrowRight', altKey: true })
    expect(onMove).not.toHaveBeenCalled()
    expect(node('gateway').position).toEqual({ x: 28, y: 100 })
    expect(reset()).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(described(thing('Gateway'))).not.toContain('Alt')
  })

  test('with `movable` React Flow drags the things, after 4px so a press or a pan is not a drag', () => {
    render(<Chart movable />)
    expect(handed.props!.nodesDraggable).toBe(true)
    expect(handed.props!.nodeDragThreshold).toBe(4)
    expect(handed.props!.selectNodesOnDrag).toBe(false)
    expect(handed.props!.nodes!.every((it) => it.draggable === true)).toBe(true)
    // A thing in a group stays in it, under its title.
    expect(node('cart').extent).toEqual([[0, 44], [260, 180]])
    expect('extent' in node('gateway')).toBe(false)
  })

  test('a dragged thing stays where it was put, the app is told, its line leaves its route, and «Reset the layout» is there only then', () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    expect(reset()).toBeNull()
    expect(line('gateway→store').type).toBe('route')
    drop('store', { x: 640.4, y: 300.2 })
    expect(onMove).toHaveBeenLastCalledWith('store', { x: 640, y: 300 })
    expect(node('store').position).toEqual({ x: 640, y: 300 })
    // Still joined, from side to side: the route the app gave no longer reaches it.
    expect(line('gateway→store')).toMatchObject({ source: 'gateway', target: 'store' })
    expect(line('gateway→store').type).not.toBe('route')
    // The reset is the first of the view's buttons, so the others stay where they are.
    const row = screen.getByRole('group', { name: 'View' })
    expect(Array.from(row.querySelectorAll('button')).map((el) => el.getAttribute('aria-label'))).toEqual(['Reset the layout', 'Zoom out', 'Zoom in', 'Fit the view'])
    fireEvent.click(reset()!)
    expect(node('store').position).toEqual({ x: 700, y: 172 })
    expect(line('gateway→store').type).toBe('route')
    expect(reset()).toBeNull()
    expect(Array.from(row.querySelectorAll('button')).map((el) => el.getAttribute('aria-label'))).toEqual(['Zoom out', 'Zoom in', 'Fit the view'])
  })

  test('a thing let go where it was is not moved', () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    drop('store', { x: 700, y: 172 })
    expect(onMove).not.toHaveBeenCalled()
    expect(reset()).toBeNull()
  })

  test('Alt and an arrow move the thing that has the focus a step of 16px, said to screen readers; the arrows alone still move the focus', () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    expect(described(thing('Gateway'))).toContain('Alt and an arrow key move it')
    act(() => thing('Gateway').focus())
    fireEvent.keyDown(thing('Gateway'), { key: 'ArrowRight', altKey: true })
    expect(onMove).toHaveBeenLastCalledWith('gateway', { x: 44, y: 100 })
    fireEvent.keyDown(thing('Gateway'), { key: 'ArrowUp', altKey: true })
    expect(onMove).toHaveBeenLastCalledWith('gateway', { x: 44, y: 84 })
    expect(node('gateway').position).toEqual({ x: 44, y: 84 })
    expect(screen.getByRole('status').textContent).toBe('Gateway moved to 44, 84')
    expect(reset()).not.toBeNull()
    // The focus stays on the thing; an arrow without Alt follows its line.
    expect(document.activeElement).toBe(thing('Gateway'))
    fireEvent.keyDown(thing('Gateway'), { key: 'ArrowRight' })
    expect(document.activeElement).not.toBe(thing('Gateway'))
    expect(onMove).toHaveBeenCalledTimes(2)
  })

  test('a new `layoutKey` forgets what was moved; a draw on the same key keeps it', () => {
    const { rerender } = render(<Chart movable />)
    drop('store', { x: 640, y: 300 })
    rerender(<Chart movable nodes={NODES.map((it) => ({ ...it }))} selected="store" />)
    expect(node('store').position).toEqual({ x: 640, y: 300 })
    rerender(<Chart movable layoutKey="b" />)
    expect(node('store').position).toEqual({ x: 700, y: 172 })
    expect(reset()).toBeNull()
  })

  test('going back to a layout does not bring back what was moved on it before', () => {
    const { rerender } = render(<Chart movable />)
    drop('store', { x: 640, y: 300 })
    rerender(<Chart movable layoutKey="b" />)
    rerender(<Chart movable layoutKey="a" />)
    expect(node('store').position).toEqual({ x: 700, y: 172 })
    expect(reset()).toBeNull()
  })

  test('«Reset the layout» goes away under the focus: the focus goes to the next button of the row, not to the page', () => {
    render(<Chart movable />)
    drop('store', { x: 640, y: 300 })
    act(() => reset()!.focus())
    fireEvent.click(reset()!)
    expect(reset()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Zoom out' }))
  })

  test('while a thing is dragged a new draw keeps it where it is and draws the rest; its line follows it; a drag that is cancelled puts it back', async () => {
    const { rerender } = render(<Chart movable />)
    act(() => handed.props!.onNodeDragStart!({} as never, node('store') as never, [node('store')] as never))
    // React Flow moves it as the pointer goes.
    act(() => handed.props!.onNodesChange!(new NodeChangeset([{ id: 'store', type: 'position', position: { x: 650, y: 200 }, dragging: true }])))
    // The line leaves the app's route at once, so it follows the thing.
    expect(line('gateway→store').type).not.toBe('route')
    // The app draws again meanwhile (a choice): it is drawn, and the thing is not put back.
    rerender(<Chart movable selected="gateway" />)
    expect((node('gateway').data as { chosen: boolean }).chosen).toBe(true)
    expect(node('store').position).toEqual({ x: 650, y: 200 })
    // A second finger, or a pointer the system takes: React Flow says nothing, and the drag is over all the same.
    act(() => void window.dispatchEvent(new Event('pointercancel')))
    await act(async () => {
      await new Promise((done) => setTimeout(done, 5))
    })
    expect(node('store').position).toEqual({ x: 700, y: 172 })
    expect(line('gateway→store').type).toBe('route')
    expect(reset()).toBeNull()
    // And the canvas draws what comes next as ever.
    rerender(<Chart movable selected="store" />)
    expect((node('store').data as { chosen: boolean }).chosen).toBe(true)
  })

  test('a place React Flow tells after a drag the canvas had ended (a second finger) is where the thing was let go: kept, told, and reset as any other', async () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    act(() => handed.props!.onNodeDragStart!({} as never, node('store') as never, [node('store')] as never))
    act(() => handed.props!.onNodesChange!(new NodeChangeset([{ id: 'store', type: 'position', position: { x: 650, y: 200 }, dragging: true }])))
    // The second finger: React Flow aborts the drag and says nothing; the canvas ends it.
    act(() => void window.dispatchEvent(new Event('touchcancel')))
    await act(async () => {
      await new Promise((done) => setTimeout(done, 5))
    })
    expect(onMove).not.toHaveBeenCalled()
    // The finger lifts: React Flow tells the last place, with no drag stop.
    act(() => handed.props!.onNodesChange!(new NodeChangeset([{ id: 'store', type: 'position', position: { x: 650.3, y: 200 }, dragging: false }])))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenLastCalledWith('store', { x: 650, y: 200 })
    expect(node('store').position).toEqual({ x: 650, y: 200 })
    expect(line('gateway→store').type).not.toBe('route')
    fireEvent.click(reset()!)
    expect(node('store').position).toEqual({ x: 700, y: 172 })
  })

  test('a drop that React Flow tells both ways is told to the app once', () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    act(() => handed.props!.onNodeDragStart!({} as never, node('store') as never, [node('store')] as never))
    act(() => {
      handed.props!.onNodeDragStop!({} as never, { ...node('store'), position: { x: 640, y: 300 } } as never, [{ ...node('store'), position: { x: 640, y: 300 } }] as never)
      handed.props!.onNodesChange!(new NodeChangeset([{ id: 'store', type: 'position', position: { x: 640, y: 300 }, dragging: false }]))
    })
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(node('store').position).toEqual({ x: 640, y: 300 })
  })

  test('a thing that is as it was is handed to React Flow as the object it has, and one that changed keeps what React Flow measured', () => {
    const { rerender } = render(<Chart selected="store" />)
    act(() =>
      handed.props!.onNodesChange!(
        new NodeChangeset([
          { id: 'gateway', type: 'dimensions', dimensions: { width: 208, height: 44 } },
          { id: 'store', type: 'dimensions', dimensions: { width: 208, height: 44 } },
        ]),
      ),
    )
    const before = node('gateway')
    expect(before.measured).toEqual({ width: 208, height: 44 })
    // The orders are chosen in place of the store (the Tab stop goes with them): the gateway, joined to both, is as it was;
    // the store is dimmed.
    rerender(<Chart selected="orders" />)
    expect((node('orders').data as { chosen: boolean }).chosen).toBe(true)
    expect(node('gateway')).toBe(before)
    expect((node('store').data as { dim: boolean }).dim).toBe(true)
    expect(node('store').measured).toEqual({ width: 208, height: 44 })
  })

  test('what React Flow measured is kept only while it holds: another direction, another part or another size is measured again', () => {
    const { rerender } = render(<Chart />)
    const measure = () =>
      act(() =>
        handed.props!.onNodesChange!(
          new NodeChangeset([
            { id: 'gateway', type: 'dimensions', dimensions: { width: 208, height: 44 } },
            { id: 'store', type: 'dimensions', dimensions: { width: 208, height: 44 } },
          ]),
        ),
      )
    measure()
    expect(node('gateway').measured).toEqual({ width: 208, height: 44 })
    // The other direction: the handles are on other sides, so every thing is measured again and the lines leave from them.
    rerender(<Chart direction="down" />)
    expect((node('gateway').data as { direction: string }).direction).toBe('down')
    expect(node('gateway').measured).toBeUndefined()
    expect(node('store').measured).toBeUndefined()
    measure()
    // A group opens where the thing was: a frame of another size, which the old 208 by 44 would hide when its corner is out of the view.
    rerender(<Chart direction="down" nodes={NODES.map((it) => (it.id === 'store' ? { ...it, open: true, width: 300, height: 200 } : it))} />)
    expect(node('store').type).toBe('frame')
    expect(node('store').measured).toBeUndefined()
    // The gateway is as it was: its measure stays.
    expect(node('gateway').measured).toEqual({ width: 208, height: 44 })
  })

  test('handOver: the same object where nothing changed, the measure where it holds, the dragged thing where it is', () => {
    type Things = Parameters<typeof handOver>[0]
    const thingOf = (over: object = {}, data: object = {}) => ({ id: 'a', type: 'point', position: { x: 0, y: 0 }, width: 208, height: 44, data: { direction: 'right', dim: false, ...data }, ...over })
    const measured = { width: 208, height: 44 }
    const none: ReadonlySet<string> = new Set()
    const has = { ...thingOf(), measured }
    const pass = (now: object, next: object, held = none) => handOver([now] as unknown as Things, [next] as unknown as Things, held)[0]!
    // As it was, value by value: the object React Flow has.
    expect(pass(has, thingOf())).toBe(has)
    // Changed, but the measure holds (a choice, a place).
    expect(pass(has, thingOf({ position: { x: 10, y: 0 } })).measured).toBe(measured)
    expect(pass(has, thingOf({}, { dim: true })).measured).toBe(measured)
    // The measure does not hold: another direction, another part, another size.
    expect('measured' in pass(has, thingOf({}, { direction: 'down' }))).toBe(false)
    expect('measured' in pass(has, thingOf({ type: 'frame' }))).toBe(false)
    expect('measured' in pass(has, thingOf({ width: 300 }))).toBe(false)
    expect('measured' in pass(has, thingOf({ height: 200 }))).toBe(false)
    // Dragged: where React Flow has it, and the same rule for its measure.
    const dragged = { ...has, position: { x: 50, y: 60 }, dragging: true }
    expect(pass(dragged, thingOf({}, { dim: true }), new Set(['a']))).toMatchObject({ position: { x: 50, y: 60 }, dragging: true, measured })
    expect('measured' in pass(dragged, thingOf({}, { direction: 'down' }), new Set(['a']))).toBe(false)
    // Let go without a word from React Flow: back where the canvas has it.
    expect(pass(dragged, thingOf())).toMatchObject({ position: { x: 0, y: 0 } })
    expect(pass(dragged, thingOf()).dragging).toBeUndefined()
  })

  test('a thing that left the graph while it was dragged is not kept or told', () => {
    const onMove = vi.fn()
    const { rerender } = render(<Chart movable onMove={onMove} />)
    const store = node('store')
    act(() => handed.props!.onNodeDragStart!({} as never, store as never, [store] as never))
    rerender(<Chart movable onMove={onMove} nodes={NODES.filter((it) => it.id !== 'store')} edges={[]} />)
    act(() => {
      handed.props!.onNodeDragStop!({} as never, { ...store, position: { x: 640, y: 300 } } as never, [{ ...store, position: { x: 640, y: 300 } }] as never)
      handed.props!.onNodesChange!(new NodeChangeset([{ id: 'store', type: 'position', position: { x: 640, y: 300 }, dragging: false }]))
    })
    expect(onMove).not.toHaveBeenCalled()
    expect(reset()).toBeNull()
  })

  test('a thing moved with the keys past the edge of the view takes the view with it, and keeps the focus', async () => {
    const restore = sized()
    try {
      // Whole in the box of 1280px, 8px from its end.
      render(<Chart movable nodes={[...NODES, { id: 'edge', label: 'Edge', x: 1064, y: 100 }]} />)
      await act(async () => {})
      act(() => thing('Edge').focus())
      view.setViewport.mockClear()
      fireEvent.keyDown(thing('Edge'), { key: 'ArrowLeft', altKey: true })
      expect(view.setViewport).not.toHaveBeenCalled()
      fireEvent.keyDown(thing('Edge'), { key: 'ArrowRight', altKey: true })
      fireEvent.keyDown(thing('Edge'), { key: 'ArrowRight', altKey: true })
      expect(view.setViewport).toHaveBeenLastCalledWith({ x: -16, y: 0, zoom: 1 }, { duration: 0 })
      expect(document.activeElement).toBe(thing('Edge'))
      expect(view.setCenter).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  test('a moved group takes what it holds with it, and a thing in a group stays in it', () => {
    const onMove = vi.fn()
    render(<Chart movable onMove={onMove} />)
    drop('orders', { x: 400, y: 60 })
    // The cart is placed from the corner of the orders: it has not moved in it.
    expect(node('orders').position).toEqual({ x: 400, y: 60 })
    expect(node('cart')).toMatchObject({ parentId: 'orders', position: { x: 16, y: 60 } })
    // With the keys the cart goes up to the title of its group, and no further; its place is told from the group's corner.
    act(() => thing('Cart').focus())
    fireEvent.keyDown(thing('Cart'), { key: 'ArrowUp', altKey: true })
    expect(onMove).toHaveBeenLastCalledWith('cart', { x: 16, y: 44 })
    fireEvent.keyDown(thing('Cart'), { key: 'ArrowUp', altKey: true })
    expect(onMove).toHaveBeenLastCalledWith('cart', { x: 16, y: 44 })
    fireEvent.keyDown(thing('Cart'), { key: 'ArrowLeft', altKey: true })
    expect(onMove).toHaveBeenLastCalledWith('cart', { x: 0, y: 44 })
  })
})

describe('motion', () => {
  const zoom = () => fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
  const box = () => document.querySelector<HTMLElement>('[data-slot="graph"]')!

  test('the view jumps unless the app turned motion on and the system allows it: `animated`, or a `MotionProvider`', () => {
    systemMotion(false)
    const plain = render(<Chart />)
    zoom()
    expect(view.zoomIn).toHaveBeenLastCalledWith({ duration: 0 })
    plain.unmount()
    const own = render(<Chart animated />)
    zoom()
    expect(view.zoomIn).toHaveBeenLastCalledWith({ duration: 200 })
    own.unmount()
    const inherited = render(
      <MotionProvider animated>
        <Chart />
      </MotionProvider>,
    )
    zoom()
    expect(view.zoomIn).toHaveBeenLastCalledWith({ duration: 200 })
    inherited.unmount()
    // The control says no under a provider that says yes.
    render(
      <MotionProvider animated>
        <Chart animated={false} />
      </MotionProvider>,
    )
    zoom()
    expect(view.zoomIn).toHaveBeenLastCalledWith({ duration: 0 })
  })

  test('with reduced motion nothing moves, whatever the app says', () => {
    systemMotion(true)
    render(<Chart animated />)
    zoom()
    expect(view.zoomIn).toHaveBeenLastCalledWith({ duration: 0 })
  })

  test('the first view jumps; the things glide only after a gesture that changes the places, never for a change nobody asked for', async () => {
    systemMotion(false)
    const restore = sized()
    try {
      const { rerender } = render(<Chart animated movable />)
      await act(async () => {})
      // The first paint: the view is put there, and nothing glides.
      expect(view.setViewport).toHaveBeenCalled()
      expect(view.setViewport.mock.calls[0]![1]).toEqual({ duration: 0 })
      expect(box().hasAttribute('data-gliding')).toBe(false)
      // A thing let go after a drag is where it is: nothing glides.
      drop('store', { x: 640, y: 300 })
      expect(box().hasAttribute('data-gliding')).toBe(false)
      // The reset is a gesture: the things glide back.
      fireEvent.click(reset()!)
      expect(box().hasAttribute('data-gliding')).toBe(true)
      box().removeAttribute('data-gliding')
      // New places on the same layout, which nobody asked for: they jump.
      rerender(<Chart animated movable nodes={NODES.map((it) => (it.id === 'store' ? { ...it, x: 720 } : it))} />)
      expect(box().hasAttribute('data-gliding')).toBe(false)
      // A new layout the app pushes by itself (its data changed): it jumps too, and so does its fit.
      view.setViewport.mockClear()
      rerender(<Chart animated movable layoutKey="b" nodes={NODES.map((it) => (it.id === 'store' ? { ...it, x: 760 } : it))} />)
      expect(box().hasAttribute('data-gliding')).toBe(false)
      expect(view.setViewport).toHaveBeenLastCalledWith(expect.anything(), { duration: 0 })
      // A new layout that follows a press in the canvas: the things glide, and the view is fitted in the same time.
      fireEvent.pointerDown(box())
      rerender(<Chart animated movable layoutKey="c" nodes={NODES.map((it) => (it.id === 'store' ? { ...it, x: 800 } : it))} />)
      expect(box().hasAttribute('data-gliding')).toBe(true)
      expect(view.setViewport).toHaveBeenLastCalledWith(expect.anything(), { duration: 200 })
    } finally {
      restore()
    }
  })

  test('a group opened with a new layout: the fit wins, and the frame that takes the focus does not move the view', async () => {
    systemMotion(false)
    const restore = sized()
    // Every thing is measured out of the box, as a frame is while it is still where it was: a focus would bring it in.
    // Only the canvas's box and the things' own surfaces: what React Flow measures stays as jsdom has it.
    const real = Element.prototype.getBoundingClientRect
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const slot = this.getAttribute('data-slot')
      if (slot !== 'graph' && slot !== 'graph-node') return real.call(this)
      const [left, right] = slot === 'graph' ? [0, 1280] : [2000, 2200]
      return { left, right, top: 0, bottom: 44, x: left, y: 0, width: right - left, height: 44, toJSON: () => ({}) } as DOMRect
    })
    function Opening() {
      const [open, setOpen] = React.useState(false)
      const nodes: GraphNode[] = [
        { id: 'gateway', label: 'Gateway', x: 28, y: 100 },
        { id: 'store', label: 'Store', open, x: 400, y: 60, ...(open ? { width: 260, height: 180 } : {}) },
        ...(open ? [{ id: 'rows', label: 'Rows', group: 'store', x: 16, y: 60 }] : []),
      ]
      return <GraphCanvas aria-label="Map" model="graph" animated nodes={nodes} edges={[{ from: 'gateway', to: 'store' }]} layoutKey={open ? 'open' : 'closed'} onToggle={() => setOpen((now) => !now)} />
    }
    try {
      render(<Opening />)
      await act(async () => {})
      view.setViewport.mockClear()
      view.setCenter.mockClear()
      const button = thing('Open Store')
      act(() => button.focus())
      fireEvent.pointerDown(button)
      fireEvent.click(button)
      // The frame is drawn in place of the thing, with the focus its button had; the view is fitted, in the time of the glide, and nothing else moves it.
      expect(screen.getByRole('group', { name: 'Store, open, holds 1' })).toBeTruthy()
      expect(document.activeElement).toBe(thing('Store'))
      expect(view.setViewport).toHaveBeenLastCalledWith(expect.anything(), { duration: 200 })
      expect(view.setCenter).not.toHaveBeenCalled()
      expect(box().hasAttribute('data-gliding')).toBe(true)
      // What the group holds, and its frame, are shown together at the end of the glide.
      const arriving = Array.from(document.querySelectorAll('.react-flow__node[data-arriving]')).map((el) => el.getAttribute('data-id')).sort()
      expect(arriving).toEqual(['rows', 'store'])
    } finally {
      restore()
    }
  })

  test('a gesture waits a second for its new places: the same places in a new object do not spend it, and later places are the app’s own', async () => {
    systemMotion(false)
    const restore = sized()
    const clock = vi.spyOn(Date, 'now')
    try {
      let time = 1_000_000
      clock.mockImplementation(() => time)
      const moved = (x: number) => NODES.map((it) => (it.id === 'store' ? { ...it, x } : it))
      const { rerender } = render(<Chart animated onToggle={() => {}} />)
      await act(async () => {})
      // The person closes a group; the app lays out elsewhere and draws meanwhile, with the same places.
      fireEvent.click(thing('Close Orders'))
      rerender(<Chart animated onToggle={() => {}} nodes={NODES.map((it) => ({ ...it }))} />)
      expect(box().hasAttribute('data-gliding')).toBe(false)
      time += 300
      rerender(<Chart animated onToggle={() => {}} nodes={moved(720)} />)
      expect(box().hasAttribute('data-gliding')).toBe(true)
      box().removeAttribute('data-gliding')
      // A gesture nothing answered: what the app pushes two seconds later jumps.
      fireEvent.click(thing('Close Orders'))
      time += 2000
      rerender(<Chart animated onToggle={() => {}} nodes={moved(760)} />)
      expect(box().hasAttribute('data-gliding')).toBe(false)
    } finally {
      clock.mockRestore()
      restore()
    }
  })

  test('without motion the same gestures mark nothing', async () => {
    const restore = sized()
    try {
      const { rerender } = render(<Chart movable />)
      await act(async () => {})
      drop('store', { x: 640, y: 300 })
      fireEvent.click(reset()!)
      rerender(<Chart movable layoutKey="b" />)
      expect(box().hasAttribute('data-gliding')).toBe(false)
      expect(view.setViewport).toHaveBeenLastCalledWith(expect.anything(), { duration: 0 })
    } finally {
      restore()
    }
  })
})

describe('the Tab stop after the view moved', () => {
  // The chosen thing is far out of the view; another is in it.
  const FAR: GraphNode[] = [
    { id: 'far', label: 'Far', x: 5000, y: 100 },
    { id: 'near', label: 'Near', x: 100, y: 100 },
    { id: 'other', label: 'Other', x: 6000, y: 100 },
  ]
  const tabStops = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="graph-node"]')).filter((el) => el.tabIndex === 0).map((el) => el.getAttribute('aria-label'))
  const panned = () => act(() => handed.props!.onMoveEnd!(null as never, { x: 0, y: 0, zoom: 1 }))

  test('a thing in the view stands in for a stop that is out of it, by its tabindex alone: no focus, no choice, no view moves', async () => {
    const restore = sized()
    try {
      const onSelect = vi.fn()
      const { rerender } = render(<GraphCanvas aria-label="Map" model="graph" layoutKey="a" nodes={FAR} edges={[]} selected="far" onSelect={onSelect} editable onChange={vi.fn()} />)
      await act(async () => {})
      expect(tabStops()).toEqual(['Far'])
      act(() => thing('Far').focus())
      view.setViewport.mockClear()
      panned()
      expect(tabStops()).toEqual(['Near'])
      // Nothing else: the focus is where it was, the chosen thing is the chosen thing, the view is the person's.
      expect(document.activeElement).toBe(thing('Far'))
      expect(thing('Far').getAttribute('aria-current')).toBe('true')
      expect(onSelect).not.toHaveBeenCalled()
      expect(view.setViewport).not.toHaveBeenCalled()
      expect(view.setCenter).not.toHaveBeenCalled()
      // The stop still follows the focus and the choice, as it always did: the stand-in was for that stop only.
      act(() => thing('Far').blur())
      rerender(<GraphCanvas aria-label="Map" model="graph" layoutKey="a" nodes={FAR} edges={[]} selected="far" onSelect={onSelect} editable onChange={vi.fn()} />)
      expect(tabStops()).toEqual(['Near'])
      act(() => thing('Other').focus())
      expect(tabStops()).toEqual(['Other'])
    } finally {
      restore()
    }
  })

  test('nothing of it runs while a thing is dragged, and without a pan the stop is the choice', async () => {
    const restore = sized()
    try {
      render(<GraphCanvas aria-label="Map" model="graph" layoutKey="a" nodes={FAR} edges={[]} selected="far" movable />)
      await act(async () => {})
      expect(tabStops()).toEqual(['Far'])
      act(() => handed.props!.onNodeDragStart!({} as never, node('near') as never, [node('near')] as never))
      panned()
      expect(tabStops()).toEqual(['Far'])
    } finally {
      restore()
    }
  })

  test('standInFor: the first thing in the view, only when the stop is out of it', () => {
    const boxes: Record<string, { x: number; y: number; width: number; height: number }> = { a: { x: 5000, y: 0, width: 208, height: 44 }, b: { x: -300, y: 0, width: 208, height: 44 }, c: { x: 100, y: 100, width: 208, height: 44 }, d: { x: 400, y: 100, width: 208, height: 44 } }
    const boxOf = (id: string) => boxes[id]
    const room = { width: 1280, height: 800 }
    const order = ['a', 'b', 'c', 'd']
    expect(standInFor('a', order, boxOf, { x: 0, y: 0, zoom: 1 }, room)).toBe('c')
    // In the view, even in part: it needs no stand-in.
    expect(standInFor('c', order, boxOf, { x: 0, y: 0, zoom: 1 }, room)).toBeNull()
    expect(standInFor('c', order, boxOf, { x: -200, y: 0, zoom: 1 }, room)).toBeNull()
    // The view on the far thing: it is the stop again.
    expect(standInFor('a', order, boxOf, { x: -4800, y: 0, zoom: 1 }, room)).toBeNull()
    // No thing in the view: none stands in.
    expect(standInFor('a', order, boxOf, { x: -20000, y: 0, zoom: 1 }, room)).toBeNull()
  })

  test('viewKeeping: the view moves by what keeps the box whole, and not at all when it is', () => {
    const room = { width: 1280, height: 800 }
    const view = { x: 0, y: 0, zoom: 1 }
    expect(viewKeeping(view, { x: 100, y: 100, width: 208, height: 44 }, room, 8)).toBe(view)
    expect(viewKeeping(view, { x: 1080, y: 100, width: 208, height: 44 }, room, 8)).toEqual({ x: -16, y: 0, zoom: 1 })
    expect(viewKeeping(view, { x: -10, y: 790, width: 208, height: 44 }, room, 8)).toEqual({ x: 18, y: -42, zoom: 1 })
    expect(viewKeeping({ x: 0, y: 0, zoom: 2 }, { x: 600, y: 0, width: 208, height: 44 }, room, 0)).toEqual({ x: -336, y: 0, zoom: 2 })
  })
})
