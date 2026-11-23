// `Tree`: nested rows on Ark UI's TreeView. Driven as a person or a screen reader meets it, through the roles and the
// names: the tree, its rows (`treeitem`, named by their name alone, each with its level, its open state and its choice),
// the group a branch owns, the field that filters them. The keys go to the element that has the focus, which is the
// row's `treeitem` itself, on a branch as on a leaf.
// Ark's machine takes an event in a microtask: an action is awaited in `act`, and what it changes is awaited with
// `waitFor`, never with a fixed pause; an absence is checked once the change that brings it has been seen. The one look
// at a class is the 44px a row asks for with a finger, which jsdom cannot measure.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Icon, IconPackProvider, Tree, WordsProvider, type IconName, type TreeNode } from '../src'

const FILES: readonly TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    icon: 'folder',
    openIcon: 'folderOpen',
    children: [
      { id: 'src/app.ts', name: 'app.ts', icon: 'file', meta: '4 KB' },
      { id: 'src/lib', name: 'lib', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'src/lib/util.ts', name: 'util.ts', icon: 'file', meta: '1 KB' }] },
    ],
  },
  // A folder with nothing in it is still a branch.
  { id: 'assets', name: 'assets', icon: 'folder', children: [] },
  { id: 'package.json', name: 'package.json', icon: 'file', meta: '2 KB' },
  // No icon: its slot stays, empty.
  { id: 'README.md', name: 'README.md', meta: '9 KB' },
]

/** Lets Ark's machine take what was done: it takes an event in a microtask. */
const step = async (what: () => void) => {
  await act(async () => {
    what()
  })
}
const press = (key: string) => step(() => fireEvent.keyDown(document.activeElement!, { key }))
const click = (el: Element) => step(() => fireEvent.click(el))
const focus = (el: HTMLElement) => step(() => el.focus())
const type = (field: Element, value: string) => step(() => fireEvent.change(field, { target: { value } }))

const item = (name: string) => screen.getByRole('treeitem', { name })
const shows = (name: string) => screen.queryByRole('treeitem', { name }) !== null
/** Waits until the row of that name has the focus. */
const focusOn = (name: string) => waitFor(() => expect(document.activeElement).toBe(item(name)))
/** Waits until the branch of that name is open (or closed). */
const opens = (name: string, open = true) => waitFor(() => expect(item(name).getAttribute('aria-expanded')).toBe(String(open)))
/** What an open branch holds: the group it owns. */
const group = (name: string) => document.getElementById(item(name).getAttribute('aria-owns') ?? '')
/** What a screen reader hears after a row's name. */
const description = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
/** The rows that are a Tab stop: one, always. */
const stops = () => Array.from(document.querySelectorAll('[role="tree"] [tabindex="0"]'))
/** What a row draws before its name: the chevron's slot, then the icon's (R6). */
const marks = (row: Element) => Array.from(row.firstElementChild?.children ?? [])
/** The drawing an `Icon` of that name makes in that pack, anywhere. */
const drawing = (name: IconName, pack: 'duotone') => {
  const { container, unmount } = render(<Icon name={name} pack={pack} />)
  const svg = container.querySelector('svg')!.outerHTML
  unmount()
  return svg
}
// Tailwind also scans `test/`: a class with a variant is composed, never written whole.
const v = (variant: string, cls: string) => variant + cls

describe('the rows a screen reader hears', () => {
  test('a tree named by the app; each row its name, its level, whether it is open and whether it is chosen', async () => {
    render(<Tree aria-label="Files" nodes={FILES} defaultExpanded={['src']} defaultSelected="src/app.ts" />)
    const tree = await screen.findByRole('tree', { name: 'Files' })
    expect(within(tree).getAllByRole('treeitem')).toHaveLength(6)
    const src = item('src')
    expect(src.getAttribute('aria-level')).toBe('1')
    expect(src.getAttribute('aria-expanded')).toBe('true')
    expect(src.getAttribute('aria-selected')).toBe('false')
    // What a branch holds is a group the branch's row owns, one level in.
    expect(group('src')!.getAttribute('role')).toBe('group')
    expect(within(group('src')!).getByRole('treeitem', { name: 'app.ts' })).toBe(item('app.ts'))
    const app = item('app.ts')
    expect(app.getAttribute('aria-level')).toBe('2')
    expect(app.getAttribute('aria-selected')).toBe('true')
    expect(app.hasAttribute('aria-expanded')).toBe(false)
    // The short fact is heard after the name, not in it.
    expect(description(app)).toBe('4 KB')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    expect(item('lib').getAttribute('aria-level')).toBe('2')
    expect(item('assets').getAttribute('aria-expanded')).toBe('false')
    // A closed branch's rows are not in the page, and it owns no group.
    expect(shows('util.ts')).toBe(false)
    expect(group('lib')).toBeNull()
    // One Tab stop: the chosen row.
    expect(stops()).toEqual([app])
  })

  test('the row that has the focus is the treeitem: its level, whether it is open and whether it is chosen, on a branch as on a leaf', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    const here = () => document.activeElement!
    await focus(item('src'))
    await focusOn('src')
    expect(here().getAttribute('role')).toBe('treeitem')
    expect(here().getAttribute('aria-level')).toBe('1')
    expect(here().getAttribute('aria-expanded')).toBe('false')
    expect(here().getAttribute('aria-selected')).toBe('false')
    await press('Enter')
    await waitFor(() => expect(here().getAttribute('aria-expanded')).toBe('true'))
    expect(here()).toBe(item('src'))
    expect(here().getAttribute('aria-selected')).toBe('true')
    await press('ArrowDown')
    await focusOn('app.ts')
    expect(here().getAttribute('role')).toBe('treeitem')
    expect(here().getAttribute('aria-level')).toBe('2')
    expect(here().hasAttribute('aria-expanded')).toBe(false)
    expect(here().getAttribute('aria-selected')).toBe('false')
    await press('ArrowDown')
    await focusOn('lib')
    expect(here().getAttribute('aria-level')).toBe('2')
    expect(here().getAttribute('aria-expanded')).toBe('false')
    expect(here().getAttribute('aria-selected')).toBe('false')
  })

  test('without a choice the first row is the Tab stop', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await screen.findByRole('tree', { name: 'Files' })
    expect(stops()).toEqual([item('src')])
  })

  test('the chosen row says so, `aria-selected` and `aria-current`, which draw the tint and the accent bar of every list of things (R1); no other row does', async () => {
    render(<Tree aria-label="Files" nodes={FILES} defaultExpanded={['src']} defaultSelected="src" />)
    await screen.findByRole('tree', { name: 'Files' })
    const current = () => screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-current') === 'true')
    expect(current()).toEqual([item('src')])
    expect(item('src').getAttribute('aria-selected')).toBe('true')
    await click(item('app.ts'))
    await waitFor(() => expect(current()).toEqual([item('app.ts')]))
    expect(item('app.ts').getAttribute('aria-selected')).toBe('true')
    expect(item('src').getAttribute('aria-selected')).toBe('false')
    expect(item('src').hasAttribute('aria-current')).toBe(false)
  })

  test("icons in the user's pack, the open branch's own; an empty slot for a row without one, none in a tree without icons; 44px with a finger", async () => {
    const { unmount } = render(
      <IconPackProvider pack="duotone">
        <Tree aria-label="Files" nodes={FILES} />
      </IconPackProvider>,
    )
    await screen.findByRole('tree', { name: 'Files' })
    const icon = (name: string) => marks(item(name))[1]?.querySelector('svg')?.outerHTML
    expect(icon('package.json')).toBe(drawing('file', 'duotone'))
    expect(icon('src')).toBe(drawing('folder', 'duotone'))
    // A row without an icon keeps the slot, empty, so the names line up (R6).
    expect(marks(item('README.md'))).toHaveLength(2)
    expect(icon('README.md')).toBeUndefined()
    // The one look at a class: jsdom measures nothing, so the row is seen to ask for 44px with a coarse pointer.
    for (const row of [item('README.md'), item('src')]) expect(row.className.split(/\s+/)).toContain(v('pointer-coarse:', 'min-h-11'))
    // Open, a branch draws its open icon; one without (`assets`) keeps its own.
    await focus(item('src'))
    await press('ArrowRight')
    await opens('src')
    expect(icon('src')).toBe(drawing('folderOpen', 'duotone'))
    await press('*')
    await opens('assets')
    expect(icon('assets')).toBe(drawing('folder', 'duotone'))
    unmount()
    render(<Tree aria-label="Plain" nodes={[{ id: 'a', name: 'One' }, { id: 'b', name: 'Two' }]} />)
    await screen.findByRole('tree', { name: 'Plain' })
    expect(marks(item('One'))).toHaveLength(1)
  })

  test('a count at the end of the row, after the fact, heard after the name; zero shows nothing', async () => {
    render(
      <Tree
        aria-label="Changes"
        nodes={[
          { id: 'src', name: 'src', count: 3, children: [] },
          { id: 'docs', name: 'docs', count: 0, children: [] },
          { id: 'notes.md', name: 'notes.md', meta: '2 KB', count: 1 },
        ]}
      />,
    )
    await screen.findByRole('tree', { name: 'Changes' })
    expect(description(item('src'))).toBe('3')
    expect(description(item('docs'))).toBe('')
    expect(within(item('docs')).queryByText('0')).toBeNull()
    expect(within(item('notes.md')).getByText('2 KB')).toBeTruthy()
    expect(within(item('notes.md')).getByText('1')).toBeTruthy()
  })
})

describe('the keys', () => {
  test("the arrows open, close and move; Home and End reach the first and the last row in sight; a closed branch's rows leave the page", async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(item('src'))
    await focusOn('src')
    // Right opens a branch, then goes into it.
    await press('ArrowRight')
    await opens('src')
    expect(document.activeElement).toBe(item('src'))
    await press('ArrowRight')
    await focusOn('app.ts')
    await press('ArrowDown')
    await focusOn('lib')
    await press('ArrowRight')
    await opens('lib')
    await press('ArrowDown')
    await focusOn('util.ts')
    expect(item('util.ts').getAttribute('aria-level')).toBe('3')
    // Left on a leaf goes out to the branch that holds it; on an open branch it closes it.
    await press('ArrowLeft')
    await focusOn('lib')
    await press('ArrowLeft')
    await opens('lib', false)
    expect(shows('util.ts')).toBe(false)
    expect(group('lib')).toBeNull()
    await press('ArrowUp')
    await focusOn('app.ts')
    await press('End')
    await focusOn('README.md')
    await press('Home')
    await focusOn('src')
    await press('ArrowLeft')
    await opens('src', false)
    expect(shows('app.ts')).toBe(false)
    // The Tab stop followed the focus.
    await waitFor(() => expect(stops()).toEqual([item('src')]))
  })

  test('`*` opens the branches beside the row', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(item('src'))
    await focusOn('src')
    await press('*')
    await opens('src')
    await opens('assets')
  })

  test('the first letters typed reach a row in sight, a plain «a» too', async () => {
    // A tree for each letter: the letters typed are forgotten only after a pause.
    for (const [key, name] of [['p', 'package.json'], ['a', 'assets'], ['R', 'README.md']] as const) {
      const { unmount } = render(<Tree aria-label="Files" nodes={FILES} />)
      await focus(item('src'))
      await focusOn('src')
      await press(key)
      await focusOn(name)
      unmount()
    }
  })
})

describe('one choice', () => {
  test('a press, Enter or Space chooses a row, and only that one; a press on a branch also opens it', async () => {
    const chose = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onSelect={chose} />)
    await click(item('README.md'))
    await waitFor(() => expect(item('README.md').getAttribute('aria-selected')).toBe('true'))
    expect(chose).toHaveBeenLastCalledWith('README.md', FILES[3])
    await focus(item('package.json'))
    await press('Enter')
    await waitFor(() => expect(item('package.json').getAttribute('aria-selected')).toBe('true'))
    expect(item('README.md').getAttribute('aria-selected')).toBe('false')
    await focus(item('src'))
    await press(' ')
    await waitFor(() => expect(item('src').getAttribute('aria-selected')).toBe('true'))
    await opens('src')
    expect(chose).toHaveBeenLastCalledWith('src', FILES[0])
    expect(screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-selected') === 'true')).toEqual([item('src')])
  })

  test("with `selected` the choice is the app's: the tree asks, the app answers", async () => {
    const chose = vi.fn()
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} selected={null} onSelect={chose} />)
    await click(item('package.json'))
    await waitFor(() => expect(chose).toHaveBeenCalledWith('package.json', FILES[2]))
    expect(item('package.json').getAttribute('aria-selected')).toBe('false')
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} selected="package.json" onSelect={chose} />))
    await waitFor(() => expect(item('package.json').getAttribute('aria-selected')).toBe('true'))
  })

  test("with `expanded` the open branches are the app's, told only when they change", async () => {
    const change = vi.fn()
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} expanded={[]} onExpandedChange={change} />)
    await focus(item('src'))
    await press('ArrowRight')
    await waitFor(() => expect(change).toHaveBeenLastCalledWith(['src']))
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} expanded={['src', 'src/lib']} onExpandedChange={change} />))
    await opens('src')
    await opens('lib')
    expect(item('util.ts')).toBeTruthy()
    // A branch the filter opened is not the person's: closing it leaves their list as it was, and nothing is said.
    change.mockClear()
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} expanded={[]} onExpandedChange={change} query="util" />))
    await opens('lib')
    await focus(item('lib'))
    await press('ArrowLeft')
    await opens('lib', false)
    expect(change).not.toHaveBeenCalled()
  })
})

describe('children loaded when a branch opens', () => {
  const REMOTE: TreeNode = { id: 'remote', name: 'remote', icon: 'folder', hasChildren: true }
  const LOCAL: TreeNode = { id: 'local.txt', name: 'local.txt', icon: 'file' }
  /** A loader the test answers by hand: each request with its node, its signal and its answer. */
  const loader = () => {
    const calls: { node: TreeNode; signal: AbortSignal; resolve: (nodes: readonly TreeNode[]) => void; reject: (error: unknown) => void }[] = []
    const load = vi.fn((node: TreeNode, signal: AbortSignal) => new Promise<readonly TreeNode[]>((resolve, reject) => void calls.push({ node, signal, resolve, reject })))
    return { load, calls }
  }

  test('the branch says it loads, says it failed, and opening it again tries again', async () => {
    const { load, calls } = loader()
    render(<Tree aria-label="Files" nodes={[REMOTE, LOCAL]} loadChildren={load} />)
    // A branch before its children are known.
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
    expect(description(item('remote'))).toBe('')
    await focus(item('remote'))
    await press('ArrowRight')
    await waitFor(() => expect(description(item('remote'))).toBe('Loading'))
    expect(load).toHaveBeenCalledTimes(1)
    expect(calls[0]!.node).toBe(REMOTE)
    expect(calls[0]!.signal).toBeInstanceOf(AbortSignal)
    expect(item('remote').getAttribute('aria-busy')).toBe('true')
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')

    await step(() => calls[0]!.reject(new Error('offline')))
    await waitFor(() => expect(description(item('remote'))).toBe('Not loaded Open it to try again'))
    expect(within(item('remote')).getByText('Not loaded')).toBeTruthy()
    expect(item('remote').hasAttribute('aria-busy')).toBe(false)
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')

    // Opening it again tries again.
    await press('ArrowRight')
    await waitFor(() => expect(description(item('remote'))).toBe('Loading'))
    expect(load).toHaveBeenCalledTimes(2)
    await step(() => calls[1]!.resolve([{ id: 'remote/notes.txt', name: 'notes.txt', meta: '3 KB' }]))
    await opens('remote')
    expect(item('notes.txt').getAttribute('aria-level')).toBe('2')
    expect(description(item('remote'))).toBe('')
    // Loaded once: closing and opening again asks nothing more.
    await press('ArrowLeft')
    await opens('remote', false)
    await press('ArrowRight')
    await opens('remote')
    expect(load).toHaveBeenCalledTimes(2)
    expect(item('notes.txt')).toBeTruthy()
  })

  test('a loader that throws is a failure like any other', async () => {
    const loadChildren = vi.fn((): Promise<readonly TreeNode[]> => {
      throw new Error('no network')
    })
    render(<Tree aria-label="Files" nodes={[REMOTE]} loadChildren={loadChildren} />)
    await focus(item('remote'))
    await press('Enter')
    await waitFor(() => expect(description(item('remote'))).toBe('Not loaded Open it to try again'))
    expect(loadChildren).toHaveBeenCalledTimes(1)
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
  })

  test('a branch that loads takes no second request: Enter, Right or a press again neither ask again nor give up the first', async () => {
    const { load, calls } = loader()
    render(<Tree aria-label="Files" nodes={[REMOTE, LOCAL]} loadChildren={load} />)
    await focus(item('remote'))
    await press('Enter')
    await waitFor(() => expect(description(item('remote'))).toBe('Loading'))
    await press('Enter')
    await press('ArrowRight')
    await click(item('remote'))
    await step(() => calls[0]!.resolve([{ id: 'remote/a.txt', name: 'a.txt' }]))
    await opens('remote')
    expect(item('a.txt')).toBeTruthy()
    expect(load).toHaveBeenCalledTimes(1)
    expect(calls[0]!.signal.aborted).toBe(false)
  })

  test('the children follow the nodes: another node object for the id, or none, drops them, and a load for it is given up', async () => {
    const { load, calls } = loader()
    const { rerender } = render(<Tree aria-label="Files" nodes={[REMOTE, LOCAL]} loadChildren={load} />)
    await focus(item('remote'))
    await press('ArrowRight')
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await step(() => calls[0]!.resolve([{ id: 'remote/old.txt', name: 'old.txt' }]))
    await opens('remote')
    expect(item('old.txt')).toBeTruthy()

    // Another project: a folder with the same id is another folder. Its rows are not those of the first.
    const OTHER: TreeNode = { ...REMOTE }
    await step(() => rerender(<Tree aria-label="Files" nodes={[OTHER, LOCAL]} loadChildren={load} />))
    await opens('remote', false)
    expect(shows('old.txt')).toBe(false)
    await focus(item('remote'))
    await press('ArrowRight')
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    expect(calls[1]!.node).toBe(OTHER)

    // The nodes change again while that load is under way: the tree gives it up, and its answer shows nothing.
    const THIRD: TreeNode = { ...REMOTE }
    await step(() => rerender(<Tree aria-label="Files" nodes={[THIRD, LOCAL]} loadChildren={load} />))
    await waitFor(() => expect(calls[1]!.signal.aborted).toBe(true))
    expect(description(item('remote'))).toBe('')
    await step(() => calls[1]!.resolve([{ id: 'remote/stale.txt', name: 'stale.txt' }]))
    expect(item('remote').getAttribute('aria-expanded')).toBe('false')
    expect(shows('stale.txt')).toBe(false)

    // Loaded, then gone from the nodes: nothing of it is kept, and it loads afresh when it comes back.
    await press('ArrowRight')
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3))
    await step(() => calls[2]!.resolve([{ id: 'remote/new.txt', name: 'new.txt' }]))
    await opens('remote')
    expect(item('new.txt')).toBeTruthy()
    await step(() => rerender(<Tree aria-label="Files" nodes={[LOCAL]} loadChildren={load} />))
    await waitFor(() => expect(shows('remote')).toBe(false))
    await step(() => rerender(<Tree aria-label="Files" nodes={[THIRD, LOCAL]} loadChildren={load} />))
    await opens('remote', false)
    expect(shows('new.txt')).toBe(false)
    await focus(item('remote'))
    await press('ArrowRight')
    await waitFor(() => expect(load).toHaveBeenCalledTimes(4))
  })

  test('a tree that leaves the page gives up the load it waited for', async () => {
    const { load, calls } = loader()
    const { unmount } = render(<Tree aria-label="Files" nodes={[REMOTE]} loadChildren={load} />)
    await focus(item('remote'))
    await press('ArrowRight')
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    unmount()
    expect(calls[0]!.signal.aborted).toBe(true)
  })
})

describe('the filter', () => {
  test('what is found shows with the branches that lead to it opened; cleared, what the person had opened comes back', async () => {
    render(<Tree aria-label="Files" nodes={FILES} search defaultExpanded={['src']} />)
    await focus(item('README.md'))
    const field = screen.getByRole('searchbox', { name: 'Filter by name' })
    // By default: the name holds the text, whatever the case and the spaces around it.
    await type(field, ' UTIL ')
    await opens('lib')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()
    for (const name of ['app.ts', 'assets', 'package.json', 'README.md']) expect(shows(name), name).toBe(false)
    // The row that had the focus is gone: the tree keeps a Tab stop.
    expect(stops()).toEqual([item('src')])

    await type(field, '')
    await waitFor(() => expect(shows('README.md')).toBe(true))
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    expect(shows('app.ts')).toBe(true)
    expect(shows('util.ts')).toBe(false)
  })

  test('a branch the person opens while filtering stays open after; nothing found says so in the words of every search', async () => {
    render(<Tree aria-label="Files" nodes={FILES} search />)
    const field = screen.getByRole('searchbox', { name: 'Filter by name' })
    await type(field, 'lib')
    // Found by its own name: shown closed, with what it holds a press away.
    await opens('src')
    expect(item('lib').getAttribute('aria-expanded')).toBe('false')
    await click(item('lib'))
    await opens('lib')
    expect(item('util.ts')).toBeTruthy()

    await type(field, 'nothing like it')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('No results'))
    expect(screen.queryByRole('treeitem')).toBeNull()

    await type(field, '')
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    // The branch the filter opened is closed again; the one the person opened is still open inside it.
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await click(item('src'))
    await opens('src')
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(item('util.ts')).toBeTruthy()
  })

  test("cleared, the person's branches come back with what they closed meanwhile; a find in new nodes shows opened", async () => {
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} search defaultExpanded={['src', 'assets']} />)
    const field = screen.getByRole('searchbox', { name: 'Filter by name' })
    await type(field, 'util')
    await opens('lib')
    // The person closes a branch the filter opened, then one of their own.
    await click(item('lib'))
    await opens('lib', false)
    await click(item('src'))
    await opens('src', false)
    // The app's nodes change: a new find shows, with the branch that leads to it opened; what the person closed stays closed.
    const MORE: readonly TreeNode[] = [FILES[0]!, { id: 'assets', name: 'assets', icon: 'folder', children: [{ id: 'assets/util.svg', name: 'util.svg' }] }, ...FILES.slice(2)]
    await step(() => rerender(<Tree aria-label="Files" nodes={MORE} search defaultExpanded={['src', 'assets']} />))
    await waitFor(() => expect(shows('util.svg')).toBe(true))
    expect(item('assets').getAttribute('aria-expanded')).toBe('true')
    expect(item('src').getAttribute('aria-expanded')).toBe('false')

    await type(field, '')
    await waitFor(() => expect(shows('README.md')).toBe(true))
    // Their own branches: `assets` as before, `src` closed as they left it; `lib` was never theirs.
    expect(item('assets').getAttribute('aria-expanded')).toBe('true')
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    expect(shows('lib')).toBe(false)
  })

  test("the text can be the app's: `query` and `onQueryChange`, with the tree's field or from a field of its own", async () => {
    const said = vi.fn()
    const { rerender } = render(<Tree aria-label="Files" nodes={FILES} search query="" onQueryChange={said} />)
    const field = screen.getByRole('searchbox', { name: 'Filter by name' }) as HTMLInputElement
    await type(field, 'lib')
    expect(said).toHaveBeenLastCalledWith('lib')
    // The app has not taken it: nothing filters yet.
    expect(field.value).toBe('')
    expect(shows('README.md')).toBe(true)
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} search query="lib" onQueryChange={said} />))
    await waitFor(() => expect(shows('README.md')).toBe(false))
    expect(field.value).toBe('lib')
    expect(item('lib')).toBeTruthy()
    // Without `search` the tree draws no field and filters by the text it is given.
    await step(() => rerender(<Tree aria-label="Files" nodes={FILES} query="util" />))
    await waitFor(() => expect(shows('util.ts')).toBe(true))
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(shows('app.ts')).toBe(false)
  })

  test("the text it starts with, when it is the tree's own", async () => {
    render(<Tree aria-label="Files" nodes={FILES} search defaultQuery="package" />)
    await screen.findByRole('tree', { name: 'Files' })
    expect((screen.getByRole('searchbox', { name: 'Filter by name' }) as HTMLInputElement).value).toBe('package')
    expect(item('package.json')).toBeTruthy()
    expect(shows('src')).toBe(false)
  })

  test('`match` finds by what the app says (here the whole path), and the app counts the finds with the same function', async () => {
    const byPath = vi.fn((node: TreeNode, query: string) => node.id.startsWith(query))
    render(<Tree aria-label="Files" nodes={FILES} query="src/lib" match={byPath} />)
    await waitFor(() => expect(shows('util.ts')).toBe(true))
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(item('lib').getAttribute('aria-expanded')).toBe('true')
    expect(shows('app.ts')).toBe(false)
    expect(byPath).toHaveBeenCalledWith(FILES[0], 'src/lib')
    const all = (list: readonly TreeNode[]): TreeNode[] => list.flatMap((node) => [node, ...all(node.children ?? [])])
    expect(all(FILES).filter((node) => byPath(node, 'src/lib')).map((node) => node.name)).toEqual(['lib', 'util.ts'])
  })

  test('a branch never loaded is not searched: the filter asks for nothing', async () => {
    const load = vi.fn(() => new Promise<readonly TreeNode[]>(() => {}))
    render(<Tree aria-label="Files" nodes={[{ id: 'remote', name: 'remote', hasChildren: true }]} loadChildren={load} query="notes" />)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('No results'))
    expect(load).not.toHaveBeenCalled()
  })

  test("the field says the app's words, or the name the tree is given", async () => {
    const { unmount } = render(
      <WordsProvider words={{ tree: { filter: 'Filtra per nome' }, sidebar: { empty: 'Nessun risultato' } }}>
        <Tree aria-label="File" nodes={FILES} search />
      </WordsProvider>,
    )
    await type(screen.getByRole('searchbox', { name: 'Filtra per nome' }), 'zzz')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Nessun risultato'))
    unmount()
    render(<Tree aria-label="Files" nodes={FILES} search searchLabel="Find a file by name" />)
    expect(screen.getByRole('searchbox', { name: 'Find a file by name' })).toBeTruthy()
  })
})
