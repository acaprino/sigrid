// A canvas as tall as the region that holds it (`GraphCanvas fill`): the content of the frame, a pane, and in a pile
// (the body of a `Page fit`, a `Column fill`) what the other parts leave; without it the box is 384px, as before, and a
// class of the box still wins. A pile around it never shrinks below what its parts need, so the canvas at its floor
// covers nothing that follows. jsdom lays nothing out: what is checked is the classes that make the box take that height
// and the piles they apply to (the documented exception of test/fit-screen.test.tsx and test/virtual-list-fill.test.tsx).
// That they do is seen in a browser, on the showcase (section «GraphCanvas», «as tall as its region»); that the view is
// fitted again is in test/graph.test.tsx.
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, test } from 'vitest'
import { Cluster, Column, Input, Page, ScrollArea } from '../src/primitives'
import { AppShell, ContentSplit } from '../src/layout'
import { GraphCanvas, GraphLegend, type GraphCanvasProps, type GraphEdge, type GraphNode } from '../src/graph'
import { VirtualList } from '../src/virtual'
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
// The library's 15px at the head, the field, 8px, the small map's 150px, 15px at the foot.
const FLOOR = 'min-h-[calc(var(--control-md)_+_188px)]'

/** What a class with a selector of its own (`[&…]:name`) reads after the `&`. */
const selectorOf = (el: Element, name: string) => {
  const own = classes(el).find((it) => it.startsWith('[&') && it.endsWith(`]:${name}`))
  return own?.slice(2, -(name.length + 2)).replaceAll('_', ' ')
}
/** The pile never shrinks below what its parts need: the selector of its `min-h-min` is true of it as it is drawn. */
const holds = (pile: Element) => {
  const selector = selectorOf(pile, 'min-h-min')
  return selector !== undefined && pile.matches(selector)
}
const pileOf = (el: Element) => el.closest('[data-slot="column"]')!

describe('the height of the box', () => {
  test('filling it is as tall and as wide as its region, takes what is left in a pile, and keeps a floor', () => {
    render(<Calls fill />)
    expect(box().getAttribute('data-slot')).toBe('graph')
    expect(box().hasAttribute('data-fill')).toBe(true)
    // The prop is the canvas's own: it does not reach the page.
    expect(box().hasAttribute('fill')).toBe(false)
    expect(classes(box())).toEqual(expect.arrayContaining(['relative', 'h-full', 'w-full', 'flex-1', FLOOR, 'overflow-hidden']))
    for (const gone of ['h-96', 'min-h-0']) expect(classes(box())).not.toContain(gone)
    // The library's own box covers it, also where the height is the floor alone (100% of no height is none).
    expect(classes(flow())).toEqual(expect.arrayContaining(['absolute!', 'inset-0']))
  })

  test('the floor is what the field and the small map need, one over the other at the start of the canvas', () => {
    render(<Calls fill search minimap />)
    // The field at the head, a control tall; the map at the foot, as tall as the library draws it.
    const field = screen.getByRole('searchbox', { name: 'Find' })
    expect(classes(field)).toContain('h-(--control-md)')
    expect(classes(field.closest('.react-flow__panel'))).toEqual(expect.arrayContaining(['top', 'left']))
    const map = box().querySelector('.react-flow__minimap')
    expect(classes(map)).toEqual(expect.arrayContaining(['bottom', 'left']))
    const height = Number(map!.querySelector('svg')!.getAttribute('height'))
    expect(classes(box())).toContain(FLOOR)
    expect(Number(/(\d+)px/.exec(FLOOR)![1])).toBe(15 + 8 + height + 15)
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
    for (const lost of ['h-full', FLOOR, 'flex-1']) expect(classes(box())).not.toContain(lost)
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
    // In a short window it is as tall as its parts, the padding at its foot with them, and the content scrolls.
    expect(holds(pile)).toBe(true)
  })

  test('in a pile in a pile, or in the body of a Page that fits, with a part after the pile: no pile around the canvas shrinks below what it holds', () => {
    const legend = <GraphLegend aria-label="Kinds of line" entries={[{ label: 'Calls', count: 1 }]} />
    const { rerender } = render(
      <Column fill>
        <Column fill>
          {filters}
          <Calls fill />
        </Column>
        {legend}
      </Column>,
    )
    const inner = pileOf(box())
    const outer = pileOf(inner.parentElement!)
    expect(outer).not.toBe(inner)
    expect(inner.nextElementSibling).toBe(screen.getByRole('list', { name: 'Kinds of line' }))
    expect([holds(inner), holds(outer)]).toEqual([true, true])
    rerender(
      <Page fit>
        <Column fill>
          <Calls fill />
        </Column>
        {legend}
      </Page>,
    )
    const pile = pileOf(box())
    expect(pile.nextElementSibling).toBe(screen.getByRole('list', { name: 'Kinds of line' }))
    expect(holds(pile)).toBe(true)
  })

  test('a pile without a canvas that fills, or with a part that scrolls by itself, gives way as ever: a list never makes it as tall as its rows', () => {
    const rows = <VirtualList aria-label="Rows" count={1000} fill>{(index) => <li>{index}</li>}</VirtualList>
    const { rerender } = render(<Column fill data-testid="pile">{rows}</Column>)
    const pile = () => screen.getByTestId('pile')
    expect(selectorOf(pile(), 'min-h-min')).toBeDefined()
    expect(holds(pile())).toBe(false)
    const others = [
      <Calls />,
      <><Calls fill />{rows}</>,
      <><Calls fill /><Column fill>{rows}</Column></>,
      <><Calls fill /><ScrollArea aria-label="Facts">a</ScrollArea></>,
      // Each pane of a split scrolls by itself: the canvas keeps its floor in its own.
      <ContentSplit aside={<p>Flows</p>} asideLabel="Flows"><Calls fill /></ContentSplit>,
    ]
    for (const parts of others) {
      rerender(<Column fill data-testid="pile">{parts}</Column>)
      expect(holds(pile())).toBe(false)
    }
    rerender(<Column fill data-testid="pile"><Calls fill /></Column>)
    expect(holds(pile())).toBe(true)
    // A plain pile has no height to give, and no floor to hold: it is as tall as its parts.
    rerender(<Column data-testid="pile"><Calls fill /></Column>)
    expect(selectorOf(pile(), 'min-h-min')).toBeUndefined()
  })

  test('a pile that does not stretch its parts still gives the canvas its width', () => {
    for (const align of ['start', 'center', 'end'] as const) {
      const { unmount } = render(<Column fill align={align}><Calls fill /></Column>)
      expect(classes(box())).toContain('w-full')
      unmount()
    }
  })

  test('a field that is a part of a pile that fills keeps its height; a part that gives way still does', () => {
    render(
      <Column fill data-testid="pile">
        <Input aria-label="Filter" />
        <Calls fill />
      </Column>,
    )
    const pile = screen.getByTestId('pile')
    const keeps = selectorOf(pile, 'shrink-0')
    expect(keeps?.startsWith('>')).toBe(true)
    expect(Array.from(pile.children).map((part) => part.matches(keeps!.slice(1)))).toEqual([true, false])
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
