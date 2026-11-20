// The icon packs (R6 of the toolkit's rules, 2026-11-20): icons are visual anchors for the eye, and the user picks the
// pack in Settings. A component asks for an icon by what it means (`today`, `settings`), never by a pack's own name:
// the pack in context draws it. Lucide is the default (line, the toolkit's stroke); Fluent Color is full colour, its own
// colours; Emoji is the device's own colour emoji, drawn by the system font, with no package. One line pack is enough:
// the owner saw no difference between Lucide, Phosphor and Tabler, so the last two left (2026-11-20). Functional chrome
// (chevrons, ×, the search magnifier) stays Lucide.
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import {
  AlarmClock,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Bot,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  Clapperboard,
  ClipboardList,
  ClockArrowUp,
  Cloud,
  Columns3,
  Database,
  Ellipsis,
  Flag,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderTree,
  FunnelX,
  Layers,
  ListPlus,
  ListTodo,
  LogOut,
  Palette,
  PanelsTopLeft,
  Pencil,
  Settings,
  Shapes,
  StickyNote,
  Sun,
  Sunrise,
  SwatchBook,
  Tag,
  Tags,
  Timer,
  Trash2,
  Type,
  User,
  UserPen,
  Zap,
} from 'lucide-react'
import {
  AddCircleColor,
  AlertColor,
  AppsColor,
  ArrowSquareDownColor,
  ArrowSyncColor,
  BoardColor,
  BookmarkColor,
  BotColor,
  CalendarClockColor,
  CalendarColor,
  CalendarDataBarColor,
  CheckmarkCircleColor,
  ClipboardTaskColor,
  ClipboardTextEditColor,
  ClockAlarmColor,
  ClockColor,
  CloudColor,
  ContactCardColor,
  DatabaseColor,
  DesignIdeasColor,
  DismissCircleColor,
  DiversityColor,
  DocumentAddColor,
  DocumentFolderColor,
  EditColor,
  FlagColor,
  LockClosedColor,
  NotebookColor,
  NumberSymbolSquareColor,
  OrgColor,
  PaintBrushColor,
  PersonColor,
  SearchVisualColor,
  SendClockColor,
  SendColor,
  SettingsColor,
  TextBulletListSquareColor,
  TextEditStyleColor,
  VideoColor,
  WeatherSunnyLowColor,
} from '@fluentui/react-icons'
import { cn } from './lib/utils'

/** The packs to choose from, in the order Settings shows them; the first is the default. */
export const ICON_PACKS = ['lucide', 'fluent', 'emoji'] as const
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
  'stack',
  'today',
  'upcoming',
  'all',
  'reminders',
  'done',
  'tag',
  'stickies',
  'pomodoro',
  'areas',
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
  'newProject',
  'profile',
  'structure',
  'signOut',
  'postpone',
  'now',
  'project',
  'column',
  'tomorrow',
  'nextWeek',
  'date',
  'priority',
  'clearFilter',
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

const PACKS: Readonly<Record<IconPack, Readonly<Record<IconName, Glyph>>>> = {
  lucide: {
    stack: Layers,
    today: Sun,
    upcoming: CalendarDays,
    all: ListTodo,
    reminders: AlarmClock,
    done: CircleCheck,
    tag: Tag,
    stickies: StickyNote,
    pomodoro: Timer,
    areas: FolderOpen,
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
    newProject: ListPlus,
    profile: UserPen,
    structure: FolderTree,
    signOut: LogOut,
    postpone: ClockArrowUp,
    now: Zap,
    project: ClipboardList,
    column: Columns3,
    tomorrow: Sunrise,
    nextWeek: CalendarRange,
    date: Calendar,
    priority: Flag,
    clearFilter: FunnelX,
  },
  fluent: {
    stack: ClipboardTaskColor,
    today: WeatherSunnyLowColor,
    upcoming: CalendarColor,
    all: TextBulletListSquareColor,
    reminders: ClockAlarmColor,
    done: CheckmarkCircleColor,
    tag: NumberSymbolSquareColor,
    stickies: NotebookColor,
    pomodoro: ClockColor,
    areas: DocumentFolderColor,
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
    // signing out behind a lock, a paper plane for «Move to…», «Postpone» as «send later»).
    rename: EditColor,
    changeIcon: DiversityColor,
    move: SendColor,
    moveUp: turned('rotate-180'),
    moveDown: ArrowSquareDownColor,
    moveLeft: turned('rotate-90'),
    moveRight: turned('-rotate-90'),
    delete: DismissCircleColor,
    newFolder: AddCircleColor,
    newProject: DocumentAddColor,
    profile: ContactCardColor,
    structure: OrgColor,
    signOut: LockClosedColor,
    postpone: SendClockColor,
    now: SearchVisualColor,
    project: ClipboardTextEditColor,
    column: BoardColor,
    tomorrow: CalendarColor,
    nextWeek: CalendarDataBarColor,
    date: CalendarColor,
    priority: FlagColor,
    clearFilter: DismissCircleColor,
  },
  // One emoji per meaning, none shared, chosen to read at a glance and to stay visible on a dark page as on a light one.
  // Written as code points: the U+FE0F that asks for the colour form of a symbol that is text by default (sun, gear,
  // pencil, arrows) is invisible in a literal, and the design check reads emoji literals in the interface code as a
  // must-avoid (DESIGN.md), while this pack, which the user picks, is the one place that draws them.
  emoji: {
    stack: emoji('\u{1F4E5}'), // inbox tray: where what you capture lands
    today: emoji('\u{2600}\u{FE0F}'), // sun
    upcoming: emoji('\u{1F5D3}\u{FE0F}'), // spiral calendar
    all: emoji('\u{1F4DC}'), // scroll: the whole list
    reminders: emoji('\u{23F0}'), // alarm clock
    done: emoji('\u{2705}'), // check mark button
    tag: emoji('\u{1F3F7}\u{FE0F}'), // label
    stickies: emoji('\u{1F4D2}'), // ledger: yellow, like a sticky note (the white notepad fades on a light page)
    pomodoro: emoji('\u{1F345}'), // tomato
    areas: emoji('\u{1F4C2}'), // open file folder
    labels: emoji('\u{1F516}'), // bookmark
    more: emoji('\u{1F4E6}'), // package: the other lists
    notifications: emoji('\u{1F514}'), // bell
    settings: emoji('\u{2699}\u{FE0F}'), // gear
    account: emoji('\u{1F194}'), // ID button (the dark silhouette fades on a dark page)
    appearance: emoji('\u{1F3A8}'), // artist palette
    colors: emoji('\u{1F308}'), // rainbow
    layout: emoji('\u{1F9E9}'), // puzzle piece: how the pieces are laid out
    font: emoji('\u{1F524}'), // input latin letters
    animations: emoji('\u{1F3AC}'), // clapper board
    dateTime: emoji('\u{1F570}\u{FE0F}'), // mantelpiece clock
    ai: emoji('\u{2728}'), // sparkles
    importExport: emoji('\u{1F504}'), // anticlockwise arrows button
    data: emoji('\u{1F5C3}\u{FE0F}'), // card file box
    service: emoji('\u{1F310}'), // globe with meridians (the white cloud fades on a light page)
    rename: emoji('\u{270F}\u{FE0F}'), // pencil
    changeIcon: emoji('\u{1F5BC}\u{FE0F}'), // framed picture
    move: emoji('\u{1F69A}'), // delivery truck: «Move to…», apart from the arrows that nudge
    moveUp: emoji('\u{2B06}\u{FE0F}'), // up arrow
    moveDown: emoji('\u{2B07}\u{FE0F}'), // down arrow
    moveLeft: emoji('\u{2B05}\u{FE0F}'), // left arrow
    moveRight: emoji('\u{27A1}\u{FE0F}'), // right arrow
    delete: emoji('\u{1F5D1}\u{FE0F}'), // wastebasket
    newFolder: emoji('\u{1F4C1}'), // file folder
    newProject: emoji('\u{1F195}'), // NEW button
    profile: emoji('\u{1F9D1}'), // person: you
    structure: emoji('\u{1F5C2}\u{FE0F}'), // card index dividers
    signOut: emoji('\u{1F6AA}'), // door
    postpone: emoji('\u{1F4A4}'), // zzz: snooze
    now: emoji('\u{26A1}'), // high voltage
    project: emoji('\u{1F4CB}'), // clipboard
    column: emoji('\u{1F4CA}'), // bar chart: the columns of a board
    tomorrow: emoji('\u{1F305}'), // sunrise
    nextWeek: emoji('\u{1F4C6}'), // tear-off calendar
    date: emoji('\u{1F4C5}'), // calendar
    priority: emoji('\u{1F6A9}'), // triangular flag
    clearFilter: emoji('\u{1F9F9}'), // broom
  },
}

const IconPackContext = createContext<IconPack>(DEFAULT_ICON_PACK)

/** The pack every `Icon` below draws from: the app passes the user's choice. */
export function IconPackProvider({ pack, children }: { pack: IconPack; children: ReactNode }) {
  return <IconPackContext.Provider value={pack}>{children}</IconPackContext.Provider>
}

/** The pack in use here. */
export function useIconPack(): IconPack {
  return useContext(IconPackContext)
}

/**
 * An icon by its meaning, drawn by the pack in context (or by `pack`, for a preview of another pack). Decorative: the
 * label next to it names the thing, so it is hidden from screen readers.
 */
export function Icon({ name, pack, className }: { name: IconName; pack?: IconPack | undefined; className?: string | undefined }) {
  const current = useContext(IconPackContext)
  const chosen = pack ?? current
  const Glyph = PACKS[chosen][name]
  return (
    <span aria-hidden="true" data-icon={name} data-icon-pack={chosen} className="inline-flex shrink-0">
      <Glyph className={cn('size-4', className)} />
    </span>
  )
}
