// `Note`: a message that stays in the page. Met as a person or a screen reader meets it, through the roles and the
// words: each tone is said in a word read before the title as well as by its icon and its colour, an error and a
// warning are alerts when they appear (unless the app says `announce={false}`) and information and a success are not,
// a note whose tone changes is a new note, the title, the text, the list and the actions are there, it has no close
// button, and the words are the app's. The one look at a class is the wrapping of a long word, which jsdom cannot
// measure.
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DEFAULT_WORDS, WordsProvider } from '../src'
import { Button, Icon, type IconName } from '../src/primitives'
import { Note, type NoteTone } from '../src/components'

const TONES: readonly NoteTone[] = ['info', 'success', 'warning', 'error']
const WORD: Record<NoteTone, string> = { info: 'Information', success: 'Success', warning: 'Warning', error: 'Error' }
const ICON: Record<NoteTone, IconName> = { info: 'info', success: 'check', warning: 'alert', error: 'error' }

/** The drawing an `Icon` of that name makes. */
const drawing = (name: IconName) => {
  const { container, unmount } = render(<Icon name={name} />)
  const html = container.querySelector('svg')!.outerHTML
  unmount()
  return html
}

/** What a screen reader reads of the title: the word of the tone (hidden from the eye), then the title. */
const readTitle = (word: string) => screen.getByText(`${word}:`).parentElement!.textContent

describe('the tones', () => {
  test("the words: information, a success and a warning are the note's own, an error says the word of an error notice", () => {
    expect(DEFAULT_WORDS.note).toEqual({ info: 'Information', success: 'Success', warning: 'Warning' })
    expect(DEFAULT_WORDS.common.error).toBe(WORD.error)
  })

  test.each(TONES)('%s: its word is read before the title; its icon is drawn and hidden from screen readers', (tone) => {
    const { container } = render(<Note tone={tone} title="The map is ready" />)
    expect(readTitle(WORD[tone])).toBe(`${WORD[tone]}: The map is ready`)
    const svg = container.querySelector('svg')!
    expect(svg.outerHTML).toBe(drawing(ICON[tone]))
    expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  test("each tone has an icon of its own, never the colour alone: an error is Sigrid's `error`, never the information's circle", () => {
    const drawn = TONES.map((tone) => {
      const { container, unmount } = render(<Note tone={tone} title={tone} />)
      const html = container.querySelector('svg')!.outerHTML
      unmount()
      return html
    })
    expect(drawn).toEqual(TONES.map((tone) => drawing(ICON[tone])))
    expect(new Set(drawn).size).toBe(4)
  })

  test('information is the default tone, and a tone outside the four is information', () => {
    const { unmount } = render(<Note title="Drawn from a sample" />)
    expect(readTitle('Information')).toBe('Information: Drawn from a sample')
    unmount()
    render(<Note tone={'notice' as NoteTone} title="Drawn from a sample" />)
    expect(readTitle('Information')).toBe('Information: Drawn from a sample')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('announced when it matters', () => {
  test.each(['error', 'warning'] as const)('%s is an alert: read at once when it appears, its word first', (tone) => {
    render(<Note tone={tone} title="Could not reach the server" />)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(`${WORD[tone]}:`)).toBeTruthy()
    expect(alert.textContent).toMatch(new RegExp(`^${WORD[tone]}: Could not reach the server`))
  })

  test.each(['info', 'success'] as const)('%s is not announced: no alert and no live region', (tone) => {
    render(<Note tone={tone} title="Saved" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText(`${WORD[tone]}:`).closest('[aria-live]')).toBeNull()
  })

  test('`announce={false}`: a warning that is a fact of the item shown is not read at each selection, and still says its word', () => {
    render(<Note tone="warning" announce={false} title="Read only" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Warning:').closest('[aria-live]')).toBeNull()
    expect(readTitle('Warning')).toBe('Warning: Read only')
  })

  test('`announce` changes nothing for information and a success: they are never alerts', () => {
    render(
      <>
        <Note tone="info" announce title="Drawn from a sample" />
        <Note tone="success" announce title="Saved" />
      </>,
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('a note whose tone changes in place is a new note: an information, or a warning, that becomes an error is announced', () => {
    const { rerender } = render(<Note tone="info" title="Reading the files" />)
    expect(screen.queryByRole('alert')).toBeNull()
    const before = screen.getByText('Information:').parentElement!
    rerender(<Note tone="error" title="Could not read the files" />)
    const alert = screen.getByRole('alert')
    // Put in the page as an alert: not the old node, which took the role.
    expect(before.isConnected).toBe(false)
    expect(alert.contains(before)).toBe(false)
    expect(within(alert).getByText('Error:')).toBeTruthy()
    // A warning that becomes an error is a new alert too.
    rerender(<Note tone="warning" title="Some files are large" />)
    const warning = screen.getByRole('alert')
    rerender(<Note tone="error" title="Some files were not read" />)
    const error = screen.getByRole('alert')
    expect(error).not.toBe(warning)
    expect(warning.isConnected).toBe(false)
    expect(within(error).getByText('Error:')).toBeTruthy()
  })

  test('the same tone keeps its note: a new title is not a new alert', () => {
    const { rerender } = render(<Note tone="error" title="Could not reach the server" />)
    const alert = screen.getByRole('alert')
    rerender(<Note tone="error" title="Could not reach the server, again" />)
    expect(screen.getByRole('alert')).toBe(alert)
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
    render(<Note tone="success" title="Saved" items={[]} />)
    expect(readTitle('Success')).toBe('Success: Saved')
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('a long word breaks where it must: the title, the text and the list never grow wider than their place', () => {
    const path = 'C:/Users/someone/AppData/Local/a-very-long-folder-name-without-any-space/and-another-one/settings.json'
    render(
      <Note tone="error" title={path} items={[path]}>
        {path}
      </Note>,
    )
    const note = screen.getByRole('alert')
    // The title, the text and the list item.
    expect(within(note).getAllByText(path)).toHaveLength(3)
    // The one look at a class: jsdom lays nothing out, so the note is seen to ask for `overflow-wrap: anywhere`, which
    // its title, its text and its list inherit.
    expect(note.className.split(/\s+/)).toContain('wrap-anywhere')
  })

  test('no close button: it stays until the app removes it', () => {
    const { rerender } = render(<Note tone="warning" title="The map is out of date" />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<Note tone="warning" title="The map is out of date" actions={<Button variant="outline">Draw it again</Button>} />)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Draw it again'])
    expect(screen.queryByRole('button', { name: DEFAULT_WORDS.common.close })).toBeNull()
  })

  test("the app's attributes reach the note", () => {
    render(<Note tone="error" title="Read only" id="read-only" aria-describedby="why" />)
    const note = screen.getByRole('alert')
    expect(note.id).toBe('read-only')
    expect(note.getAttribute('aria-describedby')).toBe('why')
  })
})

describe("the words are the app's", () => {
  test('each tone says the word the app gave; an error says the word of an error', () => {
    render(
      <WordsProvider words={{ common: { error: 'Errore' }, note: { info: 'Informazione', success: 'Fatto', warning: 'Attenzione' } }}>
        <Note tone="error" title="Server non raggiungibile" />
        <Note tone="success" title="Salvato" />
        <Note tone="warning" announce={false} title="Sola lettura" />
      </WordsProvider>,
    )
    expect(screen.getByRole('alert').textContent).toMatch(/^Errore: Server non raggiungibile/)
    expect(readTitle('Fatto')).toBe('Fatto: Salvato')
    expect(readTitle('Attenzione')).toBe('Attenzione: Sola lettura')
  })
})
