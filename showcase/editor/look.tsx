// The look of an app as data, and the panel that sets it: everything the toolkit lets an app configure (scheme, the
// two colours of the theme, the tone of the accents, the corner shape, the font, the density and each of its measures,
// the icon pack, motion). The editor keeps it with the app, puts it on the canvas and on the run page, and the export
// writes it into the app's entry file.
import * as React from 'react'
import {
  BASE_THEME,
  COLORS,
  COLOR_NAMES,
  DENSITIES,
  DENSITY_LIMITS,
  FONTS,
  ICON_PACKS,
  Select,
  Slider,
  Switch,
  THEME_SHAPES,
  TONE_PRESETS,
  ToggleGroup,
  ToggleGroupItem,
  accentSuggestions,
  applyDensity,
  applyFont,
  applyTheme,
  cn,
  densityWith,
  duoTheme,
  pageTint,
  presetTone,
  toneHasEffect,
  type DensityDef,
  type FontId,
  type Harmony,
  type IconPack,
  type ThemeScheme,
  type ThemeShape,
  type TonePreset,
  isFontId,
  densityOf,
  isIconPack,
} from '../../src/index'

export type Look = {
  scheme: ThemeScheme
  /** The toolkit's gray baseline, or a theme of two colours: the base of the page and the accent. */
  colors: 'base' | 'own'
  /** The base: the colour of the page, brought to a very light tone. Null: the white. */
  page: string | null
  /** The accent, `#rrggbb`. */
  accent: string
  /** The accent follows the base: when the base changes, the accent is the one the toolkit suggests first. */
  accentAuto: boolean
  tone: TonePreset
  shape: ThemeShape
  font: FontId
  density: DensityDef
  icons: IconPack
  animated: boolean
}
const SEEDS: readonly string[] = COLORS.filter((_, i) => i % 3 === 1)
const NORMAL: DensityDef = DENSITIES.find((d) => d.id === 'normal')!
// The canvas starts in colour: on the gray baseline the accent, the tone and the selection would all read as gray.
export const START_LOOK: Look = { scheme: 'light', colors: 'own', page: null, accent: accentSuggestions(null)[0]!.color, accentAuto: true, tone: 'vivid', shape: 'soft', font: 'plex', density: NORMAL, icons: 'lucide', animated: false }
const title = (word: string) => word[0]!.toUpperCase() + word.slice(1)

const HEX = /^#[0-9a-f]{6}$/i
/**
 * A look from data of any origin (a file someone made, what the browser kept), made whole: a value that is missing
 * or not one the toolkit knows takes its starting value. A look that the theme engine cannot take would leave the
 * editor and the run page blank, and it would stay so, because the document is kept in the browser.
 */
export function readLook(value: unknown): Look {
  const start = structuredClone(START_LOOK)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return start
  const given = value as Record<string, unknown>
  const among = <T extends string>(it: unknown, all: readonly T[], otherwise: T): T => (typeof it === 'string' && (all as readonly string[]).includes(it) ? (it as T) : otherwise)
  return {
    scheme: among(given['scheme'], ['light', 'dark'] as const, start.scheme),
    colors: among(given['colors'], ['own', 'base'] as const, start.colors),
    page: typeof given['page'] === 'string' && HEX.test(given['page']) ? given['page'] : null,
    accent: typeof given['accent'] === 'string' && HEX.test(given['accent']) ? given['accent'] : start.accent,
    accentAuto: typeof given['accentAuto'] === 'boolean' ? given['accentAuto'] : start.accentAuto,
    tone: among(given['tone'], TONE_PRESETS, start.tone),
    shape: among(given['shape'], THEME_SHAPES, start.shape),
    font: isFontId(given['font']) ? given['font'] : start.font,
    // Every measure a whole number inside the toolkit's limits; anything else is the normal density.
    density: densityOf(given['density']),
    icons: isIconPack(given['icons']) ? given['icons'] : start.icons,
    animated: given['animated'] === true,
  }
}

/** The two colours as the engine takes them, on top of the baseline; nothing for the baseline itself. */
export const ownOf = (look: Look) => (look.colors === 'own' ? duoTheme({ base: look.page, accent: look.accent }) : null)
/** The principle behind a suggested accent, in words. */
const HARMONY: Record<Harmony, string> = { split: 'Split', complement: 'Complement', triad: 'Triad', analogous: 'Neighbour', mono: 'Same hue', spread: 'Hue' }
/** A suggestion's name: its principle and, where two share one, the side of the wheel it is on. */
const suggestionName = (s: { harmony: Harmony; turn: number; id: string }) => (s.harmony === 'spread' ? `Hue ${s.id.slice(7)}°` : s.turn === 0 || Math.abs(s.turn) === 180 ? HARMONY[s.harmony] : `${HARMONY[s.harmony]} ${s.turn > 0 ? '+' : '−'}${Math.abs(s.turn)}°`)

/** Puts a look on the root of a document: the canvas's own, the run page's, the editor's. */
export function applyLook(root: HTMLElement, look: Look, scheme: ThemeScheme = look.scheme) {
  applyTheme(root, { theme: { ...BASE_THEME, shape: look.shape }, scheme, own: ownOf(look), tone: presetTone(look.tone) })
  applyDensity(root, look.density)
  applyFont(root, look.font)
}

/** One measure of the density: its name, its value in px, and the slider that changes it within the toolkit's limits. */
function Measure({ label, value, min, max, step = 2, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="text-ink-mute tabular-nums">{value}px</span>
      </div>
      <Slider aria-label={label} value={value} min={min} max={max} step={step} onValueChange={onChange} />
    </div>
  )
}

/** A colour to choose among a few: a round swatch, with a dot of the colour it comes from. */
function Swatch({ label, color, dot, chosen, onChoose }: { label: string; color: string; dot?: string | undefined; chosen: boolean; onChoose: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={chosen} aria-label={label} title={label} onClick={onChoose} className="relative flex size-8 items-center justify-center rounded-full border border-line outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-checked:border-2 aria-checked:border-ring" style={{ background: color }}>
      {dot ? <span aria-hidden="true" className="size-2 rounded-full" style={{ background: dot }} /> : null}
    </button>
  )
}

/** Any colour, from the system's own picker. */
function OwnColour({ label, value, chosen, onChange }: { label: string; value: string; chosen: boolean; onChange: (color: string) => void }) {
  return (
    <label title={label} className={cn('relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-xs text-ink-mute focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring', chosen && 'border-2 border-ring')}>
      <span aria-hidden="true">+</span>
      <input type="color" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line pb-4 last:border-0">
      <h3 className="text-2xs font-semibold tracking-[0.07em] text-ink-mute uppercase">{label}</h3>
      {children}
    </section>
  )
}

/** The controls of the look, in the inspector: each changes the whole canvas at once. */
export function LookPanel({ look, onLook }: { look: Look; onLook: (change: Partial<Look>) => void }) {
  const d = look.density
  const density = (override: Parameters<typeof densityWith>[1]) => onLook({ density: densityWith(d, { id: 'custom', label: 'Custom', ...override }) })
  const suggestions = React.useMemo(() => accentSuggestions(look.page), [look.page])
  // A new base brings its best accent with it, unless the accent was chosen by hand.
  const chooseBase = (page: string | null) => onLook(look.accentAuto ? { page, accent: accentSuggestions(page)[0]!.color } : { page })
  const L = DENSITY_LIMITS
  return (
    <div className="flex flex-col gap-4">
      <Group label="Scheme">
        <ToggleGroup aria-label="Scheme" value={look.scheme} onValueChange={(v) => v && onLook({ scheme: v as ThemeScheme })}>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
        </ToggleGroup>
      </Group>
      <Group label="Colours">
        <ToggleGroup aria-label="Colours" value={look.colors} onValueChange={(v) => v && onLook({ colors: v as Look['colors'] })}>
          <ToggleGroupItem value="base">Gray baseline</ToggleGroupItem>
          <ToggleGroupItem value="own">Two colours</ToggleGroupItem>
        </ToggleGroup>
        {look.colors === 'base' ? (
          <p className="text-xs text-ink-mute">The toolkit's own theme: grays only, no accent hue. An app brings its colours; choose «Two colours» to try some.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-soft">Base: the page</span>
                <span className="text-ink-mute tabular-nums">{pageTint(look.page)}</span>
              </div>
              <div role="radiogroup" aria-label="Base colour" className="flex flex-wrap gap-1.5">
                {[null, ...SEEDS].map((base) => (
                  <Swatch key={base ?? 'white'} label={base === null ? 'White' : ((COLOR_NAMES as Record<string, string>)[base] ?? base)} color={pageTint(base)} dot={base ?? undefined} chosen={look.page === base} onChoose={() => chooseBase(base)} />
                ))}
                <OwnColour label="Your own base colour" value={look.page ?? '#ffffff'} chosen={look.page !== null && !SEEDS.includes(look.page)} onChange={chooseBase} />
              </div>
              <p className="text-xs text-ink-mute">Any colour is brought to a very light tone: only its hue is left on the page.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-soft">Accent: suggested for this base</span>
                <span className="text-ink-mute tabular-nums">{look.accent}</span>
              </div>
              <div role="radiogroup" aria-label="Accent colour" className="grid grid-cols-2 gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    role="radio"
                    aria-checked={look.accent === suggestion.color}
                    data-builder-accent={suggestion.id}
                    title={suggestion.moved ? 'Moved out of the red of errors' : undefined}
                    onClick={() => onLook({ accent: suggestion.color, accentAuto: suggestion.recommended })}
                    className="flex min-h-(--control-sm) items-center gap-2 rounded-md border border-line px-2 text-start text-xs text-ink outline-hidden hover:bg-ink/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-checked:border-ring aria-checked:bg-selected aria-checked:text-selected-ink"
                  >
                    <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ background: suggestion.color }} />
                    <span className="min-w-0 flex-1 truncate">{suggestionName(suggestion)}</span>
                    {suggestion.recommended ? <span className="shrink-0 text-2xs font-semibold tracking-[0.07em] uppercase opacity-80">Best</span> : null}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <OwnColour label="Your own accent colour" value={look.accent} chosen={!suggestions.some((suggestion) => suggestion.color === look.accent)} onChange={(accent) => onLook({ accent, accentAuto: false })} />
                Or a colour of your own. The engine moves any accent until its contrast holds.
              </div>
            </div>
          </>
        )}
      </Group>
      <Group label="Tone of the accents">
        {toneHasEffect({ theme: BASE_THEME, scheme: look.scheme, own: ownOf(look) }) ? (
          <ToggleGroup aria-label="Tone" value={look.tone} onValueChange={(v) => v && onLook({ tone: v as TonePreset })}>
            {TONE_PRESETS.map((tone) => (
              <ToggleGroupItem key={tone} value={tone}>
                {title(tone)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : (
          <p data-builder-no-tone className="text-xs text-ink-mute">These colours have no hue, so the tone changes nothing: Calm, Balanced and Vivid would look the same.</p>
        )}
      </Group>
      <Group label="Corners">
        <ToggleGroup aria-label="Corners" value={look.shape} onValueChange={(v) => v && onLook({ shape: v as ThemeShape })}>
          {THEME_SHAPES.map((shape) => (
            <ToggleGroupItem key={shape} value={shape}>
              {title(shape)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-ink-mute">Sharp is 2, 4 and 6px; soft 4, 6 and 10px; round 6, 10 and 14px.</p>
      </Group>
      <Group label="Font">
        <Select aria-label="Font" options={FONTS.map((font) => ({ value: font.id, label: font.label }))} value={look.font} onValueChange={(v) => onLook({ font: v as FontId })} />
      </Group>
      <Group label="Density and spacing">
        <ToggleGroup aria-label="Density" value={d.id} onValueChange={(v) => v && onLook({ density: DENSITIES.find((preset) => preset.id === v) ?? NORMAL })}>
          {DENSITIES.map((preset) => (
            <ToggleGroupItem key={preset.id} value={preset.id}>
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {d.id === 'custom' ? <p className="text-xs text-ink-mute">Your own measures. A preset above puts them back.</p> : null}
        <Measure label="Control height" value={d.control.md} min={L.control.min} max={L.control.max} onChange={(md) => density({ control: { md } })} />
        <Measure label="Dense control height" value={d.control.sm} min={L.control.min} max={L.control.max} onChange={(sm) => density({ control: { sm } })} />
        <Measure label="Smallest control height" value={d.control.xs} min={L.control.min} max={L.control.max} onChange={(xs) => density({ control: { xs } })} />
        <Measure label="Button padding" value={d.pad.md} min={L.pad.min} max={L.pad.max} onChange={(md) => density({ pad: { md } })} />
        <Measure label="Field padding" value={d.pad.sm} min={L.pad.min} max={L.pad.max} onChange={(sm) => density({ pad: { sm } })} />
        <Measure label="Smallest button padding" value={d.pad.xs} min={L.pad.min} max={L.pad.max} onChange={(xs) => density({ pad: { xs } })} />
        <Measure label="Row height" value={d.row.height} min={L.rowHeight.min} max={L.rowHeight.max} onChange={(height) => density({ row: { height } })} />
        <Measure label="Row padding" value={d.row.pad} min={L.rowPad.min} max={L.rowPad.max} onChange={(pad) => density({ row: { pad } })} />
      </Group>
      <Group label="Icons">
        <Select aria-label="Icon pack" options={ICON_PACKS.map((pack) => ({ value: pack, label: title(pack) }))} value={look.icons} onValueChange={(v) => onLook({ icons: v as IconPack })} />
        <p className="text-xs text-ink-mute">The drawings of every icon of the app.</p>
      </Group>
      <Group label="Motion">
        <label className="flex items-center justify-between gap-4 text-sm text-ink">
          Animations on a gesture
          <Switch aria-label="Animations" checked={look.animated} onCheckedChange={(animated) => onLook({ animated })} />
        </label>
      </Group>
    </div>
  )
}

