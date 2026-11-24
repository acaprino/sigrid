// `EmailComposer` (the `./rich-text` entry): a message of mail being written. Here: its rows are named for screen
// readers, the copies stay behind a button until asked for or holding an address, the app holds the draft, a message
// that cannot go is not sent and says why in words, with the focus on «To», Ctrl+Enter sends, and the button waits
// while it is being sent. How the text is typed is `RichTextField`'s own test.
import { fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { EMPTY_EMAIL, EmailComposer, emailProblem, isEmailAddress, type EmailDraft } from '../src/rich-text'

// ProseMirror asks where the caret is to keep it in sight; jsdom lays nothing out and has no such answers.
const NO_RECTS = { length: 0, item: () => null, [Symbol.iterator]: function* () {} }
for (const proto of [Range.prototype, Element.prototype] as { getClientRects?: unknown; getBoundingClientRect?: unknown }[]) {
  if (typeof proto.getClientRects !== 'function') Object.defineProperty(proto, 'getClientRects', { value: () => NO_RECTS, configurable: true })
  if (typeof proto.getBoundingClientRect !== 'function') Object.defineProperty(proto, 'getBoundingClientRect', { value: () => new DOMRect(), configurable: true })
}
if (typeof document.elementFromPoint !== 'function') Object.defineProperty(document, 'elementFromPoint', { value: () => null, configurable: true })

function Composer({ start = EMPTY_EMAIL, onSend = () => {}, ...rest }: { start?: EmailDraft; onSend?: (draft: EmailDraft) => void; sending?: boolean; onDiscard?: () => void }) {
  const [draft, setDraft] = React.useState(start)
  return <EmailComposer value={draft} onChange={setDraft} onSend={onSend} {...rest} />
}
const READY: EmailDraft = { ...EMPTY_EMAIL, to: ['ada@example.com'], subject: 'Hello', html: '<p>Hi</p>' }

describe('the helpers', () => {
  test('an address has a name, an @ and a domain with a dot', () => {
    for (const good of ['ada@example.com', ' a.b+c@mail.example.org ']) expect(isEmailAddress(good), good).toBe(true)
    for (const bad of ['', 'ada', 'ada@', '@example.com', 'ada@example', 'a b@example.com', 'ada@example.']) expect(isEmailAddress(bad), bad).toBe(false)
  })

  test('a draft cannot go with nobody to send it to, or with an address that is not one', () => {
    expect(emailProblem(EMPTY_EMAIL)).toBe('noRecipient')
    expect(emailProblem({ ...EMPTY_EMAIL, bcc: ['ada@example.com'] })).toBeNull()
    expect(emailProblem({ ...READY, cc: ['grace'] })).toBe('badAddress')
  })
})

describe('EmailComposer', () => {
  test('a named form whose rows are named: To, the subject and the text; the copies come when asked for', () => {
    render(<Composer />)
    const form = screen.getByRole('form', { name: 'New message' })
    expect(within(form).getByLabelText('To')).toBeTruthy()
    expect(within(form).getByLabelText('Subject')).toBeTruthy()
    expect(within(form).getByRole('textbox', { name: 'Message' })).toBeTruthy()
    expect(within(form).queryByLabelText('Cc')).toBeNull()
    const copies = within(form).getByRole('button', { name: 'Cc, Bcc' })
    expect(copies.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(copies)
    expect(copies.getAttribute('aria-expanded')).toBe('true')
    expect(within(form).getByLabelText('Cc')).toBeTruthy()
    expect(within(form).getByLabelText('Bcc')).toBeTruthy()
  })

  test('copies that hold an address are shown, and their button cannot hide them', () => {
    render(<Composer start={{ ...READY, cc: ['grace@example.com'] }} />)
    expect(screen.getByLabelText('Cc')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cc, Bcc' }).disabled).toBe(true)
  })

  test('the app holds the draft: the subject typed goes out with the rest', () => {
    const onChange = vi.fn()
    render(<EmailComposer value={READY} onChange={onChange} onSend={() => {}} />)
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Hello again' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...READY, subject: 'Hello again' })
  })

  test('a message with nobody to go to is not sent: the reason is said and the focus goes to «To»', () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Add at least one address to send it to.')
    expect(document.activeElement).toBe(screen.getByLabelText('To'))
    // The reason goes when the draft changes.
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('an address that is not one stops it too; a draft that can go is sent, by the button and by Ctrl+Enter', () => {
    const onSend = vi.fn()
    const { unmount } = render(<Composer start={{ ...READY, to: ['ada'] }} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('alert').textContent).toBe('One of the addresses is not valid.')
    expect(onSend).not.toHaveBeenCalled()
    unmount()
    render(<Composer start={READY} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.keyDown(screen.getByLabelText('Subject'), { key: 'Enter', ctrlKey: true })
    expect(onSend.mock.calls).toEqual([[READY], [READY]])
  })

  test('while it is being sent the button waits and sends nothing more; Discard is there only when the app can', () => {
    const onSend = vi.fn()
    const onDiscard = vi.fn()
    const { rerender } = render(<Composer start={READY} onSend={onSend} sending />)
    const button = screen.getByRole('button', { name: /Send/ })
    expect(button.getAttribute('aria-busy')).toBe('true')
    fireEvent.keyDown(screen.getByLabelText('Subject'), { key: 'Enter', metaKey: true })
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull()
    rerender(<Composer start={READY} onSend={onSend} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onSend).not.toHaveBeenCalled()
  })

  test('only the button and Ctrl+Enter send: the form is never sent by Enter in a field of one line', () => {
    const onSend = vi.fn()
    render(<Composer start={READY} onSend={onSend} />)
    expect(screen.getByRole('button', { name: 'Send' }).getAttribute('type')).toBe('button')
    fireEvent.submit(screen.getByRole('form'))
    fireEvent.keyDown(screen.getByLabelText('Subject'), { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  test('Ctrl+Enter sends the draft with an address still being typed closed into its chip', () => {
    const onSend = vi.fn()
    render(<Composer start={{ ...EMPTY_EMAIL, subject: 'Hello' }} onSend={onSend} />)
    const to = screen.getByLabelText<HTMLInputElement>('To')
    to.focus()
    fireEvent.change(to, { target: { value: 'ada@example.com' } })
    fireEvent.keyDown(to, { key: 'Enter', ctrlKey: true })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0]![0]).toMatchObject({ to: ['ada@example.com'], subject: 'Hello' })
  })

  test('the focus goes to the row that is wrong, and the same reason said again is a new alert', () => {
    render(<Composer start={{ ...READY, cc: ['grace'] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Cc'))
    const first = screen.getByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('alert')).not.toBe(first)
    expect(screen.getByRole('alert').textContent).toBe('One of the addresses is not valid.')
  })

  test('the row of who it is from is a group of that name, so the control the app puts in it is named', () => {
    render(<EmailComposer value={READY} onChange={() => {}} onSend={() => {}} from={<select><option>me@example.com</option></select>} />)
    expect(within(screen.getByRole('group', { name: 'From' })).getByRole('combobox')).toBeTruthy()
  })

  test("the words are the app's", () => {
    render(
      <WordsProvider words={{ mail: { compose: 'Nuovo messaggio', to: 'A', send: 'Invia' } }}>
        <Composer />
      </WordsProvider>,
    )
    expect(within(screen.getByRole('form', { name: 'Nuovo messaggio' })).getByLabelText('A')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeTruthy()
  })
})
