// `Tree` onOpen, followFocus, disabled and virtual: what an app that pairs a tree with a list and its details, or holds
// thousands of rows, asks of it. Driven as `tree.test.tsx` does (Ark's machine takes an event in a microtask). jsdom lays
// nothing out, so `virtual` is given a layout: the box is 200px tall and a row 30px (plus the 2px between rows).
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

  test('a branch is asked for too, and also opens as before', async () => {
    const open = vi.fn()
    render(<Tree aria-label="Files" nodes={FILES} onOpen={open} />)
    await focus(item('src'))
    await press('Enter')
    expect(open).toHaveBeenCalledWith('src', FILES[0])
    await waitFor(() => expect(item('src').getAttribute('aria-expanded')).toBe('true'))
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
})
