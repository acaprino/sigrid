// A choice in a menu runs once, by pointer or by keyboard, also after Ark's own report of it (a microtask later): an
// entry that toggles must not undo itself, a delete must not be sent twice.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../src/primitives'

/** Lets every microtask and the next task run: Ark reports a choice from a microtask. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

function Menu({ run }: { run: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={run}>Delete</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => {}}>Rename</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
  return screen.findByRole('menuitem', { name: 'Delete' })
}

/** Waits until the menu has left the page, so the next one opened is a new one. */
const closed = () => waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

test('a click on an entry runs it once', async () => {
  const run = vi.fn()
  render(<Menu run={run} />)
  fireEvent.click(await openMenu())
  await settle()
  expect(run).toHaveBeenCalledTimes(1)
})

test('two choices one after the other run twice, not four times nor once', async () => {
  const run = vi.fn()
  render(<Menu run={run} />)
  fireEvent.click(await openMenu())
  await settle()
  await closed()
  fireEvent.click(await openMenu())
  await settle()
  expect(run).toHaveBeenCalledTimes(2)
})

test('Enter on the highlighted entry runs it once', async () => {
  const run = vi.fn()
  render(<Menu run={run} />)
  const item = await openMenu()
  const menu = screen.getByRole('menu')
  await act(async () => menu.focus())
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  await waitFor(() => expect(item.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(menu, { key: 'Enter' })
  await waitFor(() => expect(run).toHaveBeenCalled())
  await settle()
  expect(run).toHaveBeenCalledTimes(1)
})
