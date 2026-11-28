// A dialog puts the focus on its first control when it opens, once: typing in it (a render of its content) leaves the
// focus where it is, and when it closes the focus goes back to the button that opened it and stays there.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { expect, test } from 'vitest'
import { Dialog } from '../src/components'

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

function Host() {
  const opener = React.useRef<HTMLButtonElement>(null)
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [note, setNote] = React.useState('')
  return (
    <>
      <button ref={opener} onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onOpenChange={setOpen} title="Rename" restoreFocusTo={opener}>
        <input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <input aria-label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      </Dialog>
    </>
  )
}

test('typing in the second field of an open dialog keeps the focus there', async () => {
  render(<Host />)
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  const note = await screen.findByRole('textbox', { name: 'Note' })
  await settle()
  await act(async () => note.focus())
  fireEvent.change(note, { target: { value: 'a' } })
  await settle()
  fireEvent.change(note, { target: { value: 'ab' } })
  await settle()
  expect(document.activeElement).toBe(note)
})

test('Esc closes the dialog and the focus goes back to its opener, and stays there', async () => {
  render(<Host />)
  const opener = screen.getByRole('button', { name: 'Open' })
  await act(async () => opener.focus())
  fireEvent.click(opener)
  const dialog = await screen.findByRole('dialog')
  await settle()
  fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await settle()
  await settle()
  expect(document.activeElement).toBe(opener)
})
