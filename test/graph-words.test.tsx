// The words of the lines of the canvas (`GraphCanvas`) are drawn on their line only where they have room: over no
// thing and over no other words (`wordsOf`). The others leave the line and are listed under the view's buttons, each
// with the two things its line joins. No room is made for them, so the places are the same with a thing chosen or not.
// jsdom lays nothing out: the boxes are reckoned by the canvas itself (`wordBox`), and the lines are read in what the
// canvas hands React Flow, as in test/graph-flags.test.tsx.
import { act, render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Edge, Node as FlowNode, ReactFlowProps } from '@xyflow/react'
import { linesOf, wordBox, wordsOf } from '../src/assemblies/GraphCanvas'
import { GraphCanvas, layoutGraph, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'

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

// The groups of a program and the calls between them, as an app that maps code draws them: four lines from the
// client to the server, each with a sentence that says what was seen, drawn while one of its ends is chosen.
const NODES: GraphNode[] = [
  { id: 'client', label: 'Client' },
  { id: 'server', label: 'Server' },
  { id: 'pay', label: 'Payments' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'notify', label: 'Notices' },
]
const SEEN = '1 call · seen at run time'
const EDGES: GraphEdge[] = [
  { id: 'a', from: 'client', to: 'server', label: SEEN, labelShown: 'chosen' },
  { id: 'b', from: 'client', to: 'server', label: '2 calls · sampled by the profiler', labelShown: 'chosen', style: 'dashed' },
  { id: 'c', from: 'client', to: 'server', label: '1 call · not enough proof', labelShown: 'chosen', style: 'dashed', tone: 'warning' },
  { id: 'd', from: 'client', to: 'server', label: '3 imports, 1 type', labelShown: 'chosen' },
  { id: 'e', from: 'server', to: 'pay', label: '2 calls, 3 imports', labelShown: 'chosen' },
  { id: 'f', from: 'server', to: 'catalog', label: '4 calls, both ways', labelShown: 'chosen', directed: false },
  // Short words, always drawn: they have room between two ranks.
  { id: 'g', from: 'pay', to: 'notify', label: 'tells' },
]
const IDS = NODES.map((node) => node.id)
const OPTIONS = { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false } as const

type Box = { x: number; y: number; width: number; height: number }
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
/** The things as boxes, at these places and of the canvas's own size. */
const boxesAt = (places: ReadonlyMap<string, { x: number; y: number }>) => new Map(IDS.map((id): [string, Box] => [id, { ...places.get(id)!, width: 208, height: 44 }]))
/** No words kept on a line lie over a thing (their letters: the 4px and 2px of ground around them may touch one), or over the words of another line. */
function expectClear(on: ReadonlyMap<string, Box>, boxes: ReadonlyMap<string, Box>) {
  const kept = [...on]
  for (const [id, box] of kept) {
    const letters = { x: box.x + 4, y: box.y + 2, width: box.width - 8, height: box.height - 4 }
    for (const [thing, at] of boxes) expect(meets(letters, at), `${id} over ${thing}`).toBe(false)
    for (const [other, at] of kept) if (other !== id) expect(meets(box, at), `${id} over ${other}`).toBe(false)
  }
}

describe('where the words of a line have room', () => {
  test('between two ranks 56px apart a sentence has none: every such line is off, the short words stay, and nothing kept lies over a thing or over other words', () => {
    const places = layoutGraph({ nodes: NODES, edges: EDGES }, IDS, 'right')
    const boxes = boxesAt(places)
    const { lines } = linesOf(EDGES, places, { ...OPTIONS, chosen: 'server' })
    // The lines of the server have their words, as before: where they are drawn is decided after.
    expect(lines.filter((line) => line.label !== undefined).map((line) => line.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    const { on, off } = wordsOf(lines, boxes, 'right')
    expect(off).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect([...on.keys()]).toEqual(['g'])
    expectClear(on, boxes)
    // Drawn where they were, the first sentence would lie over the client and the server.
    const client = boxes.get('client')!
    const server = boxes.get('server')!
    const between = (client.x + client.width + server.x) / 2
    expect(server.x - (client.x + client.width)).toBe(56)
    expect(meets(wordBox(SEEN, { x: between, y: client.y + 22 }), client)).toBe(true)
    expect(meets(wordBox(SEEN, { x: between, y: server.y + 22 }), server)).toBe(true)
  })

  test('with room between the things the words stay on their lines, but never on each other: of four lines side by side, those 11px apart give way', () => {
    // The same things, 400px from rank to rank: 192px between two of them.
    const places = new Map<string, { x: number; y: number }>([['client', { x: 0, y: 100 }], ['server', { x: 400, y: 100 }], ['pay', { x: 800, y: 40 }], ['catalog', { x: 800, y: 160 }], ['notify', { x: 1200, y: 40 }]])
    const boxes = boxesAt(places)
    const { lines } = linesOf(EDGES, places, { ...OPTIONS, chosen: 'server' })
    const { on, off } = wordsOf(lines, boxes, 'right')
    expectClear(on, boxes)
    // Every line with words is either on its line or listed, once.
    expect([...on.keys(), ...off].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    // The first of the four keeps its words, the one beside it (11px away, less than a line of text) does not.
    expect(on.has('a')).toBe(true)
    expect(off).toContain('b')
    expect(on.has('e') && on.has('f') && on.has('g')).toBe(true)
  })

  test('on a route of the app’s the words are at the middle of its longest piece: kept where that is free, off where a thing is there; of an open group only the title counts', () => {
    const boxes = new Map<string, Box>([
      ['client', { x: 0, y: 0, width: 208, height: 44 }],
      ['server', { x: 600, y: 0, width: 208, height: 44 }],
      ['pay', { x: 300, y: 200, width: 208, height: 44 }],
      ['group', { x: 0, y: 300, width: 900, height: 300 }],
    ])
    const route = (id: string, points: { x: number; y: number }[], label = SEEN): Edge => ({ id, source: 'client', target: 'server', type: 'route', data: { points }, label })
    const free = route('free', [{ x: 208, y: 22 }, { x: 600, y: 22 }])
    // Its longest piece runs through the payments.
    const through = route('through', [{ x: 104, y: 44 }, { x: 104, y: 222 }, { x: 704, y: 222 }, { x: 704, y: 44 }])
    // Over the first one's words.
    const same = route('same', [{ x: 208, y: 26 }, { x: 600, y: 26 }])
    // Across the ground of an open group, and across its title.
    const ground = route('ground', [{ x: 100, y: 450 }, { x: 800, y: 450 }])
    const title = route('title', [{ x: 100, y: 320 }, { x: 800, y: 320 }])
    const { on, off } = wordsOf([free, through, same, ground, title], boxes, 'right', new Set(['group']))
    expect([...on.keys()]).toEqual(['free', 'ground'])
    expect(off).toEqual(['through', 'same', 'title'])
    expect(on.get('free')).toEqual(wordBox(SEEN, { x: 404, y: 22 }))
  })

  test('a line without words is not read, and a graph without words has nothing on and nothing off', () => {
    const plain = EDGES.map(({ label: _label, ...edge }) => edge)
    const places = layoutGraph({ nodes: NODES, edges: plain }, IDS, 'right')
    const { on, off } = wordsOf(linesOf(plain, places, OPTIONS).lines, boxesAt(places), 'right')
    expect(on.size).toBe(0)
    expect(off).toEqual([])
    // The words change nothing of the places: the layout does not read them.
    expect([...layoutGraph({ nodes: NODES, edges: EDGES }, IDS, 'right')]).toEqual([...places])
  })
})

function Calls(props: Partial<GraphCanvasProps>) {
  return <GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} {...props} />
}
const flowEdges = () => (handed.props?.edges ?? []) as Edge[]
const flowNodes = () => (handed.props?.nodes ?? []) as FlowNode[]
const line = (id: string) => flowEdges().find((edge) => edge.id === id)!
const placed = () => flowNodes().map((node) => [node.id, node.position.x, node.position.y])
const list = () => document.querySelector('[data-slot="graph-words"]')
const rows = () => Array.from(list()?.querySelectorAll('li') ?? []).map((row) => row.textContent)
const thing = (name: string) => screen.getByRole('button', { name })

describe('on the canvas', () => {
  test('choosing a thing moves nothing: the words that have no room leave their lines and are listed, each with the two things its line joins', () => {
    const { rerender } = render(<Calls />)
    const before = placed()
    expect(list()).toBeNull()
    // Short words between two ranks are on their line, as ever.
    expect(line('g').label).toBe('tells')
    rerender(<Calls selected="server" />)
    // The same places: no room was made.
    expect(placed()).toEqual(before)
    // Not on the lines, where they lay on each other and under the things.
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      expect(line(id).label, id).toBeUndefined()
      expect('labelShowBg' in line(id), id).toBe(false)
    }
    expect(rows()).toEqual([
      `Client → Server ${SEEN}`,
      'Client → Server 2 calls · sampled by the profiler',
      'Client → Server 1 call · not enough proof',
      'Client → Server 3 imports, 1 type',
      'Server → Payments 2 calls, 3 imports',
      // A line that goes both ways says so.
      'Server – Catalog 4 calls, both ways',
    ])
    expect(line('g').label).toBe('tells')
    // Each row has a sample of its line, in the look the line has on the canvas (its dash, its tone).
    const samples = Array.from(list()!.querySelectorAll<SVGLineElement>('.sigrid-graph-sample'))
    expect(samples).toHaveLength(6)
    expect(samples[1]!.style.getPropertyValue('--sigrid-line-dash')).toBe('6 4')
    expect(samples[2]!.style.getPropertyValue('--sigrid-line-stroke')).toBe('var(--color-warning)')
    // For the eye: each thing already says its lines in its description.
    expect(list()!.getAttribute('aria-hidden')).toBe('true')
    // A raised surface under the view's buttons, which stay where they are; it scrolls, and the wheel is its own.
    const group = screen.getByRole('group', { name: 'View' })
    expect(group.parentElement).toBe(list()!.parentElement)
    expect(group.compareDocumentPosition(list()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const name of ['nowheel', 'max-h-36', 'w-64', 'overflow-y-auto', 'bg-raised', 'shadow-sm']) expect(list()!.className.split(' '), name).toContain(name)
    // Another thing chosen: its own lines, and no others.
    rerender(<Calls selected="pay" />)
    expect(placed()).toEqual(before)
    expect(rows()).toEqual(['Server → Payments 2 calls, 3 imports'])
    rerender(<Calls />)
    expect(list()).toBeNull()
  })

  test('the words shown while a thing has the focus are placed the same way, and gone with the focus', () => {
    render(<Calls />)
    const short = line('g')
    act(() => thing('Catalog').focus())
    expect(line('f').label).toBeUndefined()
    expect(rows()).toEqual(['Server – Catalog 4 calls, both ways'])
    // The lines that keep their words are the same lines: nothing else is drawn again.
    expect(line('g')).toBe(short)
    act(() => thing('Catalog').blur())
    expect(list()).toBeNull()
  })

  test('with the app’s places and room between the things, the words are on their lines and nothing is listed', () => {
    const at: Record<string, { x: number; y: number }> = { client: { x: 0, y: 100 }, server: { x: 400, y: 100 }, pay: { x: 800, y: 40 }, catalog: { x: 800, y: 160 }, notify: { x: 1200, y: 40 } }
    const roomy = NODES.map((node) => ({ ...node, ...at[node.id]! }))
    render(<Calls nodes={roomy} edges={EDGES.filter((edge) => edge.id === 'a' || edge.id === 'e' || edge.id === 'g')} selected="server" />)
    expect(line('a').label).toBe(SEEN)
    expect(line('e').label).toBe('2 calls, 3 imports')
    expect(list()).toBeNull()
  })
})
