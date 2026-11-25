// Rows of different heights in a long list (`VirtualList variable`) and a long thread of messages that follows the
// latest one (`VirtualConversation`), both of the `./virtual` entry, on TanStack Virtual. jsdom lays nothing out, so
// here a layout is given to it: the box is 400px tall and a row is as tall as its `data-h` says. What is checked is
// which rows are in the page, the room kept for the others, and where the thread stands.
import * as React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Message } from '../src/components'
import { VirtualConversation, VirtualList, type VirtualConversationHandle } from '../src/virtual'

const BOX = 400

/** The height of an element: the box holds `BOX`, a row what its `data-h` (or the one inside it) says. */
function heightOf(el: Element): number {
  if (el.matches('[data-slot="virtual-list"], [data-slot="conversation-thread"]')) return BOX
  const own = el.getAttribute('data-h') ?? el.querySelector('[data-h]')?.getAttribute('data-h')
  return own === null || own === undefined ? 0 : Number(own)
}

function layOut() {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return heightOf(this)
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300)
  // The library reads the size of the box it scrolls from its client size.
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return heightOf(this)
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = heightOf(this)
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: height, width: 300, height, toJSON: () => ({}) }
  })
}

afterEach(() => vi.restoreAllMocks())

const tall = (index: number) => (index % 2 === 0 ? 200 : 20)
const indexes = (holder: Element) => Array.from(holder.children).map((row) => Number(row.getAttribute('data-index')))

describe('VirtualList variable', () => {
  const rows = (variable: boolean) => (
    <VirtualList aria-label="Messages" count={1000} estimateSize={40} overscan={0} variable={variable}>
      {(index) => (
        <li key={index} data-h={tall(index)}>
          Row {index}
        </li>
      )}
    </VirtualList>
  )

  test('each row is measured: rows of 200 and 20px fill the box with the three the box holds, not the two the first row would say', () => {
    layOut()
    const { unmount } = render(rows(true))
    const list = screen.getByRole('list', { name: 'Messages' })
    expect(indexes(list)).toEqual([0, 1, 2])
    // The room of the 997 rows not drawn is their estimate, 40px and the 2px between rows, each; but the seven below the
    // three, drawn and measured on the first paint, keep what they measured (680px, not 7 x 40).
    expect(list.style.paddingTop).toBe('0px')
    expect(list.style.paddingBottom).toBe(`${997 * 42 + 400}px`)
    expect(list.parentElement!.hasAttribute('data-variable')).toBe(true)
    unmount()
    // Without it, as before: every row is as tall as the first one.
    render(rows(false))
    const fixed = screen.getByRole('list', { name: 'Messages' })
    expect(Array.from(fixed.children).length).toBe(2)
    expect(fixed.parentElement!.hasAttribute('data-variable')).toBe(false)
  })

  test('a row still says its place in the whole list', () => {
    layOut()
    render(rows(true))
    const list = screen.getByRole('list', { name: 'Messages' })
    expect(Array.from(list.children).map((row) => row.getAttribute('aria-posinset'))).toEqual(['1', '2', '3'])
    expect(list.children[0]!.getAttribute('aria-setsize')).toBe('1000')
  })
})

describe('VirtualConversation', () => {
  const thread = (count: number, props: { busy?: boolean; empty?: string } = {}) => (
    <VirtualConversation label="Chat" count={count} estimateSize={40} overscan={0} rowKey={(index) => `m${index}`} {...props}>
      {(index) => (
        <Message from={index % 2 === 0 ? 'assistant' : 'user'}>
          <span data-h={tall(index)}>Turn {index}</span>
        </Message>
      )}
    </VirtualConversation>
  )
  const log = () => screen.getByRole('log', { name: 'Chat' })
  const latest = () => screen.queryByRole('button', { name: 'Go to the latest message' })

  /** The thread holding `height` px of messages in a box of `BOX`. */
  function holding(height: number) {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => height)
  }
  const place = (top: number) => {
    log().scrollTop = top
    fireEvent.scroll(log())
  }

  test('a log with a name that waits while an answer is written, with only the messages in sight in the page', () => {
    layOut()
    const { rerender } = render(thread(10_000, { busy: true }))
    expect(log().getAttribute('aria-busy')).toBe('true')
    const content = log().querySelector('[data-slot="conversation-content"]')!
    // It opens at the end, and each message is measured on its own (20, 200, 20 and 200px, counted from the last): the box is full.
    expect(indexes(content)).toEqual([9996, 9997, 9998, 9999])
    expect(screen.getAllByRole('article').length).toBe(4)
    rerender(thread(10_000))
    expect(log().hasAttribute('aria-busy')).toBe(false)
  })

  test('with no message it shows what the app gives for an empty thread', () => {
    layOut()
    render(thread(0, { empty: 'Ask anything' }))
    expect(screen.getByText('Ask anything')).toBeTruthy()
  })

  test('it opens at the end, and follows the newest message while the reader is there', () => {
    layOut()
    holding(5000)
    const { rerender } = render(thread(100))
    expect(log().scrollTop).toBe(5000)
    holding(5100)
    rerender(thread(101))
    expect(log().scrollTop).toBe(5100)
    expect(latest()).toBeNull()
  })

  test('once the reader moves up it stops following, goes quiet for screen readers, and a button leads back to the latest message', () => {
    layOut()
    holding(5000)
    const { rerender } = render(thread(100))
    place(100)
    expect(latest()).not.toBeNull()
    expect(log().getAttribute('aria-live')).toBe('off')
    holding(5200)
    rerender(thread(102))
    expect(log().scrollTop).toBe(100)
    fireEvent.click(latest()!)
    expect(log().scrollTop).toBe(5200)
    expect(latest()).toBeNull()
    expect(log().hasAttribute('aria-live')).toBe(false)
    // The button is gone: the focus it had is on the thread.
    expect(document.activeElement).toBe(log())
  })
})

describe('VirtualConversation: where the reader is', () => {
  // Messages of 100px each, by id: a message keeps its height where it moves. The box is 400px, a message is estimated at 40.
  const ids = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => `m${from + i}`)
  const thread = (list: readonly string[], extra: Partial<React.ComponentProps<typeof VirtualConversation>> = {}) => (
    <VirtualConversation label="Chat" count={list.length} estimateSize={40} overscan={0} rowKey={(index) => list[index]!} {...extra}>
      {(index) => (
        <Message from="assistant">
          <span data-h={100}>{list[index]}</span>
        </Message>
      )}
    </VirtualConversation>
  )
  const log = () => screen.getByRole('log', { name: 'Chat' })
  /** The box can scroll as far as the thread is long, and what the library asks it to do is done by hand (jsdom scrolls nothing). */
  function scrollable() {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => 1_000_000)
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      value(this: Element, options: { top?: number }) {
        this.scrollTop = options.top ?? 0
      },
    })
  }
  const place = (top: number) =>
    act(() => {
      log().scrollTop = top
      fireEvent.scroll(log())
    })
  const shown = () => Array.from(log().querySelectorAll('[data-h]')).map((el) => el.textContent)

  test('it opens drawing the last messages at once, not the first ones', () => {
    layOut()
    scrollable()
    render(thread(ids(0, 5000)))
    expect(shown().at(-1)).toBe('m4999')
    expect(shown()).not.toContain('m0')
  })

  test('older messages that come in before the ones in sight do not move what the reader is looking at', async () => {
    layOut()
    scrollable()
    const { rerender } = render(thread(ids(100, 200)))
    place(3000)
    const before = shown()
    expect(before.length).toBeGreaterThan(2)
    rerender(thread(ids(95, 200)))
    // The five new messages are above (40px and the 24 between, each, as estimated): the box moved down by that much, so that
    // the messages in it are the same.
    await waitFor(() => expect(log().scrollTop).toBe(3000 + 5 * 64))
    expect(shown()).toEqual(before)
  })

  test('the app can take the reader to the end, to the start or to a message, and reach the box that scrolls', async () => {
    layOut()
    scrollable()
    const handle = React.createRef<VirtualConversationHandle>()
    const box = React.createRef<HTMLDivElement>()
    render(thread(ids(0, 1000), { ref: handle, containerRef: box }))
    expect(box.current).toBe(log())
    act(() => handle.current!.scrollToStart())
    expect(log().scrollTop).toBe(0)
    act(() => fireEvent.scroll(log()))
    expect(screen.getByRole('button', { name: 'Go to the latest message' })).toBeTruthy()
    expect(shown()[0]).toBe('m0')
    act(() => handle.current!.scrollToIndex(500))
    await waitFor(() => expect(log().scrollTop).toBeGreaterThan(10_000))
    act(() => fireEvent.scroll(log()))
    await waitFor(() => expect(shown()).toContain('m500'))
    // To the end: the thread follows again and the button goes.
    act(() => handle.current!.scrollToEnd())
    expect(log().scrollTop).toBe(1_000_000)
    expect(screen.queryByRole('button', { name: 'Go to the latest message' })).toBeNull()
    expect(log().hasAttribute('aria-live')).toBe(false)
  })
})

describe('the keys of a list that moves', () => {
  test('the library is given one function for the keys, and the app\'s own is read, not called for every row at every paint', () => {
    layOut()
    const calls = { count: 0 }
    const key = (index: number) => {
      calls.count++
      return `k${index}`
    }
    const list = (rowKey: (index: number) => string) => (
      <VirtualList aria-label="Messages" count={5000} estimateSize={40} overscan={0} variable rowKey={rowKey}>
        {(index) => (
          <li key={index} data-h={40}>
            Row {index}
          </li>
        )}
      </VirtualList>
    )
    const { rerender } = render(list(key))
    // Once, to lay the rows out: every key (and again when the rows first drawn are known).
    expect(calls.count).toBeGreaterThanOrEqual(5000)
    rerender(list(key))
    calls.count = 0
    // A new function at every paint, the same keys: the library does not read 5000 keys again.
    rerender(list((index) => key(index)))
    rerender(list((index) => key(index)))
    rerender(list((index) => key(index)))
    expect(calls.count).toBeLessThan(200)
  })
})
