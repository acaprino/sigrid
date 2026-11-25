// Rows of different heights in a long list (`VirtualList variable`) and a long thread of messages that follows the
// latest one (`VirtualConversation`), both of the `./virtual` entry, on TanStack Virtual. jsdom lays nothing out, so
// here a layout is given to it: the box is 400px tall and a row is as tall as its `data-h` says. What is checked is
// which rows are in the page, the room kept for the others, and where the thread stands.
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Message } from '../src/components'
import { VirtualConversation, VirtualList } from '../src/virtual'

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
    // The room of the 997 rows not drawn is their estimate, 40px and the 2px between rows, each.
    expect(list.style.paddingTop).toBe('0px')
    expect(list.style.paddingBottom).toBe(`${997 * 42}px`)
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

  /** The thread as tall as the box, holding `height` px of messages. */
  function holding(height: number) {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => height)
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(() => BOX)
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
    // Each message is measured on its own: 200, 20 and 200px, and the box is full.
    expect(indexes(content)).toEqual([0, 1, 2])
    expect(screen.getAllByRole('article').length).toBe(3)
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
