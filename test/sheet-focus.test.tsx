// A sheet's `initialFocus` is where the focus goes when the sheet opens, once: typing in another field of the sheet (a
// render of its content) leaves the focus in that field.
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { expect, test } from 'vitest'
import { Sheet, SheetContent, SheetTitle } from '../src/primitives'

function Host() {
  const title = React.useRef<HTMLInputElement>(null)
  const [notes, setNotes] = React.useState('')
  return (
    <Sheet open>
      <SheetContent initialFocus={title}>
        <SheetTitle>Task</SheetTitle>
        <input ref={title} aria-label="Title" defaultValue="Call Anna" />
        <textarea aria-label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </SheetContent>
    </Sheet>
  )
}

test('the sheet opens on its initial field, and typing in another field keeps the focus there', async () => {
  render(<Host />)
  const title = await screen.findByRole('textbox', { name: 'Title' })
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(document.activeElement).toBe(title)
  const notes = screen.getByRole('textbox', { name: 'Notes' })
  await act(async () => notes.focus())
  fireEvent.change(notes, { target: { value: 'a' } })
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
  fireEvent.change(notes, { target: { value: 'ab' } })
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(document.activeElement).toBe(notes)
  expect((notes as HTMLTextAreaElement).value).toBe('ab')
})
