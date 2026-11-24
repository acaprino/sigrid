// The theme gallery: a compact picker of the app's themes, one tile each. A tile is drawn in its own theme, in the
// scheme and tone the app shows now (`themeVariables` on the tile alone): its name on the theme's primary fill, then a
// small sketch of a window (the sidebar with a chosen row, two rows, a button), so the person sees the theme before
// choosing it. The tiles are one radio group: one Tab stop, the arrows, Home and End move and choose (`radioArrows`, as
// the look settings' cards), and the chosen tile has the accent edge and a check in a dot (the choice is not shown by
// the edge alone). An optional last tile, dashed, stands for a theme of the person's own: choosing it calls the app,
// which opens its own editor; it is the chosen one when `selected` is null. Two columns, three from 352px of its own
// width (a container query: it fits a narrow settings panel).
import { useMemo, type CSSProperties } from 'react'
import type { ThemeDef } from '../theme-catalog'
import type { ThemeScheme, ThemeTone } from '../theme-engine'
import { themeVariables } from '../themes'
import { FOCUS_RING } from '../lib/focus'
import { cn } from '../lib/utils'
import { radioArrows } from './LookSettings'

export interface ThemeGalleryProps<T extends ThemeDef> {
  themes: readonly T[]
  scheme: ThemeScheme
  tone?: ThemeTone | null | undefined
  label: string
  selected: T['id'] | null
  onTheme: (theme: T) => void
  custom?: { label: string; onChoose: () => void }
}

const TILE = 'relative min-w-0 overflow-hidden rounded-lg border border-line text-start hover:border-input aria-checked:border-primary aria-checked:ring-1 aria-checked:ring-primary'

/**
 * The check in a 16px dot of the primary. Its own path, not the toolkit's check: at 12px the set's check draws a 1px
 * line on a 24 grid, this one a 1.5px line on a 16 grid, which the small dot needs to be read.
 */
function ChosenMark() {
  return <span aria-hidden="true" className="absolute end-1.5 bottom-1.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg>
  </span>
}

/** A compact theme picker. Each tile samples its own surfaces in the active scheme and tone.
 * A null selection marks the optional custom tile, whose editor belongs to the caller. */
export function ThemeGallery<T extends ThemeDef>({ themes, scheme, tone, label, selected, onTheme, custom }: ThemeGalleryProps<T>) {
  const cards = useMemo(() => themes.map((theme) => ({
    theme, style: themeVariables({ theme, scheme, tone: tone ?? null }) as CSSProperties,
  })), [themes, scheme, tone])
  const selectedPreset = themes.some((theme) => theme.id === selected)
  const customSelected = selected === null && Boolean(custom)
  return <div className="@container">
    <div role="radiogroup" aria-label={label} onKeyDown={radioArrows} className="grid grid-cols-2 gap-2.5 @min-[22rem]:grid-cols-3">
      {cards.map(({ theme, style }, index) => {
        const checked = theme.id === selected
        return <button type="button" role="radio" key={theme.id} aria-checked={checked}
          tabIndex={checked || (!selectedPreset && !customSelected && index === 0) ? 0 : -1}
          onClick={() => onTheme(theme)} className={cn(TILE, FOCUS_RING)}>
          <span style={style} className="block">
            <span className="block bg-primary px-2.5 py-1.5 text-sm font-semibold text-primary-foreground">{theme.label}</span>
            <span aria-hidden="true" className="flex h-12 bg-paper">
              <span className="w-1/5 border-e border-line bg-sidebar-paper px-1 pt-2"><span className="block h-2 rounded-sm bg-sidebar-selected" /></span>
              <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1 px-2">
                <span className="flex w-full items-center gap-1"><span className="size-2 rounded-full border border-input" /><span className="h-1 w-2/3 rounded-full bg-line" /></span>
                <span className="flex w-full items-center gap-1"><span className="size-2 rounded-full border border-input" /><span className="h-1 w-2/5 rounded-full bg-line" /></span>
                <span className="mt-0.5 h-1.5 w-1/4 rounded-sm bg-primary" />
              </span>
            </span>
          </span>
          {checked && <ChosenMark />}
        </button>
      })}
      {custom && <button type="button" role="radio" aria-checked={customSelected} tabIndex={customSelected || !cards.length ? 0 : -1}
        onClick={custom.onChoose} className={cn(TILE, FOCUS_RING, 'flex flex-col justify-center gap-2 border-dashed bg-raised px-2.5 text-sm font-medium')}>
        <span aria-hidden="true" className="flex"><i className="size-3 rounded-full bg-mark-5"/><i className="size-3 rounded-full bg-mark-8"/><i className="size-3 rounded-full bg-mark-11"/></span>
        {custom.label}
        {customSelected && <ChosenMark />}
      </button>}
    </div>
  </div>
}
