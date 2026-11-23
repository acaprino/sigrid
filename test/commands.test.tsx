// The registry of an app's commands (`CommandsProvider`, `useCommand`): a command declared once runs on its key from
// anywhere in the window, but a key that belongs to what has the focus is left there (a field, a control, an open
// surface, a widget that handled it, a place that keeps its own keys); one that cannot be done now does not run and the
// palette shows it dimmed; the palette with no list shows the registry's commands in their order and Ctrl+K opens it.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { CommandPalette, CommandsProvider, PALETTE_COMMAND, formatKeys, useCommand, useCommands } from '../src'

// The dialog opens and closes in a frame of its own, as in a browser.
const flush = () => act(async () => { await new Promise((done) => setTimeout(done, 30)) })
const platform = Object.getOwnPropertyDescriptor(window.navigator, 'platform')
afterEach(() => {
  if (platform) Object.defineProperty(window.navigator, 'platform', platform)
  else delete (window.navigator as { platform?: string }).platform
})

function Declares({ id, label, keys, group, when = true, run }: { id: string; label: string; keys?: string; group?: string; when?: boolean; run: () => void }) {
  useCommand({ id, label, keys, group, when, run })
  return null
}

test('a key runs its command from anywhere; in a field a plain key is the field\'s, Escape, a combination and a function key are not', () => {
  const search = vi.fn()
  const close = vi.fn()
  const next = vi.fn()
  const back = vi.fn()
  render(
    <CommandsProvider>
      <Declares id="search" label="Search in this view" keys="Ctrl+F" run={search} />
      <Declares id="close" label="Close the detail" keys="Escape" run={close} />
      <Declares id="next" label="Next region" keys="F6" run={next} />
      <Declares id="back" label="Back" keys="Alt+ArrowLeft" run={back} />
      <input aria-label="Field" />
      <p>Text</p>
    </CommandsProvider>,
  )
  const text = screen.getByText('Text')
  fireEvent.keyDown(text, { key: 'f', ctrlKey: true })
  fireEvent.keyDown(text, { key: 'f' })
  fireEvent.keyDown(text, { key: 'Escape' })
  expect(search).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledTimes(1)
  const field = screen.getByRole('textbox', { name: 'Field' })
  fireEvent.keyDown(field, { key: 'Escape' })
  fireEvent.keyDown(field, { key: 'f', ctrlKey: true })
  fireEvent.keyDown(field, { key: 'F6' })
  // Alt with an arrow moves the caret in a field.
  fireEvent.keyDown(field, { key: 'ArrowLeft', altKey: true })
  expect(close).toHaveBeenCalledTimes(2)
  expect(search).toHaveBeenCalledTimes(2)
  expect(next).toHaveBeenCalledTimes(1)
  expect(back).not.toHaveBeenCalled()
  fireEvent.keyDown(text, { key: 'ArrowLeft', altKey: true })
  expect(back).toHaveBeenCalledTimes(1)
})

test('a key a widget handled, Enter on a button and a plain key in an open surface are theirs; a combination still runs there', () => {
  const enter = vi.fn()
  const close = vi.fn()
  const palette = vi.fn()
  render(
    <CommandsProvider palette={false}>
      <Declares id="enter" label="Open" keys="Enter" run={enter} />
      <Declares id="close" label="Close" keys="Escape" run={close} />
      <Declares id="search" label="Search" keys="Ctrl+F" run={palette} />
      <button type="button">Button</button>
      <div role="dialog" aria-label="Details">
        <p>Inside</p>
      </div>
      <p onKeyDown={(event) => event.preventDefault()}>Widget</p>
    </CommandsProvider>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Button' }), { key: 'Enter' })
  fireEvent.keyDown(screen.getByText('Widget'), { key: 'Escape' })
  fireEvent.keyDown(screen.getByText('Inside'), { key: 'Escape' })
  expect(enter).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByText('Inside'), { key: 'f', ctrlKey: true })
  expect(palette).toHaveBeenCalledTimes(1)
})

test('a place that keeps its own keys gets them; a command not available now does not run, one no longer mounted is gone', () => {
  const run = vi.fn()
  const search = vi.fn()
  function Detail() {
    const [open, setOpen] = useState(false)
    useCommand({ id: 'close', label: 'Close the detail', keys: 'Escape', when: open, run })
    return (
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
    )
  }
  const { rerender } = render(
    <CommandsProvider ownKeysIn="[data-terminal]">
      <Declares id="search" label="Search" keys="Ctrl+F" run={search} />
      <div data-terminal="" tabIndex={0}>
        Terminal
      </div>
      <Detail />
    </CommandsProvider>,
  )
  fireEvent.keyDown(screen.getByText('Terminal'), { key: 'f', ctrlKey: true })
  expect(search).not.toHaveBeenCalled()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).toHaveBeenCalledTimes(1)
  rerender(<CommandsProvider>{null}</CommandsProvider>)
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).toHaveBeenCalledTimes(1)
})

test('signs, digits and letters are found on any keyboard: +, Shift+?, a digit typed with Shift, Cyrillic, AltGr', () => {
  const plus = vi.fn()
  const help = vi.fn()
  const first = vi.fn()
  const palette = vi.fn()
  const at = vi.fn()
  render(
    <CommandsProvider palette={false}>
      <Declares id="plus" label="Zoom in" keys="Ctrl++" run={plus} />
      <Declares id="help" label="Keys" keys="Shift+?" run={help} />
      <Declares id="first" label="First view" keys="Ctrl+1" run={first} />
      <Declares id="k" label="Commands" keys="Ctrl+K" run={palette} />
      <Declares id="at" label="Mention" keys="@" run={at} />
    </CommandsProvider>,
  )
  fireEvent.keyDown(document.body, { key: '+', ctrlKey: true, shiftKey: true })
  fireEvent.keyDown(document.body, { key: '?', shiftKey: true })
  // On AZERTY the digit takes Shift.
  fireEvent.keyDown(document.body, { key: '1', code: 'Digit1', ctrlKey: true, shiftKey: true })
  // A Cyrillic layout writes «л» on the place of K.
  fireEvent.keyDown(document.body, { key: 'л', code: 'KeyK', ctrlKey: true })
  // AltGr: Ctrl and Alt as the system reports them, a sign written.
  fireEvent.keyDown(document.body, { key: '@', ctrlKey: true, altKey: true, modifierAltGraph: true } as KeyboardEventInit)
  expect([plus, help, first, palette].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1, 1])
  expect(at).toHaveBeenCalledTimes(1)
})

test('on a Mac, Ctrl is the Command key and Control is the system\'s', async () => {
  Object.defineProperty(window.navigator, 'platform', { value: 'MacIntel', configurable: true })
  const search = vi.fn()
  let seen: readonly { id: string; shortcut: string | undefined }[] = []
  function Reads() {
    seen = useCommands()
    return null
  }
  render(
    <CommandsProvider>
      <Declares id="search" label="Search" keys="Ctrl+F" run={search} />
      <Reads />
    </CommandsProvider>,
  )
  await flush()
  fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true })
  expect(search).not.toHaveBeenCalled()
  fireEvent.keyDown(document.body, { key: 'f', metaKey: true })
  expect(search).toHaveBeenCalledTimes(1)
  expect(seen.find((command) => command.id === 'search')?.shortcut).toBe('Cmd F')
})

test('Ctrl+K opens the palette: the commands in their order, by group, the one not available dimmed; a choice runs the latest and closes it', async () => {
  const ran: number[] = []
  function Counter() {
    const [count, setCount] = useState(0)
    useCommand({ id: 'count', label: 'Say the count', group: 'Find', keys: 'Ctrl+F', run: () => ran.push(count) })
    return (
      <button type="button" onClick={() => setCount(count + 1)}>
        More
      </button>
    )
  }
  render(
    <CommandsProvider>
      <Declares id="logical" label="Logical view" group="View" run={() => {}} />
      <Counter />
      <Declares id="physical" label="Physical view" group="View" run={() => {}} />
      <Declares id="close" label="Close the detail" keys="Escape" when={false} run={() => {}} />
      <CommandPalette />
    </CommandsProvider>,
  )
  fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })
  await flush()
  const options = screen.getAllByRole('option')
  expect(options.map((option) => option.textContent)).toEqual(['Logical view', 'Physical view', 'Say the countCtrl F', 'Close the detailEscape'])
  expect(options[3]!.getAttribute('aria-disabled')).toBe('true')
  // The palette's own command is not in it.
  expect(options.some((option) => option.textContent?.startsWith('Commands'))).toBe(false)
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  await flush()
  fireEvent.click(screen.getByRole('button', { name: 'More' }))
  fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })
  await flush()
  fireEvent.click(screen.getByRole('option', { name: /Say the count/ }))
  await flush()
  expect(ran).toEqual([1])
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('the registry holds Ctrl+K under the toolkit\'s word, first; palette={false} leaves Ctrl+K to the app; keys are written in the words of the system', () => {
  let seen: readonly { id: string; label: string; shortcut: string | undefined }[] = []
  function Reads() {
    seen = useCommands()
    return null
  }
  const { rerender } = render(
    <CommandsProvider>
      <Declares id="search" label="Search" keys="Ctrl+F" run={() => {}} />
      <Reads />
    </CommandsProvider>,
  )
  expect(seen[0]).toMatchObject({ id: PALETTE_COMMAND, label: 'Commands', shortcut: 'Ctrl K' })
  rerender(
    <CommandsProvider palette={false}>
      <Declares id="search" label="Search" keys="Ctrl+F" run={() => {}} />
      <Reads />
    </CommandsProvider>,
  )
  expect(seen.some((command) => command.id === PALETTE_COMMAND)).toBe(false)
  expect(formatKeys('Ctrl+Shift+t', false)).toBe('Ctrl Shift T')
  expect(formatKeys('Ctrl+K', true)).toBe('Cmd K')
  expect(formatKeys('Alt+F4', true)).toBe('Option F4')
  expect(formatKeys('Ctrl++', false)).toBe('Ctrl +')
  expect(formatKeys('Escape', false)).toBe('Escape')
  expect(formatKeys('Ctrl+F', false, { ctrl: 'Strg', cmd: 'Cmd', alt: 'Alt', option: 'Option', shift: 'Umschalt' })).toBe('Strg F')
})
