// The layout builder: a canvas to compose the screen of an app out of the toolkit's parts, by dragging. The canvas is
// made of panels; a panel is dragged by its tab onto another to join it (tabs), or onto one of its edges to stand
// beside it, above or below; the line between two panels resizes them. A component is dragged from the list at the
// left into a panel, and inside a panel up and down. The inspector at the right holds the look: everything the toolkit
// lets an app configure (scheme, colours, tone, corners, font, density and each of its measures, icon pack, motion),
// applied to the whole canvas at once. What is built is kept in this browser and can be copied as data.
// Development only, like the showcase it lives in. The panels are `dockview-react` (MIT, a development dependency),
// drawn with the toolkit's tokens (builder.css); everything inside a panel is the toolkit's own components.
import './builder.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { DockviewReact, themeLight, type DockviewApi, type DockviewReadyEvent, type IDockviewPanelProps } from 'dockview-react'
import { Archive, ArrowDown, ArrowUp, GripVertical, Moon, Plus, Reply, RotateCcw, Search, SlidersHorizontal, Sun, Trash2, X } from 'lucide-react'
import {
  AppShell,
  BASE_THEME,
  Badge,
  Button,
  COLORS,
  COLOR_NAMES,
  ColorMatch,
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
  colorTheme,
  densityWith,
  presetTone,
  type DensityDef,
  type FontId,
  type IconPack,
  type SpotKind,
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
const isKind = (value: unknown): value is Kind => typeof value === 'string' && value in KINDS

/* ———— The state: what each panel holds, kept in this browser with the arrangement of the panels ———— */

/* ———— The look: everything the toolkit lets an app configure, as data ———— */

type Look = {
  scheme: ThemeScheme
  /** The toolkit's gray baseline, or a theme made from two colours. */
  colors: 'base' | 'own'
  color: string
  spot: SpotKind | string | null
  tone: TonePreset
  shape: ThemeShape
  font: FontId
  density: DensityDef
  icons: IconPack
  animated: boolean
}
const SEEDS = COLORS.filter((_, i) => i % 3 === 1)
const NORMAL: DensityDef = DENSITIES.find((d) => d.id === 'normal')!
const START_LOOK: Look = { scheme: 'light', colors: 'base', color: SEEDS[0]!, spot: 'balanced', tone: 'vivid', shape: 'soft', font: 'plex', density: NORMAL, icons: 'lucide', animated: false }
const title = (word: string) => word[0]!.toUpperCase() + word.slice(1)

function applyLook(look: Look) {
  const root = document.documentElement
  const theme = look.colors === 'own' ? colorTheme({ id: 'own', label: 'Your colours', color: look.color, spot: look.spot }) : BASE_THEME
  applyTheme(root, { theme: { ...theme, shape: look.shape }, scheme: look.scheme, tone: presetTone(look.tone) })
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
        <ColorMatch
          colors={SEEDS.map((seed) => ({ color: seed, label: COLOR_NAMES[seed] ?? seed }))}
          color={look.color}
          spot={look.spot}
          scheme={look.scheme}
          onColor={(color) => onLook({ color, colors: 'own' })}
          onSpot={(spot) => onLook({ spot, colors: 'own' })}
          text={{
            color: 'Theme colour', spot: 'Spot colour', own: 'Your own colour', none: 'None',
            kinds: { quiet: 'Quiet', balanced: 'Balanced', loud: 'Loud' },
            sample: { action: 'Save', chosen: 'Today', row: 'Upcoming', due: 'Due now', running: 'Running' },
          }}
        />
      </Group>
      <Group label="Tone of the accents">
        <ToggleGroup aria-label="Tone" value={look.tone} onValueChange={(v) => v && onLook({ tone: v as TonePreset })}>
          {TONE_PRESETS.map((tone) => (
            <ToggleGroupItem key={tone} value={tone}>
              {title(tone)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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

type Item = { uid: string; kind: Kind }
type Contents = Record<string, Item[]>
type Saved = { layout: unknown; contents: Contents; next: number; look?: Look | undefined }
const KEY = 'sigrid-layout-builder-1'
const NEW = 'application/x-sigrid-kind'
const MOVE = 'application/x-sigrid-item'
let serial = 0
const uid = () => `c${Date.now().toString(36)}${(serial++).toString(36)}`

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Saved
    const contents: Contents = {}
    for (const [panel, items] of Object.entries(saved.contents ?? {})) contents[panel] = items.filter((item) => isKind(item.kind))
    // A look saved by an older builder may lack what was added since: the starting look fills it in.
    return { layout: saved.layout, contents, next: Number(saved.next) || 1, look: saved.look ? { ...START_LOOK, ...saved.look } : undefined }
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
}
const BuilderContext = React.createContext<Actions | null>(null)

/* ———— A panel: a column of components, and the place a component is dropped ———— */

function PanelView({ api }: IDockviewPanelProps) {
  const builder = React.useContext(BuilderContext)
  const panel = api.id
  const items = builder?.contents[panel] ?? []
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
    return index === -1 ? rows.length : index
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
      {items.map((item, i) => (
        <React.Fragment key={item.uid}>
          {at === i ? <DropLine /> : null}
          <div data-builder-item={item.uid} className="group/item relative rounded-md p-1 hover:bg-ink/4 focus-within:bg-ink/4">
            {KINDS[item.kind].render()}
            {/* Hidden with opacity, not with `display`: a grip taken out of the page as its drag starts would end the drag. */}
            <div className="pointer-events-none absolute top-1 right-1 flex items-center gap-0.5 rounded-md bg-raised p-0.5 opacity-0 shadow-sm group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100 group-hover/item:pointer-events-auto group-hover/item:opacity-100">
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
              <ItemButton label={`Move ${KINDS[item.kind].label} up`} disabled={i === 0} onClick={() => builder?.shift(panel, item.uid, -1)}>
                <ArrowUp aria-hidden="true" className="size-3.5" />
              </ItemButton>
              <ItemButton label={`Move ${KINDS[item.kind].label} down`} disabled={i === items.length - 1} onClick={() => builder?.shift(panel, item.uid, 1)}>
                <ArrowDown aria-hidden="true" className="size-3.5" />
              </ItemButton>
              <ItemButton label={`Remove ${KINDS[item.kind].label}`} onClick={() => builder?.remove(panel, item.uid)}>
                <X aria-hidden="true" className="size-3.5" />
              </ItemButton>
            </div>
          </div>
        </React.Fragment>
      ))}
      {at === items.length ? <DropLine /> : null}
    </div>
  )
}

/** Where the dragged component will land: a line in the accent. */
const DropLine = () => <div aria-hidden="true" data-builder-drop className="h-0.5 shrink-0 rounded-full bg-primary" />

function ItemButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex size-6 items-center justify-center rounded-sm text-ink-soft outline-hidden hover:bg-ink/9 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40">
      {children}
    </button>
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
          const item = source[at]!
          const without = source.filter((_, i) => i !== at)
          const target = from === to ? without : [...(now[to] ?? [])]
          // Inside one panel, taking the item out moves what follows it up by one.
          target.splice(from === to && at < index ? index - 1 : index, 0, item)
          return { ...now, [from]: without, [to]: target }
        }),
      remove: (panel, itemUid) => change((now) => ({ ...now, [panel]: (now[panel] ?? []).filter((item) => item.uid !== itemUid) })),
      shift: (panel, itemUid, by) =>
        change((now) => {
          const items = [...(now[panel] ?? [])]
          const at = items.findIndex((item) => item.uid === itemUid)
          const to = at + by
          if (at < 0 || to < 0 || to >= items.length) return now
          ;[items[at], items[to]] = [items[to]!, items[at]!]
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
            <span className="ms-auto max-md:hidden">Drag a tab onto a panel to join it, onto an edge to split; drag the line between two panels to resize.</span>
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
