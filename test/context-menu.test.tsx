// A menu on a thing (`ContextMenu`): the right button opens it at the point, the Menu key and Shift+F10 under the thing
// with the focus, the entries are read when it opens, Escape gives the focus back, a text field keeps the system's menu.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ContextMenu, type ContextMenuEntry } from '../src/components'
import { WordsProvider } from '../src'
import { DEFAULT_WORDS } from '../src/words'

const menu = () => screen.queryByRole('menu')
const open = async (target: Element, init: MouseEventInit = { clientX: 40, clientY: 60 }) => {
  fireEvent.contextMenu(target, init)
  return waitFor(() => expect(menu()).not.toBeNull())
}

test('the right button opens a menu with its entries: icons or empty slots, a hint, a heading and a destructive row', async () => {
  const run = vi.fn()
  const items: ContextMenuEntry[] = [
    { heading: 'Session' },
    { label: 'Rename', icon: 'rename', shortcut: 'F2', onSelect: run },
    { label: 'Duplicate', onSelect: () => {} },
    'separator',
    { label: 'Delete', icon: 'delete', destructive: true, onSelect: () => {} },
  ]
  render(
    <ContextMenu items={items}>
      <button type="button">Row</button>
    </ContextMenu>,
  )
  expect(menu()).toBeNull()
  await open(screen.getByRole('button', { name: 'Row' }))
  expect(menu()!.getAttribute('aria-label')).toBe('Actions')
  // At the point pressed (the card is placed against a zero-size box there).
  const pos = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-positioner"]')!
  expect([pos.style.getPropertyValue('--x'), pos.style.getPropertyValue('--y')]).toEqual(['40px', '60px'])
  const rows = screen.getAllByRole('menuitem')
  expect(rows.map((row) => row.textContent)).toEqual(['RenameF2', 'Duplicate', 'Delete'])
  // R6: every entry has an icon or its slot.
  for (const row of rows) expect(row.querySelector('[data-icon]'), row.textContent ?? '').not.toBeNull()
  expect(rows[0]!.querySelector('[data-icon="rename"]')).not.toBeNull()
  expect(rows[1]!.querySelector('[data-icon-empty]')).not.toBeNull()
  expect(rows[2]!.getAttribute('data-variant')).toBe('destructive')
  expect(document.querySelector('[data-slot="dropdown-menu-label"]')!.textContent).toBe('Session')
  expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).not.toBeNull()
})

test('it wraps without a box of its own, and the menu is a portal outside it', async () => {
  render(
    <ContextMenu items={[{ label: 'Open', onSelect: () => {} }]}>
      <p>Thing</p>
    </ContextMenu>,
  )
  const wrapper = document.querySelector('[data-slot="context-menu"]')!
  expect(wrapper.className).toBe('contents')
  expect(wrapper.querySelector('p')!.textContent).toBe('Thing')
  await open(screen.getByText('Thing'))
  expect(wrapper.contains(menu())).toBe(false)
})

test('choosing an entry runs it and closes the menu; the menu is told it opened and closed', async () => {
  const run = vi.fn()
  const changed = vi.fn()
  render(
    <ContextMenu items={[{ label: 'Rename', onSelect: run }]} onOpenChange={changed}>
      <button type="button">Row</button>
    </ContextMenu>,
  )
  await open(screen.getByRole('button', { name: 'Row' }))
  expect(changed).toHaveBeenLastCalledWith(true)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
  expect(run).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(menu()).toBeNull())
  expect(changed).toHaveBeenLastCalledWith(false)
})

test('the entries are read when the menu opens, so it says what the thing is now', async () => {
  let state = 'Pin'
  const items = vi.fn((_target: Element) => [{ label: state, onSelect: () => {} }] satisfies ContextMenuEntry[])
  render(
    <ContextMenu items={items}>
      <button type="button">Row</button>
    </ContextMenu>,
  )
  expect(items).not.toHaveBeenCalled()
  const row = screen.getByRole('button', { name: 'Row' })
  await open(row)
  expect(screen.getByRole('menuitem').textContent).toBe('Pin')
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  await waitFor(() => expect(menu()).toBeNull())
  state = 'Unpin'
  await open(row)
  expect(screen.getByRole('menuitem').textContent).toBe('Unpin')
  // It is told the element that was pressed: the row, not the box around it.
  expect(items).toHaveBeenLastCalledWith(row)
})

test('one menu around a whole list reads which row it is on from the element pressed, with the mouse or the key', async () => {
  const items = (target: Element): ContextMenuEntry[] => [{ label: `Open ${target.closest('li')!.textContent}`, onSelect: () => {} }]
  render(
    <ContextMenu items={items}>
      <ul>
        <li>
          <button type="button">One</button>
        </li>
        <li>
          <button type="button">Two</button>
        </li>
      </ul>
    </ContextMenu>,
  )
  await open(screen.getByRole('button', { name: 'Two' }))
  expect(screen.getByRole('menuitem').textContent).toBe('Open Two')
  fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' })
  await waitFor(() => expect(menu()).toBeNull())
  const one = screen.getByRole('button', { name: 'One' })
  one.focus()
  fireEvent.keyDown(one, { key: 'ContextMenu' })
  await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeNull())
  expect(screen.getByRole('menuitem').textContent).toBe('Open One')
})

test('the Menu key and Shift+F10 open it for the thing with the focus; Escape closes it and gives the focus back', async () => {
  render(
    <ContextMenu items={[{ label: 'Open', onSelect: () => {} }]}>
      <button type="button">Row</button>
    </ContextMenu>,
  )
  const row = screen.getByRole('button', { name: 'Row' })
  for (const init of [{ key: 'ContextMenu' }, { key: 'F10', shiftKey: true }]) {
    row.focus()
    fireEvent.keyDown(row, init)
    await waitFor(() => expect(menu()).not.toBeNull())
    // The system's own event after the key does not move or double it.
    fireEvent.contextMenu(row)
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' })
    await waitFor(() => expect(menu()).toBeNull())
    expect(document.activeElement).toBe(row)
  }
  // F10 alone, or with Control, is not the menu.
  fireEvent.keyDown(row, { key: 'F10' })
  fireEvent.keyDown(row, { key: 'F10', shiftKey: true, ctrlKey: true })
  expect(menu()).toBeNull()
})

test('the arrows move through the entries and Enter chooses', async () => {
  const second = vi.fn()
  render(
    <ContextMenu
      items={[
        { label: 'First', onSelect: () => {} },
        { label: 'Second', onSelect: second },
      ]}
    >
      <button type="button">Row</button>
    </ContextMenu>,
  )
  const row = screen.getByRole('button', { name: 'Row' })
  row.focus()
  fireEvent.keyDown(row, { key: 'ContextMenu' })
  await waitFor(() => expect(menu()).not.toBeNull())
  const rows = screen.getAllByRole('menuitem')
  const card = menu()!
  await act(async () => card.focus())
  fireEvent.keyDown(card, { key: 'ArrowDown' })
  await waitFor(() => expect(rows[0]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(card, { key: 'ArrowDown' })
  await waitFor(() => expect(rows[1]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(card, { key: 'Enter' })
  await waitFor(() => expect(second).toHaveBeenCalled())
})

test('a text field keeps the system menu, a disabled menu opens nothing, an empty list opens nothing', async () => {
  render(
    <>
      <ContextMenu items={[{ label: 'Open', onSelect: () => {} }]}>
        <input aria-label="Name" />
        <textarea aria-label="Notes" />
        <div contentEditable suppressContentEditableWarning aria-label="Rich" />
      </ContextMenu>
      <ContextMenu items={[{ label: 'Open', onSelect: () => {} }]} disabled>
        <button type="button">Off</button>
      </ContextMenu>
      <ContextMenu items={[]}>
        <button type="button">Empty</button>
      </ContextMenu>
    </>,
  )
  for (const target of [screen.getByLabelText('Name'), screen.getByLabelText('Notes')]) {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    expect(event.defaultPrevented, target.getAttribute('aria-label') ?? '').toBe(false)
  }
  const field = screen.getByLabelText('Name')
  fireEvent.keyDown(field, { key: 'ContextMenu' })
  fireEvent.contextMenu(screen.getByRole('button', { name: 'Off' }))
  fireEvent.contextMenu(screen.getByRole('button', { name: 'Empty' }))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(menu()).toBeNull()
})

test('a menu inside a menu is the inner one: the outer leaves the press that was taken', async () => {
  render(
    <ContextMenu items={[{ label: 'Outer action', onSelect: () => {} }]} label="Outer">
      <section>
        <ContextMenu items={[{ label: 'Inner action', onSelect: () => {} }]} label="Inner">
          <button type="button">Inner row</button>
        </ContextMenu>
      </section>
    </ContextMenu>,
  )
  await open(screen.getByRole('button', { name: 'Inner row' }))
  expect(screen.getAllByRole('menu')).toHaveLength(1)
  expect(menu()!.getAttribute('aria-label')).toBe('Inner')
})

test('a submenu opens beside its row, with its own entries', async () => {
  render(
    <ContextMenu
      items={[
        { label: 'Move to', icon: 'move', items: [{ label: 'Inbox', icon: 'inbox', onSelect: () => {} }] },
        { label: 'Archive', icon: 'archive', onSelect: () => {} },
      ]}
    >
      <button type="button">Row</button>
    </ContextMenu>,
  )
  await open(screen.getByRole('button', { name: 'Row' }))
  const trigger = screen.getByRole('menuitem', { name: 'Move to' })
  expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
  expect(trigger.querySelector('[data-icon="move"]')).not.toBeNull()
})

test('its name is the app\'s word, or the label given', async () => {
  render(
    <WordsProvider words={{ ...DEFAULT_WORDS, contextMenu: { label: 'Azioni' } }}>
      <ContextMenu items={[{ label: 'Apri', onSelect: () => {} }]}>
        <button type="button">Riga</button>
      </ContextMenu>
      <ContextMenu items={[{ label: 'Apri', onSelect: () => {} }]} label="Azioni della sessione">
        <button type="button">Sessione</button>
      </ContextMenu>
    </WordsProvider>,
  )
  await open(screen.getByRole('button', { name: 'Riga' }))
  expect(menu()!.getAttribute('aria-label')).toBe('Azioni')
  fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' })
  await waitFor(() => expect(menu()).toBeNull())
  await open(screen.getByRole('button', { name: 'Sessione' }))
  expect(menu()!.getAttribute('aria-label')).toBe('Azioni della sessione')
})
