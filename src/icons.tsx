// The icon packs (R6 of the toolkit's rules, 2026-11-20): icons are visual anchors for the eye, and the user picks the
// pack in Settings. A component asks for an icon by what it means (`settings`, `delete`), never by a pack's own name:
// the pack in context draws it. Lucide is the default (line, the toolkit's stroke). Two packs take the colour of the
// theme: Phosphor Duotone and Solar Duotone, drawn in the text colour with a lighter second tone. Three are in their
// own colours: Fluent Color, Fluent Emoji Flat and Twemoji, drawn emoji that look the same on every device (the
// device's own emoji font left the packs on 2026-11-21: the owner did not like it). The drawn packs are not npm
// dependencies: their drawings are in `icon-packs.generated.ts`, written by `scripts/icon-packs.mjs`. Functional
// chrome (chevrons, ×, the search magnifier) stays Lucide.
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react'
import {
  Archive,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Bold,
  Bot,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock,
  Cloud,
  Columns3,
  Copy,
  Database,
  Download,
  Ellipsis,
  FolderInput,
  FolderPlus,
  FolderTree,
  FunnelX,
  History,
  Inbox,
  Info,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  LogOut,
  Mail,
  MessagesSquare,
  Mic,
  Minus,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Paperclip,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Printer,
  Redo2,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings,
  Shapes,
  Square,
  SquareStack,
  SquareStop,
  Sun,
  SwatchBook,
  Tag,
  Tags,
  TextQuote,
  Trash2,
  TriangleAlert,
  Type,
  Underline,
  Undo2,
  Upload,
  User,
  UserPen,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react'
import {
  AddCircleColor,
  AlertColor,
  AppsColor,
  AppsListColor,
  ArrowClockwiseDashesColor,
  ArrowSquareDownColor,
  ArrowSyncColor,
  BoardColor,
  BookContactsColor,
  BookmarkColor,
  BotColor,
  CalendarClockColor,
  CalendarColor,
  ChatColor,
  ChatMultipleColor,
  CheckmarkCircleColor,
  ClipboardColor,
  ClipboardTaskColor,
  ClockColor,
  CloudColor,
  CommentColor,
  CommentMultipleColor,
  ContactCardColor,
  DatabaseColor,
  DesignIdeasColor,
  DismissCircleColor,
  DiversityColor,
  DocumentFolderColor,
  DocumentTextColor,
  EditColor,
  ErrorCircleColor,
  HistoryColor,
  LaptopColor,
  LinkColor,
  LinkMultipleColor,
  ListBarColor,
  LockClosedColor,
  MailColor,
  MailMultipleColor,
  MicColor,
  NumberSymbolSquareColor,
  OrgColor,
  PaintBrushColor,
  PersonColor,
  PinColor,
  PlanetColor,
  PollColor,
  QuestionCircleColor,
  SearchVisualColor,
  SendColor,
  SettingsColor,
  TextBulletListSquareColor,
  TextEditStyleColor,
  VideoColor,
  WarningColor,
  WeatherSunnyLowColor,
} from '@fluentui/react-icons'
import { cn } from './lib/utils'
import { DUOTONE_DRAWINGS, EMOJI_DRAWINGS, SOLAR_DRAWINGS, TWEMOJI_DRAWINGS, type Drawing } from './icon-packs.generated'

export type { Drawing as IconArt } from './icon-packs.generated'

/** The packs to choose from, in the order Settings shows them; the first is the default. */
export const ICON_PACKS = ['lucide', 'duotone', 'solar', 'fluent', 'emoji', 'twemoji'] as const
export type IconPack = (typeof ICON_PACKS)[number]
export const DEFAULT_ICON_PACK: IconPack = 'lucide'

/**
 * True for a value that names a pack (a saved choice read back). A pack that left (`phosphor`, `tabler`) is refused, so
 * a choice saved before falls back to the default.
 */
export function isIconPack(value: unknown): value is IconPack {
  return typeof value === 'string' && (ICON_PACKS as readonly string[]).includes(value)
}

/**
 * What an icon can mean: the main views, the sidebar's groups, the settings sections, and the entries of the menus
 * (the «…» actions, the profile menu, the «Move to…» places, the view bar's filter and sort).
 */
export const ICON_NAMES = [
  'all',
  'tag',
  'labels',
  'more',
  'notifications',
  'settings',
  'account',
  'appearance',
  'colors',
  'layout',
  'font',
  'animations',
  'dateTime',
  'ai',
  'importExport',
  'data',
  'service',
  'rename',
  'changeIcon',
  'move',
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'delete',
  'newFolder',
  'profile',
  'structure',
  'signOut',
  'now',
  'column',
  'date',
  'clearFilter',
  'threads',
  'sidebarClose',
  'sidebarOpen',
  'print',
  'download',
  'upload',
  'underline',
  'listOrdered',
  'quote',
  'undo',
  'redo',
  'inbox',
  'mail',
  'check',
  'minus',
  'tasks',
  'clock',
  'history',
  'send',
  'archive',
  'contacts',
  'mic',
  'search',
  'plus',
  'chevron',
  'chevronDown',
  'pin',
  'attach',
  'refresh',
  'reply',
  'replyAll',
  'close',
  'windowMinimize',
  'windowMaximize',
  'windowRestore',
  'moon',
  'sun',
  'link',
  'bold',
  'italic',
  'bulletList',
  'info',
  'copy',
  'pause',
  'play',
  'stop',
  'video',
  'alert',
] as const
export type IconName = (typeof ICON_NAMES)[number]

/** True for a value that names an icon (a name that comes from data, as a sidebar item's `icon`). */
export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && (ICON_NAMES as readonly string[]).includes(value)
}

type Glyph = ComponentType<{ className?: string | undefined }>

/** Fluent Color has a single arrow (down, in a square): turned, it draws the other three directions. */
const turned =
  (turn: 'rotate-90' | 'rotate-180' | '-rotate-90'): Glyph =>
  ({ className }) => <ArrowSquareDownColor className={cn(turn, className)} />

/** The colour emoji font of each system, so a glyph looks as it does everywhere else on the device. */
const EMOJI_FONT = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', emoji, sans-serif"
/**
 * An emoji in the 24-unit box of the line icons, so the `size-*` class sizes it exactly as it sizes them; the 19-unit
 * glyph keeps about the margin a line icon keeps. The glyph is a picture (a small SVG image of its own, made once), not
 * text on the page: a label read from the page (a settings title, a menu entry) stays the label alone, and the weight or
 * spacing of a heading around it cannot change it.
 */
function emoji(glyph: string): Glyph {
  const drawing = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-size="19" font-family="${EMOJI_FONT}">${glyph}</text></svg>`
  const href = `data:image/svg+xml,${encodeURIComponent(drawing)}`
  return ({ className }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" className={className} aria-hidden="true">
      <image href={href} width="24" height="24" />
    </svg>
  )
}

/**
 * A glyph from a drawing (`icon-packs.generated.ts`, or an app's own): in its own square view box, sized by the
 * `size-*` class like a line icon. A drawing in `currentColor` takes the colour of the text around it; an emoji keeps
 * its own. One component per drawing, made once: a new component at every render would remount the picture.
 */
const drawnGlyphs = new WeakMap<Drawing, Glyph>()
function drawnGlyph(drawing: Drawing): Glyph {
  let made = drawnGlyphs.get(drawing)
  if (!made) {
    const [box, body] = drawing
    made = ({ className }) => <svg viewBox={`0 0 ${box} ${box}`} width="24" height="24" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />
    drawnGlyphs.set(drawing, made)
  }
  return made
}

/** A pack from its drawings, one per meaning. */
function drawn(drawings: Readonly<Record<IconName, Drawing>>): Readonly<Record<IconName, Glyph>> {
  return Object.fromEntries(ICON_NAMES.map((name) => [name, drawnGlyph(drawings[name])])) as Record<IconName, Glyph>
}

const PACKS: Readonly<Record<IconPack, Readonly<Record<IconName, Glyph>>>> = {
  lucide: {
    all: List,
    tag: Tag,
    labels: Tags,
    more: Ellipsis,
    notifications: Bell,
    settings: Settings,
    account: User,
    appearance: Palette,
    colors: SwatchBook,
    layout: PanelsTopLeft,
    font: Type,
    animations: Clapperboard,
    dateTime: CalendarClock,
    ai: Bot,
    importExport: ArrowDownUp,
    data: Database,
    service: Cloud,
    rename: Pencil,
    changeIcon: Shapes,
    move: FolderInput,
    moveUp: ArrowUp,
    moveDown: ArrowDown,
    moveLeft: ArrowLeft,
    moveRight: ArrowRight,
    delete: Trash2,
    newFolder: FolderPlus,
    profile: UserPen,
    structure: FolderTree,
    signOut: LogOut,
    now: Zap,
    column: Columns3,
    date: Calendar,
    clearFilter: FunnelX,
    threads: MessagesSquare,
    sidebarClose: PanelLeftClose,
    sidebarOpen: PanelLeftOpen,
    print: Printer,
    download: Download,
    upload: Upload,
    underline: Underline,
    listOrdered: ListOrdered,
    quote: TextQuote,
    undo: Undo2,
    redo: Redo2,
    inbox: Inbox,
    mail: Mail,
    check: Check,
    minus: Minus,
    tasks: ListTodo,
    clock: Clock,
    history: History,
    send: Send,
    archive: Archive,
    contacts: Users,
    mic: Mic,
    search: Search,
    plus: Plus,
    chevron: ChevronRight,
    chevronDown: ChevronDown,
    pin: Pin,
    attach: Paperclip,
    refresh: RefreshCw,
    reply: Reply,
    replyAll: ReplyAll,
    close: X,
    windowMinimize: Minus,
    windowMaximize: Square,
    windowRestore: SquareStack,
    moon: Moon,
    sun: Sun,
    link: Link,
    bold: Bold,
    italic: Italic,
    bulletList: List,
    info: Info,
    copy: Copy,
    pause: Pause,
    play: Play,
    stop: SquareStop,
    video: Video,
    alert: TriangleAlert,
  },
  fluent: {
    all: TextBulletListSquareColor,
    tag: NumberSymbolSquareColor,
    labels: BookmarkColor,
    more: AppsColor,
    notifications: AlertColor,
    settings: SettingsColor,
    account: PersonColor,
    appearance: PaintBrushColor,
    colors: DesignIdeasColor,
    layout: BoardColor,
    font: TextEditStyleColor,
    animations: VideoColor,
    dateTime: CalendarClockColor,
    ai: BotColor,
    importExport: ArrowSyncColor,
    data: DatabaseColor,
    service: CloudColor,
    // The colour set is small: where it has no fitting drawing, the closest one (a red circle with × for deleting,
    // signing out behind a lock, a paper plane for «Move to…»).
    rename: EditColor,
    changeIcon: DiversityColor,
    move: SendColor,
    moveUp: turned('rotate-180'),
    moveDown: ArrowSquareDownColor,
    moveLeft: turned('rotate-90'),
    moveRight: turned('-rotate-90'),
    delete: DismissCircleColor,
    newFolder: AddCircleColor,
    profile: ContactCardColor,
    structure: OrgColor,
    signOut: LockClosedColor,
    now: SearchVisualColor,
    column: BoardColor,
    date: CalendarColor,
    clearFilter: DismissCircleColor,
    threads: ChatMultipleColor,
    sidebarClose: ListBarColor,
    sidebarOpen: ListBarColor,
    print: DocumentTextColor,
    download: ArrowSquareDownColor,
    upload: turned('rotate-180'),
    underline: TextEditStyleColor,
    listOrdered: AppsListColor,
    quote: CommentColor,
    undo: HistoryColor,
    redo: ArrowClockwiseDashesColor,
    inbox: MailMultipleColor,
    mail: MailColor,
    check: CheckmarkCircleColor,
    minus: ErrorCircleColor,
    tasks: ClipboardTaskColor,
    clock: ClockColor,
    history: HistoryColor,
    send: SendColor,
    archive: DocumentFolderColor,
    contacts: BookContactsColor,
    mic: MicColor,
    search: SearchVisualColor,
    plus: AddCircleColor,
    chevron: turned('-rotate-90'),
    chevronDown: ArrowSquareDownColor,
    pin: PinColor,
    attach: LinkMultipleColor,
    refresh: ArrowSyncColor,
    reply: ChatColor,
    replyAll: CommentMultipleColor,
    close: DismissCircleColor,
    windowMinimize: LaptopColor,
    windowMaximize: LaptopColor,
    windowRestore: LaptopColor,
    moon: PlanetColor,
    sun: WeatherSunnyLowColor,
    link: LinkColor,
    bold: TextEditStyleColor,
    italic: TextEditStyleColor,
    bulletList: TextBulletListSquareColor,
    info: QuestionCircleColor,
    copy: ClipboardColor,
    pause: PollColor,
    play: VideoColor,
    stop: DismissCircleColor,
    video: VideoColor,
    alert: WarningColor,
  },
  duotone: drawn(DUOTONE_DRAWINGS),
  solar: drawn(SOLAR_DRAWINGS),
  emoji: drawn(EMOJI_DRAWINGS),
  twemoji: drawn(TWEMOJI_DRAWINGS),
}

/**
 * How an app draws a meaning of its own (a mail app's `inbox`, `reply`): the line drawing is required; a pack left
 * out falls back to it. The drawn packs take a drawing each (its square view box and its SVG content, as
 * `scripts/icon-packs.mjs` writes them). `emoji` may also be the glyph itself, fully qualified (with U+FE0F where
 * the symbol is text by default): the device's font then draws it, in the Emoji pack and in Twemoji.
 */
export interface IconDrawing {
  readonly lucide: Glyph
  readonly fluent?: Glyph | undefined
  readonly duotone?: Drawing | undefined
  readonly solar?: Drawing | undefined
  readonly emoji?: Drawing | string | undefined
  readonly twemoji?: Drawing | undefined
}

/** An app's own meanings, by name. A name the toolkit already draws keeps the toolkit's drawing. */
export type IconSet = Readonly<Record<string, IconDrawing>>

/** One component per emoji, made once: a new component at every render would remount the picture. */
const emojiGlyphs = new Map<string, Glyph>()
function emojiGlyph(glyph: string): Glyph {
  let made = emojiGlyphs.get(glyph)
  if (!made) {
    made = emoji(glyph)
    emojiGlyphs.set(glyph, made)
  }
  return made
}

/** The drawing of a name in a pack: the toolkit's, then the app's (its line drawing where the pack has none), or none. */
function glyphOf(name: string, pack: IconPack, icons: IconSet | undefined): Glyph | undefined {
  if (isIconName(name)) return PACKS[pack][name]
  const own = icons && Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : undefined
  if (!own) return undefined
  if (pack === 'fluent') return own.fluent ?? own.lucide
  if (pack === 'duotone') return own.duotone ? drawnGlyph(own.duotone) : own.lucide
  if (pack === 'solar') return own.solar ? drawnGlyph(own.solar) : own.lucide
  if (pack === 'emoji' || pack === 'twemoji') {
    const art = pack === 'twemoji' ? (own.twemoji ?? own.emoji) : own.emoji
    return art === undefined ? own.lucide : typeof art === 'string' ? emojiGlyph(art) : drawnGlyph(art)
  }
  return own.lucide
}

const IconPackContext = createContext<{ readonly pack: IconPack; readonly icons: IconSet | undefined }>({ pack: DEFAULT_ICON_PACK, icons: undefined })

/**
 * The pack every `Icon` below draws from: the app passes the user's choice, and with `icons` the meanings of its own
 * (a constant: the same object at every render). A provider without `icons` keeps the ones of the provider above.
 */
export function IconPackProvider({ pack, icons, children }: { pack: IconPack; icons?: IconSet | undefined; children: ReactNode }) {
  const above = useContext(IconPackContext)
  const own = icons ?? above.icons
  const value = useMemo(() => ({ pack, icons: own }), [pack, own])
  return <IconPackContext.Provider value={value}>{children}</IconPackContext.Provider>
}

/** The pack in use here. */
export function useIconPack(): IconPack {
  return useContext(IconPackContext).pack
}

/**
 * An icon by its meaning, drawn by the pack in context (or by `pack`, for a preview of another pack). Decorative: the
 * label next to it names the thing, so it is hidden from screen readers. A name nobody draws (from data, or an app's
 * meaning with no provider above) is an empty slot of the same size, so the row keeps its alignment (R6).
 */
export function Icon({ name, pack, className }: { name: IconName | (string & {}); pack?: IconPack | undefined; className?: string | undefined }) {
  const current = useContext(IconPackContext)
  const chosen = pack ?? current.pack
  const Glyph = glyphOf(name, chosen, current.icons)
  return (
    <span aria-hidden="true" data-icon={name} data-icon-pack={chosen} className="inline-flex shrink-0">
      {Glyph ? <Glyph className={cn('size-4', className)} /> : <span data-icon-empty="" className={cn('size-4', className)} />}
    </span>
  )
}
