// Park UI (MIT) input 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts)
// From Park's `input` recipe (md): the button that opens the calendar has the field's form (40px, l2 corners, 12px of
// side padding); the card is Park's date-picker content (l3 corners, the lg elevation).
// The date field: a button that shows the date and opens the calendar, on Ark UI's DatePicker
// (`@ark-ui/react/date-picker`). Two variants (a form can use both), with the same contract as the native fields they
// replace: `DateField` gives and receives `YYYY-MM-DD` (or null), `DateTimeField` `YYYY-MM-DDTHH:mm` in local time
// (or null; the time is switched on with the «Time» checkbox, otherwise 09:00). Only formatting of local dates: no time
// zones, no «tomorrow». The button takes the `id` of the field's `<label>` (accessible name «Due date», «Reminder»).
// Ark gives: the open state and its dismissal (Esc or a click outside close without choosing, and focus returns to the
// button), the position of the card, focus on the chosen day when it opens, the grid (see `components/calendar.tsx`).
// The card is not moved to a portal: it stays inside the field, so it is part of the modal sheet that holds it (its
// focus trap, its Esc), and `fixed` keeps the scrolling body of the sheet from clipping it.
import * as React from 'react'
import { DatePicker, useDatePickerContext } from '@ark-ui/react/date-picker'
import { CalendarDate, getDayOfWeek, getLocalTimeZone, parseDate } from '@internationalized/date'
import { Icon } from '../icons'
import { Calendar, calendarWords } from './calendar'
import { DEFAULT_WORDS, useWords, type Words } from '../words'
import { Button } from '../primitives/button'
import { Checkbox } from '../primitives/checkbox'
import { Input } from '../primitives/input'
import { useEntrance } from '../internal/motion'
import { NARROW, useMedia } from '../internal/media'
import { cn } from '../lib/utils'
import { FOCUS_FIELD } from '../lib/focus'
import { FIELD_HEIGHT, FIELD_HOVER, FIELD_OFF, FIELD_SURFACE, FIELD_TEXT } from '../lib/field'

const DEFAULT_LOCALE = 'en-US'
const longDates = new Map<string, Intl.DateTimeFormat>()
/** One formatter per locale, made once. */
function longDate(locale: string): Intl.DateTimeFormat {
  let made = longDates.get(locale)
  if (!made) {
    made = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    longDates.set(locale, made)
  }
  return made
}

/** `YYYY-MM-DD` → a calendar day; null if the string is not a real date. */
function parseDay(value: string | null | undefined): CalendarDate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  try {
    return parseDate(value)
  } catch {
    return null
  }
}

/** «November 7, 2026»: the day as the button shows it, in the field's locale. */
const dayText = (day: CalendarDate, locale: string = DEFAULT_LOCALE) => longDate(locale).format(new Date(day.year, day.month - 1, day.day))

// The surface of `Input` (Park's md field: same border, ring, 40px height, 12px of side padding), on a button.
const TRIGGER_CLASS = cn(FIELD_SURFACE, FIELD_HEIGHT, 'flex w-full min-w-0 items-center gap-2 px-(--pad-sm) py-1 text-start', FIELD_TEXT, FIELD_HOVER, FIELD_OFF, FOCUS_FIELD)

// The button is named by the field's `<label>`: Ark's own name for it («Open calendar») would replace that.
const NO_TRIGGER_NAME = () => undefined as unknown as string
const POSITIONING = { placement: 'bottom-start', gutter: 4, strategy: 'fixed' } as const

// On a phone (narrow and with a finger, as `usePhone`) the card is a sheet at the bottom of the window, not a card under
// the field: there the calendar is taller than what is left under the field, and it would end below the window. The
// positioner (Ark writes its place inline, hence the `!`) takes the bottom edge and dims the page behind it with the
// one backdrop (`BACKDROP`); a tap on the dimmed page is a tap outside the card, so it closes. The card takes the
// whole width, with the calendar in the middle, and leaves room for the home indicator with the most the device keeps
// at the foot (`--safe-area-max-inset-bottom`, as the frame's foot does): the live inset changes while the page scrolls.
const PHONE_SHEET = cn(
  'z-50 max-md:pointer-coarse:fixed! max-md:pointer-coarse:inset-x-0! max-md:pointer-coarse:top-auto! max-md:pointer-coarse:bottom-0! max-md:pointer-coarse:transform-none!',
  // `bg-drop/40` is `BACKDROP` (internal/overlay.ts), written out: a class built from a constant is not compiled.
  "max-md:pointer-coarse:before:fixed max-md:pointer-coarse:before:inset-0 max-md:pointer-coarse:before:-z-10 max-md:pointer-coarse:before:bg-drop/40 max-md:pointer-coarse:before:content-['']",
)
const PHONE_SHEET_CARD =
  'max-md:pointer-coarse:max-h-[85dvh] max-md:pointer-coarse:w-full max-md:pointer-coarse:overflow-y-auto max-md:pointer-coarse:rounded-b-none max-md:pointer-coarse:pb-(--safe-area-max-inset-bottom) max-md:pointer-coarse:[&>[data-slot=calendar]]:mx-auto'

/** A quick choice above the calendar, as the card takes it: one day, or the two ends of a range. */
type ShellPick = { label: string; days: readonly CalendarDate[] }

type FieldShellProps = {
  id?: string | undefined
  text: string | null
  placeholder: string
  selected: CalendarDate | null
  /** A day chosen in the grid. */
  onSelect: (day: CalendarDate) => void
  /** A range of days instead of one day: with `onRange` the grid chooses a first and a last day, `range` is the one chosen. */
  range?: readonly [CalendarDate, CalendarDate] | null | undefined
  /** The two ends chosen in the grid, the earlier one first. */
  onRange?: ((first: CalendarDate, last: CalendarDate) => void) | undefined
  /** Quick choices, in a row above the calendar. */
  picks?: readonly ShellPick[] | undefined
  /** How many months the calendar shows at once on wide screens (falls back to 1 below `md`). Default 1. */
  months?: 1 | 2 | undefined
  /** The card closes when a day is chosen. */
  closeOnSelect: boolean
  /** The card has just opened. */
  onOpen?: (() => void) | undefined
  /** See `Calendar`. */
  onPressSelected?: (() => void) | undefined
  animated?: boolean | undefined
  min?: string | undefined
  max?: string | undefined
  disabled?: boolean | undefined
  locale?: string | undefined
  children: React.ReactNode
}

function FieldShell({ id, text, placeholder, selected, onSelect, range, onRange, picks, months = 1, closeOnSelect, onOpen, onPressSelected, animated, min, max, disabled, locale = DEFAULT_LOCALE, children }: FieldShellProps) {
  const toolkit = useWords()
  const narrow = useMedia(NARROW)
  const numOfMonths = months === 2 && !narrow ? 2 : 1
  const translations = React.useMemo(() => ({ ...calendarWords(toolkit), trigger: NO_TRIGGER_NAME }), [toolkit])
  const earliest = parseDay(min)
  const latest = parseDay(max)
  const ranged = onRange !== undefined
  const key = ranged ? (range ? `${range[0].toString()}/${range[1].toString()}` : '') : (selected?.toString() ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chosen = React.useMemo(() => (ranged ? (range ? [range[0], range[1]] : []) : selected ? [selected] : []), [key, ranged])
  // A range is the caller's only when it has both ends: the first day alone lives here until the second is chosen
  // (or the card closes, and it is forgotten).
  const [first, setFirst] = React.useState<CalendarDate[] | null>(null)
  const value = first ?? chosen
  const ids = React.useMemo(() => (id ? { trigger: id } : undefined), [id])
  // The card mounts when it opens: with `animated` it enters with a short fade (never with prefers-reduced-motion).
  // The card enters from the side of the field it is really on (measured: the placement attribute comes too late).
  const control = React.useRef<HTMLDivElement>(null)
  const entered = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el, control.current))
  return (
    <DatePicker.Root
      ids={ids}
      value={value}
      onValueChange={(details) => {
        const days = details.value.map((day) => parseDate(day.toString().slice(0, 10)))
        if (!ranged) {
          if (days[0]) onSelect(days[0])
          return
        }
        const [a, b] = days
        if (a && b) {
          setFirst(null)
          if (a.compare(b) <= 0) onRange(a, b)
          else onRange(b, a)
        } else setFirst(days)
      }}
      onOpenChange={(details) => {
        if (details.open) onOpen?.()
        else setFirst(null)
      }}
      selectionMode={ranged ? 'range' : 'single'}
      numOfMonths={numOfMonths}
      closeOnSelect={closeOnSelect}
      locale={locale}
      {...(earliest ? { min: earliest } : {})}
      {...(latest ? { max: latest } : {})}
      {...(disabled ? { disabled: true } : {})}
      timeZone={getLocalTimeZone()}
      startOfWeek={1}
      // Six weeks always: the card keeps its height from month to month, and the grid keeps its buttons (see `Calendar`).
      fixedWeeks
      outsideDaySelectable
      translations={translations}
      positioning={POSITIONING}
      lazyMount
      unmountOnExit
      className="min-w-0"
    >
      <DatePicker.Control ref={control}>
        <DatePicker.Trigger data-slot="date-field" className={TRIGGER_CLASS}>
          <Icon name="date" className="size-4 text-ink-soft" />
          <span className={cn('truncate', text ? undefined : 'text-ink-soft')}>{text ?? placeholder}</span>
        </DatePicker.Trigger>
      </DatePicker.Control>
      <DatePicker.Positioner data-slot="date-field-positioner" className={PHONE_SHEET}>
        <DatePicker.Content
          ref={entered}
          data-slot="date-field-content"
          // Esc closes the card (Ark hears it first, on the document): it must not go on to the sheet that holds the field.
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.stopPropagation()
          }}
          className={cn('w-fit origin-top-left rounded-lg bg-popover text-popover-foreground shadow-lg outline-hidden', PHONE_SHEET_CARD)}
        >
          {picks?.length ? (
            <Picks
              picks={picks}
              current={chosen}
              closes={closeOnSelect}
              onPick={(days) => {
                setFirst(null)
                const [a, b] = days
                if (ranged && a) onRange(a, b ?? a)
                else if (a) onSelect(a)
              }}
            />
          ) : null}
          <Calendar onPressSelected={onPressSelected} />
          {children}
        </DatePicker.Content>
      </DatePicker.Positioner>
    </DatePicker.Root>
  )
}

/**
 * The quick choices: a row of small buttons above the calendar («Today», «Tomorrow», «This weekend»). A press sets the
 * day (or the two ends of a range) and, where a choice closes the card, closes it. The one that is the current value is
 * pressed, in the selection tint, as a shortcut of the duration field.
 */
function Picks({ picks, current, closes, onPick }: { picks: readonly ShellPick[]; current: readonly CalendarDate[]; closes: boolean; onPick: (days: readonly CalendarDate[]) => void }) {
  const picker = useDatePickerContext()
  const same = (days: readonly CalendarDate[]) => current.length > 0 && current[0]!.compare(days[0]!) === 0 && current[current.length - 1]!.compare(days[days.length - 1]!) === 0
  return (
    // The card is as wide as the calendar, never as wide as these: `w-0 min-w-full` keeps the row out of the card's
    // own width and then gives it all of it, so long names («Questo fine settimana») go on a second line instead of
    // stretching the card past a calendar that stays small. Each button grows to fill its line, so the lines end even.
    <div data-slot="date-picks" className="flex w-0 min-w-full flex-wrap gap-1 border-b border-border px-4 py-2.5">
      {picks.map((pick) => (
        <Button
          key={pick.label}
          type="button"
          variant="secondary"
          size="xs"
          aria-pressed={same(pick.days)}
          className="grow aria-pressed:bg-selected aria-pressed:text-selected-ink"
          onClick={(e) => {
            onPick(pick.days)
            if (!closes) return
            const trigger = picker.getTriggerProps().id
            if (trigger) e.currentTarget.ownerDocument.getElementById(trigger)?.focus({ preventScroll: true })
            picker.setOpen(false)
          }}
        >
          {pick.label}
        </Button>
      ))}
    </div>
  )
}

/** A quick choice of a date field: its name and the day it sets, as `YYYY-MM-DD`. */
export type DatePick = { label: string; value: string }
/** A quick choice of a range field: its name and the two ends it sets, as `YYYY-MM-DD`. */
export type DateRangePick = { label: string; start: string; end: string }

const dayOf = (date: Date) => new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
/** The Saturday of this weekend: today on a Saturday, yesterday on a Sunday (the weekend is on), otherwise the coming one. */
const saturdayOf = (day: CalendarDate) => {
  const weekday = getDayOfWeek(day, 'en-US') // 0 is Sunday
  return weekday === 0 ? day.subtract({ days: 1 }) : day.add({ days: 6 - weekday })
}
const later = (a: CalendarDate, b: CalendarDate) => (a.compare(b) >= 0 ? a : b)

/**
 * The usual quick choices of a date field: today, tomorrow and this weekend (its Saturday, or today once the weekend is
 * on). `now` is the device's own date; the names are the toolkit's words unless an app passes its own.
 */
export function dayPicks(words: Words['date'] = DEFAULT_WORDS.date, now: Date = new Date()): DatePick[] {
  const today = dayOf(now)
  return [
    { label: words.today, value: today.toString() },
    { label: words.tomorrow, value: today.add({ days: 1 }).toString() },
    { label: words.weekend, value: later(saturdayOf(today), today).toString() },
  ]
}

/** The usual quick choices of a range field: this weekend (what is left of it, once it is on) and the next seven days, today included. */
export function rangePicks(words: Words['date'] = DEFAULT_WORDS.date, now: Date = new Date()): DateRangePick[] {
  const today = dayOf(now)
  const saturday = saturdayOf(today)
  return [
    { label: words.weekend, start: later(saturday, today).toString(), end: saturday.add({ days: 1 }).toString() },
    { label: words.nextDays(7), start: today.toString(), end: today.add({ days: 6 }).toString() },
  ]
}

/** Past-facing quick choices of a range field (analytics, logs, reports): today, last 7/30 days, this month, last month and this year. */
export function pastRangePicks(words: Words['date'] = DEFAULT_WORDS.date, now: Date = new Date()): DateRangePick[] {
  const today = dayOf(now)
  const monthStart = today.set({ day: 1 })
  const prevMonthEnd = monthStart.subtract({ days: 1 })
  const prevMonthStart = prevMonthEnd.set({ day: 1 })
  const yearStart = new CalendarDate(today.year, 1, 1)
  return [
    { label: words.today, start: today.toString(), end: today.toString() },
    { label: words.lastDays(7), start: today.subtract({ days: 6 }).toString(), end: today.toString() },
    { label: words.lastDays(30), start: today.subtract({ days: 29 }).toString(), end: today.toString() },
    { label: words.thisMonth, start: monthStart.toString(), end: today.toString() },
    { label: words.lastMonth, start: prevMonthStart.toString(), end: prevMonthEnd.toString() },
    { label: words.thisYear, start: yearStart.toString(), end: today.toString() },
  ]
}

/** The quick choices as the card takes them: one that is not a real date is left out. */
function shellPicks(picks: readonly (DatePick | DateRangePick)[] | undefined): ShellPick[] | undefined {
  return picks?.flatMap((pick) => {
    const days = 'value' in pick ? [parseDay(pick.value)] : [parseDay(pick.start), parseDay(pick.end)]
    return days.every((day): day is CalendarDate => day !== null) ? [{ label: pick.label, days }] : []
  })
}

/** A button of the card's foot that also closes the card (focus goes back to the field's button). */
function Closing({ onClick, ...props }: React.ComponentProps<typeof Button>) {
  const picker = useDatePickerContext()
  return (
    <Button
      {...props}
      onClick={(e) => {
        onClick?.(e)
        // Ark gives focus back to the field's button when the card is dismissed, not when it is closed from inside.
        const trigger = picker.getTriggerProps().id
        if (trigger) e.currentTarget.ownerDocument.getElementById(trigger)?.focus({ preventScroll: true })
        picker.setOpen(false)
      }}
    />
  )
}

export type DateFieldProps = {
  id?: string | undefined
  /** `YYYY-MM-DD` or empty/null. */
  value: string | null
  onChange: (value: string | null) => void
  animated?: boolean | undefined
  /** The button text without a value. Absent: the toolkit's words («No date», «No date and time»). */
  placeholder?: string | undefined
  /** The first and the last day that can be chosen, as `YYYY-MM-DD`: the days outside are not chosen. */
  min?: string | undefined
  max?: string | undefined
  /** The field cannot be opened: half opacity, out of the Tab order. */
  disabled?: boolean | undefined
  /** The locale of the date on the button and of the month and weekday names (a BCP 47 tag). Default `en-US`. */
  locale?: string | undefined
  /** The words of the reminder's foot, for this field only: otherwise the toolkit's words (`WordsProvider`). */
  words?: { time?: string | undefined; timeOfDay?: string | undefined; done?: string | undefined } | undefined
  /** Quick choices in a row above the calendar: `dayPicks()` gives today, tomorrow and this weekend. */
  picks?: readonly DatePick[] | undefined
}

/** A local date (a due date, a birthday): a click or Enter on a day chooses it and closes. */
// The card has no button that removes the date (the owner's decision of 2026-11-22: a calendar is there to give a
// date). A form whose date may be empty offers that beside the field, and calls `onChange(null)` itself.
export function DateField({ id, value, onChange, animated, placeholder, min, max, disabled, locale, picks }: DateFieldProps) {
  const toolkit = useWords()
  const selected = parseDay(value)
  return (
    <FieldShell id={id} text={selected ? dayText(selected, locale) : null} placeholder={placeholder ?? toolkit.date.noDate} selected={selected} onSelect={(day) => onChange(day.toString())} picks={shellPicks(picks)} closeOnSelect animated={animated} min={min} max={max} disabled={disabled} locale={locale}>
      {null}
    </FieldShell>
  )
}

/** A range of local days, both ends included: `start` is never after `end`. */
export type DateRange = { start: string; end: string }

export type DateRangeFieldProps = Omit<DateFieldProps, 'value' | 'onChange' | 'picks' | 'words'> & {
  /** The two ends as `YYYY-MM-DD`, or null. A value whose ends are not real dates, or are the wrong way round, reads as null. */
  value: DateRange | null
  onChange: (value: DateRange | null) => void
  /** Quick choices in a row above the calendar: `rangePicks()` for upcoming spans, `pastRangePicks()` for reports and logs. */
  picks?: readonly DateRangePick[] | undefined
  /** Show two months side by side on wide viewports (automatically collapses to 1 below `md`). Default 1. */
  months?: 1 | 2 | undefined
}

/** «November 20 – 24, 2026»: the range as the button shows it, in the field's locale (one day alone reads as a date). */
function rangeText(first: CalendarDate, last: CalendarDate, locale: string = DEFAULT_LOCALE): string {
  // `formatRange` is in every current browser, not in the project's TypeScript library: where it is missing the two
  // dates are written out in full.
  const format = longDate(locale) as Intl.DateTimeFormat & { formatRange?: (from: Date, to: Date) => string }
  const from = new Date(first.year, first.month - 1, first.day)
  const to = new Date(last.year, last.month - 1, last.day)
  return format.formatRange ? format.formatRange(from, to) : `${format.format(from)} – ${format.format(to)}`
}

/**
 * A range of local days (a stay, a leave, a filter): a click chooses the first day, a second one the last and closes;
 * the days between take the selection tint. The two clicks may come in either order, and on the same day for a range
 * of one day. The caller hears of a range only when it has both ends.
 */
export function DateRangeField({ id, value, onChange, animated, placeholder, min, max, disabled, locale, picks, months = 1 }: DateRangeFieldProps) {
  const toolkit = useWords()
  const start = parseDay(value?.start)
  const end = parseDay(value?.end)
  const range = start && end && start.compare(end) <= 0 ? ([start, end] as const) : null
  return (
    <FieldShell
      id={id}
      text={range ? rangeText(range[0], range[1], locale) : null}
      placeholder={placeholder ?? toolkit.date.noRange}
      selected={null}
      onSelect={() => {}}
      range={range}
      onRange={(first, last) => onChange({ start: first.toString(), end: last.toString() })}
      picks={shellPicks(picks)}
      months={months}
      closeOnSelect
      animated={animated}
      min={min}
      max={max}
      disabled={disabled}
      locale={locale}
    >
      {null}
    </FieldShell>
  )
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
/** The time proposed when the reminder does not have one yet. */
const DEFAULT_TIME = '09:00'

/** `YYYY-MM-DDTHH:mm` → day and time; null if it is not in that format. */
function splitDateTime(value: string | null | undefined): { day: CalendarDate; time: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value ?? '')
  const day = m ? parseDay(m[1]) : null
  return day && m && TIME_RE.test(m[2]!) ? { day, time: m[2]! } : null
}

export type DateTimeFieldProps = DateFieldProps

/**
 * A local day and, if needed, a local time (the reminder). Without a date there is no reminder. A click on a day chooses
 * it and immediately gives `YYYY-MM-DDTHH:mm`; a click on the day already chosen removes it (no «Clear the date» button).
 * The time is off by default: the «Time» checkbox turns it on, and when off it is 09:00. With a date already set the
 * checkbox starts on if the time is not the default one. A half-typed time (the empty field while writing) never enters
 * the value: the last valid one stays. «Done» or Esc closes.
 */
export function DateTimeField({ id, value, onChange, animated, placeholder, min, max, disabled, locale, words, picks }: DateTimeFieldProps) {
  const toolkit = useWords()
  const current = splitDateTime(value)
  // `time` is always a valid time; `typed` is what is seen in the field while writing.
  const [time, setTime] = React.useState(current?.time ?? DEFAULT_TIME)
  const [typed, setTyped] = React.useState(time)
  const [withTime, setWithTime] = React.useState(current ? current.time !== DEFAULT_TIME : false)
  const timeId = React.useId()
  const withTimeId = React.useId()

  // On opening, the sheet starts again from what the value says (it may have changed elsewhere, for example by an undo).
  const sync = () => {
    const next = current?.time ?? DEFAULT_TIME
    setTime(next)
    setTyped(next)
    setWithTime(current ? current.time !== DEFAULT_TIME : false)
  }
  const effective = withTime ? time : DEFAULT_TIME
  const text = current ? `${dayText(current.day, locale)}, ${current.time}` : null

  return (
    <FieldShell
      id={id}
      text={text}
      placeholder={placeholder ?? toolkit.date.noDateTime}
      selected={current?.day ?? null}
      onSelect={(day) => onChange(`${day.toString()}T${effective}`)}
      picks={shellPicks(picks)}
      closeOnSelect={false}
      onOpen={sync}
      onPressSelected={() => onChange(null)}
      animated={animated}
      min={min}
      max={max}
      disabled={disabled}
      locale={locale}
    >
      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <Checkbox
          id={withTimeId}
          checked={withTime}
          animated={animated}
          onCheckedChange={(checked) => {
            const on = checked === true
            setWithTime(on)
            if (!on) {
              // When off, the time goes back to the default: if there is already a day, the value follows.
              setTime(DEFAULT_TIME)
              setTyped(DEFAULT_TIME)
              if (current) onChange(`${current.day.toString()}T${DEFAULT_TIME}`)
            }
          }}
        />
        <label htmlFor={withTimeId} className="text-sm">
          {words?.time ?? toolkit.date.time}
        </label>
        <label htmlFor={timeId} className="sr-only">
          {words?.timeOfDay ?? toolkit.date.timeOfDay}
        </label>
        <Input
          id={timeId}
          type="time"
          step={60}
          value={typed}
          disabled={!withTime}
          className="h-(--control-sm) w-28 max-md:w-34"
          onChange={(e) => {
            const next = e.target.value
            setTyped(next)
            if (!TIME_RE.test(next)) return
            setTime(next)
            if (current) onChange(`${current.day.toString()}T${next}`)
          }}
          // A half-typed time goes back to the last valid one: the field does not stay empty and the value does not break.
          onBlur={() => setTyped(time)}
        />
        <Closing size="sm" variant="secondary" className="ms-auto">
          {words?.done ?? toolkit.date.done}
        </Closing>
      </div>
    </FieldShell>
  )
}
