// The hint of an icon-only button that opens a menu or a popover is given to the trigger (`hint`), and the button keeps
// one id that both find it by: the menu is named by its button and the focus can go back to it. A `""` choice of a radio
// group (`No filter`) is a choice like the others, by pointer and by keyboard.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../src/primitives'

test("a menu's hint keeps the button's id, so the open menu is named by its button", async () => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger asChild hint="Sort">
        <Button aria-label="Sort">S</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value="a">
          <DropdownMenuRadioItem value="a">By name</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
  const button = screen.getByRole('button', { name: 'Sort' })
  // The hint is there: the pointer resting on the button shows it.
  fireEvent.pointerMove(button, { pointerType: 'mouse' })
  await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe('Sort'), { timeout: 2000 })
  fireEvent.pointerLeave(button, { pointerType: 'mouse' })
  fireEvent.click(button)
  const menu = await screen.findByRole('menu')
  expect(menu.getAttribute('aria-labelledby')).toBe(button.id)
  expect(document.getElementById(button.id)).toBe(button)
  expect(button.getAttribute('aria-expanded')).toBe('true')
})

test("a popover's hint keeps the button's id, so Esc gives the focus back to the button", async () => {
  render(
    <Popover>
      <PopoverTrigger asChild hint="Notifications">
        <Button aria-label="Notifications">N</Button>
      </PopoverTrigger>
      <PopoverContent>Nothing new</PopoverContent>
    </Popover>,
  )
  const button = screen.getByRole('button', { name: 'Notifications' })
  await act(async () => button.focus())
  fireEvent.click(button)
  const card = await screen.findByText('Nothing new')
  expect(button.getAttribute('aria-expanded')).toBe('true')
  expect(document.getElementById(button.id)).toBe(button)
  fireEvent.keyDown(card, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByText('Nothing new')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(button))
})

test('the empty choice of a radio group is reached by the arrows and chosen with Enter', async () => {
  const onValueChange = vi.fn()
  render(
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Filter</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value="@home" onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="">Clear filter</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="@home">@home</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="@work">@work</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  const menu = await screen.findByRole('menu')
  const rows = screen.getAllByRole('menuitemradio')
  expect(rows.map((row) => row.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
  await act(async () => menu.focus())
  fireEvent.keyDown(menu, { key: 'Home' })
  await waitFor(() => expect(rows[0]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  await waitFor(() => expect(rows[1]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  await waitFor(() => expect(rows[2]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(menu, { key: 'Home' })
  await waitFor(() => expect(rows[0]!.hasAttribute('data-highlighted')).toBe(true))
  fireEvent.keyDown(menu, { key: 'Enter' })
  await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(''))
})
