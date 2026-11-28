// The sidebar (`Sidebar`, `SidebarGroup`): the navigation as groups of rows, shrunk to a rail, filtered by its search
// box, and a drawer on a narrow window. The rows themselves (`NavItem`) are tested in form-and-navigation.test.tsx.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { DENSITIES } from '../src/density'
import { AppShell, NavItem, Sidebar, SidebarGroup, SidebarRow } from '../src/layout'
import { AppShellContext } from '../src/layout/app-shell'
import { UnifiedShellContext } from '../src/internal/frame'
import { Count } from '../src/primitives'
import { classes, flush } from './helpers'

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

/* ———— `toggle="head"`: the button at the end of the header's row ———— */

function Headed({ header = true, startCollapsed = false, toggle = 'head' }: { header?: boolean; startCollapsed?: boolean; toggle?: 'foot' | 'head' }) {
  const [collapsed, setCollapsed] = useState(startCollapsed)
  return (
    <Sidebar
      aria-label="Main"
      toggle={toggle}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      header={header ? <SidebarRow end={<Count value={7} label="categories" />}>Categories</SidebarRow> : undefined}
      footer={<p>Ada</p>}
    >
      <SidebarGroup>
        <NavItem icon={<svg />}>Inbox</NavItem>
      </SidebarGroup>
    </Sidebar>
  )
}
const order = () => [...document.querySelector('[data-slot="sidebar"]')!.children].map((el) => el.getAttribute('data-slot'))

test('by default the button is a line of its own at the foot, and the header is as it was', () => {
  render(<Headed toggle="foot" />)
  expect(order()).toEqual(['sidebar-header', 'sidebar-nav', 'sidebar-footer', 'sidebar-collapse'])
  expect(document.querySelector('[data-slot="sidebar-head"]')).toBeNull()
  expect(document.querySelector('[data-slot="sidebar-header"]')!.className).toBe('shrink-0')
  // No pill and no heavier name where the button is at the foot.
  expect(document.querySelector('[data-slot="sidebar"]')!.className).not.toContain('data-slot=count')
  expect(screen.getByRole('button', { name: 'Collapse the sidebar' }).className).toContain('self-end')
})

test('at the head the button is at the end of the header\'s row: the name, its count and the button on one row, and nothing at the foot', () => {
  render(<Headed />)
  expect(order()).toEqual(['sidebar-head', 'sidebar-nav', 'sidebar-footer'])
  const head = document.querySelector('[data-slot="sidebar-head"]')!
  expect([...head.children].map((el) => el.getAttribute('data-slot'))).toEqual(['sidebar-header', 'sidebar-collapse'])
  expect(head.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'items-center']))
  // In the head row the name has a title's weight and its count is the pill of a navigation row, in the sidebar's
  // neutral colours: the same classes `NavItem` has, not a copy.
  const pill = '[&_[data-slot=count]]' + ':'
  for (const cls of ['min-w-5', 'rounded-full', 'px-1.5', 'py-0.5', 'text-center', 'font-semibold', 'bg-sidebar-ink' + '/12', 'text-sidebar-ink']) expect(head.className.split(' '), cls).toContain(pill + cls)
  expect(head.className.split(' ')).toContain('[&_[data-slot=sidebar-row]]' + ':' + 'font-semibold')
  // The header takes the room the button leaves; the title row is a `SidebarRow` with a `Count` at its end.
  const header = head.querySelector('[data-slot="sidebar-header"]')!
  expect(header.className.split(' ')).toEqual(expect.arrayContaining(['min-w-0', 'flex-1']))
  expect(header.querySelector('[data-slot="sidebar-row"]')!.textContent).toBe('Categories7 categories')
  // The same button: its name, its state, an icon with a hint, 44px with a finger.
  const toggle = screen.getByRole('button', { name: 'Collapse the sidebar' })
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(toggle.textContent).toBe('')
  const c = toggle.className.split(' ')
  expect(c).toEqual(expect.arrayContaining(['size-(--control-xs)', 'shrink-0']))
  expect(c.some((cls) => cls.endsWith('size-11'))).toBe(true)
  expect(c.some((cls) => cls.startsWith('self-'))).toBe(false)
})

test('at the head, on the rail the header is gone and the button is alone at the top, in the middle; it widens the sidebar again', () => {
  render(<Headed />)
  fireEvent.click(screen.getByRole('button', { name: 'Collapse the sidebar' }))
  expect(document.querySelector('[data-slot="sidebar"]')!.hasAttribute('data-collapsed')).toBe(true)
  expect(order()).toEqual(['sidebar-head', 'sidebar-nav'])
  const head = document.querySelector('[data-slot="sidebar-head"]')!
  expect([...head.children].map((el) => el.getAttribute('data-slot'))).toEqual(['sidebar-collapse'])
  expect(head.className.split(' ')).toContain('justify-center')
  expect(screen.queryByText('Categories')).toBeNull()
  const expand = screen.getByRole('button', { name: 'Expand the sidebar' })
  expect(expand.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(expand)
  expect(screen.getByText('Categories')).toBeTruthy()
  expect(document.querySelector('[data-slot="sidebar"]')!.hasAttribute('data-collapsed')).toBe(false)
})

test('at the head with no header the row holds the button alone, at its end', () => {
  render(<Headed header={false} />)
  const head = document.querySelector('[data-slot="sidebar-head"]')!
  expect([...head.children].map((el) => el.getAttribute('data-slot'))).toEqual(['sidebar-collapse'])
  expect(head.className.split(' ')).toContain('justify-end')
})

test('where there is no button, the head changes nothing: no onCollapsedChange, and a rail the frame forces', () => {
  const { unmount } = render(
    <Sidebar aria-label="Main" toggle="head" header={<p>Acme</p>}>
      <SidebarGroup>
        <NavItem>Inbox</NavItem>
      </SidebarGroup>
    </Sidebar>,
  )
  expect(order()).toEqual(['sidebar-header', 'sidebar-nav'])
  expect(document.querySelector('[data-slot="sidebar-head"]')).toBeNull()
  expect(document.querySelector('[data-slot="sidebar-collapse"]')).toBeNull()
  unmount()
  render(
    <AppShellContext.Provider value={{ sidebar: 'rail', inspector: 'docked' }}>
      <Sidebar aria-label="Main" toggle="head" onCollapsedChange={() => {}} header={<p>Acme</p>}>
        <SidebarGroup>
          <NavItem icon={<svg />}>Inbox</NavItem>
        </SidebarGroup>
      </Sidebar>
    </AppShellContext.Provider>,
  )
  expect(document.querySelector('[data-slot="sidebar"]')!.hasAttribute('data-collapsed')).toBe(true)
  expect(document.querySelector('[data-slot="sidebar-collapse"]')).toBeNull()
  expect(document.querySelector('[data-slot="sidebar-head"]')).toBeNull()
  expect(order()).toEqual(['sidebar-nav'])
})

test('toggle="head-start" places the toggle before the divider and header at a fixed start offset', () => {
  const onCollapsed = vi.fn()
  const { container, rerender } = render(
    <Sidebar aria-label="Main" toggle="head-start" header={<span>Notes</span>} collapsed={false} onCollapsedChange={onCollapsed}>
      <SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup>
    </Sidebar>,
  )
  const head = container.querySelector('[data-slot="sidebar-head"]')!
  const children = Array.from(head.children)
  expect(children[0]?.tagName).toBe('BUTTON')
  expect(children[0]?.getAttribute('data-slot')).toBe('sidebar-collapse')
  expect(head.querySelector('[data-slot="sidebar-head-divider"]')).not.toBeNull()
  expect(head.textContent).toContain('Notes')
  // One start, read in place below (the test after this one): its value is the frame's row's.
  const expandedStart = head.className.split(' ').filter((c) => c.startsWith('ps-'))
  expect(expandedStart).toHaveLength(1)
  rerender(
    <Sidebar aria-label="Main" toggle="head-start" header={<span>Notes</span>} collapsed onCollapsedChange={onCollapsed}>
      <SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup>
    </Sidebar>,
  )
  const railHead = container.querySelector('[data-slot="sidebar-head"]')!
  expect(railHead.querySelector('button')).not.toBeNull()
  expect(railHead.textContent).not.toContain('Notes')
  expect(railHead.querySelector('[data-slot="sidebar-head-divider"]')).toBeNull()
  // The same start offset on the rail as in the column: the toggle does not move.
  expect(railHead.className.split(' ').filter((c) => c.startsWith('ps-'))).toEqual(expandedStart)
  expect(railHead.className.split(' ')).not.toContain('justify-center')
  fireEvent.click(railHead.querySelector('button')!)
  expect(onCollapsed).toHaveBeenCalledWith(false)
})

/**
 * Where a box starts what it holds, in px from its own edge, as a browser computes its classes: a `--sidebar-toggle-inset`
 * it declares, then its one `ps-` (a step of the spacing scale, or a value in brackets), with the measures of a density.
 * jsdom computes none of it.
 */
function startOf(el: Element, measures: Record<string, number>): number {
  const value = (raw: string, vars: Record<string, number>): number => {
    const expr = raw
      .replaceAll('_', ' ')
      .replace(/var\((--[\w-]+)(?:,([^)]*))?\)/g, (_, name: string, fallback?: string) => String(vars[name] ?? parseFloat(fallback ?? 'NaN')))
      .replace(/(\d*\.?\d+)rem/g, (_, n: string) => String(Number(n) * 16))
      .replace(/(\d*\.?\d+)px/g, '$1')
    return Function('clamp', 'calc', `return (${expr})`)((lo: number, v: number, hi: number) => Math.min(Math.max(v, lo), hi), (v: number) => v) as number
  }
  const cls = classes(el)
  const vars = { ...measures }
  const declare = '[--sidebar-toggle-inset:'
  const declared = cls.find((c) => c.startsWith(declare))
  if (declared) vars['--sidebar-toggle-inset'] = value(declared.slice(declare.length, -1), vars)
  const starts = cls.filter((c) => c.startsWith('ps-'))
  expect(starts).toHaveLength(1)
  const start = starts[0]!
  return start.startsWith('ps-[') ? value(start.slice(4, -1), vars) : Number(start.slice(3)) * 4
}

test('toggle="head-start": the button is where the frame\'s row puts it, over the middle of the rail\'s icons and inside the rail, at every density and with a finger', () => {
  const places = <SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup>
  const own = (collapsed: boolean) => (
    <Sidebar aria-label="Main" toggle="head-start" header={<span>Notes</span>} collapsed={collapsed} onCollapsedChange={vi.fn()}>{places}</Sidebar>
  )
  const { container, rerender, unmount } = render(own(false))
  // The head row lies inside the sidebar's own 8px.
  expect(classes(container.querySelector('[data-slot="sidebar"]'))).toContain('p-2')
  const column = container.querySelector('[data-slot="sidebar-head"]')!.cloneNode() as Element
  const button = container.querySelector('[data-slot="sidebar-collapse"]')!.cloneNode() as Element
  rerender(own(true))
  const rail = container.querySelector('[data-slot="sidebar-head"]')!.cloneNode() as Element
  unmount()
  // The frame's row over a sidebar: its start cell starts at the sidebar's outer edge.
  const frame = render(
    <AppShell frame="sheet" top="unified" contentLabel="Notes" sidebarCollapsed={false} onSidebarCollapsedChange={vi.fn()} sidebar={<Sidebar aria-label="Places">{places}</Sidebar>}>Body</AppShell>,
  )
  const cell = frame.container.querySelector('[data-slot="app-shell-top-start"]')!
  const fingers = [false, true]
  for (const density of DENSITIES) {
    for (const finger of fingers) {
      // With a finger a row and the smallest control are 44px at least (theme.css), and so is the button.
      const row = finger ? Math.max(44, density.row.height) : density.row.height
      const size = finger ? Math.max(44, density.control.xs) : density.control.xs
      const measures = { '--row-height': row, '--control-xs': size, '--titlebar-start': 0 }
      const where = `${density.id}${finger ? ', finger' : ''}`
      // From the sidebar's outer edge: its 8px, then the head row's start.
      const start = 8 + startOf(column, measures)
      expect(8 + startOf(rail, measures), where).toBe(start)
      expect(startOf(cell, measures), where).toBe(start)
      // Over the middle of the rail (one row and the sidebar's 8px on each side), and inside it.
      expect(start + size / 2, where).toBe((row + 16) / 2)
      expect(start, where).toBeGreaterThanOrEqual(8)
      expect(start + size, where).toBeLessThanOrEqual(8 + row)
    }
  }
  // One button, the same wherever it is drawn.
  expect(classes(button)).toEqual(classes(frame.container.querySelector('[data-slot="sidebar-toggle"]')))
})

test('Sidebar suppresses its own toggle and follows UnifiedShellContext.collapsed when unifiedTop is true', () => {
  const { container } = render(
    <UnifiedShellContext.Provider value={{ unifiedTop: true, collapsed: true, onCollapsedChange: vi.fn(), attachedTabs: true }}>
      <Sidebar aria-label="Main" onCollapsedChange={vi.fn()} header={<span>Notes</span>}>
        <SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup>
      </Sidebar>
    </UnifiedShellContext.Provider>,
  )
  expect(container.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(true)
  expect(container.querySelector('[data-slot="sidebar-toggle"]')).toBeNull()
  expect(container.querySelector('[data-slot="sidebar-collapse"]')).toBeNull()
  expect(container.querySelector('[data-slot="sidebar-head"]')).toBeNull()
})

test('with unifiedTop and collapsed false the sidebar is a column, with no toggle or header of its own, even with toggle="head-start"', () => {
  const { container } = render(
    <UnifiedShellContext.Provider value={{ unifiedTop: true, collapsed: false, onCollapsedChange: vi.fn(), attachedTabs: false }}>
      <Sidebar aria-label="Main" collapsed toggle="head-start" header={<span>Notes</span>} onCollapsedChange={vi.fn()}>
        <SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup>
      </Sidebar>
    </UnifiedShellContext.Provider>,
  )
  expect(container.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(false)
  expect(container.querySelector('[data-slot="sidebar-collapse"]')).toBeNull()
  expect(container.querySelector('[data-slot="sidebar-head"]')).toBeNull()
  expect(container.querySelector('[data-slot="sidebar-header"]')).toBeNull()
})
