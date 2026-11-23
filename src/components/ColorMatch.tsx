import { useId, useMemo, type CSSProperties } from 'react'
import { SPOT_KINDS, colorTheme, isSpotKind, spotSuggestions, type SpotKind } from '../color-theme'
import { isAccentColor, type ThemeScheme, type ThemeTone } from '../theme-engine'
import { themeVariables } from '../themes'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { RadioGroup, RadioGroupItem, SWATCH_CHOSEN } from './ui/radio-group'
import { choiceBorder, radioArrows } from './LookSettings'

export interface ColorMatchProps {
  /** The theme colours ready to pick, besides one of the user's own. */
  colors: readonly { readonly color: string; readonly label: string }[]
  /** The theme colour, `#rrggbb`. */
  color: string
  /** The spot colour: one of the three proposals, a colour of the user's own, or none. */
  spot: SpotKind | string | null
  scheme: ThemeScheme
  onColor: (color: string) => void
  onSpot: (spot: SpotKind | string | null) => void
  text: {
    color: string
    spot: string
    own: string
    none: string
    kinds: Record<SpotKind, string>
    /** The words of the sample: a button, a chosen row, something due and its count, something running. */
    sample: { action: string; chosen: string; row: string; due: string; running: string }
  }
}

/** The colours are the ones chosen: the engine's tone does not move them. */
const AS_CHOSEN: ThemeTone = { intensity: 'theme', light: 'theme' }
/**
 * A colour of the user's own: the system's colour field under a dot, dashed until a colour of theirs is chosen. It is
 * a swatch as `RadioGroupItem` draws one: 24px (44 with a finger), the ink ring when chosen and the focus 6px away,
 * outside that ring (`FOCUS_RING_SWATCH`, here for the field inside it).
 */
function Own({ label, value, chosen, onPick }: { label: string; value: string; chosen: boolean; onPick: (color: string) => void }) {
  return <label title={label} {...(chosen ? { style: { backgroundColor: value } } : {})}
    className={cn('relative grid size-6 shrink-0 place-items-center rounded-full pointer-coarse:size-11 has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-6 has-focus-visible:outline-ring', chosen ? SWATCH_CHOSEN : 'border border-dashed border-input')}>
    <input type="color" aria-label={label} value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 size-full opacity-0" />
  </label>
}

/**
 * Two colours for a theme: the theme colour, and the spot colour that goes with it. The spot is not picked from the
 * whole wheel: three colours matched to the theme colour are proposed, from quiet to loud (`spotSuggestions`), besides
 * none and one of the user's own. The sample below is drawn with the theme the two colours give (`colorTheme`).
 */
export function ColorMatch({ colors, color, spot, scheme, onColor, onSpot, text }: ColorMatchProps) {
  const colorId = useId()
  const spotId = useId()
  const proposals = useMemo(() => spotSuggestions(color), [color])
  const sample = useMemo(() => themeVariables({ theme: colorTheme({ id: 'sample', label: '', color, spot }), scheme, tone: AS_CHOSEN }) as CSSProperties, [color, spot, scheme])
  const ownColor = !colors.some((c) => c.color === color)
  const ownSpot = !isSpotKind(spot) && isAccentColor(spot)
  return <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <p id={colorId} className="text-sm font-medium">{text.color}</p>
      {/* The toolkit's radio group of swatches; the colour of the user's own is a field of its own beside them. */}
      <RadioGroup aria-labelledby={colorId} orientation="horizontal" value={ownColor ? '' : color} onValueChange={onColor} className="flex flex-wrap items-center gap-2">
        {colors.map((c) => <RadioGroupItem key={c.color} value={c.color} variant="swatch" aria-label={c.label} title={c.label} style={{ backgroundColor: c.color }} />)}
        <Own label={`${text.color}: ${text.own}`} value={color} chosen={ownColor} onPick={onColor} />
      </RadioGroup>
    </div>
    <div className="flex flex-col gap-2">
      <p id={spotId} className="text-sm font-medium">{text.spot}</p>
      <div role="radiogroup" aria-labelledby={spotId} onKeyDown={radioArrows} className="flex flex-wrap items-center gap-2">
        {SPOT_KINDS.map((kind) => <button key={kind} type="button" role="radio" aria-checked={spot === kind} tabIndex={spot === kind ? 0 : -1} onClick={() => onSpot(kind)}
          className={cn('flex items-center gap-2 rounded-md border px-2 py-1 text-sm', FOCUS_RING, choiceBorder(spot === kind))}>
          <span aria-hidden="true" style={{ backgroundColor: proposals[kind] }} className="size-4 rounded-full" />
          {text.kinds[kind]}
        </button>)}
        <button type="button" role="radio" aria-checked={spot === null} tabIndex={spot === null ? 0 : -1} onClick={() => onSpot(null)}
          className={cn('rounded-md border px-2 py-1 text-sm', FOCUS_RING, choiceBorder(spot === null))}>
          {text.none}
        </button>
        <Own label={`${text.spot}: ${text.own}`} value={ownSpot ? (spot as string) : proposals.balanced} chosen={ownSpot} onPick={onSpot} />
      </div>
    </div>
    <div aria-hidden="true" style={sample} className="flex overflow-hidden rounded-lg border border-line bg-paper text-ink">
      <div className="flex w-1/3 flex-col gap-1 bg-sidebar-paper p-3 text-sm">
        <span className="flex items-center justify-between rounded-md bg-sidebar-selected px-2 py-1 font-medium text-sidebar-selected-ink">{text.sample.chosen}<span className="text-xs font-semibold text-spot-ink">3</span></span>
        <span className="px-2 py-1 text-sidebar-ink">{text.sample.row}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 text-sm">
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-spot" /><span className="font-medium">{text.sample.due}</span></span>
        <span className="self-start rounded-md bg-spot-soft px-2 py-1 text-xs font-semibold text-spot-ink">{text.sample.running}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground">{text.sample.action}</span>
          <span className="rounded-md bg-spot px-3 py-1 font-medium text-spot-foreground">{text.sample.running}</span>
        </span>
      </div>
    </div>
  </div>
}
