// A row of the list of things that carries one control beside its button (`ItemRow control`: a task one ticks and
// opens), and the facts of a row (`facts`) and its title on two lines (`wrapTitle`).
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Checkbox } from '../src/primitives'
import { ItemList, ItemRow } from '../src/components'

function Task({ current = false, side, onOpen = () => {}, onTick = () => {} }: { current?: boolean; side?: 'start' | 'end'; onOpen?: () => void; onTick?: (checked: boolean) => void }) {
  return (
    <ItemList aria-label="Today">
      <ItemRow
        title="Pay the rent"
        description="Home"
        meta="Today"
        unread
        current={current}
        controlSide={side}
        onClick={onOpen}
        control={<Checkbox aria-label="Complete «Pay the rent»" checked={false} onCheckedChange={(checked) => onTick(checked === true)} />}
      />
    </ItemList>
  )
}

test('the control and the row are two tab stops with their own names, the control first, side by side in one list item', () => {
  render(<Task />)
  const box = screen.getByRole('checkbox', { name: 'Complete «Pay the rent»' })
  const row = screen.getByRole('button', { name: /Pay the rent/ })
  // Both take the focus from Tab, the box first (the order of the page); the row is a real button, so Enter and
  // Space open it (the browser's own; checked in a browser on the showcase).
  expect(box.tabIndex).toBe(0)
  expect(row.tagName).toBe('BUTTON')
  expect(row.tabIndex).toBe(0)
  expect(box.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // Not a button in a button: the control is beside the row's button, in the same list item.
  expect(row.contains(box)).toBe(false)
  expect(row.closest('li')?.contains(box)).toBe(true)
  box.focus()
  expect(document.activeElement).toBe(box)
  row.focus()
  expect(document.activeElement).toBe(row)
})

test('a press on the control is the control\'s and never opens the row', () => {
  const opened = vi.fn()
  const ticked = vi.fn()
  render(<Task onOpen={opened} onTick={ticked} />)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(ticked).toHaveBeenCalledTimes(1)
  expect(opened).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Pay the rent/ }))
  expect(opened).toHaveBeenCalledTimes(1)
})

test('the row keeps what ItemRow does: the chosen look on the whole item, aria-current on the button, the unread mark, its two lines and its fact, 44px with a finger', () => {
  render(<Task current />)
  const row = screen.getByRole('button', { name: /Pay the rent/ })
  expect(row.getAttribute('aria-current')).toBe('true')
  expect(row.textContent).toBe('Unread, Pay the rentHomeToday')
  expect(row.className).toContain('focus-visible:outline-ring')
  const item = row.closest('li')!
  expect(item.getAttribute('data-slot')).toBe('item-row')
  expect(item.hasAttribute('data-current')).toBe(true)
  // The tint, its ink and the accent bar at its start: on the list item, so the control sits inside them.
  for (const part of ['data-current:bg-selected', 'data-current:text-selected-ink', 'data-current:before:bg-primary', 'hover:bg-selected/60', 'pointer-coarse:min-h-11', 'min-h-(--row-height)']) {
    expect(item.className).toContain(part)
  }
  expect(row.querySelector('[data-slot="item-row-title"]')?.className).toContain('font-semibold')
})

test('a row not chosen has no chosen mark; the control goes at the end when asked', () => {
  render(<Task side="end" />)
  const item = screen.getByRole('button', { name: /Pay the rent/ }).closest('li')!
  expect(item.hasAttribute('data-current')).toBe(false)
  expect(item.getAttribute('data-control')).toBe('end')
  expect(item.lastElementChild?.getAttribute('data-slot')).toBe('item-row-control')
})

test('a row without a control is the button itself, as before', () => {
  render(
    <ItemList aria-label="Mail">
      <ItemRow title="Receipt" />
    </ItemList>,
  )
  const row = screen.getByRole('button', { name: 'Receipt' })
  expect(row.getAttribute('data-slot')).toBe('item-row')
  expect(row.parentElement?.tagName).toBe('LI')
})

test('facts: side by side under the title, wrapping; a colour is a dot, today is in the accent but not on the chosen row, a priority is stronger', () => {
  const { rerender } = render(
    <ItemList aria-label="Today">
      <ItemRow title="Read the contract" facts={[{ text: '@home', color: '#297abc' }, { text: 'Today', tone: 'accent' }, { text: '1/3', numeric: true }, { text: 'P1', tone: 'strong' }]} />
    </ItemList>,
  )
  const line = document.querySelector('[data-slot="item-row-facts"]')!
  expect(line.className).toContain('flex-wrap')
  const facts = Array.from(line.querySelectorAll('[data-slot="item-row-fact"]'))
  expect(facts.map((f) => f.textContent)).toEqual(['@home', 'Today', '1/3', 'P1'])
  expect(facts[0]!.querySelector('[data-slot="dot"]')).not.toBeNull()
  expect(facts[1]!.className).toContain('text-accent')
  expect(facts[2]!.className).toContain('tabular-nums')
  expect(facts[3]!.className).toContain('font-medium')
  rerender(
    <ItemList aria-label="Today">
      <ItemRow current title="Read the contract" facts={[{ text: 'Today', tone: 'accent' }]} />
    </ItemList>,
  )
  expect(document.querySelector('[data-slot="item-row-fact"]')!.className).not.toContain('text-accent')
})

test('wrapTitle lets the title take two lines before it is cut', () => {
  render(
    <ItemList aria-label="Today">
      <ItemRow title="Call the dentist to move the appointment" wrapTitle />
      <ItemRow title="Short" />
    </ItemList>,
  )
  const titles = document.querySelectorAll('[data-slot="item-row-title"]')
  expect(titles[0]!.className).toContain('line-clamp-2')
  expect(titles[1]!.className).toContain('truncate')
})
