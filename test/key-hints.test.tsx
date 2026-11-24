// The keys that work now, in the window's foot (`KeyHints`): the named commands that have a key and can be done now,
// in the order named, each key as plain text and its name; one that cannot be done now leaves the list and comes back;
// the list is hidden on a phone.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { CommandsProvider, KeyHints, PALETTE_COMMAND, useCommand } from '../src/assemblies'

function Detail() {
  const [open, setOpen] = useState(false)
  useCommand({ id: 'close', label: 'Close the detail', keys: 'Escape', when: open, run: () => setOpen(false) })
  useCommand({ id: 'search', label: 'Search in this view', keys: 'Ctrl+F', run: () => {} })
  useCommand({ id: 'logical', label: 'Logical view', run: () => {} })
  return (
    <button type="button" onClick={() => setOpen(true)}>
      Open
    </button>
  )
}

test('the named keys that work now, in the order named, as plain text with their names; hidden on a phone', () => {
  render(
    <CommandsProvider>
      <Detail />
      <KeyHints ids={[PALETTE_COMMAND, 'search', 'close', 'logical', 'nowhere']} />
    </CommandsProvider>,
  )
  const list = screen.getByRole('list', { name: 'Keys' })
  // `logical` has no key and `nowhere` is not declared: neither is named; `close` cannot be done yet.
  expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Ctrl KCommands', 'Ctrl FSearch in this view'])
  expect(list.querySelector('kbd')?.textContent).toBe('Ctrl K')
  expect(list.className).toContain('max-md:pointer-coarse:hidden')
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Ctrl KCommands', 'Ctrl FSearch in this view', 'EscapeClose the detail'])
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Ctrl KCommands', 'Ctrl FSearch in this view'])
})

test('with nothing to name it draws nothing, and its name can be the app\'s', () => {
  const { container, rerender } = render(
    <CommandsProvider palette={false}>
      <KeyHints ids={[PALETTE_COMMAND]} />
    </CommandsProvider>,
  )
  expect(container.querySelector('[data-slot="key-hints"]')).toBeNull()
  rerender(
    <CommandsProvider>
      <KeyHints ids={[PALETTE_COMMAND]} aria-label="Tasti" />
    </CommandsProvider>,
  )
  expect(screen.getByRole('list', { name: 'Tasti' })).toBeTruthy()
})

test('a key that is not a command of the registry, such as the frame\'s F6, is named as it is given', () => {
  render(
    <CommandsProvider>
      <KeyHints ids={[PALETTE_COMMAND, { keys: 'F6', label: 'Next region' }]} />
    </CommandsProvider>,
  )
  expect([...screen.getByRole('list', { name: 'Keys' }).querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Ctrl KCommands', 'F6Next region'])
})
