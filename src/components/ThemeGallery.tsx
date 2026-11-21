import { useMemo, type CSSProperties } from 'react'
import type { ThemeDef } from '../theme-catalog'
import type { ThemeScheme, ThemeTone } from '../theme-engine'
import { themeVariables } from '../themes'
import { FOCUS_RING } from '../lib/focus'
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

const TILE = 'relative min-w-0 overflow-hidden rounded-lg border border-line text-left hover:border-input aria-checked:border-ink aria-checked:ring-1 aria-checked:ring-ink'

function ChosenMark() {
  return <span aria-hidden="true" className="absolute right-1.5 bottom-1.5 grid size-4 place-items-center rounded-full bg-ink text-paper">
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
          onClick={() => onTheme(theme)} className={TILE + ' ' + FOCUS_RING}>
          <span style={style} className="block">
            <span className="block bg-primary px-2.5 py-1.5 text-sm font-semibold text-primary-foreground">{theme.label}</span>
            <span aria-hidden="true" className="flex h-10 bg-paper">
              <span className="w-1/4 border-r border-line bg-sidebar-paper px-1 pt-2"><span className="block h-2 rounded-sm bg-sidebar-selected" /></span>
              <span className="flex flex-1 flex-col gap-1.5 p-2"><span className="h-1 w-4/5 rounded-full bg-input" /><span className="h-1 w-1/2 rounded-full bg-input" /></span>
            </span>
          </span>
          {checked && <ChosenMark />}
        </button>
      })}
      {custom && <button type="button" role="radio" aria-checked={customSelected} tabIndex={customSelected || !cards.length ? 0 : -1}
        onClick={custom.onChoose} className={TILE + ' ' + FOCUS_RING + ' flex flex-col justify-center gap-2 border-dashed bg-raised px-2.5 text-sm font-medium'}>
        <span aria-hidden="true" className="flex"><i className="size-3 rounded-full bg-mark-5"/><i className="size-3 rounded-full bg-mark-8"/><i className="size-3 rounded-full bg-mark-11"/></span>
        {custom.label}
        {customSelected && <ChosenMark />}
      </button>}
    </div>
  </div>
}
