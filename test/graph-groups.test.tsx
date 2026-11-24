// Groups opened in place, in the graph mode of the canvas: a thing with `open: true` is a frame (its title, the button
// that closes it, what it holds inside), a thing with `open: false` has the button that opens it, and both ask the app
// with `onToggle`; a thing whose `group` is an open group is handed to React Flow as its child, placed from its corner.
// jsdom lays nothing out, so what is checked is what the canvas hands React Flow, the roles, the names and the keys.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ReactFlowProps } from '@xyflow/react'
import { GraphCanvas, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'

// What the canvas hands React Flow, kept to be read: React Flow draws as ever.
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
    useReactFlow: () => ({ ...flow.useReactFlow(), viewportInitialized: true, setViewport: () => Promise.resolve(true) }),
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

// A service laid out by the app, nested as ELK answers it: the orders are open and hold the cart and the payment,
// each placed from the corner of the orders; the store is a group not opened.
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway', x: 20, y: 120 },
  { id: 'cart', label: 'Cart', group: 'orders', x: 16, y: 60 },
  { id: 'orders', label: 'Orders', open: true, x: 300, y: 40, width: 260, height: 180 },
  { id: 'pay', label: 'Pay', group: 'orders', x: 16, y: 120 },
  { id: 'store', label: 'Store', open: false, hiddenCount: 4, x: 640, y: 120 },
]
const EDGES: GraphEdge[] = [
  { from: 'gateway', to: 'orders' },
  { from: 'cart', to: 'pay' },
  { from: 'pay', to: 'store' },
]

function Chart(props: Partial<GraphCanvasProps>) {
  return <GraphCanvas aria-label="Map" model="graph" nodes={NODES} edges={EDGES} {...props} />
}
const thing = (name: string) => screen.getByRole('button', { name })
const node = (id: string) => handed.props!.nodes!.find((it) => it.id === id)!
const toggles = () => Array.from(document.querySelectorAll('[data-slot="graph-toggle"]')).map((el) => el.getAttribute('aria-label')).sort()
const described = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' | ')

describe('a group opened in place', () => {
  test('an open group is a frame under the things: a group named by its name and its count, which owns what it holds', () => {
    render(<Chart onToggle={() => {}} />)
    const frame = screen.getByRole('group', { name: 'Orders, open, holds 2' })
    expect(frame.getAttribute('data-slot')).toBe('graph-group')
    // What it holds is drawn beside it by React Flow: the frame owns those things for screen readers.
    const owned = frame.getAttribute('aria-owns')!.split(' ').map((id) => document.getElementById(id)?.getAttribute('aria-label'))
    expect(owned).toEqual(['Cart', 'Pay'])
    // Its title is the thing's own button, open; each thing in it says where it is.
    expect(thing('Orders').getAttribute('aria-expanded')).toBe('true')
    expect(frame.contains(thing('Orders'))).toBe(true)
    expect(described(thing('Cart'))).toContain('in Orders')
    expect(described(thing('Gateway'))).not.toContain('in Orders')
    // A line around it and a quiet fill, no shadow (R4).
    expect(frame.className).toContain('border-line')
    expect(frame.className).not.toMatch(/shadow/)
  })

  test('React Flow is handed the group before what it holds, each thing in it as its child and placed from its corner', () => {
    render(<Chart onToggle={() => {}} />)
    const ids = handed.props!.nodes!.map((it) => it.id)
    expect(ids.indexOf('orders')).toBeLessThan(ids.indexOf('cart'))
    expect(ids.indexOf('orders')).toBeLessThan(ids.indexOf('pay'))
    expect(node('orders')).toMatchObject({ type: 'frame', position: { x: 300, y: 40 }, width: 260, height: 180, zIndex: -1 })
    // The ground of the frame takes no press (a pan goes through it); its title and its button do.
    expect(node('orders').style).toEqual({ pointerEvents: 'none' })
    expect(thing('Orders').className).toContain('pointer-events-auto')
    expect('style' in node('gateway')).toBe(false)
    expect(node('cart')).toMatchObject({ type: 'point', parentId: 'orders', position: { x: 16, y: 60 } })
    expect(node('pay')).toMatchObject({ parentId: 'orders', position: { x: 16, y: 120 } })
    // The others are as they were: no parent, no layer.
    expect('parentId' in node('gateway')).toBe(false)
    expect('zIndex' in node('gateway')).toBe(false)
    expect(node('store').type).toBe('point')
  })

  test('the frame closes and the closed group opens with a button named by the words, which asks the app; without `onToggle` there is none', () => {
    const onToggle = vi.fn()
    const { unmount } = render(<Chart onToggle={onToggle} />)
    expect(toggles()).toEqual(['Close Orders', 'Open Store'])
    fireEvent.click(thing('Close Orders'))
    expect(onToggle).toHaveBeenLastCalledWith('orders')
    fireEvent.click(thing('Open Store'))
    expect(onToggle).toHaveBeenLastCalledWith('store')
    // A closed group says so, and a double press on it opens it in place.
    expect(thing('Store, hides 4').getAttribute('aria-expanded')).toBe('false')
    fireEvent.doubleClick(thing('Store, hides 4'))
    expect(onToggle).toHaveBeenCalledTimes(3)
    // With a finger the buttons are 44px.
    expect(thing('Close Orders').className).toContain('pointer-coarse:min-h-11')
    unmount()
    render(<Chart />)
    expect(toggles()).toEqual([])
    // The frame is still a frame: the app said it is open.
    expect(screen.getByRole('group', { name: 'Orders, open, holds 2' })).toBeTruthy()
  })

  test('going into a thing is another action: `onOpen` and `openLabel` keep their ›, and the double press', () => {
    const onToggle = vi.fn()
    const onOpen = vi.fn()
    render(<Chart onToggle={onToggle} onOpen={onOpen} nodes={NODES.map((it) => (it.id === 'store' ? { ...it, openLabel: 'Go into Store' } : it))} />)
    fireEvent.click(thing('Go into Store'))
    expect(onOpen).toHaveBeenLastCalledWith('store')
    fireEvent.doubleClick(thing('Store, hides 4'))
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onToggle).not.toHaveBeenCalled()
    fireEvent.click(thing('Open Store'))
    expect(onToggle).toHaveBeenLastCalledWith('store')
  })

  test('the keyboard goes into an open group and out of it, and reaches the button of its frame', () => {
    render(<Chart onToggle={() => {}} />)
    act(() => thing('Gateway').focus())
    // Along the line to the group, then into it: its first thing, before any line of its own.
    fireEvent.keyDown(thing('Gateway'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(thing('Orders'))
    // The button of the frame is the next Tab stop after its title.
    expect(thing('Orders').tabIndex).toBe(0)
    expect(thing('Close Orders').tabIndex).toBe(0)
    fireEvent.keyDown(thing('Orders'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(thing('Cart'))
    fireEvent.keyDown(thing('Cart'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(thing('Pay'))
    fireEvent.keyDown(thing('Pay'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(thing('Cart'))
    // No line leads to the cart: back is out, to the group that holds it.
    fireEvent.keyDown(thing('Cart'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(thing('Orders'))
  })

  test('a `group` that names no open group is not read, and the tree mode reads neither', () => {
    const { unmount } = render(<Chart nodes={NODES.map((it) => (it.id === 'orders' ? { ...it, open: false } : it))} onToggle={() => {}} />)
    expect('parentId' in node('cart')).toBe(false)
    expect(node('orders').type).toBe('point')
    expect(toggles()).toEqual(['Open Orders', 'Open Store'])
    unmount()
    render(<GraphCanvas aria-label="Map" nodes={NODES} edges={EDGES} onToggle={() => {}} />)
    expect(screen.getByRole('tree', { name: 'Map' })).toBeTruthy()
    expect(handed.props!.nodes!.every((it) => it.type === 'thing' && !('parentId' in it))).toBe(true)
    expect(document.querySelector('[data-slot="graph-group"]')).toBeNull()
  })

  test('without the app’s places the canvas lays the group out itself: what it holds under its title, the frame as large as that', () => {
    render(<Chart nodes={NODES.map(({ x: _x, y: _y, width: _w, height: _h, ...it }) => it)} />)
    const cart = node('cart')
    const pay = node('pay')
    const orders = node('orders')
    expect(cart.parentId).toBe('orders')
    // Under the title (44px), with dagre's own 16px around.
    expect(cart.position).toEqual({ x: 16, y: 60 })
    expect(pay.position.x).toBeGreaterThan(cart.position.x + 208)
    expect(orders.width).toBeGreaterThanOrEqual(pay.position.x + 208 + 16)
    expect(orders.height).toBeGreaterThanOrEqual(44 + 16 + 44 + 16)
    // The group is one box among the others: after the gateway, which has a line to it.
    expect(orders.position.x).toBeGreaterThan(node('gateway').position.x + 208)
    expect(node('store').position.x).toBeGreaterThan(orders.position.x + orders.width!)
  })
})
