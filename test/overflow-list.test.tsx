// One line of items that never grows (`OverflowList`): what does not fit is cut from the end, whole, counted after the
// line and made inert. jsdom lays nothing out, so a test says where each item sits (`offsetTop`, `offsetHeight`) and
// checks what the line makes of it. That the items really wrap and are clipped is seen in a browser, on the showcase
// (section «OverflowList»).
import { act, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { OverflowList, WordsProvider, type OverflowListProps } from '../src'
import { classes } from './helpers'

const LABELS = ['Today 09:00', 'Every Monday', 'Kitchen', 'Home', 'Calls', 'Errands']

const ownTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!
const ownHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!

/** Lays the items out as a browser would: each one named at its top (20px tall), or at its top with its height. */
function lay(rows: Record<string, number | { top: number; height: number }>) {
  const of = (el: HTMLElement) => rows[el.textContent ?? '']
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      const row = of(this)
      return row === undefined ? 0 : typeof row === 'number' ? row : row.top
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      const row = of(this)
      return row === undefined ? 0 : typeof row === 'number' ? 20 : row.height
    },
  })
}

/** The first `fit` labels on the first row, the others on the rows below it. */
const fitting = (fit: number, labels: readonly string[] = LABELS) => Object.fromEntries(labels.map((label, at) => [label, at < fit ? 0 : 28 * Math.ceil((at - fit + 1) / fit)]))

function line(labels: readonly string[] = LABELS, props: Omit<OverflowListProps, 'children'> = {}) {
  return (
    <OverflowList className="h-5 gap-x-2" {...props}>
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </OverflowList>
  )
}

const box = () => document.querySelector<HTMLElement>('[data-slot="overflow-list-items"]')!
const items = () => Array.from(box().children) as HTMLElement[]
const cue = () => document.querySelector<HTMLElement>('[data-slot="overflow-list-cue"]')
const cutOnes = () => items().filter((item) => item.hasAttribute('inert')).map((item) => item.textContent)

afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', ownTop)
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', ownHeight)
  Reflect.deleteProperty(document, 'fonts')
  vi.unstubAllGlobals()
})

describe('the line', () => {
  test('without layout nothing is cut: every item is there, none inert, and no cue', () => {
    render(line())
    expect(items().map((item) => item.textContent)).toEqual(LABELS)
    expect(cutOnes()).toEqual([])
    expect(items().some((item) => item.hasAttribute('data-cut'))).toBe(false)
    expect(cue()).toBeNull()
  })

  test('one row of the caller\'s height that wraps and clips (not a scroll box), the cue after it, outside it', () => {
    lay(fitting(2))
    render(line())
    for (const name of ['h-5', 'gap-x-2', 'flex', 'flex-wrap', 'content-start', 'overflow-clip', 'min-w-0', '[&>[data-cut]]:invisible']) expect(classes(box()), name).toContain(name)
    expect(classes(box())).not.toContain('overflow-hidden')
    expect(box().nextElementSibling).toBe(cue())
    expect(box().contains(cue())).toBe(false)
  })

  test('the items on the rows below the first are the cut ones: the last of them, inert and marked, and «+N» counts them', () => {
    lay(fitting(2))
    render(line())
    expect(cutOnes()).toEqual(LABELS.slice(2))
    expect(items().filter((item) => item.hasAttribute('data-cut')).map((item) => item.textContent)).toEqual(LABELS.slice(2))
    const shown = cue()!.querySelector('[aria-hidden="true"]')!
    expect(shown.textContent).toBe('+4')
    expect(cue()!.className).toContain('tabular-nums')
    expect(cue()!.className).toContain('text-ink-mute')
    expect(cue()!.className).toContain('text-xs')
  })

  test('the first item is never cut, also alone on its row, and the rows are read from where it sits', () => {
    // A long first item fills the first row (12px of padding above it): every other one is below.
    lay({ ...Object.fromEntries(LABELS.map((label) => [label, 44])), [LABELS[0]!]: { top: 12, height: 20 } })
    render(line())
    expect(cutOnes()).toEqual(LABELS.slice(1))
    expect(items()[0]!.hasAttribute('inert')).toBe(false)
    expect(cue()!.querySelector('[aria-hidden="true"]')!.textContent).toBe('+5')
  })

  test('a shorter item beside a taller first one sits lower on the same row: it is not cut', () => {
    // A 24px label first, then a 14px text centred on its row; the third item is on the next row.
    lay({ [LABELS[0]!]: { top: 0, height: 24 }, [LABELS[1]!]: { top: 5, height: 14 }, [LABELS[2]!]: { top: 32, height: 24 } })
    render(line(LABELS.slice(0, 3)))
    expect(cutOnes()).toEqual([LABELS[2]])
  })
})

describe('when it measures again', () => {
  test('other items are measured as they are drawn, and an item that fits again is given back', () => {
    lay(fitting(2))
    const { rerender } = render(line())
    expect(cue()!.textContent).toContain('+4')
    rerender(line(LABELS.slice(0, 3)))
    expect(cutOnes()).toEqual([LABELS[2]])
    expect(cue()!.textContent).toContain('+1')
    lay({})
    rerender(line(LABELS.slice(0, 3)))
    expect(cutOnes()).toEqual([])
    expect(items()[2]!.hasAttribute('data-cut')).toBe(false)
    expect(cue()).toBeNull()
  })

  test('the box is measured again when it changes size, and when the fonts are ready', async () => {
    let resized: (() => void) | undefined
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        resized = callback
      }
      observe() {}
      disconnect() {}
    })
    let ready: () => void = () => {}
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>((done) => (ready = () => done())) } })
    render(line())
    expect(cue()).toBeNull()
    // The box is narrower: three fit.
    lay(fitting(3))
    act(() => resized!())
    expect(cutOnes()).toEqual(LABELS.slice(3))
    // The font arrives and is wider: one fits.
    lay(fitting(1))
    await act(async () => {
      ready()
      await Promise.resolve()
    })
    expect(cutOnes()).toEqual(LABELS.slice(1))
  })

  test('without ResizeObserver nothing throws, and the line is still measured when drawn', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    lay(fitting(2))
    expect(() => render(line())).not.toThrow()
    expect(cutOnes()).toEqual(LABELS.slice(2))
  })
})

describe('for the keyboard and screen readers', () => {
  test('a cut control is inert, so focus never lands on it unseen; the cue is read, as «4 more»', () => {
    lay(fitting(2))
    render(
      <OverflowList className="h-5 gap-x-2">
        {LABELS.map((label) => (
          <button key={label} type="button">
            {label}
          </button>
        ))}
      </OverflowList>,
    )
    const buttons = Array.from(box().querySelectorAll('button'))
    expect(buttons.filter((button) => button.hasAttribute('inert')).map((button) => button.textContent)).toEqual(LABELS.slice(2))
    expect(buttons.slice(0, 2).every((button) => !button.hasAttribute('inert'))).toBe(true)
    expect(cue()!.hasAttribute('aria-hidden')).toBe(false)
    expect(screen.getByText('4 more').className).toContain('sr-only')
  })

  test('the word is the app\'s, in its language', () => {
    lay(fitting(4))
    render(<WordsProvider words={{ list: { more: (count) => `altri ${count}` } }}>{line()}</WordsProvider>)
    expect(screen.getByText('altri 2')).toBeTruthy()
  })

  test('a cue of the app\'s own takes the count, in place of «+N»', () => {
    lay(fitting(2))
    render(line(LABELS, { cue: (hidden) => <button type="button">Show {hidden} more</button> }))
    expect(screen.getByRole('button', { name: 'Show 4 more' })).toBeTruthy()
    expect(cue()!.querySelector('.sr-only')).toBeNull()
    expect(cue()!.className).not.toContain('text-ink-mute')
  })
})

describe('the items stay the caller\'s', () => {
  test('in their order, with no box around each, and the same elements when they move (keys)', () => {
    const { rerender } = render(line())
    const before = items()
    expect(before.every((item) => item.parentElement === box())).toBe(true)
    rerender(line([...LABELS].reverse()))
    expect(items().map((item) => item.textContent)).toEqual([...LABELS].reverse())
    expect(items()[0]).toBe(before[LABELS.length - 1])
  })

  test('on a server: the items and no cue, without an error', () => {
    const html = renderToStaticMarkup(line())
    for (const label of LABELS) expect(html).toContain(label)
    expect(html).not.toContain('overflow-list-cue')
  })
})
