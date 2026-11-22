// Slider, Avatar, SearchField and Combobox; suggestions in the labels field; a sheet beside the page; the tooltip's
// key hint; the date field's limits, locale and words.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Avatar, ChipsInput, Combobox, DateField, DateTimeField, SearchField, Sheet, SheetContent, SheetTitle, Slider, Tooltip, initials } from '../src'

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const coarse = (cls: string) => 'pointer-coarse:' + cls
// Ark commits in a frame: the test waits for it, as the browser would.
const settle = () => act(async () => { await new Promise((done) => setTimeout(done, 120)) })
/** Writing in a box as a user does: the box has the focus first. */
const write = async (box: HTMLInputElement, text: string) => {
  act(() => box.focus())
  fireEvent.change(box, { target: { value: text } })
  await settle()
}
// jsdom does no layout, and Ark shows the thumb once it has measured it: the thumb is looked up hidden.
const thumbOf = (name?: string) => screen.getByRole('slider', { hidden: true, ...(name ? { name } : {}) })

describe('Slider', () => {
  test('a named slider with its limits and its value; the track is the control border colour, the range and the thumb border the accent', () => {
    const { container } = render(<Slider aria-label="Zoom" value={40} min={0} max={100} step={10} onValueChange={() => {}} />)
    const thumb = thumbOf()
    // The name is the label part the thumb points to, kept out of sight.
    const name = document.getElementById(thumb.getAttribute('aria-labelledby')!)!
    expect(name.textContent).toBe('Zoom')
    expect(classes(name)).toContain('sr-only')
    expect(thumb.getAttribute('aria-valuenow')).toBe('40')
    expect(thumb.getAttribute('aria-valuemin')).toBe('0')
    expect(thumb.getAttribute('aria-valuemax')).toBe('100')
    expect(classes(container.querySelector('[data-slot="slider-track"]')!)).toContain('bg-input')
    expect(classes(container.querySelector('[data-slot="slider-range"]')!)).toContain('bg-primary')
    const c = classes(thumb)
    for (const cls of ['size-5', 'rounded-full', 'border-primary', 'bg-paper']) expect(c).toContain(cls)
    expect(c.some((x) => x.startsWith('shadow'))).toBe(false)
    expect(c).toContain(coarse('after:-inset-3'))
  })

  test('the arrows move by a step, Up and Down as Right and Left; Home and End go to the ends', async () => {
    const spy = vi.fn()
    function Sample() {
      const [value, setValue] = useState(40)
      return (
        <Slider
          aria-label="Zoom"
          value={value}
          min={0}
          max={100}
          step={10}
          onValueChange={(v) => {
            spy(v)
            setValue(v)
          }}
        />
      )
    }
    render(<Sample />)
    const thumb = thumbOf()
    act(() => thumb.focus())
    for (const [key, want] of [['ArrowRight', 50], ['ArrowUp', 60], ['ArrowDown', 50], ['ArrowLeft', 40], ['End', 100], ['Home', 0]] as const) {
      fireEvent.keyDown(thumb, { key })
      await settle()
      expect(spy, key).toHaveBeenLastCalledWith(want)
    }
  })
})

describe('Avatar', () => {
  test('the initials: the first letter of the first and of the last word', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('  ada  ')).toBe('A')
    expect(initials('Jean-Luc de la Tour')).toBe('JT')
    expect(initials('')).toBe('')
  })

  test('named by the person, or hidden when the name is beside it; a neutral round tile, never a data colour as a fill (R10)', () => {
    const { container, rerender } = render(<Avatar name="Ada Lovelace" />)
    const tile = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(tile.textContent).toBe('AL')
    const c = classes(tile)
    expect(c).toContain('rounded-full')
    expect(c).toContain('size-(--control-md)')
    expect(c).toContain('bg-ink/6')
    expect(tile.getAttribute('style')).toBeNull()
    rerender(<Avatar name="Ada Lovelace" decorative size="xs" />)
    const hidden = container.querySelector('[data-slot="avatar"]')!
    expect(hidden.getAttribute('aria-hidden')).toBe('true')
    expect(hidden.getAttribute('role')).toBeNull()
    expect(classes(hidden)).toContain('size-(--control-xs)')
  })
})

describe('SearchField', () => {
  function Sample({ onChange = () => {} }: { onChange?: (v: string) => void }) {
    const [value, setValue] = useState('')
    return (
      <SearchField
        aria-label="Search the mail"
        value={value}
        onValueChange={(v) => {
          onChange(v)
          setValue(v)
        }}
      />
    )
  }

  test('a search box with the caller\'s name; the clear button appears with text, empties the field and gives it the focus', () => {
    const spy = vi.fn()
    render(<Sample onChange={spy} />)
    const box = screen.getByRole('searchbox', { name: 'Search the mail' }) as HTMLInputElement
    expect(screen.queryByRole('button', { name: 'Clear the search' })).toBeNull()
    fireEvent.change(box, { target: { value: 'invoice' } })
    expect(spy).toHaveBeenLastCalledWith('invoice')
    const clear = screen.getByRole('button', { name: 'Clear the search' })
    expect(classes(clear)).toContain(coarse('size-11'))
    fireEvent.click(clear)
    expect(spy).toHaveBeenLastCalledWith('')
    expect(box.value).toBe('')
    expect(document.activeElement).toBe(box)
    expect(screen.queryByRole('button', { name: 'Clear the search' })).toBeNull()
  })

  test('disabled: no clear button; the name of the button is the caller\'s when given', () => {
    const { rerender } = render(<SearchField aria-label="Search" value="x" onValueChange={() => {}} disabled />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<SearchField aria-label="Cerca" value="x" onValueChange={() => {}} clearLabel="Svuota la ricerca" />)
    expect(screen.getByRole('button', { name: 'Svuota la ricerca' })).toBeTruthy()
  })
})

describe('Combobox', () => {
  const PEOPLE = [
    { value: 'ada', label: 'Ada Lovelace', detail: 'ada@example.com' },
    { value: 'alan', label: 'Alan Turing' },
    { value: 'grace', label: 'Grace Hopper', disabled: true },
  ]
  function Sample({ onChange = () => {}, onQuery }: { onChange?: (v: string | null) => void; onQuery?: (t: string) => void }) {
    const [value, setValue] = useState<string | null>(null)
    return (
      <Combobox
        aria-label="Assignee"
        options={PEOPLE}
        value={value}
        onQuery={onQuery}
        onValueChange={(v) => {
          onChange(v)
          setValue(v)
        }}
      />
    )
  }
  const options = () => screen.queryAllByRole('option').map((o) => o.textContent)

  test('typing opens the list and filters it by the label, ignoring case; a click chooses and the box shows the label', async () => {
    const spy = vi.fn()
    render(<Sample onChange={spy} />)
    const box = screen.getByRole('combobox', { name: 'Assignee' }) as HTMLInputElement
    expect(options()).toEqual([])
    await write(box, 'AL')
    expect(options()).toEqual(['Alan Turing'])
    await write(box, 'a')
    // The detail is a second line of the row.
    expect(options()).toEqual(['Ada Lovelaceada@example.com', 'Alan Turing', 'Grace Hopper'])
    fireEvent.click(screen.getByRole('option', { name: /Ada Lovelace/ }))
    await settle()
    expect(spy).toHaveBeenLastCalledWith('ada')
    expect(box.value).toBe('Ada Lovelace')
  })

  test('nothing matches: the list says so; with `onQuery` the caller filters and the options are shown as given', async () => {
    const asked = vi.fn()
    const { unmount } = render(<Sample />)
    await write(screen.getByRole('combobox') as HTMLInputElement, 'zzz')
    expect(options()).toEqual([])
    expect(screen.getByText('No results')).toBeTruthy()
    unmount()
    render(<Sample onQuery={asked} />)
    await write(screen.getByRole('combobox') as HTMLInputElement, 'zzz')
    expect(asked).toHaveBeenLastCalledWith('zzz')
    expect(options()).toHaveLength(3)
  })

  test('the form of the field: the light divider border, its height by the density, 44px with a coarse pointer; invalid turns the border', () => {
    const { rerender } = render(<Combobox aria-label="Who" options={PEOPLE} value={null} onValueChange={() => {}} />)
    const c = classes(screen.getByRole('combobox'))
    for (const cls of ['h-(--control-md)', 'border-line', 'rounded-md', coarse('min-h-11')]) expect(c).toContain(cls)
    rerender(<Combobox aria-label="Who" options={PEOPLE} value={null} onValueChange={() => {}} aria-invalid />)
    expect(classes(screen.getByRole('combobox'))).toContain('border-destructive')
  })
})

describe('ChipsInput with suggestions', () => {
  function Sample({ onChange = () => {} }: { onChange?: (v: string[]) => void }) {
    const [value, setValue] = useState(['home'])
    return (
      <>
        <label htmlFor="labels">Labels</label>
        <ChipsInput
          id="labels"
          value={value}
          suggestions={['Home', 'Work', 'Waiting', 'Errands']}
          onChange={(v) => {
            onChange(v)
            setValue(v)
          }}
        />
      </>
    )
  }
  const options = () => screen.queryAllByRole('option').map((o) => o.textContent)

  test('while writing, the labels that match and are not in the field are listed; a click adds one and empties the box', async () => {
    const spy = vi.fn()
    render(<Sample onChange={spy} />)
    const box = screen.getByLabelText('Labels') as HTMLInputElement
    await write(box, 'w')
    // «Home» is in the field already (whatever its case).
    expect(options()).toEqual(['Work', 'Waiting'])
    fireEvent.click(screen.getByRole('option', { name: 'Work' }))
    await settle()
    expect(spy).toHaveBeenLastCalledWith(['home', 'Work'])
    expect(box.value).toBe('')
  })

  test('a text that is no suggestion is still a label of its own, with Enter', async () => {
    const spy = vi.fn()
    render(<Sample onChange={spy} />)
    const box = screen.getByLabelText('Labels') as HTMLInputElement
    await write(box, 'zebra')
    expect(options()).toEqual([])
    fireEvent.keyDown(box, { key: 'Enter' })
    await settle()
    expect(spy).toHaveBeenLastCalledWith(['home', 'zebra'])
  })
})

describe('a sheet beside the page', () => {
  test('`modal={false}`: no backdrop, and only the sheet takes the pointer', () => {
    render(
      <Sheet open modal={false}>
        <SheetContent>
          <SheetTitle>Details</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    expect(classes(document.querySelector('[data-slot="sheet-viewport"]')!)).toContain('pointer-events-none')
    expect(classes(document.querySelector('[data-slot="sheet-content"]')!)).toContain('pointer-events-auto')
  })

  test('modal, as before: the backdrop is there and the viewport takes the pointer', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Details</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
    expect(classes(document.querySelector('[data-slot="sheet-viewport"]')!)).not.toContain('pointer-events-none')
  })
})

describe('Tooltip with a key hint', () => {
  test('the key is plain text after the name, not a boxed key (R5)', async () => {
    render(
      <Tooltip label="Search" shortcut="Ctrl K" delay={0}>
        <button type="button" aria-label="Search" />
      </Tooltip>,
    )
    act(() => screen.getByRole('button').focus())
    await settle()
    const hint = document.querySelector('[data-slot="tooltip-shortcut"]')!
    expect(hint.textContent).toBe('Ctrl K')
    expect(hint.tagName).toBe('SPAN')
    expect(classes(hint).some((c) => /^(bg-|border|rounded|px-)/.test(c))).toBe(false)
    expect(document.querySelector('[data-slot="tooltip-content"]')!.textContent).toBe('SearchCtrl K')
  })
})

describe('the date field: limits, locale, words', () => {
  test('the date on the button follows the locale; disabled closes the field', () => {
    const { rerender } = render(<DateField id="due" value="2026-11-07" onChange={() => {}} locale="it-IT" />)
    expect(document.getElementById('due')!.textContent).toBe('7 novembre 2026')
    rerender(<DateField id="due" value="2026-11-07" onChange={() => {}} />)
    expect(document.getElementById('due')!.textContent).toBe('November 7, 2026')
    rerender(<DateField id="due" value="2026-11-07" onChange={() => {}} disabled />)
    expect((document.getElementById('due') as HTMLButtonElement).disabled).toBe(true)
  })

  test('the days before `min` and after `max` cannot be chosen; the card has no button that removes the date', async () => {
    render(<DateField id="due" value="2026-11-10" onChange={() => {}} min="2026-11-05" max="2026-11-20" words={{ clear: 'Togli la data' }} />)
    fireEvent.click(document.getElementById('due')!)
    await settle()
    const day = (n: string) => [...document.querySelectorAll<HTMLElement>('[data-part="table-cell-trigger"]')].find((d) => d.textContent === n && !d.hasAttribute('data-outside-range'))!
    expect(day('4').hasAttribute('data-disabled')).toBe(true)
    expect(day('5').hasAttribute('data-disabled')).toBe(false)
    expect(day('20').hasAttribute('data-disabled')).toBe(false)
    expect(day('21').hasAttribute('data-disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Togli la data' })).toBeNull()
  })

  test('the date and time field takes the same options', async () => {
    render(<DateTimeField id="remind" value="2026-11-07T09:00" onChange={() => {}} locale="it-IT" words={{ time: 'Ora', done: 'Fatto' }} />)
    expect(document.getElementById('remind')!.textContent).toBe('7 novembre 2026, 09:00')
    fireEvent.click(document.getElementById('remind')!)
    await settle()
    expect(screen.getByText('Ora')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fatto' })).toBeTruthy()
  })
})
