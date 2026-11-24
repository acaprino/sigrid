// The list of things (`ItemList`, `ItemRow`): rows with a title, a line under it and a fact at the end, the chosen one
// with the selection tint (R1) and the unread ones with the accent dot (R2).
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ItemList, ItemRow } from '../src/components'

test('a row is a button with its title, its line and its fact; the chosen one is current, with the tint and the accent bar', () => {
  const chosen = vi.fn()
  render(
    <ItemList aria-label="Messages">
      <ItemRow title="Kitchen quote" description="Marta Riva" meta="09:42" current onClick={chosen} />
      <ItemRow title="Receipt" description="City" meta="08:15" />
    </ItemList>,
  )
  expect(screen.getByRole('list', { name: 'Messages' })).toBeTruthy()
  const row = screen.getByRole('button', { name: /Kitchen quote/ })
  expect(row.textContent).toBe('Kitchen quoteMarta Riva09:42')
  expect(row.getAttribute('aria-current')).toBe('true')
  expect(row.className).toContain('aria-[current=true]:bg-selected')
  expect(row.className).toContain('aria-[current=true]:before:bg-primary')
  expect(screen.getByRole('button', { name: /Receipt/ }).hasAttribute('aria-current')).toBe(false)
  fireEvent.click(row)
  expect(chosen).toHaveBeenCalledTimes(1)
})

test('an unread row has the accent dot, a stronger title and says so; a read one keeps the dot\'s room; a list without the state keeps none', () => {
  render(
    <ItemList aria-label="Messages">
      <ItemRow title="New" unread />
      <ItemRow title="Old" unread={false} />
      <ItemRow title="Plain" />
    </ItemList>,
  )
  const fresh = screen.getByRole('button', { name: /^Unread, ?New$/ })
  expect(fresh.querySelector('[data-slot="item-row-unread"] [aria-hidden]')?.className).toContain('bg-primary')
  expect(fresh.querySelector('[data-slot="item-row-title"]')?.className).toContain('font-semibold')
  const old = screen.getByRole('button', { name: 'Old' })
  expect(old.querySelector('[data-slot="item-row-unread"]')?.childElementCount).toBe(0)
  expect(screen.getByRole('button', { name: 'Plain' }).querySelector('[data-slot="item-row-unread"]')).toBeNull()
})

test('with an address a row is a link; disabled it is a button that takes no press', () => {
  render(
    <ItemList aria-label="Files">
      <ItemRow title="Report" href="/report" />
      <ItemRow title="Locked" href="/locked" disabled />
    </ItemList>,
  )
  expect(screen.getByRole('link', { name: 'Report' }).getAttribute('href')).toBe('/report')
  expect((screen.getByRole('button', { name: 'Locked' }) as HTMLButtonElement).disabled).toBe(true)
})
