// The frame of an app (`AppShell`) and its `Inspector`: seven regions, and three steps that follow the frame's own
// width (Imago's 1000, 850 and 620px), which the sidebar and the inspector read from the frame.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { APP_SHELL_STEPS, AppShell, Inspector, NavItem, Sidebar, SidebarGroup, appShellLayout, useAppShell } from '../src'

afterEach(() => vi.unstubAllGlobals())

/** A `ResizeObserver` the test drives: `resize(width)` tells every observer the frame's width. */
function observed() {
  const callbacks: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback) }
    observe() {}
    disconnect() {}
  })
  return (width: number) => act(() => callbacks.forEach((c) => c([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)))
}

function Layout() {
  const layout = useAppShell()
  return <p data-testid="layout">{layout.sidebar} {layout.inspector}</p>
}

function App({ onInspector, onCollapsed }: { onInspector?: (open: boolean) => void; onCollapsed?: (collapsed: boolean) => void }) {
  return (
    <AppShell
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
