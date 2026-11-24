// A canvas as tall as the region that holds it (`GraphCanvas fill`): the content of the frame, a pane, and in a pile
// (the body of a `Page fit`, a `Column fill`) what the other parts leave; without it the box is 384px, as before, and a
// class of the box still wins. jsdom lays nothing out: what is checked is the classes that make the box take that height,
// as in test/fit-screen.test.tsx and test/virtual-list-fill.test.tsx. That it does is seen in a browser, on the showcase
// (section «GraphCanvas», «as tall as its region»); that the view is fitted again is in test/graph.test.tsx.
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, test } from 'vitest'
import { AppShell, Cluster, Column, ContentSplit, Page } from '../src'
import { GraphCanvas, GraphLegend, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'
import { classes } from './helpers'

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

const NODES: GraphNode[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'store', label: 'Store' },
]
const EDGES: GraphEdge[] = [{ from: 'orders', to: 'store' }]
const Calls = (props: Partial<GraphCanvasProps>) => <GraphCanvas aria-label="Calls" model="graph" nodes={NODES} edges={EDGES} {...props} />
const box = () => screen.getByRole('group', { name: 'Calls' })
const flow = () => box().querySelector('.react-flow')!

describe('the height of the box', () => {
  test('filling it is as tall as its region, takes what is left in a pile, and keeps a floor of 192px', () => {
    render(<Calls fill />)
    expect(box().getAttribute('data-slot')).toBe('graph')
    expect(box().hasAttribute('data-fill')).toBe(true)
    // The prop is the canvas's own: it does not reach the page.
    expect(box().hasAttribute('fill')).toBe(false)
    expect(classes(box())).toEqual(expect.arrayContaining(['relative', 'h-full', 'flex-1', 'min-h-48', 'overflow-hidden']))
    for (const gone of ['h-96', 'min-h-0']) expect(classes(box())).not.toContain(gone)
    // The library's own box covers it, also where the height is the floor alone (100% of no height is none).
    expect(classes(flow())).toEqual(expect.arrayContaining(['absolute!', 'inset-0']))
  })

  test('without it the box is as it was: 384px, and the library in it', () => {
    render(<Calls />)
    expect(box().hasAttribute('data-fill')).toBe(false)
    expect(classes(box())).toEqual(['relative', 'h-96', 'min-h-0', 'overflow-hidden', 'rounded-md', 'bg-paper-2'])
    expect(classes(flow())).not.toContain('absolute!')
  })

  test('a class of the box still wins, filling or not', () => {
    const { rerender } = render(<Calls className="h-80" />)
    expect(classes(box())).toContain('h-80')
    expect(classes(box())).not.toContain('h-96')
    rerender(<Calls fill className="h-80 min-h-0 flex-none" />)
    expect(classes(box())).toEqual(expect.arrayContaining(['h-80', 'min-h-0', 'flex-none']))
    for (const lost of ['h-full', 'min-h-48', 'flex-1']) expect(classes(box())).not.toContain(lost)
  })
})

describe('the regions that hold it', () => {
  const filters = (
    <Cluster>
      <button type="button">Only calls</button>
    </Cluster>
  )

  test('in a Column that fills, under a row of filters and over its key: the three are its parts, and the canvas alone gives way', () => {
    render(
      <AppShell contentLabel="Map">
        <Column fill pad="md">
          {filters}
          <Calls fill />
          <GraphLegend aria-label="Kinds of line" entries={[{ label: 'Calls', count: 1 }]} />
        </Column>
      </AppShell>,
    )
    const pile = box().parentElement!
    expect(Array.from(pile.children).map((part) => part.getAttribute('data-slot'))[1]).toBe('graph')
    expect(pile.lastElementChild).toBe(screen.getByRole('list', { name: 'Kinds of line' }))
    // The content of the frame is a block with a height: the pile is all of it (`h-full`).
    expect(pile.parentElement).toBe(screen.getByRole('main', { name: 'Map' }))
    expect(classes(pile)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'h-full', 'min-h-0']))
    expect(classes(box())).toContain('flex-1')
    expect(classes(pile.firstElementChild)).not.toContain('flex-1')
  })

  test('in a Page that fits, under a row of filters, alone or in a Column that fills: the body is a pile that gives its height', () => {
    const { rerender } = render(
      <Page fit>
        {filters}
        <Calls fill />
      </Page>,
    )
    const body = () => document.querySelector('[data-slot="page-body"]')!
    expect(box().parentElement).toBe(body())
    expect(classes(body())).toEqual(expect.arrayContaining(['flex', 'flex-col', 'min-h-0', 'flex-1', 'overflow-y-auto']))
    expect(classes(box())).toContain('flex-1')
    rerender(
      <Page fit>
        <Column fill>
          {filters}
          <Calls fill />
        </Column>
      </Page>,
    )
    const pile = box().parentElement!
    expect(pile.parentElement).toBe(body())
    expect(classes(pile)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'min-h-0', 'flex-1']))
  })

  test('in a pane of a ContentSplit it is the whole pane', () => {
    render(
      <ContentSplit aside={<p>Flows</p>} asideLabel="Flows">
        <Calls fill />
      </ContentSplit>,
    )
    expect(box().parentElement!.getAttribute('data-slot')).toBe('content-split-main')
    expect(classes(box())).toContain('h-full')
  })
})
