// `Tree`: nested rows on Ark UI's TreeView. Driven as a person or a screen reader meets it, through the roles and the
// names: the tree, its rows (`treeitem`, named by their name alone, each with its level, its open state and its choice),
// the groups that hold the rows of a branch, the field that filters them. The keys are sent to the element that has the
// focus: a leaf's row, or the row of a branch (Ark's control, a button inside the branch's `treeitem`).
// Ark's machines take an event in a microtask, and a branch opens or closes on the next frame: every step waits for both.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { IconPackProvider, Tree, WordsProvider, type TreeNode } from '../src'

const FILES: readonly TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    icon: 'newFolder',
    children: [
      { id: 'src/app.ts', name: 'app.ts', icon: 'attach', meta: '4 KB' },
      { id: 'src/lib', name: 'lib', icon: 'newFolder', children: [{ id: 'src/lib/util.ts', name: 'util.ts', icon: 'attach', meta: '1 KB' }] },
    ],
  },
  // A folder with nothing in it is still a branch.
  { id: 'assets', name: 'assets', icon: 'newFolder', children: [] },
  { id: 'package.json', name: 'package.json', icon: 'attach', meta: '2 KB' },
  // No icon: its slot stays, empty.
  { id: 'README.md', name: 'README.md', meta: '9 KB' },
]

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
/** Lets Ark take what was done: its microtask, and the frame a branch opens or closes on. */
const settle = () => act(() => wait(50))
const step = async (what: () => void) => {
  await act(async () => {
    what()
    await wait(50)
  })
}
const press = (key: string) => step(() => fireEvent.keyDown(document.activeElement!, { key }))
const click = (el: Element) => step(() => fireEvent.click(el))
const focus = (el: HTMLElement) => step(() => el.focus())
const type = (field: Element, value: string) => step(() => fireEvent.change(field, { target: { value } }))
/** The first letters typed are forgotten after 350ms. */
const pause = () => act(() => wait(400))

const item = (name: string) => screen.getByRole('treeitem', { name })
/** Where a row takes the focus: a leaf's `treeitem`, or the row of a branch, a button inside its `treeitem`. */
const target = (name: string): HTMLElement => {
  const row = item(name)
  return row.hasAttribute('aria-expanded') ? within(row).getAllByRole('button', { name })[0]! : row
}
/** The `treeitem` of the row that has the focus. */
const current = () => document.activeElement?.closest('[role="treeitem"]') ?? null
/** What a screen reader hears after a row's name. */
const description = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
/** The rows that are a Tab stop: one, always. */
const stops = () => Array.from(document.querySelectorAll('[role="tree"] [tabindex="0"]'))
// Tailwind also scans `test/`: a class with a variant is composed, never written whole.
const v = (variant: string, cls: string) => variant + cls

describe('the rows a screen reader hears', () => {
  test('a tree named by the app; each row its name, its level, whether it is open and whether it is chosen', async () => {
    render(<Tree aria-label="Files" nodes={FILES} defaultExpanded={['src']} defaultSelected="src/app.ts" />)
    await settle()
    const tree = screen.getByRole('tree', { name: 'Files' })
    expect(within(tree).getAllByRole('treeitem')).toHaveLength(6)
    const src = item('src')
    expect(src.getAttribute('aria-level')).toBe('1')
    expect(src.getAttribute('aria-expanded')).toBe('true')
    expect(src.getAttribute('aria-selected')).toBe('false')
    // What a branch holds is a group inside its row, one level in.
    const group = within(src).getByRole('group')
    expect(within(group).getByRole('treeitem', { name: 'app.ts' })).toBe(item('app.ts'))
    const app = item('app.ts')
    expect(app.getAttribute('aria-level')).toBe('2')
    expect(app.getAttribute('aria-selected')).toBe('true')
    expect(app.hasAttribute('aria-expanded')).toBe(false)
    // The short fact is heard after the name, not in it.
    expect(description(app)).toBe('4 KB')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    expect(item('lib').getAttribute('aria-level')).toBe('2')
    expect(item('assets').getAttribute('aria-expanded')).toBe('false')
    // A closed branch's rows are not in the page.
    expect(screen.queryByRole('treeitem', { name: 'util.ts' })).toBeNull()
    // One Tab stop: the chosen row.
    expect(stops()).toEqual([app])
  })

  test('without a choice the first row is the Tab stop', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await settle()
    expect(stops()).toEqual([target('src')])
  })

  test('icons in the user\'s pack, an empty slot for a row without one, none in a tree without icons; the fact in tabular figures; 44px with a finger', async () => {
    const { unmount } = render(
      <IconPackProvider pack="fluent">
        <Tree aria-label="Files" nodes={FILES} />
      </IconPackProvider>,
    )
    await settle()
    const icon = item('package.json').querySelector('[data-icon]')!
    expect(icon.getAttribute('data-icon')).toBe('attach')
    expect(icon.getAttribute('data-icon-pack')).toBe('fluent')
    expect(item('README.md').querySelector('[data-icon]')).toBeNull()
    expect(item('README.md').querySelector('[data-slot="tree-icon-empty"]')).not.toBeNull()
    expect(item('README.md').querySelector('[data-slot="tree-meta"]')!.className).toContain('tabular-nums')
    for (const row of [item('README.md'), target('src')]) expect(row.className.split(/\s+/)).toContain(v('pointer-coarse:', 'min-h-11'))
    unmount()
    render(<Tree aria-label="Plain" nodes={[{ id: 'a', name: 'One' }, { id: 'b', name: 'Two' }]} />)
    await settle()
    expect(item('One').querySelector('[data-slot="tree-icon-empty"]')).toBeNull()
  })
})

describe('the keys', () => {
  test('the arrows open, close and move; Home and End reach the first and the last row in sight', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(target('src'))
    expect(current()).toBe(item('src'))
    // Right opens a branch, then goes into it.
    await press('ArrowRight')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(current()).toBe(item('src'))
    await press('ArrowRight')
    expect(current()).toBe(item('app.ts'))
    await press('ArrowDown')
    expect(current()).toBe(item('lib'))
    await press('ArrowRight')
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    await press('ArrowDown')
    expect(current()).toBe(item('util.ts'))
    expect(item('util.ts').getAttribute('aria-level')).toBe('3')
    // Left on a leaf goes out to the branch that holds it; on an open branch it closes it.
    await press('ArrowLeft')
    expect(current()).toBe(item('lib'))
    await press('ArrowLeft')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('treeitem', { name: 'util.ts' })).toBeNull()
    await press('ArrowUp')
    expect(current()).toBe(item('app.ts'))
    await press('End')
    expect(current()).toBe(item('README.md'))
    await press('Home')
    expect(current()).toBe(item('src'))
    await press('ArrowLeft')
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('treeitem', { name: 'app.ts' })).toBeNull()
    // The Tab stop followed the focus.
    expect(stops()).toEqual([target('src')])
  })

  test('`*` opens the branches beside the row', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(target('src'))
    await press('*')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('assets').getAttribute('aria-expanded')).toBe('true')
  })

  test('the first letters typed reach a row in sight, a plain «a» too', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(target('src'))
    await press('p')
    expect(current()).toBe(item('package.json'))
    await pause()
    await press('a')
    expect(current()).toBe(item('assets'))
    await pause()
    await press('R')
    expect(current()).toBe(item('README.md'))
  })
})

describe('one choice', () => {
  test('a press, Enter or Space chooses a row, and only that one; a press on a branch also opens it', async () => {
    const chose = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onSelect={chose} />)
    await click(item('README.md'))
    expect(item('README.md').getAttribute('aria-selected')).toBe('true')
    expect(chose).toHaveBeenLastCalledWith('README.md', FILES[3])
    await focus(item('package.json'))
    await press('Enter')
    expect(item('package.json').getAttribute('aria-selected')).toBe('true')
    expect(item('README.md').getAttribute('aria-selected')).toBe('false')
    await focus(target('src'))
    await press(' ')
    expect(item('src').getAttribute('aria-selected')).toBe('true')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(chose).toHaveBeenLastCalledWith('src', FILES[0])
    expect(screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-selected') === 'true')).toEqual([item('src')])
  })

  test('with `selected` the choice is the app\'s: the tree asks, the app answers', async () => {
    const chose = vi.fn()
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} selected={null} onSelect={chose} />)
    await click(item('package.json'))
    expect(chose).toHaveBeenCalledWith('package.json', FILES[2])
    expect(item('package.json').getAttribute('aria-selected')).toBe('false')
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} selected="package.json" onSelect={chose} />))
    expect(item('package.json').getAttribute('aria-selected')).toBe('true')
  })

  test('with `expanded` the open branches are the app\'s', async () => {
    const change = vi.fn()
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} expanded={[]} onExpandedChange={change} />)
    await focus(target('src'))
    await press('ArrowRight')
    expect(change).toHaveBeenLastCalledWith(['src'])
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} expanded={['src', 'src/lib']} onExpandedChange={change} />))
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()
  })
})

describe('children loaded when a branch opens', () => {
  const REMOTE: TreeNode = { id: 'remote', name: 'remote', icon: 'newFolder', hasChildren: true }
  const LOCAL: TreeNode = { id: 'local.txt', name: 'local.txt', icon: 'attach' }

  test('the branch says it loads, says it failed, and opening it again tries again', async () => {
    let answer: { resolve: (nodes: readonly TreeNode[]) => void; reject: (error: unknown) => void } | null = null
    const loadChildren = vi.fn((_node: TreeNode, _signal: AbortSignal) => new Promise<readonly TreeNode[]>((resolve, reject) => (answer = { resolve, reject })))
    render(<Tree aria-label="Files" nodes={[REMOTE, LOCAL]} loadChildren={loadChildren} />)
    // A branch before its children are known.
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
    expect(description(item('remote'))).toBe('')
    await focus(target('remote'))
    await press('ArrowRight')
    expect(loadChildren).toHaveBeenCalledTimes(1)
    expect(loadChildren.mock.calls[0]![0]).toBe(REMOTE)
    expect(loadChildren.mock.calls[0]![1]).toBeInstanceOf(AbortSignal)
    expect(description(item('remote'))).toBe('Loading')
    expect(item('remote').getAttribute('aria-busy')).toBe('true')
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')

    await step(() => answer!.reject(new Error('offline')))
    expect(description(item('remote'))).toBe('Not loaded Open it to try again')
    expect(within(item('remote')).getByText('Not loaded')).toBeTruthy()
    expect(item('remote').getAttribute('aria-busy')).toBeNull()
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')

    // Opening it again tries again.
    await press('ArrowRight')
    expect(loadChildren).toHaveBeenCalledTimes(2)
    expect(description(item('remote'))).toBe('Loading')
    await step(() => answer!.resolve([{ id: 'remote/notes.txt', name: 'notes.txt', meta: '3 KB' }]))
    expect(item('remote').getAttribute('aria-expanded')).toBe('true')
    expect(item('notes.txt').getAttribute('aria-level')).toBe('2')
    expect(description(item('remote'))).toBe('')
    // Loaded once: closing and opening again asks nothing more.
    await press('ArrowLeft')
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
    await press('ArrowRight')
    expect(loadChildren).toHaveBeenCalledTimes(2)
    expect(item('remote').getAttribute('aria-expanded')).toBe('true')
    expect(item('notes.txt')).toBeTruthy()
  })

  test('a loader that throws is a failure like any other', async () => {
    const loadChildren = vi.fn((): Promise<readonly TreeNode[]> => {
      throw new Error('no network')
    })
    render(<Tree aria-label="Files" nodes={[REMOTE]} loadChildren={loadChildren} />)
    await focus(target('remote'))
    await press('Enter')
    expect(loadChildren).toHaveBeenCalledTimes(1)
    expect(description(item('remote'))).toBe('Not loaded Open it to try again')
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('the filter', () => {
  test('what is found shows with the branches that lead to it opened; cleared, what the person had opened comes back', async () => {
    render(<Tree aria-label="Files" nodes={FILES} search defaultExpanded={['src']} />)
    await focus(item('README.md'))
    const field = screen.getByRole('searchbox', { name: 'Filter by name' })
    await type(field, 'UTIL')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()
    for (const name of ['app.ts', 'assets', 'package.json', 'README.md']) expect(screen.queryByRole('treeitem', { name }), name).toBeNull()
    // The row that had the focus is gone: the tree keeps a Tab stop.
    expect(stops()).toEqual([target('src')])

    await type(field, '')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    expect(item('app.ts')).toBeTruthy()
    expect(item('README.md')).toBeTruthy()
    expect(screen.queryByRole('treeitem', { name: 'util.ts' })).toBeNull()
  })

  test('a branch the person opens while filtering stays open after; nothing found says so', async () => {
    render(<Tree aria-label="Files" nodes={FILES} search />)
    const field = screen.getByRole('searchbox', { name: 'Filter by name' })
    await type(field, 'lib')
    // Found by its own name: shown closed, with what it holds a press away.
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    await click(target('lib'))
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()

    await type(field, 'nothing like it')
    expect(screen.getByRole('status').textContent).toBe('No match')
    expect(screen.queryByRole('treeitem')).toBeNull()

    await type(field, '')
    expect(screen.queryByRole('status')).toBeNull()
    // The branch the filter opened is closed again; the one the person opened is still open inside it.
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await click(target('src'))
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()
  })

  test('the field says the app\'s words, or the name the tree is given', async () => {
    const { unmount } = render(
      <WordsProvider words={{ tree: { filter: 'Filtra per nome', empty: 'Nessun risultato' } }}>
        <Tree aria-label="File" nodes={FILES} search />
      </WordsProvider>,
    )
    await type(screen.getByRole('searchbox', { name: 'Filtra per nome' }), 'zzz')
    expect(screen.getByRole('status').textContent).toBe('Nessun risultato')
    unmount()
    render(<Tree aria-label="Files" nodes={FILES} search searchLabel="Find a file by name" />)
    expect(screen.getByRole('searchbox', { name: 'Find a file by name' })).toBeTruthy()
  })
})
