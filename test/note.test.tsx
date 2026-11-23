// `Note`: a message that stays in the page. What matters: each tone is said in a word as well as by its icon and its
// colour, an error and a warning are announced when they appear and information and a success are not, the title,
// the text, the list and the actions are there, it has no close button, and the words are the app's.
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button, DEFAULT_WORDS, Note, WordsProvider, type NoteTone } from '../src'

const TONES: readonly NoteTone[] = ['info', 'success', 'warning', 'error']
const WORD: Record<NoteTone, string> = { info: 'Information', success: 'Success', warning: 'Warning', error: 'Error' }

/** The text of the note's title, as a screen reader reads it: the word of the tone first. */
const titleOf = (note: HTMLElement) => note.querySelector('[data-slot="note-title"]')!.textContent

describe('the tones', () => {
  test('the words are the placeholders of `note`', () => {
    expect(DEFAULT_WORDS.note).toEqual(WORD)
  })

  test.each(TONES)('%s: its word is read before the title, and its icon is drawn and hidden from screen readers', (tone) => {
    const { container } = render(<Note tone={tone} title="The map is ready" />)
    const note = container.querySelector('[data-slot="note"]') as HTMLElement
    expect(note.getAttribute('data-tone')).toBe(tone)
    expect(titleOf(note)).toBe(`${WORD[tone]}: The map is ready`)
    const icon = note.querySelector('[data-slot="note-icon"] [data-icon]')!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.querySelector('svg')).not.toBeNull()
  })

  test('each tone has an icon of its own: never the colour alone', () => {
    const { container } = render(
      <>
        {TONES.map((tone) => (
          <Note key={tone} tone={tone} title={tone} />
        ))}
      </>,
    )
    const icons = [...container.querySelectorAll('[data-slot="note-icon"] [data-icon]')].map((icon) => icon.getAttribute('data-icon'))
    expect(icons).toEqual(['info', 'check', 'alert', 'error'])
    const drawings = [...container.querySelectorAll('[data-slot="note-icon"] svg')].map((svg) => svg.innerHTML)
    expect(new Set(drawings).size).toBe(4)
  })

  test('information is the default tone', () => {
    const { container } = render(<Note title="Drawn from a sample" />)
    const note = container.querySelector('[data-slot="note"]') as HTMLElement
    expect(note.getAttribute('data-tone')).toBe('info')
    expect(titleOf(note)).toBe('Information: Drawn from a sample')
  })
})

describe('announced when it matters', () => {
  test.each(['error', 'warning'] as const)('%s is an alert: read at once when it appears, with its word', (tone) => {
    render(<Note tone={tone} title="Could not reach the server" />)
    const alert = screen.getByRole('alert')
    expect(alert.getAttribute('data-tone')).toBe(tone)
    expect(alert.textContent).toContain(`${WORD[tone]}: Could not reach the server`)
  })

  test.each(['info', 'success'] as const)('%s is not announced: no alert and no live region', (tone) => {
    const { container } = render(<Note tone={tone} title="Saved" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    const note = container.querySelector('[data-slot="note"]') as HTMLElement
    expect(note.hasAttribute('role')).toBe(false)
    expect(note.hasAttribute('aria-live')).toBe(false)
  })
})

describe('what it holds', () => {
  test('a title, its text, a list and the actions', () => {
    render(
      <Note
        tone="error"
        title="Two files were not read"
        items={['app.ts', 'main.ts']}
        actions={
          <>
            <Button variant="outline">Retry</Button>
            <Button variant="ghost">Open the log</Button>
          </>
        }
      >
        The server stopped before the end.
      </Note>,
    )
    const note = screen.getByRole('alert')
    expect(within(note).getByText('Two files were not read')).toBeTruthy()
    expect(within(note).getByText('The server stopped before the end.')).toBeTruthy()
    const list = within(note).getByRole('list')
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['app.ts', 'main.ts'])
    expect(within(note).getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(within(note).getByRole('button', { name: 'Open the log' })).toBeTruthy()
    // The order a person reads: the title, the text, the list, then what to do.
    const text = note.textContent ?? ''
    expect(text.indexOf('Two files')).toBeLessThan(text.indexOf('The server'))
    expect(text.indexOf('The server')).toBeLessThan(text.indexOf('app.ts'))
    expect(text.indexOf('main.ts')).toBeLessThan(text.indexOf('Retry'))
  })

  test('a title alone: no text, no list, no actions', () => {
    const { container } = render(<Note tone="success" title="Saved" items={[]} />)
    expect(container.querySelector('[data-slot="note-description"]')).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(container.querySelector('[data-slot="note-actions"]')).toBeNull()
  })

  test('no close button: it stays until the app removes it', () => {
    const { rerender } = render(<Note tone="warning" title="The map is out of date" />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<Note tone="warning" title="The map is out of date" actions={<Button variant="outline">Draw it again</Button>} />)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Draw it again'])
    expect(screen.queryByRole('button', { name: DEFAULT_WORDS.common.close })).toBeNull()
  })

  test("the app's attributes reach the note", () => {
    const { container } = render(<Note tone="info" title="Read only" id="read-only" data-sample="note" />)
    const note = container.querySelector('[data-slot="note"]') as HTMLElement
    expect(note.id).toBe('read-only')
    expect(note.getAttribute('data-sample')).toBe('note')
  })
})

describe('the words are the app\'s', () => {
  test('each tone says the word the app gave', () => {
    render(
      <WordsProvider words={{ note: { info: 'Informazione', success: 'Fatto', warning: 'Attenzione', error: 'Errore' } }}>
        <Note tone="error" title="Server non raggiungibile" />
        <Note tone="success" title="Salvato" />
      </WordsProvider>,
    )
    expect(screen.getByRole('alert').textContent).toContain('Errore: Server non raggiungibile')
    expect(screen.getByText('Fatto:')).toBeTruthy()
  })
})
