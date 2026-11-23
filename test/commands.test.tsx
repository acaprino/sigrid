// The registry of an app's commands (`CommandsProvider`, `useCommand`): a command declared once runs on its key from
// anywhere in the window, but not while the person types in a field (unless the key holds Ctrl or Alt or is a function
// key), not inside an open surface, not where a place keeps its own keys; one that cannot be done now neither runs nor
// shows; the palette with no list shows the registry's commands and Ctrl+K opens it.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { CommandPalette, CommandsProvider, PALETTE_COMMAND, formatKeys, useCommand, useCommands } from '../src'

// The dialog opens and closes in a frame of its own, as in a browser.
const flush = () => act(async () => { await new Promise((done) => setTimeout(done, 30)) })

function Declares({ id, label, keys, group, when = true, run }: { id: string; label: string; keys?: string; group?: string; when?: boolean; run: () => void }) {
  useCommand({ id, label, keys, group, when, run })
  return null
}

test('a key runs its command from anywhere; a plain key is left to a field, a combination and a function key are not', () => {
  const search = vi.fn()
  const close = vi.fn()
  const next = vi.fn()
  render(
    <CommandsProvider>
      <Declares id="search" label="Search in this view" keys="Ctrl+F" run={search} />
      <Declares id="close" label="Close the detail" keys="Escape" run={close} />
      <Declares id="next" label="Next region" keys="F6" run={next} />
      <input aria-label="Field" />
      <p>Text</p>
    </CommandsProvider>,
  )
  const text = screen.getByText('Text')
  fireEvent.keyDown(text, { key: 'f', ctrlKey: true })
  fireEvent.keyDown(text, { key: 'Escape' })
  expect(search).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledTimes(1)
  // A letter alone is not Ctrl+F.
  fireEvent.keyDown(text, { key: 'f' })
  expect(search).toHaveBeenCalledTimes(1)
  const field = screen.getByRole('textbox', { name: 'Field' })
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(field, { key: 'f', ctrlKey: true })
  fireEvent.keyDown(field, { key: 'F6' })
  expect(search).toHaveBeenCalledTimes(2)
  expect(next).toHaveBeenCalledTimes(1)
})

test('a command that cannot be done now does not run, and one that is no longer mounted is gone', () => {
  const run = vi.fn()
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
    <CommandsProvider>
      <Detail />
    </CommandsProvider>,
  )
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).toHaveBeenCalledTimes(1)
  rerender(<CommandsProvider>{null}</CommandsProvider>)
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(run).toHaveBeenCalledTimes(1)
})

test('an open surface keeps its keys, and so does a place that claims its own', () => {
  const run = vi.fn()
  render(
    <CommandsProvider ownKeysIn="[data-terminal]">
      <Declares id="search" label="Search" keys="Ctrl+F" run={run} />
      <div role="dialog" aria-label="Settings">
        <button type="button">In the dialog</button>
      </div>
      <div data-terminal="" tabIndex={0}>
        Terminal
      </div>
    </CommandsProvider>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'In the dialog' }), { key: 'f', ctrlKey: true })
  fireEvent.keyDown(screen.getByText('Terminal'), { key: 'f', ctrlKey: true })
  expect(run).not.toHaveBeenCalled()
})

test('Ctrl+K opens the palette, which lists what can be done now, by group, with its keys; a choice runs and closes it', async () => {
  const search = vi.fn()
  render(
    <CommandsProvider>
      <Declares id="logical" label="Logical view" group="View" run={() => {}} />
      <Declares id="search" label="Search in this view" group="Find" keys="Ctrl+F" run={search} />
      <Declares id="physical" label="Physical view" group="View" run={() => {}} />
      <Declares id="hidden" label="Close the detail" keys="Escape" when={false} run={() => {}} />
      <CommandPalette />
    </CommandsProvider>,
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })
  await flush()
  expect(screen.getByRole('dialog')).toBeTruthy()
  const options = screen.getAllByRole('option').map((option) => option.textContent)
  // The palette's own command is not in it; the one not available now is not either; a group stays together.
  expect(options).toEqual(['Logical view', 'Physical view', 'Search in this viewCtrl F'])
  fireEvent.click(screen.getByRole('option', { name: /Search in this view/ }))
  await flush()
  expect(search).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('the registry holds Ctrl+K under the toolkit\'s word, and keys are written in the words of the system', () => {
  let seen: readonly { id: string; label: string; shortcut: string | undefined }[] = []
  function Reads() {
    seen = useCommands()
    return null
  }
  render(
    <CommandsProvider>
      <Reads />
    </CommandsProvider>,
  )
  expect(seen.find((command) => command.id === PALETTE_COMMAND)).toMatchObject({ label: 'Commands', shortcut: 'Ctrl K' })
  expect(formatKeys('Ctrl+Shift+t', false)).toBe('Ctrl Shift T')
  expect(formatKeys('Ctrl+K', true)).toBe('Cmd K')
  expect(formatKeys('Alt+F4', true)).toBe('Option F4')
  expect(formatKeys('Escape', false)).toBe('Escape')
})
