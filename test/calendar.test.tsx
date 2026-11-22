import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { DateField, DateRangeField, DateTimeField, dayPicks, rangePicks, type DateRange } from '../src/internal/date-field'

const noop = () => {}


// Ark's date picker acts in a microtask and moves focus in an animation frame: the loop is let run.
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)) })
/** A key on the focused element, then Ark's machine and its focus move. */
const key = async (name: string, init: KeyboardEventInit = {}) => {
  fireEvent.keyDown(document.activeElement!, { key: name, ...init })
  await flush()
}
/** A click, then Ark's machine. */
const press = async (el: Element) => {
  fireEvent.click(el)
  await flush()
}
/** Waits until focus is on the day with this name (Ark moves focus in a frame; the clock is not trusted). */
const expectFocus = (label: string) => waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe(label))
/** Waits until the calendar shows this title. */
const expectTitle = (text: string) => waitFor(() => expect(title()).toBe(text))
/** The title of the calendar: the month (or the year, or the decade) it shows. */
const title = () => document.querySelector('[data-part="view"]:not([hidden]) [data-part="range-text"]')!.textContent

async function openField(name: string) {
  const trigger = screen.getByRole('button', { name })
  fireEvent.click(trigger)
  await flush()
  return { trigger, grid: screen.getByRole('grid') }
}

function Controlled({ initial, onChange, time = false }: { initial: string | null; onChange: (v: string | null) => void; time?: boolean }) {
  const [value, setValue] = useState(initial)
  const Comp = time ? DateTimeField : DateField
  return (
    <>
      <label htmlFor="f">{time ? 'Reminder' : 'Due date'}</label>
      {/* A reminder field passes its own placeholder, as an app's form does. */}
      <Comp id="f" value={value} onChange={(v) => { setValue(v); onChange(v) }} {...(time ? { placeholder: 'No reminder' } : {})} />
    </>
  )
}

test('the trigger is named by the field label and shows the date in English', () => {
  render(<Controlled initial="2026-11-07" onChange={noop} />)
  const trigger = screen.getByLabelText('Due date')
  expect(trigger.tagName).toBe('BUTTON')
  expect(trigger.textContent).toBe('November 7, 2026')
})

test('an empty value shows a calm placeholder', () => {
  render(<Controlled initial={null} onChange={noop} />)
  expect(screen.getByLabelText('Due date').textContent).toBe('No date')
})

test('the month is in English and the week starts on Monday', async () => {
  render(<Controlled initial="2026-11-07" onChange={noop} />)
  const { grid } = await openField('Due date')
  await expectTitle('November 2026')
  const heads = within(grid).getAllByRole('columnheader').map((h) => h.getAttribute('abbr'))
  expect(heads).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  // November 1, 2026 is a Sunday: the first row starts on Monday, October 26.
  const first = within(grid).getAllByRole('gridcell')[0]!
  expect(within(first).getByRole('button').getAttribute('aria-label')).toBe('Monday, October 26, 2026')
  const selected = within(grid).getByRole('gridcell', { selected: true })
  expect(within(selected).getByRole('button').getAttribute('aria-label')).toBe('Saturday, November 7, 2026')
})

test('a mouse click picks the day as YYYY-MM-DD and closes', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  const { trigger, grid } = await openField('Due date')
  fireEvent.click(within(grid).getByRole('button', { name: 'Tuesday, November 17, 2026' }))
  await flush()
  expect(onChange).toHaveBeenCalledWith('2026-11-17')
  expect(screen.queryByRole('grid')).toBeNull()
  expect(trigger.textContent).toBe('November 17, 2026')
})

test('keyboard: focus starts on the chosen day, arrows and PageDown move, Enter picks', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  const { grid } = await openField('Due date')
  await expectFocus('Saturday, November 7, 2026')
  // Only the active day is a Tab stop (roving focus), and each day is a real button.
  expect(within(grid).getAllByRole('button').filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('aria-label'))).toEqual(['Saturday, November 7, 2026'])
  expect(document.activeElement?.tagName).toBe('BUTTON')
  await key('ArrowRight')
  await expectFocus('Sunday, November 8, 2026')
  await key('ArrowDown')
  await expectFocus('Sunday, November 15, 2026')
  await key('PageDown')
  await expectTitle('December 2026')
  await expectFocus('Tuesday, December 15, 2026')
  await key('PageUp')
  await key('ArrowLeft')
  await expectFocus('Saturday, November 14, 2026')
  // Home and End: the start and the end of the week (Monday to Sunday).
  await key('Home')
  await expectFocus('Monday, November 9, 2026')
  await key('End')
  await expectFocus('Sunday, November 15, 2026')
  await key('ArrowLeft')
  // Shift+PageDown: the same day a year later.
  await key('PageDown', { shiftKey: true })
  await expectFocus('Sunday, November 14, 2027')
  await key('PageUp', { shiftKey: true })
  await expectFocus('Saturday, November 14, 2026')
  expect(screen.getByRole('grid').contains(document.activeElement)).toBe(true)
  await key('Enter')
  expect(onChange).toHaveBeenCalledWith('2026-11-14')
  expect(screen.queryByRole('grid')).toBeNull()
})

test('Space on a day chooses it too: a day is a native button', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  await openField('Due date')
  await key('ArrowRight')
  // Space on a native button is a click.
  await press(document.activeElement!)
  expect(onChange).toHaveBeenCalledWith('2026-11-08')
})

test('a day outside the month can be chosen; today is marked for screen readers', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  const { grid } = await openField('Due date')
  const outside = within(grid).getByRole('button', { name: 'Monday, October 26, 2026' })
  expect(outside.hasAttribute('data-outside-range')).toBe(true)
  await press(outside)
  expect(onChange).toHaveBeenCalledWith('2026-10-26')
})

test('the title opens the months and then the years: a far date is a few presses away', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  await openField('Due date')
  await press(screen.getByRole('button', { name: 'November 2026, choose the month' }))
  await expectTitle('2026')
  expect(screen.getByRole('button', { name: 'Previous year' })).toBeTruthy()
  await press(screen.getByRole('button', { name: '2026, choose the year' }))
  await expectTitle('2020 - 2029')
  await press(screen.getByRole('button', { name: '2028' }))
  await expectTitle('2028')
  await press(screen.getByRole('button', { name: 'March 2028' }))
  await expectTitle('March 2028')
  expect(onChange).not.toHaveBeenCalled()
  await press(within(screen.getByRole('grid', { hidden: false })).getByRole('button', { name: 'Wednesday, March 15, 2028' }))
  expect(onChange).toHaveBeenCalledWith('2028-03-15')
})

test('Escape closes without choosing and gives focus back to the field', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  const { trigger } = await openField('Due date')
  await key('ArrowRight')
  await key('Escape')
  expect(screen.queryByRole('grid')).toBeNull()
  expect(onChange).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(trigger)
})

test('the next-month button shows the following month', async () => {
  render(<Controlled initial="2026-12-07" onChange={noop} />)
  await openField('Due date')
  await press(screen.getByRole('button', { name: 'Next month' }))
  await expectTitle('January 2027')
  await press(screen.getByRole('button', { name: 'Previous month' }))
  await press(screen.getByRole('button', { name: 'Previous month' }))
  await expectTitle('November 2026')
})

test('the date card has no button that removes the date: a calendar is there to give one', async () => {
  const onChange = vi.fn()
  render(<Controlled initial="2026-11-07" onChange={onChange} />)
  await openField('Due date')
  expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull()
  // The chosen day pressed again stays chosen: it is not a hidden way to remove the date.
  await press(within(screen.getByRole('grid')).getByRole('button', { name: 'Saturday, November 7, 2026' }))
  expect(onChange.mock.calls.every(([v]) => v === '2026-11-07')).toBe(true)
  expect(screen.getByLabelText('Due date').textContent).toBe('November 7, 2026')
})

test('reminder: a day gives YYYY-MM-DDTHH:mm with the time field, and the time can change', async () => {
  const onChange = vi.fn()
  render(<Controlled time initial="2026-11-07T18:30" onChange={onChange} />)
  const trigger = screen.getByLabelText('Reminder')
  expect(trigger.textContent).toBe('November 7, 2026, 18:30')
  const { grid } = await openField('Reminder')
  const timeInput = screen.getByLabelText('Time of day') as HTMLInputElement
  expect(timeInput.type).toBe('time')
  expect(timeInput.value).toBe('18:30')
  await press(within(grid).getByRole('button', { name: 'Monday, November 9, 2026' }))
  expect(onChange).toHaveBeenLastCalledWith('2026-11-09T18:30')
  // The card stays open: the time may still change.
  expect(screen.getByRole('grid')).toBeTruthy()
  fireEvent.change(timeInput, { target: { value: '07:05' } })
  expect(onChange).toHaveBeenLastCalledWith('2026-11-09T07:05')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await flush()
  expect(trigger.textContent).toBe('November 9, 2026, 07:05')
})

test('reminder: an empty value has the time off (09:00); the “Time” box turns the time on', async () => {
  const onChange = vi.fn()
  render(<Controlled time initial={null} onChange={onChange} />)
  expect(screen.getByLabelText('Reminder').textContent).toBe('No reminder')
  await openField('Reminder')
  const box = screen.getByRole('checkbox', { name: 'Time' })
  const timeInput = screen.getByLabelText('Time of day') as HTMLInputElement
  expect(box.getAttribute('aria-checked')).toBe('false')
  expect(timeInput.value).toBe('09:00')
  expect(timeInput.disabled).toBe(true)
  // Without «Time» a day means 09:00.
  const grid = screen.getByRole('grid')
  await press(within(grid).getAllByRole('button')[10]!)
  expect(onChange.mock.lastCall?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T09:00$/)
  // With «Time» the time is typed, and the value follows.
  fireEvent.click(box)
  expect(timeInput.disabled).toBe(false)
  fireEvent.change(timeInput, { target: { value: '10:00' } })
  expect(onChange.mock.lastCall?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T10:00$/)
  // Turning it off goes back to 09:00.
  fireEvent.click(box)
  expect(timeInput.value).toBe('09:00')
  expect(onChange.mock.lastCall?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T09:00$/)
})

test('reminder: no “Clear the date” button; a click on the chosen day removes it and a new one can be chosen after', async () => {
  const onChange = vi.fn()
  render(<Controlled time initial="2026-11-07T09:00" onChange={onChange} />)
  const trigger = screen.getByLabelText('Reminder')
  await openField('Reminder')
  expect(screen.queryByRole('button', { name: 'Clear the date' })).toBeNull()
  const grid = screen.getByRole('grid')
  await press(within(grid).getByRole('button', { name: 'Saturday, November 7, 2026' }))
  expect(onChange).toHaveBeenLastCalledWith(null)
  expect(trigger.textContent).toBe('No reminder')
  // Closed and reopened, or in the same popover: it can be set again.
  await press(within(screen.getByRole('grid')).getByRole('button', { name: 'Monday, November 9, 2026' }))
  expect(onChange).toHaveBeenLastCalledWith('2026-11-09T09:00')
  expect(trigger.textContent).toBe('November 9, 2026, 09:00')
  // From the keyboard too: Enter on the chosen day removes it.
  act(() => within(screen.getByRole('grid')).getByRole('button', { name: 'Monday, November 9, 2026' }).focus())
  await key('Enter')
  expect(onChange).toHaveBeenLastCalledWith(null)
  await press(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByRole('grid')).toBeNull()
  expect(document.activeElement).toBe(trigger)
  await openField('Reminder')
  await press(within(screen.getByRole('grid')).getByRole('button', { name: 'Tuesday, November 10, 2026' }))
  expect(onChange).toHaveBeenLastCalledWith('2026-11-10T09:00')
})

test('reminder: a time left empty while typing never breaks the value (the last valid time is kept)', async () => {
  const onChange = vi.fn()
  render(<Controlled time initial={null} onChange={onChange} />)
  await openField('Reminder')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Time' }))
  const timeInput = screen.getByLabelText('Time of day') as HTMLInputElement
  fireEvent.change(timeInput, { target: { value: '14:20' } })
  // The time field half-typed (empty): no broken value.
  fireEvent.change(timeInput, { target: { value: '' } })
  await press(within(screen.getByRole('grid')).getByRole('button', { name: /^Monday, .* 9, / }))
  expect(onChange.mock.lastCall?.[0]).toMatch(/^\d{4}-\d{2}-09T14:20$/)
  expect(onChange.mock.calls.every(([v]) => v === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))).toBe(true)
})

test('reminder: a time other than 09:00 opens with “Time” on, 09:00 with it off', async () => {
  const { unmount } = render(<Controlled time initial="2026-11-07T18:30" onChange={noop} />)
  await openField('Reminder')
  expect(screen.getByRole('checkbox', { name: 'Time' }).getAttribute('aria-checked')).toBe('true')
  unmount()
  render(<Controlled time initial="2026-11-07T09:00" onChange={noop} />)
  await openField('Reminder')
  expect(screen.getByRole('checkbox', { name: 'Time' }).getAttribute('aria-checked')).toBe('false')
})

test('without a placeholder of their own the fields say “No date” and “No date and time”', () => {
  render(
    <>
      <label htmlFor="d">Day</label>
      <DateField id="d" value={null} onChange={noop} />
      <label htmlFor="t">When</label>
      <DateTimeField id="t" value={null} onChange={noop} />
    </>,
  )
  expect(screen.getByLabelText('Day').textContent).toBe('No date')
  expect(screen.getByLabelText('When').textContent).toBe('No date and time')
})

/* ———— A range of days, and the quick choices ———— */

function Ranged({ initial, onChange, picks = false }: { initial: DateRange | null; onChange: (v: DateRange | null) => void; picks?: boolean }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="r">Stay</label>
      <DateRangeField id="r" value={value} onChange={(v) => { setValue(v); onChange(v) }} {...(picks ? { picks: rangePicks(undefined, new Date(2026, 10, 18)) } : {})} />
    </>
  )
}
const dayButton = (grid: HTMLElement, name: string) => within(grid).getByRole('button', { name })

test('a range field shows both ends, or «No dates»; ends the wrong way round read as no value', () => {
  const { unmount } = render(<Ranged initial={{ start: '2026-11-20', end: '2026-11-24' }} onChange={noop} />)
  expect(screen.getByLabelText('Stay').textContent).toMatch(/^November 20\s*[–-]\s*24, 2026$/)
  unmount()
  const again = render(<Ranged initial={null} onChange={noop} />)
  expect(screen.getByLabelText('Stay').textContent).toBe('No dates')
  again.unmount()
  render(<Ranged initial={{ start: '2026-11-24', end: '2026-11-20' }} onChange={noop} />)
  expect(screen.getByLabelText('Stay').textContent).toBe('No dates')
})

test('two clicks choose a range: the caller hears of it only with both ends, the earlier one first, and the card closes', async () => {
  const onChange = vi.fn()
  render(<Ranged initial={{ start: '2026-11-03', end: '2026-11-05' }} onChange={onChange} />)
  const { trigger, grid } = await openField('Stay')
  // The days between the two ends are in the range; the ends are chosen days.
  expect(dayButton(grid, 'Wednesday, November 4, 2026').hasAttribute('data-in-range')).toBe(true)
  expect(dayButton(grid, 'Tuesday, November 3, 2026').hasAttribute('data-selected')).toBe(true)
  // The last day first: a first click alone is not a value yet.
  await press(dayButton(grid, 'Tuesday, November 24, 2026'))
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.queryByRole('grid')).toBeTruthy()
  await press(dayButton(grid, 'Friday, November 20, 2026'))
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith({ start: '2026-11-20', end: '2026-11-24' })
  await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
  expect(trigger.textContent).toMatch(/^November 20\s*[–-]\s*24, 2026$/)
})

test('a first day chosen and the card closed without a second one leaves the value as it was', async () => {
  const onChange = vi.fn()
  render(<Ranged initial={{ start: '2026-11-03', end: '2026-11-05' }} onChange={onChange} />)
  const { trigger, grid } = await openField('Stay')
  await press(dayButton(grid, 'Tuesday, November 24, 2026'))
  await key('Escape')
  await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
  expect(onChange).not.toHaveBeenCalled()
  expect(trigger.textContent).toMatch(/^November 3\s*[–-]\s*5, 2026$/)
  // Opened again, the range is the caller's, not the day left half chosen.
  const again = await openField('Stay')
  expect(dayButton(again.grid, 'Wednesday, November 4, 2026').hasAttribute('data-in-range')).toBe(true)
})

test('the range card has no button that removes the dates either', async () => {
  render(<Ranged initial={{ start: '2026-11-03', end: '2026-11-05' }} onChange={noop} />)
  await openField('Stay')
  expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull()
})

test('the usual quick choices: today, tomorrow and this weekend; the weekend already on starts today', () => {
  // Wednesday, November 18, 2026.
  expect(dayPicks(undefined, new Date(2026, 10, 18))).toEqual([
    { label: 'Today', value: '2026-11-18' },
    { label: 'Tomorrow', value: '2026-11-19' },
    { label: 'This weekend', value: '2026-11-21' },
  ])
  expect(rangePicks(undefined, new Date(2026, 10, 18))).toEqual([
    { label: 'This weekend', start: '2026-11-21', end: '2026-11-22' },
    { label: 'Next 7 days', start: '2026-11-18', end: '2026-11-24' },
  ])
  // On the Saturday and on the Sunday the weekend is what is left of it.
  expect(dayPicks(undefined, new Date(2026, 10, 21))[2]).toEqual({ label: 'This weekend', value: '2026-11-21' })
  expect(dayPicks(undefined, new Date(2026, 10, 22))[2]).toEqual({ label: 'This weekend', value: '2026-11-22' })
  expect(rangePicks(undefined, new Date(2026, 10, 22))[0]).toEqual({ label: 'This weekend', start: '2026-11-22', end: '2026-11-22' })
})

test('a quick choice sets the day and closes; the one that is the value is pressed; a choice that is not a date is left out', async () => {
  const onChange = vi.fn()
  function Field() {
    const [value, setValue] = useState<string | null>('2026-11-19')
    return (
      <>
        <label htmlFor="q">Due date</label>
        <DateField id="q" value={value} onChange={(v) => { setValue(v); onChange(v) }} picks={[...dayPicks(undefined, new Date(2026, 10, 18)), { label: 'Never', value: 'soon' }]} />
      </>
    )
  }
  render(<Field />)
  await openField('Due date')
  const row = document.querySelector<HTMLElement>('[data-slot="date-picks"]')!
  expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual(['Today', 'Tomorrow', 'This weekend'])
  expect(within(row).getByRole('button', { name: 'Tomorrow' }).getAttribute('aria-pressed')).toBe('true')
  expect(within(row).getByRole('button', { name: 'Today' }).getAttribute('aria-pressed')).toBe('false')
  await press(within(row).getByRole('button', { name: 'This weekend' }))
  expect(onChange).toHaveBeenCalledWith('2026-11-21')
  await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
  expect(screen.getByLabelText('Due date').textContent).toBe('November 21, 2026')
})

test('a quick choice of a range field sets both ends and closes', async () => {
  const onChange = vi.fn()
  render(<Ranged initial={null} onChange={onChange} picks />)
  await openField('Stay')
  await press(screen.getByRole('button', { name: 'Next 7 days' }))
  expect(onChange).toHaveBeenCalledWith({ start: '2026-11-18', end: '2026-11-24' })
  await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
})

test('without quick choices the card has no row for them', async () => {
  render(<Controlled initial="2026-11-07" onChange={noop} />)
  await openField('Due date')
  expect(document.querySelector('[data-slot="date-picks"]')).toBeNull()
})
