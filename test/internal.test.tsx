import { readFileSync } from 'node:fs'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { COLORS, COLOR_NAMES } from '../src/colors'
import { AttachmentMarks, AttachmentsSection } from '../src/components/Attachments'
import { limitLabel, MAX_FILE_BYTES, payloadFromDataTransfer, withinLimit } from '../src/internal/drop'
import { Swatches } from '../src/components/Swatches'
import { dt } from './helpers'

// The normalized payload (plan 2C): files, then a link, then text. Before, there was `{ text?, urls?, files? }` all together.
test('one uri becomes a link, with the title from text/html or text/x-moz-url', () => {
  expect(payloadFromDataTransfer(dt({ 'text/uri-list': '# comment\nhttps://a.it/x', 'text/plain': 'https://a.it/x' }))).toEqual({ kind: 'link', url: 'https://a.it/x', title: null })
  expect(payloadFromDataTransfer(dt({ 'text/uri-list': 'https://a.it/x', 'text/html': '<meta charset="utf-8"><a href="https://a.it/x">The  quote</a>' }))).toEqual({
    kind: 'link',
    url: 'https://a.it/x',
    title: 'The quote',
  })
  expect(payloadFromDataTransfer(dt({ 'text/uri-list': 'https://a.it/x', 'text/x-moz-url': 'https://a.it/x\nFlight to Rome' }))).toEqual({ kind: 'link', url: 'https://a.it/x', title: 'Flight to Rome' })
})

test('several uris are text, one per line', () => {
  expect(payloadFromDataTransfer(dt({ 'text/uri-list': 'https://a.it\n# c\nhttps://b.it', 'text/plain': 'https://a.it' }))).toEqual({ kind: 'text', text: 'https://a.it\nhttps://b.it' })
})

test('plain text becomes text; nothing readable is null', () => {
  expect(payloadFromDataTransfer(dt({ 'text/plain': ' call the dentist ' }))).toEqual({ kind: 'text', text: 'call the dentist' })
  expect(payloadFromDataTransfer(dt({ 'text/plain': '   ' }))).toBeNull()
  expect(payloadFromDataTransfer(dt({}))).toBeNull()
})

test('files win over the text that comes with them (an email from Outlook)', () => {
  const f = new File(['x'], 'Quote.msg')
  expect(payloadFromDataTransfer(dt({ 'text/plain': 'Quote' }, [f]))).toEqual({ kind: 'files', files: [f] })
})

test('withinLimit keeps the files under the limit and says which were refused', () => {
  const small = new File(['x'], 'a.txt')
  const big = new File(['x'.repeat(11)], 'large.mov')
  const big2 = new File(['x'.repeat(12)], 'large2.mov')
  expect(withinLimit({ kind: 'files', files: [small] }, 10)).toEqual({ payload: { kind: 'files', files: [small] }, notice: null })
  const one = withinLimit({ kind: 'files', files: [small, big] }, 10)
  expect(one.payload).toEqual({ kind: 'files', files: [small] })
  expect(one.notice).toMatch(/“large\.mov” is over the limit/)
  const all = withinLimit({ kind: 'files', files: [big, big2] }, 10)
  expect(all.payload).toBeNull()
  expect(all.notice).toMatch(/^2 files are over the limit/)
  expect(withinLimit({ kind: 'link', url: 'https://a.it', title: null }, 10)).toEqual({ payload: { kind: 'link', url: 'https://a.it', title: null }, notice: null })
  // Exactly at the limit it passes; the limit is said in MB.
  expect(withinLimit({ kind: 'files', files: [big] }, 11).notice).toBeNull()
  expect(limitLabel(MAX_FILE_BYTES)).toBe('50 MB')
  expect(MAX_FILE_BYTES).toBe(52428800)
})

test('attachment marks announce the count and hide at zero', () => {
  const { rerender, container } = render(<AttachmentMarks kinds={['file', 'link']} count={2} />)
  expect(screen.getByLabelText('2 attachments')).toBeTruthy()
  rerender(<AttachmentMarks kinds={[]} count={0} />)
  expect(container.innerHTML).toBe('')
})

test('attachment marks take the attachments themselves and are exposed as an image with a name', () => {
  render(<AttachmentMarks attachments={[{ kind: 'file' }, { kind: 'file' }, { kind: 'link' }]} />)
  expect(screen.getByRole('img', { name: '3 attachments' })).toBeTruthy()
})

test('swatches are a radio group over COLORS', () => {
  render(<Swatches value={COLORS[2]} onChange={() => {}} />)
  const radios = screen.getAllByRole('radio')
  expect(radios).toHaveLength(COLORS.length)
  expect(radios[2]?.getAttribute('aria-checked')).toBe('true')
})

// The color picker: names that make sense without seeing the color, and the behavior of a radio group.
function Pick({ start = COLORS[0] as string, onPick = () => {} }: { start?: string; onPick?: (c: string) => void }) {
  const [value, setValue] = useState(start)
  return (
    <Swatches
      value={value}
      onChange={(c) => {
        onPick(c)
        setValue(c)
      }}
    />
  )
}
const radio = (name: string) => screen.getByRole('radio', { name })
const LAST = COLOR_NAMES[COLORS[COLORS.length - 1]!]

test('swatches have readable, distinct names in English, never the hex code', () => {
  render(<Pick />)
  const names = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))
  expect(names).toEqual(COLORS.map((c) => COLOR_NAMES[c]))
  expect(new Set(names).size).toBe(COLORS.length)
  for (const n of names) expect(n).not.toMatch(/#|[0-9a-f]{6}/i)
  expect(names).toContain('Red')
  expect(names).toContain('Blue')
})

test('a colour the package does not know is named by its number, not by its hex code', () => {
  render(<Swatches colors={['#e34432', '#123456']} value="#123456" onChange={() => {}} />)
  expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Red', 'Color 2'])
})

test('the swatches are a single tab stop: the chosen colour, or the first when none is chosen', () => {
  const { unmount } = render(<Pick start={COLORS[3]} />)
  expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual(COLORS.map((_, i) => (i === 3 ? 0 : -1)))
  unmount()
  render(<Swatches value="#000000" onChange={() => {}} />)
  expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual(COLORS.map((_, i) => (i === 0 ? 0 : -1)))
})

test('arrow keys move the choice and the focus, wrapping at the ends; Home and End jump', async () => {
  const onPick = vi.fn()
  render(<Pick start={COLORS[0]} onPick={onPick} />)
  // Base UI moves the arrow-key focus in a microtask (useCompositeRoot): we wait before looking.
  const press = async (key: string) => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key })
    await act(async () => {})
  }
  radio('Red').focus()
  await press('ArrowRight')
  expect(document.activeElement).toBe(radio('Coral'))
  expect(radio('Coral').getAttribute('aria-checked')).toBe('true')
  expect(onPick).toHaveBeenLastCalledWith(COLORS[1])
  await press('ArrowDown')
  expect(document.activeElement).toBe(radio(COLOR_NAMES[COLORS[2]!]))
  await press('ArrowLeft')
  await press('ArrowUp')
  expect(document.activeElement).toBe(radio('Red'))
  await press('ArrowLeft') // from the first it wraps to the last
  expect(document.activeElement).toBe(radio(LAST))
  expect(radio(LAST).getAttribute('aria-checked')).toBe('true')
  await press('ArrowRight') // and from the last to the first
  expect(document.activeElement).toBe(radio('Red'))
  await press('End')
  expect(document.activeElement).toBe(radio(LAST))
  await press('Home')
  expect(document.activeElement).toBe(radio('Red'))
  // After the move the Tab stop is the chosen color.
  expect(screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)).toEqual([radio('Red')])
})

test('keys that are not arrows are left alone', () => {
  const onPick = vi.fn()
  render(<Pick onPick={onPick} />)
  const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
  radio('Red').dispatchEvent(ev)
  expect(ev.defaultPrevented).toBe(false)
  expect(onPick).not.toHaveBeenCalled()
})

test('the attachments section refuses dropped text with a neutral sentence, or with the app\'s own', () => {
  const props = { attachments: [], onAction: () => {}, onAttach: vi.fn(), maxFileBytes: MAX_FILE_BYTES, thumbnails: undefined, onNeedThumbnail: undefined }
  const zone = () => screen.getByRole('group', { name: 'Add a file or a link' })
  const { unmount } = render(<AttachmentsSection {...props} />)
  fireEvent.drop(zone(), { dataTransfer: dt({ 'text/plain': 'a note' }) })
  expect(screen.getByRole('status').textContent).toBe('Files and links are added here: text is not an attachment.')
  unmount()
  render(<AttachmentsSection {...props} textNotice="Text goes in the notes." />)
  fireEvent.drop(zone(), { dataTransfer: dt({ 'text/plain': 'a note' }) })
  expect(screen.getByRole('status').textContent).toBe('Text goes in the notes.')
  expect(props.onAttach).not.toHaveBeenCalled()
})

test('the button that chooses a file is named by what it shows, title and hint (WCAG 2.5.3): it has no shorter label of its own', () => {
  const source = readFileSync(`${process.cwd()}/src/components/Attachments.tsx`, 'utf8')
  const at = source.indexOf('<FileUpload.Trigger')
  expect(at).toBeGreaterThan(-1)
  expect(source.slice(at, source.indexOf('>', at))).not.toContain('aria-label')
})
