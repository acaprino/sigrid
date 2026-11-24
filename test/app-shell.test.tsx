// The frame of an app (`AppShell`) and its `Inspector`: seven regions, and three steps that follow the frame's own
// width (Imago's 1000, 850 and 620px), which the sidebar and the inspector read from the frame.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { SearchField } from '../src/components'
import { APP_SHELL_STEPS, AppShell, Inspector, NavItem, Sidebar, SidebarGroup, appShellLayout, useAppShell } from '../src/layout'
import { CommandsProvider, useCommand } from '../src/assemblies'
import { settle } from './helpers'

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
    expect(heard).toEqual([false])
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy()
    expect(document.activeElement).toBe(field)
  } finally {
    window.removeEventListener('keydown', listen)
  }
})

test('as a drawer, reached with Tab (through the sentinel at its edge) and closed, the focus goes back to the row', async () => {
  const resize = observed()
  render(<Details start={false} />)
  resize(900)
  focus(button('First message'))
  fireEvent.click(button('First message'))
  await settle(120)
  // Tab from the page lands on the sentinel first, which hands the focus on: it is not where the person was.
  const sentinel = document.querySelector<HTMLElement>('[data-base-ui-focus-guard]')
  expect(sentinel).not.toBeNull()
  focus(sentinel!)
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
