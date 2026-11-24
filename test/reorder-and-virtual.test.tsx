// A list put in order by hand (`ReorderList`, the `./reorder` entry, on dnd-kit) and a long list of which only
// the rows in sight are drawn (`VirtualList`, the `./virtual` entry, on TanStack Virtual). jsdom lays nothing out, so
// the dragging itself and the rows in sight are checked in a browser, on the showcase; here: what they are for
// screen readers, their words, and the order a move gives.
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { ItemRow } from '../src/components'
import { ReorderList, moveItem } from '../src/reorder'
import { VirtualList } from '../src/virtual'

const COLUMNS = [
  { id: 'todo', name: 'To do' },
  { id: 'doing', name: 'Doing' },
  { id: 'done', name: 'Done' },
]

test('each row of a list put in order by hand has a handle named after it, with the way to use it from the keyboard', () => {
  render(
    <ReorderList aria-label="Lanes" items={COLUMNS} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={() => {}}>
      {(lane) => <span>{lane.name}</span>}
    </ReorderList>,
  )
  const list = screen.getByRole('list', { name: 'Lanes' })
  expect(Array.from(list.children).map((row) => row.textContent)).toEqual(['To do', 'Doing', 'Done'])
  const handle = screen.getByRole('button', { name: 'Move Doing' })
  expect(handle.getAttribute('aria-roledescription')).toBe('handle to move')
  // The instructions are in the page once, and each handle points at them.
  const instructions = document.getElementById(handle.getAttribute('aria-describedby')!)
  expect(instructions!.textContent).toBe('Press Space to take it, the arrows to move it, Space to put it down, Escape to put it back.')
})

test('the words of a list put in order by hand are the app\'s', () => {
  render(
    <WordsProvider words={{ reorder: { handle: (item) => `Sposta ${item}`, instructions: 'Spazio per prendere, frecce per spostare.' } }}>
      <ReorderList aria-label="Colonne" items={COLUMNS} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={() => {}}>
        {(lane) => lane.name}
      </ReorderList>
    </WordsProvider>,
  )
  const handle = screen.getByRole('button', { name: 'Sposta To do' })
  expect(document.getElementById(handle.getAttribute('aria-describedby')!)!.textContent).toBe('Spazio per prendere, frecce per spostare.')
})

// A drag itself needs a layout: it is driven in a browser. Here, only that a press alone asks for nothing.
test('a press on a handle asks for no new order', () => {
  const reordered = vi.fn()
  render(
    <ReorderList aria-label="Lanes" items={COLUMNS} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={reordered}>
      {(lane) => lane.name}
    </ReorderList>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Move To do' }))
  expect(reordered).not.toHaveBeenCalled()
})

test('moveItem gives a new list with the item at its new place, and leaves the old one as it was', () => {
  const before = ['a', 'b', 'c', 'd'] as const
  expect(moveItem(before, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  expect(moveItem(before, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  expect(before).toEqual(['a', 'b', 'c', 'd'])
})

test('a virtual list is a list with a name, and does not put ten thousand rows in the page', () => {
  render(
    <VirtualList aria-label="Messages" count={10_000} className="h-96">
      {(index) => <ItemRow title={`Message ${index + 1}`} />}
    </VirtualList>,
  )
  const list = screen.getByRole('list', { name: 'Messages' })
  expect(list.parentElement!.getAttribute('data-slot')).toBe('virtual-list')
  // jsdom gives the box no height, so no row is in sight here: the rows drawn at a height and the room kept for the
  // others are checked in a browser, on the showcase (section «Virtual list»).
  expect(list.children.length).toBeLessThan(60)
})
