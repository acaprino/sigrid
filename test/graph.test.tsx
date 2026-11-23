// A canvas for a graph (`GraphCanvas`, the `./graph` entry, on React Flow and dagre). jsdom lays nothing out, so the
// canvas itself (pan, zoom, the lines, joining two things by hand, what is drawn of a thousand) is driven in a
// browser, on the showcase (section «GraphCanvas»). Here: what is in sight with some things closed, where the layout
// puts things, and what the canvas is for a keyboard and a screen reader.
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { GraphCanvas, layoutGraph, visibleGraph, type Graph, type GraphChange } from '../src/graph'

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
