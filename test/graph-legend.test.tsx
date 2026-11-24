// The key of a graph's lines (`GraphLegend`, the `./graph` entry): a list named by the app, one item per kind of line
// with its word and its count, and a sample hidden from screen readers. The sample and the canvas's line are drawn by
// one module (`graph-lines.ts`) and one rule of graph.css: jsdom draws neither, so what is checked is what each is
// given to draw with, the custom properties of `lineVars`, against the module's own values, and what the rule falls
// back on without them.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { linesOf } from '../src/components/GraphCanvas'
import { LINE_NEAR, LINE_PATH, LINE_STYLES, LINE_TONES, lineLook, lineVars } from '../src/components/graph-lines'
import { GraphLegend, type GraphEdge, type GraphLegendEntry } from '../src/graph'

const ENTRIES: GraphLegendEntry[] = [
  { label: 'Calls', count: 12 },
  { label: 'Waits for', style: 'dashed', tone: 'warning', count: 3 },
  { label: 'Never together', style: 'dotted', tone: 'destructive' },
  { label: 'The path', tone: 'accent', count: 0 },
]

/** The same kinds of line, as edges of a canvas between two things, each a line of its own. */
const EDGES: GraphEdge[] = [
  { id: 'calls', from: 'a', to: 'b' },
  { id: 'waits', from: 'a', to: 'b', kind: 'link', style: 'dashed', tone: 'warning' },
  { id: 'never', from: 'a', to: 'b', kind: 'link', style: 'dotted', tone: 'destructive', directed: false },
  { id: 'path', from: 'a', to: 'b', tone: 'accent' },
]
const PLACES = new Map([['a', { x: 0, y: 0 }], ['b', { x: 300, y: 0 }], ['c', { x: 600, y: 0 }]])
const OPTIONS = { direction: 'right', chosen: null, marked: null, dimmed: null, editable: false } as const
const NAMES = ['--sigrid-line-stroke', '--sigrid-line-width', '--sigrid-line-dash', '--sigrid-line-cap'] as const

/** What the canvas draws a line with: the custom properties on it. */
const drawn = (lines: ReturnType<typeof linesOf>['lines'], id: string) => lines.find((line) => line.id === id)!.style as unknown as Record<string, string>
/** The sample of the entry with this word (found by its place: the word is written twice, by the entry and by its count). */
const sample = (word: string) => screen.getAllByRole('listitem')[ENTRIES.findIndex((entry) => entry.label === word)]!.querySelector('line')!

describe('GraphLegend', () => {
  test('a list named by the app, one item per entry, each with its word and its count; zero or no count shows none', () => {
    render(<GraphLegend aria-label="Kinds of line" entries={ENTRIES} />)
    const list = screen.getByRole('list', { name: 'Kinds of line' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(ENTRIES.length)
    // The word, a space, then the count, which says what it counts: never «Calls12».
    expect(items.map((item) => item.textContent)).toEqual(['Calls 12 Calls', 'Waits for 3 Waits for', 'Never together', 'The path'])
    // The word is always written, so a tone is never said by its colour alone; the count is a `Count`, its word heard after it.
    expect(items.map((item) => item.querySelector('span')!.textContent)).toEqual(ENTRIES.map((entry) => entry.label))
    const count = within(items[1]!).getByText('3')
    expect(count.getAttribute('data-slot')).toBe('count')
    expect(count.querySelector('.sr-only')!.textContent).toBe(' Waits for')
    // The sample is a picture of the line, hidden from screen readers.
    for (const item of items) expect(item.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  test('nothing to key, nothing drawn', () => {
    const { container } = render(<GraphLegend aria-label="Kinds of line" entries={[]} />)
    expect(container.innerHTML).toBe('')
  })

  test('each sample takes its dash, width and colour from the module the canvas draws its lines with', () => {
    render(<GraphLegend aria-label="Kinds of line" entries={ENTRIES} />)
    // The dashed warning line: the module's dash and the warning's colour.
    expect(sample('Waits for').style.getPropertyValue('--sigrid-line-dash')).toBe(LINE_STYLES.dashed.dash)
    expect(sample('Waits for').style.getPropertyValue('--sigrid-line-stroke')).toBe(LINE_TONES.warning.stroke)
    expect(sample('Waits for').style.getPropertyValue('--sigrid-line-width')).toBe(String(LINE_STYLES.dashed.width))
    // The dotted one: round dots, as thick as the module says.
    expect(sample('Never together').style.getPropertyValue('--sigrid-line-cap')).toBe(LINE_STYLES.dotted.cap)
    expect(sample('Never together').style.getPropertyValue('--sigrid-line-width')).toBe(String(LINE_STYLES.dotted.width))
    // A line with neither: solid, in the default tone.
    expect(sample('Calls').style.getPropertyValue('--sigrid-line-dash')).toBe(LINE_STYLES.solid.dash)
    expect(sample('Calls').style.getPropertyValue('--sigrid-line-stroke')).toBe(LINE_TONES.default.stroke)
    // The accent is thicker.
    expect(sample('The path').style.getPropertyValue('--sigrid-line-width')).toBe(String(LINE_TONES.accent.width))
    // Every sample is given the four properties the rule of graph.css draws it with.
    for (const entry of ENTRIES) for (const name of NAMES) expect(sample(entry.label).style.getPropertyValue(name), `${entry.label} ${name}`).not.toBe('')
  })

  test('the sample of a kind of line is what the canvas draws a line of that dash and tone with', () => {
    render(<GraphLegend aria-label="Kinds of line" entries={ENTRIES} />)
    const { lines } = linesOf(EDGES, PLACES, OPTIONS)
    for (const [word, id] of [['Calls', 'calls'], ['Waits for', 'waits'], ['Never together', 'never'], ['The path', 'path']] as const) {
      const line = drawn(lines, id)
      for (const name of NAMES) expect(sample(word).style.getPropertyValue(name), `${word} ${name}`).toBe(line[name])
    }
    // The arrowhead takes the colour of the line's tone from the same module.
    expect(lines.find((line) => line.id === 'waits')!.markerEnd).toMatchObject({ color: LINE_TONES.warning.stroke })
  })
})

describe('the look of the lines (graph-lines.ts)', () => {
  test('at rest: the dash of the style, the colour of the tone, the thicker of their widths; an unknown one is the default', () => {
    const waits = { stroke: LINE_TONES.warning.stroke, width: Math.max(LINE_STYLES.dashed.width, LINE_TONES.warning.width), dash: LINE_STYLES.dashed.dash, cap: LINE_STYLES.dashed.cap }
    expect(lineLook('dashed', 'warning')).toEqual(waits)
    expect(lineLook('dotted', 'accent').width).toBe(Math.max(LINE_STYLES.dotted.width, LINE_TONES.accent.width))
    expect(lineLook()).toEqual(lineLook('solid', 'default'))
    // From JavaScript, a word the types do not have.
    expect(lineLook('wavy' as never, 'pink' as never)).toEqual(lineLook('solid', 'default'))
    expect(lineVars(lineLook('dashed', 'warning'))).toEqual({ '--sigrid-line-stroke': waits.stroke, '--sigrid-line-width': String(waits.width), '--sigrid-line-dash': waits.dash, '--sigrid-line-cap': waits.cap })
  })

  test('on the canvas: the lines of the chosen thing in the soft ink and a little thicker, a tone of their own kept; the path’s as thick as the accent', () => {
    const near = linesOf([{ id: 'plain', from: 'a', to: 'b' }, { id: 'waits', from: 'a', to: 'b', style: 'dashed', tone: 'warning' }, { id: 'never', from: 'a', to: 'b', style: 'dotted' }, { id: 'far', from: 'b', to: 'c' }], PLACES, { ...OPTIONS, chosen: 'a' }).lines
    expect(drawn(near, 'plain')).toEqual(lineVars(lineLook('solid', 'default', { near: true })))
    expect(drawn(near, 'plain')['--sigrid-line-stroke']).toBe(LINE_NEAR.stroke)
    expect(drawn(near, 'plain')['--sigrid-line-width']).toBe(String(LINE_NEAR.width))
    expect(drawn(near, 'waits')['--sigrid-line-stroke']).toBe(LINE_TONES.warning.stroke)
    // A dotted line stays as thick as its dots need.
    expect(drawn(near, 'never')['--sigrid-line-width']).toBe(String(Math.max(LINE_STYLES.dotted.width, LINE_NEAR.width)))
    // A line away from the chosen thing is at rest.
    expect(drawn(near, 'far')).toEqual(lineVars(lineLook()))
    // The path's line: a line without a tone takes the accent, one with a tone keeps it; both as thick as the path.
    const path = linesOf([{ id: 'plain', from: 'a', to: 'b' }, { id: 'waits', from: 'b', to: 'c', style: 'dashed', tone: 'warning' }], PLACES, { ...OPTIONS, marked: new Set(['a', 'b', 'c']) }).lines
    expect(drawn(path, 'plain')['--sigrid-line-stroke']).toBe(LINE_TONES.accent.stroke)
    expect(drawn(path, 'waits')['--sigrid-line-stroke']).toBe(LINE_TONES.warning.stroke)
    expect(drawn(path, 'waits')['--sigrid-line-dash']).toBe(LINE_STYLES.dashed.dash)
    expect(drawn(path, 'waits')['--sigrid-line-width']).toBe(String(LINE_PATH.width))
  })

  test('one object for one look: a line whose look a change of choice leaves as it was keeps its `style`, so React Flow does not draw it again', () => {
    expect(lineVars(lineLook('dashed', 'warning'))).toBe(lineVars(lineLook('dashed', 'warning')))
    expect(lineVars(lineLook('wavy' as never, 'pink' as never))).toBe(lineVars(lineLook()))
    expect(lineVars(lineLook('dashed', 'warning', { near: true }))).not.toBe(lineVars(lineLook('dashed', 'warning')))
    const edges: GraphEdge[] = [{ id: 'ab', from: 'a', to: 'b' }, { id: 'bc', from: 'b', to: 'c', style: 'dashed' }]
    const before = linesOf(edges, PLACES, OPTIONS).lines
    const after = linesOf(edges, PLACES, { ...OPTIONS, chosen: 'a' }).lines
    const styleOf = (lines: typeof before, id: string) => lines.find((line) => line.id === id)!.style
    // Away from the chosen thing: the same object. A line of the chosen thing: its look changed, and its object.
    expect(styleOf(after, 'bc')).toBe(styleOf(before, 'bc'))
    expect(styleOf(after, 'ab')).not.toBe(styleOf(before, 'ab'))
  })

  test('a line without the properties is drawn as the default line: each `var()` of the rule of graph.css falls back on its value', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/graph.css'), 'utf8')
    const fallbacks = new Map(Array.from(css.matchAll(/var\((--sigrid-line-[a-z]+), (.+)\);/g), (match): [string, string] => [match[1]!, match[2]!]))
    expect([...fallbacks.keys()]).toEqual([...NAMES])
    const rest = lineVars(lineLook()) as unknown as Record<string, string>
    // The width as CSS writes it, in px; the others as they are.
    for (const name of NAMES) expect(name === '--sigrid-line-width' ? String(parseFloat(fallbacks.get(name)!)) : fallbacks.get(name), name).toBe(rest[name])
  })
})
