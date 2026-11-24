import { createContext, memo, useContext, useId } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { Check as LucideCheck } from 'lucide-react'
import { COLORS, COLOR_NAMES } from '../colors'
import { densityOf, type DensityDef } from '../density'
import { FOCUS_RING, FOCUS_RING_SWATCH } from '../lib/focus'
import { cn } from '../lib/utils'
import { SWATCH_CHOSEN } from '../primitives/radio-group'
import { useMotion } from '../internal/motion'
import { PALETTE_COMBOS, type PaletteCombo, type PalettePick } from '../palette'
import type { ThemeDef } from '../theme-catalog'
import { TONE_PRESETS, presetTone, tonePresetOf, type ThemeScheme, type ThemeTone, type TonePreset } from '../theme-engine'
import { themeVariables, type ThemePick, toneHasEffect } from '../themes'
import { useWords } from '../words'

// The look settings of an app (owner, 2026-11-20): one base colour makes the palette, three combinations share it out,
// three tones set how lively it is. Every choice is a card with a preview of what it does; the app passes its own words.
// The icons are not a choice: Sigrid has one set, the same in every app (2026-11-23). The ready-made themes are the finer choice, for the app's «Advanced» fold.
// The density (compact, normal, large, or an app's own) is a choice of the same family: each card draws three rows to scale.

/** A choice's name and, below it, what it is for. */
export interface ChoiceText {
  readonly name: string
  readonly note: string
}

/**
 * The mark on the chosen option: the choice is not shown by the border alone. The toolkit's check (Lucide's, as
 * `Icon name="check"` draws it) with a heavier stroke, which `Icon` does not take: it sits alone at the corner of a card.
 */
function Check({ className }: { className: string }) {
  return <LucideCheck aria-hidden="true" strokeWidth={2.5} className={className} />
}

/**
 * The border of an option that is a card or a pill: the accent with a 1px ring when chosen, the light divider
 * otherwise, one step darker under the pointer. The same in every choice of the look (and in `ColorMatch`).
 */
export function choiceBorder(chosen: boolean): string {
  return chosen ? 'border-primary ring-1 ring-primary' : 'border-line hover:border-input'
}

/**
 * The arrow keys move focus and choose, as in a radio group, and Home and End reach the first and the last option, as
 * in `RadioGroup`; Tab enters the group on the chosen option. For a group whose options are not all of one kind (cards,
 * a pill beside swatches), which the toolkit's `RadioGroup` cannot hold; a group of swatches alone is a `RadioGroup`
 * (`Swatches`, the theme colour of `ColorMatch`).
 */
export function radioArrows(e: KeyboardEvent<HTMLDivElement>): void {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (step === 0 && e.key !== 'Home' && e.key !== 'End') return
  const entries = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'))
  const here = entries.indexOf(document.activeElement as HTMLElement)
  const next = e.key === 'Home' ? entries[0] : e.key === 'End' ? entries[entries.length - 1] : entries[(here + step + entries.length) % entries.length]
  if (here < 0 || !next) return
  e.preventDefault()
  next.focus()
  // An arrow always lands on another option; Home or End on the one already chosen chooses nothing again.
  if (step !== 0 || next.getAttribute('aria-checked') !== 'true') next.click()
}

/** The same theme, scheme, own colours, tone and palette draw the same thing. */
function samePick(a: ThemePick, b: ThemePick): boolean {
  return a.theme === b.theme && a.scheme === b.scheme && JSON.stringify([a.own ?? null, a.tone ?? null, a.palette ?? null]) === JSON.stringify([b.own ?? null, b.tone ?? null, b.palette ?? null])
}

/**
 * A palette, not a miniature of the app (owner, 2026-11-20: «far vedere solo la palette e non tutto lo scheletro»): the
 * page, the sidebar, the selection, the accent and the filled button, in the scheme of the pick.
 */
export const PaletteStrip = memo(
  function PaletteStrip({ pick }: { pick: ThemePick }) {
    return (
      <span aria-hidden="true" data-slot="palette-strip" style={themeVariables(pick) as CSSProperties} className="flex h-full">
        <span className="flex-1 bg-paper" />
        <span className="flex-1 bg-sidebar-paper" />
        <span className="flex-1 bg-selected" />
        <span className="flex-1 bg-accent" />
        <span className="flex-1 bg-primary" />
      </span>
    )
  },
  (a, b) => samePick(a.pick, b.pick),
)

/** What a tone changes, side by side: the sidebar's tint and its selected row, four data colours and the filled button. */
export const TonePreview = memo(
  function TonePreview({ pick }: { pick: ThemePick }) {
    return (
      <span aria-hidden="true" data-slot="tone-preview" style={themeVariables(pick) as CSSProperties} className="flex h-full">
        <span className="flex w-2/5 flex-col justify-center gap-1.5 bg-sidebar-paper px-2">
          <span className="h-2.5 rounded-sm bg-sidebar-selected" />
          <span className="h-1 w-3/4 rounded-full bg-sidebar-mute" />
        </span>
        <span className="flex flex-1 items-center gap-1.5 bg-paper px-2">
          <span className="size-2 shrink-0 rounded-full bg-mark-1" />
          <span className="size-2 shrink-0 rounded-full bg-mark-5" />
          <span className="size-2 shrink-0 rounded-full bg-mark-11" />
          <span className="ms-auto h-3 w-6 shrink-0 rounded-sm bg-primary" />
        </span>
      </span>
    )
  },
  (a, b) => samePick(a.pick, b.pick),
)

/** The frame of a small preview inside an option: what choosing it looks like. */
export function ChoicePreview({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" data-preview={kind} className="mb-2 block h-14 w-full overflow-hidden rounded-md border border-line bg-paper">
      {children}
    </span>
  )
}

/**
 * A choice with its label and, right below it, what it is for; the options follow. The label names the group for
 * assistive technology (`aria-labelledby` on the options). Level 3 is a choice of the section, level 4 a part of one.
 */
export function ChoiceGroup({ id, label, hint, level = 3, children }: { id?: string; label: string; hint?: string; level?: 3 | 4; children: ReactNode }) {
  const Heading = level === 3 ? 'h3' : 'h4'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Heading id={id} className={level === 3 ? 'text-sm font-semibold' : 'text-sm font-medium text-ink-soft'}>
          {label}
        </Heading>
        {hint ? <p className="max-w-prose text-xs text-ink-mute">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

const ChoiceHighlightId = createContext<string | null>(null)

/** The options of a choice as cards side by side: two per row on the phone, three (or two) on wider screens. */
export function ChoiceCards({ labelledBy, columns = 3, children }: { labelledBy: string; columns?: 2 | 3; children: ReactNode }) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={radioArrows} className={cn('grid grid-cols-2 gap-2', columns === 3 && 'sm:grid-cols-3')}>
      <ChoiceHighlightId.Provider value={id}>{children}</ChoiceHighlightId.Provider>
    </div>
  )
}

/** An option: a small preview of what it does, its name and note, and the mark when chosen. */
export function ChoiceCard({ choice, name, note, onChoose, preview, detail }: { choice: boolean; name: string; note: string; onChoose: () => void; preview?: ReactNode; /** A fact of the option at the end of its row, before the mark: a price, a size. */ detail?: ReactNode }) {
  const group = useContext(ChoiceHighlightId)
  const motion = useMotion()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={choice}
      tabIndex={choice ? 0 : -1}
      onClick={onChoose}
      className={cn('relative flex flex-col rounded-lg border bg-raised px-3 py-2 text-start pointer-coarse:min-h-11', FOCUS_RING, choiceBorder(choice && !(motion && group)))}
    >
      {choice && motion && group ? <motion.Highlight id={group} className="pointer-events-none absolute -inset-px rounded-[inherit] border border-primary ring-1 ring-primary" /> : null}
      {preview}
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{name}</span>
          <span className="block text-xs text-ink-mute">{note}</span>
        </span>
        <span className="flex shrink-0 items-start gap-2">
          {detail === undefined || detail === null ? null : <span data-slot="choice-card-detail" className="text-sm font-semibold tabular-nums">{detail}</span>}
          {/* The mark keeps its room, so a detail does not move when the option is chosen. */}
          <span className="mt-0.5 inline-flex size-4">{choice ? <Check className="size-4" /> : null}</span>
        </span>
      </span>
    </button>
  )
}

/** A colour to pick freely: the system's colour picker with its label beside it. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className={cn('size-(--control-md) shrink-0 rounded-lg border border-input bg-raised p-1 pointer-coarse:size-11', FOCUS_RING)} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  )
}

export interface BaseColorText {
  readonly label: string
  readonly hint: string
  /** The first option: no palette, the theme's own colours. */
  readonly theme: string
  readonly picker: string
}

/**
 * The base colour: the theme's own colours, one of the ready colours, or any colour. A colour makes the palette
 * (`palette.ts`); `seed` is the colour a new palette starts from (the one on the page, so nothing jumps).
 */
export function BaseColorChoice({ palette, seed, onPalette, text }: { palette: PalettePick | null; seed: string; onPalette: (palette: PalettePick | null) => void; text: BaseColorText }) {
  const id = useId()
  const colorNames: Readonly<Record<string, string | undefined>> = useWords().colors.names
  const pick = (color: string) => onPalette({ seed: color, combo: palette?.combo ?? 'clean' })
  return (
    <ChoiceGroup id={id} label={text.label} hint={text.hint}>
      <div role="radiogroup" aria-labelledby={id} onKeyDown={radioArrows} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!palette}
          tabIndex={palette ? -1 : 0}
          onClick={() => onPalette(null)}
          className={cn('flex h-(--control-xs) items-center rounded-md border bg-raised px-3 text-xs pointer-coarse:min-h-11', FOCUS_RING, choiceBorder(!palette))}
        >
          {text.theme}
        </button>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={palette?.seed === c}
            aria-label={colorNames[c] ?? COLOR_NAMES[c]}
            title={colorNames[c] ?? COLOR_NAMES[c]}
            tabIndex={palette?.seed === c ? 0 : -1}
            onClick={() => pick(c)}
            style={{ background: c }}
            // A swatch among other kinds of choice: the selection ring of every swatch, and the focus outside it.
            className={cn('size-(--control-xs) rounded-full border pointer-coarse:size-11', FOCUS_RING_SWATCH, palette?.seed === c ? cn('border-ink', SWATCH_CHOSEN) : 'border-line')}
          />
        ))}
      </div>
      <ColorField label={text.picker} value={palette?.seed ?? seed} onChange={pick} />
    </ChoiceGroup>
  )
}

export interface PaletteComboText {
  readonly label: string
  readonly hint: string
  readonly combos: Readonly<Record<PaletteCombo, ChoiceText>>
}

/** How the palette shares the page: each card shows the palette that combination makes from the base colour. */
export function PaletteComboChoice({ theme, scheme, tone, palette, seed, onPalette, text }: { theme: ThemeDef; scheme: ThemeScheme; tone: ThemeTone | null; palette: PalettePick | null; seed: string; onPalette: (palette: PalettePick) => void; text: PaletteComboText }) {
  const id = useId()
  return (
    <ChoiceGroup id={id} label={text.label} hint={text.hint}>
      <ChoiceCards labelledBy={id}>
        {PALETTE_COMBOS.map((k) => (
          <ChoiceCard
            key={k}
            choice={palette?.combo === k}
            name={text.combos[k].name}
            note={text.combos[k].note}
            onChoose={() => onPalette({ seed: palette?.seed ?? seed, combo: k })}
            preview={
              <ChoicePreview kind={`combo-${k}`}>
                <PaletteStrip pick={{ theme, scheme, tone, palette: { seed: palette?.seed ?? seed, combo: k } }} />
              </ChoicePreview>
            }
          />
        ))}
      </ChoiceCards>
    </ChoiceGroup>
  )
}

export interface TonePresetText {
  readonly label: string
  readonly hint: string
  readonly presets: Readonly<Record<TonePreset, ChoiceText>>
  /**
   * Said in place of the three cards when the tone changes nothing: the colours in use have no hue (a gray theme), so
   * the cards would be three copies of one preview. Absent: the cards are shown all the same.
   */
  readonly noEffect?: string | undefined
}

/** The tone, among three: each card shows that tone on the colours in use (the palette, or the theme). */
export function TonePresetChoice({ theme, scheme, palette, tone, onTone, text }: { theme: ThemeDef; scheme: ThemeScheme; palette: PalettePick | null; tone: ThemeTone | null; onTone: (tone: ThemeTone | null) => void; text: TonePresetText }) {
  const id = useId()
  const chosen = tonePresetOf(tone)
  // A choice that changes nothing is not offered: three identical previews would say the control is broken.
  if (text.noEffect !== undefined && !toneHasEffect({ theme, scheme, palette })) {
    return <ChoiceGroup id={id} label={text.label} hint={text.noEffect}>{null}</ChoiceGroup>
  }
  return (
    <ChoiceGroup id={id} label={text.label} hint={text.hint}>
      <ChoiceCards labelledBy={id}>
        {TONE_PRESETS.map((k) => (
          <ChoiceCard
            key={k}
            choice={chosen === k}
            name={text.presets[k].name}
            note={text.presets[k].note}
            onChoose={() => onTone(presetTone(k))}
            preview={
              <ChoicePreview kind={`tone-${k}`}>
                <TonePreview pick={{ theme, scheme, palette, tone: presetTone(k) }} />
              </ChoicePreview>
            }
          />
        ))}
      </ChoiceCards>
    </ChoiceGroup>
  )
}

export interface ThemeCatalogText {
  readonly label: string
  readonly hint: string
  /** Below each theme's name, by id: what it is for. */
  readonly notes: Readonly<Record<string, string>>
}

/**
 * The app's ready-made themes, one card each with the theme's palette in the scheme shown. `chosen` is the id of the
 * theme on the page, or null when a palette from a base colour replaces it (then none is chosen).
 */
export function ThemeCatalogChoice({ themes, chosen, scheme, tone, onTheme, text }: { themes: readonly ThemeDef[]; chosen: string | null; scheme: ThemeScheme; tone: ThemeTone | null; onTheme: (id: string) => void; text: ThemeCatalogText }) {
  const id = useId()
  return (
    <ChoiceGroup id={id} label={text.label} hint={text.hint}>
      <div role="radiogroup" aria-labelledby={id} onKeyDown={radioArrows} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {themes.map((t) => {
          const on = chosen === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (chosen === null && t === themes[0]) ? 0 : -1}
              onClick={() => onTheme(t.id)}
              className={cn('group flex flex-col overflow-hidden rounded-lg border bg-raised text-start', FOCUS_RING, choiceBorder(on))}
            >
              <span className="block h-16 w-full overflow-hidden border-b border-line">
                <PaletteStrip pick={{ theme: t, scheme, tone }} />
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-ink-mute">{text.notes[t.id] ?? ''}</span>
                </span>
                {on ? <Check className="size-4 shrink-0" /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </ChoiceGroup>
  )
}

export interface DensityText {
  readonly label: string
  readonly hint: string
  /** Each density's name and note, by id. A density without words here shows its own label. */
  readonly densities: Readonly<Record<string, ChoiceText>>
}

/** Three rows of a list at a density, at a quarter of their size: the height of a row and the room between two. */
function DensityPreview({ density }: { density: DensityDef }) {
  const d = densityOf(density)
  return (
    <span data-slot="density-preview" className="flex h-full flex-col justify-center px-2.5" style={{ gap: d.row.pad / 4 }}>
      {['w-10', 'w-14', 'w-8'].map((width) => (
        <span key={width} className="flex shrink-0 items-center gap-1.5" style={{ height: d.row.height / 4 }}>
          <span className="size-2 shrink-0 rounded-full border border-input" />
          <span className={cn('h-1 rounded-full bg-input', width)} />
        </span>
      ))}
    </span>
  )
}

/**
 * The density, among the ones the app offers (the toolkit's presets, `DENSITIES`, or its own definitions): each card
 * draws three rows to scale. `chosen` is the id on the page; the app applies the one picked (`applyDensity`).
 */
export function DensityChoice<D extends DensityDef>({ densities, chosen, onDensity, text }: { densities: readonly D[]; chosen: string; onDensity: (density: D) => void; text: DensityText }) {
  const id = useId()
  return (
    <ChoiceGroup id={id} label={text.label} hint={text.hint}>
      <ChoiceCards labelledBy={id}>
        {densities.map((d) => (
          <ChoiceCard
            key={d.id}
            choice={chosen === d.id}
            name={text.densities[d.id]?.name ?? d.label}
            note={text.densities[d.id]?.note ?? ''}
            onChoose={() => onDensity(d)}
            preview={
              <ChoicePreview kind={`density-${d.id}`}>
                <DensityPreview density={d} />
              </ChoicePreview>
            }
          />
        ))}
      </ChoiceCards>
    </ChoiceGroup>
  )
}
