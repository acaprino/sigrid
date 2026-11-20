// Park UI (MIT) date-picker 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/date-picker.ts)
//
// From Park's `date-picker` recipe (and its component, which draws each day as a plain icon button) comes the look: the
// title between two plain arrows, the weekday row in semibold muted text, the days as 36px plain buttons (Park's sm)
// with l2 corners and a quiet fill under the pointer, the chosen day solid in the accent (Park's solid variant), today
// marked by a short accent dash under the number, 16px of padding. The grid itself is not written here: it is the day,
// month and year views of Ark UI's DatePicker (`@ark-ui/react/date-picker`). It lives inside a `DatePicker.Root` (see
// `internal/date-field.tsx`), which holds the value.
// Ark gives the grid and its keyboard (arrows between days, PageUp and PageDown for the month, with Shift for the year,
// Home and End for the week, Enter chooses; one day only has `tabIndex` 0), the days outside the month, today, the
// title that opens the months and then the years, and the announcement of the month when it changes.
// Ours: the sizes (`--cell-size` is the density token `--control-sm`, 2.25rem at `normal`, 2.75rem with a finger; the days outside the month softer), the names in English (see `CALENDAR_WORDS`), a real `<button>` for each day (Space
// chooses too), the weekday headers left readable by screen readers, with the full name in `abbr`, and Home and End
// for the start and the end of the week, as in the APG date grid (Ark's go to the start and the end of the month).
import * as React from 'react'
import { DatePicker, useDatePickerContext, type DatePickerRootProps } from '@ark-ui/react/date-picker'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { FOCUS_RING } from '../../lib/focus'

type Words = NonNullable<DatePickerRootProps['translations']>
type View = 'day' | 'month' | 'year'

const SPAN: Record<View, string> = { day: 'month', month: 'year', year: 'decade' }

/** The names Ark's parts take, in English. A day is named by its full date («Saturday, November 7, 2026»). */
export const CALENDAR_WORDS: Words = {
  dayCell: (state) => state.valueText,
  prevTrigger: (view) => `Previous ${SPAN[view]}`,
  nextTrigger: (view) => `Next ${SPAN[view]}`,
  content: 'Calendar',
}

const NAV_CLASS = cn(
  'inline-flex size-(--cell-size) shrink-0 select-none items-center justify-center rounded-md p-0 text-ink-soft hover:bg-ink/6 hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
  FOCUS_RING,
)

const CELL_CLASS = cn(
  'relative flex size-full min-h-(--cell-size) min-w-(--cell-size) select-none items-center justify-center rounded-md p-0 font-normal text-sm leading-none',
  'hover:bg-ink/6',
  FOCUS_RING,
  'focus-visible:z-10',
  // Today: Park's short dash under the number, in the accent (in the chosen day's text color when it is chosen).
  "data-today:font-semibold data-today:after:absolute data-today:after:bottom-1 data-today:after:left-1/2 data-today:after:h-0.5 data-today:after:w-2 data-today:after:-translate-x-1/2 data-today:after:rounded-full data-today:after:bg-primary data-today:after:content-['']",
  // Days outside the month: `text-ink-soft` (not a half-transparent ink) to keep the text at 4.5:1.
  'data-outside-range:text-ink-soft',
  'data-selected:bg-primary data-selected:font-semibold data-selected:text-primary-foreground data-selected:hover:bg-accent-hover data-selected:after:bg-primary-foreground',
  'aria-disabled:pointer-events-none aria-disabled:text-ink-mute',
)

/** The title between the arrows: it opens the months, and from there the years. */
function Header({ view }: { view: View }) {
  const picker = useDatePickerContext()
  const range = picker.visibleRangeText.formatted
  // Its name says what it shows and what pressing it does (the visible text is part of the name).
  const next = view === 'day' ? `${range}, choose the month` : view === 'month' ? `${range}, choose the year` : range
  return (
    <DatePicker.ViewControl className="flex w-full items-center justify-between gap-1">
      <DatePicker.PrevTrigger className={NAV_CLASS}>
        <ChevronLeftIcon className="size-4" aria-hidden />
      </DatePicker.PrevTrigger>
      <DatePicker.ViewTrigger
        aria-label={next}
        className={cn('h-(--cell-size) min-w-0 flex-1 select-none rounded-md px-2 font-semibold text-sm hover:bg-ink/6 disabled:hover:bg-transparent', FOCUS_RING)}
      >
        <DatePicker.RangeText />
      </DatePicker.ViewTrigger>
      <DatePicker.NextTrigger className={NAV_CLASS}>
        <ChevronRightIcon className="size-4" aria-hidden />
      </DatePicker.NextTrigger>
    </DatePicker.ViewControl>
  )
}

/** The twelve months, or the years of a decade: four per row. */
function Choices({ view }: { view: 'month' | 'year' }) {
  const picker = useDatePickerContext()
  const rows = view === 'month' ? picker.getMonthsGrid({ columns: 4, format: 'short' }) : picker.getYearsGrid({ columns: 4 })
  return (
    <DatePicker.View view={view} className="flex flex-col gap-3">
      <Header view={view} />
      <DatePicker.Table className="w-full border-collapse">
        <DatePicker.TableBody>
          {rows.map((row, index) => (
            <DatePicker.TableRow key={index} className="mt-1 flex w-full gap-1 first:mt-0">
              {row.map((cell) => (
                <DatePicker.TableCell key={cell.value} value={cell.value} className="flex-1 p-0 text-center">
                  <DatePicker.TableCellTrigger asChild>
                    <button type="button" className={cn(CELL_CLASS, 'h-(--cell-size)')}>
                      {cell.label}
                    </button>
                  </DatePicker.TableCellTrigger>
                </DatePicker.TableCell>
              ))}
            </DatePicker.TableRow>
          ))}
        </DatePicker.TableBody>
      </DatePicker.Table>
    </DatePicker.View>
  )
}

export type CalendarProps = {
  /**
   * A click, Enter or Space on the day that is already chosen calls this instead of choosing it again (the reminder
   * uses it to remove the day).
   */
  onPressSelected?: (() => void) | undefined
  className?: string | undefined
}

function Calendar({ onPressSelected, className }: CalendarProps) {
  const picker = useDatePickerContext()
  const grid = React.useRef<HTMLTableElement>(null)
  const root = React.useRef<HTMLDivElement>(null)
  // From days to months to years the view that had focus is hidden: before the browser drops that focus on nothing
  // (see the note on the day cells), it is parked on the card; Ark then moves it to the active cell of the new view.
  const { view } = picker
  React.useLayoutEffect(() => {
    const focused = root.current?.ownerDocument.activeElement
    if (focused instanceof HTMLElement && root.current?.contains(focused) && focused.closest('[data-part="view"][hidden]')) {
      root.current.closest<HTMLElement>('[data-part="content"]')?.focus({ preventScroll: true })
    }
  }, [view])
  // Home and End: the first and the last day of the focused day's week, in the order the header shows.
  const weekEdge = (e: React.KeyboardEvent) => {
    if (e.key !== 'Home' && e.key !== 'End') return
    const first = picker.weekDays[0]
    if (!first) return
    e.preventDefault()
    const from = picker.focusedValue
    const along = (((from.toDate('UTC').getUTCDay() - first.value.toDate('UTC').getUTCDay()) % 7) + 7) % 7
    picker.setFocusedValue(e.key === 'Home' ? from.subtract({ days: along }) : from.add({ days: 6 - along }))
    // Ark moves its roving `tabIndex` to that day; focus follows it once the grid has rendered it.
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>('[data-part="table-cell-trigger"][data-focus]')?.focus({ preventScroll: true }))
  }
  return (
    <div ref={root} data-slot="calendar" className={cn('w-fit p-4 [--cell-size:var(--control-sm)] pointer-coarse:[--cell-size:2.75rem]', className)}>
      <DatePicker.View view="day" className="flex flex-col gap-3">
        <Header view="day" />
        <DatePicker.Table ref={grid} onKeyDown={weekEdge} className="w-full border-collapse">
          {/* Ark hides the header row from screen readers (each day says its weekday): here it stays, as in a table. */}
          <DatePicker.TableHead aria-hidden={false}>
            <DatePicker.TableRow className="flex gap-1">
              {picker.weekDays.map((day) => (
                <DatePicker.TableHeader key={day.long} scope="col" abbr={day.long} className="flex h-(--cell-size) flex-1 select-none items-center justify-center pointer-coarse:h-9 font-semibold text-sm text-ink-mute">
                  {day.short}
                </DatePicker.TableHeader>
              ))}
            </DatePicker.TableRow>
          </DatePicker.TableHead>
          <DatePicker.TableBody>
            {picker.weeks.map((week, index) => (
              <DatePicker.TableRow key={index} className="mt-1 flex w-full gap-1">
                {week.map((day, column) => {
                  const again = onPressSelected && picker.getDayTableCellState({ value: day, visibleRange: picker.visibleRange }).selected ? onPressSelected : undefined
                  return (
                    // Keyed by its place, not by its date: when the month changes the buttons stay (with other days),
                    // so the focused one is not removed from under the keyboard. Inside a modal sheet a focus that
                    // falls on nothing is taken back by the sheet, and Ark would close the card as "focus outside".
                    <DatePicker.TableCell key={column} value={day} visibleRange={picker.visibleRange} className="relative aspect-square flex-1 select-none p-0 text-center">
                      <DatePicker.TableCellTrigger
                        asChild
                        // Before Ark's own handlers: a prevented event is one they leave alone.
                        onClick={(e: React.MouseEvent) => {
                          if (!again) return
                          e.preventDefault()
                          again()
                        }}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (!again || e.nativeEvent.isComposing || e.key !== 'Enter') return
                          e.preventDefault()
                          again()
                        }}
                      >
                        <button type="button" className={CELL_CLASS}>
                          {day.day}
                        </button>
                      </DatePicker.TableCellTrigger>
                    </DatePicker.TableCell>
                  )
                })}
              </DatePicker.TableRow>
            ))}
          </DatePicker.TableBody>
        </DatePicker.Table>
      </DatePicker.View>
      <Choices view="month" />
      <Choices view="year" />
    </div>
  )
}

export { Calendar }
