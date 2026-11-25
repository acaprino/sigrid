// The tiling area (`Workspace`): panes in a split tree, each a group of tabs. What is drawn, what stays mounted when
// things move, the dividers by pointer and by keys, a tab closed, put in order, moved by hand and by keys, its menu,
// the focused pane, the pane that fills the area. jsdom does no layout: the boxes the drag reads are given by a stand-in
// for `getBoundingClientRect` (the area is 1000 by 600, a bar 36 tall, a tab 100 wide).
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { settle } from './helpers'
import { DEFAULT_WORDS } from '../src/words'
import {
  Workspace,
  findWorkspaceGroup,
  moveWorkspaceTab,
  workspaceGroups,
  type WorkspaceNode,
  type WorkspaceProps,
  type WorkspaceTab,
  type WorkspaceTabs,
} from '../src/assemblies'

afterEach(() => vi.restoreAllMocks())

const tab = (id: string, extra: Partial<WorkspaceTab> = {}): WorkspaceTab => ({ id, title: id.toUpperCase(), ...extra })
const group = (id: string, ids: string[], activeId: string | null | undefined = ids[0] ?? null): WorkspaceTabs => ({ kind: 'tabs', id, tabs: ids.map((i) => tab(i)), activeId })
const row = (weights: number[], ...children: WorkspaceNode[]): WorkspaceNode => ({ kind: 'split', direction: 'horizontal', weights, children })
const column = (weights: number[], ...children: WorkspaceNode[]): WorkspaceNode => ({ kind: 'split', direction: 'vertical', weights, children })
/** The weights of the root, a split. */
const weightsOf = (tree: WorkspaceNode): readonly number[] => {
  if (tree.kind !== 'split') throw new Error('not a split')
  return tree.weights
}
const ids = (tree: WorkspaceNode) => workspaceGroups(tree).map((g) => `${g.id}:${g.tabs.map((t) => t.id).join('')}`)

const W = 1000
const H = 600
const BAR = 36
const TAB = 100

const rect = (left: number, top: number, width: number, height: number) => ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect

/** Boxes where jsdom has none: the area, a pane's bar and the tabs in it, placed from the pane's percent. */
function boxes() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const slot = this.getAttribute('data-slot')
    if (slot === 'workspace-canvas' || slot === 'workspace') return rect(0, 0, W, H)
    const pane = this.closest('[data-slot="workspace-group"]') as HTMLElement | null
    const left = pane ? (parseFloat(pane.style.getPropertyValue('--ws-x')) / 100) * W : 0
    if (slot === 'workspace-header') return rect(left, 0, 400, BAR)
    if (slot === 'tabs-trigger') {
      const at = [...pane!.querySelectorAll('[data-slot="tabs-trigger"]')].indexOf(this)
      return rect(left + at * TAB, 0, TAB, BAR)
    }
    return rect(0, 0, 0, 0)
  })
}

function Probe({ log, id }: { log: string[]; id: string }) {
  React.useEffect(() => {
    log.push(`mount ${id}`)
    return () => void log.push(`unmount ${id}`)
  }, [log, id])
  return <p data-testid={`content-${id}`}>content of {id}</p>
}

/** The area with the tree kept by a stand-in for the app: what `onChange` gives is what is drawn next. */
function Host({ start, spy, ...props }: { start: WorkspaceNode } & Partial<WorkspaceProps> & { spy?: (tree: WorkspaceNode) => void }) {
  const [tree, setTree] = React.useState(start)
  return (
    <Workspace
      tree={tree}
      onChange={(next) => {
        spy?.(next)
        setTree(next)
      }}
      label="Terminals"
      renderTab={(t) => <p data-testid={`content-${t.id}`}>content of {t.id}</p>}
      {...props}
    />
  )
}

const pane = (name: string) => screen.getByRole('region', { name })
const tabOf = (title: string, within_?: HTMLElement) => (within_ ? within(within_) : screen).getByRole('tab', { name: title })
const sashes = () => screen.queryAllByRole('separator')
const panel = (id: string) => document.querySelector<HTMLElement>(`[data-slot="workspace-content"] [role="tabpanel"][aria-labelledby$="-tab-${id}"]`)!
const now = (el: Element) => Number(el.getAttribute('aria-valuenow'))

// ---- What is drawn ----

test('the area is a named group of named panes; each pane has a strip of tabs, the chosen one selected, and its panel shown', () => {
  render(<Host start={row([1, 1], group('g1', ['a', 'b'], 'b'), group('g2', ['c']))} />)
  expect(screen.getByRole('group', { name: 'Terminals' })).not.toBeNull()
  expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Pane 1', 'Pane 2'])
  const first = pane('Pane 1')
  expect(within(first).getByRole('tablist', { name: 'Tabs' })).not.toBeNull()
  expect(within(first).getAllByRole('tab').map((t) => t.textContent)).toEqual(['A', 'B'])
  expect(tabOf('A', first).getAttribute('aria-selected')).toBe('false')
  expect(tabOf('B', first).getAttribute('aria-selected')).toBe('true')
  // The panel of a tab is named by it.
  expect(screen.getByRole('tabpanel', { name: 'B' }).textContent).toBe('content of b')
  expect(screen.getByRole('tabpanel', { name: 'C' }).textContent).toBe('content of c')
  expect(tabOf('B', first).getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel', { name: 'B' }).id)
})

test('the tabs that are not shown stay mounted, hidden; with keepMounted active they are not drawn', () => {
  const { rerender } = render(<Host start={group('g1', ['a', 'b', 'c'], 'b')} />)
  expect(['a', 'b', 'c'].map((id) => screen.getByTestId(`content-${id}`)).length).toBe(3)
  const hiddenOf = (id: string) => screen.getByTestId(`content-${id}`).closest<HTMLElement>('[data-slot="workspace-content"]')!.hidden
  expect([hiddenOf('a'), hiddenOf('b'), hiddenOf('c')]).toEqual([true, false, true])
  // Not named by the role while hidden.
  expect(screen.getAllByRole('tabpanel').map((p) => p.getAttribute('aria-labelledby')!.split('-tab-')[1])).toEqual(['b'])
  rerender(<Host start={group('g1', ['a', 'b', 'c'], 'b')} keepMounted="active" />)
  expect(screen.queryByTestId('content-a')).toBeNull()
  expect(screen.getByTestId('content-b')).not.toBeNull()
})

test('renderTab is told whether the tab is shown, on screen and in the pane in focus', () => {
  const seen: Record<string, unknown> = {}
  render(
    <Host
      start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))}
      renderTab={(t, state) => {
        seen[t.id] = state
        return <p>{t.id}</p>
      }}
    />,
  )
  expect(seen).toEqual({
    a: { active: true, visible: true, focused: true, groupId: 'g1' },
    b: { active: false, visible: false, focused: true, groupId: 'g1' },
    c: { active: true, visible: true, focused: false, groupId: 'g2' },
  })
})

test('the panes are boxes in percent of the area from the weights, one flat list of contents above them; a tab icon and a title that is cut', () => {
  render(<Host start={row([1, 3], { kind: 'tabs', id: 'g1', tabs: [tab('a', { icon: 'terminal' })], activeId: 'a' }, column([1, 1], group('g2', ['b']), group('g3', ['c'])))} />)
  const style = (name: string) => {
    const el = pane(name)
    return ['--ws-x', '--ws-y', '--ws-w', '--ws-h'].map((v) => el.style.getPropertyValue(v))
  }
  expect(style('Pane 1')).toEqual(['0%', '0%', '25%', '100%'])
  expect(style('Pane 2')).toEqual(['25%', '0%', '75%', '50%'])
  expect(style('Pane 3')).toEqual(['25%', '50%', '75%', '50%'])
  // The contents are siblings of the panes, not inside them: moving a tab does not move its content in the page.
  const contents = [...document.querySelectorAll('[data-slot="workspace-content"]')]
  expect(contents.map((c) => c.parentElement)).toEqual([contents[0]!.parentElement, ...contents.slice(1).map(() => contents[0]!.parentElement)])
  expect(contents.every((c) => !pane('Pane 1').contains(c))).toBe(true)
  expect(tabOf('A').querySelector('[data-icon="terminal"]')).not.toBeNull()
  expect(tabOf('A').className).toContain('max-w-56')
})

test('a long strip scrolls and keeps the chosen tab in sight (the strip of Tabs)', () => {
  render(<Host start={group('g1', ['a', 'b', 'c', 'd', 'e', 'f'], 'e')} />)
  const list = screen.getByRole('tablist')
  expect(list.getAttribute('data-scroll-shade')).toBe('x')
  expect(list.className).toContain('overflow-x-auto')
})

// ---- Tabs: chosen, closed ----

test('a tab is chosen with a press and with the arrows, and the app is told the new tree', async () => {
  const told = vi.fn()
  render(<Host start={group('g1', ['a', 'b', 'c'])} spy={told} />)
  fireEvent.click(tabOf('B'))
  await waitFor(() => expect(told).toHaveBeenCalledTimes(1))
  expect(findWorkspaceGroup(told.mock.calls[0]![0], 'g1')!.activeId).toBe('b')
  expect(tabOf('B').getAttribute('aria-selected')).toBe('true')
  // The arrows move along the strip (that they also choose is Ark's, and needs a real frame clock).
  act(() => tabOf('B').focus())
  fireEvent.keyDown(tabOf('B'), { key: 'ArrowRight' })
  await settle(120)
  expect(document.activeElement).toBe(tabOf('C'))
  fireEvent.keyDown(tabOf('C'), { key: 'Home' })
  await settle(120)
  expect(document.activeElement).toBe(tabOf('A'))
})

test('the × closes a tab, the neighbour takes its place, and a pane left empty goes', () => {
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  const close = screen.getByRole('button', { name: 'Close A' })
  expect(close.tabIndex).toBe(-1)
  fireEvent.click(close)
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:b', 'g2:c'])
  fireEvent.click(screen.getByRole('button', { name: 'Close C' }))
  expect(ids(told.mock.calls[1]![0])).toEqual(['g1:b'])
  expect(screen.queryByRole('region', { name: 'Pane 2' })).toBeNull()
  expect(sashes()).toHaveLength(0)
})

test('Delete and a middle press close the tab in focus; the focus goes to the tab that takes its place', async () => {
  const told = vi.fn()
  render(<Host start={group('g1', ['a', 'b', 'c'], 'b')} spy={told} />)
  tabOf('B').focus()
  fireEvent.keyDown(tabOf('B'), { key: 'Delete' })
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:ac'])
  await waitFor(() => expect(document.activeElement).toBe(tabOf('C')))
  fireEvent(tabOf('A'), new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }))
  expect(ids(told.mock.calls[1]![0])).toEqual(['g1:c'])
  // The ordinary press of the other buttons is not a close.
  fireEvent(tabOf('C'), new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 2 }))
  expect(told).toHaveBeenCalledTimes(2)
})

test('onCloseTab is asked with the tab and its pane; closable false has no × and Delete does nothing', () => {
  const told = vi.fn()
  const asked = vi.fn()
  const start = row([1, 1], { kind: 'tabs', id: 'g1', tabs: [tab('a'), tab('b', { closable: false })], activeId: 'a' }, group('g2', ['c']))
  render(<Host start={start} spy={told} onCloseTab={asked} />)
  fireEvent.click(screen.getByRole('button', { name: 'Close C' }))
  expect(asked).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), 'g2')
  expect(told).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Close B' })).toBeNull()
  fireEvent.keyDown(tabOf('B'), { key: 'Delete' })
  expect(asked).toHaveBeenCalledTimes(1)
})

// ---- Contents stay mounted ----

test('a tab moved to another pane, a pane divided or closed around it: its content is the same node, mounted once', () => {
  const log: string[] = []
  const start = row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))
  const App = ({ tree }: { tree: WorkspaceNode }) => <Workspace tree={tree} onChange={() => {}} label="Terminals" renderTab={(t) => <Probe log={log} id={t.id} />} />
  const { rerender } = render(<App tree={start} />)
  const node = screen.getByTestId('content-b')
  expect(log.sort()).toEqual(['mount a', 'mount b', 'mount c'])
  // b goes into g2, then g2 is divided to put c beside it, then g1 closes around a.
  const moved = moveWorkspaceTab(start, 'b', { groupId: 'g2', index: 0 })
  rerender(<App tree={moved} />)
  expect(screen.getByTestId('content-b')).toBe(node)
  const divided = moveWorkspaceTab(moved, 'c', { groupId: 'g2', edge: 'bottom', newId: 'g3' })
  rerender(<App tree={divided} />)
  expect(screen.getByTestId('content-b')).toBe(node)
  expect(pane('Pane 3')).not.toBeNull()
  const closed = moveWorkspaceTab(divided, 'a', { groupId: 'g3' })
  rerender(<App tree={closed} />)
  expect(screen.getByTestId('content-b')).toBe(node)
  expect(log.filter((entry) => entry.startsWith('unmount'))).toEqual([])
  expect(log.filter((entry) => entry.startsWith('mount')).length).toBe(3)
  // A tab that leaves the tree is the only one unmounted.
  rerender(<App tree={{ ...closed, kind: 'tabs', id: 'g2', tabs: [tab('b')], activeId: 'b' } as WorkspaceNode} />)
  expect(log.filter((entry) => entry.startsWith('unmount')).sort()).toEqual(['unmount a', 'unmount c'])
})

test('the content keeps one place among its brothers whatever the tree does: no node is taken out and put back', () => {
  const start = row([1, 1], group('g1', ['a', 'b']), group('g2', ['c', 'd']))
  const App = ({ tree }: { tree: WorkspaceNode }) => <Workspace tree={tree} onChange={() => {}} label="x" renderTab={(t) => <p>{t.id}</p>} />
  const { rerender, container } = render(<App tree={start} />)
  const order = () => [...container.querySelectorAll('[data-slot="workspace-content"]')].map((el) => el.textContent)
  expect(order()).toEqual(['a', 'b', 'c', 'd'])
  // d is moved to the front of g1, and a goes to g2: the tree reads d, b / a, c, but the drawing keeps its order.
  rerender(<App tree={moveWorkspaceTab(moveWorkspaceTab(start, 'd', { groupId: 'g1', index: 0 }), 'a', { groupId: 'g2', index: 0 })} />)
  expect(order()).toEqual(['a', 'b', 'c', 'd'])
})

// ---- Dividers ----

test('a divider between panes: a separator with the share of its first neighbour, one Tab stop, named, with its hint', () => {
  render(<Host start={row([1, 3], group('g1', ['a']), group('g2', ['b']))} />)
  const [sash] = sashes()
  expect(sashes()).toHaveLength(1)
  expect(sash!.tabIndex).toBe(0)
  expect(sash!.getAttribute('aria-orientation')).toBe('vertical')
  expect(sash!.getAttribute('aria-label')).toBe('Resize the panes')
  expect([sash!.getAttribute('aria-valuemin'), sash!.getAttribute('aria-valuemax'), now(sash!)]).toEqual(['0', '100', 25])
  expect(sash!.getAttribute('title')).toContain('arrow keys')
  expect(sash!.style.getPropertyValue('--ws-x')).toBe('25%')
})

test('the arrows move it 16px and Shift 64px, Home and End go to what each neighbour keeps, and the weights stay a ratio', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} spy={told} />)
  const sash = () => sashes()[0]!
  fireEvent.keyDown(sash(), { key: 'ArrowRight' })
  expect(told).toHaveBeenCalledTimes(1)
  const [a, b] = weightsOf(told.mock.calls[0]![0])
  // 500px each, then 516 and 484 of 1000: the weights keep their sum (2).
  expect(a! / (a! + b!)).toBeCloseTo(0.516)
  expect(a! + b!).toBeCloseTo(2)
  expect(now(sash())).toBe(52)
  fireEvent.keyDown(sash(), { key: 'ArrowLeft', shiftKey: true })
  expect(now(sash())).toBe(45)
  fireEvent.keyDown(sash(), { key: 'Home' })
  // 160px is the least a pane keeps: 16 of 100.
  expect(now(sash())).toBe(16)
  fireEvent.keyDown(sash(), { key: 'ArrowLeft' })
  expect(told).toHaveBeenCalledTimes(3)
  fireEvent.keyDown(sash(), { key: 'End' })
  expect(now(sash())).toBe(84)
  fireEvent.keyDown(sash(), { key: 'Enter' })
  fireEvent.keyDown(sash(), { key: 'ArrowRight', ctrlKey: true })
  expect(told).toHaveBeenCalledTimes(4)
})

test('a split of rows moves with Up and Down; its divider is horizontal, and minSize gives the least height', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={column([1, 1], group('g1', ['a']), group('g2', ['b']))} spy={told} minSize={{ height: 200 }} />)
  const sash = sashes()[0]!
  expect(sash.getAttribute('aria-orientation')).toBe('horizontal')
  fireEvent.keyDown(sash, { key: 'ArrowDown' })
  expect(now(sashes()[0]!)).toBe(53)
  fireEvent.keyDown(sashes()[0]!, { key: 'ArrowRight' })
  expect(told).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(sashes()[0]!, { key: 'Home' })
  // 200 of 600.
  expect(now(sashes()[0]!)).toBe(33)
})

test('in a language written from the right the arrows follow the panes', () => {
  boxes()
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const style = real(el, pseudo)
    return new Proxy(style, { get: (target, key) => (key === 'direction' ? 'rtl' : Reflect.get(target, key)) })
  })
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} />)
  fireEvent.keyDown(sashes()[0]!, { key: 'ArrowRight' })
  expect(now(sashes()[0]!)).toBe(48)
  fireEvent.keyDown(sashes()[0]!, { key: 'ArrowLeft' })
  expect(now(sashes()[0]!)).toBe(50)
})

test('a drag moves the pane with the pointer and tells the app once, at the end; it never passes a minimum', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} spy={told} />)
  const sash = () => sashes()[0]!
  fireEvent.pointerDown(sash(), { button: 0, clientX: 500, clientY: 100, pointerId: 1 })
  fireEvent.pointerMove(sash(), { clientX: 600, clientY: 100, pointerId: 1 })
  expect(now(sash())).toBe(60)
  expect(pane('Pane 1').style.getPropertyValue('--ws-w')).toBe('60%')
  expect(sash().hasAttribute('data-dragging')).toBe(true)
  fireEvent.pointerMove(sash(), { clientX: 5000, pointerId: 1 })
  expect(now(sash())).toBe(84)
  fireEvent.pointerMove(sash(), { clientX: -5000, pointerId: 1 })
  expect(now(sash())).toBe(16)
  fireEvent.pointerMove(sash(), { clientX: 700, pointerId: 1 })
  expect(told).not.toHaveBeenCalled()
  fireEvent.pointerUp(sash(), { pointerId: 1 })
  expect(told).toHaveBeenCalledTimes(1)
  expect(weightsOf(told.mock.calls[0]![0])[0]! / 2).toBeCloseTo(0.7)
  expect(sash().hasAttribute('data-dragging')).toBe(false)
  // A pointer that is not the one that went down, or a button that is not the main one, moves nothing.
  fireEvent.pointerDown(sash(), { button: 2, clientX: 700, pointerId: 2 })
  fireEvent.pointerMove(sash(), { clientX: 100, pointerId: 2 })
  expect(now(sash())).toBe(70)
})

test('a press that only touched the divider changes nothing, and a double press shares the two alike', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 3], group('g1', ['a']), group('g2', ['b']))} spy={told} />)
  fireEvent.pointerDown(sashes()[0]!, { button: 0, clientX: 250, pointerId: 1 })
  fireEvent.pointerUp(sashes()[0]!, { pointerId: 1 })
  expect(told).not.toHaveBeenCalled()
  fireEvent.doubleClick(sashes()[0]!)
  expect(told).toHaveBeenCalledTimes(1)
  expect(weightsOf(told.mock.calls[0]![0])).toEqual([2, 2])
  expect(now(sashes()[0]!)).toBe(50)
  fireEvent.doubleClick(sashes()[0]!)
  expect(told).toHaveBeenCalledTimes(1)
})

test('three panes in a line have two dividers; a divider moves two neighbours and no other', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1, 2], group('g1', ['a']), group('g2', ['b']), group('g3', ['c']))} spy={told} />)
  expect(sashes()).toHaveLength(2)
  expect(sashes().map(now)).toEqual([50, 33])
  fireEvent.keyDown(sashes()[1]!, { key: 'ArrowRight', shiftKey: true })
  const weights = weightsOf(told.mock.calls[0]![0])
  expect(weights[0]).toBe(1)
  expect(weights.reduce((x, y) => x + y)).toBeCloseTo(4)
})

// ---- A tab moved by hand ----

const press = (el: Element, x: number, y = 18) => fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse', pointerId: 7, clientX: x, clientY: y })
const slide = (x: number, y: number) => fireEvent.pointerMove(window, { pointerId: 7, clientX: x, clientY: y })
const letGo = (x: number, y: number) => fireEvent.pointerUp(window, { pointerId: 7, clientX: x, clientY: y })
const drop = () => document.querySelector<HTMLElement>('[data-slot="workspace-drop"]')
const ghost = () => document.querySelector<HTMLElement>('[data-slot="workspace-ghost"]')

test('a drag begins past a few px: a ghost with the title follows the pointer, and under that it is a press', () => {
  boxes()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} />)
  press(tabOf('A'), 50)
  slide(52, 20)
  expect(ghost()).toBeNull()
  slide(80, 30)
  expect(ghost()!.textContent).toBe('A')
  expect(ghost()!.style.left).toBe('94px')
  expect(ghost()!.style.top).toBe('42px')
  letGo(80, 30)
  expect(ghost()).toBeNull()
})

test('over the middle of another pane the tab would join it: a box says so, and letting go moves it there', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  press(tabOf('A'), 50)
  slide(750, 300)
  expect(drop()!.textContent).toBe('Move to this pane')
  // The box covers the body of the pane under the bar: from 500px, 36px down, 500 by 564.
  expect(drop()!.style.getPropertyValue('--ws-px')).toBe('500px')
  expect(drop()!.style.getPropertyValue('--ws-py')).toBe('36px')
  expect(drop()!.style.getPropertyValue('--ws-pw')).toBe('500px')
  expect(drop()!.style.getPropertyValue('--ws-ph')).toBe('564px')
  letGo(750, 300)
  expect(told).toHaveBeenCalledTimes(1)
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:b', 'g2:ca'])
  expect(findWorkspaceGroup(told.mock.calls[0]![0], 'g2')!.activeId).toBe('a')
  expect(drop()).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('A is in pane 2')
})

test('over a side of a pane the tab would divide it there: each of the four sides, with its own words', () => {
  boxes()
  const cases = [
    { at: [530, 300], word: 'New pane at the start', edge: 'start', box: ['500px', '36px', '250px', '564px'] },
    { at: [970, 300], word: 'New pane at the end', edge: 'end', box: ['750px', '36px', '250px', '564px'] },
    { at: [750, 60], word: 'New pane above', edge: 'top', box: ['500px', '36px', '500px', '282px'] },
    { at: [750, 590], word: 'New pane below', edge: 'bottom', box: ['500px', '318px', '500px', '282px'] },
  ] as const
  for (const c of cases) {
    const told = vi.fn()
    const { unmount } = render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
    press(tabOf('A'), 50)
    slide(c.at[0], c.at[1])
    expect(drop()!.textContent, c.edge).toBe(c.word)
    expect(['--ws-px', '--ws-py', '--ws-pw', '--ws-ph'].map((v) => drop()!.style.getPropertyValue(v)), c.edge).toEqual(c.box)
    letGo(c.at[0], c.at[1])
    const next = told.mock.calls[0]![0] as WorkspaceNode
    expect(ids(next).sort(), c.edge).toEqual(['g1:b', 'g2:c', 'pane-1:a'].sort())
    const where = workspaceGroups(next).map((g) => g.id)
    const target = c.edge === 'start' || c.edge === 'top' ? ['g1', 'pane-1', 'g2'] : ['g1', 'g2', 'pane-1']
    expect(where, c.edge).toEqual(target)
    unmount()
  }
})

test('in the strip of a pane a mark shows the slot, and letting go puts the tab there; the same pane or another', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b', 'c']), group('g2', ['d', 'e']))} spy={told} />)
  press(tabOf('A'), 50)
  // Past the middle of B (150): the slot after B.
  slide(160, 20)
  expect(drop()!.textContent).toBe('')
  expect(drop()!.style.getPropertyValue('--ws-px')).toBe('199px')
  expect(drop()!.style.getPropertyValue('--ws-pw')).toBe('2px')
  expect(drop()!.style.getPropertyValue('--ws-ph')).toBe('36px')
  letGo(160, 20)
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:bac', 'g2:de'])
  told.mockClear()
  // Into the other pane, before its first tab.
  press(tabOf('B'), 150)
  slide(520, 20)
  expect(drop()!.style.getPropertyValue('--ws-px')).toBe('499px')
  letGo(520, 20)
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:ac', 'g2:bde'])
})

test('where nothing would change, or outside the panes, no box is shown and nothing happens', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  press(tabOf('A'), 50)
  // The middle of its own pane, its own slot, the only tab of a pane at its own side, beyond the area.
  for (const [x, y] of [[250, 300], [10, 20], [50, 20], [5000, 300], [250, 5000]] as const) {
    slide(x, y)
    expect(drop(), `${x},${y}`).toBeNull()
  }
  letGo(250, 300)
  expect(told).not.toHaveBeenCalled()
  press(tabOf('C'), 550)
  slide(980, 300)
  expect(drop()).toBeNull()
  letGo(980, 300)
  expect(told).not.toHaveBeenCalled()
})

test('Escape drops the tab where it was; a pointer that is not the one that went down, a finger and another button do not drag', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  press(tabOf('A'), 50)
  slide(750, 300)
  expect(drop()).not.toBeNull()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(drop()).toBeNull()
  expect(ghost()).toBeNull()
  letGo(750, 300)
  expect(told).not.toHaveBeenCalled()
  // A finger scrolls the strip: no drag. Nor the right button.
  fireEvent.pointerDown(tabOf('A'), { button: 0, pointerType: 'touch', pointerId: 7, clientX: 50, clientY: 18 })
  slide(750, 300)
  expect(ghost()).toBeNull()
  fireEvent.pointerDown(tabOf('A'), { button: 2, pointerType: 'mouse', pointerId: 7, clientX: 50, clientY: 18 })
  slide(750, 300)
  expect(ghost()).toBeNull()
  // Another pointer is not the drag.
  press(tabOf('A'), 50)
  fireEvent.pointerMove(window, { pointerId: 9, clientX: 750, clientY: 300 })
  expect(ghost()).toBeNull()
  fireEvent.pointerCancel(window, { pointerId: 7 })
  slide(750, 300)
  expect(ghost()).toBeNull()
})

test('the click that ends a drag does not choose a tab', () => {
  boxes()
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c', 'd']))} spy={told} />)
  press(tabOf('A'), 50)
  slide(520, 20)
  letGo(520, 20)
  expect(told).toHaveBeenCalledTimes(1)
  // The browser's click after the release lands on the tab under the pointer: it is swallowed.
  fireEvent.click(tabOf('C'))
  expect(told).toHaveBeenCalledTimes(1)
})

test('in a language written from the right the strip and the sides are mirrored', () => {
  boxes()
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const style = real(el, pseudo)
    return new Proxy(style, { get: (target, key) => (key === 'direction' ? 'rtl' : Reflect.get(target, key)) })
  })
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  // g1 is on the right: its start is the right edge. Near the right edge of the area is the start of g1.
  press(tabOf('C'), 550)
  slide(990, 300)
  expect(drop()!.textContent).toBe('New pane at the start')
  letGo(990, 300)
  // C is alone in its pane, which goes; its new pane stands before g1, at its start.
  expect(ids(told.mock.calls[0]![0] as WorkspaceNode)).toEqual(['pane-1:c', 'g1:ab'])
})

test('a pane the person divides off gets an id the tree does not have, or the one the app makes', () => {
  boxes()
  const told = vi.fn()
  const { unmount } = render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('pane-1', ['c']))} spy={told} />)
  press(tabOf('A'), 50)
  slide(20, 300)
  letGo(20, 300)
  expect(workspaceGroups(told.mock.calls[0]![0] as WorkspaceNode).map((g) => g.id)).toContain('pane-2')
  unmount()
  const own = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={own} newGroupId={() => 'terminal-9'} />)
  press(tabOf('A'), 50)
  slide(20, 300)
  letGo(20, 300)
  expect(workspaceGroups(own.mock.calls[0]![0] as WorkspaceNode).map((g) => g.id)).toContain('terminal-9')
})

// ---- A tab moved by keys ----

test('Shift and the arrows put a tab earlier or later in its strip, keep the focus on it, and say where it is', async () => {
  const told = vi.fn()
  render(<Host start={group('g1', ['a', 'b', 'c'], 'b')} spy={told} />)
  tabOf('B').focus()
  fireEvent.keyDown(tabOf('B'), { key: 'ArrowRight', shiftKey: true })
  expect(ids(told.mock.calls[0]![0])).toEqual(['g1:acb'])
  expect(screen.getByRole('status').textContent).toBe('B: 3 of 3')
  await waitFor(() => expect(document.activeElement).toBe(tabOf('B')))
  fireEvent.keyDown(tabOf('B'), { key: 'ArrowRight', shiftKey: true })
  expect(told).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(tabOf('B'), { key: 'ArrowLeft', shiftKey: true })
  expect(ids(told.mock.calls[1]![0])).toEqual(['g1:abc'])
  fireEvent.keyDown(tabOf('A'), { key: 'ArrowLeft', shiftKey: true })
  expect(told).toHaveBeenCalledTimes(2)
})

test('Alt+Shift+an arrow divides the pane toward that side with the tab; a pane with one tab joins the pane there', async () => {
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} />)
  tabOf('A').focus()
  fireEvent.keyDown(tabOf('A'), { key: 'ArrowDown', shiftKey: true, altKey: true })
  const first = told.mock.calls[0]![0] as WorkspaceNode
  expect(ids(first)).toEqual(['g1:b', 'pane-1:a', 'g2:c'])
  expect(screen.getByRole('status').textContent).toBe('A is in pane 2')
  await waitFor(() => expect(document.activeElement).toBe(tabOf('A')))
  // C is alone in its pane: to the start it joins g1; to the end there is no pane.
  fireEvent.keyDown(tabOf('C'), { key: 'ArrowRight', shiftKey: true, altKey: true })
  expect(told).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(tabOf('C'), { key: 'ArrowLeft', shiftKey: true, altKey: true })
  expect(ids(told.mock.calls[1]![0] as WorkspaceNode)).toEqual(['g1:bc', 'pane-1:a'])
  // The arrows without both keys do not divide.
  fireEvent.keyDown(tabOf('B'), { key: 'ArrowLeft', altKey: true })
  expect(told).toHaveBeenCalledTimes(2)
})

// ---- The menu of a tab ----

test('the right button on a tab lists moving, dividing and closing, with the keys that do the same; the app\'s entries come first', async () => {
  const told = vi.fn()
  const mine = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} spy={told} tabMenu={(t) => [{ label: `Rename ${t.title}`, icon: 'rename', onSelect: mine }]} />)
  fireEvent.contextMenu(tabOf('A'), { clientX: 20, clientY: 20 })
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull())
  expect(screen.getByRole('menu').getAttribute('aria-label')).toBe('A')
  const rows = screen.getAllByRole('menuitem')
  expect(rows.map((r) => r.textContent)).toEqual(['Rename A', 'Move earlierShift+←', 'Move laterShift+→', 'Split to the startAlt+Shift+←', 'Split to the endAlt+Shift+→', 'Split aboveAlt+Shift+↑', 'Split belowAlt+Shift+↓', 'Close ADel'])
  // A is the first tab: it cannot go earlier, and to the start of its pane there is no pane.
  expect(rows.map((r) => r.hasAttribute('data-disabled'))).toEqual([false, true, false, false, false, false, false, false])
  fireEvent.click(screen.getByRole('menuitem', { name: /Split below/ }))
  expect(ids(told.mock.calls[0]![0] as WorkspaceNode)).toEqual(['g1:b', 'pane-1:a', 'g2:c'])
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
})

test('the menu closes a tab through the app when it asks, and offers no Close for a tab that cannot be closed; a lone tab with no pane beside cannot be divided', async () => {
  const asked = vi.fn()
  render(<Host start={{ kind: 'tabs', id: 'g1', tabs: [tab('a')], activeId: 'a' }} onCloseTab={asked} />)
  fireEvent.contextMenu(tabOf('A'), { clientX: 20, clientY: 20 })
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull())
  // One pane, one tab: nowhere to go.
  expect(screen.getAllByRole('menuitem').filter((r) => /Split/.test(r.textContent ?? '')).every((r) => r.hasAttribute('data-disabled'))).toBe(true)
  fireEvent.click(screen.getByRole('menuitem', { name: /Close A/ }))
  expect(asked).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'g1')
})

test('Menu key on a tab opens the same menu', async () => {
  render(<Host start={group('g1', ['a', 'b'])} />)
  tabOf('A').focus()
  fireEvent.keyDown(tabOf('A'), { key: 'ContextMenu' })
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeNull())
  expect(screen.getByRole('menuitem', { name: /Close A/ })).not.toBeNull()
})

// ---- Adding, empty, focus, maximize ----

test('each bar has a button that adds a tab to its pane', () => {
  const add = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} onAddTab={add} />)
  const [first, second] = screen.getAllByRole('button', { name: 'New tab' })
  fireEvent.click(first!)
  expect(add).toHaveBeenLastCalledWith('g1')
  fireEvent.click(second!)
  expect(add).toHaveBeenLastCalledWith('g2')
  expect(screen.queryByText('Nothing is open in this pane')).toBeNull()
})

test('an empty workspace shows what the app gives, or the sentence and the button', () => {
  const add = vi.fn()
  const { rerender } = render(<Workspace tree={group('g1', [], null)} onChange={() => {}} renderTab={() => null} label="x" onAddTab={add} />)
  expect(screen.getByText('Nothing is open in this pane')).not.toBeNull()
  const buttons = screen.getAllByRole('button', { name: 'New tab' })
  expect(buttons).toHaveLength(2)
  fireEvent.click(buttons[1]!)
  expect(add).toHaveBeenCalledWith('g1')
  rerender(<Workspace tree={group('g1', [], null)} onChange={() => {}} renderTab={() => null} label="x" empty={(id) => <p>Start in {id}</p>} />)
  expect(screen.getByText('Start in g1')).not.toBeNull()
  expect(screen.queryByText('Nothing is open in this pane')).toBeNull()
  rerender(<Workspace tree={group('g1', [], null)} onChange={() => {}} renderTab={() => null} label="x" />)
  expect(screen.queryByRole('button', { name: 'New tab' })).toBeNull()
})

test('the pane in focus is the one the person pressed or tabbed into, told to the app; the first at first', () => {
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} onFocusedChange={told} />)
  expect(pane('Pane 1').hasAttribute('data-focused')).toBe(true)
  expect(pane('Pane 2').hasAttribute('data-focused')).toBe(false)
  fireEvent.pointerDown(screen.getByTestId('content-b'))
  expect(told).toHaveBeenCalledWith('g2')
  expect(pane('Pane 2').hasAttribute('data-focused')).toBe(true)
  expect(pane('Pane 1').hasAttribute('data-focused')).toBe(false)
  // Told once: a second press in the same pane is not a change.
  fireEvent.pointerDown(screen.getByTestId('content-b'))
  fireEvent.pointerDown(tabOf('B'))
  expect(told).toHaveBeenCalledTimes(1)
  fireEvent.focus(tabOf('A'))
  expect(told).toHaveBeenLastCalledWith('g1')
  expect(screen.getAllByRole('tabpanel').length).toBe(2)
})

test('the app can keep the focused pane; one that is not in the tree is the first', () => {
  const told = vi.fn()
  const { rerender } = render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} focusedId="g2" onFocusedChange={told} />)
  expect(pane('Pane 2').hasAttribute('data-focused')).toBe(true)
  fireEvent.pointerDown(screen.getByTestId('content-a'))
  expect(told).toHaveBeenCalledWith('g1')
  // Kept by the app: it does not move until the app says.
  expect(pane('Pane 2').hasAttribute('data-focused')).toBe(true)
  rerender(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} focusedId="gone" />)
  expect(pane('Pane 1').hasAttribute('data-focused')).toBe(true)
})

test('a pane can fill the area: the others stay mounted and hidden, the dividers go, and the button puts it back', () => {
  const told = vi.fn()
  const start = row([1, 1], group('g1', ['a']), group('g2', ['b']))
  const { rerender } = render(<Host start={start} maximizedId="g2" onMaximizedChange={told} />)
  const maximize = screen.getByRole('button', { name: 'Put the panes back' })
  expect(maximize.getAttribute('aria-pressed')).toBe('true')
  expect(pane('Pane 2').style.getPropertyValue('--ws-w')).toBe('100%')
  expect(screen.getByTestId('content-a')).not.toBeNull()
  expect(screen.getByTestId('content-a').closest<HTMLElement>('[data-slot="workspace-content"]')!.hidden).toBe(true)
  expect(screen.getByTestId('content-b').closest<HTMLElement>('[data-slot="workspace-content"]')!.hidden).toBe(false)
  expect(document.querySelector<HTMLElement>('[data-slot="workspace-group"][data-group-id="g1"]')!.hidden).toBe(true)
  expect(sashes()).toHaveLength(0)
  fireEvent.click(maximize)
  expect(told).toHaveBeenCalledWith(null)
  rerender(<Host start={start} maximizedId={null} onMaximizedChange={told} />)
  const fill = screen.getAllByRole('button', { name: 'Fill the workspace with this pane' })
  expect(fill).toHaveLength(2)
  expect(sashes()).toHaveLength(1)
  fireEvent.click(fill[0]!)
  expect(told).toHaveBeenLastCalledWith('g1')
  // A lone pane has nothing to fill; the buttons are only where the app can keep the choice.
  rerender(<Host key="one" start={group('g1', ['a'])} maximizedId={null} onMaximizedChange={told} />)
  expect(screen.queryByRole('button', { name: 'Fill the workspace with this pane' })).toBeNull()
  rerender(<Host key="two" start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} />)
  expect(screen.queryByRole('button', { name: /Fill the workspace/ })).toBeNull()
})

test('a tree that is not normal is drawn normal, and the same tree comes back when nothing changes', () => {
  const told = vi.fn()
  const messy = row([1, 1, 1], group('g1', ['a']), group('g2', []), group('g3', ['b']))
  render(<Host start={messy} spy={told} />)
  expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Pane 1', 'Pane 2'])
  expect(sashes()).toHaveLength(1)
  // Choosing the tab already chosen is not a change.
  fireEvent.click(tabOf('A'))
  expect(told).not.toHaveBeenCalled()
})

// ---- Words ----

test('its words are the app\'s: the names of the panes, the strip, the dividers, the buttons and the status', async () => {
  const italian = {
    ...DEFAULT_WORDS,
    workspace: {
      ...DEFAULT_WORDS.workspace,
      pane: (n: number) => `Riquadro ${n}`,
      tabs: 'Schede',
      close: (title: string) => `Chiudi ${title}`,
      newTab: 'Nuova scheda',
      resize: 'Ridimensiona i riquadri',
      maximize: 'Allarga il riquadro',
      dropHere: 'Sposta qui',
      moved: (title: string, n: number) => `${title} è nel riquadro ${n}`,
    },
  }
  boxes()
  render(
    <WordsProvider words={italian}>
      <Host start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))} onAddTab={() => {}} onMaximizedChange={() => {}} />
    </WordsProvider>,
  )
  expect(pane('Riquadro 1')).not.toBeNull()
  expect(within(pane('Riquadro 1')).getByRole('tablist', { name: 'Schede' })).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Chiudi A' })).not.toBeNull()
  expect(screen.getAllByRole('button', { name: 'Nuova scheda' })).toHaveLength(2)
  expect(screen.getByRole('separator', { name: 'Ridimensiona i riquadri' })).not.toBeNull()
  expect(screen.getAllByRole('button', { name: 'Allarga il riquadro' })).toHaveLength(2)
  press(tabOf('A'), 50)
  slide(750, 300)
  expect(drop()!.textContent).toBe('Sposta qui')
  letGo(750, 300)
  expect(screen.getByRole('status').textContent).toBe('A è nel riquadro 2')
})

test('it draws without a layout (no measure): the panes by percent, the keys on a divider move nothing', () => {
  const told = vi.fn()
  render(<Host start={row([1, 1], group('g1', ['a']), group('g2', ['b']))} spy={told} />)
  expect(pane('Pane 1').style.getPropertyValue('--ws-w')).toBe('50%')
  fireEvent.keyDown(sashes()[0]!, { key: 'ArrowRight' })
  expect(told).not.toHaveBeenCalled()
  // act() so no warning of an update outside it is left over from the draws above.
  act(() => {})
})

test('an app\'s own fields on a tab come back typed in renderTab, onCloseTab and tabMenu', () => {
  type Terminal = WorkspaceTab & { kind: 'terminal'; cwd: string }
  const tree: WorkspaceNode<Terminal> = { kind: 'tabs', id: 'g1', tabs: [{ id: 'a', title: 'A', kind: 'terminal', cwd: '/work' }], activeId: 'a' }
  const closed: string[] = []
  render(
    <Workspace<Terminal>
      tree={tree}
      onChange={() => {}}
      label="Terminals"
      renderTab={(t) => <p data-testid="cwd">{t.cwd}</p>}
      onCloseTab={(t) => closed.push(t.cwd)}
      tabMenu={(t) => [{ label: `In ${t.cwd}`, onSelect: () => {} }]}
    />,
  )
  expect(screen.getByTestId('cwd').textContent).toBe('/work')
  fireEvent.click(screen.getByRole('button', { name: 'Close A' }))
  expect(closed).toEqual(['/work'])
})

test('the content of the tabs is not drawn again while the area itself moves: a divider dragged, a tab dragged', () => {
  boxes()
  const drawn = vi.fn()
  render(
    <Host
      start={row([1, 1], group('g1', ['a', 'b']), group('g2', ['c']))}
      renderTab={(t) => {
        drawn(t.id)
        return <p>{t.id}</p>
      }}
    />,
  )
  const first = drawn.mock.calls.length
  expect(first).toBe(3)
  fireEvent.pointerDown(sashes()[0]!, { button: 0, clientX: 500, pointerId: 1 })
  for (const x of [520, 540, 560, 580]) fireEvent.pointerMove(sashes()[0]!, { clientX: x, pointerId: 1 })
  expect(now(sashes()[0]!)).toBe(58)
  expect(drawn.mock.calls.length).toBe(first)
  fireEvent.pointerUp(sashes()[0]!, { pointerId: 1 })
  // A tab dragged across the area: the ghost and the box move with the pointer, the contents stay as they are.
  const before = drawn.mock.calls.length
  press(tabOf('A'), 50)
  for (const x of [200, 300, 700]) slide(x, 300)
  expect(ghost()).not.toBeNull()
  expect(drawn.mock.calls.length).toBe(before)
  fireEvent.keyDown(window, { key: 'Escape' })
})
