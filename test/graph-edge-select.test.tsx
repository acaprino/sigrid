// The lines of the canvas (`GraphCanvas`) that the person can choose (`onSelectEdge`, `selectedEdge`): a press on a
// line or on its words, the keys on it, its name and its state for screen readers, its look, and what stays as it was
// for an app that passes neither prop (no line takes a press or the focus).
// jsdom lays nothing out and React Flow draws a line only once it has measured its ends, so (as in
// test/graph-flags.test.tsx) the lines are read in what the canvas hands React Flow, and from `linesOf`. For the keys
// and the Tab stop each handed line is also drawn here, inside the canvas, as React Flow 13.0.2 draws its wrapper
// (`EdgeWrapper`: the class `react-flow__edge` and the line's own, `data-id`, tabindex 0 when `focusable`, the role
// from `ariaRole`, the name from `ariaLabel`, then `domAttributes` laid over them, and `onEdgeClick` on a press).
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Edge, ReactFlowProps } from '@xyflow/react'
import { WordsProvider } from '../src'
import { linesOf } from '../src/assemblies/GraphCanvas'
import { LINE_CHOSEN, LINE_TONES, lineLook } from '../src/assemblies/graph-lines'
import { GraphCanvas, type Graph, type GraphCanvasProps, type GraphChange, type GraphEdge, type GraphNode } from '../src/graph'

const handed = vi.hoisted(() => ({ props: null as ReactFlowProps | null }))
vi.mock('@xyflow/react', async (importOriginal) => {
  const flow = await importOriginal<typeof import('@xyflow/react')>()
  const { createElement } = await import('react')
  return {
    ...flow,
    ReactFlow: (props: ReactFlowProps) => {
      handed.props = props
      const lines = (props.edges ?? []).map((line) =>
        createElement('g', {
          key: line.id,
          className: ['react-flow__edge', line.className].filter(Boolean).join(' '),
          'data-id': line.id,
          'data-drawn-here': '',
          tabIndex: line.focusable ? 0 : undefined,
          role: line.ariaRole ?? (line.focusable ? 'group' : 'img'),
          'aria-roledescription': 'edge',
          'aria-label': line.ariaLabel,
          'aria-describedby': line.focusable ? 'the-library-own' : undefined,
          ...line.domAttributes,
          onClick: (event: React.MouseEvent) => props.onEdgeClick?.(event, line),
        }),
      )
      return createElement(flow.ReactFlow, props, props.children, createElement('svg', { key: 'lines-drawn-here' }, lines))
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

// A team and the messages between its agents: each message a line with a name of its own.
const NODES: GraphNode[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'coder', label: 'Coder' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'tester', label: 'Tester' },
]
const EDGES: GraphEdge[] = [
  { id: 'm1', from: 'lead', to: 'coder', kind: 'link', label: 'Build the login' },
  { id: 'm2', from: 'coder', to: 'reviewer', kind: 'link', label: 'Review this', labelShown: 'chosen' },
  { id: 'm3', from: 'reviewer', to: 'coder', kind: 'link', label: 'Two notes', tone: 'warning' },
  { id: 'm4', from: 'lead', to: 'tester', kind: 'link', directed: false },
  // Without an id and without words: named by its two ends.
  { from: 'coder', to: 'tester' },
]
const NAMES = ['Lead to Coder, Build the login', 'Coder to Reviewer, Review this', 'Reviewer to Coder, Two notes', 'Lead with Tester', 'Coder to Tester']

/** An app that keeps the chosen thing and the chosen line, as the canvas asks it to. */
function Team({ onLine, onThing, start = null, ...props }: Partial<GraphCanvasProps> & { onLine?: (id: string | null) => void; onThing?: (id: string | null) => void; start?: string | null }) {
  const [thing, setThing] = React.useState<string | null>(null)
  const [line, setLine] = React.useState<string | null>(start)
  return (
    <GraphCanvas
      aria-label="Team"
      model="graph"
      nodes={NODES}
      edges={EDGES}
      selected={thing}
      onSelect={(id) => {
        onThing?.(id)
        setThing(id)
      }}
      selectedEdge={line}
      onSelectEdge={(id) => {
        onLine?.(id)
        setLine(id)
      }}
      {...props}
    />
  )
}

const flowEdges = () => (handed.props?.edges ?? []) as Edge[]
const handedLine = (id: string) => flowEdges().find((line) => line.id === id)
const drawn = () => Array.from(document.querySelectorAll<SVGGElement>('g[data-drawn-here]'))
const line = (id: string) => {
  const el = drawn().find((it) => it.getAttribute('data-id') === id)
  expect(el).toBeDefined()
  return el!
}
/** The line that has the Tab stop, once it is seen to be the only one. */
const stop = () => {
  const all = drawn().filter((el) => el.getAttribute('tabindex') === '0')
  expect(all).toHaveLength(1)
  return all[0]!
}
const varsOf = (it: Edge | undefined) => (it?.style ?? {}) as unknown as Record<string, string>
const PLACES = new Map(NODES.map((node, at): [string, { x: number; y: number }] => [node.id, { x: at * 300, y: 0 }]))
const OPTIONS = { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false } as const

describe('GraphCanvas: lines the person can choose', () => {
  test('without the props nothing changes: no line takes a press or the focus, and none is a Tab stop', () => {
    render(<GraphCanvas aria-label="Team" model="graph" nodes={NODES} edges={EDGES} />)
    expect(handed.props?.edgesFocusable).toBe(false)
    expect(handed.props?.onEdgeClick).toBeUndefined()
    expect(flowEdges()).toHaveLength(5)
    for (const it of flowEdges()) {
      expect(it.focusable).toBe(false)
      expect(it.selectable).toBe(false)
      expect(it.interactionWidth).toBeUndefined()
      expect(it.ariaRole).toBeUndefined()
      expect(it.className ?? '').not.toContain('sigrid-graph-pick')
    }
    expect(drawn().filter((el) => el.hasAttribute('tabindex'))).toEqual([])
    // What a `link` says is in the description of its two things: the line is not read again.
    expect(handedLine('m1')?.domAttributes).toEqual({ 'aria-hidden': true })
    // `selectedEdge` alone marks a line and makes none a control.
    const { lines } = linesOf(EDGES, PLACES, { ...OPTIONS, picked: 'm1' })
    expect(lines[0]?.className).toBe('sigrid-graph-chosen')
    expect(lines.every((it) => it.focusable === false)).toBe(true)
    expect(lines[0]?.domAttributes).toEqual({ 'aria-hidden': true })
  })

  test('each line is a button named by its two things and its words, in the app’s words; none is hidden', () => {
    render(<Team />)
    expect(handed.props?.edgesFocusable).toBe(true)
    expect(drawn().map((el) => el.getAttribute('role'))).toEqual(Array(5).fill('button'))
    expect(drawn().map((el) => el.getAttribute('aria-label'))).toEqual(NAMES)
    expect(screen.getByRole('button', { name: 'Lead with Tester' })).toBe(line('m4'))
    for (const el of drawn()) {
      expect(el.hasAttribute('aria-hidden')).toBe(false)
      // The library's own word for the kind and its description (its keys, in English) are not said.
      expect(el.hasAttribute('aria-roledescription')).toBe(false)
      expect(el.hasAttribute('aria-describedby')).toBe(false)
      expect(el.hasAttribute('aria-current')).toBe(false)
    }
    // A press is taken 12px from the line on each side.
    expect(flowEdges().map((it) => it.interactionWidth)).toEqual(Array(5).fill(24))
  })

  test('the words of the name are the app’s', () => {
    render(
      <WordsProvider words={{ graph: { lineName: (from, to, both, label) => `${from} ${both ? 'con' : 'a'} ${to}${label ? `: ${label}` : ''}` } }}>
        <Team />
      </WordsProvider>,
    )
    expect(line('m1').getAttribute('aria-label')).toBe('Lead a Coder: Build the login')
    expect(line('m4').getAttribute('aria-label')).toBe('Lead con Tester')
  })

  test('a press chooses the line: it is told, drawn as the chosen one with its words, and heard chosen', () => {
    const onLine = vi.fn()
    render(<Team onLine={onLine} />)
    // Its words wait for a choice.
    expect(handedLine('m2')?.label).toBeUndefined()
    fireEvent.click(line('m2'))
    expect(onLine.mock.calls).toEqual([['m2']])
    const chosen = handedLine('m2')
    expect(chosen?.className).toBe('sigrid-graph-pick sigrid-graph-chosen')
    expect(varsOf(chosen)['--sigrid-line-stroke']).toBe(LINE_CHOSEN.stroke)
    expect(varsOf(chosen)['--sigrid-line-width']).toBe(String(LINE_CHOSEN.width))
    expect((chosen?.markerEnd as { color?: string } | undefined)?.color).toBe(LINE_CHOSEN.stroke)
    expect(chosen?.label).toBe('Review this')
    expect(line('m2').getAttribute('aria-current')).toBe('true')
    expect(drawn().filter((el) => el.hasAttribute('aria-current'))).toHaveLength(1)
    // The others are as they were, and no line is React Flow's own pick where nothing is taken away.
    expect(varsOf(handedLine('m1'))['--sigrid-line-width']).toBe('1')
    expect(flowEdges().some((it) => it.selected)).toBe(false)
    // A line with a tone of its own keeps it, and is as thick.
    fireEvent.click(line('m3'))
    expect(onLine).toHaveBeenLastCalledWith('m3')
    expect(varsOf(handedLine('m3'))['--sigrid-line-stroke']).toBe(LINE_TONES.warning.stroke)
    expect(varsOf(handedLine('m3'))['--sigrid-line-width']).toBe(String(LINE_CHOSEN.width))
    expect(handedLine('m2')?.className).toBe('sigrid-graph-pick')
    // An edge without an id is named by its two ends.
    fireEvent.click(line('coder→tester'))
    expect(onLine).toHaveBeenLastCalledWith('coder→tester')
  })

  test('one choice at a time: a thing gives up the line, a line the thing, the ground both', () => {
    const onLine = vi.fn()
    const onThing = vi.fn()
    render(<Team onLine={onLine} onThing={onThing} />)
    fireEvent.click(line('m1'))
    // Nothing was chosen: the things are not asked anything.
    expect(onThing).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Coder' }), { key: 'Enter' })
    expect(onThing.mock.calls).toEqual([['coder']])
    expect(onLine.mock.calls).toEqual([['m1'], [null]])
    expect(drawn().filter((el) => el.hasAttribute('aria-current'))).toEqual([])
    // Another thing, with no line chosen: the lines are not asked anything.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Lead' }), { key: 'Enter' })
    expect(onLine).toHaveBeenCalledTimes(2)
    fireEvent.click(line('m4'))
    expect(onLine).toHaveBeenLastCalledWith('m4')
    expect(onThing).toHaveBeenLastCalledWith(null)
    act(() => handed.props?.onPaneClick?.({} as React.MouseEvent))
    expect(onLine).toHaveBeenLastCalledWith(null)
    expect(onThing).toHaveBeenLastCalledWith(null)
    expect(drawn().filter((el) => el.hasAttribute('aria-current'))).toEqual([])
  })

  test('the keyboard: one Tab stop for the lines, the arrows from line to line, Enter and Space choose, Escape gives up', () => {
    const onLine = vi.fn()
    render(<Team onLine={onLine} />)
    // The first line holds the stop; every other is out of the Tab order and can still take the focus.
    expect(stop()).toBe(line('m1'))
    expect(drawn().map((el) => el.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1'])
    act(() => stop().focus())
    fireEvent.keyDown(line('m1'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(line('m2'))
    expect(stop()).toBe(line('m2'))
    fireEvent.keyDown(line('m2'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(line('m3'))
    fireEvent.keyDown(line('m3'), { key: 'ArrowUp' })
    fireEvent.keyDown(line('m2'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(line('m1'))
    // At the first line there is no line before: the key is used and nothing moves.
    fireEvent.keyDown(line('m1'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(line('m1'))
    fireEvent.keyDown(line('m1'), { key: 'End' })
    expect(document.activeElement).toBe(line('coder→tester'))
    fireEvent.keyDown(line('coder→tester'), { key: 'Home' })
    expect(document.activeElement).toBe(line('m1'))
    // Moving chooses nothing.
    expect(onLine).not.toHaveBeenCalled()
    // Escape with no choice is not the canvas's key.
    expect(fireEvent.keyDown(line('m1'), { key: 'Escape' })).toBe(true)
    expect(fireEvent.keyDown(line('m1'), { key: 'Enter' })).toBe(false)
    expect(onLine.mock.calls).toEqual([['m1']])
    expect(line('m1').getAttribute('aria-current')).toBe('true')
    fireEvent.keyDown(line('m1'), { key: 'ArrowDown' })
    expect(fireEvent.keyDown(line('m2'), { key: ' ' })).toBe(false)
    expect(onLine).toHaveBeenLastCalledWith('m2')
    expect(line('m2').getAttribute('aria-current')).toBe('true')
    expect(fireEvent.keyDown(line('m2'), { key: 'Escape' })).toBe(false)
    expect(onLine).toHaveBeenLastCalledWith(null)
    expect(drawn().filter((el) => el.hasAttribute('aria-current'))).toEqual([])
    // Delete is not the canvas's key where nothing is taken away; the view's keys work from a line as from anywhere.
    expect(fireEvent.keyDown(line('m2'), { key: 'Delete' })).toBe(true)
    expect(fireEvent.keyDown(line('m2'), { key: '0' })).toBe(false)
    // The things keep their own Tab stop and their keys.
    expect(Array.from(document.querySelectorAll<HTMLElement>('[data-slot="graph-node"]')).filter((el) => el.tabIndex === 0)).toHaveLength(1)
  })

  test('the chosen line holds the Tab stop until the focus goes to another', () => {
    render(<Team start="m3" />)
    expect(stop()).toBe(line('m3'))
    act(() => line('m4').focus())
    expect(stop()).toBe(line('m4'))
  })

  test('in the tree mode too, with a path: the chosen line is thicker than the path’s and never dimmed', () => {
    const steps = new Map([['lead', [1]], ['coder', [2]]])
    const tree: GraphEdge[] = [
      { id: 'a', from: 'lead', to: 'coder' },
      { id: 'b', from: 'lead', to: 'reviewer' },
      { id: 'c', from: 'reviewer', to: 'tester', label: 'then' },
    ]
    const onLine = vi.fn()
    render(<Team model="tree" edges={tree} steps={steps} onLine={onLine} animated />)
    expect(screen.getByRole('tree', { name: 'Team' })).toBeDefined()
    expect(drawn().map((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([['button', 'Lead to Coder'], ['button', 'Lead to Reviewer'], ['button', 'Reviewer to Tester, then']])
    // The line to the tester is off the path: dimmed, until it is chosen.
    expect(handedLine('c')?.className).toBe('sigrid-graph-dim sigrid-graph-pick')
    fireEvent.click(line('c'))
    expect(onLine).toHaveBeenLastCalledWith('c')
    expect(handedLine('c')?.className).toBe('sigrid-graph-pick sigrid-graph-chosen')
    // The path's own line chosen: its accent, thicker than the path's 2px.
    expect(varsOf(handedLine('a'))['--sigrid-line-width']).toBe('2')
    fireEvent.keyDown(line('a'), { key: 'Enter' })
    expect(varsOf(handedLine('a'))['--sigrid-line-width']).toBe(String(LINE_CHOSEN.width))
    expect(varsOf(handedLine('a'))['--sigrid-line-stroke']).toBe(LINE_TONES.accent.stroke)
  })

  test('editable: the chosen line is the one Delete takes away; Delete on a line takes it, once, and the focus goes to the next', () => {
    const changed = vi.fn<(next: Graph, change: GraphChange) => void>()
    const onLine = vi.fn()
    function Editor() {
      const [graph, setGraph] = React.useState<Graph>({ nodes: NODES, edges: EDGES })
      return (
        <Team
          nodes={graph.nodes}
          edges={graph.edges}
          editable
          onLine={onLine}
          onChange={(next, change) => {
            changed(next, change)
            setGraph(next)
          }}
        />
      )
    }
    render(<Editor />)
    // Every line can be picked by React Flow, as with `editable` alone; none is until one is chosen.
    expect(flowEdges().every((it) => it.selectable === true && it.focusable === true)).toBe(true)
    expect(flowEdges().some((it) => it.selected)).toBe(false)
    fireEvent.click(line('m2'))
    expect(flowEdges().filter((it) => it.selected).map((it) => it.id)).toEqual(['m2'])
    // React Flow's own Delete (the focus on the ground) takes the chosen line, and the choice is given up.
    const picked = handedLine('m2')!
    act(() => handed.props?.onDelete?.({ nodes: [], edges: [picked] }))
    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed.mock.calls[0]![1]).toEqual({ kind: 'remove', nodes: [], edges: [EDGES[1]] })
    expect(onLine.mock.calls).toEqual([['m2'], [null]])
    expect(drawn().map((el) => el.getAttribute('data-id'))).toEqual(['m1', 'm3', 'm4', 'coder→tester'])
    // Delete on the line that has the focus, not chosen: that line goes, once, and the next takes the focus.
    act(() => line('m3').focus())
    expect(fireEvent.keyDown(line('m3'), { key: 'Delete' })).toBe(false)
    expect(changed).toHaveBeenCalledTimes(2)
    expect(changed.mock.calls[1]![1]).toEqual({ kind: 'remove', nodes: [], edges: [EDGES[2]] })
    expect(onLine).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(line('m4'))
    expect(stop()).toBe(line('m4'))
    // A thing taken away takes its lines, and the chosen one among them is given up.
    fireEvent.keyDown(line('m4'), { key: 'Enter' })
    expect(onLine).toHaveBeenLastCalledWith('m4')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Tester' }), { key: 'Delete' })
    expect(changed.mock.calls[2]![1]).toMatchObject({ kind: 'remove', nodes: ['tester'] })
    expect(onLine).toHaveBeenLastCalledWith(null)
    expect(drawn().map((el) => el.getAttribute('data-id'))).toEqual(['m1'])
    // The handles that join two things are still there.
    expect(handed.props?.nodesConnectable).toBe(true)
    expect(handed.props?.onConnect).toBeDefined()
  })

  test('the look of the chosen line comes from the lines’ one table', () => {
    expect(lineLook('solid', 'default', { chosen: true })).toEqual({ stroke: LINE_CHOSEN.stroke, width: LINE_CHOSEN.width, dash: 'none', cap: 'butt' })
    expect(lineLook('dashed', 'destructive', { chosen: true, near: true })).toEqual({ stroke: LINE_TONES.destructive.stroke, width: LINE_CHOSEN.width, dash: '6 4', cap: 'butt' })
    expect(LINE_CHOSEN.stroke).toMatch(/^var\(--color-/)
    // At rest nothing changed.
    expect(lineLook()).toEqual({ stroke: LINE_TONES.default.stroke, width: 1, dash: 'none', cap: 'butt' })
  })
})
