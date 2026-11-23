// The app's places, sizes and routes (`GraphCanvas` given `x`, `y`, `width` and `height` on its nodes and `points` on
// its edges, as an app that lays out with an engine of its own does): each thing is drawn where the app put it, at its
// size, and a line follows its route; without places, or with some missing, the places are dagre's (`layoutGraph`), as
// before; a new `layoutKey` fits the view and the same key keeps it. jsdom lays nothing out and React Flow measures the
// page, so the places are seen in what the canvas hands React Flow and in the boxes React Flow draws for the things;
// a line, which React Flow draws only once it has measured the things it joins, is drawn here from what the canvas
// hands React Flow; the fit is seen in what the canvas asks of React Flow's view.
import { render } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { Position, type Edge, type EdgeProps, type Node, type ReactFlowProps } from '@xyflow/react'
import { GraphCanvas, layoutGraph, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'

// What the canvas hands React Flow, kept to be read, and what it asks of the view: React Flow draws as ever.
const handed = vi.hoisted(() => ({ props: null as ReactFlowProps | null }))
const view = vi.hoisted(() => ({ fitView: vi.fn<(options: unknown, nodes: unknown) => void>() }))
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
      // With the things React Flow had been handed when the fit was asked for: the fit is for those.
      fitView: (options?: unknown) => {
        view.fitView(options, handed.props?.nodes)
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
  view.fitView.mockClear()
  handed.props = null
})

// A service laid out by a layout engine of the app's, as ELK lays it out: boxes of 224 by 64, lines with bends.
const NODES: GraphNode[] = [
  { id: 'gateway', label: 'Gateway', x: 28, y: 100, width: 224, height: 64 },
  { id: 'orders', label: 'Orders', detail: '12 functions', x: 332, y: 28, width: 224, height: 64 },
  { id: 'store', label: 'Store', x: 636, y: 172, width: 224, height: 64 },
]
const EDGES: GraphEdge[] = [
  // From the end of the gateway, two bends, into the start of the orders.
  { from: 'gateway', to: 'orders', points: [{ x: 252, y: 132 }, { x: 292, y: 132 }, { x: 292, y: 60 }, { x: 332, y: 60 }] },
  { from: 'orders', to: 'store', points: [{ x: 556, y: 60 }, { x: 596, y: 60 }, { x: 596, y: 204 }, { x: 636, y: 204 }] },
  // A line the layout gave no route (as ELK answers `null`).
  { from: 'gateway', to: 'store', points: null },
]

/** What the canvas handed React Flow at its last draw. */
const flowNodes = () => (handed.props?.nodes ?? []) as Node[]
const flowEdges = () => (handed.props?.edges ?? []) as Edge[]
const flowNode = (id: string) => flowNodes().find((node) => node.id === id)
const flowEdge = (from: string, to: string) => flowEdges().find((edge) => edge.source === from && edge.target === to)
/** The box React Flow draws for a thing: where it is (read from its `transform`) and its size. */
const box = (id: string) => {
  const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`)
  const at = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(el?.style.transform ?? '')
  return { x: Number(at?.[1]), y: Number(at?.[2]), width: el?.style.width, height: el?.style.height }
}
/** The points a path goes through, in order: its moves and its lines. */
const pointsOf = (d: string) => Array.from(d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g), (match) => ({ x: Number(match[1]), y: Number(match[2]) }))

describe.each(['tree', 'graph'] as const)('in the %s mode', (model) => {
  function Calls(props: Partial<GraphCanvasProps>) {
    return <GraphCanvas aria-label="Calls" model={model} nodes={NODES} edges={EDGES} {...props} />
  }

  test('with places given, each thing is drawn where the app put it, at the size it gave', () => {
    render(<Calls />)
    expect(flowNodes().map((node) => node.id).sort()).toEqual(NODES.map((node) => node.id).sort())
    for (const node of NODES) {
      expect(flowNode(node.id)?.position, node.id).toEqual({ x: node.x, y: node.y })
      expect([flowNode(node.id)?.width, flowNode(node.id)?.height], node.id).toEqual([node.width, node.height])
      // The box React Flow draws for it.
      expect(box(node.id), node.id).toEqual({ x: node.x, y: node.y, width: `${node.width}px`, height: `${node.height}px` })
    }
    // The thing fills its box, whatever size the app gave.
    const things = Array.from(document.querySelectorAll('[data-thing]'))
    expect(things).toHaveLength(NODES.length)
    for (const el of things) expect(el.className.split(' ')).toContain('size-full')
  })

  test('a line with a route follows it through every point, with the arrowhead it is given; a line without one goes from side to side', () => {
    render(<Calls />)
    const routed = flowEdge('gateway', 'orders')
    expect(routed?.type).toBe('route')
    expect(flowEdge('orders', 'store')?.type).toBe('route')
    expect(flowEdge('gateway', 'store')?.type).toBe('smoothstep')
    // React Flow draws the line once it has measured the things it joins, which jsdom cannot: it is drawn here as React
    // Flow draws it, from the line and the props React Flow gives a line (the ends it would measure are not read).
    const Line = (handed.props?.edgeTypes ?? {})[routed?.type ?? ''] as React.ComponentType<EdgeProps> | undefined
    expect(Line).toBeDefined()
    if (!Line || !routed) return
    const { container } = render(
      <svg>
        <Line id={routed.id} source={routed.source} target={routed.target} data={routed.data} sourceX={0} sourceY={0} targetX={0} targetY={0} sourcePosition={Position.Right} targetPosition={Position.Left} markerEnd="url('#arrow')" />
      </svg>,
    )
    const path = container.querySelector('path.react-flow__edge-path')
    expect(path?.getAttribute('d')).toMatch(/^M/)
    expect(pointsOf(path?.getAttribute('d') ?? '')).toEqual(EDGES[0]?.points)
    expect(path?.getAttribute('marker-end')).toBe("url('#arrow')")
  })

  test('without places, or with one missing, the places are dagre’s at the sizes given, and no line follows a route', () => {
    // As before: no place, no size, no route.
    const plain: GraphNode[] = NODES.map((node) => ({ id: node.id, label: node.label, detail: node.detail }))
    const plainEdges: GraphEdge[] = EDGES.map((edge) => ({ from: edge.from, to: edge.to }))
    // Sizes without places, and every place but one.
    const sized = NODES.map((node) => ({ ...node, x: undefined, y: undefined }))
    const partly = NODES.map((node) => (node.id === 'store' ? { ...node, x: undefined, y: undefined } : node))
    for (const [nodes, edges] of [[plain, plainEdges], [sized, EDGES], [partly, EDGES]] as const) {
      const { unmount } = render(<Calls nodes={nodes} edges={edges} />)
      const places = layoutGraph({ nodes, edges }, nodes.map((node) => node.id), 'right')
      for (const node of nodes) expect(flowNode(node.id)?.position, node.id).toEqual(places.get(node.id))
      expect(flowEdges().map((edge) => edge.type)).toEqual(['smoothstep', 'smoothstep', 'smoothstep'])
      unmount()
    }
    // dagre lays out with the sizes the app gave, or with the canvas's: 208 wide, 44 tall, 56 with a second line.
    const sizes = render(<Calls nodes={sized} />)
    expect([flowNode('orders')?.width, flowNode('orders')?.height]).toEqual([224, 64])
    sizes.unmount()
    render(<Calls nodes={plain} edges={plainEdges} />)
    expect([flowNode('gateway')?.width, flowNode('gateway')?.height]).toEqual([208, 44])
    expect([flowNode('orders')?.width, flowNode('orders')?.height]).toEqual([208, 56])
  })

  test('a new layoutKey fits the view to the new places once React Flow has them; a draw on the same key keeps the view', () => {
    const { rerender } = render(<Calls layoutKey="right|3" />)
    // The first view is fitted at the first paint by React Flow itself: the key asks for nothing more.
    expect(view.fitView).not.toHaveBeenCalled()
    // The same layout drawn again, in new objects, with a thing chosen: the view stays where the user put it.
    rerender(<Calls layoutKey="right|3" nodes={NODES.map((node) => ({ ...node }))} edges={[...EDGES]} selected="orders" />)
    expect(view.fitView).not.toHaveBeenCalled()
    // A new layout: the things moved, and the key with them.
    const moved = NODES.map((node) => ({ ...node, x: (node.x ?? 0) + 400 }))
    rerender(<Calls layoutKey="right|3|moved" nodes={moved} />)
    expect(view.fitView).toHaveBeenCalledTimes(1)
    const [options, nodesThen] = view.fitView.mock.calls[0] ?? []
    expect(options).toEqual(expect.objectContaining({ duration: 0, maxZoom: 1 }))
    // Asked for once React Flow had the new places, not the old ones.
    expect((nodesThen as Node[] | undefined)?.find((node) => node.id === 'gateway')?.position).toEqual({ x: 428, y: 100 })
    // Drawn again on that key, with another thing chosen: no other fit.
    rerender(<Calls layoutKey="right|3|moved" nodes={moved} selected="store" />)
    expect(view.fitView).toHaveBeenCalledTimes(1)
  })

  test('without a layoutKey new places do not move the view', () => {
    const { rerender } = render(<Calls />)
    rerender(<Calls nodes={NODES.map((node) => ({ ...node, y: (node.y ?? 0) + 200 }))} />)
    expect(flowNode('gateway')?.position).toEqual({ x: 28, y: 300 })
    expect(view.fitView).not.toHaveBeenCalled()
  })
})
