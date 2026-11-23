// The words a component says by itself are placeholders, in English, that an app replaces once for the whole tree
// (`WordsProvider`), in any language. A component's own prop still wins; the helpers outside a component take the
// words as their last argument.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import {
  AttachmentMarks,
  AttachmentsSection,
  ChipsInput,
  Combobox,
  DEFAULT_WORDS,
  DateField,
  DateTimeField,
  DialogRoot,
  DialogContent,
  DialogTitle,
  DurationField,
  MarkdownBlocks,
  SearchField,
  Sheet,
  SheetContent,
  SheetTitle,
  Shortcut,
  Swatches,
  COLORS,
  WordsProvider,
  kindLabel,
  overLimitNotice,
  stateText,
  useWords,
  withWords,
  withinLimit,
  type WordsOverride,
} from '../src'

const settle = () => act(async () => { await new Promise((done) => setTimeout(done, 120)) })
const MB = 1024 * 1024

/** An app's words, in Italian: every group, so each component below is seen to read them. */
const ITALIAN: WordsOverride = {
  common: { close: 'Chiudi', undo: 'Annulla', notices: 'Avvisi', keysTogether: (keys) => keys.join(' più '), keysInSequence: (keys) => keys.join(' poi ') },
  colors: { group: 'Colore', names: { [COLORS[0]!]: 'Rosso' }, numbered: (n) => `Colore ${n}` },
  date: { noDate: 'Nessuna data', noDateTime: 'Nessuna data e ora', clear: 'Togli la data', time: 'Ora', timeOfDay: 'Ora del giorno', done: 'Fatto', calendar: 'Calendario', previous: (span) => `Precedente: ${span}`, next: (span) => `Successivo: ${span}` },
  duration: { hours: 'ore', minutes: 'minuti', none: 'Nessuna', short: (h, m) => (h > 0 ? `${h} h` : `${m} min`) },
  search: { clear: 'Svuota la ricerca' },
  copy: { copy: 'Copia', copied: 'Copiato', failed: 'Copia non riuscita' },
  combobox: { empty: 'Nessun risultato', trigger: 'Mostra le opzioni' },
  labels: { remove: (l) => `Togli l’etichetta ${l}`, count: (n) => (n === 1 ? '1 etichetta' : `${n} etichette`), suggestions: 'Suggerimenti' },
  kinds: { text: 'testo', file: 'file', email: 'messaggio', link: 'collegamento' },
  attachments: {
    heading: 'Allegati',
    count: (n) => (n === 1 ? '1 allegato' : `${n} allegati`),
    add: 'Aggiungi un file o un collegamento',
    addFile: 'Aggiungi un file',
    hint: (limit) => `Trascina qui un file, al massimo ${limit}`,
    link: 'Collegamento',
    pasteLink: 'Incolla un collegamento',
    addLink: 'Aggiungi il collegamento',
    badAddress: 'Scrivi un indirizzo web',
    arriving: 'In arrivo',
    overLimit: (limit) => `Oltre il limite di ${limit}`,
    fileOverLimit: (name, limit) => `«${name}» supera il limite di ${limit}.`,
    filesOverLimit: (n, limit) => `${n} file superano il limite di ${limit}.`,
  },
  viewer: { page: (page, total) => `Pagina ${page} di ${total}` },
  checklist: { done: 'Fatto: ', todo: 'Da fare: ' },
}

describe('the placeholders: English, every group filled', () => {
  test('every word is a non-empty text, or a function that gives one', () => {
    // Each parameter by its name: a list (`keys`, `steps`, `items`) gets a list, any other 2, then 3.
    const sample = (fn: (...args: never[]) => unknown) => {
      const names = (/^\(?([^)=]*)\)?\s*=>/.exec(String(fn))?.[1] ?? '').split(',').map((name) => name.trim())
      return (fn as (...args: unknown[]) => unknown)(...names.map((name, at) => (['keys', 'steps', 'items'].includes(name) ? [2, 3] : at + 2)))
    }
    for (const [group, words] of Object.entries(DEFAULT_WORDS)) {
      for (const [name, word] of Object.entries(words as Record<string, unknown>)) {
        const at = `${group}.${name}`
        if (typeof word === 'function') expect(String(sample(word as never)).length, at).toBeGreaterThan(0)
        else if (typeof word === 'string') expect(word.length, at).toBeGreaterThan(0)
        else expect(Object.keys(word as object).length, at).toBeGreaterThan(0)
      }
    }
  })

  test('without a provider the components say what they said before', () => {
    render(
      <>
        <DateField id="d" value={null} onChange={() => {}} />
        <SearchField aria-label="Search" value="x" onValueChange={() => {}} />
        <DurationField value={null} onChange={() => {}} />
        <AttachmentMarks kinds={['file', 'link']} count={2} />
      </>,
    )
    expect(document.getElementById('d')!.textContent).toBe('No date')
    expect(screen.getByRole('button', { name: 'Clear the search' })).toBeTruthy()
    for (const name of ['15m', '30m', '1h', '2h', 'None']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByRole('img', { name: '2 attachments' })).toBeTruthy()
    expect(kindLabel('email')).toBe('email')
    expect(stateText('overLimit', 25 * MB)).toBe('Over the limit of 25 MB')
  })
})

describe('an app replaces the words, all or some', () => {
  test('`withWords` replaces what is named and leaves the rest', () => {
    const merged = withWords(DEFAULT_WORDS, { common: { close: 'Chiudi' } })
    expect(merged.common.close).toBe('Chiudi')
    expect(merged.common.undo).toBe('Undo')
    expect(merged.date).toBe(DEFAULT_WORDS.date)
    expect(withWords(DEFAULT_WORDS, undefined)).toBe(DEFAULT_WORDS)
    // The placeholders themselves are not touched.
    expect(DEFAULT_WORDS.common.close).toBe('Close')
  })

  test('a provider inside another replaces only what it names', () => {
    let seen = DEFAULT_WORDS
    const Probe = () => {
      seen = useWords()
      return null
    }
    render(
      <WordsProvider words={ITALIAN}>
        <WordsProvider words={{ common: { close: 'Esci' } }}>
          <Probe />
        </WordsProvider>
      </WordsProvider>,
    )
    expect(seen.common.close).toBe('Esci')
    expect(seen.common.undo).toBe('Annulla')
    expect(seen.search.clear).toBe('Svuota la ricerca')
    // A group the app left partly in English keeps the placeholder there.
    expect(seen.labels.removeAll).toBe('Remove all labels')
  })

  test('fields and controls say the app\'s words', async () => {
    render(
      <WordsProvider words={ITALIAN}>
        <DateField id="day" value={null} onChange={() => {}} />
        <DateTimeField id="when" value={null} onChange={() => {}} />
        <SearchField aria-label="Cerca" value="x" onValueChange={() => {}} />
        <Combobox aria-label="Persona" options={[]} value={null} onValueChange={() => {}} />
        <DurationField value={null} onChange={() => {}} />
        <Swatches value={COLORS[0]!} onChange={() => {}} colors={[COLORS[0]!, '#123456']} />
        <Shortcut keys={['Ctrl', 'K']} />
        <Shortcut keys={['G', 'I']} separator="then" />
        <MarkdownBlocks text={'- [x] pane\n- [ ] latte'} />
        <label htmlFor="tags">Etichette</label>
        <ChipsInput id="tags" value={['casa']} onChange={() => {}} />
      </WordsProvider>,
    )
    expect(document.getElementById('day')!.textContent).toBe('Nessuna data')
    expect(document.getElementById('when')!.textContent).toBe('Nessuna data e ora')
    expect(screen.getByRole('button', { name: 'Svuota la ricerca' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mostra le opzioni', hidden: true })).toBeTruthy()
    for (const name of ['15 min', '1 h', 'Nessuna']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByText('ore')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Colore' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Rosso' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Colore 2' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Ctrl più K' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'G poi I' })).toBeTruthy()
    expect(screen.getByText('Fatto:', { exact: false })).toBeTruthy()
    expect(screen.getByText('Da fare:', { exact: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Togli l’etichetta casa' })).toBeTruthy()
    // The card of the date field: its foot and the calendar's arrows.
    fireEvent.click(document.getElementById('day')!)
    await settle()
    // The date card has no button that removes the date (2026-11-22): the word for it is no longer shown.
    expect(screen.queryByRole('button', { name: 'Togli la data' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Precedente: month' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Successivo: month' })).toBeTruthy()
  })

  test('dialogs and sheets name their close button with the app\'s word', () => {
    render(
      <WordsProvider words={ITALIAN}>
        <DialogRoot open>
          <DialogContent>
            <DialogTitle>Titolo</DialogTitle>
          </DialogContent>
        </DialogRoot>
        <Sheet open modal={false}>
          <SheetContent>
            <SheetTitle>Dettagli</SheetTitle>
          </SheetContent>
        </Sheet>
      </WordsProvider>,
    )
    expect(screen.getAllByRole('button', { name: 'Chiudi', hidden: true })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Close', hidden: true })).toBeNull()
  })

  test('the attachments section: its heading, its zone, its rows and what it refuses', () => {
    render(
      <WordsProvider words={ITALIAN}>
        <AttachmentsSection
          attachments={[{ id: 'a', kind: 'file', title: 'Relazione.pdf', detail: null, href: null, state: 'arriving', open: null, remove: 'remove' }]}
          onAction={() => {}}
          onAttach={() => {}}
          maxFileBytes={25 * MB}
          thumbnails={undefined}
          onNeedThumbnail={undefined}
        />
        <AttachmentMarks kinds={['file']} count={1} />
      </WordsProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Allegati' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Aggiungi un file o un collegamento' })).toBeTruthy()
    expect(screen.getByText('Trascina qui un file, al massimo 25 MB')).toBeTruthy()
    expect(screen.getByText('In arrivo')).toBeTruthy()
    expect(screen.getByPlaceholderText('Incolla un collegamento')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aggiungi il collegamento' })).toBeTruthy()
    expect(screen.getByRole('img', { name: '1 allegato' })).toBeTruthy()
    // A word the app did not give stays the placeholder.
    expect(screen.getByRole('button', { name: 'Remove: Relazione.pdf' })).toBeTruthy()
    // An address that is none: the app's sentence.
    fireEvent.change(screen.getByPlaceholderText('Incolla un collegamento'), { target: { value: 'non un indirizzo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi il collegamento' }))
    expect(screen.getByText('Scrivi un indirizzo web')).toBeTruthy()
  })

  test('a prop on the component wins over the provider', () => {
    render(
      <WordsProvider words={ITALIAN}>
        <DateField id="day" value={null} onChange={() => {}} placeholder="Scadenza libera" />
        <SearchField aria-label="Cerca" value="x" onValueChange={() => {}} clearLabel="Pulisci" />
      </WordsProvider>,
    )
    expect(document.getElementById('day')!.textContent).toBe('Scadenza libera')
    expect(screen.getByRole('button', { name: 'Pulisci' })).toBeTruthy()
  })

  test('the helpers outside a component take the words as their last argument', () => {
    const words = withWords(DEFAULT_WORDS, ITALIAN)
    const big = new File([new Uint8Array(2)], 'grande.pdf')
    Object.defineProperty(big, 'size', { value: 30 * MB })
    expect(kindLabel('link', words)).toBe('collegamento')
    expect(stateText('overLimit', 25 * MB, words)).toBe('Oltre il limite di 25 MB')
    expect(overLimitNotice([big], 25 * MB, words)).toBe('«grande.pdf» supera il limite di 25 MB.')
    expect(overLimitNotice([big, big], 25 * MB, words)).toBe('2 file superano il limite di 25 MB.')
    expect(withinLimit({ kind: 'files', files: [big] }, 25 * MB, words)).toEqual({ payload: null, notice: '«grande.pdf» supera il limite di 25 MB.' })
    // Without them: the placeholder, as before.
    expect(overLimitNotice([big], 25 * MB)).toBe('“grande.pdf” is over the limit of 25 MB: it was not added.')
  })
})
