// The toolbar (`Toolbar` and its parts) and the bar of a window (`TitleBar`, `WindowControls`): one Tab stop moved by
// the arrows, buttons that are an icon alone with their name, a search box that opens on a press, and a bar that
// knows no window API (the drag mark and the three actions come from the app).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { TitleBar, Toolbar, ToolbarBrand, brandInitial, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTitle, WindowControls, WordsProvider } from '../src'

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)) })

function Bar({ onOpenChange, open }: { onOpenChange?: (open: boolean) => void; open?: boolean }) {
  const [text, setText] = useState('')
  const [on, setOn] = useState(false)
  return (
    <Toolbar aria-label="Mail">
      <ToolbarTitle>Inbox</ToolbarTitle>
      <ToolbarSpacer />
      <ToolbarSearch label="Search the mail" shortcut="Ctrl K" value={text} onValueChange={setText} open={open} onOpenChange={onOpenChange} />
      <ToolbarGroup aria-label="View">
        <ToolbarButton label="Filter" icon={<svg />} pressed={on} onClick={() => setOn(!on)} />
        <ToolbarButton label="Sort" icon={<svg />} disabled />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton label="New message" icon={<svg />} variant="default">New</ToolbarButton>
    </Toolbar>
  )
}

test('a toolbar is named, and a button that shows an icon alone carries its name without a title', () => {
  render(<Bar />)
  expect(screen.getByRole('toolbar', { name: 'Mail' })).toBeTruthy()
  expect(screen.getByRole('group', { name: 'View' })).toBeTruthy()
  const filter = screen.getByRole('button', { name: 'Filter' })
  expect(filter.getAttribute('title')).toBeNull()
  expect(filter.textContent).toBe('')
  expect(filter.className).toContain('size-(--control-sm)')
  // The one solid action keeps its word and the button's own recipe.
  const add = screen.getByRole('button', { name: 'New message' })
  expect(add.textContent).toBe('New')
  expect(add.getAttribute('data-variant')).toBe('default')
  expect(add.className).toContain('bg-primary')
})

test('a pressed button is a switch that says so, and a disabled one stays reachable', () => {
  render(<Bar />)
  const filter = screen.getByRole('button', { name: 'Filter' })
  expect(filter.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(filter)
  expect(filter.getAttribute('aria-pressed')).toBe('true')
  expect(filter.className).toContain('aria-pressed:bg-selected')
  const sort = screen.getByRole('button', { name: 'Sort' })
  expect(sort.getAttribute('aria-disabled')).toBe('true')
  expect(sort.hasAttribute('disabled')).toBe(false)
})

test('the arrows move the focus among the items: the toolbar is one Tab stop', async () => {
  render(<Bar />)
  const search = screen.getByRole('button', { name: 'Search the mail' })
  const filter = screen.getByRole('button', { name: 'Filter' })
  act(() => search.focus())
  fireEvent.keyDown(search, { key: 'ArrowRight' })
  await flush()
  expect(document.activeElement).toBe(filter)
  expect(screen.getAllByRole('button').filter((b) => b.tabIndex === 0)).toEqual([filter])
})

test('the search is a magnifier that opens into a field with the focus, and Esc empties and closes it', async () => {
  const seen: boolean[] = []
  render(<Bar onOpenChange={(open) => seen.push(open)} />)
  expect(screen.queryByRole('searchbox')).toBeNull()
  const magnifier = screen.getByRole('button', { name: 'Search the mail' })
  expect(magnifier.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(magnifier)
  const box = screen.getByRole('searchbox', { name: 'Search the mail' })
  expect(document.activeElement).toBe(box)
  expect(box.getAttribute('placeholder')).toBe('Search the mail')
  fireEvent.change(box, { target: { value: 'invoice' } })
  fireEvent.keyDown(box, { key: 'Escape' })
  await flush()
  expect(screen.queryByRole('searchbox')).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Search the mail' }))
  expect(seen).toEqual([true, false])
})

test('left empty the search closes; with text it stays open, and the arrows stay in the field', () => {
  render(<Bar />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the mail' }))
  const box = screen.getByRole('searchbox')
  fireEvent.change(box, { target: { value: 'tax' } })
  fireEvent.keyDown(box, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(box)
  fireEvent.blur(box)
  expect(screen.getByRole('searchbox')).toBeTruthy()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
  fireEvent.blur(screen.getByRole('searchbox'))
  expect(screen.queryByRole('searchbox')).toBeNull()
})

test('opened by the app, the field takes the focus', () => {
  const { rerender } = render(<Bar open={false} />)
  expect(screen.queryByRole('searchbox')).toBeNull()
  rerender(<Bar open />)
  expect(document.activeElement).toBe(screen.getByRole('searchbox'))
})

test('the bar of a window carries the host\'s drag mark on itself, the toolbar, the title and the spacers, never on a control', () => {
  render(
    <TitleBar dragProps={{ 'data-drag': '' }} windowControls={<WindowControls onClose={() => {}} />}>
      <Bar />
    </TitleBar>,
  )
  const bar = screen.getByRole('banner')
  expect(bar.getAttribute('data-slot')).toBe('title-bar')
  expect(bar.hasAttribute('data-window-controls')).toBe(true)
  expect([...bar.querySelectorAll('[data-drag]')].map((el) => el.getAttribute('data-slot'))).toEqual(['toolbar', 'toolbar-title', 'toolbar-spacer'])
  expect(bar.hasAttribute('data-drag')).toBe(true)
  expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-drag'))).toEqual([])
})

test('without a host the bar is a plain top bar: no drag mark, no window buttons', () => {
  render(<TitleBar><Bar /></TitleBar>)
  const bar = screen.getByRole('banner')
  expect(bar.hasAttribute('data-window-controls')).toBe(false)
  expect(bar.querySelector('[data-slot="window-controls"]')).toBeNull()
})

test('the window buttons only call the app back, are drawn only with an action, and say «Restore» once maximized', () => {
  const minimize = vi.fn()
  const toggle = vi.fn()
  const close = vi.fn()
  const { rerender } = render(<WindowControls onMinimize={minimize} onMaximizeToggle={toggle} onClose={close} />)
  fireEvent.click(screen.getByRole('button', { name: 'Minimize' }))
  fireEvent.click(screen.getByRole('button', { name: 'Maximize' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect([minimize, toggle, close].map((f) => f.mock.calls.length)).toEqual([1, 1, 1])
  rerender(<WindowControls maximized onMaximizeToggle={toggle} onClose={close} />)
  expect(screen.queryByRole('button', { name: 'Minimize' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()
  rerender(
    <WordsProvider words={{ window: { close: 'Chiudi' } }}>
      <WindowControls onClose={close} />
    </WordsProvider>,
  )
  expect(screen.getByRole('button', { name: 'Chiudi' })).toBeTruthy()
})

test('a word beside an icon gives way on a narrow bar unless it is kept, and the search can rest as a field with its key', () => {
  render(
    <Toolbar aria-label="Mail">
      <ToolbarButton label="New message" icon={<svg />}>New</ToolbarButton>
      <ToolbarButton label="Send" icon={<svg />} keepWord>Send</ToolbarButton>
      <ToolbarButton label="Help">Help</ToolbarButton>
      <ToolbarSearch closed="field" label="Search the mail" shortcut="Ctrl K" value="" onValueChange={() => {}} />
    </Toolbar>,
  )
  expect(screen.getByRole('toolbar').className).toContain('@container/toolbar')
  expect(screen.getByText('New').closest('[data-slot="toolbar-button-word"]')?.className).toContain('@max-md/toolbar:hidden')
  expect(screen.getByText('Send').closest('[data-slot="toolbar-button-word"]')).toBeNull()
  expect(screen.getByText('Help').closest('[data-slot="toolbar-button-word"]')).toBeNull()
  const field = screen.getByRole('button', { name: 'Search the mail' })
  expect(field.textContent).toBe('Search the mailCtrl K')
  fireEvent.click(field)
  expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search the mail' }))
})

test('a host that owns the pointer over the maximize button gets the button and shows its own hover on it', () => {
  let button: HTMLButtonElement | null = null
  render(<WindowControls onMaximizeToggle={() => {}} onClose={() => {}} maximizeRef={(el) => { button = el }} maximizeState="hover" />)
  expect(button).toBe(screen.getByRole('button', { name: 'Maximize' }))
  expect(button!.getAttribute('data-os-state')).toBe('hover')
  // Closing destroys nothing: the accent, not the red.
  expect(screen.getByRole('button', { name: 'Close' }).className).not.toContain('destructive')
})

test('the brand is the mark with the initial of the name and the name beside it, and both move the window', () => {
  expect(brandInitial('  xiox')).toBe('X')
  expect(brandInitial('3 émile')).toBe('É')
  expect(brandInitial('42')).toBe('')
  render(
    <TitleBar dragProps={{ 'data-drag': '' }}>
      <Toolbar aria-label="Xiox">
        <ToolbarBrand name="Xiox" />
      </Toolbar>
    </TitleBar>,
  )
  const mark = document.querySelector('[data-slot="toolbar-brand-mark"]')!
  expect(mark.textContent).toBe('X')
  expect(mark.getAttribute('aria-hidden')).toBe('true')
  expect(mark.className).toContain('bg-primary')
  expect(document.querySelector('[data-slot="toolbar-brand-name"]')?.textContent).toBe('Xiox')
  expect(document.querySelectorAll('[data-slot^="toolbar-brand"][data-drag]').length).toBe(3)
})

test('the brand can be the name alone', () => {
  render(<Toolbar aria-label="Xiox"><ToolbarBrand name="Xiox" mark={false} /></Toolbar>)
  expect(document.querySelector('[data-slot="toolbar-brand-mark"]')).toBeNull()
  expect(document.querySelector('[data-slot="toolbar-brand-name"]')?.textContent).toBe('Xiox')
})
