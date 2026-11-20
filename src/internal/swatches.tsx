import { COLORS, COLOR_NAMES, colorHue, markHueAttrs } from '../colors'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'

export type SwatchesProps = {
  colors?: readonly string[]
  value: string
  onChange: (color: string) => void
  label?: string
}

/** The readable name of a color; an unexpected color takes its number («Color 8»), never the hexadecimal. */
function nameOf(color: string, index: number): string {
  return (COLOR_NAMES as Readonly<Record<string, string | undefined>>)[color] ?? `Color ${index + 1}`
}

/**
 * Color choice for an area or a project: the SmoothUI/Base UI RadioGroup (`components/ui/radio-group`) with solid
 * swatches. Like any radio group: a single Tab stop (the chosen color, or the first), the arrows move and choose
 * wrapping around the ends, Home and End go to the first and the last.
 */
export function Swatches({ colors = COLORS, value, onChange, label = 'Color' }: SwatchesProps) {
  return (
    <RadioGroup
      aria-label={label}
      orientation="horizontal"
      className="flex flex-wrap items-center gap-3"
      value={value}
      onValueChange={onChange}
    >
      {colors.map((c, i) => (
        <RadioGroupItem key={c} value={c} variant="swatch" aria-label={nameOf(c, i)} data-color={c} {...markHueAttrs(c)} style={{ background: colorHue(c) !== null ? `var(--mark-dot, ${c})` : c }} />
      ))}
    </RadioGroup>
  )
}
