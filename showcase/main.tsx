// The toolkit's showcase: every exported component, in its variants, sizes and states, under the theme and scheme
// chosen at the top (also from the address: `?theme=amber-bold&scheme=dark`), and a strip of the main controls in six
// palettes side by side. The themes are the toolkit's own baseline (`base`) and palettes it builds from one colour
// (`<colour>-<combination>`, such as `blue-clean`): an app's themes live in the app. Motion is on initially. `?animated=0` switches it off. Hover, pressed and focus are forced with `data-force` (see showcase.css), so they can be seen
// at once. What only opens on a gesture opens from the address: `?open=menu`, `popover`, `select`, `tooltip`, `date`,
// `datetime`, `range`, `date-picks`, `dialog`, `drawer`, `sheet`, `sheet-left`, `viewer`, `viewer-loading`, `viewer-error` (several, with commas).
// Not shown: `DesktopSurface` (a separate system window of the desktop shell) and the headless re-exports
// (`Collapsible`, `Field`, `PopoverPrimitive`), which have no form of their own.
import './showcase.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { DatePicker } from '@ark-ui/react/date-picker'
import { parseDate } from '@internationalized/date'
import { Archive, ArrowDownUp, Bell, ChevronRight, Ellipsis, Inbox, ListFilter, PanelLeft, Plus, Reply, Search, Settings, Trash2 } from 'lucide-react'
import {
  AttachmentMarks,
  AttachmentViewer,
  AttachmentsSection,
  BACKDROP,
  BASE_THEME,
  ThemeGallery,
  ColorMatch,
  MotionProvider,
  Badge,
  Button,
  CALENDAR_WORDS,
  COLORS,
  COLOR_NAMES,
  Calendar,
  Avatar,
  Checkbox,
  Combobox,
  SearchField,
  TitleBar,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSearch,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarTitle,
  WindowControls,
  Sidebar,
  SidebarGroup,
  Slider,
  Count,
  FormField,
  NavItem,
  NavList,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ChipsInput,
  DateField,
  DateRangeField,
  dayPicks,
  rangePicks,
  DateTimeField,
  Dialog,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DurationField,
  Empty,
  Icon,
  Input,
  Kbd,
  MarkdownBlocks,
  InlineMarkdown,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Shortcut,
  Swatches,
  TAG_COLOR,
  TAG_HUES,
  TAG_PILL,
  Textarea,
  Thumbnail,
  Toasts,
  ToggleGroup,
  ToggleGroupItem,
  TonePresetChoice,
  Tooltip,
  DENSITIES,
  DEFAULT_SHAPE,
  THEME_SHAPES,
  isThemeShape,
  PALETTE_COMBOS,
  applyDensity,
  applyTheme,
  colorTheme,
  isAccentColor,
  isSpotKind,
  isDensityId,
  markHueAttrs,
  paletteTheme,
  presetTone,
  tonePresetOf,
  useMotion,
  type AttachmentView,
  type DateRange,
  type DensityId,
  type SpotKind,
  type ThemeDef,
  type ThemeScheme,
  type ThemeShape,
  type ThemeTone,
  type ToastItem,
} from '../src/index'

/* ———— The address ———— */

const params = new URLSearchParams(location.search)
const OPEN = new Set((params.get('open') ?? '').split(',').filter(Boolean))

/** The base colours of the showcase's palettes: six of the toolkit's free colours, far apart in hue. */
const SEEDS = COLORS.filter((_, i) => i % 3 === 1)

/**
 * The themes of the showcase, made only of what the toolkit has: its gray baseline, and for each base colour the three
 * palettes the toolkit builds from it. The id is what the address carries (`base`, `blue-clean`, `amber-bold`…).
 */
const THEMES: readonly ThemeDef[] = [
  BASE_THEME,
  ...SEEDS.flatMap((seed) =>
    PALETTE_COMBOS.map((combo) => ({ ...paletteTheme({ seed, combo }), id: `${COLOR_NAMES[seed].toLowerCase()}-${combo}`, label: `${COLOR_NAMES[seed]}, ${combo}` })),
  ),
]
type ThemeId = string
const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value)
const themeById = (id: ThemeId): ThemeDef => THEMES.find((t) => t.id === id) ?? BASE_THEME
/**
 * The theme made in the showcase from two colours ("Match colours"): `?theme=yours&color=00857a&spot=balanced`, where
 * the spot is one of the three proposals, a colour, or `none`.
 */
const YOURS = 'yours'
type Spot = SpotKind | string | null
const hexParam = (name: string) => {
  const value = `#${params.get(name) ?? ''}`
  return isAccentColor(value) ? value.toLowerCase() : null
}
const givenSpot = params.get('spot')
const initialColor = hexParam('color') ?? SEEDS[0]!
const initialSpot: Spot = givenSpot === 'none' ? null : isSpotKind(givenSpot) ? givenSpot : (hexParam('spot') ?? 'balanced')
/** The colours are the ones chosen: the engine's tone does not move them. */
const AS_CHOSEN: ThemeTone = { intensity: 'theme', light: 'theme' }
const initialTheme: ThemeId = params.get('theme') === YOURS ? YOURS : isThemeId(params.get('theme')) ? (params.get('theme') as ThemeId) : BASE_THEME.id
const initialScheme: ThemeScheme = params.get('scheme') === 'dark' ? 'dark' : 'light'
/** `?density=compact|normal|large`: one of the toolkit's presets; anything else is `normal`. */
const givenDensity = params.get('density')
const initialDensity: DensityId = isDensityId(givenDensity) ? givenDensity : 'normal'

/** The palettes of the strip: three accents far apart, each in light and dark. */
const STRIP: ThemeId[] = [BASE_THEME.id, 'blue-clean', 'amber-bold']

/* ———— Layout helpers ———— */

type State = 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'invalid'
const STATES: State[] = ['default', 'hover', 'active', 'focus', 'disabled']

/**
 * Puts `data-force` (and any other attribute) on the element it wraps, or on the descendants that match `selector`:
 * for parts the showcase cannot pass props to (the button of a select, an item inside an open menu).
 */
function Forced({ state, attrs, selector, children }: { state?: string | undefined; attrs?: Record<string, string> | undefined; selector?: string | undefined; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const targets = selector ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : root.firstElementChild ? [root.firstElementChild as HTMLElement] : []
    for (const t of targets) {
      if (state && state !== 'default') t.setAttribute('data-force', state)
      for (const [k, v] of Object.entries(attrs ?? {})) t.setAttribute(k, v)
    }
  })
  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  )
}

/** The props of a control in a state: `data-force` for the pointer and focus states, `disabled`, `aria-invalid`. */
function stateProps(state: State): Record<string, unknown> {
  if (state === 'disabled') return { disabled: true }
  if (state === 'invalid') return { 'aria-invalid': true }
  if (state === 'default') return {}
  return { 'data-force': state }
}

function Section({ id, title, note, children }: { id: string; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} data-showcase={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line py-8">
      <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
        {title}
      </h2>
      {note ? <p className="mt-1 max-w-3xl text-sm text-ink-soft">{note}</p> : null}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-[8rem_1fr] md:gap-4">
      <div className="text-2xs font-medium text-ink-mute md:pt-2">{label}</div>
      <div className="flex min-w-0 flex-wrap items-start gap-4">{children}</div>
    </div>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-cell={label} className="flex max-w-full min-w-0 flex-col items-start gap-2">
      {children}
      <span className="text-2xs text-ink-mute">{label}</span>
    </div>
  )
}

/* ———— The index ———— */

/** Where a section's title must have passed, from the top of the window, for the section to be the one being read. */
const READING_LINE = 96

/**
 * The index at the side: one row per section, read from the page itself so it cannot fall behind it, with a field
 * that filters the rows by name (Enter goes to the first). The row of the section being read is the current one.
 */
function Index() {
  const [sections, setSections] = React.useState<{ id: string; title: string }[]>([])
  const [current, setCurrent] = React.useState('')
  const [query, setQuery] = React.useState('')
  React.useEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('section[data-showcase]'))
    setSections(found.map((s) => ({ id: s.id, title: s.querySelector('h2')?.textContent ?? s.id })))
    // The sections did not exist when the browser looked for the address's anchor.
    const asked = () => document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (location.hash) asked()?.scrollIntoView()
    let frame = 0
    const read = () => {
      frame = 0
      const passed = found.filter((s) => s.getBoundingClientRect().top <= READING_LINE)
      let now = passed[passed.length - 1] ?? found[0]
      // At the end of the page the last sections never reach the line: the one asked for, if in view, else the last.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        const target = location.hash ? asked() : null
        const inView = target && found.includes(target) && target.getBoundingClientRect().top < window.innerHeight && target.getBoundingClientRect().top > READING_LINE
        now = inView ? target : found[found.length - 1]
      }
      setCurrent(now?.id ?? '')
    }
    const later = () => {
      frame ||= requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    window.addEventListener('hashchange', later)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
      window.removeEventListener('hashchange', later)
    }
  }, [])
  const wanted = query.trim().toLowerCase()
  const shown = sections.filter((s) => s.title.toLowerCase().includes(wanted))
  return (
    <aside data-showcase-index="" className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-3 self-start overflow-y-auto border-e border-line p-3 lg:flex">
      <SearchField
        aria-label="Find a section"
        placeholder="Find a section"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && shown[0]) location.hash = shown[0].id
        }}
      />
      <NavList aria-label="Sections">
        {shown.map((s) => (
          <NavItem key={s.id} href={`#${s.id}`} title={s.title} current={current === s.id}>
            {s.title}
          </NavItem>
        ))}
      </NavList>
      {shown.length === 0 ? <p className="px-(--row-pad) text-sm text-ink-mute">No section has that name.</p> : null}
    </aside>
  )
}

/* ———— Sample data ———— */

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const ATTACHMENTS: AttachmentView<string>[] = [
  { id: 'a1', kind: 'file', title: 'Quarterly report.pdf', detail: '2.4 MB', href: null, state: 'ready', open: 'open-a1', remove: 'remove-a1', thumbnail: true },
  { id: 'a2', kind: 'link', title: 'Layout ideas', detail: null, href: 'https://example.com/layout', state: 'ready', open: 'open-a2', remove: 'remove-a2' },
  { id: 'a3', kind: 'email', title: 'Re: contract renewal', detail: 'Marco Rossi', href: null, state: 'arriving', open: null, remove: 'remove-a3' },
  { id: 'a4', kind: 'file', title: 'Site survey.mov', detail: '212 MB', href: null, state: 'overLimit', open: null, remove: 'remove-a4' },
]

const TOASTS: ToastItem[] = [
  { id: 't1', text: 'Moved to Archive', undo: { hint: 'Z', onClick: () => {} } },
  {
    id: 't2',
    text: 'Reminder set',
    actions: [
      { label: 'When', items: [{ id: 'today', label: 'Today', pressed: true, onClick: () => {} }, { id: 'tomorrow', label: 'Tomorrow', onClick: () => {} }, { id: 'week', label: 'In a week', onClick: () => {} }] },
    ],
  },
  { id: 't3', text: 'Item deleted', undo: { onClick: () => {} } },
  { id: 't4', text: 'Could not reach the server', kind: 'error' },
]

const MARKDOWN = `**Before the call**

- Check the *contract* number
- Ask about the \`meter\` reading
- [x] Find last year's bill
- [ ] Write down the questions

> The office opens at 9.

1. Call
2. Write to [Marco](https://example.com)`

const SELECT_OPTIONS = [
  { value: 'drafts', label: 'Drafts' },
  { value: 'shared', label: 'Shared' },
  { value: 'archive', label: 'Archive' },
]
const SELECT_GROUPS = [
  { label: 'Personal', options: [{ value: 'travel', label: 'Travel', color: COLORS[10] as string }, { value: 'contracts', label: 'Contracts', color: COLORS[4] as string }] },
  { label: 'Team', options: [{ value: 'reports', label: 'Reports', color: COLORS[7] as string }] },
]

/* ———— Sections ———— */

function Tokens() {
  const swatch = (name: string, cls: string) => (
    <Cell key={name} label={name}>
      <span data-token={name} className={`block size-10 rounded-md shadow-xs ${cls}`} />
    </Cell>
  )
  return (
    <Section id="tokens" title="Tokens" note="The colours are the theme engine's, for the theme and scheme chosen above; the type, corners and elevation are theme.css's.">
      <Row label="Surfaces">
        {swatch('paper', 'bg-paper')}
        {swatch('paper-2', 'bg-paper-2')}
        {swatch('raised', 'bg-raised')}
        {swatch('sidebar-paper', 'bg-sidebar-paper')}
        {swatch('selected', 'bg-selected')}
        {swatch('accent-soft', 'bg-accent-soft')}
      </Row>
      <Row label="Ink and lines">
        {swatch('ink', 'bg-ink')}
        {swatch('ink-soft', 'bg-ink-soft')}
        {swatch('ink-mute', 'bg-ink-mute')}
        {swatch('line', 'bg-line')}
        {swatch('input', 'bg-input')}
        {swatch('ring', 'bg-ring')}
      </Row>
      <Row label="Accent and red">
        {swatch('accent', 'bg-accent')}
        {swatch('primary', 'bg-primary')}
        {swatch('accent-hover', 'bg-accent-hover')}
        {swatch('selected-ink', 'bg-selected-ink')}
        {swatch('destructive', 'bg-destructive')}
        {swatch('destructive-soft', 'bg-destructive-soft')}
      </Row>
      <Row label="Text sizes">
        <span data-text="2xs" className="text-2xs">12px label</span>
        <span data-text="xs" className="text-xs">13px date</span>
        <span data-text="sm" className="text-sm">14px text</span>
        <span data-text="base" className="text-base">16px title</span>
        <span data-text="lg" className="text-lg font-semibold">18px card title</span>
        <span data-text="xl" className="text-xl font-semibold">20px section title</span>
        <span data-text="2xl" className="text-2xl font-semibold">24px page title</span>
      </Row>
      <Row label="Ink levels">
        <span className="text-sm text-ink">ink</span>
        <span className="text-sm text-ink-soft">ink-soft</span>
        <span className="text-sm text-ink-mute">ink-mute</span>
        <span className="text-sm text-accent">accent text</span>
        <span className="text-sm text-destructive">destructive</span>
      </Row>
      <Row label="Corners">
        {(['sm', 'md', 'lg'] as const).map((r) => (
          <Cell key={r} label={`rounded-${r}`}>
            <span data-radius={r} className={`block size-10 border border-input ${r === 'sm' ? 'rounded-sm' : r === 'md' ? 'rounded-md' : 'rounded-lg'}`} />
          </Cell>
        ))}
      </Row>
      <Row label="Elevation">
        {(['xs', 'sm', 'md', 'lg', 'float'] as const).map((s) => (
          <Cell key={s} label={`shadow-${s}`}>
            <span data-shadow={s} className={`block size-12 rounded-lg bg-raised ${{ xs: 'shadow-xs', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', float: 'shadow-float' }[s]}`} />
          </Cell>
        ))}
      </Row>
      <Row label="Data colours">
        {COLORS.map((c) => (
          <span key={c} title={COLOR_NAMES[c]} {...markHueAttrs(c)} data-mark-dot="" className="size-2 rounded-full bg-(--mark-dot)" />
        ))}
      </Row>
    </Section>
  )
}

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
const SIZES = ['xs', 'sm', 'default', 'lg'] as const
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const

/** A button that waits two seconds after a click: `loading`, with the caller's `loadingText`. */
function SaveDemo() {
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (!busy) return
    const t = setTimeout(() => setBusy(false), 2000)
    return () => clearTimeout(t)
  }, [busy])
  return (
    <Button loading={busy} loadingText="Saving…" onClick={() => setBusy(true)} data-sample="button-loading-demo">
      Save changes
    </Button>
  )
}

function Buttons({ animated }: { animated: boolean }) {
  return (
    <Section id="button" title="Button" note="Six variants in five states; loading (the size stays, busy and aria-disabled, no spinner); four text sizes and four square icon sizes; an icon and a key hint inside.">
      {VARIANTS.map((variant) => (
        <Row key={variant} label={variant}>
          {STATES.map((state) => (
            <Cell key={state} label={state}>
              <Button variant={variant} animated={animated} data-sample={`button-${variant}-${state}`} {...stateProps(state)}>
                {variant === 'destructive' ? 'Delete' : 'Save changes'}
              </Button>
            </Cell>
          ))}
        </Row>
      ))}
      <Row label="loading">
        <Cell label="label kept">
          <Button loading data-sample="button-loading">
            Save changes
          </Button>
        </Cell>
        <Cell label="loadingText">
          <Button loading loadingText="Saving…" data-sample="button-loading-text">
            Save changes
          </Button>
        </Cell>
        <Cell label="outline, loadingText">
          <Button variant="outline" loading loadingText="Sending…" data-sample="button-loading-outline">
            Send
          </Button>
        </Cell>
        <Cell label="secondary, loadingText">
          <Button variant="secondary" loading loadingText="Refreshing…" data-sample="button-loading-secondary">
            Refresh
          </Button>
        </Cell>
        <Cell label="click: 2 s busy">
          <SaveDemo />
        </Cell>
      </Row>
      <Row label="sizes">
        {SIZES.map((size) => (
          <Cell key={size} label={size}>
            <Button size={size} variant="outline" data-sample={`button-size-${size}`}>
              Button
            </Button>
          </Cell>
        ))}
        {ICON_SIZES.map((size) => (
          <Cell key={size} label={size}>
            <Button size={size} variant="ghost" aria-label="Settings" data-sample={`button-size-${size}`}>
              <Settings aria-hidden="true" />
            </Button>
          </Cell>
        ))}
      </Row>
      <Row label="content">
        <Cell label="icon">
          <Button variant="outline">
            <Plus aria-hidden="true" />
            New item
          </Button>
        </Cell>
        <Cell label="key hint">
          <Button>
            Looks good
            <Kbd>Enter</Kbd>
          </Button>
        </Cell>
        <Cell label="key hint, outline">
          <Button variant="outline">
            Skip
            <Kbd>S</Kbd>
          </Button>
        </Cell>
        <Cell label="as a link">
          <Button asChild variant="link">
            <a href="#button">Read the guide</a>
          </Button>
        </Cell>
      </Row>
    </Section>
  )
}

function Badges() {
  const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
  return (
    <Section id="badge" title="Badge" note="Six variants; as a link it has a hover state.">
      <Row label="variants">
        {variants.map((variant) => (
          <Cell key={variant} label={variant}>
            <Badge variant={variant} data-sample={`badge-${variant}`}>
              Label 12
            </Badge>
          </Cell>
        ))}
      </Row>
      <Row label="as a link, hover">
        {variants.map((variant) => (
          <Cell key={variant} label={variant}>
            <Badge asChild variant={variant}>
              <a href="#badge" data-force="hover">
                Label
              </a>
            </Badge>
          </Cell>
        ))}
      </Row>
    </Section>
  )
}

function Fields() {
  const fieldStates: State[] = ['default', 'hover', 'focus', 'disabled', 'invalid']
  return (
    <Section id="input" title="Input and Textarea" note="Empty with a placeholder, filled, under the pointer, focused, disabled, invalid.">
      <Row label="Input">
        <Cell label="placeholder">
          <Input aria-label="Sample empty" placeholder="Search by name" className="w-56" data-sample="input-placeholder" />
        </Cell>
        {fieldStates.map((state) => (
          <Cell key={state} label={state}>
            <Input aria-label={`Sample ${state}`} defaultValue="Quarterly report" className="w-56" data-sample={`input-${state}`} {...stateProps(state)} />
          </Cell>
        ))}
      </Row>
      <Row label="Input types">
        <Cell label="time">
          <Input aria-label="Sample time" type="time" defaultValue="09:00" className="w-32" />
        </Cell>
        <Cell label="number">
          <Input aria-label="Sample number" type="number" defaultValue={2} className="w-20" />
        </Cell>
        <Cell label="file">
          <Input aria-label="Sample file" type="file" className="w-72" />
        </Cell>
      </Row>
      <Row label="Textarea">
        <Cell label="placeholder">
          <Textarea aria-label="Sample empty note" placeholder="What's on your mind?" className="w-64" data-sample="textarea-placeholder" />
        </Cell>
        {fieldStates.map((state) => (
          <Cell key={state} label={state}>
            <Textarea aria-label={`Sample note ${state}`} defaultValue="Ask the supplier to move the delivery" className="w-64" data-sample={`textarea-${state}`} {...stateProps(state)} />
          </Cell>
        ))}
      </Row>
    </Section>
  )
}

function Switches({ animated }: { animated: boolean }) {
  const [sync, setSync] = React.useState(true)
  return (
    <Section id="switch" title="Switch" note="An on/off setting that takes effect at once. The track is the control border colour when off and the accent when on; the thumb slides only with animations.">
      <Row label="states">
        <Cell label="off">
          <Switch aria-label="Sample off" animated={animated} />
        </Cell>
        <Cell label="on">
          <Switch aria-label="Sample on" defaultChecked animated={animated} />
        </Cell>
        <Cell label="disabled">
          <Switch aria-label="Sample disabled" disabled />
        </Cell>
        <Cell label="disabled on">
          <Switch aria-label="Sample disabled on" disabled defaultChecked />
        </Cell>
        <Cell label="invalid">
          <Switch aria-label="Sample invalid" invalid />
        </Cell>
      </Row>
      <Row label="with a label">
        <Switch checked={sync} onCheckedChange={setSync} animated={animated}>
          Sync on this device
        </Switch>
      </Row>
    </Section>
  )
}

function TabSets({ animated }: { animated: boolean }) {
  const [tab, setTab] = React.useState('general')
  return (
    <Section id="tabs" title="Tabs" note="Panels of one view. The chosen tab takes the selection tint, never a bar (R1). Arrows move and choose; a disabled tab is skipped.">
      <Row label="with panels">
        <Tabs value={tab} onValueChange={setTab} animated={animated} className="w-96">
          <TabsList aria-label="Sample settings">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="later" disabled>
              Later
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <p className="text-sm text-ink-soft">The general settings.</p>
          </TabsContent>
          <TabsContent value="accounts">
            <p className="text-sm text-ink-soft">The accounts.</p>
          </TabsContent>
          <TabsContent value="advanced">
            <p className="text-sm text-ink-soft">The advanced settings.</p>
          </TabsContent>
        </Tabs>
      </Row>
    </Section>
  )
}

function FormFields() {
  return (
    <Section id="form-field" title="FormField" note="A label, one control and a sentence under it: a helper, or the error that takes its place and is announced.">
      <Row label="states">
        <FormField label="Name" help="As it appears on your messages." className="w-64">
          <Input defaultValue="Ada Lovelace" />
        </FormField>
        <FormField label="Address" help="Your work address." error="Write an address with an @." required className="w-64">
          <Input defaultValue="ada.example.com" />
        </FormField>
        <FormField label="Density" className="w-48">
          <Select options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }]} value="normal" onValueChange={() => {}} />
        </FormField>
      </Row>
    </Section>
  )
}

/** The sidebar in a frame, as an app would hold it: wide or a rail on a wide window, a drawer behind «Menu» on a narrow one. */
function SidebarSample({ animated }: { animated: boolean }) {
  const [place, setPlace] = React.useState('all')
  const [collapsed, setCollapsed] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const row = (id: string, icon: React.ComponentProps<typeof Icon>['name'], label: string, count?: number) => (
    <NavItem key={id} current={place === id} onClick={() => setPlace(id)} icon={<Icon name={icon} />} end={count === undefined ? undefined : <Count value={count} label="items" reserve />}>
      {label}
    </NavItem>
  )
  return (
    <Section id="sidebar" title="Sidebar" note="The navigation as groups of rows on the sidebar surface. The button at the foot shrinks it to a rail of icons, each with its name as a hint; a group with an arrow opens and closes; the search box hides the rows that do not hold the text. Below 860px it is a drawer: «Menu» opens it and choosing a row closes it.">
      <Row label="in an app">
        <div data-sample="sidebar" className="flex h-112 w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-paper">
          <Sidebar
            aria-label="Sample app"
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            open={open}
            onOpenChange={setOpen}
            search
            animated={animated}
            header={<p className="px-(--row-pad) py-1 text-sm font-semibold text-sidebar-ink">Sample app</p>}
            footer={
              <div className="flex items-center gap-2 px-(--row-pad) py-1 text-sm text-sidebar-ink">
                <Avatar name="Ada Lovelace" size="xs" decorative />
                Ada Lovelace
              </div>
            }
          >
            <SidebarGroup label="Favorites" icon={<Icon name="tag" />}>
              {row('all', 'all', 'All', 3)}
              {row('notifications', 'notifications', 'Notifications', 12)}
            </SidebarGroup>
            <SidebarGroup label="Look" icon={<Icon name="appearance" />} collapsible>
              {row('colors', 'colors', 'Colors')}
              {row('layout', 'layout', 'Layout')}
              {row('font', 'font', 'Font')}
            </SidebarGroup>
            <SidebarGroup label="Account" icon={<Icon name="account" />} collapsible defaultOpen={false}>
              {row('account', 'account', 'Profile')}
              {row('settings', 'settings', 'Settings')}
            </SidebarGroup>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <Button variant="outline" size="sm" className="self-start md:hidden" data-sample="sidebar-open" onClick={() => setOpen(true)}>
              Menu
            </Button>
            <p className="text-base font-semibold text-ink">{place}</p>
            <p className="text-sm text-ink-soft">The page of the place chosen in the sidebar.</p>
          </div>
        </div>
      </Row>
    </Section>
  )
}

/** The bar of a window in a frame, as a host without a frame of its own would show it, and the same bar on a web page. */
function Toolbars({ animated }: { animated: boolean }) {
  const [text, setText] = React.useState('')
  const [filter, setFilter] = React.useState(true)
  const [panel, setPanel] = React.useState(false)
  const [maximized, setMaximized] = React.useState(false)
  const [said, setSaid] = React.useState('Nothing pressed yet.')
  const bar = (name: string) => (
    <Toolbar aria-label={name}>
      <ToolbarButton label="Show the sidebar" icon={<PanelLeft aria-hidden="true" />} pressed={panel} onClick={() => setPanel(!panel)} animated={animated} />
      <ToolbarTitle>Inbox</ToolbarTitle>
      <ToolbarSpacer />
      <ToolbarSearch label="Search the mail" shortcut="Ctrl K" value={text} onValueChange={setText} animated={animated} />
      <ToolbarGroup aria-label="View">
        <ToolbarButton label="Filter" icon={<ListFilter aria-hidden="true" />} pressed={filter} onClick={() => setFilter(!filter)} animated={animated} />
        <ToolbarButton label="Sort" icon={<ArrowDownUp aria-hidden="true" />} onClick={() => setSaid('Sort')} animated={animated} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton label="Reply" shortcut="R" icon={<Reply aria-hidden="true" />} onClick={() => setSaid('Reply')} animated={animated} />
      <ToolbarButton label="Archive" shortcut="E" icon={<Archive aria-hidden="true" />} onClick={() => setSaid('Archive')} animated={animated} />
      <ToolbarButton label="Delete" icon={<Trash2 aria-hidden="true" />} disabled animated={animated} />
      <ToolbarButton label="More actions" icon={<Ellipsis aria-hidden="true" />} onClick={() => setSaid('More actions')} animated={animated} />
      <ToolbarButton label="New message" variant="default" icon={<Plus aria-hidden="true" />} onClick={() => setSaid('New message')}>
        New
      </ToolbarButton>
    </Toolbar>
  )
  const page = (
    <div className="flex flex-col gap-1 p-4">
      <p className="text-sm text-ink">{said}</p>
      <p className="text-sm text-ink-mute">{text === '' ? 'The magnifier opens the search; Esc closes it, and so does leaving it empty.' : `Searching for «${text}».`}</p>
    </div>
  )
  return (
    <Section id="toolbar" title="Toolbar, TitleBar and WindowControls" note="One row of actions and a single Tab stop: the arrows move among the items. A button that shows an icon alone has its name as a hint, with its key; a switch that is on has the selection tint; one item is the solid action (R3). The search takes no room until its magnifier is pressed. In the frame of a window the empty parts of the bar move the window and the three buttons at the end call the app back; on a web page the same bar has neither.">
      <Row label="in a window">
        <div data-sample="title-bar" className="w-full max-w-3xl overflow-hidden rounded-lg bg-paper shadow-lg">
          <TitleBar windowControls={<WindowControls maximized={maximized} onMinimize={() => setSaid('Minimize')} onMaximizeToggle={() => setMaximized(!maximized)} onClose={() => setSaid('Close')} />}>
            {bar('Mail, in a window')}
          </TitleBar>
          {page}
        </div>
      </Row>
      <Row label="on a web page">
        <div data-sample="top-bar" className="w-full max-w-3xl overflow-hidden rounded-lg bg-paper shadow-lg">
          <TitleBar>{bar('Mail, on a page')}</TitleBar>
          {page}
        </div>
      </Row>
      <Row label="narrow">
        <div className="w-80 max-w-full overflow-hidden rounded-lg bg-paper shadow-lg">
          <TitleBar>
            <Toolbar aria-label="Mail, narrow">
              <ToolbarTitle>Inbox</ToolbarTitle>
              <ToolbarSpacer />
              <ToolbarSearch label="Search the mail" value={text} onValueChange={setText} animated={animated} />
              <ToolbarButton label="New message" variant="default" icon={<Plus aria-hidden="true" />} animated={animated} />
            </Toolbar>
          </TitleBar>
        </div>
      </Row>
    </Section>
  )
}

function Navigation() {
  const [place, setPlace] = React.useState('all')
  const rows = [
    { id: 'all', icon: 'all', label: 'All', count: 3 },
    { id: 'notifications', icon: 'notifications', label: 'Notifications', count: 12 },
    { id: 'settings', icon: 'settings', label: 'Settings', count: 0 },
    { id: 'plain', icon: null, label: 'A row without an icon', count: 128 },
  ] as const
  const list = (tone: 'page' | 'sidebar') => (
    <NavList aria-label={`Sample places, ${tone}`} tone={tone} className="w-60">
      {rows.map((row) => (
        <NavItem key={row.id} current={place === row.id} onClick={() => setPlace(row.id)} icon={row.icon ? <Icon name={row.icon} /> : null} end={<Count value={row.count} label="items" reserve />}>
          {row.label}
        </NavItem>
      ))}
    </NavList>
  )
  return (
    <Section id="nav-list" title="NavList and Count" note="Rows of a navigation: an icon slot that stays when empty (R6), the selection tint and a short accent bar on the current row (R1), counts as pills, in the accent on the current row (R5).">
      <Row label="on the page">{list('page')}</Row>
      <Row label="on the sidebar">
        <div className="rounded-lg bg-sidebar-paper p-2">{list('sidebar')}</div>
      </Row>
      <Row label="status colours">
        <span className="rounded-md bg-success-soft px-2 py-1 text-sm text-success">Saved</span>
        <span className="rounded-md bg-warning-soft px-2 py-1 text-sm text-warning">Expires soon</span>
        <span className="text-sm">
          A <mark className="bg-highlight text-ink">match</mark> inside a text
        </span>
      </Row>
    </Section>
  )
}

const PEOPLE = [
  { value: 'ada', label: 'Ada Lovelace', detail: 'ada@example.com' },
  { value: 'alan', label: 'Alan Turing', detail: 'alan@example.com' },
  { value: 'grace', label: 'Grace Hopper', detail: 'grace@example.com' },
  { value: 'linus', label: 'Linus Torvalds', disabled: true },
]

function Pickers() {
  const [zoom, setZoom] = React.useState(40)
  const [query, setQuery] = React.useState('invoice')
  const [person, setPerson] = React.useState<string | null>('ada')
  const [labels, setLabels] = React.useState(['Home'])
  const [panel, setPanel] = React.useState(false)
  return (
    <Section id="pickers" title="Slider, SearchField, Combobox, Avatar" note="A value on a scale; a search box with its clear button; a choice from a list filtered while typing; a person as a neutral round tile.">
      <Row label="slider">
        <div className="flex w-64 flex-col gap-2">
          <Slider aria-label="Sample zoom" value={zoom} min={0} max={100} step={10} onValueChange={setZoom} />
          <span className="text-2xs text-ink-mute tabular-nums">{zoom}</span>
        </div>
        <div className="w-64">
          <Slider aria-label="Sample disabled" value={70} min={0} max={100} onValueChange={() => {}} disabled />
        </div>
      </Row>
      <Row label="search">
        <SearchField aria-label="Sample search" placeholder="Search" value={query} onValueChange={setQuery} className="w-64" />
        <SearchField aria-label="Sample empty search" placeholder="Search" value="" onValueChange={() => {}} className="w-64" />
      </Row>
      <Row label="combobox">
        <FormField label="Assignee" className="w-64">
          <Combobox options={PEOPLE} value={person} onValueChange={setPerson} placeholder="Nobody" />
        </FormField>
        <FormField label="Reviewer" error="Choose a person." className="w-64">
          <Combobox options={PEOPLE} value={null} onValueChange={() => {}} placeholder="Nobody" />
        </FormField>
      </Row>
      <Row label="labels with suggestions">
        <div className="flex w-80 flex-col gap-1.5">
          <label htmlFor="suggested-labels" className="text-sm font-medium">
            Labels
          </label>
          <ChipsInput id="suggested-labels" value={labels} onChange={setLabels} suggestions={['Draft', 'Review', 'Approved', 'Urgent', 'Archived']} placeholder="Add a label" />
        </div>
      </Row>
      <Row label="avatar">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Alan Turing" size="sm" />
        <Avatar name="Grace" size="xs" />
        <Avatar name="Sample picture" src={PIXEL} />
        <div className="flex items-center gap-2">
          <Avatar name="Ada Lovelace" size="xs" decorative />
          <span className="text-sm">Ada Lovelace</span>
        </div>
      </Row>
      <Row label="panel beside the page">
        <Button variant="outline" onClick={() => setPanel(true)}>
          Open a panel
        </Button>
        <Sheet open={panel} onOpenChange={setPanel} modal={false}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>A panel beside the page</SheetTitle>
              <SheetDescription>No backdrop: the page under it scrolls and takes clicks.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Tooltip label="Search" shortcut="Ctrl K">
          <Button variant="outline" size="icon" aria-label="Search">
            <Icon name="all" />
          </Button>
        </Tooltip>
      </Row>
    </Section>
  )
}

function Checkboxes({ animated }: { animated: boolean }) {
  const values = [false, true, 'indeterminate'] as const
  const states: State[] = ['default', 'hover', 'focus', 'disabled', 'invalid']
  return (
    <Section id="checkbox" title="Checkbox" note="Unchecked, checked and indeterminate, in five states; with a label.">
      {values.map((value) => (
        <Row key={String(value)} label={value === 'indeterminate' ? 'indeterminate' : value ? 'checked' : 'unchecked'}>
          {states.map((state) => (
            <Cell key={state} label={state}>
              <Checkbox aria-label={`Sample ${state}`} defaultChecked={value} animated={animated} data-sample={`checkbox-${String(value)}-${state}`} {...stateProps(state)} />
            </Cell>
          ))}
        </Row>
      ))}
      <Row label="with a label">
        <div className="flex items-center gap-2">
          <Checkbox id="cb-label" defaultChecked animated={animated} />
          <label htmlFor="cb-label" className="text-sm">
            Remember this device
          </label>
        </div>
      </Row>
    </Section>
  )
}

function Radios() {
  const [value, setValue] = React.useState('week')
  const [color, setColor] = React.useState<string>(COLORS[10])
  return (
    <Section id="radio" title="RadioGroup and Swatches" note="The radio variant (vertical and horizontal, one focused, one disabled) and the swatch variant (the colour picker).">
      <Row label="vertical">
        <RadioGroup aria-label="Repeat" value={value} onValueChange={setValue}>
          <RadioGroupItem value="day">Every day</RadioGroupItem>
          <RadioGroupItem value="week" data-sample="radio-checked">
            Every week
          </RadioGroupItem>
          <Forced state="focus" selector='[data-slot="radio-group-item"]'>
            <RadioGroupItem value="month" data-sample="radio-focus">
              Every month (focus)
            </RadioGroupItem>
          </Forced>
          <RadioGroupItem value="year" disabled>
            Every year (disabled)
          </RadioGroupItem>
        </RadioGroup>
      </Row>
      <Row label="horizontal">
        <RadioGroup aria-label="Row height" orientation="horizontal" defaultValue="one">
          <RadioGroupItem value="one">One line</RadioGroupItem>
          <RadioGroupItem value="two">Two lines</RadioGroupItem>
        </RadioGroup>
      </Row>
      <Row label="swatches">
        <Swatches value={color} onChange={setColor} />
      </Row>
    </Section>
  )
}

function Toggles({ animated }: { animated: boolean }) {
  const [view, setView] = React.useState('list')
  return (
    <Section id="toggle-group" title="ToggleGroup" note="A single choice: the pressed item is the raised thumb. Hover on an item, focus on an item, a disabled item; with animations the thumb slides.">
      <Row label="states">
        <Cell label="default">
          <ToggleGroup aria-label="View" value={view} onValueChange={setView} animated={animated}>
            <ToggleGroupItem value="list">List</ToggleGroupItem>
            <ToggleGroupItem value="board">Board</ToggleGroupItem>
            <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
          </ToggleGroup>
        </Cell>
        <Cell label="hover on Board">
          <Forced state="hover" selector='[data-slot="toggle-group-item"]:nth-child(2)'>
            <ToggleGroup aria-label="View" value="list" onValueChange={() => {}} className="self-start">
              <ToggleGroupItem value="list">List</ToggleGroupItem>
              <ToggleGroupItem value="board">Board</ToggleGroupItem>
              <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
            </ToggleGroup>
          </Forced>
        </Cell>
        <Cell label="focus on List">
          <Forced state="focus" selector='[data-slot="toggle-group-item"]:first-child'>
            <ToggleGroup aria-label="View" value="list" onValueChange={() => {}} className="self-start">
              <ToggleGroupItem value="list">List</ToggleGroupItem>
              <ToggleGroupItem value="board">Board</ToggleGroupItem>
            </ToggleGroup>
          </Forced>
        </Cell>
        <Cell label="disabled item">
          <ToggleGroup aria-label="Scheme" value="light" onValueChange={() => {}}>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            <ToggleGroupItem value="auto" disabled>
              Auto
            </ToggleGroupItem>
          </ToggleGroup>
        </Cell>
      </Row>
    </Section>
  )
}

function Selects() {
  const [value, setValue] = React.useState('shared')
  const [place, setPlace] = React.useState('travel')
  const states: State[] = ['default', 'hover', 'focus']
  return (
    <Section id="select" title="Select" note="The button in three states, disabled and invalid, the small size, a placeholder, groups with the app's mark. `?open=select` opens the list.">
      <Row label="states">
        {states.map((state) => (
          <Cell key={state} label={state}>
            <Forced state={state} selector='[data-slot="select-trigger"]'>
              <div className="w-56">
                <Select aria-label="View" options={SELECT_OPTIONS} value={value} onValueChange={setValue} />
              </div>
            </Forced>
          </Cell>
        ))}
        <Cell label="disabled">
          <div className="w-56" data-sample="select-disabled">
            <Select aria-label="View" options={SELECT_OPTIONS} value={value} onValueChange={setValue} disabled />
          </div>
        </Cell>
        <Cell label="invalid">
          <div className="w-56" data-sample="select-invalid">
            <Select aria-label="View" options={SELECT_OPTIONS} value="" placeholder="Choose a view" onValueChange={setValue} invalid />
          </div>
        </Cell>
      </Row>
      <Row label="variants">
        <Cell label="sm">
          <Select aria-label="View" size="sm" options={SELECT_OPTIONS} value={value} onValueChange={setValue} />
        </Cell>
        <Cell label="placeholder">
          <div className="w-56">
            <Select aria-label="Folder" options={SELECT_OPTIONS} value="" placeholder="Choose a folder" onValueChange={setValue} />
          </div>
        </Cell>
        <Cell label="groups and marks">
          <div className="w-64" data-open-target="select">
            <Select
              aria-label="Where"
              options={[{ value: 'none', label: 'No folder', color: '' }]}
              groups={SELECT_GROUPS}
              value={place}
              onValueChange={setPlace}
              renderMark={(o) => (o.color ? <span aria-hidden="true" {...markHueAttrs(o.color)} className="size-2 shrink-0 rounded-full bg-(--mark-dot)" /> : <span aria-hidden="true" className="size-2 shrink-0" />)}
            />
          </div>
        </Cell>
      </Row>
    </Section>
  )
}

function Menus({ animated }: { animated: boolean }) {
  const [done, setDone] = React.useState(true)
  const [sort, setSort] = React.useState('date')
  const open = OPEN.has('menu')
  return (
    <Section id="menu" title="DropdownMenu" note="Items, a highlighted one, a destructive one, a disabled one, checkbox and radio items, a label, a separator, key hints and a submenu. `?open=menu` opens it.">
      <Row label="menu">
        <div className={open ? 'min-h-[30rem]' : undefined}>
          <DropdownMenu defaultOpen={open} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64" animated={animated}>
              <DropdownMenuLabel>Item</DropdownMenuLabel>
              <DropdownMenuGroup>
                <Forced attrs={{ 'data-highlighted': '' }}>
                  <DropdownMenuItem data-sample="menu-item-highlighted">
                    Open
                    <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </Forced>
                <DropdownMenuItem data-sample="menu-item">
                  Move to…
                  <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Copy the link</DropdownMenuItem>
                    <DropdownMenuItem>Send by email</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={done} onCheckedChange={setDone}>
                Show hidden
              </DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                <DropdownMenuRadioItem value="date">By date</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">By name</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" data-sample="menu-item-destructive">
                <Trash2 aria-hidden="true" />
                Delete
                <DropdownMenuShortcut>Del</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Row>
    </Section>
  )
}

/** The hover background that glides from row to row, over rows of two heights (with animations only). */
function HoverRows({ animated }: { animated: boolean }) {
  const motion = useMotion(animated)
  const [list, setList] = React.useState<HTMLUListElement | null>(null)
  return (
    <Section id="hover" title="Hover background" note="With animations one background follows the mouse from row to row, also between rows of different heights; without, each row has its own.">
      <Row label="rows">
        <ul ref={setList} data-sample="hover-rows" className="relative flex w-64 flex-col gap-0.5">
          {motion ? <motion.HoverHighlight container={list} selector="[data-hover-row]" className="absolute rounded-md bg-ink/5" /> : null}
          {['Overview', 'Documents', 'Shared with me', 'Quarterly report', 'Archive'].map((name, i) => (
            <li key={name} data-hover-row="" className={`relative flex items-center rounded-md px-2 text-sm ${i === 2 || i === 3 ? 'h-7 pl-6' : 'h-9'} ${motion ? '' : 'hover:bg-ink/5'}`}>
              {name}
            </li>
          ))}
        </ul>
      </Row>
    </Section>
  )
}

function Popovers({ animated }: { animated: boolean }) {
  const open = OPEN.has('popover')
  return (
    <Section id="popover" title="Popover and Tooltip" note="`?open=popover` opens the card; `?open=tooltip` focuses the button with a hint.">
      <Row label="popover">
        <div className={open ? 'min-h-56' : undefined}>
          <Popover defaultOpen={open}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Bell aria-hidden="true" />
                Notifications
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" data-sample="popover" animated={animated}>
              <PopoverHeader>
                <PopoverTitle>3 new comments</PopoverTitle>
                <PopoverDescription>One of them mentions you.</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
      </Row>
      <Row label="tooltip">
        <Tooltip label="Search" animated={animated}>
          <Button variant="ghost" size="icon" aria-label="Search" data-open-target="tooltip">
            <Search aria-hidden="true" />
          </Button>
        </Tooltip>
      </Row>
    </Section>
  )
}

/** The motion an app builds its own lists with (`useMotion()`): none of the toolkit's components use these pieces. */
function MotionPieces({ animated }: { animated: boolean }) {
  const motion = useMotion(animated)
  const next = React.useRef(3)
  const [items, setItems] = React.useState([{ id: 3, fresh: false }, { id: 2, fresh: false }, { id: 1, fresh: false }])
  const [rows, setRows] = React.useState(['Call the dentist', 'Renew the contract', 'Book the survey', 'Send the report'])
  const [open, setOpen] = React.useState(false)
  const [cards, setCards] = React.useState([1])
  // Only the card just placed lands: the ones already there at load, or when Motion arrives, stay still.
  const placed = React.useRef<number | null>(null)
  const land = React.useCallback(
    (el: HTMLLIElement | null) => {
      if (!el || !motion || Number(el.dataset.card) !== placed.current) return
      placed.current = null
      motion.landCard(el)
    },
    [motion],
  )
  const ITEM = 'flex h-9 items-center justify-between gap-2 rounded-md bg-ink/4 pr-1 pl-3 text-sm'
  const item = (id: number) => (
    <>
      <span>Entry {id}</span>
      <Button variant="ghost" size="xs" onClick={() => setItems((now) => now.filter((i) => i.id !== id))}>Remove</Button>
    </>
  )
  const row = (name: string) => (
    <>
      <span>{name}</span>
      <Button variant="ghost" size="xs" onClick={() => setRows((now) => now.filter((r) => r !== name))}>Done</Button>
    </>
  )
  const chevron = <ChevronRight className="size-4" aria-hidden />
  return (
    <Section id="motion-pieces" title="List, row, arrow and card motion" note="The pieces an app animates its own lists with, from `useMotion()`. With animations: a new entry comes down into its place while the others make room, and a removed one fades while they close up; a completed row fades and closes up in height; the arrow of a group turns a quarter; a card placed in a column comes down a little. Without, each change is immediate.">
      <Row label="list item">
        <div className="flex w-64 max-w-full flex-col items-start gap-2">
          <Button variant="outline" size="sm" data-sample="list-add" onClick={() => {
            const id = (next.current += 1)
            setItems((now) => [{ id, fresh: true }, ...now])
          }}>Add on top</Button>
          <ul data-sample="list-items" className="flex w-full flex-col gap-1">
            {motion ? (
              <motion.Presence pop>
                {items.map((i) => (
                  <motion.ListItem key={i.id} enter={i.fresh} className={ITEM}>{() => item(i.id)}</motion.ListItem>
                ))}
              </motion.Presence>
            ) : items.map((i) => <li key={i.id} className={ITEM}>{item(i.id)}</li>)}
          </ul>
        </div>
      </Row>
      <Row label="row exit">
        <div className="flex w-64 max-w-full flex-col items-start gap-2">
          <ul data-sample="row-exit" className="flex w-full flex-col">
            {motion ? (
              <motion.Presence>
                {rows.map((name) => (
                  <motion.m.li key={name} {...motion.ROW_EXIT} className={`${ITEM} mb-1 overflow-hidden`}>{row(name)}</motion.m.li>
                ))}
              </motion.Presence>
            ) : rows.map((name) => <li key={name} className={`${ITEM} mb-1`}>{row(name)}</li>)}
          </ul>
          <Button variant="ghost" size="sm" onClick={() => setRows(['Call the dentist', 'Renew the contract', 'Book the survey', 'Send the report'])}>Put the rows back</Button>
        </div>
      </Row>
      <Row label="arrow">
        <div className="flex w-64 max-w-full flex-col items-start gap-1">
          <Button variant="ghost" data-sample="turn" aria-expanded={open} onClick={() => setOpen((now) => !now)}>
            {motion ? <motion.Turn open={open}>{chevron}</motion.Turn> : <span aria-hidden="true" className={`inline-flex ${open ? 'rotate-90' : ''}`}>{chevron}</span>}
            Kitchen renovation
          </Button>
          {open ? <p className="pl-9 text-sm text-ink-soft">Three tasks in this group.</p> : null}
        </div>
      </Row>
      <Row label="card landing">
        <div className="flex w-64 max-w-full flex-col items-start gap-2">
          <Button variant="outline" size="sm" data-sample="card-add" onClick={() => setCards((now) => [(placed.current = (now[0] ?? 0) + 1), ...now].slice(0, 4))}>Place a card</Button>
          <ul className="flex w-full flex-col gap-2 rounded-lg bg-paper-2 p-2">
            {cards.map((n) => (
              <li key={n} ref={land} data-card={n} className="rounded-md bg-raised px-3 py-2 text-sm shadow-xs">Card {n}</li>
            ))}
          </ul>
        </div>
      </Row>
    </Section>
  )
}

function Keys() {
  return (
    <Section id="kbd" title="Kbd and Shortcut" note="A key hint in three sizes, a combination, and in context.">
      <Row label="Kbd">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Cell key={size} label={size}>
            <Kbd size={size} data-sample={`kbd-${size}`}>
              Ctrl K
            </Kbd>
          </Cell>
        ))}
      </Row>
      <Row label="Shortcut">
        <Cell label="held together">
          <Shortcut keys={['Ctrl', 'Enter']} />
        </Cell>
        <Cell label="one after the other">
          <Shortcut keys={['G', 'T']} separator="then" />
        </Cell>
      </Row>
      <Row label="in a line">
        <p className="text-sm text-ink-soft">
          Press <Kbd>N</Kbd> to add an item, <Kbd>Z</Kbd> to undo.
        </p>
      </Row>
    </Section>
  )
}

function Empties() {
  return (
    <Section id="empty" title="Empty" note="A title alone; a title, a sentence and an action; with the optional icon.">
      <Row label="variants">
        <Cell label="title">
          <Empty title="Nothing for today" className="w-72 rounded-lg border border-line p-6" />
        </Cell>
        <Cell label="sentence and action">
          <Empty title="Nothing here yet" description="Items you move to this folder appear here." action={<Button variant="outline">New item</Button>} className="w-72 rounded-lg border border-line p-6" />
        </Cell>
        <Cell label="icon">
          <Empty icon={<Inbox />} title="No new messages" description="You have read everything." className="w-72 rounded-lg border border-line p-6" data-sample="empty-icon" />
        </Cell>
      </Row>
    </Section>
  )
}

function Dates({ animated }: { animated: boolean }) {
  const [day, setDay] = React.useState<string | null>('2026-11-20')
  const [reminder, setReminder] = React.useState<string | null>('2026-11-21T09:30')
  const [none, setNone] = React.useState<string | null>(null)
  const [quick, setQuick] = React.useState<string | null>(null)
  const [stay, setStay] = React.useState<DateRange | null>({ start: '2026-11-20', end: '2026-11-24' })
  // The quick choices are counted from the device's own day, once.
  const [days] = React.useState(() => dayPicks())
  const [ranges] = React.useState(() => rangePicks())
  return (
    <Section id="date" title="Calendar, DateField, DateTimeField and DateRangeField" note="The calendar inline (today and a chosen day), the fields closed. Quick choices set a day, or a range, with one press. A range takes two presses: the days between the two ends have the selection tint. `?open=date`, `?open=datetime` and `?open=range` open their cards.">
      <Row label="calendar">
        <DatePicker.Root inline locale="en-US" startOfWeek={1} fixedWeeks defaultValue={[parseDate('2026-11-24')]} defaultFocusedValue={parseDate('2026-11-24')} translations={CALENDAR_WORDS} className="w-fit rounded-lg bg-raised shadow-lg">
          <Calendar />
        </DatePicker.Root>
      </Row>
      <Row label="fields">
        <Cell label="DateField">
          <div className="w-64" data-open-target="date">
            <DateField value={day} onChange={setDay} animated={animated} />
          </div>
        </Cell>
        <Cell label="DateField, empty">
          <div className="w-64">
            <DateField value={none} onChange={setNone} />
          </div>
        </Cell>
        <Cell label="DateTimeField">
          <div className="w-64" data-open-target="datetime">
            <DateTimeField value={reminder} onChange={setReminder} animated={animated} />
          </div>
        </Cell>
      </Row>
      <Row label="quick choices, range">
        <Cell label="DateField, quick choices">
          <div className="w-64" data-open-target="date-picks">
            <DateField value={quick} onChange={setQuick} animated={animated} picks={days} />
          </div>
        </Cell>
        <Cell label="DateRangeField, quick choices">
          <div className="w-64" data-open-target="range">
            <DateRangeField value={stay} onChange={setStay} animated={animated} picks={ranges} />
          </div>
        </Cell>
      </Row>
    </Section>
  )
}

/** People for the recipients sample: the address is the value, the name is what a chip shows. */
const ADDRESS_BOOK: Record<string, string> = {
  'ada@example.com': 'Ada Lovelace',
  'alan@example.com': 'Alan Turing',
  'grace@example.com': 'Grace Hopper',
  'margaret@example.com': 'Margaret Hamilton',
}
const nameOf = (address: string) => ADDRESS_BOOK[address] ?? address
const notAnAddress = (value: string) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
const ADDRESS_SEPARATORS = [',', ';', ' '] as const

function OtherFields() {
  const [labels, setLabels] = React.useState(['home', 'marco', 'office'])
  const [to, setTo] = React.useState(['ada@example.com', 'alan@example.com', 'luca@example'])
  const [duration, setDuration] = React.useState<{ hours: number; minutes: number } | null>({ hours: 0, minutes: 30 })
  return (
    <Section id="fields" title="ChipsInput and DurationField" note="Labels as chips, at rest and focused. As recipients: a chip shows a person's name in place of the address, one that is not an address has the destructive chip, a comma, a semicolon or a space closes one, the chips have no dot, and a suggestion shows the name with the address after it. Hours and minutes with four shortcuts.">
      <Row label="ChipsInput">
        <Cell label="default">
          <div className="w-80">
            <label htmlFor="chips-a" className="sr-only">Sample labels</label>
            <ChipsInput id="chips-a" value={labels} onChange={setLabels} placeholder="Add a label" />
          </div>
        </Cell>
        <Cell label="focus">
          <Forced state="focus" selector='[data-part="control"]'>
            <div className="w-80">
              <label htmlFor="chips-b" className="sr-only">Sample labels, focused</label>
            <ChipsInput id="chips-b" value={labels} onChange={setLabels} placeholder="Add a label" />
            </div>
          </Forced>
        </Cell>
      </Row>
      <Row label="ChipsInput, recipients">
        <Cell label="display, invalid, separators, no dot">
          <div className="w-96 max-w-full" data-sample="recipients">
            <label htmlFor="chips-to" className="sr-only">Sample recipients</label>
            <ChipsInput id="chips-to" value={to} onChange={setTo} placeholder="Add a person" display={nameOf} invalid={notAnAddress} separators={ADDRESS_SEPARATORS} dot={false} suggestions={Object.keys(ADDRESS_BOOK)} />
          </div>
        </Cell>
      </Row>
      <Row label="DurationField">
        <DurationField value={duration} onChange={setDuration} />
      </Row>
    </Section>
  )
}

function Files() {
  const [list, setList] = React.useState(ATTACHMENTS)
  return (
    <Section id="attachments" title="AttachmentsSection, AttachmentMarks and Thumbnail" note="Attachments ready, arriving and over the limit; the drop zone; the marks of a row; the thumbnail in its two sizes.">
      <Row label="section">
        <div className="w-[28rem]">
          <AttachmentsSection<string>
            attachments={list}
            onAction={(a) => {
              if (a.startsWith('remove-')) setList((l) => l.filter((x) => `remove-${x.id}` !== a))
            }}
            onAttach={() => {}}
            maxFileBytes={50 * 1024 * 1024}
            thumbnails={{ a1: null }}
            onNeedThumbnail={undefined}
          />
        </div>
      </Row>
      <Row label="marks">
        <Cell label="one kind">
          <AttachmentMarks kinds={['file']} count={1} />
        </Cell>
        <Cell label="several kinds">
          <AttachmentMarks kinds={['file', 'link', 'email']} count={3} />
        </Cell>
      </Row>
      <Row label="thumbnail">
        <Cell label="sheet, image">
          <Thumbnail src={PIXEL} kind="file" size="sheet" label="file" />
        </Cell>
        <Cell label="sheet, waiting">
          <Thumbnail src={null} kind="file" size="sheet" label="file" />
        </Cell>
        <Cell label="row, waiting">
          <Thumbnail src={null} kind="link" size="row" label="link" />
        </Cell>
      </Row>
    </Section>
  )
}

function Content() {
  return (
    <Section id="markdown" title="Markdown and label colours" note="Notes as Markdown; a title with inline Markdown; the labels' colour pairs.">
      <Row label="blocks">
        <div className="w-96">
          <MarkdownBlocks text={MARKDOWN} />
        </div>
      </Row>
      <Row label="inline">
        <p className="text-sm">
          <InlineMarkdown text="Ask **the supplier** about the `invoice`" />
        </p>
      </Row>
      <Row label="label colours">
        {Array.from({ length: TAG_HUES }, (_, i) => (
          <span key={i} data-tag-hue={i + 1} data-sample={`tag-${i + 1}`} className={`inline-flex h-7 items-center text-xs ${TAG_PILL} ${TAG_COLOR}`}>
            label {i + 1}
          </span>
        ))}
      </Row>
    </Section>
  )
}

const LIVE_TEXTS = ['Moved to Today', 'Task completed', 'Added to the stack', 'Label removed']

function Notices({ animated }: { animated: boolean }) {
  const [live, setLive] = React.useState<{ id: string; text: string; kind?: 'error' }[]>([])
  const count = React.useRef(0)
  const remove = React.useCallback((id: string) => setLive((now) => now.filter((item) => item.id !== id)), [])
  return (
    <Section id="toasts" title="Toasts" note="The column, inline: an undo with its key, quick choices with one pressed, a plain undo; then with the seconds left and the close button. Live: each press adds a notice (it rises into the column), a fourth pushes the oldest out from the top, and a notice leaves with Undo, with its close button or after six seconds. An error has a mark, never counts down and is pushed out last: it stays until it is closed.">
      <Row label="column">
        <div className="w-[26rem]">
          <Toasts items={TOASTS} inline animated={animated} />
        </div>
      </Row>
      <Row label="timed">
        <div className="w-[26rem]">
          <Toasts items={[{ id: 'tt', text: 'Moved to Archive', undo: { hint: 'Z', onClick: () => {} } }]} inline durationMs={3_600_000} onDismiss={() => {}} />
        </div>
      </Row>
      <Row label="live">
        <div className="flex w-[26rem] max-w-full flex-wrap items-start gap-2">
          <Button variant="outline" data-sample="toast-add" onClick={() => {
              const n = (count.current += 1)
              setLive((now) => [...now, { id: `live-${n}`, text: LIVE_TEXTS[n % LIVE_TEXTS.length] as string }])
            }}>
            Show a notice
          </Button>
          <Button variant="outline" data-sample="toast-error-add" onClick={() => {
              const n = (count.current += 1)
              setLive((now) => [...now, { id: `live-${n}`, text: 'Could not save the change', kind: 'error' }])
            }}>
            Show an error
          </Button>
          <div className="min-h-44 w-full">
            <Toasts
              items={live.map((item) => (item.kind === 'error' ? item : { ...item, undo: { onClick: () => remove(item.id) } }))}
              inline
              max={3}
              durationMs={6000}
              onDismiss={remove}
              animated={animated}
            />
          </div>
        </div>
      </Row>
    </Section>
  )
}

function Overlays({ animated }: { animated: boolean }) {
  const [dialog, setDialog] = React.useState(OPEN.has('dialog'))
  const [drawer, setDrawer] = React.useState(OPEN.has('drawer'))
  const [sheet, setSheet] = React.useState<'right' | 'left' | null>(OPEN.has('sheet') ? 'right' : OPEN.has('sheet-left') ? 'left' : null)
  const viewerKind = OPEN.has('viewer') ? 'ready' : OPEN.has('viewer-loading') ? 'loading' : OPEN.has('viewer-error') ? 'error' : null
  const [viewer, setViewer] = React.useState(viewerKind !== null)
  const [zoom, setZoom] = React.useState(1)
  return (
    <Section id="overlays" title="Dialog, Sheet and AttachmentViewer" note="Each opens from its button, or from the address (`?open=dialog`, `drawer`, `sheet`, `sheet-left`, `viewer`, `viewer-loading`, `viewer-error`). Every overlay that dims the page uses one backdrop: the drop colour at 40% (`BACKDROP`).">
      <Row label="backdrop">
        <Cell label="the one backdrop, inline">
          <div data-sample="backdrop" className="relative h-40 w-80 overflow-hidden rounded-lg bg-paper p-4">
            <p className="text-sm text-ink">The page behind</p>
            <p className="mt-1 text-xs text-ink-mute">Rows, titles and controls</p>
            <div aria-hidden="true" className={`absolute inset-0 ${BACKDROP}`} />
            <div className="absolute inset-x-8 top-10 rounded-lg bg-raised p-4 text-sm text-ink shadow-lg">A dialog on the backdrop</div>
          </div>
        </Cell>
      </Row>
      <Row label="open">
        <Button variant="outline" onClick={() => setDialog(true)}>
          Dialog
        </Button>
        <Button variant="outline" onClick={() => setDrawer(true)}>
          Dialog as a drawer
        </Button>
        <Button variant="outline" onClick={() => setSheet('right')}>
          Sheet
        </Button>
        <Button variant="outline" onClick={() => setViewer(true)}>
          Viewer
        </Button>
      </Row>
      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Rename the folder"
        description="The new name shows everywhere the folder appears."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialog(false)}>Rename</Button>
          </>
        }
      >
        <Input defaultValue="Contracts" aria-label="Name" />
      </Dialog>
      <Dialog
        open={drawer}
        onOpenChange={setDrawer}
        drawer
        title="New folder"
        description="A folder groups the items of one subject."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawer(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDrawer(false)}>Create</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input placeholder="Name" aria-label="Name" />
          <Swatches value={COLORS[10]} onChange={() => {}} />
        </div>
      </Dialog>
      <Sheet open={sheet !== null} onOpenChange={(o) => setSheet(o ? sheet : null)}>
        <SheetContent side={sheet ?? 'right'} animated={animated}>
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
            <SheetDescription>Everything about one item.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4">
            <Input defaultValue="Quarterly report" aria-label="Title" />
            <Textarea placeholder="Notes" aria-label="Notes" />
          </div>
          <SheetFooter>
            <Button onClick={() => setSheet(null)}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AttachmentViewer
        open={viewer}
        onOpenChange={setViewer}
        title="Quarterly report.pdf"
        status={viewerKind === 'loading' ? { kind: 'loading', label: 'Opening the document…' } : viewerKind === 'error' ? { kind: 'error', message: 'This file could not be opened here.' } : { kind: 'ready' }}
        pages={[{ width: 210, height: 297 }, { width: 210, height: 297 }]}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpenOriginal={() => {}}
        animated={animated}
      />
    </Section>
  )
}

/* ———— The palette strip ———— */

function ThemePanel({ theme, scheme, tone }: { theme: ThemeId; scheme: ThemeScheme; tone: ThemeTone | null }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (ref.current) applyTheme(ref.current, { theme: themeById(theme), scheme, tone })
  }, [theme, scheme, tone])
  const label = THEMES.find((t) => t.id === theme)?.label ?? theme
  return (
    <div ref={ref} data-panel={`${theme}-${scheme}`} className="flex flex-col gap-4 rounded-lg bg-paper p-4 text-ink shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-2xs text-ink-mute">{scheme}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Save</Button>
        <Button size="sm" variant="outline">
          Skip
        </Button>
        <Button size="sm" variant="secondary">
          Later
        </Button>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
        <Button size="sm" variant="outline" data-force="focus">
          Focus
        </Button>
      </div>
      <Input placeholder="Search by name" />
      <div className="flex items-center gap-4">
        <Checkbox aria-label="Done" defaultChecked />
        <Checkbox aria-label="Not done" />
        <Badge variant="secondary">Label</Badge>
        <span className="text-sm text-accent">Today</span>
        <span className="text-sm text-ink-mute">2 days</span>
        <Kbd>Ctrl K</Kbd>
      </div>
      <ToggleGroup aria-label="View" value="list" onValueChange={() => {}} className="self-start">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

function Strip({ theme, scheme, tone, onTone }: { theme: ThemeId; scheme: ThemeScheme; tone: ThemeTone | null; onTone: (tone: ThemeTone | null) => void }) {
  return (
    <Section id="palettes" title="Palettes" note="The main controls in three palettes, in light and dark, side by side.">
      <TonePresetChoice theme={themeById(theme)} scheme={scheme} palette={null} tone={tone} onTone={onTone}
        text={{ label: 'Tone', hint: '', presets: {
          calm: { name: 'Calm', note: 'Muted accents' },
          balanced: { name: 'Balanced', note: 'Moderate contrast between colours' },
          vivid: { name: 'Vivid', note: 'Saturated accents' },
        } }} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(['light', 'dark'] as const).flatMap((scheme) => STRIP.map((theme) => <ThemePanel key={`${theme}-${scheme}`} theme={theme} scheme={scheme} tone={tone} />))}
      </div>
    </Section>
  )
}

/* ———— The page ———— */

function App() {
  const [theme, setTheme] = React.useState<ThemeId>(initialTheme)
  const [color, setColor] = React.useState(initialColor)
  const [spot, setSpot] = React.useState<Spot>(initialSpot)
  const yours = theme === YOURS
  const [scheme, setScheme] = React.useState<ThemeScheme>(initialScheme)
  const [density, setDensity] = React.useState<DensityId>(initialDensity)
  const [animated, setAnimated] = React.useState(params.get('animated') !== '0')
  // `?shape=sharp|soft|round`: how round the corners are (a parameter of the theme).
  const [shape, setShape] = React.useState<ThemeShape>(isThemeShape(params.get('shape')) ? (params.get('shape') as ThemeShape) : DEFAULT_SHAPE)
  const [tone, setTone] = React.useState(() => {
    const initial = params.get('tone')
    return presetTone(initial === 'calm' || initial === 'balanced' ? initial : 'vivid')
  })
  React.useEffect(() => {
    const next = new URLSearchParams(location.search)
    next.set('animated', animated ? '1' : '0')
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [animated])
  React.useLayoutEffect(() => {
    applyTheme(document.documentElement, yours ? { theme: { ...colorTheme({ id: YOURS, label: 'Your colours', color, spot }), shape }, scheme, tone: AS_CHOSEN } : { theme: { ...themeById(theme), shape }, scheme, tone })
    const next = new URLSearchParams(location.search)
    next.set('theme', theme)
    next.set('scheme', scheme)
    next.set('tone', tonePresetOf(tone))
    next.set('shape', shape)
    if (yours) {
      next.set('color', color.slice(1))
      next.set('spot', spot === null ? 'none' : spot.replace('#', ''))
    } else {
      next.delete('color')
      next.delete('spot')
    }
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [theme, scheme, tone, yours, color, spot, shape])
  React.useLayoutEffect(() => {
    applyDensity(document.documentElement, density)
    const next = new URLSearchParams(location.search)
    next.set('density', density)
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [density])
  // What only opens on a gesture: the showcase makes the gesture once, after the first paint.
  React.useEffect(() => {
    const press = (target: string) => document.querySelector<HTMLElement>(`[data-open-target="${target}"] button, button[data-open-target="${target}"]`)
    if (OPEN.has('select')) press('select')?.click()
    if (OPEN.has('date')) press('date')?.click()
    if (OPEN.has('datetime')) press('datetime')?.click()
    if (OPEN.has('range')) press('range')?.click()
    if (OPEN.has('date-picks')) press('date-picks')?.click()
    if (OPEN.has('tooltip')) press('tooltip')?.focus()
  }, [])
  return (
    <MotionProvider animated={animated}>
      <div className="min-h-screen bg-paper text-ink">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-paper px-4 py-3 md:px-6">
          <h1 className="text-base font-semibold">Sigrid UI showcase</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 md:ml-auto">
            <div className="w-56 max-w-full">
              <Select aria-label="Theme" options={[...THEMES.map((t) => ({ value: t.id, label: t.label })), { value: YOURS, label: 'Your colours' }]} value={theme} onValueChange={(v) => (v === YOURS || isThemeId(v)) && setTheme(v)} />
            </div>
            <ToggleGroup aria-label="Scheme" value={scheme} onValueChange={setScheme}>
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup aria-label="Shape" value={shape} onValueChange={(v) => isThemeShape(v) && setShape(v)}>
              {THEME_SHAPES.map((name) => (
                <ToggleGroupItem key={name} value={name}>
                  {name[0]!.toUpperCase() + name.slice(1)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup aria-label="Density" value={density} onValueChange={(v) => isDensityId(v) && setDensity(v)}>
              {DENSITIES.map((d) => (
                <ToggleGroupItem key={d.id} value={d.id}>
                  {d.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <Checkbox id="animated" checked={animated} onCheckedChange={(c) => setAnimated(c === true)} />
              <label htmlFor="animated" className="text-sm">
                Animations
              </label>
            </div>
          </div>
        </header>
        <div className="flex">
        <Index />
        <main className="mx-auto min-w-0 max-w-6xl flex-1 px-4 pb-24 md:px-6">
          <Strip theme={theme} scheme={scheme} tone={tone} onTone={setTone} />
          <Tokens />
          <Section id="theme-gallery" title="Theme gallery" note="A theme from the gallery, or one made from two colours: the theme colour, and a spot colour matched to it for the few things that ask for attention. Picking a colour puts the theme on the whole page.">
            <Row label="match colours">
              <div className="w-full max-w-xl">
                <ColorMatch
                  colors={SEEDS.map((seed) => ({ color: seed, label: COLOR_NAMES[seed] }))}
                  color={color}
                  spot={spot}
                  scheme={scheme}
                  onColor={(next) => { setColor(next); setTheme(YOURS) }}
                  onSpot={(next) => { setSpot(next); setTheme(YOURS) }}
                  text={{
                    color: 'Theme colour', spot: 'Spot colour', own: 'Your own colour', none: 'None',
                    kinds: { quiet: 'Quiet', balanced: 'Balanced', loud: 'Loud' },
                    sample: { action: 'Save', chosen: 'Today', row: 'Upcoming', due: 'Due now', running: 'Running' },
                  }}
                />
              </div>
            </Row>
            <Row label="gallery">
              <div className="w-full">
                <ThemeGallery themes={THEMES} selected={yours ? null : theme} label="Choose a theme" scheme={scheme} tone={tone} onTheme={(next) => setTheme(next.id)} />
              </div>
            </Row>
          </Section>
          <Buttons animated={animated} />
          <Badges />
          <Fields />
          <Checkboxes animated={animated} />
          <Radios />
          <Switches animated={animated} />
          <TabSets animated={animated} />
          <FormFields />
          <Navigation />
          <SidebarSample animated={animated} />
          <Toolbars animated={animated} />
          <Pickers />
          <Toggles animated={animated} />
          <Selects />
          <Menus animated={animated} />
          <Popovers animated={animated} />
          <HoverRows animated={animated} />
          <MotionPieces animated={animated} />
          <Keys />
          <Empties />
          <Dates animated={animated} />
          <OtherFields />
          <Files />
          <Content />
          <Notices animated={animated} />
          <Overlays animated={animated} />
        </main>
        </div>
      </div>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
