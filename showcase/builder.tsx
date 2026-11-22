// The layout builder: a canvas to compose the screen of an app out of the toolkit's parts, by dragging. The canvas is
// made of panels; a panel is dragged by its tab onto another to join it (tabs), or onto one of its edges to stand
// beside it, above or below; the line between two panels resizes them. A component is dragged from the list at the
// left into a panel, and inside a panel up and down; one can also be set beside the one before it, on the same row
// (a title and the view tabs). The inspector at the right holds the look: everything the toolkit
// lets an app configure (scheme, colours, tone, corners, font, density and each of its measures, icon pack, motion),
// applied to the whole canvas at once. What is built is kept in this browser and can be copied as data.
// Development only, like the showcase it lives in. The panels are `dockview-react` (MIT, a development dependency),
// drawn with the toolkit's tokens (builder.css); everything inside a panel is the toolkit's own components.
import './builder.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { DockviewReact, themeLight, type DockviewApi, type DockviewReadyEvent, type IDockviewPanelProps } from 'dockview-react'
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Columns2, GripVertical, Moon, Plus, Reply, RotateCcw, Rows2, Search, SlidersHorizontal, Sun, Trash2, X } from 'lucide-react'
import {
  AppShell,
  BASE_THEME,
  Badge,
  Button,
  COLORS,
  COLOR_NAMES,
  DENSITIES,
  DENSITY_LIMITS,
  Empty,
  FONTS,
  ICON_PACKS,
  Icon,
  IconPackProvider,
  Input,
  Inspector,
  ItemList,
  ItemRow,
  MotionProvider,
  NavItem,
  NavList,
  SearchField,
  Select,
  Slider,
  Switch,
  THEME_SHAPES,
  TONE_PRESETS,
  TitleBar,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarBrand,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarTab,
  ToolbarTabs,
  applyDensity,
  applyFont,
  applyTheme,
  cn,
  Tooltip,
  accentSuggestions,
  duoTheme,
  pageTint,
  densityWith,
  presetTone,
  toneHasEffect,
  type DensityDef,
  type FontId,
  type IconPack,
  type Harmony,
  type ThemeScheme,
  type ThemeShape,
  type TonePreset,
} from '../src'

/* ———— What can be dropped into a panel ———— */

function SearchSample() {
  const [text, setText] = React.useState('')
  return <SearchField aria-label="Search" placeholder="Search" value={text} onValueChange={setText} />
}
function TabsSample() {
  const [view, setView] = React.useState('all')
  return (
    <Toolbar aria-label="Views">
      <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
        <ToolbarTab value="all">All</ToolbarTab>
        <ToolbarTab value="unread">Unread</ToolbarTab>
        <ToolbarTab value="flagged">Flagged</ToolbarTab>
      </ToolbarTabs>
    </Toolbar>
  )
}
function SegmentSample() {
  const [view, setView] = React.useState('list')
  return (
    <ToggleGroup aria-label="View" value={view} onValueChange={(v) => v && setView(v)}>
      <ToggleGroupItem value="list">List</ToggleGroupItem>
      <ToggleGroupItem value="board">Board</ToggleGroupItem>
    </ToggleGroup>
  )
}
function ListSample() {
  const [chosen, setChosen] = React.useState(0)
  const rows: [string, string, string][] = [
    ['Kitchen quote, second version', 'Marta Riva', '09:42'],
    ['Receipt of the waste tax', 'City of Bergamo', '08:15'],
    ['Photos of Tuesday\'s survey', 'Luca Ferri', 'Mon'],
  ]
  return (
    <ItemList aria-label="Sample list">
      {rows.map(([title, from, when], i) => (
        <ItemRow key={title} title={title} description={from} meta={when} unread={i === 2} current={i === chosen} onClick={() => setChosen(i)} />
      ))}
    </ItemList>
  )
}

const KINDS = {
  heading: { label: 'Title', render: () => <h2 className="text-lg font-semibold text-ink">A title</h2> },
  text: { label: 'Text', render: () => <p className="text-sm text-ink-soft">A sentence that says what this part of the screen is for.</p> },
  primary: { label: 'Primary button', render: () => <Button>Save</Button> },
  outline: { label: 'Outline button', render: () => <Button variant="outline">Cancel</Button> },
  input: { label: 'Field', render: () => <Input aria-label="Name" placeholder="Name" /> },
  search: { label: 'Search field', render: () => <SearchSample /> },
  toggle: { label: 'Switch', render: () => <label className="flex items-center justify-between gap-4 text-sm text-ink">Notifications<Switch aria-label="Notifications" defaultChecked /></label> },
  segment: { label: 'Segment', render: () => <SegmentSample /> },
  tabs: { label: 'View tabs', render: () => <TabsSample /> },
  toolbar: {
    label: 'Toolbar',
    render: () => (
      <Toolbar aria-label="Actions" size="sm">
        <ToolbarButton label="Reply" icon={<Reply aria-hidden="true" />} />
        <ToolbarButton label="Archive" icon={<Archive aria-hidden="true" />} />
        <ToolbarSeparator />
        <ToolbarButton label="Delete" icon={<Trash2 aria-hidden="true" />} />
        <ToolbarSpacer />
        <ToolbarButton label="Search" icon={<Search aria-hidden="true" />} />
      </Toolbar>
    ),
  },
  list: { label: 'List', render: () => <ListSample /> },
  // In a row it takes what the others leave, which pushes what follows it to the end of the row.
  spacer: { label: 'Space', render: () => <div aria-hidden="true" className="flex h-8 items-center justify-center rounded-sm bg-ink/4 text-2xs text-ink-mute">Space</div> },
  nav: {
    label: 'Navigation',
    render: () => (
      <NavList aria-label="Sample places">
        <NavItem icon={<Icon name="all" />} current>
          Inbox
        </NavItem>
        <NavItem icon={<Icon name="notifications" />}>Waiting</NavItem>
        <NavItem icon={<Icon name="settings" />}>Settings</NavItem>
      </NavList>
    ),
  },
  badge: { label: 'Badge', render: () => <Badge variant="secondary">Draft</Badge> },
  empty: { label: 'Empty state', render: () => <Empty title="Nothing here yet" description="What is added will show in this place." /> },
} as const satisfies Record<string, { label: string; render: () => React.ReactNode }>
type Kind = keyof typeof KINDS
/**
 * In a row with others these keep the width they have; the rest share what is left. A toolbar has no width of its own
 * (it measures its container), so left to itself it would be squeezed to nothing beside a title.
 */
const NATURAL = new Set<Kind>(['heading', 'primary', 'outline', 'segment', 'badge'])
const isKind = (value: unknown): value is Kind => typeof value === 'string' && value in KINDS

/* ———— The state: what each panel holds, kept in this browser with the arrangement of the panels ———— */

/* ———— The look: everything the toolkit lets an app configure, as data ———— */

type Look = {
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
const START_LOOK: Look = { scheme: 'light', colors: 'own', page: null, accent: accentSuggestions(null)[0]!.color, accentAuto: true, tone: 'vivid', shape: 'soft', font: 'plex', density: NORMAL, icons: 'lucide', animated: false }
const title = (word: string) => word[0]!.toUpperCase() + word.slice(1)

/** The two colours as the engine takes them, on top of the baseline; nothing for the baseline itself. */
const ownOf = (look: Look) => (look.colors === 'own' ? duoTheme({ base: look.page, accent: look.accent }) : null)
/** The principle behind a suggested accent, in words. */
const HARMONY: Record<Harmony, string> = { split: 'Split', complement: 'Complement', triad: 'Triad', analogous: 'Neighbour', mono: 'Same hue', spread: 'Hue' }
/** A suggestion's name: its principle and, where two share one, the side of the wheel it is on. */
const suggestionName = (s: { harmony: Harmony; turn: number; id: string }) => (s.harmony === 'spread' ? `Hue ${s.id.slice(7)}°` : s.turn === 0 || Math.abs(s.turn) === 180 ? HARMONY[s.harmony] : `${HARMONY[s.harmony]} ${s.turn > 0 ? '+' : '−'}${Math.abs(s.turn)}°`)

function applyLook(look: Look) {
  const root = document.documentElement
  applyTheme(root, { theme: { ...BASE_THEME, shape: look.shape }, scheme: look.scheme, own: ownOf(look), tone: presetTone(look.tone) })
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
function LookPanel({ look, onLook }: { look: Look; onLook: (change: Partial<Look>) => void }) {
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
        <p className="text-xs text-ink-mute">Shown by the Navigation component.</p>
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

/** `beside`: the component sits on the row of the one before it, instead of starting a row of its own. */
type Item = { uid: string; kind: Kind; beside?: boolean | undefined }
type Contents = Record<string, Item[]>
type Saved = { layout: unknown; contents: Contents; next: number; look?: Look | undefined }
const KEY = 'sigrid-layout-builder-1'
const NEW = 'application/x-sigrid-kind'
const MOVE = 'application/x-sigrid-item'
let serial = 0
const uid = () => `c${Date.now().toString(36)}${(serial++).toString(36)}`

/** The items without the one at `at`. If the one after it was beside it, that one keeps the place in the row the taken one had. */
function take(items: Item[], at: number): Item[] {
  const out = items.filter((_, i) => i !== at)
  const next = out[at]
  if (next?.beside) out[at] = { ...next, beside: items[at]!.beside }
  return out
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Saved
    const contents: Contents = {}
    for (const [panel, items] of Object.entries(saved.contents ?? {})) {
      let list = items
      // Backwards, so each one taken out leaves the indexes of those still to be looked at as they were.
      for (let i = list.length - 1; i >= 0; i--) if (!isKind(list[i]!.kind)) list = take(list, i)
      contents[panel] = list
    }
    // A look saved by an older builder may lack what was added since: the starting look fills it in.
    return { layout: saved.layout, contents, next: Number(saved.next) || 1, look: saved.look ? { ...START_LOOK, ...saved.look, ...(typeof saved.look.accent === 'string' ? {} : { accent: START_LOOK.accent }) } : undefined }
  } catch {
    return null
  }
}
function save(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // A browser that keeps nothing: the builder works, and forgets on reload.
  }
}

const START: Contents = {
  navigation: [{ uid: 's1', kind: 'heading' }, { uid: 's2', kind: 'search' }],
  content: [{ uid: 's3', kind: 'tabs' }, { uid: 's4', kind: 'list' }],
  details: [{ uid: 's5', kind: 'toolbar' }, { uid: 's6', kind: 'text' }, { uid: 's7', kind: 'primary' }],
}

type Actions = {
  contents: Contents
  insert: (panel: string, index: number, kind: Kind) => void
  move: (from: string, itemUid: string, to: string, index: number) => void
  remove: (panel: string, itemUid: string) => void
  shift: (panel: string, itemUid: string, by: 1 | -1) => void
  /** Puts a component on the row of the one before it, or back on a row of its own. */
  toggleBeside: (panel: string, itemUid: string) => void
}
const BuilderContext = React.createContext<Actions | null>(null)

/* ———— A panel: a column of components, and the place a component is dropped ———— */

function PanelView({ api }: IDockviewPanelProps) {
  const builder = React.useContext(BuilderContext)
  const panel = api.id
  const items = builder?.contents[panel] ?? []
  // A component beside the one before it shares its row; the first of a panel always starts one.
  const rows = items.reduce<Item[][]>((all, item, i) => {
    if (item.beside && i > 0) all[all.length - 1]!.push(item)
    else all.push([item])
    return all
  }, [])
  const where = new Map<string, { size: number; place: number }>()
  for (const row of rows) row.forEach((item, place) => where.set(item.uid, { size: row.length, place }))
  const column = React.useRef<HTMLDivElement>(null)
  /** Where a drop would land: before the item of this index. Null: nothing is being dragged over. */
  const [at, setAt] = React.useState<number | null>(null)
  const ours = (event: React.DragEvent) => event.dataTransfer.types.includes(NEW) || event.dataTransfer.types.includes(MOVE)
  const indexAt = (y: number) => {
    const rows = Array.from(column.current?.querySelectorAll<HTMLElement>('[data-builder-item]') ?? [])
    const index = rows.findIndex((row) => {
      const box = row.getBoundingClientRect()
      return y < box.top + box.height / 2
    })
    let at = index === -1 ? rows.length : index
    // A drop is always before a whole row, never between two of its components.
    while (at < items.length && items[at]!.beside && at > 0) at++
    return at
  }
  return (
    <div
      ref={column}
      data-builder-panel={panel}
      className="flex h-full flex-col gap-2 overflow-y-auto p-3"
      onDragOver={(event) => {
        if (!ours(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = event.dataTransfer.types.includes(MOVE) ? 'move' : 'copy'
        setAt(indexAt(event.clientY))
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAt(null)
      }}
      onDrop={(event) => {
        if (!ours(event) || !builder) return
        event.preventDefault()
        const index = indexAt(event.clientY)
        setAt(null)
        const kind = event.dataTransfer.getData(NEW)
        if (isKind(kind)) return builder.insert(panel, index, kind)
        try {
          const moved = JSON.parse(event.dataTransfer.getData(MOVE)) as { panel: string; uid: string }
          builder.move(moved.panel, moved.uid, panel, index)
        } catch {
          // Not one of ours after all.
        }
      }}
    >
      {items.length === 0 && at === null ? <p className="m-auto max-w-48 text-center text-xs text-ink-mute">Drag a component here, or press one in the list while this panel is the active one.</p> : null}
      {/* One flat list, so a component keeps its place in the tree (its state, its focus) when it changes row; a break starts the next row. */}
      <div className="flex flex-wrap items-center gap-x-2">
        {items.map((item, i) => {
          const { size, place } = where.get(item.uid) ?? { size: 1, place: 0 }
          const head = place === 0
          const label = KINDS[item.kind].label
          // Beside a neighbour in its own row the arrows go sideways; at the edge of the row they go up and down.
          const left = item.beside && i > 0
          const right = items[i + 1]?.beside === true
          return (
            <React.Fragment key={item.uid}>
              {head && i > 0 && at !== i ? <div aria-hidden="true" className="basis-full" /> : null}
              {head && at === i ? <DropLine /> : null}
              <div data-builder-item={item.uid} className={cn('group/item relative my-1 min-w-0', size === 1 ? 'flex-1' : NATURAL.has(item.kind) ? 'flex-none' : 'flex-1')}>
                <div className={cn('min-w-0 rounded-md p-1 group-hover/item:bg-ink/4 group-focus-within/item:bg-ink/4', size > 1 && 'overflow-x-clip')}>{KINDS[item.kind].render()}</div>
                {/* Hidden with opacity, not with `display`: a grip taken out of the page as its drag starts would end the drag. The bar opens toward the rest of the row, so a narrow component does not cut it off. */}
                <div className={cn('pointer-events-none absolute top-1 flex items-center gap-0.5 rounded-md bg-raised p-0.5 opacity-0 shadow-sm group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100 group-hover/item:pointer-events-auto group-hover/item:opacity-100', size > 1 && head ? 'left-1' : 'right-1')}>
                  {/* The grip is what is dragged: a drag that starts in a field of the component selects its text. */}
                  <span
                    data-builder-grip
                    draggable
                    title="Drag to move"
                    onDragStart={(event) => {
                      event.dataTransfer.setData(MOVE, JSON.stringify({ panel, uid: item.uid }))
                      event.dataTransfer.effectAllowed = 'move'
                      const row = event.currentTarget.closest('[data-builder-item]')
                      if (row) event.dataTransfer.setDragImage(row, 8, 8)
                    }}
                    className="flex size-6 cursor-grab items-center justify-center rounded-sm text-ink-mute hover:bg-ink/9 active:cursor-grabbing"
                  >
                    <GripVertical aria-hidden="true" className="size-3.5" />
                  </span>
                  <ItemButton label={left ? `Put ${label} on a row of its own` : `Put ${label} beside the one before`} disabled={i === 0} onClick={() => builder?.toggleBeside(panel, item.uid)}>
                    {left ? <Rows2 aria-hidden="true" className="size-3.5" /> : <Columns2 aria-hidden="true" className="size-3.5" />}
                  </ItemButton>
                  <ItemButton label={`Move ${label} ${left ? 'left' : 'up'}`} disabled={i === 0} onClick={() => builder?.shift(panel, item.uid, -1)}>
                    {left ? <ArrowLeft aria-hidden="true" className="size-3.5" /> : <ArrowUp aria-hidden="true" className="size-3.5" />}
                  </ItemButton>
                  <ItemButton label={`Move ${label} ${right ? 'right' : 'down'}`} disabled={i === items.length - 1} onClick={() => builder?.shift(panel, item.uid, 1)}>
                    {right ? <ArrowRight aria-hidden="true" className="size-3.5" /> : <ArrowDown aria-hidden="true" className="size-3.5" />}
                  </ItemButton>
                  <ItemButton label={`Remove ${label}`} onClick={() => builder?.remove(panel, item.uid)}>
                    <X aria-hidden="true" className="size-3.5" />
                  </ItemButton>
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>
      {at === items.length ? <DropLine /> : null}
    </div>
  )
}

/** Where the dragged component will land: a line in the accent. */
const DropLine = () => <div aria-hidden="true" data-builder-drop className="h-0.5 shrink-0 basis-full rounded-full bg-primary" />

function ItemButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip label={label}>
      <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex size-6 items-center justify-center rounded-sm text-ink-soft outline-hidden hover:bg-ink/9 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
        {children}
      </button>
    </Tooltip>
  )
}

const COMPONENTS = { panel: PanelView }
const WIDTHS = { full: 'Full', '900': '900', '600': '600' } as const

/* ———— The builder ———— */

function Builder() {
  const saved = React.useMemo(load, [])
  const [contents, setContents] = React.useState<Contents>(saved?.contents ?? START)
  const [look, setLook] = React.useState<Look>(saved?.look ?? START_LOOK)
  const [lookOpen, setLookOpen] = React.useState(true)
  const onLook = React.useCallback((change: Partial<Look>) => setLook((now) => ({ ...now, ...change })), [])
  const scheme = look.scheme
  const [width, setWidth] = React.useState<keyof typeof WIDTHS>('full')
  const [said, setSaid] = React.useState('')
  const [panels, setPanels] = React.useState(0)
  /** While the canvas is being emptied to start again, a panel that goes does not take the new contents with it. */
  const restarting = React.useRef(false)
  const dock = React.useRef<DockviewApi | null>(null)
  const next = React.useRef(saved?.next ?? 1)
  const latest = React.useRef(contents)
  latest.current = contents

  const latestLook = React.useRef(look)
  latestLook.current = look
  React.useLayoutEffect(() => applyLook(look), [look])

  const keep = React.useCallback(() => {
    if (!dock.current) return
    setPanels(dock.current.panels.length)
    save({ layout: dock.current.toJSON(), contents: latest.current, next: next.current, look: latestLook.current })
  }, [])
  React.useEffect(keep, [contents, look, keep])

  const actions = React.useMemo<Actions>(() => {
    const change = (fn: (now: Contents) => Contents) => setContents((now) => fn(now))
    return {
      contents,
      insert: (panel, index, kind) =>
        change((now) => {
          const items = [...(now[panel] ?? [])]
          items.splice(index, 0, { uid: uid(), kind })
          return { ...now, [panel]: items }
        }),
      move: (from, itemUid, to, index) =>
        change((now) => {
          const source = now[from] ?? []
          const at = source.findIndex((item) => item.uid === itemUid)
          if (at < 0) return now
          // Dropped where it already is: nothing changes, and its row stays.
          if (from === to && (index === at || index === at + 1)) return now
          const item = source[at]!
          const without = take(source, at)
          const target = from === to ? without : [...(now[to] ?? [])]
          // Inside one panel, taking the item out moves what follows it up by one. It lands on a row of its own.
          target.splice(from === to && at < index ? index - 1 : index, 0, { ...item, beside: undefined })
          return { ...now, [from]: without, [to]: target }
        }),
      remove: (panel, itemUid) =>
        change((now) => {
          const items = now[panel] ?? []
          const at = items.findIndex((item) => item.uid === itemUid)
          return at < 0 ? now : { ...now, [panel]: take(items, at) }
        }),
      shift: (panel, itemUid, by) =>
        change((now) => {
          const items = [...(now[panel] ?? [])]
          const at = items.findIndex((item) => item.uid === itemUid)
          const to = at + by
          if (at < 0 || to < 0 || to >= items.length) return now
          // The two change places and the rows stay as they are: what says who is beside whom belongs to the place.
          const a = items[at]!
          const b = items[to]!
          items[at] = { ...b, beside: a.beside }
          items[to] = { ...a, beside: b.beside }
          return { ...now, [panel]: items }
        }),
      toggleBeside: (panel, itemUid) =>
        change((now) => {
          const items = (now[panel] ?? []).map((item, i) => (item.uid === itemUid && i > 0 ? { ...item, beside: item.beside ? undefined : true } : item))
          return { ...now, [panel]: items }
        }),
    }
  }, [contents])

  const startLayout = (api: DockviewApi) => {
    restarting.current = true
    api.clear()
    restarting.current = false
    api.addPanel({ id: 'navigation', component: 'panel', title: 'Navigation' })
    api.addPanel({ id: 'content', component: 'panel', title: 'Content', position: { referencePanel: 'navigation', direction: 'right' } })
    api.addPanel({ id: 'details', component: 'panel', title: 'Details', position: { referencePanel: 'content', direction: 'right' } })
    api.getPanel('navigation')?.api.setSize({ width: 240 })
    api.getPanel('details')?.api.setSize({ width: 300 })
  }
  const onReady = (event: DockviewReadyEvent) => {
    const api = event.api
    dock.current = api
    let restored = false
    if (saved?.layout) {
      try {
        api.fromJSON(saved.layout as Parameters<DockviewApi['fromJSON']>[0])
        restored = true
      } catch {
        restored = false
      }
    }
    if (!restored) startLayout(api)
    api.onDidLayoutChange(keep)
    // A panel that is closed takes its components with it.
    api.onDidRemovePanel((panel) => {
      if (!restarting.current) setContents(({ [panel.id]: _gone, ...rest }) => rest)
    })
    setPanels(api.panels.length)
  }
  const addPanel = () => {
    const api = dock.current
    if (!api) return
    const n = next.current++
    const reference = api.activePanel
    api.addPanel({ id: `panel-${n}`, component: 'panel', title: `Panel ${n}`, ...(reference ? { position: { referencePanel: reference.id, direction: 'right' as const } } : {}) })
  }
  const reset = () => {
    next.current = 1
    if (dock.current) startLayout(dock.current)
    setContents(START)
    setLook(START_LOOK)
    setSaid('Back to the starting layout.')
  }
  const copy = async () => {
    const data = JSON.stringify({ look, layout: dock.current?.toJSON(), contents }, null, 2)
    try {
      await navigator.clipboard.writeText(data)
      setSaid('The look and the layout are on the clipboard, as data.')
    } catch {
      setSaid('This browser did not let the page write to the clipboard.')
    }
  }
  // The library's light theme carries the measures; every colour of it is set from the toolkit's tokens (builder.css),
  // and the scheme is told to the library so what it draws by itself follows it.
  const dockTheme = React.useMemo(() => ({ ...themeLight, colorScheme: scheme }), [scheme])
  const total = Object.values(contents).reduce((sum, items) => sum + items.length, 0)

  return (
    <MotionProvider animated={look.animated}>
    <IconPackProvider pack={look.icons}>
    <BuilderContext.Provider value={actions}>
      <AppShell
        contentLabel="Canvas"
        titleBar={
          <TitleBar>
            <Toolbar aria-label="Builder">
              <ToolbarBrand name="Sigrid" page="Layout builder" />
              <ToolbarSpacer />
              <ToggleGroup aria-label="Width of the canvas" value={width} onValueChange={(v) => v && setWidth(v as keyof typeof WIDTHS)}>
                {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((w) => (
                  <ToggleGroupItem key={w} value={w}>
                    {WIDTHS[w]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <ToolbarSeparator />
              <ToolbarButton label={scheme === 'light' ? 'Dark scheme' : 'Light scheme'} icon={scheme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />} onClick={() => onLook({ scheme: scheme === 'light' ? 'dark' : 'light' })} />
              <ToolbarButton label="Look" icon={<SlidersHorizontal aria-hidden="true" />} pressed={lookOpen} onClick={() => setLookOpen(!lookOpen)} />
              <ToolbarButton label="Start again" icon={<RotateCcw aria-hidden="true" />} onClick={reset} />
              <ToolbarButton label="Copy the layout as data" variant="outline" onClick={copy}>
                Copy
              </ToolbarButton>
              <ToolbarButton label="Add a panel" variant="default" icon={<Plus aria-hidden="true" />} onClick={addPanel}>
                Panel
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        sidebar={
          <aside aria-label="Components" className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-sidebar-paper p-2">
            <p className="px-2 py-1 text-2xs font-semibold tracking-[0.07em] text-sidebar-mute uppercase">Components</p>
            {(Object.keys(KINDS) as Kind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                draggable
                data-builder-kind={kind}
                onDragStart={(event) => {
                  event.dataTransfer.setData(NEW, kind)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => {
                  const active = dock.current?.activePanel
                  if (active) actions.insert(active.id, (contents[active.id] ?? []).length, kind)
                  else setSaid('Add a panel first.')
                }}
                className="flex min-h-(--row-height) cursor-grab items-center gap-2 rounded-md px-2 text-start text-sm text-sidebar-ink outline-hidden hover:bg-sidebar-selected/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
              >
                <GripVertical aria-hidden="true" className="size-3.5 shrink-0 text-sidebar-mute" />
                {KINDS[kind].label}
              </button>
            ))}
          </aside>
        }
        inspector={
          <Inspector title="Look" open={lookOpen} onOpenChange={setLookOpen}>
            <LookPanel look={look} onLook={onLook} />
          </Inspector>
        }
        footer={
          <>
            <span className="tabular-nums">
              {panels} {panels === 1 ? 'panel' : 'panels'}, {total} {total === 1 ? 'component' : 'components'}
            </span>
            <span role="status">{said}</span>
            <span className="ms-auto max-md:hidden">Drag a tab onto a panel to join it, onto an edge to split; drag the line between two panels to resize. Hover a component to set it beside the one before.</span>
          </>
        }
      >
        <div className={cn('sigrid-dock mx-auto h-full bg-paper-2', width !== 'full' && 'border-x border-line')} style={width === 'full' ? undefined : { maxWidth: `${width}px` }}>
          <DockviewReact components={COMPONENTS} onReady={onReady} theme={dockTheme} />
        </div>
      </AppShell>
    </BuilderContext.Provider>
    </IconPackProvider>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Builder />)
