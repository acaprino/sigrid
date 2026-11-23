// The command palette (`CommandPalette`), the key that opens it (`useCommandKey`) and the view tabs of a toolbar
// (`ToolbarTabs`): quick access from the keyboard, and the views of an app as words in the bar.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { AppShell, CommandPalette, Toolbar, ToolbarButton, ToolbarTab, ToolbarTabs, filterCommands, useCommandKey, type Command } from '../src'
import { flush } from './helpers'

function commands(ran: string[]): Command[] {
  const make = (id: string, label: string, more: Partial<Command> = {}): Command => ({ id, label, onSelect: () => ran.push(id), ...more })
  return [
    make('find', 'Search in this view', { shortcut: 'Ctrl F' }),
    make('light', 'Light theme', { group: 'Look', keywords: 'bright day' }),
    make('dark', 'Dark theme', { group: 'Look', disabled: true }),
    make('cleanup', 'Go to Cleanup', { group: 'Go to', shortcut: '1' }),
    make('registry', 'Go to Registry', { group: 'Go to', shortcut: '2' }),
  ]
}

function App({ ran }: { ran: string[] }) {
  const [open, setOpen] = useState(false)
  useCommandKey(() => setOpen(true))
  return <CommandPalette open={open} onOpenChange={setOpen} commands={commands(ran)} />
}

test('a command is found by every word typed, in its name or its keywords', () => {
  const all = commands([])
  expect(filterCommands(all, 'go reg').map((c) => c.id)).toEqual(['registry'])
  expect(filterCommands(all, 'BRIGHT').map((c) => c.id)).toEqual(['light'])
  expect(filterCommands(all, '  ').length).toBe(5)
})

test('Ctrl+K opens the palette on its field, with the commands under their headings and their keys as plain text', async () => {
  render(<App ran={[]} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  await flush()
  expect(screen.getByRole('dialog', { name: 'Type a command' })).toBeTruthy()
  const field = screen.getByRole('combobox', { name: 'Type a command' })
  expect(document.activeElement).toBe(field)
  const options = screen.getAllByRole('option')
  expect(options.map((o) => o.textContent)).toEqual(['Search in this viewCtrl F', 'Light theme', 'Dark theme', 'Go to Cleanup1', 'Go to Registry2'])
  expect(options[0]!.getAttribute('aria-selected')).toBe('true')
  expect(field.getAttribute('aria-activedescendant')).toBe(options[0]!.id)
  expect(screen.getByText('Go to').getAttribute('role')).toBe('presentation')
})

test('the arrows move over the commands that can run, typing narrows them, and Enter runs one and closes the palette', async () => {
  const ran: string[] = []
  render(<App ran={ran} />)
  fireEvent.keyDown(window, { key: 'K', metaKey: true })
  await flush()
  const field = screen.getByRole('combobox')
  const selected = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.textContent
  fireEvent.keyDown(field, { key: 'ArrowDown' })
  fireEvent.keyDown(field, { key: 'ArrowDown' })
  // «Dark theme» cannot run: the arrows pass over it.
  expect(selected()).toBe('Go to Cleanup1')
  fireEvent.keyDown(field, { key: 'ArrowUp' })
  expect(selected()).toBe('Light theme')
  fireEvent.keyDown(field, { key: 'End' })
  expect(selected()).toBe('Go to Registry2')
  fireEvent.keyDown(field, { key: 'ArrowDown' })
  expect(selected()).toBe('Search in this viewCtrl F')
  fireEvent.change(field, { target: { value: 'go' } })
  expect(screen.getAllByRole('option').length).toBe(2)
  expect(selected()).toBe('Go to Cleanup1')
  fireEvent.keyDown(field, { key: 'Enter' })
  await flush()
  expect(ran).toEqual(['cleanup'])
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('with an IME, Enter that confirms a candidate runs nothing and keeps the palette open', async () => {
  const ran: string[] = []
  render(<App ran={ran} />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  await flush()
  const field = screen.getByRole('combobox')
  fireEvent.keyDown(field, { key: 'Enter', isComposing: true })
  await flush()
  expect(ran).toEqual([])
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.keyDown(field, { key: 'Enter' })
  await flush()
  expect(ran).toEqual(['find'])
})

test('a press runs a command, a disabled one does nothing, and no match says so', async () => {
  const ran: string[] = []
  render(<App ran={ran} />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  await flush()
  fireEvent.click(screen.getByRole('option', { name: 'Dark theme' }))
  expect(ran).toEqual([])
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } })
  expect(screen.getByRole('status').textContent).toBe('No command found')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'registry' } })
  fireEvent.click(screen.getByRole('option', { name: /Go to Registry/ }))
  await flush()
  expect(ran).toEqual(['registry'])
})

test('the key alone, or with Shift or Alt, does not open the palette', () => {
  const pressed = vi.fn()
  function Key() {
    useCommandKey(pressed)
    return null
  }
  render(<Key />)
  fireEvent.keyDown(window, { key: 'k' })
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true, shiftKey: true })
  expect(pressed).not.toHaveBeenCalled()
})

test('the views of an app are words in the bar: the one the user is in is the current page, with the accent bar under it', () => {
  function Views() {
    const [view, setView] = useState('cleanup')
    return (
      <Toolbar aria-label="Xiox">
        <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
          <ToolbarTab value="cleanup">Cleanup</ToolbarTab>
          <ToolbarTab value="registry">Registry</ToolbarTab>
        </ToolbarTabs>
        <ToolbarButton label="Commands" shortcut="Ctrl K" icon={<svg />}>Commands</ToolbarButton>
      </Toolbar>
    )
  }
  render(<Views />)
  expect(screen.getByRole('group', { name: 'Views' })).toBeTruthy()
  const cleanup = screen.getByRole('button', { name: 'Cleanup' })
  const registry = screen.getByRole('button', { name: 'Registry' })
  expect(cleanup.getAttribute('aria-current')).toBe('page')
  expect(cleanup.className).toContain('aria-[current=page]:after:bg-primary')
  fireEvent.click(registry)
  expect(registry.getAttribute('aria-current')).toBe('page')
  expect(cleanup.hasAttribute('aria-current')).toBe(false)
  // A button with a word shows its key after the word.
  expect(screen.getByRole('button', { name: 'Commands' }).textContent).toBe('CommandsCtrl K')
})

test('the frame has a row for the views directly under the bar', () => {
  render(<AppShell contentLabel="Page" titleBar={<header>Bar</header>} tabs={<span>Views</span>}>Text</AppShell>)
  const row = document.querySelector('[data-slot="app-shell-tabs"]')!
  expect(row.textContent).toBe('Views')
  // The row is the first thing under the bar.
  expect(row.parentElement?.previousElementSibling?.textContent).toBe('Bar')
  expect(row.parentElement?.firstElementChild).toBe(row)
})

test('tabs at the foot of the window have their accent bar on the upper edge, and stacked they share the bar with the icon over the word', () => {
  render(
    <AppShell
      contentLabel="Page"
      bottomBar={
        <Toolbar aria-label="Views">
          <ToolbarTabs aria-label="Views" value="a" onValueChange={() => {}} edge="top" layout="stacked">
            <ToolbarTab value="a" icon={<svg />}>List</ToolbarTab>
            <ToolbarTab value="b" icon={<svg />}>Board</ToolbarTab>
          </ToolbarTabs>
        </Toolbar>
      }
      footer={
        <Toolbar aria-label="Sheets">
          <ToolbarTabs aria-label="Sheets" value="x" onValueChange={() => {}} edge="top" size="sm">
            <ToolbarTab value="x">Sheet 1</ToolbarTab>
          </ToolbarTabs>
        </Toolbar>
      }
    >
      Text
    </AppShell>,
  )
  const bottom = document.querySelector('[data-slot="app-shell-bottom"]')!
  expect(bottom.previousElementSibling?.getAttribute('data-slot')).toBe('app-shell-body')
  const list = screen.getByRole('button', { name: 'List' })
  expect(list.className).toContain('after:top-0')
  expect(list.className).toContain('flex-col')
  expect(list.className).toContain('flex-1')
  const sheet = screen.getByRole('button', { name: 'Sheet 1' })
  expect(sheet.closest('[data-slot="app-shell-footer"]')).toBeTruthy()
  expect(sheet.className).toContain('text-2xs')
  expect(sheet.className).not.toContain('flex-col')
})
