import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Select } from '../src/components/ui/select'

const noop = () => {}
afterEach(() => vi.useRealTimers())

const OPTS = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

// A real mouse click: Base UI picks an item only if the pointer went down on it (a synthetic `click` without
// `pointerdown`, `detail` 0, counts as a virtual click and picks only the highlighted item).
async function mouseClick(el: Element) {
  fireEvent.pointerDown(el, { pointerType: 'mouse', button: 0 })
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.pointerUp(el, { pointerType: 'mouse', button: 0 })
  fireEvent.mouseUp(el, { button: 0 })
  fireEvent.click(el, { button: 0, detail: 1 })
  await flush()
}

async function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key })
  await flush()
}

test('accessible name, shown value, opening with a click and picking with the mouse', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="doing" onValueChange={onValueChange} />)
  const trigger = screen.getByRole('combobox', { name: 'Status' })
  expect(trigger.textContent).toContain('In progress')
  fireEvent.click(trigger)
  await flush()
  const listbox = await screen.findByRole('listbox')
  expect(listbox).toBeTruthy()
  await mouseClick(screen.getByRole('option', { name: 'Done' }))
  expect(onValueChange).toHaveBeenCalledWith('done')
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('keyboard: arrow down opens, arrow down moves, Enter picks and closes', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="todo" onValueChange={onValueChange} />)
  const trigger = screen.getByRole('combobox', { name: 'Status' })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  await flush()
  await screen.findByRole('listbox')
  await press('ArrowDown')
  await press('Enter')
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(onValueChange).toHaveBeenCalledWith('doing')
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('type-ahead: with the list open “d” highlights “Done” and Enter picks it', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="todo" onValueChange={onValueChange} />)
  const trigger = screen.getByRole('combobox', { name: 'Status' })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  await flush()
  await screen.findByRole('listbox')
  await press('d')
  expect(screen.getByRole('option', { name: 'Done' }).hasAttribute('data-highlighted')).toBe(true)
  await press('Enter')
  expect(onValueChange).toHaveBeenCalledTimes(1)
  expect(onValueChange).toHaveBeenCalledWith('done')
})

test('picking the already chosen item does not call onValueChange', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="doing" onValueChange={onValueChange} />)
  fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))
  await flush()
  await screen.findByRole('listbox')
  await mouseClick(screen.getByRole('option', { name: 'In progress' }))
  expect(onValueChange).not.toHaveBeenCalled()
})

test('keyboard: arrow opens, Esc closes without picking', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="todo" onValueChange={onValueChange} />)
  const trigger = screen.getByRole('combobox', { name: 'Status' })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  await flush()
  await screen.findByRole('listbox')
  fireEvent.keyDown(document.activeElement ?? trigger, { key: 'Escape' })
  await flush()
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(onValueChange).not.toHaveBeenCalled()
})

test('renderMark draws the app\'s mark before the label of each option in the list; without it there is none', async () => {
  type Marked = { value: string; label: string; tone?: string }
  const options: Marked[] = [{ value: 'a', label: 'Alpha', tone: 'warm' }, { value: 'b', label: 'Beta' }]
  const { unmount } = render(
    <Select<Marked> aria-label="Place" options={options} value="a" onValueChange={noop} renderMark={(o) => (o.tone ? <span data-testid="mark" aria-hidden="true">{o.tone}</span> : null)} />,
  )
  fireEvent.click(screen.getByRole('combobox', { name: 'Place' }))
  await flush()
  const listbox = await screen.findByRole('listbox')
  const alpha = within(listbox).getByRole('option', { name: 'Alpha' })
  expect(within(alpha).getByTestId('mark').textContent).toBe('warm')
  expect(within(within(listbox).getByRole('option', { name: 'Beta' })).queryByTestId('mark')).toBeNull()
  unmount()
  render(<Select aria-label="Plain" options={options} value="a" onValueChange={noop} />)
  fireEvent.click(screen.getByRole('combobox', { name: 'Plain' }))
  await flush()
  expect(within(await screen.findByRole('listbox')).queryByTestId('mark')).toBeNull()
})

test('disabled: Base UI disabled (no opening, out of the Tab order) with the standard disabled look', async () => {
  const onValueChange = vi.fn()
  render(<Select aria-label="Status" options={OPTS} value="doing" onValueChange={onValueChange} disabled />)
  const trigger = screen.getByRole('combobox', { name: 'Status' })
  expect(trigger.className.split(' ')).toEqual(expect.arrayContaining(['opacity-50', 'pointer-events-none', 'cursor-not-allowed']))
  expect(trigger.hasAttribute('data-disabled')).toBe(true)
  expect(trigger.tabIndex).toBe(-1)
  fireEvent.click(trigger)
  await flush()
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(onValueChange).not.toHaveBeenCalled()
})

test('invalid: aria-invalid and the destructive border, also while open; without it the light divider border', async () => {
  const { rerender } = render(<Select aria-label="Status" options={OPTS} value="doing" onValueChange={noop} />)
  const trigger = () => screen.getByRole('combobox', { name: 'Status' })
  expect(trigger().getAttribute('aria-invalid')).toBeNull()
  expect(trigger().className.split(' ')).toEqual(expect.arrayContaining(['border-line', 'data-[popup-open]:border-ink']))
  expect(trigger().className).not.toMatch(/destructive|opacity-50/)
  rerender(<Select aria-label="Status" options={OPTS} value="doing" onValueChange={noop} invalid />)
  expect(trigger().getAttribute('aria-invalid')).toBe('true')
  expect(trigger().className.split(' ')).toContain('border-destructive')
  // The open state does not paint the ink over the invalid border.
  expect(trigger().className).not.toContain('data-[popup-open]:border-ink')
  // Still usable: it opens and picks.
  fireEvent.click(trigger())
  await flush()
  expect(await screen.findByRole('listbox')).toBeTruthy()
})
