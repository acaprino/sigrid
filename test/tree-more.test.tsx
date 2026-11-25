// `Tree` onOpen, followFocus, disabled and virtual: what an app that pairs a tree with a list and its details, or holds
// thousands of rows, asks of it. Driven as `tree.test.tsx` does (Ark's machine takes an event in a microtask). jsdom lays
// nothing out, so `virtual` is given a layout: the box is 200px tall and a row 30px (plus the 2px between rows).
import * as React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Tree, type TreeNode } from '../src/assemblies'

const FILES: readonly TreeNode[] = [
  { id: 'src', name: 'src', children: [{ id: 'src/app.ts', name: 'app.ts' }, { id: 'src/lib.ts', name: 'lib.ts' }] },
  { id: 'a.txt', name: 'a.txt' },
  { id: 'b.txt', name: 'b.txt' },
  { id: 'c.txt', name: 'c.txt' },
]

const step = async (what: () => void) => {
  await act(async () => {
    what()
  })
}
const press = (key: string) => step(() => fireEvent.keyDown(document.activeElement!, { key }))
const focus = (el: HTMLElement) => step(() => el.focus())
const item = (name: string) => screen.getByRole('treeitem', { name })
const selectedRows = () => screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-selected') === 'true')

afterEach(() => vi.restoreAllMocks())

describe('onOpen', () => {
  test('Enter and a double press ask the app to open the thing, besides choosing it; a single press does not', async () => {
    const open = vi.fn()
    const chose = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onOpen={open} onSelect={chose} />)
    await step(() => fireEvent.click(item('a.txt')))
    await waitFor(() => expect(chose).toHaveBeenCalledWith('a.txt', FILES[1]))
    expect(open).not.toHaveBeenCalled()
    await step(() => fireEvent.doubleClick(item('a.txt')))
    expect(open).toHaveBeenLastCalledWith('a.txt', FILES[1])
    await focus(item('b.txt'))
    await press('Enter')
    expect(open).toHaveBeenLastCalledWith('b.txt', FILES[2])
    expect(open).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(item('b.txt').getAttribute('aria-selected')).toBe('true'))
  })

  test('a branch is asked for too, and Enter does not open or close it: Right and Left do', async () => {
    const open = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onOpen={open} />)
    await focus(item('src'))
    await press('Enter')
    expect(open).toHaveBeenCalledWith('src', FILES[0])
    expect(open).toHaveBeenCalledTimes(1)
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await waitFor(() => expect(item('src').getAttribute('aria-selected')).toBe('true'))
    await press('ArrowRight')
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('true'))
    await press('Enter')
    expect(open).toHaveBeenCalledTimes(2)
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    await press('ArrowLeft')
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('false'))
  })

  test('without `onOpen`, Enter on a branch opens it as before', async () => {
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(item('src'))
    await press('Enter')
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('true'))
  })

  test('Enter, Space, Right and Left with a modifier held are not the tree\'s, and the event is not stopped for the page', async () => {
    const open = vi.fn()
    const chose = vi.fn()
    const outer = vi.fn()
    render(
      <div onKeyDown={outer}>
        <Tree aria-label="Files" nodes={FILES} onOpen={open} onSelect={chose} />
      </div>,
    )
    await focus(item('src'))
    for (const key of ['Enter', ' ', 'ArrowRight', 'ArrowLeft']) {
      for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }]) await step(() => fireEvent.keyDown(document.activeElement!, { key, ...init }))
    }
    expect(open).not.toHaveBeenCalled()
    expect(chose).not.toHaveBeenCalled()
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    expect(outer).toHaveBeenCalledTimes(16)
    // Not the browser's default either.
    const alt = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true })
    await step(() => void document.activeElement!.dispatchEvent(alt))
    expect(alt.defaultPrevented).toBe(false)
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('the app\'s keys', () => {
  test('`onKeyDown` is asked first, with the row\'s id: what it takes with preventDefault the tree does nothing with', async () => {
    const asked = vi.fn((event: React.KeyboardEvent, id: string) => {
      if (event.key === 'Enter' || event.key === 'j') event.preventDefault()
      return id
    })
    const open = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onKeyDown={asked} onOpen={open} />)
    await focus(item('src'))
    await press('Enter')
    expect(asked).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'Enter' }), 'src')
    expect(open).not.toHaveBeenCalled()
    expect(item('src').getAttribute('aria-selected')).toBe('false')
    // A key it leaves is the tree's.
    await press('ArrowDown')
    await waitFor(() => expect(document.activeElement).toBe(item('a.txt')))
    expect(asked).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'ArrowDown' }), 'src')
  })

  test('`typeahead={false}` leaves the letters to the app; Space and `*` stay the tree\'s', async () => {
    const { unmount } = render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(item('src'))
    await press('b')
    await waitFor(() => expect(document.activeElement).toBe(item('b.txt')))
    unmount()
    const keys = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} typeahead={false} onKeyDown={(event) => keys(event.key)} />)
    await focus(item('src'))
    await press('b')
    await press('j')
    expect(keys.mock.calls.map(([key]) => key)).toEqual(['b', 'j'])
    expect(document.activeElement).toBe(item('src'))
    await press(' ')
    await waitFor(() => expect(item('src').getAttribute('aria-selected')).toBe('true'))
  })
})

describe('keys in a language written from the right', () => {
  test('Left opens a branch and Right closes it', async () => {
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo)
      return new Proxy(style, { get: (target, key) => (key === 'direction' ? 'rtl' : Reflect.get(target, key)) })
    })
    render(<Tree aria-label="Files" nodes={FILES} />)
    await focus(item('src'))
    await press('ArrowRight')
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await press('ArrowLeft')
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('true'))
    await press('ArrowRight')
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('false'))
  })
})

describe('followFocus', () => {
  test('the arrows choose the row they reach; without it they only move the focus', async () => {
    const chose = vi.fn()
    const { unmount } = render(<Tree aria-label="Files" nodes={FILES} followFocus onSelect={chose} defaultSelected="a.txt" />)
    await focus(item('a.txt'))
    await press('ArrowDown')
    await waitFor(() => expect(item('b.txt').getAttribute('aria-selected')).toBe('true'))
    expect(chose).toHaveBeenLastCalledWith('b.txt', FILES[2])
    expect(selectedRows()).toEqual([item('b.txt')])
    await press('ArrowUp')
    await waitFor(() => expect(item('a.txt').getAttribute('aria-selected')).toBe('true'))
    unmount()
    const quiet = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onSelect={quiet} defaultSelected="a.txt" />)
    await focus(item('a.txt'))
    await press('ArrowDown')
    await waitFor(() => expect(document.activeElement).toBe(item('b.txt')))
    expect(quiet).not.toHaveBeenCalled()
    expect(item('a.txt').getAttribute('aria-selected')).toBe('true')
  })
})

describe('followFocus, with the choice held by the app', () => {
  test('onSelect is heard once for a move, even while the app has not given the new choice back', async () => {
    const chose = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} followFocus selected="a.txt" onSelect={chose} />)
    await focus(item('a.txt'))
    await press('ArrowDown')
    await waitFor(() => expect(document.activeElement).toBe(item('b.txt')))
    await step(() => new Promise((done) => setTimeout(done, 5)))
    expect(chose.mock.calls).toEqual([['b.txt', FILES[2]]])
    await press('ArrowDown')
    await waitFor(() => expect(document.activeElement).toBe(item('c.txt')))
    await step(() => new Promise((done) => setTimeout(done, 5)))
    expect(chose.mock.calls).toEqual([['b.txt', FILES[2]], ['c.txt', FILES[3]]])
    // A press moves the focus and chooses: still one hearing.
    chose.mockClear()
    await step(() => fireEvent.click(item('b.txt')))
    await step(() => new Promise((done) => setTimeout(done, 5)))
    expect(chose.mock.calls).toEqual([['b.txt', FILES[2]]])
    // The mouse: the row takes the focus, then the press chooses it. One hearing for the press, a second for the next one.
    chose.mockClear()
    await step(() => fireEvent.pointerDown(item('c.txt')))
    await focus(item('c.txt'))
    await step(() => fireEvent.click(item('c.txt')))
    await step(() => new Promise((done) => setTimeout(done, 5)))
    expect(chose.mock.calls).toEqual([['c.txt', FILES[3]]])
    await step(() => fireEvent.pointerDown(item('c.txt')))
    await step(() => fireEvent.click(item('c.txt')))
    expect(chose.mock.calls).toHaveLength(2)
  })
})

describe('a disabled row', () => {
  const NODES: readonly TreeNode[] = [
    { id: 'one', name: 'one' },
    { id: 'locked', name: 'locked', disabled: true, children: [{ id: 'locked/x', name: 'x' }] },
  ]

  test('says so, and is neither chosen, opened nor asked for, while the keys still reach it', async () => {
    const chose = vi.fn()
    const open = vi.fn()
    render(<Tree aria-label="Files" nodes={NODES} onSelect={chose} onOpen={open} />)
    const locked = item('locked')
    expect(locked.getAttribute('aria-disabled')).toBe('true')
    expect(locked.className).toContain('aria-disabled:opacity-50')
    expect(item('one').hasAttribute('aria-disabled')).toBe(false)
    await step(() => fireEvent.click(locked))
    await focus(locked)
    await press('Enter')
    await press('ArrowRight')
    await step(() => fireEvent.doubleClick(locked))
    expect(chose).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(locked.getAttribute('aria-expanded')).toBe('false')
    expect(locked.getAttribute('aria-selected')).toBe('false')
  })
})

describe('virtual', () => {
  const MANY: readonly TreeNode[] = Array.from({ length: 5000 }, (_, i): TreeNode => ({ id: `n${i}`, name: `node ${i}` }))
  const ROW = 30

  function layOut() {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.matches('[data-slot="tree-rows"]') ? 200 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.matches('[role="treeitem"]') ? ROW : 0
    })
  }
  const drawn = () => screen.getAllByRole('treeitem')
  const rows = () => document.querySelector<HTMLElement>('[data-slot="tree-rows"]')!
  const window_ = () => document.querySelector<HTMLElement>('[data-slot="tree-window"]')!

  test('only the rows in sight are in the page, each says its level and its place among five thousand, and the room of the others is kept', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={MANY} virtual className="h-52" />)
    await waitFor(() => expect(window_().style.paddingBottom).not.toBe('0px'))
    expect(drawn().length).toBeLessThan(60)
    expect(drawn().length).toBeGreaterThan(5)
    const first = drawn()[0]!
    expect(first.getAttribute('aria-level')).toBe('1')
    expect(first.getAttribute('aria-posinset')).toBe('1')
    expect(first.getAttribute('aria-setsize')).toBe('5000')
    const step_ = ROW + 2
    expect(window_().style.paddingTop).toBe('0px')
    expect(window_().style.paddingBottom).toBe(`${(5000 - drawn().length) * step_}px`)
  })

  test('scrolling draws the rows then in sight', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={MANY} virtual />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    await step(() => {
      rows().scrollTop = 32 * 1000
      fireEvent.scroll(rows())
    })
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: 'node 1000' })).not.toBeNull())
    expect(screen.queryByRole('treeitem', { name: 'node 0' })).toBeNull()
  })

  test('the keys reach rows out of sight: End scrolls to the last row and gives it the focus', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={MANY} virtual />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    await focus(item('node 0'))
    await press('End')
    await waitFor(() => expect(document.activeElement).toBe(item('node 4999')))
  })

  test('an open branch lays its rows flat, one level in, among the others', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={FILES} virtual defaultExpanded={['src']} />)
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: 'app.ts' })).not.toBeNull())
    const app = item('app.ts')
    expect(app.getAttribute('aria-level')).toBe('2')
    expect(app.getAttribute('aria-posinset')).toBe('1')
    expect(app.getAttribute('aria-setsize')).toBe('2')
    expect(item('src').getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[role="group"]')).toBeNull()
    expect(drawn().map((row) => row.textContent)).toEqual(['src', 'app.ts', 'lib.ts', 'a.txt', 'b.txt', 'c.txt'])
  })

  test('the choice the app changes (its own keys) is scrolled to, and the focus in the tree goes there', async () => {
    layOut()
    const { rerender } = render(<Tree aria-label="Files" nodes={MANY} virtual selected="n0" />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    await focus(item('node 0'))
    rerender(<Tree aria-label="Files" nodes={MANY} virtual selected="n3000" />)
    // The least that shows it: its bottom at the bottom of the box (the rows are 32px with their gap, the box 200).
    await waitFor(() => expect(rows().scrollTop).toBe(3000 * (ROW + 2) + ROW - 200))
    await waitFor(() => expect(document.activeElement).toBe(item('node 3000')))
    // The row chosen is the one Enter is for.
    const open = vi.fn()
    rerender(<Tree aria-label="Files" nodes={MANY} virtual selected="n3000" onOpen={open} />)
    await press('Enter')
    expect(open).toHaveBeenCalledWith('n3000', MANY[3000])
  })

  test('with the app\'s own j and k, the focus and the choice move together', async () => {
    layOut()
    const next = (id: string, by: number) => `n${Number(id.slice(1)) + by}`
    function App() {
      const [chosen, setChosen] = React.useState('n0')
      return (
        <Tree
          aria-label="Files"
          nodes={MANY}
          virtual
          typeahead={false}
          selected={chosen}
          onSelect={(id) => setChosen(id)}
          onKeyDown={(event, id) => {
            if (event.key === 'j' || event.key === 'k') {
              event.preventDefault()
              setChosen(next(id, event.key === 'j' ? 1 : -1))
            }
          }}
        />
      )
    }
    render(<App />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    await focus(item('node 0'))
    for (let i = 0; i < 12; i++) await press('j')
    await waitFor(() => expect(document.activeElement).toBe(item('node 12')))
    expect(item('node 12').getAttribute('aria-selected')).toBe('true')
    // 13 rows of 32px do not fit the box: it scrolled, by the app's choice alone.
    expect(rows().scrollTop).toBeGreaterThan(0)
    await press('k')
    await waitFor(() => expect(document.activeElement).toBe(item('node 11')))
  })

  test('the row with the focus stays in the page when it is scrolled out of sight, with the room kept; once the focus leaves, it goes', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={MANY} virtual />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    const first = item('node 0')
    await focus(first)
    await step(() => {
      rows().scrollTop = 32 * 1000
      fireEvent.scroll(rows())
    })
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: 'node 1000' })).not.toBeNull())
    expect(item('node 0')).toBe(first)
    expect(document.activeElement).toBe(first)
    expect(drawn()[0]).toBe(first)
    // Every row not drawn keeps its room: the 4999 others are padding and the space between the focused row and the ones in sight.
    const room = document.querySelector<HTMLElement>('[data-slot="tree-room"]')!
    const inSight = drawn().length - 1
    expect(parseInt(room.style.height, 10) + (1 + inSight) * (ROW + 2) + parseInt(window_().style.paddingBottom, 10) - 2 + 2).toBeGreaterThan(0)
    expect(parseInt(window_().style.paddingTop, 10)).toBe(0)
    const total = parseInt(room.style.height, 10) + 2 + (drawn().length) * (ROW + 2) + parseInt(window_().style.paddingBottom, 10) + 2 - 2
    expect(Math.abs(total - 5000 * (ROW + 2))).toBeLessThanOrEqual(4)
    await step(() => first.blur())
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: 'node 0' })).toBeNull())
  })

  test('a scroll that does not reach another row draws nothing again', async () => {
    layOut()
    render(<Tree aria-label="Files" nodes={MANY} virtual />)
    await waitFor(() => expect(drawn().length).toBeGreaterThan(5))
    const before = drawn().map((row) => row.textContent)
    await step(() => {
      rows().scrollTop = 20
      fireEvent.scroll(rows())
    })
    expect(window_().style.paddingTop).toBe('0px')
    expect(drawn().map((row) => row.textContent)).toEqual(before)
    await step(() => {
      rows().scrollTop = (ROW + 2) * 40 + 5
      fireEvent.scroll(rows())
    })
    expect(window_().style.paddingTop).toBe(`${(40 - 10) * (ROW + 2)}px`)
  })
})
