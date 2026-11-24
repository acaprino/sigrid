// A field for text with a little form (`RichTextField`, the `./rich-text` entry, on TipTap). Here: what it is for
// screen readers, that its buttons change the text and say when they are on, that the value goes out as HTML and
// comes in from outside, and that what the row of buttons does not offer is not in the field. How it looks and how
// it is typed in are checked in a browser, on the showcase (section «Rich text»).
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { FormField } from '../src/components'
import { RichTextField } from '../src/rich-text'

// ProseMirror asks where the caret is to keep it in sight; jsdom lays nothing out and has no such answers.
const NO_RECTS = { length: 0, item: () => null, [Symbol.iterator]: function* () {} }
for (const proto of [Range.prototype, Element.prototype] as { getClientRects?: unknown; getBoundingClientRect?: unknown }[]) {
  if (typeof proto.getClientRects !== 'function') Object.defineProperty(proto, 'getClientRects', { value: () => NO_RECTS, configurable: true })
  if (typeof proto.getBoundingClientRect !== 'function') Object.defineProperty(proto, 'getBoundingClientRect', { value: () => new DOMRect(), configurable: true })
}
if (typeof document.elementFromPoint !== 'function') Object.defineProperty(document, 'elementFromPoint', { value: () => null, configurable: true })

function Field({ start, onChange }: { start: string; onChange?: (html: string) => void }) {
  const [value, setValue] = React.useState(start)
  return (
    <RichTextField
      aria-label="Notes"
      value={value}
      onChange={(html) => {
        setValue(html)
        onChange?.(html)
      }}
    />
  )
}

/** Every word of the text chosen, as with Ctrl+A. */
function selectAll(box: HTMLElement) {
  act(() => {
    box.focus()
    const range = document.createRange()
    range.selectNodeContents(box)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
}

test('the text is a text box with the name it is given, and a row of buttons with their own names', async () => {
  render(<Field start="<p>Call the bank</p>" />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  expect(box.getAttribute('aria-multiline')).toBe('true')
  expect(box.textContent).toBe('Call the bank')
  const bar = screen.getByRole('toolbar', { name: 'Text format' })
  expect(Array.from(bar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual(['Bold', 'Italic', 'Underline', 'Bulleted list', 'Numbered list', 'Quote', 'Undo', 'Redo'])
  // Nothing to take back yet: the button stays in the arrows' path, and says it does nothing.
  expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('aria-disabled')).toBe('true')
})

test('a button changes the chosen text, the value goes out as HTML, and the button says it is on', async () => {
  const changed = vi.fn()
  render(<Field start="<p>Call the bank</p>" onChange={changed} />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  selectAll(box)
  const bold = screen.getByRole('button', { name: 'Bold' })
  expect(bold.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(bold)
  await waitFor(() => expect(changed).toHaveBeenLastCalledWith('<p><strong>Call the bank</strong></p>'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe('true'))
  expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('aria-disabled')).not.toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Bulleted list' }))
  await waitFor(() => expect(changed).toHaveBeenLastCalledWith('<ul><li><p><strong>Call the bank</strong></p></li></ul>'))
})

test('what the buttons do not offer is not kept: a heading, code and a link come in as plain text', async () => {
  render(<Field start={'<h1>Title</h1><p><code>x</code> <a href="https://example.com">link</a> <s>old</s></p>'} />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  expect(box.querySelector('h1, code, a, s')).toBeNull()
  expect(box.textContent).toBe('Titlex link old')
})

test('a value from outside takes the place of the text, without a change being told', async () => {
  const changed = vi.fn()
  function Draft() {
    const [value, setValue] = React.useState('<p>First</p>')
    return (
      <>
        <button type="button" onClick={() => setValue('<p>Second</p>')}>
          Open another
        </button>
        <RichTextField aria-label="Notes" value={value} onChange={changed} />
      </>
    )
  }
  render(<Draft />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  fireEvent.click(screen.getByRole('button', { name: 'Open another' }))
  await waitFor(() => expect(box.textContent).toBe('Second'))
  expect(changed).not.toHaveBeenCalled()
})

test('a value from outside is not a step of the undo: Ctrl+Z does not bring the draft before it back', async () => {
  const changed = vi.fn()
  function Draft() {
    const [value, setValue] = React.useState('<p>Draft A</p>')
    return (
      <>
        <button type="button" onClick={() => setValue('<p>Draft B</p>')}>
          Open B
        </button>
        <RichTextField
          aria-label="Notes"
          value={value}
          onChange={(html) => {
            changed(html)
            setValue(html)
          }}
        />
      </>
    )
  }
  render(<Draft />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  fireEvent.click(screen.getByRole('button', { name: 'Open B' }))
  await waitFor(() => expect(box.textContent).toBe('Draft B'))
  // Nothing to take back: the button is off, and the key does nothing.
  expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('aria-disabled')).toBe('true')
  fireEvent.keyDown(box, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(box.textContent).toBe('Draft B')
  expect(changed).not.toHaveBeenCalled()
})

test('a value of its own that the app hands back late does not take the place of what was written since', async () => {
  // An app that keeps the value somewhere slow: what the field gave comes back as `value` only later.
  let hand: (html: string) => void = () => {}
  const given: string[] = []
  function Slow() {
    const [value, setValue] = React.useState('<p>One</p>')
    hand = setValue
    return <RichTextField aria-label="Notes" value={value} onChange={(html) => given.push(html)} />
  }
  render(<Slow />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  selectAll(box)
  fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
  fireEvent.click(screen.getByRole('button', { name: 'Italic' }))
  await waitFor(() => expect(given).toHaveLength(2))
  expect(given[1]).toBe('<p><strong><em>One</em></strong></p>')
  // The first of the two comes back after the second was written: the text stays as it is.
  act(() => hand(given[0]!))
  expect(box.innerHTML).toContain('<em>One</em>')
  act(() => hand(given[1]!))
  expect(box.innerHTML).toContain('<em>One</em>')
  // A value that is not one of its own is from outside, and takes the place of the text.
  act(() => hand('<p>Two</p>'))
  await waitFor(() => expect(box.textContent).toBe('Two'))
})

test('in a FormField it is named by the label and described by the helper', async () => {
  render(
    <FormField label="Notes" help="Only you see them." required>
      <RichTextField value="" onChange={() => {}} />
    </FormField>,
  )
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  await waitFor(() => expect(box.getAttribute('aria-describedby')).toBeTruthy())
  expect(document.getElementById(box.getAttribute('aria-describedby')!.split(' ')[0]!)!.textContent).toBe('Only you see them.')
  expect(box.getAttribute('aria-required')).toBe('true')
})

test('disabled: no buttons, and the text cannot be changed', async () => {
  render(<RichTextField aria-label="Notes" value="<p>Sent</p>" onChange={() => {}} disabled />)
  const box = await screen.findByRole('textbox', { name: 'Notes' })
  expect(screen.queryByRole('toolbar')).toBeNull()
  await waitFor(() => expect(box.getAttribute('contenteditable')).toBe('false'))
  expect(box.getAttribute('aria-disabled')).toBe('true')
})

test("the words of the buttons are the app's", async () => {
  render(
    <WordsProvider words={{ richText: { bold: 'Grassetto', toolbar: 'Formato del testo' } }}>
      <RichTextField aria-label="Note" value="" onChange={() => {}} />
    </WordsProvider>,
  )
  await screen.findByRole('textbox', { name: 'Note' })
  expect(screen.getByRole('toolbar', { name: 'Formato del testo' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Grassetto' })).toBeTruthy()
})
