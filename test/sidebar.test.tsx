// The sidebar (`Sidebar`, `SidebarGroup`): the navigation as groups of rows, shrunk to a rail, filtered by its search
// box, and a drawer on a narrow window. The rows themselves (`NavItem`) are tested in form-and-navigation.test.tsx.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { NavItem, Sidebar, SidebarGroup } from '../src/layout'
import { flush } from './helpers'

afterEach(() => vi.unstubAllGlobals())

function App({ onOpenChange, startCollapsed = false, open = false }: { onOpenChange?: (open: boolean) => void; startCollapsed?: boolean; open?: boolean }) {
  const [collapsed, setCollapsed] = useState(startCollapsed)
  return (
    <Sidebar aria-label="Main" collapsed={collapsed} onCollapsedChange={setCollapsed} open={open} onOpenChange={onOpenChange} search header={<p>Acme</p>} footer={<p>Ada</p>}>
      <SidebarGroup label="Favorites">
        <NavItem icon={<svg />} current>Inbox</NavItem>
        <NavItem icon={<svg />} end={<span>3</span>}>Reports</NavItem>
      </SidebarGroup>
      <SidebarGroup label="Projects" collapsible>
        <NavItem icon={<svg />}>Website</NavItem>
        <NavItem icon={<svg />}>Mobile app</NavItem>
      </SidebarGroup>
      <SidebarGroup label="Archive" collapsible defaultOpen={false}>
        <NavItem icon={<svg />}>Old reports</NavItem>
      </SidebarGroup>
    </Sidebar>
  )
}
const rows = () => screen.queryAllByRole('button').filter((b) => b.getAttribute('data-slot') === 'nav-item' && !b.closest('[hidden]')).map((b) => b.textContent)

test('the sidebar is a named navigation on the sidebar tone, with its groups as named lists', () => {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(within(nav).getByRole('list', { name: 'Favorites' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Inbox' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('button', { name: 'Inbox' }).className).toContain('text-sidebar-ink')
  expect(screen.getByText('Acme')).toBeTruthy()
  expect(screen.getByText('Ada')).toBeTruthy()
})

test('a group that opens and closes: its heading says so, a closed one hides its rows', () => {
  render(<App />)
  const projects = screen.getByRole('button', { name: 'Projects' })
  expect(projects.getAttribute('aria-expanded')).toBe('true')
  // «Favorites» has no arrow: its heading is not a button.
  expect(screen.queryByRole('button', { name: 'Favorites' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Archive' }).getAttribute('aria-expanded')).toBe('false')
  expect(rows()).toEqual(['Inbox', 'Reports3', 'Website', 'Mobile app'])
  fireEvent.click(projects)
  expect(projects.getAttribute('aria-expanded')).toBe('false')
  expect(rows()).toEqual(['Inbox', 'Reports3'])
  fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
  expect(rows()).toEqual(['Inbox', 'Reports3', 'Old reports'])
})

test('the search hides the rows that do not hold the text and the groups left empty, opens the closed ones, and says when nothing is left', () => {
  render(<App />)
  const box = screen.getByRole('searchbox', { name: 'Search the menu' })
  fireEvent.change(box, { target: { value: 'REPORT' } })
  // «Old reports» is in a closed group: a search opens it.
  expect(rows()).toEqual(['Reports3', 'Old reports'])
  expect(screen.getByText('Projects').closest('[data-slot="sidebar-group"]')!.hasAttribute('hidden')).toBe(true)
  expect(screen.queryByRole('status')).toBeNull()
  fireEvent.change(box, { target: { value: 'zzz' } })
  expect(rows()).toEqual([])
  expect(screen.getByRole('status').textContent).toBe('No results')
  fireEvent.change(box, { target: { value: '' } })
  expect(rows()).toEqual(['Inbox', 'Reports3', 'Website', 'Mobile app'])
})

test('shrunk to a rail a row shows its icon alone and keeps its name; headings, search, header and footer go, every group is open', () => {
  render(<App />)
  const toggle = screen.getByRole('button', { name: 'Collapse the sidebar' })
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  // An icon with a hint: no line of text in the column.
  expect(toggle.textContent).toBe('')
  fireEvent.click(toggle)
  expect(document.querySelector('[data-slot="sidebar"]')!.hasAttribute('data-collapsed')).toBe(true)
  // Still named, for screen readers; the count at the end is not shown.
  const inbox = screen.getByRole('button', { name: 'Inbox' })
  expect(inbox.querySelector('[data-slot="nav-item-label"]')!.className).toBe('sr-only')
  expect(screen.getByRole('button', { name: 'Reports' }).textContent).toBe('Reports')
  expect(screen.queryByRole('searchbox')).toBeNull()
  expect(screen.queryByText('Acme')).toBeNull()
  expect(screen.queryByText('Ada')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Projects' })).toBeNull()
  // The group that was closed shows its icon too.
  expect(rows()).toEqual(['Inbox', 'Reports', 'Website', 'Mobile app', 'Old reports'])
  const expand = screen.getByRole('button', { name: 'Expand the sidebar' })
  expect(expand.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(expand)
  expect(screen.getByRole('searchbox')).toBeTruthy()
})

test('without onCollapsedChange there is no button to shrink it', () => {
  render(
    <Sidebar aria-label="Main">
      <SidebarGroup>
        <NavItem>Inbox</NavItem>
      </SidebarGroup>
    </Sidebar>,
  )
  expect(screen.queryByRole('button', { name: 'Collapse the sidebar' })).toBeNull()
  expect(screen.queryByRole('searchbox')).toBeNull()
})

test('on a narrow window it is a drawer: closed it is not on the page, open it is a dialog, and choosing a row closes it', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(width < 860px)', media: query, addEventListener() {}, removeEventListener() {} }))
  const onOpenChange = vi.fn()
  const { rerender } = render(<App onOpenChange={onOpenChange} startCollapsed />)
  await flush()
  expect(screen.queryByRole('navigation')).toBeNull()
  rerender(<App onOpenChange={onOpenChange} startCollapsed open />)
  await flush()
  const dialog = screen.getByRole('dialog', { name: 'Main' })
  // In the drawer it is never a rail, and has no button to shrink it.
  expect(within(dialog).getByRole('searchbox')).toBeTruthy()
  expect(within(dialog).queryByRole('button', { name: /the sidebar$/ })).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Website' }))
  expect(onOpenChange).toHaveBeenCalledWith(false)
})
