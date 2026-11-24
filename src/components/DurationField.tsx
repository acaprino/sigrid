// A duration field: hours and minutes in two number inputs, four shortcuts and
// «None». The field does not add, convert or check the total: it sends hours and minutes as they are and the app decides
// (up to 24 hours, minutes from 0 to 59; zero and zero means «None»). Two inputs have no syntax to get wrong, and the
// shortcuts cover the frequent cases with one click.
import { useId } from 'react'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { useWords } from '../words'

export type DurationParts = { hours: number; minutes: number }

export type DurationFieldProps = {
  value: DurationParts | null
  onChange: (value: DurationParts | null) => void
}

const PRESETS: DurationParts[] = [
  { hours: 0, minutes: 15 },
  { hours: 0, minutes: 30 },
  { hours: 1, minutes: 0 },
  { hours: 2, minutes: 0 },
]

/** The number written in an input: empty or non-numeric counts as zero (the field does not validate, the app does). */
function read(text: string): number {
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function DurationField({ value, onChange }: DurationFieldProps) {
  const words = useWords()
  const hoursId = useId()
  const minutesId = useId()
  const hours = value ? String(value.hours) : ''
  const minutes = value ? String(value.minutes) : ''
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input id={hoursId} type="number" inputMode="numeric" min={0} max={24} step={1} value={hours} onChange={(e) => onChange({ hours: read(e.target.value), minutes: value?.minutes ?? 0 })} className="w-16" />
      <label htmlFor={hoursId} className="text-xs text-ink-mute">
        {words.duration.hours}
      </label>
      <Input id={minutesId} type="number" inputMode="numeric" min={0} max={59} step={5} value={minutes} onChange={(e) => onChange({ hours: value?.hours ?? 0, minutes: read(e.target.value) })} className="w-16" />
      <label htmlFor={minutesId} className="text-xs text-ink-mute">
        {words.duration.minutes}
      </label>
      <span className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          // The pressed shortcut is the current selection: the selection tint (R1, R2).
          <Button key={`${preset.hours}:${preset.minutes}`} type="button" variant="secondary" size="xs" aria-pressed={value !== null && value.hours === preset.hours && value.minutes === preset.minutes} className="aria-pressed:bg-selected aria-pressed:text-selected-ink" onClick={() => onChange(preset)}>
            {words.duration.short(preset.hours, preset.minutes)}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="xs" onClick={() => onChange(null)}>
          {words.duration.none}
        </Button>
      </span>
    </div>
  )
}
