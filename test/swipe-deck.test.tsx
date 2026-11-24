// `SwipeDeck`: a pile decided one card at a time. The three ways to decide (the two buttons, the arrows with the card
// in focus, a drag past the mark) are the same decision; the app holds the cards and takes the decided one out; the
// next card takes the focus the decided one had; what is left is said to screen readers after a decision, never
// before; a short drag decides nothing; an empty deck keeps its buttons in place, off.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { SWIPE_DISTANCE_PX, SWIPE_FLICK, SwipeDeck, type SwipeDirection } from '../src'

type Card = { id: string; title: string }
const CARDS: Card[] = [{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }]

function Deck({ onSwipe, keep = false }: { onSwipe: (item: Card, direction: SwipeDirection) => void; keep?: boolean }) {
  const [items, setItems] = useState(CARDS)
  return (
    <SwipeDeck
      label="To review"
      items={items}
      getKey={(item) => item.id}
      getLabel={(item) => item.title}
      leftLabel="Skip"
      rightLabel="Keep"
      empty="All done"
      onSwipe={(item, direction) => {
        onSwipe(item, direction)
        if (!keep) setItems((all) => all.filter((other) => other.id !== item.id))
      }}
    >
      {(item) => <p>{item.title}</p>}
    </SwipeDeck>
  )
}

const click = async (name: string) => act(async () => void fireEvent.click(screen.getByRole('button', { name })))
const status = () => document.querySelector('[data-slot="swipe-deck-status"]')!.textContent

describe('SwipeDeck', () => {
  test('the buttons decide the card on top; what is left is said only after a decision', async () => {
    const onSwipe = vi.fn()
    render(<Deck onSwipe={onSwipe} />)
    expect(screen.getByRole('group', { name: 'First' })).toBeTruthy()
    expect(status()).toBe('')
    await click('Keep')
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[0], 'right')
    expect(screen.getByRole('group', { name: 'Second' })).toBeTruthy()
    expect(status()).toBe('1 card left')
    await click('Skip')
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[1], 'left')
    expect(screen.getByText('All done')).toBeTruthy()
    expect(status()).toBe('No cards left')
    // The buttons stay in their place, off.
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Keep' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Skip' }).disabled).toBe(true)
  })

  test('the arrows decide with the card in focus, and the next card takes the focus', async () => {
    const onSwipe = vi.fn()
    render(<Deck onSwipe={onSwipe} />)
    const first = screen.getByRole('group', { name: 'First' })
    first.focus()
    await act(async () => void fireEvent.keyDown(first, { key: 'ArrowLeft' }))
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[0], 'left')
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Second' }))
  })

  test('a drag past the mark decides; a shorter one puts the card back', async () => {
    const onSwipe = vi.fn()
    render(<Deck onSwipe={onSwipe} />)
    const drag = async (dx: number) => {
      const card = document.querySelector<HTMLElement>('[data-slot="swipe-deck-card"]')!
      fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 100, clientY: 100 })
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 100 + dx, clientY: 100 })
      const toward = card.getAttribute('data-toward')
      await act(async () => void fireEvent.pointerUp(card, { pointerId: 1, clientX: 100 + dx, clientY: 100 }))
      return toward
    }
    // Too near to be a flick, however fast the events come.
    expect(await drag(SWIPE_FLICK.distance - 1)).toBeNull()
    expect(onSwipe).not.toHaveBeenCalled()
    expect(document.querySelector<HTMLElement>('[data-slot="swipe-deck-card"]')!.style.translate).toBe('')
    expect(await drag(-SWIPE_DISTANCE_PX)).toBe('left')
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[0], 'left')
  })

  test('a card the app leaves in stays on top; the card under it is hidden from screen readers and inert', async () => {
    const onSwipe = vi.fn()
    render(<Deck onSwipe={onSwipe} keep />)
    await click('Keep')
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('group', { name: 'First' })).toBeTruthy()
    const under = document.querySelector('[data-slot="swipe-deck-next"]')!
    expect(under.getAttribute('aria-hidden')).toBe('true')
    expect(under.hasAttribute('inert')).toBe(true)
  })
})
