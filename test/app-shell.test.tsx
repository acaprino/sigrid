// The frame of an app (`AppShell`) and its `Inspector`: seven regions, and three steps that follow the frame's own
// width (Imago's 1000, 850 and 620px), which the sidebar and the inspector read from the frame.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { SearchField } from '../src/components'
import { APP_SHELL_STEPS, AppShell, DocumentTab, DocumentTabs, Inspector, NavItem, Sidebar, SidebarGroup, TitleBar, Toolbar, ToolbarBrand, ToolbarSearch, WindowControls, appShellLayout, useAppShell } from '../src/layout'
import { CommandsProvider, useCommand } from '../src/assemblies'
import { settle } from './helpers'
import { themeCss } from './theme-tokens'

afterEach(() => vi.unstubAllGlobals())

/** A `ResizeObserver` the test drives: `resize(width)` tells every observer the frame's width. */
function observed() {
  const callbacks: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  return (width: number) => act(() => callbacks.forEach((c) => c([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)))
}

function Layout() {
  const layout = useAppShell()
  return <p data-testid="layout">{layout.sidebar} {layout.inspector}</p>
}

function App({ onInspector, onCollapsed, frame }: { onInspector?: (open: boolean) => void; onCollapsed?: (collapsed: boolean) => void; frame?: 'line' | 'sheet' }) {
  return (
    <AppShell
      frame={frame}
      contentLabel="Messages"
      titleBar={<header>Mail</header>}
      status={<span>Saved</span>}
      sidebar={
        <Sidebar aria-label="Main" onCollapsedChange={onCollapsed} open>
          <SidebarGroup label="Places">
            <NavItem icon={<svg />} current>Inbox</NavItem>
          </SidebarGroup>
        </Sidebar>
      }
      inspector={<Inspector title="Details" open onOpenChange={onInspector} footer={<button type="button">Save</button>}>The sender</Inspector>}
      actions={<button type="button">Reply</button>}
      footer={<span>3 unread</span>}
    >
      <Layout />
    </AppShell>
  )
}

test('the steps are Imago\'s: the inspector docks from 1000px, the sidebar is whole from 850px and a rail from 620px', () => {
  expect(APP_SHELL_STEPS).toEqual({ inspector: 1000, sidebar: 850, rail: 620 })
  expect(appShellLayout(1000)).toEqual({ sidebar: 'full', inspector: 'docked' })
  expect(appShellLayout(999)).toEqual({ sidebar: 'full', inspector: 'drawer' })
  expect(appShellLayout(849)).toEqual({ sidebar: 'rail', inspector: 'drawer' })
  expect(appShellLayout(619)).toEqual({ sidebar: 'drawer', inspector: 'drawer' })
})

test('the frame has its regions, named, and a skip link to the content', () => {
  render(<App />)
  const main = screen.getByRole('main', { name: 'Messages' })
  expect(screen.getByRole('link', { name: 'Skip to the content' }).getAttribute('href')).toBe(`#${main.id}`)
  expect(screen.getByRole('status').textContent).toBe('Saved')
  expect(screen.getByRole('contentinfo').textContent).toBe('3 unread')
  expect(screen.getByRole('complementary', { name: 'Details' }).textContent).toContain('The sender')
  expect(document.querySelector('[data-slot="app-shell-actions"]')?.textContent).toBe('Reply')
  // Nothing to measure with: the wide layout.
  expect(screen.getByTestId('layout').textContent).toBe('full docked')
})

test('a frame without a region does not draw its strip', () => {
  render(<AppShell contentLabel="Page">Text</AppShell>)
  for (const slot of ['status', 'actions', 'footer']) expect(document.querySelector(`[data-slot="app-shell-${slot}"]`)).toBeNull()
  expect(screen.getByRole('main').textContent).toBe('Text')
})

test('the frame follows its own width: the sidebar becomes a rail with no button to widen it, then a drawer', () => {
  const resize = observed()
  render(<App onCollapsed={() => {}} />)
  const frame = document.querySelector('[data-slot="app-shell"]')!
  resize(1200)
  expect(screen.getByRole('button', { name: 'Collapse the sidebar' })).toBeTruthy()
  expect(document.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(false)
  resize(700)
  expect(frame.getAttribute('data-sidebar')).toBe('rail')
  expect(document.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(true)
  expect(screen.queryByRole('button', { name: /the sidebar/ })).toBeNull()
  resize(500)
  expect(screen.getByTestId('layout').textContent).toBe('drawer drawer')
  // Out of the layout: the sidebar is a dialog over the page.
  expect(screen.getByRole('dialog', { name: 'Main' })).toBeTruthy()
})

test('under 1000px the inspector is a panel over the content, not modal; its button closes it in both forms', () => {
  const resize = observed()
  const seen: boolean[] = []
  render(<App onInspector={(open) => seen.push(open)} />)
  resize(1200)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  resize(900)
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  const panel = document.querySelector('[data-inspector-form="drawer"]')!
  expect(panel.textContent).toContain('The sender')
  expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
  fireEvent.click(panel.querySelector('[data-slot="inspector-close"]')!)
  expect(seen).toEqual([false, false])
})

test('a closed inspector leaves its room to the content', () => {
  render(<AppShell contentLabel="Page" inspector={<Inspector title="Details" open={false}>x</Inspector>}>Text</AppShell>)
  expect(document.querySelector('[data-slot="inspector"]')?.hasAttribute('hidden')).toBe(true)
})

test('the steps are a recommendation: an app passes its own, and a step at 0 never happens', () => {
  expect(appShellLayout(700, { inspector: 600, sidebar: 0, rail: 0 })).toEqual({ sidebar: 'full', inspector: 'docked' })
  const resize = observed()
  render(
    <AppShell contentLabel="Page" steps={{ sidebar: 0, rail: 0 }}>
      <Layout />
    </AppShell>,
  )
  resize(400)
  expect(screen.getByTestId('layout').textContent).toBe('full drawer')
})

test('the frame is drawn with lines by default; `frame="sheet"` puts the work area on a sheet over the ground', () => {
  const { unmount } = render(<App />)
  expect(document.querySelector('[data-slot="app-shell"]')?.getAttribute('data-frame')).toBe('line')
  expect(document.querySelector('[data-slot="app-shell-work"]')?.hasAttribute('data-sheet')).toBe(false)
  unmount()
  render(<App frame="sheet" />)
  expect(document.querySelector('[data-slot="app-shell"]')?.getAttribute('data-frame')).toBe('sheet')
  // The regions stay the same: only their form changes.
  expect(screen.getByRole('main', { name: 'Messages' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('Saved')
  expect(document.querySelector('[data-slot="app-shell-work"]')?.getAttribute('data-sheet')).toBe('beside')
})

test('the sheet has its corner and its start edge only where a sidebar lies beside it', () => {
  const resize = observed()
  render(<App frame="sheet" />)
  const work = () => document.querySelector('[data-slot="app-shell-work"]')?.getAttribute('data-sheet')
  resize(1200)
  expect(work()).toBe('beside')
  resize(700)
  expect(work()).toBe('beside')
  // Under 620px the sidebar is a drawer: the sheet reaches the window's edge, with no corner.
  resize(500)
  expect(work()).toBe('alone')
})

test('a sheet frame without a sidebar has no corner either', () => {
  render(<AppShell contentLabel="Page" frame="sheet">Text</AppShell>)
  expect(document.querySelector('[data-slot="app-shell-work"]')?.getAttribute('data-sheet')).toBe('alone')
})

// `top="unified"`: in the sheet frame, one top row holds the sidebar's head (its button, a hairline, the app) and the
// work area's tabs, drag room, actions and window buttons, above the layer the overlays open in.
test('frame="sheet" top="unified" mounts single top band above desktop overlays, syncs sidebarCollapsed, and drops rounded-ss-lg when tabs exist', () => {
  const onCollapsed = vi.fn()
  const { container } = render(
    <AppShell
      frame="sheet"
      top="unified"
      desktop
      contentLabel="Notes"
      dragProps={{ 'data-tauri-drag-region': '' }}
      windowControls={<WindowControls onClose={vi.fn()} />}
      sidebarHead={<span>Notes</span>}
      sidebarCollapsed={false}
      onSidebarCollapsedChange={onCollapsed}
      sidebar={<Sidebar aria-label="Places"><SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >Body</AppShell>,
  )
  const bar = container.querySelector('[data-slot="title-bar"]')!
  const below = container.querySelector('[data-slot="app-shell-below"]')!
  expect(bar.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(below.querySelector('[data-slot="app-shell-overlays"]')).not.toBeNull()
  expect(container.querySelector('[data-slot="app-shell-work"]')?.className).not.toContain('rounded-ss-lg')
  expect(container.querySelectorAll('[data-slot="sidebar-toggle"]')).toHaveLength(1)
  fireEvent.click(container.querySelector('[data-slot="sidebar-toggle"]')!)
  expect(onCollapsed).toHaveBeenCalledWith(true)
})

test('forced rail (620–849px) disables unified toggle and hides sidebarHead; narrow (<620px) omits start cell without sidebar and shows onSidebarOpen button when sidebar is drawer', () => {
  const resize = observed()
  const onOpen = vi.fn()
  const { container } = render(
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      sidebarHead={<span>Notes</span>}
      sidebarCollapsed={false}
      onSidebarCollapsedChange={vi.fn()}
      onSidebarOpen={onOpen}
      sidebar={<Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >Body</AppShell>,
  )
  // Wide, the column: the button, enabled, then the hairline and the app.
  resize(1200)
  expect(container.querySelector<HTMLButtonElement>('[data-slot="sidebar-toggle"]')?.disabled).toBe(false)
  expect(container.querySelector('[data-slot="app-shell-top-divider"]')).not.toBeNull()
  expect(container.querySelector('[data-slot="app-shell-top-head"]')?.textContent).toBe('Notes')
  resize(768)
  expect(container.querySelector<HTMLButtonElement>('[data-slot="sidebar-toggle"]')?.disabled).toBe(true)
  expect(container.querySelector('[data-slot="app-shell-top-divider"]')).toBeNull()
  expect(container.querySelector('[data-slot="app-shell-top-head"]')).toBeNull()
  expect(container.querySelector('[data-slot="title-bar"]')?.textContent).not.toContain('Notes')
  resize(390)
  const openBtn = container.querySelector<HTMLButtonElement>('[data-slot="sidebar-drawer-open"]')!
  expect(openBtn).not.toBeNull()
  fireEvent.click(openBtn)
  expect(onOpen).toHaveBeenCalledTimes(1)
})

test('shrunk by the user, the row keeps its button in place and enabled, names it for widening, and the sidebar follows the frame', () => {
  const onCollapsed = vi.fn()
  const Frame = ({ collapsed }: { collapsed: boolean }) => (
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      sidebarHead={<span>Notes</span>}
      sidebarCollapsed={collapsed}
      onSidebarCollapsedChange={onCollapsed}
      // The sidebar's own prop says otherwise: in the row, the frame's choice is the one that holds.
      sidebar={<Sidebar aria-label="Places" collapsed={!collapsed}><NavItem icon={<svg />}>All</NavItem></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >Body</AppShell>
  )
  const { container, rerender } = render(<Frame collapsed />)
  const toggle = () => container.querySelector<HTMLButtonElement>('[data-slot="sidebar-toggle"]')!
  const cell = () => container.querySelector('[data-slot="app-shell-top-start"]')!
  // The rail, by the user's choice: the button can widen it again.
  expect(toggle().disabled).toBe(false)
  expect(toggle().getAttribute('aria-label')).toBe('Expand the sidebar')
  expect(toggle().getAttribute('aria-expanded')).toBe('false')
  expect(toggle().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('sidebarOpen')
  // The cell is as wide as the rail under it (one row and the sidebar's 8px on each side), and holds the button alone.
  expect(cell().className).toContain('w-[max(calc(var(--row-height)')
  expect(container.querySelector('[data-slot="app-shell-top-head"]')).toBeNull()
  expect(container.querySelector('[data-slot="app-shell-top-divider"]')).toBeNull()
  expect(container.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(true)
  fireEvent.click(toggle())
  expect(onCollapsed).toHaveBeenLastCalledWith(false)
  // Widened: the same button in the same place, now to shrink it; the column's width, the hairline and the app.
  const before = toggle()
  rerender(<Frame collapsed={false} />)
  expect(toggle()).toBe(before)
  expect(toggle().getAttribute('aria-label')).toBe('Collapse the sidebar')
  expect(toggle().getAttribute('aria-expanded')).toBe('true')
  expect(toggle().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('sidebarClose')
  expect(cell().className).toContain('w-[max(16rem')
  expect(container.querySelector('[data-slot="app-shell-top-divider"]')).not.toBeNull()
  expect(container.querySelector('[data-slot="app-shell-top-head"]')?.textContent).toBe('Notes')
  expect(container.querySelector('[data-slot="sidebar"]')?.hasAttribute('data-collapsed')).toBe(false)
  fireEvent.click(toggle())
  expect(onCollapsed).toHaveBeenLastCalledWith(true)
})

test('the row\'s tabs start at the sheet\'s start edge beside the sidebar and across a sheet as wide as the frame; after the drawer\'s button they do not', () => {
  const resize = observed()
  // Composed with `+`: Tailwind also scans the tests (test/build.test.ts).
  const startRoom = 'ps-' + '(--radius-lg)'
  const noCorner = 'group-first/document-tab' + ':hidden'
  const tabs = <DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab><DocumentTab value="ideas">Ideas</DocumentTab></DocumentTabs>
  /** Whether the strip of the row is flush: the first tab draws no start corner, and the row keeps no room for one. */
  const flush = () => {
    const list = document.querySelector('[data-slot="title-bar"] [data-slot="tabs-list"]')!
    const corner = document.querySelector('[data-slot="title-bar"] [data-slot="document-tab"][data-selected] [data-slot="document-tab-fillet"][data-side="start"]')!
    const room = list.className.split(' ').includes(startRoom)
    expect(corner.className.split(' ').includes(noCorner)).toBe(!room)
    return !room
  }
  const sidebar = <Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>
  const { rerender } = render(<AppShell frame="sheet" top="unified" contentLabel="Notes" onSidebarOpen={vi.fn()} sidebar={sidebar} tabs={tabs}>Body</AppShell>)
  resize(1200)
  expect(flush()).toBe(true)
  resize(768)
  expect(flush()).toBe(true)
  resize(390)
  expect(document.querySelector('[data-slot="sidebar-drawer-open"]')).not.toBeNull()
  expect(flush()).toBe(false)
  // A drawer the app opens from elsewhere: nothing before the strip, which starts where the sheet does.
  rerender(<AppShell frame="sheet" top="unified" contentLabel="Notes" sidebar={sidebar} tabs={tabs}>Body</AppShell>)
  expect(flush()).toBe(true)
  // No sidebar on a narrow frame (the phone's layout): the sheet is as wide as the frame, and so is the row.
  rerender(<AppShell frame="sheet" top="unified" contentLabel="Notes" onSidebarOpen={vi.fn()} tabs={tabs}>Body</AppShell>)
  expect(flush()).toBe(true)
})

test('on a sidebar of its own colours the start cell is the top of the column, and the app in it reads in the sidebar\'s inks', () => {
  const { container } = render(
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      sidebarHead={<ToolbarBrand name="Notes" page={['Travel', 'Trip']} />}
      sidebar={<Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >Body</AppShell>,
  )
  const cell = container.querySelector('[data-slot="app-shell-top-start"]')!
  // Only under `data-sidebar="own"` (a variant, composed with `+`): the cell paints the column, and inside it the ink of
  // the page is the sidebar's ink, its muted ink the sidebar's muted ink, so a `ToolbarBrand` (its name, the place and the
  // steps before it) reads on the column as `SidebarRow` does.
  const own = 'in-data-[sidebar=own]' + ':'
  expect(cell.className.split(' ')).toEqual(expect.arrayContaining([
    own + 'bg-sidebar-paper',
    own + 'text-sidebar-ink',
    own + '[--color-ink' + ':var(--color-sidebar-ink)]',
    own + '[--color-ink-soft' + ':var(--color-sidebar-ink)]',
    own + '[--color-ink-mute' + ':var(--color-sidebar-mute)]',
  ]))
  for (const slot of ['toolbar-brand-name', 'toolbar-brand-page']) expect(cell.querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
  // Nowhere else: the tabs and the rest of the row keep the page's inks, and so does a `ToolbarBrand` in a `TitleBar`.
  expect(container.querySelector('[data-slot="title-bar"]')!.className).not.toContain('--color-ink')
  expect(container.querySelector('[data-slot="app-shell-top-work"]')!.className).not.toContain('--color-ink')
})

test('the actions at the end of the row take the room their content needs, before the window\'s buttons; short of room the tabs give way, never the page', () => {
  render(
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      windowControls={<WindowControls onClose={vi.fn()} />}
      topActions={<Toolbar aria-label="Notes"><ToolbarSearch label="Search the notes" value="" onValueChange={vi.fn()} /></Toolbar>}
      sidebar={<Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >
      <Toolbar aria-label="Content tools"><ToolbarSearch label="Find" value="" onValueChange={vi.fn()} /></Toolbar>
    </AppShell>,
  )
  render(<TitleBar><Toolbar aria-label="Mail"><ToolbarSearch label="Search the mail" value="" onValueChange={vi.fn()} /></Toolbar></TitleBar>)
  const toolbar = (name: string) => screen.getByRole('toolbar', { name })
  // A toolbar measures its own width for its steps (a container of its inline size), and such a box counts as empty
  // where the room around it is its content's: in the row's actions it is not measured, so the cell is as wide as what
  // it holds. Elsewhere (filling a `TitleBar`, in the content) it keeps measuring itself.
  const css = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = /([^{}]*)\{\s*container-type:\s*normal;\s*\}/.exec(css)
  expect(rule, 'the rule that stops the row\'s toolbar measuring itself').not.toBeNull()
  const selector = rule![1]!.trim()
  expect(toolbar('Notes').matches(selector)).toBe(true)
  expect(toolbar('Mail').matches(selector)).toBe(false)
  expect(toolbar('Content tools').matches(selector)).toBe(false)
  // The flex roles that keep the geometry: the actions and the window's buttons never shrink; the tab strip shrinks (and
  // scrolls with its arrow) down to nothing; the drag room holds only what is left, and 8px at least.
  const work = document.querySelector('[data-slot="app-shell-top-work"]')!
  const cell = (slot: string) => work.querySelector(`[data-slot="${slot}"]`)!.className.split(' ')
  expect(cell('app-shell-top-actions')).toContain('shrink-0')
  expect(cell('window-controls')).toContain('shrink-0')
  expect(cell('app-shell-top-tabs')).toContain('min-w-0')
  expect(cell('app-shell-top-tabs')).not.toContain('shrink-0')
  expect(cell('app-shell-top-drag')).toEqual(expect.arrayContaining(['flex-1', 'min-w-2']))
  expect(work.className.split(' ')).toContain('min-w-0')
})

test('under bold tabs the title bar grows 2px for the line of its views; the one top row, whose tabs have no such line, keeps its height', () => {
  const css = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  const selector = /([^{}]*\[data-tabs="bold"\] \[data-slot="title-bar"\][^{}]*)\{/.exec(css)![1]!.trim()
  render(
    <div data-tabs="bold">
      <TitleBar><span>Mail</span></TitleBar>
      <TitleBar size="compact"><span>Tool</span></TitleBar>
      <AppShell frame="sheet" top="unified" contentLabel="Notes">Body</AppShell>
    </div>,
  )
  const [bar, compact, band] = Array.from(document.querySelectorAll('[data-slot="title-bar"]'))
  expect(band!.hasAttribute('data-unified')).toBe(true)
  expect(bar!.matches(selector)).toBe(true)
  expect(compact!.matches(selector)).toBe(false)
  expect(band!.matches(selector)).toBe(false)
})

test('frame="line" with top="unified" falls back cleanly to data-top="bar" and F6 cycles unified regions', () => {
  const { container, unmount } = render(
    <AppShell frame="line" top="unified" contentLabel="Notes" titleBar={<TitleBar><span>Mail</span></TitleBar>}>Body</AppShell>,
  )
  expect(container.querySelector('[data-slot="app-shell"]')?.getAttribute('data-top')).toBe('bar')
  expect(container.querySelector('[data-slot="title-bar"]')?.textContent).toContain('Mail')
  // The bar's own frame: one bar, the app's, and no row of the sheet frame.
  expect(container.querySelectorAll('[data-slot="title-bar"]')).toHaveLength(1)
  expect(container.querySelector('[data-unified]')).toBeNull()
  unmount()
  // In the sheet frame the one top row is the title bar of the round: F6 goes into it once (its first control, not
  // each of its buttons in turn), then to the sidebar's current place and the content; Shift+F6 comes back to it.
  render(
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      sidebarHead={<span>Notes</span>}
      sidebarCollapsed={false}
      onSidebarCollapsedChange={vi.fn()}
      sidebar={<Sidebar aria-label="Places"><SidebarGroup label="Places"><NavItem icon={<svg />} current>All notes</NavItem></SidebarGroup></Sidebar>}
      tabs={<DocumentTabs value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >Body</AppShell>,
  )
  const band = document.querySelector('[data-slot="title-bar"]')!
  expect(document.querySelectorAll('[data-slot="title-bar"]')).toHaveLength(1)
  expect(band.hasAttribute('data-unified')).toBe(true)
  const press = (shift = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'F6', shiftKey: shift })
  press()
  expect(document.activeElement).toBe(band.querySelector('[data-slot="sidebar-toggle"]'))
  press()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'All notes' }))
  press()
  expect(document.activeElement).toBe(screen.getByRole('main', { name: 'Notes' }))
  press(true)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'All notes' }))
  press(true)
  expect(document.activeElement).toBe(band.querySelector('[data-slot="sidebar-toggle"]'))
  // From the band, Shift+F6 goes round to the last region the frame has.
  press(true)
  expect(document.activeElement).toBe(screen.getByRole('main', { name: 'Notes' }))
})

test('the unified top row moves the window from its empty parts, ends with the window buttons, and joins only its own tabs to the sheet', () => {
  render(
    <AppShell
      frame="sheet"
      top="unified"
      contentLabel="Notes"
      titleBar={<TitleBar><span>Ignored</span></TitleBar>}
      dragProps={{ 'data-tauri-drag-region': '' }}
      windowControls={<WindowControls onClose={vi.fn()} />}
      topActions={<button type="button">Share</button>}
      sidebar={<Sidebar aria-label="Places"><NavItem icon={<svg />}>All</NavItem></Sidebar>}
      tabs={<DocumentTabs aria-label="Open notes" value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}
    >
      <DocumentTabs aria-label="Sections" value="a" onValueChange={vi.fn()}><DocumentTab value="a">A</DocumentTab></DocumentTabs>
      {/* A sidebar of something drawn in the content (a sample): not the row's, it keeps its own button. */}
      <Sidebar aria-label="Sample" onCollapsedChange={vi.fn()}><NavItem icon={<svg />}>One</NavItem></Sidebar>
    </AppShell>,
  )
  const band = document.querySelector('[data-slot="title-bar"]')!
  // One bar: the row, not the app's `titleBar` too.
  expect(document.querySelectorAll('[data-slot="title-bar"]')).toHaveLength(1)
  expect(band.textContent).not.toContain('Ignored')
  expect(band.hasAttribute('data-tauri-drag-region')).toBe(true)
  expect(band.hasAttribute('data-window-controls')).toBe(true)
  expect(band.querySelector('[data-slot="app-shell-top-drag"]')?.hasAttribute('data-tauri-drag-region')).toBe(true)
  // In order: the tabs, the room that moves the window, the actions, the window's buttons at the end.
  const work = band.querySelector('[data-slot="app-shell-top-work"]')!
  expect([...work.children].map((el) => el.getAttribute('data-slot'))).toEqual(['app-shell-top-tabs', 'app-shell-top-drag', 'app-shell-top-actions', 'window-controls'])
  // Its tabs sit in the row and join the sheet; a strip of the content keeps its own look; no strip under the row.
  expect(screen.getByRole('tablist', { name: 'Open notes' }).closest('[data-slot="document-tabs"]')?.getAttribute('data-appearance')).toBe('attached')
  expect(screen.getByRole('tablist', { name: 'Sections' }).closest('[data-slot="document-tabs"]')?.getAttribute('data-appearance')).toBe('pill')
  expect(screen.getByRole('main').querySelector('[data-slot="sidebar-collapse"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="app-shell-tabs"]')).toBeNull()
  expect(document.querySelector('[data-slot="app-shell"]')?.getAttribute('data-top')).toBe('unified')
})

test('top="bar" is the default: the frame keeps its bar and its strip of tabs, and a strip there keeps its own look', () => {
  render(
    <AppShell frame="sheet" contentLabel="Notes" titleBar={<TitleBar><span>Mail</span></TitleBar>} sidebar={<Sidebar aria-label="Places" onCollapsedChange={vi.fn()}><NavItem icon={<svg />}>All</NavItem></Sidebar>} tabs={<DocumentTabs aria-label="Open notes" value="trip" onValueChange={vi.fn()}><DocumentTab value="trip">Trip</DocumentTab></DocumentTabs>}>
      Body
    </AppShell>,
  )
  expect(document.querySelector('[data-slot="app-shell"]')?.getAttribute('data-top')).toBe('bar')
  expect(document.querySelector('[data-slot="title-bar"]')?.textContent).toBe('Mail')
  expect(document.querySelector('[data-slot="app-shell-tabs"]')).not.toBeNull()
  expect(screen.getByRole('tablist', { name: 'Open notes' }).closest('[data-slot="document-tabs"]')?.getAttribute('data-appearance')).toBe('pill')
  expect(document.querySelector('[data-slot="app-shell-work"]')?.className).toContain('rounded-ss-lg')
  // The sidebar keeps its own button.
  expect(document.querySelector('[data-slot="sidebar-collapse"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="sidebar-toggle"]')).toBeNull()
})

// `inspectorAt`: the docked inspector at the end of the frame (the default), or beside the sidebar, before the content.
function Beside({ at, sidebar = true }: { at?: 'end' | 'sidebar'; sidebar?: boolean }) {
  return (
    <AppShell
      contentLabel="Messages"
      inspectorAt={at}
      sidebar={sidebar ? <Sidebar aria-label="Main" open><SidebarGroup label="Places"><NavItem icon={<svg />} current>Inbox</NavItem></SidebarGroup></Sidebar> : undefined}
      inspector={<Inspector title="Details" open>The sender</Inspector>}
    >
      <p>The list</p>
    </AppShell>
  )
}
const columns = () => [...document.querySelector('[data-slot="app-shell-columns"]')!.children].map((el) => el.getAttribute('data-slot'))

test('with inspectorAt="sidebar" the docked inspector stands beside the sidebar, before the content, with its line towards the content', () => {
  const { rerender } = render(<Beside at="sidebar" />)
  expect(columns()).toEqual(['inspector', 'app-shell-content'])
  const aside = screen.getByRole('complementary', { name: 'Details' })
  expect(aside.getAttribute('data-inspector-at')).toBe('sidebar')
  expect(aside.classList.contains('border-e')).toBe(true)
  expect(aside.classList.contains('border-s')).toBe(false)
  // Moved to the end, it is the same element: what it holds is not drawn anew.
  rerender(<Beside at="end" />)
  expect(columns()).toEqual(['app-shell-content', 'inspector'])
  expect(screen.getByRole('complementary', { name: 'Details' })).toBe(aside)
  expect(aside.getAttribute('data-inspector-at')).toBe('end')
  expect(aside.classList.contains('border-s')).toBe(true)
})

test('by default, and with no sidebar beside the work area, the inspector is at the end', () => {
  const { unmount } = render(<Beside />)
  expect(columns()).toEqual(['app-shell-content', 'inspector'])
  unmount()
  render(<Beside at="sidebar" sidebar={false} />)
  expect(columns()).toEqual(['app-shell-content', 'inspector'])
})

test('with inspectorAt="sidebar", under 1000px the inspector is the drawer over the end of the content, as without it', () => {
  const resize = observed()
  render(<Beside at="sidebar" />)
  resize(1200)
  expect(screen.getByRole('complementary', { name: 'Details' }).getAttribute('data-inspector-at')).toBe('sidebar')
  resize(900)
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  expect(document.querySelector('[data-inspector-form="drawer"]')?.textContent).toContain('The sender')
})

// The inspector beside the rest of the window: a list to choose from, and the details of the one chosen.
function Details({ start = true, shown = true, find = '', onChange }: { start?: boolean; shown?: boolean; find?: string; onChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(start)
  const [first, setFirst] = useState(true)
  const [label, setLabel] = useState(true)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState(find)
  const change = (next: boolean) => {
    onChange?.(next)
    setOpen(next)
  }
  return (
    <AppShell
      contentLabel="Messages"
      inspector={
        shown ? (
          <Inspector title="Details" open={open} onOpenChange={change}>
            <button type="button">Edit</button>
            <button type="button" aria-expanded="true">More facts</button>
            <input aria-label="Label" role="combobox" aria-expanded="true" aria-controls="labels" />
            {label ? <button type="button" onClick={() => setLabel(false)}>Remove the label</button> : null}
            <SearchField aria-label="Find in the details" value={found} onValueChange={setFound} />
            {/* A menu of the inspector, in a layer of the page. */}
            {createPortal(<div role="menu"><button type="button" role="menuitem">Rename</button></div>, document.body)}
          </Inspector>
        ) : undefined
      }
    >
      <SearchField aria-label="Search the messages" value={query} onValueChange={setQuery} />
      {first ? <button type="button" onClick={() => setOpen(true)}>First message</button> : null}
      <button type="button">Second message</button>
      <button type="button" onClick={() => setFirst(false)}>Archive</button>
      <button type="button" onClick={() => setOpen(false)}>Hide the details</button>
    </AppShell>
  )
}

/** An app's command on Escape, in the registry. */
function CloseCommand({ run }: { run: () => void }) {
  useCommand({ id: 'close', label: 'Close the details', keys: 'Escape', run })
  return null
}

const button = (name: string) => screen.getByRole('button', { name })
const focus = (el: HTMLElement) => act(() => el.focus())
/** A whole press, as a pointer makes it: what closes a sheet when it lands outside it. */
function pressOn(el: Element) {
  fireEvent.pointerDown(el)
  fireEvent.mouseDown(el)
  fireEvent.pointerUp(el)
  fireEvent.mouseUp(el)
  fireEvent.click(el)
}

test('docked, the inspector closed with the focus in it gives the focus back to what had it before', () => {
  render(<Details />)
  focus(button('First message'))
  focus(button('Edit'))
  fireEvent.click(button('Close'))
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  expect(document.activeElement).toBe(button('First message'))
})

test('docked, Escape with the focus in the inspector closes it and gives the focus back; Escape elsewhere is not its own', () => {
  const seen: boolean[] = []
  render(<Details onChange={(open) => seen.push(open)} />)
  focus(button('First message'))
  fireEvent.keyDown(button('First message'), { key: 'Escape' })
  expect(seen).toEqual([])
  focus(button('Edit'))
  fireEvent.keyDown(button('Edit'), { key: 'Escape' })
  expect(seen).toEqual([false])
  expect(document.activeElement).toBe(button('First message'))
})

test('docked, a field whose list is open keeps its Escape; a row opened in place does not', () => {
  const seen: boolean[] = []
  render(<Details onChange={(open) => seen.push(open)} />)
  focus(screen.getByRole('combobox', { name: 'Label' }))
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Label' }), { key: 'Escape' })
  expect(seen).toEqual([])
  focus(button('More facts'))
  fireEvent.keyDown(button('More facts'), { key: 'Escape' })
  expect(seen).toEqual([false])
})

test('docked, the inspector closed with the focus elsewhere does not move it', () => {
  render(<Details />)
  focus(button('First message'))
  focus(button('Edit'))
  const close = button('Close')
  // The person went back to the list: the focus is theirs.
  focus(button('Second message'))
  fireEvent.click(close)
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  expect(document.activeElement).toBe(button('Second message'))
})

test('docked, when what had the focus is gone the content takes it', () => {
  render(<Details />)
  focus(button('First message'))
  focus(button('Edit'))
  fireEvent.click(button('Archive'))
  expect(screen.queryByRole('button', { name: 'First message' })).toBeNull()
  fireEvent.click(button('Close'))
  expect(document.activeElement).toBe(screen.getByRole('main', { name: 'Messages' }))
})

test('as a drawer the inspector opens without taking the focus, and a press outside it leaves it open', async () => {
  const resize = observed()
  const seen: boolean[] = []
  render(<Details start={false} onChange={(open) => seen.push(open)} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
  expect(document.activeElement).toBe(button('First message'))
  // Choosing another thing in the list: the details stay.
  pressOn(button('Second message'))
  await settle(120)
  expect(seen).toEqual([])
  expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
})

test('as a drawer Escape and its button close the inspector, and the focus goes back to what had it before', async () => {
  const resize = observed()
  const seen: boolean[] = []
  render(<Details start={false} onChange={(open) => seen.push(open)} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Edit'))
  await settle(120)
  fireEvent.keyDown(button('Edit'), { key: 'Escape' })
  await settle(120)
  expect(seen).toEqual([false])
  expect(document.activeElement).toBe(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Close'))
  await settle(120)
  fireEvent.click(button('Close'))
  await settle(120)
  expect(seen).toEqual([false, false])
  expect(document.activeElement).toBe(button('First message'))
})

test('as a drawer, Escape with the focus elsewhere is not for the inspector; closed by the app then, the focus does not move', async () => {
  const resize = observed()
  const seen: boolean[] = []
  render(<Details start={false} onChange={(open) => seen.push(open)} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Second message'))
  fireEvent.keyDown(button('Second message'), { key: 'Escape' })
  await settle(120)
  expect(seen).toEqual([])
  expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
  fireEvent.click(button('Hide the details'))
  await settle(120)
  expect(document.activeElement).toBe(button('Second message'))
})

test('as a drawer, Escape with the focus elsewhere is the app\'s: its command on Escape runs, and the inspector stays', async () => {
  const resize = observed()
  const seen: boolean[] = []
  const run = vi.fn()
  render(
    <CommandsProvider>
      <CloseCommand run={run} />
      <Details start={false} onChange={(open) => seen.push(open)} />
    </CommandsProvider>,
  )
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Second message'))
  fireEvent.keyDown(button('Second message'), { key: 'Escape' })
  await settle(120)
  expect(run).toHaveBeenCalledTimes(1)
  expect(seen).toEqual([])
  expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
  // With the focus in it, Escape is the inspector's: it closes, and the app's command does not run as well.
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Edit'))
  await settle(120)
  fireEvent.keyDown(button('Edit'), { key: 'Escape' })
  await settle(120)
  expect(seen).toEqual([false])
  expect(run).toHaveBeenCalledTimes(1)
})

test('as a drawer, Escape in a field of the content stays with the field and the app: the inspector stays open', async () => {
  const resize = observed()
  const seen: boolean[] = []
  // What a command of the app on Escape hears: the key, not answered by anyone.
  const heard: boolean[] = []
  const listen = (event: KeyboardEvent) => heard.push(event.defaultPrevented)
  window.addEventListener('keydown', listen)
  try {
    render(<Details start={false} onChange={(open) => seen.push(open)} />)
    resize(900)
    focus(button('First message'))
    fireEvent.click(button('First message'))
    await settle(120)
    const field = screen.getByRole('searchbox', { name: 'Search the messages' })
    focus(field)
    fireEvent.keyDown(field, { key: 'Escape' })
    await settle(120)
    expect(seen).toEqual([])
    expect(heard).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
    expect(document.activeElement).toBe(field)
  } finally {
    window.removeEventListener('keydown', listen)
  }
})

test('as a drawer, reached with Tab and closed, the focus goes back to the row', async () => {
  const resize = observed()
  render(<Details start={false} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Edit'))
  await settle(120)
  fireEvent.click(button('Close'))
  await settle(120)
  expect(document.activeElement).toBe(button('First message'))
})

test('a control of the inspector removed with the focus on it: the focus stays in the inspector, and Escape still closes it', () => {
  const seen: boolean[] = []
  render(<Details onChange={(open) => seen.push(open)} />)
  focus(button('First message'))
  focus(button('Remove the label'))
  fireEvent.click(button('Remove the label'))
  expect(screen.queryByRole('button', { name: 'Remove the label' })).toBeNull()
  const details = screen.getByRole('complementary', { name: 'Details' })
  expect(document.activeElement).toBe(details)
  fireEvent.keyDown(details, { key: 'Escape' })
  expect(seen).toEqual([false])
  expect(document.activeElement).toBe(button('First message'))
})

test('as a drawer too, a control removed with the focus on it leaves the focus in the inspector', async () => {
  const resize = observed()
  render(<Details start={false} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  focus(button('Remove the label'))
  await settle(120)
  fireEvent.click(button('Remove the label'))
  await settle(120)
  expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Details' }))
})

test('the focus that left a field for nothing does not go back to it when the inspector closes: the content takes it', () => {
  render(<Details />)
  const field = screen.getByRole('searchbox', { name: 'Search the messages' })
  focus(field)
  // A touch outside any control: the field is left, and its keyboard goes.
  act(() => field.blur())
  focus(button('Edit'))
  fireEvent.click(button('Close'))
  expect(document.activeElement).toBe(screen.getByRole('main', { name: 'Messages' }))
})

test('after a control of the inspector is removed, a later closing with the focus elsewhere does not move it', () => {
  render(<Details />)
  focus(button('First message'))
  focus(button('Remove the label'))
  fireEvent.click(button('Remove the label'))
  // The person types in the search field, and the app closes the details: the field keeps the focus.
  const field = screen.getByRole('searchbox', { name: 'Search the messages' })
  focus(field)
  fireEvent.click(button('Hide the details'))
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  expect(document.activeElement).toBe(field)
})

test('closed with the focus in a menu of its own, in a layer of the page, the inspector gives the focus back', () => {
  render(<Details />)
  focus(button('First message'))
  focus(screen.getByRole('menuitem', { name: 'Rename' }))
  fireEvent.click(button('Close'))
  expect(document.activeElement).toBe(button('First message'))
})

test('docked, a search field that holds text keeps its Escape; empty, Escape closes the inspector', () => {
  const seen: boolean[] = []
  const ran = vi.fn()
  render(
    <CommandsProvider>
      <CloseCommand run={ran} />
      <Details find="invoice" onChange={(open) => seen.push(open)} />
    </CommandsProvider>,
  )
  const field = screen.getByRole('searchbox', { name: 'Find in the details' })
  focus(button('First message'))
  focus(field)
  // The key of a field that holds text: the registry's command on Escape does not run, and the key still goes on to
  // a listener of the app's own on the document.
  const heard: string[] = []
  const listen = (event: KeyboardEvent) => heard.push(event.key)
  document.addEventListener('keydown', listen)
  fireEvent.keyDown(field, { key: 'Escape' })
  document.removeEventListener('keydown', listen)
  expect(seen).toEqual([])
  expect(ran).not.toHaveBeenCalled()
  expect(heard).toEqual(['Escape'])
  fireEvent.change(field, { target: { value: '' } })
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(seen).toEqual([false])
  // The inspector answered the key: the command does not run too.
  expect(ran).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(button('First message'))
  // From the list, the command is the app's.
  fireEvent.keyDown(button('First message'), { key: 'Escape' })
  expect(ran).toHaveBeenCalledTimes(1)
})

test('taken out of the page while open with the focus in it, the inspector gives the focus back', () => {
  const { rerender } = render(<Details />)
  focus(button('First message'))
  focus(button('Edit'))
  rerender(<Details shown={false} />)
  expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull()
  expect(document.activeElement).toBe(button('First message'))
})

test('a closing inspector keeps what it showed while it slides out, then is the app’s again; opened again it shows the new thing at once', () => {
  vi.useFakeTimers()
  try {
    // An app that shows the chosen thing, and closes the inspector with nothing to show once nothing is chosen.
    const Frame = ({ chosen }: { chosen: string | null }) => (
      <AppShell contentLabel="Page" inspector={<Inspector title={chosen ?? ''} open={chosen !== null} footer={chosen ? <button type="button">Open {chosen}</button> : null}>{chosen ? <p>Facts of {chosen}</p> : null}</Inspector>}>
        Text
      </AppShell>
    )
    const { rerender } = render(<Frame chosen="Server" />)
    const panel = document.querySelector('[data-slot="inspector"]')!
    expect(panel.textContent).toBe('ServerFacts of ServerOpen Server')
    rerender(<Frame chosen={null} />)
    // Closed, and on its way out: its title, its body and its foot are still the ones it had.
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(panel.getAttribute('aria-label')).toBe('Server')
    expect(panel.textContent).toBe('ServerFacts of ServerOpen Server')
    // Opened again before the slide ends: the new thing, at once.
    rerender(<Frame chosen="Client" />)
    expect(panel.textContent).toBe('ClientFacts of ClientOpen Client')
    rerender(<Frame chosen={null} />)
    expect(panel.textContent).toBe('ClientFacts of ClientOpen Client')
    // Once the slide is over it is what the app hands it: nothing stays mounted behind a closed inspector.
    act(() => void vi.advanceTimersByTime(400))
    expect(panel.textContent).toBe('')
    expect(panel.hasAttribute('hidden')).toBe(true)
  } finally {
    vi.useRealTimers()
  }
})
