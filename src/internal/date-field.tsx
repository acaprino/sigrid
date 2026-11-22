// Park UI (MIT) input 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts)
// From Park's `input` recipe (md): the button that opens the calendar has the field's form (40px, l2 corners, 12px of
// side padding); the card is Park's date-picker content (l3 corners, the lg elevation).
// The date field: a button that shows the date and opens the calendar, on Ark UI's DatePicker
// (`@ark-ui/react/date-picker`). Two variants (a form can use both), with the same contract as the native fields they
// replace: `DateField` gives and receives `YYYY-MM-DD` (or null), `DateTimeField` `YYYY-MM-DDTHH:mm` in local time
// (or null; the time is switched on with the «Time» checkbox, otherwise 09:00). Only formatting of local dates: no time
// zones, no «tomorrow». The button takes the `id` of the field's `<label>` (accessible name «Due date», «Reminder»).
// Ark gives: the open state and its dismissal (Esc or a click outside close without choosing, and focus returns to the
// button), the position of the card, focus on the chosen day when it opens, the grid (see `ui/calendar.tsx`).
// The card is not moved to a portal: it stays inside the field, so it is part of the modal sheet that holds it (its
// focus trap, its Esc), and `fixed` keeps the scrolling body of the sheet from clipping it.
import * as React from 'react'
import { DatePicker, useDatePickerContext } from '@ark-ui/react/date-picker'
import { getLocalTimeZone, parseDate, type CalendarDate } from '@internationalized/date'
import { CalendarIcon } from 'lucide-react'
import { Calendar, calendarWords } from '../components/ui/calendar'
import { useWords } from '../words'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { useEntrance } from './motion'
import { cn } from '../lib/utils'
import { FOCUS_RING_BORDER } from '../lib/focus'

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
const TRIGGER_CLASS = cn(
  'flex h-(--control-md) w-full min-w-0 items-center gap-2 rounded-md pointer-coarse:min-h-11 border border-input bg-transparent px-(--pad-sm) py-1 text-left text-base md:text-sm',
  FOCUS_RING_BORDER,
)

// The button is named by the field's `<label>`: Ark's own name for it («Open calendar») would replace that.
const NO_TRIGGER_NAME = () => undefined as unknown as string
const POSITIONING = { placement: 'bottom-start', gutter: 4, strategy: 'fixed' } as const

// On a phone (narrow and with a finger, as `usePhone`) the card is a sheet at the bottom of the window, not a card under
// the field: there the calendar is taller than what is left under the field, and it would end below the window. The
// positioner (Ark writes its place inline, hence the `!`) takes the bottom edge and dims the page behind it with the
// one backdrop (`BACKDROP`); a tap on the dimmed page is a tap outside the card, so it closes. The card takes the
// whole width, with the calendar in the middle, and leaves room for the home indicator.
const PHONE_SHEET = cn(
  'z-50 max-md:pointer-coarse:fixed! max-md:pointer-coarse:inset-x-0! max-md:pointer-coarse:top-auto! max-md:pointer-coarse:bottom-0! max-md:pointer-coarse:transform-none!',
  // `bg-drop/40` is `BACKDROP` (internal/overlay.ts), written out: a class built from a constant is not compiled.
  "max-md:pointer-coarse:before:fixed max-md:pointer-coarse:before:inset-0 max-md:pointer-coarse:before:-z-10 max-md:pointer-coarse:before:bg-drop/40 max-md:pointer-coarse:before:content-['']",
)
const PHONE_SHEET_CARD =
  'max-md:pointer-coarse:max-h-[85dvh] max-md:pointer-coarse:w-full max-md:pointer-coarse:overflow-y-auto max-md:pointer-coarse:rounded-b-none max-md:pointer-coarse:pb-[env(safe-area-inset-bottom)] max-md:pointer-coarse:[&>[data-slot=calendar]]:mx-auto'

type FieldShellProps = {
  id?: string | undefined
  text: string | null
  placeholder: string
  selected: CalendarDate | null
  /** A day chosen in the grid. */
  onSelect: (day: CalendarDate) => void
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

function FieldShell({ id, text, placeholder, selected, onSelect, closeOnSelect, onOpen, onPressSelected, animated, min, max, disabled, locale = DEFAULT_LOCALE, children }: FieldShellProps) {
  const toolkit = useWords()
  const translations = React.useMemo(() => ({ ...calendarWords(toolkit), trigger: NO_TRIGGER_NAME }), [toolkit])
  const first = parseDay(min)
  const last = parseDay(max)
  const key = selected?.toString() ?? ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = React.useMemo(() => (selected ? [selected] : []), [key])
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
        const day = details.value[0]
        if (day) onSelect(parseDate(day.toString().slice(0, 10)))
      }}
      onOpenChange={(details) => {
        if (details.open) onOpen?.()
      }}
      closeOnSelect={closeOnSelect}
      locale={locale}
      {...(first ? { min: first } : {})}
      {...(last ? { max: last } : {})}
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
        <DatePicker.Trigger data-slot="date-field" className={cn(TRIGGER_CLASS, 'disabled:pointer-events-none disabled:opacity-50')}>
          <CalendarIcon className="size-4 shrink-0 text-ink-soft" aria-hidden />
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
          <Calendar onPressSelected={onPressSelected} />
          {children}
        </DatePicker.Content>
      </DatePicker.Positioner>
    </DatePicker.Root>
  )
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
  /** The words of the card's foot, for this field only: otherwise the toolkit's words (`WordsProvider`). */
  words?: { clear?: string | undefined; time?: string | undefined; timeOfDay?: string | undefined; done?: string | undefined } | undefined
}

/** A local date (the due date): a click or Enter on a day chooses it and closes. */
export function DateField({ id, value, onChange, animated, placeholder, min, max, disabled, locale, words }: DateFieldProps) {
  const toolkit = useWords()
  const selected = parseDay(value)
  return (
    <FieldShell id={id} text={selected ? dayText(selected, locale) : null} placeholder={placeholder ?? toolkit.date.noDate} selected={selected} onSelect={(day) => onChange(day.toString())} closeOnSelect animated={animated} min={min} max={max} disabled={disabled} locale={locale}>
      <div className="flex justify-end border-t border-border px-4 py-2.5">
        <Closing variant="ghost" size="sm" disabled={!selected} onClick={() => onChange(null)}>
          {words?.clear ?? toolkit.date.clear}
        </Closing>
      </div>
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
export function DateTimeField({ id, value, onChange, animated, placeholder, min, max, disabled, locale, words }: DateTimeFieldProps) {
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
        <Closing size="sm" variant="secondary" className="ml-auto">
          {words?.done ?? toolkit.date.done}
        </Closing>
      </div>
    </FieldShell>
  )
}
