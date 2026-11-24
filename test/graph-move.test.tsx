// Things that move, and motion, on the canvas: with `movable` a thing is dragged (React Flow's own drag, after 4px) or
// moved with Alt and an arrow, the canvas keeps its place until the layout changes (`layoutKey`) or the person resets
// it, and tells the app (`onMove`); with `animated` the view goes where a gesture sends it in 200ms and the things
// glide after a gesture that changes the places. jsdom lays nothing out and drags nothing: what is checked is what the
// canvas hands React Flow, what it asks of the view, the words, the keys and the reset button.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ReactFlowProps } from '@xyflow/react'
import { MotionProvider } from '../src'
import { GraphCanvas, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'
import { systemMotion } from './helpers'

// What the canvas hands React Flow, kept to be read, and what it asks of the view: React Flow draws as ever.
const handed = vi.hoisted(() => ({ props: null as ReactFlowProps | null }))
const view = vi.hoisted(() => ({ zoomIn: vi.fn(), setViewport: vi.fn() }))
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
afterEach(() => vi.unstubAllGlobals())

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
      // A new layout of the app's: they glide, and the view is fitted in the same time.
      view.setViewport.mockClear()
      rerender(<Chart animated movable layoutKey="b" nodes={NODES.map((it) => (it.id === 'store' ? { ...it, x: 760 } : it))} />)
      expect(box().hasAttribute('data-gliding')).toBe(true)
      expect(view.setViewport).toHaveBeenLastCalledWith(expect.anything(), { duration: 200 })
    } finally {
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
