// Slider, Avatar, SearchField and Combobox; suggestions in the labels field; a sheet beside the page; the tooltip's
// key hint; the date field's limits, locale and words.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Logo, ItemRow, NavItem, NavList, Avatar, ChipsInput, Combobox, DateField, DateTimeField, DialogContent, DialogRoot, DialogTitle, SearchField, Sheet, SheetContent, SheetTitle, Slider, Tooltip, initials } from '../src'
import { contrast } from '../src'
import { inkOn } from '../src/components/ui/avatar'
import { classes, settle } from './helpers'

const coarse = (cls: string) => 'pointer-coarse:' + cls
// `settle(120)`: Ark commits in a frame, the test waits for it, as the browser would.
/** Writing in a box as a user does: the box has the focus first. */
const write = async (box: HTMLInputElement, text: string) => {
  act(() => box.focus())
  fireEvent.change(box, { target: { value: text } })
  await settle(120)
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
      await settle(120)
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

describe('Logo', () => {
  const logo = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="logo"]')!

  test('a small square box, 16px or 20px, with the picture whole in it: no border, no ground, nothing that recolours it', () => {
    const small = render(<Logo src="/logos/db.svg" />)
    expect(classes(logo(small.container))).toContain('size-4')
    const img = logo(small.container).querySelector('img')!
    expect(img.getAttribute('src')).toBe('/logos/db.svg')
    expect(classes(img)).toContain('object-contain')
    expect(logo(small.container).className + img.className).not.toMatch(/border|bg-|shadow|rounded|invert|filter|grayscale/)
    small.unmount()
    const medium = render(<Logo src="/logos/db.svg" size="md" />)
    expect(classes(logo(medium.container))).toContain('size-5')
  })

  test('without a name, or decorative, it is hidden from screen readers; with a name it is an image of that name', () => {
    const plain = render(<Logo src="/logos/db.svg" />)
    expect(logo(plain.container).getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()
    plain.unmount()
    const named = render(<Logo src="/logos/db.svg" name="PostgreSQL" />)
    expect(screen.getByRole('img', { name: 'PostgreSQL' })).toBe(logo(named.container))
    expect(logo(named.container).hasAttribute('aria-hidden')).toBe(false)
    // The box says the name once: the picture itself has none.
    expect(logo(named.container).querySelector('img')!.getAttribute('alt')).toBe('')
    named.unmount()
    const beside = render(<Logo src="/logos/db.svg" name="PostgreSQL" decorative />)
    expect(logo(beside.container).getAttribute('aria-hidden')).toBe('true')
    expect(logo(beside.container).hasAttribute('aria-label')).toBe(false)
  })

  test('the icon is in the box while the picture loads and when it fails, and the box keeps its size; without an icon the box is empty', () => {
    const { container, rerender } = render(<Logo src="/logos/db.svg" icon="layers" />)
    expect(logo(container).dataset.state).toBe('loading')
    expect(logo(container).querySelector('svg')).not.toBeNull()
    // Not seen until it has loaded.
    expect(classes(logo(container).querySelector('img'))).toContain('opacity-0')
    fireEvent.load(logo(container).querySelector('img')!)
    expect(logo(container).dataset.state).toBe('shown')
    expect(logo(container).querySelector('svg')).toBeNull()
    expect(classes(logo(container).querySelector('img'))).not.toContain('opacity-0')
    expect(classes(logo(container))).toContain('size-4')
    // Another address starts again; it fails: the icon, and no broken picture.
    rerender(<Logo src="/logos/missing.svg" icon="layers" />)
    expect(logo(container).dataset.state).toBe('loading')
    fireEvent.error(logo(container).querySelector('img')!)
    expect(logo(container).dataset.state).toBe('failed')
    expect(logo(container).querySelector('img')).toBeNull()
    expect(logo(container).querySelector('svg')).not.toBeNull()
    expect(classes(logo(container))).toContain('size-4')
    rerender(<Logo src="/logos/gone.svg" />)
    fireEvent.error(logo(container).querySelector('img')!)
    expect(logo(container).childElementCount).toBe(0)
    expect(classes(logo(container))).toContain('size-4')
  })

  test('a picture that was seen is there at once when it is drawn again, and one that failed is not asked for again', () => {
    const first = render(<Logo src="/logos/seen.svg" icon="layers" />)
    fireEvent.load(logo(first.container).querySelector('img')!)
    first.unmount()
    const again = render(<Logo src="/logos/seen.svg" icon="layers" />)
    expect(logo(again.container).dataset.state).toBe('shown')
    expect(logo(again.container).querySelector('svg')).toBeNull()
    expect(classes(logo(again.container).querySelector('img'))).not.toContain('opacity-0')
    again.unmount()
    const broken = render(<Logo src="/logos/broken.svg" icon="layers" />)
    fireEvent.error(logo(broken.container).querySelector('img')!)
    broken.unmount()
    const still = render(<Logo src="/logos/broken.svg" icon="layers" />)
    expect(logo(still.container).dataset.state).toBe('failed')
    expect(logo(still.container).querySelector('img')).toBeNull()
  })

  test('it goes where an icon goes: the leading of a row, the icon of a navigation row', () => {
    const { container } = render(
      <>
        <ItemRow title="PostgreSQL" leading={<Logo src="/logos/db.svg" icon="layers" />} />
        <NavList aria-label="Services">
          <NavItem icon={<Logo src="/logos/queue.svg" icon="layers" />}>Queue</NavItem>
        </NavList>
      </>,
    )
    expect(container.querySelector('[data-slot="item-row-leading"] [data-slot="logo"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="nav-item-icon"] [data-slot="logo"]')).not.toBeNull()
  })
})

describe('Avatar with an identity colour', () => {
  test('a #rrggbb fill with the ink that reads on it; anything else is the neutral tile; something else than initials can be drawn', () => {
    const { rerender } = render(<Avatar name="Work account" color="#4f46e5" />)
    const tile = screen.getByRole('img', { name: 'Work account' })
    expect(tile.getAttribute('data-tinted')).toBe('')
    const style = tile.getAttribute('style') ?? ''
    expect(style).toContain('background-color: rgb(79, 70, 229)')
    // White on indigo, not the dark ink.
    expect(style).toContain('color: rgb(255, 255, 255)')
    // A light fill takes the dark ink.
    rerender(<Avatar name="Work account" color="#f5d76e" />)
    expect(screen.getByRole('img', { name: 'Work account' }).getAttribute('style') ?? '').not.toContain('color: rgb(255, 255, 255)')
    // The ink always reads: at least 4.5:1 on any fill the app gives.
    for (const fill of ['#4f46e5', '#f5d76e', '#2f9e6e', '#e34432', '#ffffff', '#000000']) {
      expect(contrast(fill, inkOn(fill)), fill).toBeGreaterThanOrEqual(4.5)
    }
    // Not a hex colour: the neutral tile, as before.
    rerender(<Avatar name="Work account" color="red" />)
    expect(screen.getByRole('img', { name: 'Work account' }).getAttribute('style') ?? '').toBe('')
    expect(screen.getByRole('img', { name: 'Work account' }).getAttribute('data-tinted')).toBeNull()
    // `children` stand in for the initials.
    rerender(<Avatar name="All accounts" color="#2f9e6e"><span data-testid="icon" /></Avatar>)
    expect(screen.getByTestId('icon')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'All accounts' }).textContent).toBe('')
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
    // A ghost icon button: 44px with a finger, as every button.
    expect(classes(clear)).toEqual(expect.arrayContaining([coarse('min-h-11'), coarse('min-w-11'), 'hover:bg-ink/6', 'active:bg-ink/9']))
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
    await settle(120)
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
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBeNull()
    rerender(<Combobox aria-label="Who" options={PEOPLE} value={null} onValueChange={() => {}} aria-invalid />)
    // The border of every field: the destructive colour while the box says it is invalid, and no darker one under the pointer.
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true')
    expect(classes(screen.getByRole('combobox'))).toEqual(expect.arrayContaining(['aria-invalid:border-destructive', 'not-aria-invalid:hover:border-input']))
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
    await settle(120)
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
    await settle(120)
    expect(spy).toHaveBeenLastCalledWith(['home', 'zebra'])
  })
})

describe('a window taller than the page', () => {
  test('it scrolls inside its own margins and is centred without a translation (a translated window would clip a `fixed` card in it)', () => {
    render(
      <DialogRoot open>
        <DialogContent>
          <DialogTitle>Long</DialogTitle>
        </DialogContent>
      </DialogRoot>,
    )
    const list = classes(document.querySelector('[data-slot="dialog-content"]')!)
    expect(list).toContain('overflow-y-auto')
    expect(list).toContain('max-h-[calc(100dvh-2rem)]')
    expect(list.some((name) => name.includes('translate'))).toBe(false)
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

  test('`modal={false}`: the focus going to the page does not close it', async () => {
    const onOpenChange = vi.fn()
    render(
      <>
        <Sheet open modal={false} onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Details</SheetTitle>
            <button type="button">Inside</button>
          </SheetContent>
        </Sheet>
        <button type="button">Outside</button>
      </>,
    )
    act(() => screen.getByRole('button', { name: 'Inside' }).focus())
    await settle(120)
    act(() => screen.getByRole('button', { name: 'Outside' }).focus())
    await settle(120)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull()
  })

  test('it says why it closes: Esc, or a press outside it', async () => {
    const onOpenChange = vi.fn()
    render(
      <>
        <Sheet open modal={false} onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Details</SheetTitle>
            <button type="button">Inside</button>
          </SheetContent>
        </Sheet>
        <button type="button">Outside</button>
      </>,
    )
    act(() => screen.getByRole('button', { name: 'Inside' }).focus())
    await settle(120)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' })
    await settle(120)
    expect(onOpenChange).toHaveBeenLastCalledWith(false, 'escape')
    onOpenChange.mockClear()
    const outside = screen.getByRole('button', { name: 'Outside' })
    fireEvent.pointerDown(outside)
    fireEvent.mouseDown(outside)
    fireEvent.pointerUp(outside)
    fireEvent.mouseUp(outside)
    fireEvent.click(outside)
    await settle(120)
    expect(onOpenChange).toHaveBeenLastCalledWith(false, 'outside')
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
    await settle(120)
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
    render(<DateField id="due" value="2026-11-10" onChange={() => {}} min="2026-11-05" max="2026-11-20" />)
    fireEvent.click(document.getElementById('due')!)
    await settle(120)
    const day = (n: string) => [...document.querySelectorAll<HTMLElement>('[data-part="table-cell-trigger"]')].find((d) => d.textContent === n && !d.hasAttribute('data-outside-range'))!
    expect(day('4').hasAttribute('data-disabled')).toBe(true)
    expect(day('5').hasAttribute('data-disabled')).toBe(false)
    expect(day('20').hasAttribute('data-disabled')).toBe(false)
    expect(day('21').hasAttribute('data-disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: /clear|remove/i })).toBeNull()
  })

  test('the date and time field takes the same options', async () => {
    render(<DateTimeField id="remind" value="2026-11-07T09:00" onChange={() => {}} locale="it-IT" words={{ time: 'Ora', done: 'Fatto' }} />)
    expect(document.getElementById('remind')!.textContent).toBe('7 novembre 2026, 09:00')
    fireEvent.click(document.getElementById('remind')!)
    await settle(120)
    expect(screen.getByText('Ora')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fatto' })).toBeTruthy()
  })
})
