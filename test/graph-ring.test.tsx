// A ring of things that no root reaches (A → B → A, beside the rest): it is drawn like the rest of the graph and the keys
// reach it, while a thing hidden by a closed one stays hidden. A defect found for Daodan's graphs (2026-11-23): such a
// ring was never in sight.
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, expect, test } from 'vitest'
import { GraphCanvas, visibleGraph, type Graph } from '../src/graph'

const GRAPH: Graph = {
  nodes: [
    { id: 'root', label: 'Gateway' },
    { id: 'c', label: 'Orders' },
    { id: 'd', label: 'Ledger' },
    { id: 'a', label: 'Worker' },
    { id: 'b', label: 'Queue' },
  ],
  edges: [
    { from: 'root', to: 'c' },
    { from: 'c', to: 'd' },
    // The ring beside the rest: nothing points into it from outside.
    { from: 'a', to: 'b' },
    { from: 'b', to: 'a' },
  ],
}

test('a ring no root reaches is in sight, after the rest; a thing hidden by a closed one stays hidden', () => {
  expect(visibleGraph(GRAPH, []).order).toEqual(['root', 'c', 'd', 'a', 'b'])
  const closed = visibleGraph(GRAPH, ['c'])
  expect(closed.order).toEqual(['root', 'c', 'a', 'b'])
  expect(closed.hidden.get('c')).toBe(1)
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

test('the things of the ring are drawn and the keys reach them', () => {
  render(<GraphCanvas aria-label="Services" nodes={GRAPH.nodes} edges={GRAPH.edges} />)
  expect(screen.getAllByRole('treeitem')).toHaveLength(5)
  // Down goes through what is in sight, from the first thing to the last thing of the rest and on into the ring.
  const stop = () => screen.getAllByRole('treeitem').find((el) => el.tabIndex === 0)!
  for (let i = 0; i < 3; i += 1) fireEvent.keyDown(stop(), { key: 'ArrowDown' })
  expect(stop().textContent).toContain('Worker')
  fireEvent.keyDown(stop(), { key: 'ArrowDown' })
  expect(stop().textContent).toContain('Queue')
})
