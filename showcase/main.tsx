// The toolkit's showcase, built with the toolkit's own frame (`AppShell`) as docs/patterns.md recommends. Five views,
// as tabs in the bar (`?view=philosophy|guidelines|practices|components|examples`): the philosophy, the guidelines and
// the practices of the design system (guide.tsx, with the phone layouts of docs/mobile.md in phone.tsx), every
// exported component, in its variants, sizes and states (this file), and two whole apps in their four hosts
// (examples.tsx). «Look», at the end of the bar, holds the theme, shape, density and animations; the moon switches the
// scheme. All of them are also in the address: `?theme=amber-bold&scheme=dark&shape=sharp&density=compact`.
// The themes are the toolkit's own baseline (`base`) and palettes it builds from one colour (`<colour>-<combination>`,
// such as `blue-clean`): an app's themes live in the app. Motion is on initially. `?animated=0` switches it off. Hover,
// pressed and focus are forced with `data-force` (see showcase.css), so they can be seen at once. What only opens on a
// gesture opens from the address: `?open=menu`, `popover`, `select`, `tooltip`, `date`, `datetime`, `range`,
// `date-picks`, `dialog`, `drawer`, `sheet`, `sheet-left`, `viewer`, `viewer-loading`, `viewer-error` (several, with
// commas); an address that opens something, or ends in `#<section>`, starts in the view that holds it.
// Not shown: `DesktopSurface` (a separate system window of the desktop shell) and the headless re-exports
// (`Collapsible`, `Field`, `PopoverPrimitive`), which have no form of their own.
import './showcase.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { DatePicker } from '@ark-ui/react/date-picker'
import { parseDate } from '@internationalized/date'
import { Archive, ArrowUpDown as ArrowDownUp, Bell, ChevronRight, CogFour as Settings, CornerUpLeft as Reply, Dots as Ellipsis, Inbox, PanelLeft, Plus, Search, Terminal, Trash as Trash2 } from '../src/internal/sigrid-icons'
import { BACKDROP, BASE_THEME, DEFAULT_MOTION_FEEL, MOTION_EASE_NAMES, isMotionEase, type MotionEase, MotionProvider, COLORS, COLOR_NAMES, cn, TAG_COLOR, TAG_HUES, TAG_PILL, DENSITIES, DEFAULT_SHAPE, THEME_SHAPES, isThemeShape, PALETTE_COMBOS, applyDensity, applyFont, DEFAULT_FONT, applyTheme, colorTheme, contrast, tokensFor, isAccentColor, isSpotKind, isDensityId, markHueAttrs, paletteTheme, presetTone, tonePresetOf, useMotion, useMedia, WordsProvider, useWords, type DensityId, type SpotKind, type ThemeDef, type ThemeScheme, type ThemeShape, type ThemeTone, HUE_NAMES, TONE_PRESETS, grayScale, hueScale, type TonePreset } from '../src/index'
import { Logo, Badge, Button, Avatar, Checkbox, Card as SampleCard, Cluster, Column, Dot, Heading, Separator, Text, Slider, Progress, ProgressRing, ProgressSegments, Count, Switch, Tabs, TabsContent, TabsList, TabsTrigger, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, Icon, Input, Kbd, Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, RadioGroup, RadioGroupItem, Select, Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, Shortcut, Textarea, Thumbnail, ToggleGroup, ToggleGroupItem, Tooltip, isIconName, type IconName } from '../src/primitives'
import { ConfirmDialog, Message, Reasoning, Suggestions, ToolCall, CALENDAR_WORDS, Calendar, Combobox, SearchField, CopyButton, Disclosure, InputGroup, InputGroupButton, InputGroupText, ItemList, ItemRow, OverflowList, DescriptionList, SettingRow, Steps, type StepItem, FormField, ChipsInput, DateField, DateRangeField, dayPicks, rangePicks, DateTimeField, Dialog, DurationField, Empty, Note, MarkdownBlocks, InlineMarkdown, Swatches, Toasts, type DateRange, type ToastItem } from '../src/components'
import { AppShell, ToolbarTab, ToolbarTabs, Inspector, DrawerButton, SidebarRow, TitleBar, Toolbar, ToolbarBrand, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTitle, WindowControls, Sidebar, SidebarGroup, NavItem, NavList, AppShellContext } from '../src/layout'
import { AuthForm, type AuthMode, Lightbox, Wizard, AttachmentMarks, Chat, type ChatMessage, Conversation, PromptInput, SwipeDeck, AttachmentViewer, AttachmentsSection, ThemeGallery, ColorMatch, CommandPalette, useCommandKey, TonePresetChoice, Tree, type AttachmentView, type TreeNode } from '../src/assemblies'
import { GuidelinesView, PhilosophyView, PracticesView } from './guide'
import { PhoneLayouts } from './phone'
import { ExamplesView } from './examples'
import { Graphs, LongLists, RichTexts, Reorders, Tables } from './data'
import { LayoutParts } from './layout-parts'
import { HoverFollow, PopoverAnchor, type DialogWidth, type SheetWidth } from '../src/primitives'
import { ContentSplit, SplitPane } from '../src/layout'
import { VirtualList } from '../src/virtual'
import { Cell, Code, Go, Page, Row, Section, VIEWS, isViewId, viewOfId, type ViewId } from './parts'

/* ———— The address ———— */

// A page that cannot carry an address of its own (the showcase published inside another page) names its starting
// choices in `SIGRID_SHOWCASE_DEFAULTS`, written as the address would be: `?theme=blue-clean`.
const params = new URLSearchParams(location.search || (window as { SIGRID_SHOWCASE_DEFAULTS?: string }).SIGRID_SHOWCASE_DEFAULTS || '')
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
/** `?view=…`; without it, the view that holds what the address asks for (something to open, or a `#section`), else the philosophy. */
const givenView = params.get('view')
const givenSection = decodeURIComponent(location.hash.slice(1))
const initialView: ViewId = isViewId(givenView) ? givenView : OPEN.size > 0 ? 'components' : givenSection ? viewOfId(givenSection) : 'philosophy'

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

/* ———— The index ———— */

/** Where a section's title must have passed, from the top of the content, for the section to be the one being read. */
const READING_LINE = 96

/** The content of the frame, which scrolls by itself. The first one in the page is the frame's own: the examples hold more of them, deeper in. */
const shellContent = () => document.querySelector<HTMLElement>('[data-slot="app-shell-content"]')

type Group = { label: string; icon: IconName; ids: readonly string[] }

/** The title of each section of the components view, by its id: the index is drawn from these, with nothing of the sections in the page. */
const COMPONENT_TITLES: Readonly<Record<string, string>> = {
  "palettes": "Palettes",
  "tokens": "Tokens",
  "hue-scales": "Tints and their scales",
  "theme-gallery": "Theme gallery",
  "layout": "Column, Cluster, Split, Grid, Cell, Section, ScrollArea, Page and Text",
  "button": "Button",
  "toggle-group": "ToggleGroup",
  "badge": "Badge",
  "kbd": "Kbd and Shortcut",
  "theme-hooks": "Looks a theme asks for",
  "input": "Input and Textarea",
  "select": "Select",
  "checkbox": "Checkbox",
  "radio": "RadioGroup and Swatches",
  "switch": "Switch",
  "tabs": "Tabs",
  "menu": "DropdownMenu",
  "popover": "Popover and Tooltip",
  "overlays": "Dialog, Sheet and AttachmentViewer",
  "progress": "Progress",
  "table": "Table and DataTable",
  "composition": "Card, Heading, Dot, Separator, DescriptionList, SettingRow, SidebarRow and DrawerButton",
  "composition-panes": "ItemRow with a control, ContentSplit, SplitPane, VirtualList fill and SheetContent width",
  "form-field": "FormField",
  "pickers": "Slider, SearchField, InputGroup, CopyButton, Disclosure, Combobox, Avatar",
  "date": "Calendar, DateField, DateTimeField and DateRangeField",
  "fields": "ChipsInput and DurationField",
  "steps": "Steps",
  "toasts": "Toasts",
  "empty": "Empty",
  "note": "Note",
  "confirm": "ConfirmDialog",
  "overflow-list": "OverflowList",
  "markdown": "Markdown and label colours",
  "nav-list": "NavList and Count",
  "sidebar": "Sidebar",
  "toolbar": "Toolbar, TitleBar and WindowControls",
  "chat": "Chat, Conversation, Message, PromptInput, Suggestions, Reasoning, ToolCall",
  "wizard": "Wizard",
  "auth-form": "AuthForm",
  "lightbox": "Lightbox",
  "swipe-deck": "SwipeDeck",
  "tree": "Tree",
  "attachments": "AttachmentsSection, AttachmentMarks and Thumbnail",
  "virtual-list": "VirtualList",
  "reorder": "ReorderList",
  "rich-text": "RichTextField",
  "graph": "GraphCanvas",
  "motion-feel": "The feel: curve and pace",
  "motion-open": "What opens in place",
  "motion-surfaces": "Surfaces: in and out",
  "motion-choices": "Choosing and pressing",
  "hover": "Hover background",
  "motion-pieces": "List, row, arrow and card motion",
}

/**
 * The sections of the component gallery in the groups of the index, in the order of the page: the page follows the
 * index, so scrolling reads down it. The groups are the levels of the toolkit, each made of the ones before it: the
 * ground (what does not draw), the primitives, the components, the frame of an app and the assemblies. A section that
 * shows parts of two levels is in the group of the first part of its title. A section in no group goes under «More».
 */
const COMPONENT_GROUPS: readonly Group[] = [
  { label: 'Ground', icon: 'appearance', ids: ['palettes', 'tokens', 'hue-scales', 'theme-gallery'] },
  { label: 'Primitives', icon: 'package', ids: ['layout', 'button', 'toggle-group', 'badge', 'kbd', 'theme-hooks', 'input', 'select', 'checkbox', 'radio', 'switch', 'tabs', 'menu', 'popover', 'overlays', 'progress', 'table'] },
  { label: 'Components', icon: 'layers', ids: ['composition', 'composition-panes', 'form-field', 'pickers', 'date', 'fields', 'steps', 'toasts', 'empty', 'note', 'confirm', 'overflow-list', 'markdown'] },
  { label: 'Frame', icon: 'layout', ids: ['nav-list', 'sidebar', 'toolbar'] },
  { label: 'Assemblies', icon: 'structure', ids: ['chat', 'wizard', 'auth-form', 'lightbox', 'swipe-deck', 'tree', 'attachments', 'virtual-list', 'reorder', 'rich-text', 'graph'] },
  { label: 'Motion', icon: 'animations', ids: ['motion-feel', 'motion-open', 'motion-surfaces', 'motion-choices', 'hover', 'motion-pieces'] },
]

/** The ids of the sections of the components view, in the order of the index. */
const componentOrder = (): string[] => COMPONENT_GROUPS.flatMap((g) => g.ids).filter((id) => id in COMPONENT_TITLES)

/** The section of the components view the address names (`#button`), or the first; `moved` once the person has chosen another. */
function useComponentSection(): { section: string; moved: boolean } {
  const read = () => {
    const asked = decodeURIComponent(location.hash.slice(1))
    return asked in COMPONENT_TITLES ? asked : (componentOrder()[0] ?? '')
  }
  const [section, setSection] = React.useState(read)
  const moved = React.useRef(false)
  React.useEffect(() => {
    const changed = () => {
      const next = read()
      setSection((now) => {
        if (now !== next) moved.current = true
        return next
      })
    }
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  return { section, moved: moved.current }
}

/** At the foot of the one section on show: the way to the one before it and to the one after it, in the order of the index. */
function Pager() {
  const [around, setAround] = React.useState<{ before?: { id: string; title: string }; after?: { id: string; title: string } }>({})
  React.useEffect(() => {
    const read = () => {
      const order = componentOrder()
      const asked = decodeURIComponent(location.hash.slice(1))
      const at = Math.max(0, order.indexOf(asked))
      const named = (id: string | undefined) => (id === undefined ? undefined : { id, title: COMPONENT_TITLES[id] ?? id })
      setAround({ before: named(order[at - 1]), after: named(order[at + 1]) })
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return (
    <nav aria-label="Sections before and after" className="flex items-center justify-between gap-4 border-t border-line py-6">
      {around.before ? (
        <Button variant="outline" asChild>
          <a href={`#${around.before.id}`}>
            <Icon name="moveLeft" />
            <span className="max-w-48 truncate">{around.before.title}</span>
          </a>
        </Button>
      ) : (
        <span />
      )}
      {around.after ? (
        <Button variant="outline" asChild>
          <a href={`#${around.after.id}`}>
            <span className="max-w-48 truncate">{around.after.title}</span>
            <Icon name="moveRight" />
          </a>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  )
}

/**
 * The sidebar of the frame: one row per section of the view on show, read from the page itself so it cannot fall behind
 * it, with the toolkit's own search box to filter them. The row of the section being read is the current one.
 */
function Index({ view, animated, open, onOpenChange }: { view: ViewId; animated: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [sections, setSections] = React.useState<{ id: string; title: string; icon: string | undefined }[]>([])
  const [current, setCurrent] = React.useState('')
  const first = React.useRef(true)
  // A layout effect: the rows of the view just left are gone before the new view is painted.
  React.useLayoutEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('section[data-showcase]'))
    setSections(found.map((s) => ({ id: s.id, title: s.querySelector('h2')?.textContent ?? s.id, icon: s.dataset.icon })))
    const scroller = shellContent()
    if (!scroller) return
    // The components are shown one section at a time, and only that one is in the page: the index is drawn from the
    // table of titles, and the address says which is on show.
    if (view === 'components') {
      const order = componentOrder()
      setSections(order.map((id) => ({ id, title: COMPONENT_TITLES[id] ?? id, icon: undefined })))
      const show = () => {
        const asked = decodeURIComponent(location.hash.slice(1))
        setCurrent(order.includes(asked) ? asked : (order[0] ?? ''))
        scroller.scrollTop = 0
      }
      show()
      first.current = false
      window.addEventListener('hashchange', show)
      return () => window.removeEventListener('hashchange', show)
    }
    // The sections did not exist when the browser looked for the address's anchor.
    const asked = () => document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (first.current && location.hash) asked()?.scrollIntoView()
    first.current = false
    let frame = 0
    const read = () => {
      frame = 0
      const box = scroller.getBoundingClientRect()
      const line = box.top + READING_LINE
      const passed = found.filter((s) => s.getBoundingClientRect().top <= line)
      let now = passed[passed.length - 1] ?? found[0]
      // At the end of the page the last sections never reach the line: the one asked for, if in view, else the last.
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        const target = location.hash ? asked() : null
        const top = target?.getBoundingClientRect().top
        const inView = target && found.includes(target) && top !== undefined && top < box.bottom && top > line
        now = inView ? target : found[found.length - 1]
      }
      setCurrent(now?.id ?? '')
    }
    const later = () => {
      frame ||= requestAnimationFrame(read)
    }
    read()
    scroller.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    window.addEventListener('hashchange', later)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
      window.removeEventListener('hashchange', later)
    }
  }, [view])
  const groups: readonly Group[] = view === 'components' ? COMPONENT_GROUPS : [{ label: 'On this page', icon: 'all', ids: sections.map((s) => s.id) }]
  const known = new Set(groups.flatMap((g) => g.ids))
  const loose = sections.filter((s) => !known.has(s.id))
  const shown: readonly Group[] = loose.length > 0 ? [...groups, { label: 'More', icon: 'more', ids: loose.map((s) => s.id) }] : groups
  return (
    <WordsProvider words={{ sidebar: { search: 'Find a section', empty: 'No section has that name.' } }}>
    <Sidebar aria-label="Sections" search open={open} onOpenChange={onOpenChange} animated={animated}>
      {shown.map((g) => {
        const rows = sections.filter((s) => g.ids.includes(s.id))
        return rows.length === 0 ? null : (
          <SidebarGroup key={g.label} label={g.label} icon={<Icon name={g.icon} />} collapsible>
            {rows.map((s) => (
              <NavItem key={s.id} href={`#${s.id}`} title={s.title} current={current === s.id} icon={isIconName(s.icon) ? <Icon name={s.icon} /> : null}>
                {s.title}
              </NavItem>
            ))}
          </SidebarGroup>
        )
      })}
    </Sidebar>
    </WordsProvider>
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

const SCALE_TONES = [...TONE_PRESETS, 'gray'] as const
const SCALE_TONE_NAMES: Readonly<Record<(typeof SCALE_TONES)[number], string>> = { calm: 'Calm', balanced: 'Balanced', vivid: 'Vivid', gray: 'Gray' }

/** The eighteen tints as scales of twelve steps, in the tone chosen here and the scheme chosen above (`src/hues.ts`). */
function HueScales({ scheme, animated }: { scheme: ThemeScheme; animated: boolean }) {
  const [tone, setTone] = React.useState<TonePreset | 'gray'>('vivid')
  const columns = 'grid grid-cols-[4.5rem_1fr] items-center gap-2'
  return (
    <Section id="hue-scales" title="Tints and their scales" note="The eighteen tints by name, each in twelve steps: 1 and 2 backgrounds, 3 to 5 the backgrounds of a component, 6 to 8 borders, 9 and 10 the fill and its hover (with the label that reads on them), 11 and 12 text. In the three tones, and as the gray of the tint. A board to look at: the theme engine does not read its roles from these scales, and no part offers their steps as classes.">
      <ToggleGroup aria-label="Tone of the scales" value={tone} onValueChange={(v) => v && setTone(v as TonePreset | 'gray')} animated={animated}>
        {SCALE_TONES.map((id) => (
          <ToggleGroupItem key={id} value={id}>
            {SCALE_TONE_NAMES[id]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div data-sample="hue-scales" data-tone={tone} className="flex max-w-4xl flex-col gap-1">
        <div className={columns}>
          <span />
          <div className="grid grid-cols-12 gap-0.5 text-center text-2xs text-ink-mute tabular-nums">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        </div>
        {HUE_NAMES.map((hue, at) => {
          const scale = tone === 'gray' ? grayScale(hue, scheme) : hueScale(hue, tone, scheme)
          return (
            <div key={hue} data-hue={hue} className={columns}>
              <span className="truncate text-2xs text-ink-soft">{COLOR_NAMES[COLORS[at]!]}</span>
              <div className="grid grid-cols-12 gap-0.5">
                {scale.steps.map((hex, i) => (
                  <span key={i} data-step={i + 1} title={`${i + 1}: ${hex}`} style={{ background: hex, color: scale.on }} className="grid h-6 place-items-center rounded-sm text-2xs font-medium">
                    {i === 8 ? 'Aa' : null}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
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

/** The four tones of a badge, each with the word it is never without. */
const TONE_SAMPLES = [['success', 'Running'], ['warning', 'Waiting'], ['danger', 'Failed'], ['info', 'Queued']] as const

function Badges() {
  const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
  return (
    <Section id="badge" title="Badge" note="Six variants; as a link it has a hover state. A tone is a status as a label: its colour on its soft ground, a 6px dot and always a word.">
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
      <Row label="tone">
        {TONE_SAMPLES.map(([tone, word]) => (
          <Cell key={tone} label={tone}>
            <Badge tone={tone} data-sample={`badge-tone-${tone}`}>
              {word}
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

const SIGNUP = [
  { label: 'Account', description: 'Email and password' },
  { label: 'Profile', description: 'Your name and a photo' },
  { label: 'Plan', description: 'Free, or paid by the month' },
  { label: 'Done' },
]
const IMPORT = [{ label: 'Upload' }, { label: 'Read' }, { label: 'Convert' }, { label: 'Publish' }]
// A pipeline: each step says what became of it, whatever its place, and the one on the screen is a done one.
const PIPELINE: StepItem[] = [
  { label: 'Read the sources', status: 'done', meta: '2 min' },
  { label: 'Map the modules and what each one depends on', description: 'A long name wraps under itself', status: 'done', meta: '40 s' },
  { label: 'Tests', status: 'skipped' },
  { label: 'Security', status: 'error', meta: '3 of 6' },
  { label: 'Architecture', status: 'running' },
  { label: 'Report', status: 'todo', disabled: true, reason: 'After the analysis ends' },
]
const TUTORIAL = [{ label: 'Welcome' }, { label: 'Add a task' }, { label: 'Set a day' }, { label: 'Finish' }]

function StepsSection() {
  const [current, setCurrent] = React.useState(1)
  const [lesson, setLesson] = React.useState(1)
  const [looked, setLooked] = React.useState(1)
  const back = (value: number, set: (n: number) => void) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={value === 0} onClick={() => set(value - 1)}>
        Back
      </Button>
      <Button size="sm" disabled={value === SIGNUP.length} onClick={() => set(value + 1)}>
        {value === SIGNUP.length - 1 ? 'Finish' : 'Continue'}
      </Button>
    </div>
  )
  return (
    <Section id="steps" title="Steps" note="The steps of a task as a path: numbered dots joined by a line that lights up one by one. A step done is a check on the accent tint, the step the user is on is the one solid dot with its name in strong text, the steps to come are quiet (R2: the accent is progress). Show the next step by its name: people finish when they know what is left. Steps already done can be buttons that go back to them; a step that failed is red with the circle with an X (the one look of a failure, as in a Note error) and says so. A step may say what became of it whatever its place (done, running, to do, skipped, failed), with a short fact at the end of its row, and one that cannot be gone to yet says why. Nothing moves: a running step is a clock and the words «in progress». Each step also says its state in words for screen readers. In a row too narrow for the names only the current one stays, with «Step 2 of 4» under it.">
      <Row label="a wizard">
        <div className="flex flex-col gap-4">
          <Steps aria-label="Signup" steps={SIGNUP} current={current} onStepSelect={setCurrent} />
          {back(current, setCurrent)}
        </div>
      </Row>
      <Row label="a tutorial, in a row">
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <Steps aria-label="Tutorial" orientation="horizontal" steps={TUTORIAL} current={lesson} onStepSelect={setLesson} />
          {back(lesson, setLesson)}
        </div>
      </Row>
      <Row label="a processing">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <Cell label="working: the app moves the step on as each part ends">
            <Steps aria-label="Import, working" orientation="horizontal" steps={IMPORT} current={2} className="w-full" />
          </Cell>
          <Cell label="a step failed: it stays where it stopped, in red">
            <Steps aria-label="Import, failed" orientation="horizontal" steps={[IMPORT[0]!, IMPORT[1]!, { ...IMPORT[2]!, status: 'error' }, IMPORT[3]!]} current={2} className="w-full" />
          </Cell>
        </div>
      </Row>
      <Row label="a pipeline: each step has its own state">
        <div className="w-full max-w-md">
          <Cell label="done, skipped, failed and running at once; the step on the screen is the one solid dot and keeps its mark; the whole row is the target">
            <Steps aria-label="Analysis" steps={PIPELINE} current={looked} onStepSelect={setLooked} />
          </Cell>
        </div>
      </Row>
      <Row label="in a narrow place">
        <div className="w-72">
          <Steps aria-label="Signup, narrow" orientation="horizontal" steps={SIGNUP} current={1} />
        </div>
      </Row>
      <Row label="the ends">
        <Cell label="first step">
          <Steps aria-label="First step" steps={SIGNUP.slice(0, 3)} current={0} />
        </Cell>
        <Cell label="all done">
          <Steps aria-label="All done" steps={SIGNUP.slice(0, 3)} current={3} />
        </Cell>
      </Row>
    </Section>
  )
}

function ProgressSection() {
  const [sent, setSent] = React.useState(40)
  return (
    <Section id="progress" title="Progress" note="How far a task is, as a bar, a ring or blocks: one set of props for the three. The accent is progress (R2), done is the success colour and a failure the destructive one, each with a word. Not knowing how far it is is a track with no range and the word «In progress», not a loop. Nothing moves: the range jumps to the value, so a screen that changes often does not flicker. Screen readers get the value and the words, never each percent.">
      <Row label="a bar">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Progress aria-label="Upload" value={sent} showValue />
          <Progress aria-label="Upload, small" size="sm" value={sent} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSent(0)}>
              Start again
            </Button>
            <Button size="sm" disabled={sent >= 100} onClick={() => setSent(Math.min(100, sent + 15))}>
              Add 15%
            </Button>
          </div>
        </div>
      </Row>
      <Row label="what became of it">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Cell label="not known how far">
            <Progress aria-label="Import, not known" value={null} />
          </Cell>
          <Cell label="done">
            <Progress aria-label="Import, done" value={100} showValue />
          </Cell>
          <Cell label="failed: the range stays where it stopped">
            <Progress aria-label="Import, failed" value={35} status="error" showValue />
          </Cell>
        </div>
      </Row>
      <Row label="a ring">
        <Cell label="25%">
          <ProgressRing aria-label="Ring, a quarter" value={25} showValue />
        </Cell>
        <Cell label="small">
          <ProgressRing aria-label="Ring, small" size="sm" value={70} showValue />
        </Cell>
        <Cell label="countdown: the time left as the value">
          <ProgressRing aria-label="Time left" value={16} max={30} valueText="16 seconds left">
            16
          </ProgressRing>
        </Cell>
        <Cell label="done">
          <ProgressRing aria-label="Ring, done" value={100} showValue />
        </Cell>
        <Cell label="failed">
          <ProgressRing aria-label="Ring, failed" value={40} status="error" showValue />
        </Cell>
        <Cell label="not known">
          <ProgressRing aria-label="Ring, not known" value={null} />
        </Cell>
      </Row>
      <Row label="blocks">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Cell label="6 of 10">
            <ProgressSegments aria-label="Level" value={6} showValue />
          </Cell>
          <Cell label="3 of 5, small">
            <ProgressSegments aria-label="Level, small" size="sm" max={5} value={3} />
          </Cell>
          <Cell label="done">
            <ProgressSegments aria-label="Level, done" value={10} showValue />
          </Cell>
        </div>
      </Row>
      <Row label="a file being sent">
        <div className="w-full max-w-md rounded-lg bg-raised p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="inline-flex text-ink-mute [&_svg]:size-4">
              <Icon name="attach" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink">Site survey.mov</span>
                <span className="shrink-0 text-xs text-ink-mute tabular-nums">{sent >= 100 ? '212 MB' : '1.2 MB/s'}</span>
              </div>
              <Progress aria-label="Site survey.mov" size="sm" value={sent} showValue />
            </div>
          </div>
        </div>
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
  const [headCollapsed, setHeadCollapsed] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const row = (id: string, icon: React.ComponentProps<typeof Icon>['name'], label: string, count?: number) => (
    <NavItem key={id} current={place === id} onClick={() => setPlace(id)} icon={<Icon name={icon} />} end={count === undefined ? undefined : <Count value={count} label="items" reserve />}>
      {label}
    </NavItem>
  )
  return (
    <Section id="sidebar" title="Sidebar" note="The navigation as groups of rows on the sidebar surface. The button at the foot (or, with toggle head, at the end of the header's row: the second sample) shrinks it to a rail of icons, each with its name as a hint; a group with an arrow opens and closes; the search box hides the rows that do not hold the text. Below 860px it is a drawer: «Menu» opens it and choosing a row closes it.">
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
      <Row label="the button at the head">
        <div data-sample="sidebar-head" className="flex h-64 w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-paper">
          <Sidebar
            aria-label="Sample list"
            toggle="head"
            collapsed={headCollapsed}
            onCollapsedChange={setHeadCollapsed}
            animated={animated}
            header={<SidebarRow end={<Count value={7} label="categories" />}>Categories</SidebarRow>}
          >
            <SidebarGroup>
              {row('all', 'all', 'All', 3)}
              {row('notifications', 'notifications', 'Notifications', 12)}
              {row('settings', 'settings', 'Settings')}
            </SidebarGroup>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <p className="text-sm text-ink-soft">The name of the list, its count and the button on one row; on the rail the button alone, at the top.</p>
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
  const bar = (name: string, field = false) => (
    <Toolbar aria-label={name}>
      <ToolbarButton label="Show the sidebar" icon={<PanelLeft aria-hidden="true" />} pressed={panel} onClick={() => setPanel(!panel)} animated={animated} />
      <ToolbarTitle>Inbox</ToolbarTitle>
      <ToolbarSpacer />
      <ToolbarSearch closed={field ? 'field' : 'icon'} label="Search the mail" shortcut="Ctrl K" value={text} onValueChange={setText} animated={animated} />
      <ToolbarGroup aria-label="View">
        <ToolbarButton label="Filter" icon={<Icon name="filter" />} pressed={filter} onClick={() => setFilter(!filter)} animated={animated} />
        <ToolbarButton label="Sort" icon={<ArrowDownUp aria-hidden="true" />} onClick={() => setSaid('Sort')} animated={animated} />
      </ToolbarGroup>
      <ToolbarSeparator />
      {field ? null : (
        <>
          <ToolbarButton label="Reply" shortcut="R" icon={<Reply aria-hidden="true" />} onClick={() => setSaid('Reply')} animated={animated} />
          <ToolbarButton label="Archive" shortcut="E" icon={<Archive aria-hidden="true" />} onClick={() => setSaid('Archive')} animated={animated} />
          <ToolbarButton label="Delete" icon={<Trash2 aria-hidden="true" />} disabled animated={animated} />
          <ToolbarButton label="More actions" icon={<Ellipsis aria-hidden="true" />} onClick={() => setSaid('More actions')} animated={animated} />
        </>
      )}
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
    <Section id="toolbar" title="Toolbar, TitleBar and WindowControls" note="One row of actions and a single Tab stop: the arrows move among the items. A button that shows an icon alone has its name as a hint, with its key; a switch that is on has the selection tint; one item is the solid action (R3). The search takes no room until its magnifier is pressed, or rests as a quiet field with its key. Under 448px of bar a word beside an icon gives way and the field is its magnifier. In the frame of a window the empty parts of the bar move the window and the three buttons at the end call the app back; on a web page the same bar has neither.">
      <Row label="in a window">
        <div data-sample="title-bar" className="w-full max-w-3xl overflow-hidden rounded-lg bg-paper shadow-lg">
          <TitleBar windowControls={<WindowControls maximized={maximized} onMinimize={() => setSaid('Minimize')} onMaximizeToggle={() => setMaximized(!maximized)} onClose={() => setSaid('Close')} />}>
            {bar('Mail, in a window', true)}
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
              <ToolbarButton label="New message" variant="default" icon={<Plus aria-hidden="true" />}>
                New
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        </div>
      </Row>
    </Section>
  )
}

/** What each example recommends, in one sentence: the same words as docs/patterns.md. */
const PATTERNS = {
  'list-detail': { name: 'List and detail', advice: 'For things to read and act on (mail, tasks, files). The sidebar says where, the list what, the inspector the details; the views are a row of tabs directly under the bar; Commands (Ctrl K) opens the palette.' },
  page: { name: 'Sidebar and page', advice: 'For settings and documents. One column of text no wider than 65 characters; each choice is a row with its control at the end; the rest sits under Advanced.' },
  board: { name: 'Board', advice: 'For work that moves through stages. Lanes on the quiet fill, cards raised with the smallest shadow, a data colour as a dot; the views are tabs: in the bar after the app as in Xiox, under the bar, in a bottom bar on a narrow window, or small in the status bar.' },
  focus: { name: 'Focus', advice: 'For one thing at a time. No sidebar and no inspector: what to do, how many are left, and the way out.' },
} as const
type PatternId = keyof typeof PATTERNS

/**
 * The gallery of layout patterns: complete screens made only of the toolkit's parts, at the widths where the frame
 * changes. They are examples to start from, not rules: docs/patterns.md says when each one fits. Its palette also holds
 * the scheme's three commands, acting on the showcase's own scheme (`scheme`, `onScheme`).
 */
function Shells({ animated, scheme, onScheme }: { animated: boolean; scheme: ThemeScheme; onScheme: (scheme: ThemeScheme) => void }) {
  const [pattern, setPattern] = React.useState<PatternId>('list-detail')
  const [width, setWidth] = React.useState('1040')
  const [place, setPlace] = React.useState('all')
  const [collapsed, setCollapsed] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [details, setDetails] = React.useState(true)
  const [text, setText] = React.useState('')
  const [view, setView] = React.useState('board')
  const [filter, setFilter] = React.useState('all')
  const [tabsAt, setTabsAt] = React.useState<'bar' | 'under' | 'bottom' | 'status'>('bar')
  const views = (look: { edge?: 'top'; size?: 'sm'; layout?: 'stacked' } = {}) => (
    <ToolbarTabs aria-label="Views" value={view} onValueChange={setView} {...look}>
      <ToolbarTab value="list" icon={look.layout ? <Icon name="all" /> : undefined}>List</ToolbarTab>
      <ToolbarTab value="board" icon={look.layout ? <Icon name="structure" /> : undefined}>Board</ToolbarTab>
      <ToolbarTab value="calendar" icon={look.layout ? <Icon name="date" /> : undefined}>Calendar</ToolbarTab>
      <ToolbarTab value="settings" icon={look.layout ? <Icon name="settings" /> : undefined}>Settings</ToolbarTab>
    </ToolbarTabs>
  )
  const [palette, setPalette] = React.useState(false)
  const [barStyle, setBarStyle] = React.useState<'regular' | 'compact' | 'classic'>('regular')
  useCommandKey(() => setPalette(true))
  // The scheme's commands as `useSchemeCommands` declares them in an app: its words, icons and checks. The hook is not
  // mounted here: it would put a second scheme on the page's root, which the showcase keeps itself (the moon,
  // `?scheme=`), light or dark. So the rows act on the showcase's scheme, and «System theme» puts the system's now.
  const schemeWords = useWords().scheme
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const schemeCommands = [
    { id: 'scheme-light', label: schemeWords.light, icon: <Icon name="sun" />, checked: scheme === 'light', onSelect: () => onScheme('light') },
    { id: 'scheme-dark', label: schemeWords.dark, icon: <Icon name="moon" />, checked: scheme === 'dark', onSelect: () => onScheme('dark') },
    { id: 'scheme-system', label: schemeWords.system, icon: <Icon name="appearance" />, checked: false, onSelect: () => onScheme(systemDark ? 'dark' : 'light') },
  ].map((command) => ({ ...command, group: schemeWords.group, keywords: schemeWords.keywords }))
  const commandsButton = (
    <ToolbarButton label="Commands" shortcut="Ctrl K" icon={<Terminal aria-hidden="true" />} onClick={() => setPalette(true)} animated={animated}>
      Commands
    </ToolbarButton>
  )
  const [chosen, setChosen] = React.useState(0)
  const mail: [string, string, string][] = [
    ['Kitchen quote, second version', 'Marta Riva', '09:42'],
    ['Receipt of the waste tax', 'City of Bergamo', '08:15'],
    ['Photos of Tuesday\'s survey', 'Luca Ferri', 'Mon'],
    ['Invoice 114 for October', 'Studio Belli', 'Mon'],
    ['Saturday dinner: who brings dessert?', 'Anna Greco', 'Sun'],
  ]
  const lanes: [string, [string, string][]][] = [
    ['To do', [['Renew the identity card', '28 Nov'], ['Book the train to Rome', '5 Dec'], ['Shopping for Saturday', 'Sat']]],
    ['Doing', [['Draft of the quote', 'Today'], ['Call the plumber', 'Today']]],
    ['Done', [['Pay the waste tax', 'Mon']]],
  ]
  const row = (id: string, icon: React.ComponentProps<typeof Icon>['name'], label: string, count?: number) => (
    <NavItem key={id} current={place === id} onClick={() => setPlace(id)} icon={<Icon name={icon} />} end={count === undefined ? undefined : <Count value={count} label="items" reserve />}>
      {label}
    </NavItem>
  )
  const sidebar = (groups: React.ReactNode) => (
    <Sidebar aria-label="Sample navigation" collapsed={collapsed} onCollapsedChange={setCollapsed} open={menu} onOpenChange={setMenu} animated={animated}>
      {groups}
    </Sidebar>
  )
  const bar = (title: string, items: React.ReactNode) => (
    <TitleBar size={barStyle === 'regular' ? 'default' : 'compact'} windowControls={<WindowControls onMinimize={() => {}} onMaximizeToggle={() => {}} onClose={() => {}} />}>
      <Toolbar aria-label={title}>
        {pattern === 'focus' ? null : <DrawerButton onOpen={() => setMenu(true)} />}
        {items}
      </Toolbar>
      {/* Inside the frame, so it opens under the title bar as every overlay of a desktop window. */}
      <CommandPalette
        open={palette}
        onOpenChange={setPalette}
        animated={animated}
        commands={[
          { id: 'find', label: 'Search in this view', shortcut: 'Ctrl F', onSelect: () => {} },
          ...(Object.keys(PATTERNS) as PatternId[]).map((id, i) => ({ id, label: `Go to ${PATTERNS[id].name}`, group: 'Go to', shortcut: String(i + 1), onSelect: () => setPattern(id) })),
          ...['1040', '900', '700', '480'].map((w) => ({ id: `w${w}`, label: `Frame ${w}px wide`, group: 'Width', keywords: 'size narrow', onSelect: () => setWidth(w) })),
          ...schemeCommands,
        ]}
      />
    </TitleBar>
  )
  const frames: Record<PatternId, React.ReactNode> = {
    'list-detail': (
      <AppShell
        desktop
        contentLabel="Messages"
        titleBar={bar(
          'Mail',
          barStyle === 'classic' ? (
            <>
              <ToolbarBrand name="Mail" page="Inbox" />
              <ToolbarSpacer />
            </>
          ) : (
          <>
            <ToolbarBrand name="Mail" />
            <ToolbarSpacer />
            <ToolbarSearch label="Search the mail" value={text} onValueChange={setText} animated={animated} />
            {commandsButton}
            <ToolbarButton label="Show the details" icon={<Settings aria-hidden="true" />} pressed={details} onClick={() => setDetails(!details)} animated={animated} />
            <ToolbarButton label="New message" variant="outline" icon={<Plus aria-hidden="true" />}>
              New
            </ToolbarButton>
          </>
          ),
        )}
        tabs={
          barStyle === 'classic' ? (
            <Toolbar aria-label="Menus and actions" size="sm">
              {(['File', 'Edit', 'View', 'Help'] as const).map((menu) => (
                <DropdownMenu key={menu} modal={false}>
                  <DropdownMenuTrigger asChild>
                    <ToolbarButton label={menu}>{menu}</ToolbarButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56" animated={animated}>
                    <DropdownMenuItem>
                      New message
                      <DropdownMenuShortcut>Ctrl N</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPalette(true)}>
                      Commands
                      <DropdownMenuShortcut>Ctrl K</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              <ToolbarSeparator />
              <ToolbarButton label="New message" shortcut="Ctrl N" icon={<Plus aria-hidden="true" />} animated={animated} />
              <ToolbarButton label="Reply" shortcut="R" icon={<Reply aria-hidden="true" />} animated={animated} />
              <ToolbarButton label="Archive" shortcut="E" icon={<Archive aria-hidden="true" />} animated={animated} />
              <ToolbarButton label="Delete" icon={<Trash2 aria-hidden="true" />} animated={animated} />
              <ToolbarSeparator />
              <ToolbarButton label="Show the details" icon={<Settings aria-hidden="true" />} pressed={details} onClick={() => setDetails(!details)} animated={animated} />
              <ToolbarSpacer />
              <ToolbarSearch label="Search the mail" shortcut="Ctrl K" value={text} onValueChange={setText} animated={animated} />
            </Toolbar>
          ) : (
          <Toolbar aria-label="Views of the mail">
            <ToolbarTabs aria-label="Views" value={filter} onValueChange={setFilter}>
              <ToolbarTab value="all">All</ToolbarTab>
              <ToolbarTab value="unread">Unread</ToolbarTab>
              <ToolbarTab value="flagged">Flagged</ToolbarTab>
            </ToolbarTabs>
          </Toolbar>
          )
        }
        status={<span>Archived «Receipt of the waste tax»</span>}
        sidebar={sidebar(
          <>
            <SidebarGroup label="Favorites" icon={<Icon name="tag" />}>
              {row('all', 'all', 'Inbox', 12)}
              {row('notifications', 'notifications', 'Waiting', 3)}
              {row('date', 'date', 'Today')}
            </SidebarGroup>
            <SidebarGroup label="Account" icon={<Icon name="account" />}>
              {row('settings', 'settings', 'Settings')}
            </SidebarGroup>
          </>,
        )}
        inspector={
          <Inspector title="Details" open={details} onOpenChange={setDetails} animated={animated} footer={<Button variant="outline" size="sm">Archive</Button>}>
            <p className="font-medium text-ink">{mail[chosen]![0]}</p>
            <p className="mt-1 text-ink-mute">
              {mail[chosen]![1]}, {mail[chosen]![2]}
            </p>
            <p className="mt-3 text-ink-soft">The quote with the quartz top and the built-in hood. The total goes down by 380.</p>
          </Inspector>
        }
        actions={<Button size="sm">Reply</Button>}
        footer={
          <>
            <span>Connected</span>
            <span className="tabular-nums">12 unread</span>
          </>
        }
      >
        <ItemList aria-label="Messages" className="p-2">
          {mail.map(([subject, from, when], i) => (
            <ItemRow key={subject} title={subject} description={from} meta={when} unread={i === 2} current={i === chosen} onClick={() => setChosen(i)} />
          ))}
        </ItemList>
      </AppShell>
    ),
    page: (
      <AppShell
        desktop
        contentLabel="Look"
        titleBar={bar('Settings', <ToolbarBrand name="Daodan" page="Settings" />)}
        sidebar={sidebar(
          <SidebarGroup>
            {row('general', 'settings', 'General')}
            {row('all', 'appearance', 'Look')}
            {row('notifications', 'notifications', 'Notifications')}
            {row('account', 'account', 'Account')}
          </SidebarGroup>,
        )}
      >
        <div className="mx-auto flex max-w-xl flex-col gap-1 p-6">
          <h1 className="text-xl font-semibold text-ink">Look</h1>
          <p className="text-sm text-ink-mute">How the app looks on this computer.</p>
          <div className="mt-4 flex flex-col divide-y divide-line border-y border-line text-sm text-ink">
            <div className="flex min-h-12 items-center justify-between gap-4 py-2">
              <span>Scheme</span>
              <ToggleGroup aria-label="Scheme" value="light" onValueChange={() => {}}>
                <ToggleGroupItem value="light">Light</ToggleGroupItem>
                <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-4 py-2">
              <span>Animations</span>
              <Switch aria-label="Animations" defaultChecked />
            </div>
            <div className="flex min-h-12 items-center justify-between gap-4 py-2 text-ink-mute">
              <span>Advanced</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </div>
          </div>
        </div>
      </AppShell>
    ),
    board: (
      <AppShell
        desktop
        contentLabel="Board"
        titleBar={bar(
          'Home',
          <>
            <ToolbarBrand name="Tasks" />
            {tabsAt === 'bar' ? views() : null}
            <ToolbarSpacer />
            {commandsButton}
            <ToolbarButton label="New task" variant="default" icon={<Plus aria-hidden="true" />}>
              New task
            </ToolbarButton>
          </>,
        )}
        sidebar={sidebar(
          <SidebarGroup label="Projects" icon={<Icon name="structure" />}>
            {row('all', 'all', 'Home', 6)}
            {row('date', 'date', 'Clients', 4)}
          </SidebarGroup>,
        )}
        tabs={tabsAt === 'under' ? <Toolbar aria-label="Views of the tasks">{views()}</Toolbar> : undefined}
        bottomBar={tabsAt === 'bottom' ? <Toolbar aria-label="Views of the tasks">{views({ edge: 'top', layout: 'stacked' })}</Toolbar> : undefined}
        footer={
          tabsAt === 'status' ? (
            <Toolbar aria-label="Views of the tasks">
              {views({ edge: 'top', size: 'sm' })}
              <ToolbarSpacer />
              <span className="tabular-nums">6 tasks, 2 for today</span>
            </Toolbar>
          ) : (
            <span className="tabular-nums">6 tasks, 2 for today</span>
          )
        }
      >
        <div className="flex min-w-max items-start gap-3 p-4">
          {lanes.map(([name, cards]) => (
            <div key={name} className="flex w-56 flex-col gap-2 rounded-lg bg-paper-2 p-2">
              <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
                {name}
                <span className="text-2xs font-normal text-ink-mute tabular-nums">{cards.length}</span>
              </h3>
              {cards.map(([task, due]) => (
                <div key={task} className="flex flex-col gap-1 rounded-md bg-raised p-2 text-sm text-ink shadow-xs">
                  {task}
                  <span className={cn('text-2xs', due === 'Today' ? 'font-medium text-accent' : 'text-ink-mute')}>{due}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </AppShell>
    ),
    focus: (
      <AppShell
        desktop
        contentLabel="The task in focus"
        titleBar={bar(
          'Focus',
          <>
            <ToolbarButton label="Leave the focus" icon={<ChevronRight aria-hidden="true" className="rotate-180" />} keepWord>
              Leave the focus
            </ToolbarButton>
            <ToolbarSpacer />
            <span className="text-2xs text-ink-mute tabular-nums">2 of 7</span>
            <ToolbarSpacer />
          </>,
        )}
      >
        <div className="flex h-full items-center justify-center p-6">
          <div className="flex max-w-sm flex-col gap-2">
            <h1 className="text-xl font-semibold text-ink">Call the plumber</h1>
            <p className="text-sm text-ink-mute">A leak under the sink. Before noon, when the shop answers.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button>Done</Button>
              <Button variant="outline">Later</Button>
              <Button variant="ghost">Skip</Button>
            </div>
          </div>
        </div>
      </AppShell>
    ),
  }
  return (
    <Section id="patterns" icon="column" title="Layout patterns" note="Complete screens made only of the toolkit's parts, to start from: recommendations, not rules (docs/patterns.md). Each sits in the one frame (AppShell), which measures its own width: from 1000px the inspector is docked, under it a panel over the content; from 850px the sidebar is whole, from 620px a rail, under 620px a drawer opened from the bar. An app can pass its own steps. The frames here are desktop ones: what opens over them (the inspector's panel, the sidebar's drawer, a menu) stays under their title bar.">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup aria-label="Pattern" value={pattern} onValueChange={(v) => v && setPattern(v as PatternId)} animated={animated}>
          {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
            <ToggleGroupItem key={id} value={id}>
              {PATTERNS[id].name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          aria-label="Width of the frame"
          value={width}
          onValueChange={(v) => {
            if (!v) return
            setWidth(v)
          }}
          animated={animated}
        >
          <ToggleGroupItem value="1040">1040</ToggleGroupItem>
          <ToggleGroupItem value="900">900</ToggleGroupItem>
          <ToggleGroupItem value="700">700</ToggleGroupItem>
          <ToggleGroupItem value="480">480</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup aria-label="Style of the bar" value={barStyle} onValueChange={(v) => v && setBarStyle(v as typeof barStyle)} animated={animated}>
          <ToggleGroupItem value="regular">Regular bar</ToggleGroupItem>
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
          <ToggleGroupItem value="classic">Classic menus</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Where the views are"
          value={tabsAt}
          onValueChange={(v) => {
            if (!v) return
            setTabsAt(v as typeof tabsAt)
            setPattern('board')
          }}
          animated={animated}
        >
          <ToggleGroupItem value="bar">Tabs in the bar</ToggleGroupItem>
          <ToggleGroupItem value="under">Under the bar</ToggleGroupItem>
          <ToggleGroupItem value="bottom">Bottom bar</ToggleGroupItem>
          <ToggleGroupItem value="status">Status bar</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p data-sample="pattern-advice" className="max-w-3xl text-sm text-ink-soft">
        <span className="font-semibold text-ink">{PATTERNS[pattern].name}.</span> {PATTERNS[pattern].advice}
      </p>
      <div className="max-w-full overflow-x-auto p-1 pb-6">
        <div data-sample="app-shell" style={{ width: `${width}px` }} className="h-112 overflow-hidden rounded-lg shadow-lg">
          {frames[pattern]}
        </div>
      </div>
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
        <span className="rounded-md bg-info-soft px-2 py-1 text-sm text-info">Queued</span>
        <span className="text-sm">
          A <mark className="bg-highlight text-ink">match</mark> inside a text
        </span>
      </Row>
    </Section>
  )
}

/** The labels of a task, after its day and its repeat. */
const TASK_LABELS = ['Kitchen', 'Calls', 'Errands', 'Waiting', 'Someday']

function OverflowLists() {
  const details = (
    <OverflowList className="h-5 gap-x-2 text-xs text-ink-mute">
      <span className="min-w-0 truncate text-accent">Today 09:00</span>
      <span>Every Monday</span>
      {TASK_LABELS.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
    </OverflowList>
  )
  const frame = (width: string, sample: string) => (
    <div data-sample={sample} className={cn('max-w-full rounded-md border border-line p-2', width)}>
      {details}
    </div>
  )
  return (
    <Section
      id="overflow-list"
      title="OverflowList"
      note="One line of details that never grows: what does not fit is cut from the end, whole, and counted after the line. The first item always stays. A cut item takes no focus and is not read; the count is read («4 more»). The same items in three frames: drag the corner of the last one and the count follows the width."
    >
      <Row label="narrow">{frame('w-48', 'overflow-narrow')}</Row>
      <Row label="wide">{frame('w-96', 'overflow-wide')}</Row>
      <Row label="any width">
        <div data-sample="overflow-resize" className="w-72 max-w-full min-w-24 resize-x overflow-hidden rounded-md border border-line p-2">
          {details}
        </div>
      </Row>
    </Section>
  )
}

/** A project's files: two folders given whole, one whose rows load when it opens (and fail the first time). */
const TREE_FILES: readonly TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    icon: 'folder',
    openIcon: 'folderOpen',
    children: [
      { id: 'src/components', name: 'components', icon: 'folder', openIcon: 'folderOpen', children: [
        { id: 'src/components/button.tsx', name: 'button.tsx', icon: 'file', meta: '6 KB' },
        { id: 'src/components/tree.tsx', name: 'tree.tsx', icon: 'file', meta: '14 KB' },
      ] },
      { id: 'src/index.ts', name: 'index.ts', icon: 'file', meta: '9 KB' },
    ],
  },
  { id: 'docs', name: 'docs', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'docs/patterns.md', name: 'patterns.md', icon: 'file', meta: '21 KB' }] },
  { id: 'remote', name: 'remote', icon: 'folder', openIcon: 'folderOpen', hasChildren: true },
  { id: 'package.json', name: 'package.json', icon: 'file', meta: '3 KB' },
  { id: 'README.md', name: 'README.md', icon: 'file', meta: '30 KB' },
]

/** The same files with one that cannot be touched, for the tree that follows the focus. */
const TREE_FILES_DISABLED: readonly TreeNode[] = [
  { id: 'notes.md', name: 'notes.md', icon: 'file', meta: '2 KB' },
  { id: 'plan.md', name: 'plan.md', icon: 'file', meta: '5 KB' },
  { id: 'secret.env', name: 'secret.env', icon: 'file', meta: '1 KB', disabled: true },
  { id: 'report.md', name: 'report.md', icon: 'file', meta: '12 KB' },
]

/** Five thousand files in fifty folders of a hundred, for the tree that draws only the rows in sight. */
const TREE_MANY: readonly TreeNode[] = Array.from({ length: 50 }, (_, folder): TreeNode => ({
  id: `folder-${folder}`,
  name: `folder ${folder + 1}`,
  icon: 'folder',
  openIcon: 'folderOpen',
  children: Array.from({ length: 100 }, (_, file): TreeNode => ({ id: `folder-${folder}/file-${file}`, name: `file ${folder + 1}.${file + 1}`, icon: 'file' })),
}))

/** An outline: no icons, and a count of what each part holds (R5). */
const TREE_OUTLINE: readonly TreeNode[] = [
  { id: 'intro', name: 'Introduction', children: [{ id: 'intro/why', name: 'Why a toolkit' }, { id: 'intro/how', name: 'How to read it' }] },
  { id: 'rules', name: 'The rules', count: 14 },
  { id: 'parts', name: 'The parts', count: 62 },
]

/** The rows of `remote`, after a second: the first try fails, so the row says so and the next opening tries again. */
function remoteRows(): (node: TreeNode) => Promise<readonly TreeNode[]> {
  let tries = 0
  return () =>
    new Promise((done, fail) => {
      tries += 1
      const first = tries === 1
      setTimeout(() => (first ? fail(new Error('offline')) : done([
        { id: 'remote/main', name: 'main', icon: 'folder', openIcon: 'folderOpen', children: [{ id: 'remote/main/build.log', name: 'build.log', icon: 'file', meta: '120 KB' }] },
        { id: 'remote/release.yml', name: 'release.yml', icon: 'file', meta: '2 KB' },
      ])), 1000)
    })
}

/** The app's own filter: the whole path holds the text. The same function counts the finds. */
const byPath = (node: TreeNode, text: string) => node.id.toLowerCase().includes(text.trim().toLowerCase())
const treeNodes = (list: readonly TreeNode[]): TreeNode[] => list.flatMap((node) => [node, ...treeNodes(node.children ?? [])])

function Trees({ animated }: { animated: boolean }) {
  const [chosen, setChosen] = React.useState<string | null>('src/components/tree.tsx')
  const [path, setPath] = React.useState('src/comp')
  const [opened, setOpened] = React.useState<string | null>(null)
  const load = React.useMemo(remoteRows, [])
  const finds = path.trim() === '' ? null : treeNodes(TREE_FILES).filter((node) => byPath(node, path)).length
  return (
    <Section
      id="tree"
      title="Tree"
      note="Nested rows on Ark UI's TreeView, for files and folders or any hierarchy: a name, one of Sigrid's icons (a folder that opens shows open), a short fact in tabular figures, a count. The rows of every list of things: the chosen one has the tint and the accent bar. One Tab stop; the arrows move, open and close, Home and End reach the ends, the first letters typed reach a name, Enter or a press chooses. A branch whose rows the app loads says «Loading», and if the load fails it says so and stays closed: opening it again tries again (here the first try fails). The field filters by name, opens what leads to a find, and gives back what the person had opened when it is cleared; an app can drive the filter and find by its own rule (here the path)."
    >
      <Row label="with a filter">
        <div data-sample="tree" className="flex h-96 w-72 max-w-full flex-col rounded-lg bg-raised p-2 shadow-sm">
          <Tree aria-label="Sample files" nodes={TREE_FILES} search selected={chosen} onSelect={setChosen} defaultExpanded={['src', 'src/components']} loadChildren={load} animated={animated} className="h-full" />
        </div>
      </Row>
      <Row label="the app's filter, by path">
        <div className="flex h-96 w-72 max-w-full flex-col gap-2 rounded-lg bg-raised p-2 shadow-sm">
          <SearchField value={path} onValueChange={setPath} aria-label="Find a file by path" placeholder="Find a file by path" className="shrink-0" />
          <p role="status" className="px-(--row-pad) text-xs text-ink-mute tabular-nums">{finds === null ? 'Every file' : `${finds} found`}</p>
          <Tree aria-label="Sample files by path" nodes={TREE_FILES} query={path} match={byPath} loadChildren={load} animated={animated} className="min-h-0 flex-1" />
        </div>
      </Row>
      <Row label="a list and its details: the choice follows the focus, Enter opens, a row is disabled">
        <div data-sample="tree-follow" className="flex h-64 w-72 max-w-full flex-col rounded-lg bg-raised p-2 shadow-sm">
          <Tree aria-label="Sample files that follow the focus" nodes={TREE_FILES_DISABLED} followFocus onOpen={(id) => setOpened(id)} animated={animated} className="h-full" />
        </div>
        <Text as="p" variant="note">{opened === null ? 'Press Enter on a file to open it' : `Opened ${opened}`}</Text>
      </Row>
      <Row label="five thousand rows (virtual)">
        <div data-sample="tree-virtual" className="flex h-64 w-72 max-w-full flex-col rounded-lg bg-raised p-2 shadow-sm">
          <Tree aria-label="Five thousand rows" nodes={TREE_MANY} virtual defaultExpanded={TREE_MANY.map((node) => node.id)} animated={animated} className="h-full" />
        </div>
      </Row>
      <Row label="no icons">
        <div className="w-60">
          <Tree aria-label="Sample outline" nodes={TREE_OUTLINE} defaultExpanded={['intro']} animated={animated} />
        </div>
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
  const [site, setSite] = React.useState('example.com')
  const [shown, setShown] = React.useState(false)
  const [person, setPerson] = React.useState<string | null>('ada')
  const [labels, setLabels] = React.useState(['Home'])
  const [panel, setPanel] = React.useState(false)
  return (
    <Section id="pickers" title="Slider, SearchField, InputGroup, CopyButton, Disclosure, Combobox, Avatar" note="A value on a scale; a search box with its clear button; a field with words or a small button inside it; a button that copies and says so; a row that opens in place what few people need; a choice from a list filtered while typing; a person as a neutral round tile.">
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
      <Row label="search, quiet (in a bar)">
        <div data-sample="search-quiet" className="flex items-center gap-2 rounded-md bg-paper-2 p-2">
          <SearchField variant="quiet" aria-label="Sample quiet search" placeholder="Search" value={query} onValueChange={setQuery} className="w-64" />
        </div>
        <SearchField variant="quiet" aria-label="Sample empty quiet search" placeholder="Search" value="" onValueChange={() => {}} className="w-64" />
      </Row>
      <Row label="field with parts">
        <FormField label="Site" className="w-64">
          <InputGroup start={<InputGroupText>https://</InputGroupText>} end={<CopyButton value={`https://${site}`} label="Copy the address" />} value={site} onChange={(event) => setSite(event.target.value)} />
        </FormField>
        <FormField label="Password" className="w-64">
          <InputGroup type={shown ? 'text' : 'password'} defaultValue="correct horse" end={<InputGroupButton label="Show" pressed={shown} onClick={() => setShown(!shown)} />} />
        </FormField>
        <FormField label="Weight" error="Write a number." className="w-64">
          <InputGroup defaultValue="heavy" end={<InputGroupText>kg</InputGroupText>} />
        </FormField>
        <FormField label="Coupon" className="w-64">
          <InputGroup disabled defaultValue="SPRING" end={<InputGroupButton label="Apply" />} />
        </FormField>
      </Row>
      <Row label="copy">
        <CopyButton value="SIGRID-2026" label="Copy the code" />
        <CopyButton value="SIGRID-2026" label="Copy the code" showLabel variant="outline" />
        <CopyButton value="SIGRID-2026" label="Copy the code" showLabel disabled />
      </Row>
      <Row label="disclosure">
        <div className="flex w-64 flex-col gap-3">
          <FormField label="Name">
            <Input defaultValue="Quarterly report" />
          </FormField>
          <Disclosure label="Add a note">
            <FormField label="Note">
              <Input placeholder="For whoever opens it" />
            </FormField>
          </Disclosure>
        </div>
        <div className="flex w-64 flex-col gap-3">
          <Disclosure label="Advanced" summary="2 set" defaultOpen>
            <FormField label="Retention" help="Days before a file is removed.">
              <InputGroup defaultValue="30" end={<InputGroupText>days</InputGroupText>} />
            </FormField>
          </Disclosure>
        </div>
        <Disclosure label="Not available" disabled>
          <span />
        </Disclosure>
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
      <Row label="logo: a small square picture, with the icon it falls back to">
        <Logo src={PIXEL} name="Sample service" />
        <Logo src={PIXEL} name="Sample service, larger" size="md" />
        {/* An address that answers nothing: the icon stays in the box. */}
        <Logo src="missing-logo.svg" icon="layers" name="A service whose picture is missing" />
        <div className="flex items-center gap-2">
          <Logo src={PIXEL} icon="package" decorative />
          <span className="text-sm">Sample library</span>
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

/** The hover background that glides from row to row: over an app's own rows of two heights (`HoverFollow`), and in an `ItemList`. */
function HoverRows({ animated }: { animated: boolean }) {
  const [list, setList] = React.useState<HTMLUListElement | null>(null)
  const [chosen, setChosen] = React.useState('Receipt')
  return (
    <Section id="hover" title="Hover background" note="With animations one background follows the mouse from row to row, also between rows of different heights; without, each row has its own. ItemList has it by itself; HoverFollow gives it to rows of an app's own.">
      <Row label="rows of an app's own">
        <ul ref={setList} data-sample="hover-rows" className="flex w-64 flex-col gap-0.5">
          {['Overview', 'Documents', 'Shared with me', 'Quarterly report', 'Archive'].map((name, i) => (
            <li key={name} data-hover-row="" className={`relative flex items-center rounded-md px-2 text-sm hover:bg-selected/60 [[data-hover-follow]_&]:hover:bg-transparent ${i === 2 || i === 3 ? 'h-7 ps-6' : 'h-9'}`}>
              {name}
            </li>
          ))}
          <HoverFollow container={list} rows="[data-hover-row]" as="li" animated={animated} />
        </ul>
      </Row>
      <Row label="a list of things">
        <ItemList aria-label="Sample messages" animated={animated} className="w-80">
          {['Kitchen quote', 'Receipt', 'Invoice for March'].map((name) => (
            <ItemRow key={name} title={name} description={name === 'Receipt' ? 'City parking' : undefined} current={chosen === name} onClick={() => setChosen(name)} />
          ))}
        </ItemList>
      </Row>
    </Section>
  )
}

/** A card that hangs from a search field, not from a button: the field keeps the focus, and a press on it keeps the card. */
function FieldPopover({ animated }: { animated: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor className="w-64">
        <SearchField aria-label="Sample search with filters" placeholder="Search, then choose a filter" value={query} onValueChange={setQuery} onFocus={() => setOpen(true)} />
      </PopoverAnchor>
      <PopoverContent initialFocus={false} width="md" data-sample="popover-field" animated={animated}>
        <PopoverHeader>
          <PopoverTitle>Filters</PopoverTitle>
          <PopoverDescription>The field keeps the focus while this is open; Esc or a press elsewhere closes it, with a fade.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
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
      <Row label="under a field">
        <FieldPopover animated={animated} />
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

/**
 * A curated palette for the sample of the stated control border: cool gray surfaces with a blue accent. `stated` adds
 * the control border the palette states (`Surfaces.input`); without it the engine derives one from the dividers.
 */
function samplePalette(stated: boolean): ThemeDef {
  return {
    id: stated ? 'sample-stated' : 'sample-derived', label: stated ? 'Stated' : 'Derived', hue: 255, chroma: 0.012, accent: [0.07, 230], sidebar: 'tenue', palette: 'soft',
    surfaces: {
      light: { paper: '#f2f4f8', sidebar: '#e9ecf2', raised: '#ffffff', line: '#d8dee9', ink: '#2e3440', accent: '#5e81ac', fill: '#5e81ac', ...(stated ? { input: '#7b8494' } : {}) },
      dark: { paper: '#2e3440', sidebar: '#272c36', raised: '#373e4c', line: '#434c5e', ink: '#eceff4', accent: '#88c0d0', fill: '#88c0d0', ...(stated ? { input: '#9aa3b5' } : {}) },
    },
  }
}

/** One palette on a frame of its own, with a box to tick on a chosen row and the contrast of its border there, as the engine computed it. */
function ControlBorderFrame({ stated, scheme }: { stated: boolean; scheme: ThemeScheme }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (ref.current) applyTheme(ref.current, { theme: samplePalette(stated), scheme, tone: AS_CHOSEN })
  }, [stated, scheme])
  const colors = tokensFor(samplePalette(stated), scheme, AS_CHOSEN).colors
  const ratio = contrast(colors['input']!, colors['selected']!).toFixed(2)
  return (
    <Cell label={`${stated ? 'stated' : 'derived'}: ${ratio}:1 on the chosen row`}>
      <div ref={ref} data-sample={`control-border-${stated ? 'stated' : 'derived'}`} className="w-72 rounded-lg bg-paper p-2 text-ink shadow-xs">
        <ItemList aria-label={stated ? 'Stated control border' : 'Derived control border'}>
          <ItemRow title="Pay the rent" current control={<Checkbox aria-label="Complete «Pay the rent»" />} />
          <ItemRow title="Call the plumber" control={<Checkbox aria-label="Complete «Call the plumber»" />} />
        </ItemList>
      </div>
    </Cell>
  )
}

/** The views of a bar and a segment under bold tabs, with a choice that moves, so the line and the pill are seen moving. */
function BoldTabsSample({ animated }: { animated: boolean }) {
  const [view, setView] = React.useState('cleanup')
  const [filter, setFilter] = React.useState('all')
  return (
    <div data-tabs="bold" data-sample="hook-tabs" className="flex w-full max-w-xl flex-col gap-4">
      <div className="rounded-lg bg-sidebar-paper">
        <Toolbar aria-label="Sample bar with bold tabs">
          <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
            <ToolbarTab value="cleanup">Cleanup</ToolbarTab>
            <ToolbarTab value="registry">Registry</ToolbarTab>
            <ToolbarTab value="services">Services and memory</ToolbarTab>
            <ToolbarTab value="off" disabled>
              Developers
            </ToolbarTab>
          </ToolbarTabs>
        </Toolbar>
      </div>
      <ToggleGroup aria-label="Filter" value={filter} onValueChange={setFilter} animated={animated}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="chosen">Chosen</ToggleGroupItem>
        <ToggleGroupItem value="attention">Attention</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

/** The looks a theme asks for by name (2026-11-24), each drawn under its own attribute so it shows whatever Look says. */
function ThemeHooks({ scheme, animated }: { scheme: ThemeScheme; animated: boolean }) {
  return (
    <Section id="theme-hooks" title="Looks a theme asks for" note="Four looks that are off unless a theme asks for them by name: boxed keys (keys), a status tone on a badge, strong control borders (controls) and a control border the palette states (surfaces.input). «Look» turns the first and the third on for the whole page. Also bold tabs (tabs), a tall status strip (statusStrip) and the system's font, each with its switch in «Look»; the strip is seen in the frames of «Layout patterns». «Glass» (material) lets what is behind the window show through the ground of this page's frame: in a browser tab that is the browser's canvas, in a transparent window the system's material.">
      <Row label="bold tabs">
        <BoldTabsSample animated={animated} />
      </Row>
      <Row label="boxed keys">
        <div data-keys="boxed" data-sample="hook-keys" className="flex flex-wrap items-center gap-4">
          <Kbd>Ctrl K</Kbd>
          <Shortcut keys={['Ctrl', 'Enter']} />
          <Shortcut keys={['G', 'T']} separator="then" />
          <Button>
            Send
            <Kbd>Enter</Kbd>
          </Button>
          <Button variant="outline">
            Save
            <Kbd>S</Kbd>
          </Button>
          <p className="text-sm text-ink-soft">
            Press <Kbd>N</Kbd> to add an item, <Kbd>Z</Kbd> to undo.
          </p>
        </div>
      </Row>
      <Row label="boxed keys, in a bar">
        <div data-keys="boxed" data-controls="strong" data-sample="hook-keys-bar" className="w-full max-w-xl">
          <Toolbar aria-label="Sample bar with keys">
            <ToolbarButton label="Commands" variant="quiet" shortcut="Ctrl K">
              Commands
            </ToolbarButton>
            <ToolbarButton label="Export" variant="outline">
              Export
            </ToolbarButton>
            <ToolbarButton label="Save" variant="default" shortcut="Ctrl S">
              Save
            </ToolbarButton>
            <ToolbarSpacer />
            <ToolbarSearch closed="field" label="Search" shortcut="Ctrl F" value="" onValueChange={() => {}} />
          </Toolbar>
        </div>
      </Row>
      <Row label="badge tone">
        {TONE_SAMPLES.map(([tone, word]) => (
          <Badge key={tone} tone={tone}>
            {word}
          </Badge>
        ))}
        <Badge variant="secondary">Draft</Badge>
      </Row>
      <Row label="strong control borders">
        <div data-controls="strong" data-sample="hook-controls" className="flex flex-wrap items-start gap-4">
          <Input aria-label="Sample strong border" defaultValue="Quarterly report" className="w-56" />
          <Input aria-label="Sample strong border, invalid" defaultValue="Quarterly report" aria-invalid className="w-56" />
          <Button variant="outline">Reply</Button>
        </div>
      </Row>
      <Row label="stated control border">
        <ControlBorderFrame stated={false} scheme={scheme} />
        <ControlBorderFrame stated scheme={scheme} />
      </Row>
    </Section>
  )
}

/**
 * The parts an app composes a screen of with no class of its own, beside the layout parts: a card, a heading, a dot, a
 * line, the facts of one thing, a choice of a settings page, a row of the sidebar's head or foot, the button that opens
 * the sidebar's drawer; and the props that spare a class (`Empty fill`, `ToggleGroup fill`, `Progress inline`,
 * `Checkbox label`). Each sample is written as an app writes it.
 */
function Composition({ animated }: { animated: boolean }) {
  const [when, setWhen] = React.useState('today')
  const [reminders, setReminders] = React.useState(true)
  return (
    <Section
      id="composition"
      title="Card, Heading, Dot, Separator, DescriptionList, SettingRow, SidebarRow and DrawerButton"
      note="The parts the example apps needed to write no class: a group on a surface of its own (raised, or the quiet fill; never a border, and not for every group), the title of a page, a section, a card or a group, a colour or a state as an 8px dot beside its word, a hairline between groups, the facts of one thing, a choice of a settings page, a row of the sidebar's head or foot, the button that opens the sidebar where it is a drawer. Under them, the props that spare a class: an empty view that fills its region, a segment control that fills its place, a bar in a line of words, a check box with its words."
    >
      <Row label="card and heading">
        <SampleCard as="section" aria-label="Now">
          <Heading size="label" level={3} icon={<Icon name="now" />}>
            Now
          </Heading>
          <Heading size="small" level={4}>
            Read the terms of the new contract
          </Heading>
          <Cluster>
            <Button>Complete</Button>
            <Button variant="ghost">Postpone</Button>
          </Cluster>
        </SampleCard>
        <SampleCard variant="quiet" pad="sm" gap="sm">
          <Heading size="label" level={3}>
            Home
          </Heading>
          <SampleCard pad="sm">Kitchen renovation</SampleCard>
          <SampleCard pad="sm">Electricity contract</SampleCard>
        </SampleCard>
        <Column gap="xs">
          <Heading size="page" level={3}>
            Page
          </Heading>
          <Heading size="section" level={3}>
            Section
          </Heading>
          <Heading size="card" level={3}>
            Card
          </Heading>
          <Heading size="small" level={3}>
            Small
          </Heading>
        </Column>
      </Row>
      <Row label="dot, line and facts">
        <Column gap="sm">
          <Cluster gap="xs">
            <Dot color={COLORS[3]} />
            <Text>A colour the person chose</Text>
          </Cluster>
          <Cluster gap="xs">
            <Dot tone="success" />
            <Text>Resources: available</Text>
          </Cluster>
          <Cluster gap="xs">
            <Dot tone="warning" />
            <Text>Waiting for an answer</Text>
          </Cluster>
          <Separator />
          <DescriptionList
            aria-label="Item"
            items={[
              { name: 'Level', value: 'Recommended' },
              { name: 'Mode', value: 'Permanently' },
              { name: 'Path', value: '%LOCALAPPDATA%\\npm-cache', code: true },
            ]}
          />
        </Column>
      </Row>
      <Row label="settings and sidebar">
        {/* The gallery gives each sample its place, as in the other rows: a settings page's width, a sidebar's. */}
        <div className="w-full max-w-md">
          <Column>
            <SettingRow label="Scheme" control={<ToggleGroup aria-label="Scheme" value={when} onValueChange={setWhen} animated={animated}><ToggleGroupItem value="today">Light</ToggleGroupItem><ToggleGroupItem value="dark">Dark</ToggleGroupItem></ToggleGroup>} />
            <SettingRow label="Reminders" description="A notice at 9:00 for what is due" control={<Switch aria-label="Reminders" checked={reminders} onCheckedChange={setReminders} animated={animated} />} />
            <SettingRow label="Advanced" onClick={() => {}} />
          </Column>
        </div>
        <div className="w-64">
          <Column gap="xs">
            <SidebarRow leading={<Avatar name="Giulia Conti" size="xs" decorative />}>Giulia Conti</SidebarRow>
            <SidebarRow end={<Button variant="ghost" size="xs" aria-label="Close every thread"><Icon name="close" /></Button>}>Threads</SidebarRow>
            <Toolbar aria-label="Bar of a narrow frame">
              <AppShellContext.Provider value={{ sidebar: 'drawer', inspector: 'drawer' }}>
                <DrawerButton onOpen={() => {}} animated={animated} />
              </AppShellContext.Provider>
              <ToolbarBrand name="Tasks" page="Today" />
            </Toolbar>
          </Column>
        </div>
      </Row>
      <Row label="the props">
        <Column gap="md">
          <ToggleGroup aria-label="When" value={when} onValueChange={setWhen} fill animated={animated}>
            <ToggleGroupItem value="today">Today</ToggleGroupItem>
            <ToggleGroupItem value="tomorrow">Tomorrow</ToggleGroupItem>
            <ToggleGroupItem value="week">In a week</ToggleGroupItem>
          </ToggleGroup>
          <Cluster wrap={false}>
            <Badge variant="secondary">Analyzing</Badge>
            <Progress aria-label="Analysis" value={36} size="sm" inline />
            <Text>36%</Text>
          </Cluster>
          <Checkbox label="Print the contract" defaultChecked animated={animated} />
          <Empty fill title="Nothing here" description="An empty view, as tall as its region." />
        </Column>
      </Row>
    </Section>
  )
}

/** The tasks of the sample of a row with a control. */
const PANE_TASKS = [
  { id: 'terms', title: 'Read the terms of the new contract', facts: [{ text: '@home', color: COLORS[3] }, { text: 'Electricity contract' }, { text: 'Today', tone: 'accent' as const }, { text: '1/3', numeric: true }, { text: 'P1', tone: 'strong' as const }] },
  { id: 'quote', title: 'Ask the carpenter for a quote', facts: [{ text: 'Kitchen renovation' }, { text: 'Today', tone: 'accent' as const }] },
  { id: 'pass', title: 'Renew the transit pass', facts: [{ text: 'Fri 20 Nov' }, { text: 'P2', tone: 'strong' as const }] },
]

/**
 * The parts that let the example apps go to no class at all: a row of a list with one control beside its button
 * (`ItemRow control`, with its `facts`), two panes in the content (`ContentSplit`), a long list as tall as its region
 * (`VirtualList fill`) and a sheet of a named width (`SheetContent width`). Each sample is written as an app writes it;
 * the boxes around them are the gallery's, to give a pane a height and a width.
 */
function CompositionPanes({ animated }: { animated: boolean }) {
  const [chosen, setChosen] = React.useState<string | null>('terms')
  const [ticked, setTicked] = React.useState<readonly string[]>([])
  const [show, setShow] = React.useState<'aside' | 'main'>('main')
  const [panes, setPanes] = React.useState<1 | 2>(2)
  const [width, setWidth] = React.useState<SheetWidth | null>(null)
  const task = PANE_TASKS.find((t) => t.id === chosen)
  const rows = (
    <ItemList aria-label="Today">
      {PANE_TASKS.map((t) => (
        <ItemRow
          key={t.id}
          title={t.title}
          facts={t.facts}
          current={chosen === t.id && panes === 2}
          onClick={() => {
            setChosen(t.id)
            setShow('main')
          }}
          control={<Checkbox aria-label={`Complete «${t.title}»`} checked={ticked.includes(t.id)} onCheckedChange={(on) => setTicked((list) => (on === true ? [...list, t.id] : list.filter((id) => id !== t.id)))} animated={animated} />}
        />
      ))}
    </ItemList>
  )
  return (
    <Section
      id="composition-panes"
      title="ItemRow with a control, ContentSplit, SplitPane, VirtualList fill and SheetContent width"
      note="A thing one both ticks and opens: the box and the row are two tab stops, and a press on the box never opens the row; the facts under the title wrap. Two panes in the content: a column of a fixed width with the list, the thing chosen in the room that is left; the split measures itself, and where the two do not fit one is on screen (narrow the window, or look at 390px), with the way back the app's. A `SplitPane` is the same two panes with a divider the person moves (pointer, arrow keys, a double press to put it back). A long list as tall as its region, and a sheet at the side of a named width."
    >
      <Row label="a row with a control">
        <div data-sample="item-row-control" className="w-full max-w-md">
          {rows}
        </div>
      </Row>
      <Row label="two panes">
        <div data-sample="content-split" className="h-72 w-full max-w-3xl overflow-hidden rounded-lg border border-line">
          <ContentSplit aside={<Column pad="sm">{rows}</Column>} asideLabel="Tasks" show={show} onPanesChange={setPanes}>
            <Column gap="md" pad="lg">
              {panes === 1 ? (
                <Cluster>
                  <Button variant="ghost" size="sm" onClick={() => setShow('aside')}>
                    <Icon name="back" />
                    Today
                  </Button>
                </Cluster>
              ) : null}
              <Heading size="card" level={3}>
                {task?.title ?? 'Nothing chosen'}
              </Heading>
              <Text as="p" variant="soft">
                The thing chosen, read or worked on in the room the column leaves.
              </Text>
            </Column>
          </ContentSplit>
        </div>
      </Row>
      <Row label="two panes that move">
        <div data-sample="split-pane" className="h-56 w-full max-w-3xl overflow-hidden rounded-lg border border-line">
          <SplitPane start={<Column pad="sm">{rows}</Column>} startLabel="Tasks" endLabel="Task" label="Resize the task list" defaultSize={280}>
            <Column gap="md" pad="lg">
              <Heading size="card" level={3}>
                {task?.title ?? 'Nothing chosen'}
              </Heading>
              <Text as="p" variant="soft">
                Drag the line, or press an arrow key on it; a double press puts it back.
              </Text>
            </Column>
          </SplitPane>
        </div>
      </Row>
      <Row label="a long list that fills">
        <div data-sample="virtual-fill" className="h-64 w-full max-w-md rounded-lg border border-line">
          <VirtualList aria-label="Archive" count={5000} estimateSize={50} fill pad="sm">
            {(index) => <ItemRow title={`Message ${index + 1}`} description="Put away" meta={`${(index % 28) + 1} Oct`} />}
          </VirtualList>
        </div>
      </Row>
      <Row label="sheet width">
        <Cluster>
          {(['sm', 'md', 'lg'] as const).map((w) => (
            <Button key={w} variant="outline" onClick={() => setWidth(w)}>
              Open {w}
            </Button>
          ))}
        </Cluster>
        <Sheet open={width !== null} onOpenChange={(open) => (open ? undefined : setWidth(null))}>
          <SheetContent side="right" width={width ?? 'sm'} animated={animated}>
            <SheetHeader>
              <SheetTitle>A sheet, {width ?? 'sm'}</SheetTitle>
              <SheetDescription>sm 384px, md 448px, lg 512px; under the sm width of the window, three quarters of it.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
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

const CHAT_SUGGESTIONS = [
  { id: 'sum', label: 'Summarise the open tasks' },
  { id: 'late', label: 'What is late this week?' },
  { id: 'plan', label: 'Plan tomorrow in three steps', icon: 'tasks' as const },
]

type Turn = { id: number; from: 'user' | 'assistant'; text: string }

const FIRST_TURNS: ChatMessage[] = [
  { id: 'm1', from: 'user', text: 'Which invoices are still open?' },
  {
    id: 'm2',
    from: 'assistant',
    time: '10:42',
    reasoning: 'I look for invoices that were sent and have no payment against them.',
    reasoningSeconds: 3,
    tools: [{ id: 't1', name: 'Search invoices', summary: '2 results', input: '{ "paid": false }', output: '[{ "number": 104 }, { "number": 107 }]' }],
    text: 'Two invoices are open:\n\n- **104**, Acme, due on Friday\n- **107**, Globex, due next week',
  },
  { id: 'm3', from: 'user', text: 'Send a reminder for 104.' },
  { id: 'm4', from: 'assistant', text: '', tools: [{ id: 't2', name: 'Send the email', status: 'error', summary: 'no connection' }], error: 'The reminder was not sent' },
]

/** `Chat` wired to a model that is a timer: the app holds the messages and adds to them. */
function WholeChat() {
  const [messages, setMessages] = React.useState(FIRST_TURNS)
  const [busy, setBusy] = React.useState(false)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const answer = (after: ChatMessage[], about: string) => {
    const id = `a${Date.now()}`
    setMessages([...after, { id, from: 'assistant', text: '', reasoning: 'Reading the request…' }])
    setBusy(true)
    const patch = (part: Partial<ChatMessage>) => setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...part } : m)))
    timers.current = [
      setTimeout(() => patch({ reasoning: 'Reading the request. It is a sample, so I answer with its own words.', reasoningSeconds: 1, text: 'You asked:' }), 900),
      setTimeout(() => {
        patch({ text: `You asked: «${about}». This answer is a sample: the app writes the real one.`, time: 'now' })
        setBusy(false)
      }, 1800),
    ]
  }
  return (
    <Chat
      label="Chat about the invoices"
      messages={messages}
      busy={busy}
      onSend={(text) => answer([...messages, { id: `u${Date.now()}`, from: 'user', text }], text)}
      onStop={() => {
        timers.current.forEach(clearTimeout)
        setBusy(false)
      }}
      onRetry={(message) => answer(messages.filter((m) => m.id !== message.id), 'the same again')}
      onVote={(message, vote) => setMessages((all) => all.map((m) => (m.id === message.id ? { ...m, vote } : m)))}
      suggestions={[{ id: 's1', label: 'What is due this week?' }, { id: 's2', label: 'Draft a reminder' }]}
      placeholder="Ask about the invoices"
    />
  )
}

function ChatParts() {
  const [turns, setTurns] = React.useState<Turn[]>([
    { id: 1, from: 'user', text: 'What is late this week?' },
    { id: 2, from: 'assistant', text: 'Two tasks are past their date:\n\n- **Send the invoice** to Acme, due Monday\n- **Book the room** for the review, due yesterday\n\nThe rest of the week is on time.' },
  ])
  const [draft, setDraft] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [vote, setVote] = React.useState<'up' | 'down' | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const send = (text: string) => {
    setTurns((all) => [...all, { id: Date.now(), from: 'user', text }])
    setBusy(true)
    timer.current = setTimeout(() => {
      setTurns((all) => [...all, { id: Date.now(), from: 'assistant', text: `You asked: «${text}». This answer is a sample: the app writes the real one.` }])
      setBusy(false)
    }, 1500)
  }
  const stop = () => {
    clearTimeout(timer.current)
    setBusy(false)
  }
  return (
    <Section id="chat" title="Chat, Conversation, Message, PromptInput, Suggestions, Reasoning, ToolCall" note="A chat with an assistant: Chat is the whole of it, drawn from the messages the app holds; under it are its parts, for an app that needs another arrangement. The thread follows the latest message while the reader is at its end, and shows a button back to it when the reader goes up. What the user wrote is a quiet block at the end of the row; an answer is plain text on the page, with Markdown, and under it quiet actions that never change place. The field grows with the text up to eight lines; Enter sends and Shift+Enter makes a new line; its one button sends and, while an answer is written, stops it in the same place (R14). Suggestions are quiet chips that fill the field. A reasoning and a tool's call stay behind a row each. Nothing loops: no typing dots, no shimmer, no spinner.">
      <Row label="a conversation">
        <div className="flex h-96 w-full max-w-2xl flex-col gap-3">
          <Conversation label="Chat with the assistant" busy={busy}>
            {turns.map((turn, index) =>
              turn.from === 'user' ? (
                <Message key={turn.id} from="user">
                  {turn.text}
                </Message>
              ) : (
                <Message key={turn.id} from="assistant" time="10:42" copyText={turn.text} onRetry={() => {}} vote={index === 1 ? vote : undefined} onVote={index === 1 ? setVote : undefined}>
                  {index === 1 ? (
                    <>
                      <Reasoning seconds={4}>The user asks for what is late. I compare each due date with today and keep the ones before it.</Reasoning>
                      <ToolCall name="Search tasks" summary="2 results" input={'{ "due": "before:today", "done": false }'} output={'[{ "title": "Send the invoice" }, { "title": "Book the room" }]'} />
                      <MarkdownBlocks text={turn.text} />
                    </>
                  ) : (
                    turn.text
                  )}
                </Message>
              ),
            )}
            {busy ? <Reasoning busy>Reading the request…</Reasoning> : null}
          </Conversation>
          <Suggestions items={CHAT_SUGGESTIONS} onSelect={(item) => setDraft(item.label)} />
          <PromptInput
            value={draft}
            onValueChange={setDraft}
            onSubmit={send}
            busy={busy}
            onStop={stop}
            placeholder="Ask about your tasks"
            maxLength={2000}
            tools={
              <Tooltip label="Attach a file">
                <Button variant="ghost" size="icon-sm" aria-label="Attach a file">
                  <Icon name="attach" />
                </Button>
              </Tooltip>
            }
          />
        </div>
      </Row>
      <Row label="Chat: the whole of it, from data">
        <div className="flex h-96 w-full max-w-2xl flex-col">
          <WholeChat />
        </div>
      </Row>
      <Row label="a tool's call, its four states">
        <div className="flex w-full max-w-xl flex-col gap-1">
          <ToolCall name="Read the calendar" status="pending" />
          <ToolCall name="Search the web" status="running" summary="sigrid design tokens" />
          <ToolCall name="Read file" status="success" summary="src/app.ts" input="src/app.ts" output={'export function App() {\n  return null\n}'} />
          <ToolCall name="Send the email" status="error" summary="no connection" output="The server did not answer in 30 s." />
        </div>
      </Row>
    </Section>
  )
}

type Request = { id: string; who: string; what: string; when: string }
const REQUESTS: Request[] = [
  { id: 'r1', who: 'Ada Lovelace', what: 'Access to the billing project', when: 'Asked today' },
  { id: 'r2', who: 'Grace Hopper', what: 'A seat in the design tool', when: 'Asked yesterday' },
  { id: 'r3', who: 'Alan Turing', what: 'Two days of leave next week', when: 'Asked on Monday' },
]

function Deck() {
  const [left, setLeft] = React.useState(REQUESTS)
  const [last, setLast] = React.useState('')
  return (
    <Section id="swipe-deck" title="SwipeDeck" note="A pile decided one card at a time, each to one of two sides. Drag the card past the mark (or flick it), press the left or right arrow with the card in focus, or press one of the two buttons, which are always there: nothing depends on a gesture. The word of the side shows on the card when letting go would decide it. The app holds the cards and takes the decided one out; to take a decision back it puts the card first again. The card follows the finger at once; thrown, it leaves with a movement only with motion on.">
      <Row label="requests to review">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <SwipeDeck
            label="Requests to review"
            items={left}
            getKey={(item) => item.id}
            getLabel={(item) => `${item.who}: ${item.what}`}
            leftLabel="Refuse"
            rightLabel="Approve"
            leftIcon="close"
            rightIcon="check"
            onSwipe={(item, direction) => {
              setLeft((all) => all.filter((other) => other.id !== item.id))
              setLast(`${item.who}: ${direction === 'left' ? 'refused' : 'approved'}`)
            }}
            empty={<Empty title="All reviewed" action={<Button variant="outline" onClick={() => setLeft(REQUESTS)}>Start again</Button>} />}
          >
            {(item) => (
              <>
                <Text variant="note">{item.when}</Text>
                <Heading level={3}>{item.who}</Heading>
                <Text as="p">{item.what}</Text>
              </>
            )}
          </SwipeDeck>
          <Text variant="note">{last || 'Nothing decided yet.'}</Text>
        </div>
      </Row>
    </Section>
  )
}

function Confirms({ animated }: { animated: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [send, setSend] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState('Nothing done yet.')
  return (
    <Section id="confirm" title="ConfirmDialog" note="The question before an action that cannot be taken back, the same in every app: what will happen as the title, what is lost under it, Cancel (which has the focus, so Enter out of habit loses nothing) and the one button that does it, named by its verb. Red when it destroys something, the solid button otherwise; while the app does it the button waits and the window stays. Only for what cannot be undone: what can is done at once and offers Undo in a notice.">
      <Row label="it destroys">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Delete the project…
        </Button>
        <ConfirmDialog open={open} onOpenChange={setOpen} animated={animated} title="Delete «Budget 2026»?" description="Its 14 tasks are deleted too. This cannot be undone." confirmLabel="Delete the project" onConfirm={() => { setOpen(false); setDone('The project was deleted.') }} />
      </Row>
      <Row label="it cannot be recalled">
        <Button variant="outline" onClick={() => setSend(true)}>
          Send to everyone…
        </Button>
        <ConfirmDialog
          open={send}
          onOpenChange={setSend}
          animated={animated}
          destructive={false}
          busy={busy}
          title="Send to 240 people?"
          description="Once sent, the message cannot be taken back."
          confirmLabel="Send"
          onConfirm={() => {
            setBusy(true)
            setTimeout(() => { setBusy(false); setSend(false); setDone('The message was sent.') }, 1200)
          }}
        />
        <Text variant="note">{done}</Text>
      </Row>
    </Section>
  )
}

const SETUP_STEPS = [
  { id: 'who', label: 'You', title: 'What should we call you?', description: 'The name your team sees.' },
  { id: 'what', label: 'Goal', title: 'What brings you here?' },
  { id: 'check', label: 'Check', title: 'Check and start' },
]

function Wizards({ animated }: { animated: boolean }) {
  const [at, setAt] = React.useState(0)
  const [name, setName] = React.useState('')
  const [goal, setGoal] = React.useState('plan')
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState(false)
  return (
    <Section id="wizard" title="Wizard" note="A path of steps taken one at a time: one question on the screen, the path above it, and two buttons at its foot that never move. Back is off on the first step; the solid button says Continue until the last step and then the app's own word. A step not answered yet keeps the person there; a step already done is a button of the path, and going back loses no answer, since the answers are the app's. Enter in a field goes on. When the step changes its title takes the focus, and with motion on the step comes in from the side it was asked from.">
      <Row label="a first setup">
        <div className="w-full max-w-xl">
          {done ? (
            <Empty title={`Welcome, ${name}`} action={<Button variant="outline" onClick={() => { setDone(false); setAt(0) }}>Start again</Button>} />
          ) : (
            <Wizard
              label="Setup"
              animated={animated}
              steps={SETUP_STEPS.map((step) => (step.id === 'who' ? { ...step, canContinue: name.trim() !== '' } : step))}
              current={at}
              onCurrentChange={setAt}
              finishLabel="Start"
              busy={busy}
              onFinish={() => {
                setBusy(true)
                setTimeout(() => { setBusy(false); setDone(true) }, 900)
              }}
            >
              {(step) =>
                step.id === 'who' ? (
                  <FormField label="Name">
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada" />
                  </FormField>
                ) : step.id === 'what' ? (
                  <RadioGroup aria-label="Goal" value={goal} onValueChange={setGoal}>
                    <RadioGroupItem value="plan">Plan my week</RadioGroupItem>
                    <RadioGroupItem value="team">Work with a team</RadioGroupItem>
                    <RadioGroupItem value="look">Just looking</RadioGroupItem>
                  </RadioGroup>
                ) : (
                  <DescriptionList aria-label="What you chose" items={[{ name: 'Name', value: name }, { name: 'Goal', value: goal }]} />
                )
              }
            </Wizard>
          )}
        </div>
      </Row>
    </Section>
  )
}

function AuthForms({ animated }: { animated: boolean }) {
  const [mode, setMode] = React.useState<AuthMode>('signUp')
  const [busy, setBusy] = React.useState(false)
  const [sentTo, setSentTo] = React.useState<string | undefined>(undefined)
  const [error, setError] = React.useState<string | undefined>(undefined)
  const [last, setLast] = React.useState('Nothing sent yet.')
  return (
    <Section id="auth-form" title="AuthForm" note="The form a person signs in or signs up with, the same in every app, in three forms: an address and a password, the same with a name, or an address alone for a link that opens the account (the form then says where to look). The accounts kept elsewhere come first, each with its logo, then «or», then the fields. One solid button. What is wrong is said under its field when the form is sent, and the focus goes to the first; a refusal of the server is a note above the fields (sign in with wrong@example.com to see one). It asks for as little as it can: the rest is asked after, in a Wizard.">
      <Row label="the three forms">
        <div className="flex w-full flex-col gap-4">
          <AuthForm
            mode={mode}
            animated={animated}
            onModeChange={(next) => { setMode(next); setSentTo(undefined); setError(undefined) }}
            busy={busy}
            error={error}
            sentTo={sentTo}
            askName
            providers={[{ id: 'acme', name: 'Acme', icon: 'key' }, { id: 'globex', name: 'Globex', icon: 'globe' }]}
            onProvider={(id) => setLast(`Went on with ${id}.`)}
            onForgot={() => setMode('link')}
            onSubmit={(values, sent) => {
              setBusy(true)
              setError(undefined)
              setTimeout(() => {
                setBusy(false)
                if (sent === 'signIn' && values.email.startsWith('wrong')) setError('That address and password do not match')
                else if (sent === 'link') setSentTo(values.email)
                else setLast(`${sent}: ${values.email}${values.name ? `, ${values.name}` : ''}`)
              }, 900)
            }}
          />
          <Text variant="note">{last}</Text>
        </div>
      </Row>
    </Section>
  )
}

/** A picture drawn here, so the showcase needs no file: a ground, a sun and a hill, in the colours given. */
const drawn = (ground: string, sun: string, hill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="${ground}"/><circle cx="600" cy="150" r="60" fill="${sun}"/><path d="M0 400 Q200 250 400 380 T800 340 V500 H0Z" fill="${hill}"/></svg>`)}`
// design-check-ignore-next-line color-value: the colours of three sample pictures, which are content
const PICTURES = [
  // design-check-ignore-next-line color-value: a sample picture
  { id: 'p1', src: drawn('#cfe3f3', '#f6d98a', '#7fae8b'), alt: 'A hill under a morning sun', caption: 'The site from the north, in the morning.' },
  // design-check-ignore-next-line color-value: a sample picture
  { id: 'p2', src: drawn('#f3d9c4', '#e98b5b', '#8c6f5e'), alt: 'The same hill at sunset' },
  // design-check-ignore-next-line color-value: a sample picture
  { id: 'p3', src: drawn('#2c3550', '#e8e6da', '#1d2438'), alt: 'The hill at night', caption: 'After the lights were set.' },
]

function Lightboxes({ animated }: { animated: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [at, setAt] = React.useState(0)
  return (
    <Section id="lightbox" title="Lightbox" note="Pictures looked at one at a time, large: the picture whole and never cropped, its caption, where it is among the others, and two buttons to the one before and the one after, which stay in their places and are off at the two ends. The left and right arrows do the same; Esc closes. A file with pages, zoom and «open the original» is an AttachmentViewer.">
      <Row label="three pictures">
        <div className="flex flex-wrap gap-2">
          {PICTURES.map((picture, index) => (
            <button key={picture.id} type="button" aria-label={`Open: ${picture.alt}`} onClick={() => { setAt(index); setOpen(true) }} className="h-20 w-32 overflow-hidden rounded-md shadow-xs outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <img src={picture.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
        <Lightbox open={open} onOpenChange={setOpen} animated={animated} title="Photos of the site" images={PICTURES} index={at} onIndexChange={setAt} />
      </Row>
    </Section>
  )
}

/** The curve and the pace, where the movements are shown: the same two choices as in Look. */
function MotionFeelSection({ animated, ease, onEase, pace, onPace }: { animated: boolean; ease: MotionEase; onEase: (ease: MotionEase) => void; pace: number; onPace: (pace: number) => void }) {
  const [far, setFar] = React.useState(false)
  return (
    <Section id="motion-feel" title="The feel: curve and pace" note="How the toolkit moves is the app's choice, once for the whole page: the curve of every movement (one of the four of CSS, ease-in-out at first, or Fluent's own, one for each kind of movement) and the pace, a multiple of the toolkit's times (100, 150 and 200ms). Choose here, or in Look, and try the sections below: every movement follows. Nothing moves with animations off, or where the system asks for less motion.">
      <Row label="the curve">
        <ToggleGroup aria-label="Curve of the movements" value={ease} onValueChange={(v) => isMotionEase(v) && onEase(v)} animated={animated}>
          {MOTION_EASE_NAMES.map((name) => (
            <ToggleGroupItem key={name} value={name}>
              {name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
      <Row label="the pace">
        <ToggleGroup aria-label="Pace" value={String(pace)} onValueChange={(v) => onPace(Number(v))} animated={animated}>
          {[['0.5', 'Twice as quick'], ['0.75', 'Quick'], ['1', 'Normal'], ['1.5', 'Slow'], ['2', 'Slower']].map(([value, label]) => (
            <ToggleGroupItem key={value} value={value!}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
      <Row label="one movement, to see it">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <Button variant="outline" className="self-start" animated={animated} onClick={() => setFar(!far)}>
            Move it
          </Button>
          {/* The block crosses its track on the curve and in the time chosen (the variables the toolkit's own movements read). */}
          <div className="rounded-md bg-paper-2 p-1">
            <div data-sample="motion-block" style={{ marginInlineStart: far ? 'calc(100% - 3rem)' : '0', transition: animated ? 'margin-inline-start var(--motion-normal) var(--motion-ease-move)' : 'none' }} className="size-12 rounded-md bg-primary" />
          </div>
        </div>
      </Row>
    </Section>
  )
}

function MotionOpens({ animated }: { animated: boolean }) {
  const [busy, setBusy] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)
  const [place, setPlace] = React.useState('inbox')
  return (
    <Section id="motion-open" title="What opens in place" note="A row that opens, a branch, a group of the sidebar and the sidebar itself glide open and shut, and their arrow turns, after the person's own press. Opened or closed by the app (the reasoning below, with its button), the same parts change at once: nothing moves by itself. Where a browser cannot ease a height to and from its own, they only fade.">
      <Row label="a row that opens">
        <div className="flex w-full max-w-md flex-col gap-2">
          <Disclosure label="Advanced" summary="2 set" animated={animated}>
            <Text as="p">What most people do not need on most visits stays behind the row.</Text>
          </Disclosure>
          <ToolCall name="Search tasks" summary="2 results" input={'{ "done": false }'} output={'[{ "title": "Send the invoice" }]'} animated={animated} />
        </div>
      </Row>
      <Row label="opened by the app: at once">
        <div className="flex w-full max-w-md flex-col gap-2">
          <Button variant="outline" className="self-start" onClick={() => setBusy(!busy)}>
            {busy ? 'End the reasoning' : 'Start a reasoning'}
          </Button>
          <Reasoning busy={busy} seconds={3} animated={animated}>
            It opens while it is written and closes when it ends, with no movement: the app did it. Press its row and it glides.
          </Reasoning>
        </div>
      </Row>
      <Row label="a branch of a tree">
        <div className="h-64 w-full max-w-md">
          <Tree aria-label="An outline" nodes={TREE_OUTLINE} animated={animated} className="h-full" />
        </div>
      </Row>
      <Row label="the sidebar: its groups, and its width">
        <div className="flex h-80 w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-paper">
          <Sidebar aria-label="A sample sidebar" collapsed={collapsed} onCollapsedChange={setCollapsed} animated={animated}>
            <SidebarGroup label="Mail" icon={<Icon name="mail" />} collapsible>
              {([['inbox', 'Inbox', 'inbox'], ['sent', 'Sent', 'send'], ['archive', 'Archive', 'archive']] as const).map(([id, name, icon]) => (
                <NavItem key={id} current={place === id} onClick={() => setPlace(id)} icon={<Icon name={icon} />}>
                  {name}
                </NavItem>
              ))}
            </SidebarGroup>
            <SidebarGroup label="Settings" icon={<Icon name="settings" />} collapsible defaultOpen={false}>
              <NavItem icon={<Icon name="account" />}>Account</NavItem>
              <NavItem icon={<Icon name="appearance" />}>Look</NavItem>
            </SidebarGroup>
          </Sidebar>
          <div className="flex min-w-0 flex-1 items-center justify-center p-4 text-sm text-ink-mute">The button at the foot of the sidebar shrinks it to its rail; the page takes the room.</div>
        </div>
      </Row>
    </Section>
  )
}

function MotionSurfaces({ animated }: { animated: boolean }) {
  const [dialog, setDialog] = React.useState(false)
  const [sheet, setSheet] = React.useState<'right' | 'bottom' | null>(null)
  const [choice, setChoice] = React.useState('week')
  const [person, setPerson] = React.useState<string | null>(null)
  const [day, setDay] = React.useState<string | null>(null)
  return (
    <Section id="motion-surfaces" title="Surfaces: in and out" note="A surface that opens comes from the side of what opened it; closing, it fades out in the short time of what leaves, and a sheet goes back towards its edge, with the veil behind it. Open each and close it with Esc, a press outside or its own button.">
      <Row label="a window and two sheets">
        <Button variant="outline" onClick={() => setDialog(true)}>
          A window
        </Button>
        <Dialog open={dialog} onOpenChange={setDialog} title="A window" description="It fades in, and out when it closes." animated={animated} footer={<Button onClick={() => setDialog(false)}>Done</Button>} />
        <Button variant="outline" onClick={() => setSheet('right')}>
          A sheet at the side
        </Button>
        <Button variant="outline" onClick={() => setSheet('bottom')}>
          A sheet at the foot
        </Button>
        <Sheet open={sheet !== null} onOpenChange={(open) => (open ? undefined : setSheet(null))}>
          <SheetContent side={sheet ?? 'right'} animated={animated}>
            <SheetHeader>
              <SheetTitle>A sheet</SheetTitle>
              <SheetDescription>It comes from its edge and goes back to it.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Row>
      <Row label="a menu, a card, a hint">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">A menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" animated={animated}>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Move</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">A card</Button>
          </PopoverTrigger>
          <PopoverContent align="start" animated={animated}>
            <PopoverHeader>
              <PopoverTitle>A card</PopoverTitle>
              <PopoverDescription>It comes from the side of its button.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        <Tooltip label="A hint, from the side it is placed on" animated={animated}>
          <Button variant="outline">A hint (rest on it)</Button>
        </Tooltip>
      </Row>
      <Row label="the lists of the fields">
        <div className="w-48">
          <Select aria-label="When" value={choice} onValueChange={setChoice} animated={animated} options={[{ value: 'day', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]} />
        </div>
        <div className="w-56">
          <Combobox aria-label="Person" options={PEOPLE} value={person} onValueChange={setPerson} placeholder="A person" animated={animated} />
        </div>
        <div className="w-56">
          <DateField value={day} onChange={setDay} animated={animated} />
        </div>
      </Row>
    </Section>
  )
}

function MotionChoices({ animated }: { animated: boolean }) {
  const [tab, setTab] = React.useState('one')
  const [view, setView] = React.useState('list')
  return (
    <Section id="motion-choices" title="Choosing and pressing" note="A button goes down a little under the finger and comes back; the mark of a check is stamped, the thumb of a switch slides, the pill under a choice or a tab glides to the new one, and the panel of the tab chosen comes in from the side of its tab. The fill, the border and the text of every control ease to the state under the pointer.">
      <Row label="a press, a check, a switch">
        <Button animated={animated}>Press me</Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox animated={animated} /> Stamped when checked
        </label>
        <Switch animated={animated}>It slides</Switch>
      </Row>
      <Row label="one of a few">
        <ToggleGroup aria-label="View" value={view} onValueChange={setView} animated={animated}>
          <ToggleGroupItem value="list">List</ToggleGroupItem>
          <ToggleGroupItem value="board">Board</ToggleGroupItem>
          <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="tabs and their panels">
        <Tabs value={tab} onValueChange={setTab} animated={animated} className="w-full max-w-md">
          <TabsList aria-label="Sample tabs">
            <TabsTrigger value="one">First</TabsTrigger>
            <TabsTrigger value="two">Second</TabsTrigger>
            <TabsTrigger value="three">Third</TabsTrigger>
          </TabsList>
          {(['one', 'two', 'three'] as const).map((id) => (
            <TabsContent key={id} value={id}>
              <SampleCard variant="quiet">
                <Text as="p">The panel of the {id === 'one' ? 'first' : id === 'two' ? 'second' : 'third'} tab. It comes in from the side of the tab pressed.</Text>
              </SampleCard>
            </TabsContent>
          ))}
        </Tabs>
      </Row>
    </Section>
  )
}

function Notes() {
  const [shown, setShown] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  return (
    <Section id="note" title="Note" note="A message that stays in the page until the app removes it: information, a success, a warning or an error. One look for a failure: an error note (the circle with an X, as in a toast, a progress and a step), never an empty state. Each tone has its icon and its colour, and screen readers hear its word before the title; an error and a warning are announced when they appear (unless announce is false: a fact of the item shown), information and a success are not, and a tone that changes is announced as a new note. A title, its text, a list and the buttons that answer it, outline or ghost (R3); no close button; a long word breaks to fit. A fill, flat in the page: neither a border nor a shadow (R4).">
      <Row label="tones">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <Note tone="info" title="Drawn from a sample">
            The map shows the first 500 files. Open a folder to see the rest.
          </Note>
          <Note tone="success" title="The map is up to date" />
          <Note tone="warning" title="Three links lead outside the project">
            They are drawn as dashed lines and are not followed.
          </Note>
          <Note tone="error" title="Could not reach the server" actions={<Button variant="outline">Retry</Button>}>
            The map was drawn before these files were read.
          </Note>
        </div>
      </Row>
      <Row label="list and actions">
        <div className="w-full max-w-xl">
          <Note
            tone="error"
            title="Two files were not read"
            items={['src/app.ts: the file is too large', 'src/old/main.ts: the file was removed']}
            actions={
              <>
                <Button variant="outline">Read them again</Button>
                <Button variant="ghost">Open the log</Button>
              </>
            }
          >
            The rest of the map is complete.
          </Note>
        </div>
      </Row>
      <Row label="long words">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <Note tone="error" title="Could not read C:/Users/someone/AppData/Local/projects/a-very-long-folder-name-without-any-space/settings.json" actions={<Button variant="outline">Retry</Button>}>
            <Text pre>{'error: expected a value at line 3, column 14\n  "paths": ["src/**/*.ts", ,]\n                            ^'}</Text>
          </Note>
          <Note tone="warning" announce={false} title="Read only">
            It belongs to another project: a fact of the item shown, not announced at each selection.
          </Note>
        </div>
      </Row>
      <Row label="live">
        <div className="flex w-full max-w-xl flex-col items-start gap-3">
          <Button variant="outline" data-sample="note-toggle" onClick={() => setShown(!shown)}>
            {shown ? 'Remove the warning' : 'Show a warning'}
          </Button>
          {shown ? (
            <Note tone="warning" title="The map is out of date">
              Files changed since it was drawn: a screen reader hears this as it appears.
            </Note>
          ) : null}
          <Button variant="outline" data-sample="note-tone" onClick={() => setFailed(!failed)}>
            {failed ? 'Read the files again' : 'Fail the reading'}
          </Button>
          <Note
            tone={failed ? 'error' : 'info'}
            title={failed ? 'Could not read the files' : 'Reading the files'}
            actions={failed ? <Button variant="outline" onClick={() => setFailed(false)}>Retry</Button> : undefined}
          >
            {failed ? 'The same note, now an error: drawn anew, so a screen reader hears it.' : 'The map fills in as they are read.'}
          </Note>
        </div>
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
  const [wide, setWide] = React.useState<DialogWidth | null>(null)
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
        <Button variant="outline" onClick={() => setWide('lg')}>
          Dialog lg
        </Button>
        <Button variant="outline" onClick={() => setWide('xl')}>
          Dialog xl
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
        open={wide !== null}
        onOpenChange={(open) => setWide(open ? wide : null)}
        width={wide ?? 'md'}
        title="Choose a folder"
        description="A wider window for a form of several fields or a list to choose from."
        footer={<Button onClick={() => setWide(null)}>Done</Button>}
      >
        <Input placeholder="Search folders" aria-label="Search folders" />
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
        text={{ label: 'Tone', hint: '', noEffect: 'The theme chosen above has no hue (the gray baseline), so the tone changes nothing here: Calm, Balanced and Vivid would look the same. Choose a coloured theme to see the three tones.', presets: {
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

/** A setting of the look in the panel: its name over its control. */
function LookField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  )
}

/** Where the frame stops showing a sidebar and the views move to the foot of the window (docs/patterns.md): a whole sidebar needs more than this. */
const FRAME_STEPS = { sidebar: 700, rail: 700 } as const

function App() {
  const [theme, setTheme] = React.useState<ThemeId>(initialTheme)
  const [color, setColor] = React.useState(initialColor)
  const [spot, setSpot] = React.useState<Spot>(initialSpot)
  const yours = theme === YOURS
  const [scheme, setScheme] = React.useState<ThemeScheme>(initialScheme)
  const [density, setDensity] = React.useState<DensityId>(initialDensity)
  const { section, moved } = useComponentSection()
  const [animated, setAnimated] = React.useState(params.get('animated') !== '0')
  // Where the system asks for less motion the toolkit moves nothing: said in the bar, or a still page looks broken.
  const lessMotion = useMedia('(prefers-reduced-motion: reduce)')
  const [ease, setEase] = React.useState<MotionEase>(DEFAULT_MOTION_FEEL.ease)
  const [pace, setPace] = React.useState(DEFAULT_MOTION_FEEL.pace)
  // `?shape=sharp|soft|round`: how round the corners are (a parameter of the theme).
  const [shape, setShape] = React.useState<ThemeShape>(isThemeShape(params.get('shape')) ? (params.get('shape') as ThemeShape) : DEFAULT_SHAPE)
  // `?keys=boxed` and `?controls=strong`: the two looks a theme asks for by name, off unless asked (`ThemeDef.keys`, `ThemeDef.controls`).
  const [boxedKeys, setBoxedKeys] = React.useState(params.get('keys') === 'boxed')
  const [strongControls, setStrongControls] = React.useState(params.get('controls') === 'strong')
  // `?tabs=bold`, `?strip=tall` and `?font=system`: bold tabs, a tall status strip (`ThemeDef.tabs`, `statusStrip`) and the system's font.
  const [boldTabs, setBoldTabs] = React.useState(params.get('tabs') === 'bold')
  const [tallStrip, setTallStrip] = React.useState(params.get('strip') === 'tall')
  const [systemFont, setSystemFont] = React.useState(params.get('font') === 'system')
  // `?material=glass`: the ground lets the window's own material through (`ThemeDef.material`). In a browser tab that is the browser's canvas.
  const [glass, setGlass] = React.useState(params.get('material') === 'glass')
  const [tone, setTone] = React.useState(() => {
    const initial = params.get('tone')
    return presetTone(initial === 'calm' || initial === 'balanced' ? initial : 'vivid')
  })
  // The view on show, and the section asked for in it, if any: `n` tells a new request from the first render.
  const [nav, setNav] = React.useState<{ view: ViewId; id: string | null; n: number }>({ view: initialView, id: null, n: 0 })
  const view = nav.view
  const go = React.useCallback((next: ViewId, id?: string) => setNav((now) => ({ view: next, id: id ?? null, n: now.n + 1 })), [])
  const [menu, setMenu] = React.useState(false)
  const [look, setLook] = React.useState(false)
  const narrow = useMedia(`(width < ${FRAME_STEPS.sidebar}px)`)
  // Five names at the foot need 360px: under that the longest one takes its short form.
  const tight = useMedia('(width < 360px)')
  React.useEffect(() => {
    const next = new URLSearchParams(location.search)
    next.set('animated', animated ? '1' : '0')
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [animated])
  React.useEffect(() => {
    const next = new URLSearchParams(location.search)
    next.set('view', view)
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [view])
  // A tab or a link took the page to a view, or to a section of it: the first render is the address's own, and the
  // index scrolls to its anchor.
  React.useEffect(() => {
    if (nav.n === 0) return
    const target = nav.id ? document.getElementById(nav.id) : null
    if (target) target.scrollIntoView()
    else shellContent()?.scrollTo(0, 0)
    history.replaceState(null, '', `${location.search}${nav.id ? `#${nav.id}` : ''}`)
  }, [nav])
  React.useLayoutEffect(() => {
    const asked = { shape, keys: boxedKeys ? 'boxed' : 'plain', controls: strongControls ? 'strong' : 'divider', tabs: boldTabs ? 'bold' : 'plain', statusStrip: tallStrip ? 'tall' : 'slim', material: glass ? 'glass' : 'solid' } as const
    applyTheme(document.documentElement, yours ? { theme: { ...colorTheme({ id: YOURS, label: 'Your colours', color, spot }), ...asked }, scheme, tone: AS_CHOSEN } : { theme: { ...themeById(theme), ...asked }, scheme, tone })
    const next = new URLSearchParams(location.search)
    next.set('theme', theme)
    next.set('scheme', scheme)
    next.set('tone', tonePresetOf(tone))
    next.set('shape', shape)
    if (boxedKeys) next.set('keys', 'boxed')
    else next.delete('keys')
    if (strongControls) next.set('controls', 'strong')
    else next.delete('controls')
    if (boldTabs) next.set('tabs', 'bold')
    else next.delete('tabs')
    if (tallStrip) next.set('strip', 'tall')
    else next.delete('strip')
    if (glass) next.set('material', 'glass')
    else next.delete('material')
    if (yours) {
      next.set('color', color.slice(1))
      next.set('spot', spot === null ? 'none' : spot.replace('#', ''))
    } else {
      next.delete('color')
      next.delete('spot')
    }
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [theme, scheme, tone, yours, color, spot, shape, boxedKeys, strongControls, boldTabs, tallStrip, glass])
  React.useLayoutEffect(() => {
    applyFont(document.documentElement, systemFont ? 'system' : DEFAULT_FONT)
    const next = new URLSearchParams(location.search)
    if (systemFont) next.set('font', 'system')
    else next.delete('font')
    history.replaceState(null, '', `?${next.toString()}${location.hash}`)
  }, [systemFont])
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
  const themeLabel = yours ? 'Your colours' : themeById(theme).label
  const views = (placing: { edge?: 'top'; layout?: 'stacked' } = {}) => (
    <ToolbarTabs aria-label="Views" value={view} onValueChange={(next) => isViewId(next) && go(next)} {...placing}>
      {VIEWS.map((v) => (
        <ToolbarTab key={v.id} value={v.id} icon={placing.layout ? <Icon name={v.icon} /> : undefined}>
          {placing.layout && tight && 'short' in v ? v.short : v.label}
        </ToolbarTab>
      ))}
    </ToolbarTabs>
  )
  // The component gallery, in the order of the index (COMPONENT_GROUPS).
  // One section of the components view at a time: every one is written here, and only the one chosen is drawn (the
  // graph, the long lists and the rest of the fifty are not in the page until asked for).
  const parts: Record<string, React.ReactNode> = {
    palettes: <Strip theme={theme} scheme={scheme} tone={tone} onTone={setTone} />,
    tokens: <Tokens />,
    'hue-scales': <HueScales scheme={scheme} animated={animated} />,
    'theme-gallery': (
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
    ),
    layout: <LayoutParts />,
    button: <Buttons animated={animated} />,
    'toggle-group': <Toggles animated={animated} />,
    badge: <Badges />,
    kbd: <Keys />,
    'theme-hooks': <ThemeHooks scheme={scheme} animated={animated} />,
    input: <Fields />,
    select: <Selects />,
    checkbox: <Checkboxes animated={animated} />,
    radio: <Radios />,
    switch: <Switches animated={animated} />,
    tabs: <TabSets animated={animated} />,
    menu: <Menus animated={animated} />,
    popover: <Popovers animated={animated} />,
    overlays: <Overlays animated={animated} />,
    progress: <ProgressSection />,
    table: <Tables />,
    composition: <Composition animated={animated} />,
    'composition-panes': <CompositionPanes animated={animated} />,
    'form-field': <FormFields />,
    pickers: <Pickers />,
    date: <Dates animated={animated} />,
    fields: <OtherFields />,
    steps: <StepsSection />,
    toasts: <Notices animated={animated} />,
    empty: <Empties />,
    note: <Notes />,
    confirm: <Confirms animated={animated} />,
    'overflow-list': <OverflowLists />,
    markdown: <Content />,
    'nav-list': <Navigation />,
    sidebar: <SidebarSample animated={animated} />,
    toolbar: <Toolbars animated={animated} />,
    chat: <ChatParts />,
    wizard: <Wizards animated={animated} />,
    'auth-form': <AuthForms animated={animated} />,
    lightbox: <Lightboxes animated={animated} />,
    'swipe-deck': <Deck />,
    tree: <Trees animated={animated} />,
    attachments: <Files />,
    'virtual-list': <LongLists />,
    reorder: <Reorders animated={animated} />,
    'rich-text': <RichTexts />,
    graph: <Graphs />,
    'motion-feel': <MotionFeelSection animated={animated} ease={ease} onEase={setEase} pace={pace} onPace={setPace} />,
    'motion-open': <MotionOpens animated={animated} />,
    'motion-surfaces': <MotionSurfaces animated={animated} />,
    'motion-choices': <MotionChoices animated={animated} />,
    hover: <HoverRows animated={animated} />,
    'motion-pieces': <MotionPieces animated={animated} />,
  }
  const components = (
    <Page
      title="Components"
      lead={
        <>
          One section at a time, chosen in the index (by level: the ground, the primitives, the components, the frame, the assemblies) or with the two buttons at its foot, under the theme, shape, density and motion chosen in Look. Hover, pressed and focus are forced with <Code>data-force</Code>, so they can be seen at once. What opens on a gesture opens from the address: <Code>?open=menu</Code>, <Code>popover</Code>, <Code>select</Code>, <Code>dialog</Code>, <Code>sheet</Code> and more.
        </>
      }
    >
      {/* A new element for each section, so that it is the section that comes in (theme.css, `[data-reveal="fade"]`). */}
      <div key={section} {...(moved ? { 'data-reveal': 'fade' } : {})}>
        {parts[section]}
      </div>
      <Pager />
    </Page>
  )
  return (
    <MotionProvider animated={animated} ease={ease} pace={pace}>
      <Go.Provider value={go}>
        <div className="h-dvh overflow-hidden bg-paper text-ink">
          <AppShell
            contentLabel={VIEWS.find((v) => v.id === view)?.label ?? view}
            // No rail between the drawer and the whole sidebar: the rows of the gallery have no icon to be a rail of.
            steps={FRAME_STEPS}
            titleBar={
              <TitleBar>
                <Toolbar aria-label="Showcase">
                  <DrawerButton onOpen={() => setMenu(true)} />
                  <ToolbarBrand name="Sigrid" />
                  {narrow ? null : views()}
                  <ToolbarSpacer />
                  {/* The app editor is its own page (builder.html), not a view of this one: it opens beside it. */}
                  <ToolbarButton label="App editor" icon={<Icon name="layout" />} onClick={() => window.open('builder.html', '_blank', 'noopener')}>
                    App editor
                  </ToolbarButton>
                  <ToolbarButton label="Dark mode" icon={<Icon name="moon" />} pressed={scheme === 'dark'} onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} animated={animated} />
                  <ToolbarButton label="Look" icon={<Icon name="appearance" />} pressed={look} onClick={() => setLook(!look)} animated={animated}>
                    Look
                  </ToolbarButton>
                </Toolbar>
              </TitleBar>
            }
            sidebar={<Index view={view} animated={animated} open={menu} onOpenChange={setMenu} />}
            inspector={
              <Inspector title="Look" open={look} onOpenChange={setLook} animated={animated}>
                <div className="flex flex-col gap-4">
                  <FormField label="Theme">
                    <Select options={[...THEMES.map((t) => ({ value: t.id, label: t.label })), { value: YOURS, label: 'Your colours' }]} value={theme} onValueChange={(v) => (v === YOURS || isThemeId(v)) && setTheme(v)} />
                  </FormField>
                  <LookField label="Shape">
                    <ToggleGroup aria-label="Shape" value={shape} onValueChange={(v) => isThemeShape(v) && setShape(v)} className="self-start">
                      {THEME_SHAPES.map((name) => (
                        <ToggleGroupItem key={name} value={name}>
                          {name[0]!.toUpperCase() + name.slice(1)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </LookField>
                  <Switch checked={boxedKeys} onCheckedChange={setBoxedKeys} animated={animated}>
                    Boxed keys
                  </Switch>
                  <Switch checked={strongControls} onCheckedChange={setStrongControls} animated={animated}>
                    Strong control borders
                  </Switch>
                  <Switch checked={boldTabs} onCheckedChange={setBoldTabs} animated={animated}>
                    Bold tabs
                  </Switch>
                  <Switch checked={tallStrip} onCheckedChange={setTallStrip} animated={animated}>
                    Tall status strip
                  </Switch>
                  <Switch checked={systemFont} onCheckedChange={setSystemFont} animated={animated}>
                    System font
                  </Switch>
                  <Switch checked={glass} onCheckedChange={setGlass} animated={animated}>
                    Glass
                  </Switch>
                  <LookField label="Density">
                    <ToggleGroup aria-label="Density" value={density} onValueChange={(v) => isDensityId(v) && setDensity(v)} className="self-start">
                      {DENSITIES.map((d) => (
                        <ToggleGroupItem key={d.id} value={d.id}>
                          {d.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </LookField>
                  <Switch checked={animated} onCheckedChange={setAnimated} animated={animated}>
                    Animations
                  </Switch>
                  <LookField label="Curve of the movements">
                    <Select aria-label="Curve of the movements" value={ease} onValueChange={(v) => isMotionEase(v) && setEase(v)} options={MOTION_EASE_NAMES.map((name) => ({ value: name, label: name === 'fluent' ? 'Fluent (one per kind of movement)' : name }))} />
                  </LookField>
                  <LookField label="Pace">
                    <ToggleGroup aria-label="Pace" value={String(pace)} onValueChange={(v) => setPace(Number(v))} animated={animated} className="self-start">
                      {[['0.75', 'Quick'], ['1', 'Normal'], ['1.5', 'Slow'], ['2', 'Slower']].map(([value, label]) => (
                        <ToggleGroupItem key={value} value={value!}>
                          {label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </LookField>
                </div>
              </Inspector>
            }
            bottomBar={narrow ? <Toolbar aria-label="Views of the showcase">{views({ edge: 'top', layout: 'stacked' })}</Toolbar> : undefined}
            // No strip at the foot of a narrow window (docs/mobile.md): with a finger it is as tall as a control, over the tabs.
            footer={
              narrow ? undefined : (
                <>
                  <span>{themeLabel}</span>
                  <span>{scheme}</span>
                  <span>{DENSITIES.find((d) => d.id === density)?.label}</span>
                  <span className="ms-auto">{!animated ? 'Animations off' : lessMotion ? 'Animations on, but the system asks for less motion: nothing moves' : `Animations on · ${ease} · pace ${pace}`}</span>
                </>
              )
            }
          >
            {/* The gallery's own samples are standalone: a Sidebar sample follows the screen, not this frame. */}
            <AppShellContext.Provider value={undefined}>
              <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 md:px-6">
                {view === 'philosophy' ? <PhilosophyView /> : view === 'guidelines' ? <GuidelinesView /> : view === 'practices' ? <PracticesView gallery={<Shells animated={animated} scheme={scheme} onScheme={setScheme} />} phones={<PhoneLayouts animated={animated} density={density} />} /> : view === 'examples' ? <ExamplesView animated={animated} density={density} look={{ scheme, shape }} /> : components}
              </div>
            </AppShellContext.Provider>
          </AppShell>
        </div>
      </Go.Provider>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
