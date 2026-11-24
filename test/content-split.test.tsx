// Two panes in the content (`ContentSplit`): a column of fixed width with a list, the thing chosen beside it, and one
// at a time where the split, measured by itself, is narrower than its step.
import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ContentSplit } from '../src'

afterEach(() => vi.unstubAllGlobals())

/** A `ResizeObserver` the test drives: `resize(width)` tells every observer the split's width. */
function observed() {
  const callbacks: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    disconnect() {}
  })
  return (width: number) => act(() => callbacks.forEach((c) => c([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)))
}

const parts = () => ({
  split: document.querySelector<HTMLElement>('[data-slot="content-split"]')!,
  aside: document.querySelector<HTMLElement>('[data-slot="content-split-aside"]')!,
  main: document.querySelector<HTMLElement>('[data-slot="content-split-main"]')!,
})

test('without a way to measure it has its two panes: the column named, of its width, with a line at its inner edge; each pane scrolls', () => {
  render(
    <ContentSplit aside={<p>The list</p>} asideLabel="Messages" width="lg">
      <p>The message</p>
    </ContentSplit>,
  )
  const { split, aside, main } = parts()
  expect(screen.getByRole('region', { name: 'Messages' })).toBe(aside)
  expect(split.getAttribute('data-panes')).toBe('2')
  expect(aside.hidden).toBe(false)
  expect(main.hidden).toBe(false)
  for (const part of ['w-90', 'shrink-0', 'border-e', 'border-line', 'overflow-y-auto']) expect(aside.className).toContain(part)
  expect(main.className).toContain('overflow-y-auto')
  expect(main.className).toContain('flex-1')
  expect(aside.textContent).toBe('The list')
})

test('it measures itself: under twice the column one pane shows, the one `show` names, and the other stays in the page, hidden', () => {
  const resize = observed()
  const panes = vi.fn()
  const { rerender } = render(
    <ContentSplit aside={<p>The list</p>} asideLabel="Messages" onPanesChange={panes}>
      <p>The message</p>
    </ContentSplit>,
  )
  resize(900)
  expect(parts().split.getAttribute('data-panes')).toBe('2')
  resize(639)
  expect(parts().split.getAttribute('data-panes')).toBe('1')
  expect(parts().aside.hidden).toBe(false)
  expect(parts().aside.className).toContain('flex-1')
  expect(parts().main.hidden).toBe(true)
  expect(panes).toHaveBeenLastCalledWith(1)
  rerender(
    <ContentSplit aside={<p>The list</p>} asideLabel="Messages" show="main" onPanesChange={panes}>
      <p>The message</p>
    </ContentSplit>,
  )
  expect(parts().aside.hidden).toBe(true)
  expect(parts().aside.textContent).toBe('The list')
  expect(parts().main.hidden).toBe(false)
  resize(640)
  expect(parts().split.getAttribute('data-panes')).toBe('2')
  expect(parts().aside.hidden).toBe(false)
  expect(panes).toHaveBeenLastCalledWith(2)
})

test('the step follows the width of the column, or is the app\'s; 0 keeps two panes', () => {
  const resize = observed()
  const { rerender } = render(
    <ContentSplit aside={null} asideLabel="Messages" width="sm">
      main
    </ContentSplit>,
  )
  resize(480)
  expect(parts().split.getAttribute('data-panes')).toBe('2')
  resize(479)
  expect(parts().split.getAttribute('data-panes')).toBe('1')
  rerender(
    <ContentSplit aside={null} asideLabel="Messages" width="sm" step={0}>
      main
    </ContentSplit>,
  )
  resize(200)
  expect(parts().split.getAttribute('data-panes')).toBe('2')
})
