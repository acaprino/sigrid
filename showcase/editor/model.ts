// An app as the editor keeps it: its name, its look, the form of its frame (`line` or Xiox's `sheet`), the regions of
// the frame that every screen shares (the bar at the head, and the sidebar, the tabs, the strip and the bar at the foot
// where the app has them), and its screens, each with what is its own (the content, the details, the actions). Only the
// bar and the content are always there: every other region is the app's choice. It is plain data: kept in the browser,
// copied and read back as JSON, and the one thing the run page and the export are given. Also here: the apps and the
// layouts to start from, and where the data is kept.
import type { IconName } from '../../src/primitives'
import { CATALOG, iconName, isKind, type FieldSpec, type Kind, type Region } from './catalog'
import { flag, list, oneOf, slug, text } from './ir'
import { START_LOOK, readLook, type Look } from './look'

/** A component in a region: what it is and how it is set. `props.id` tells it apart; a slot is a list of these. */
export type Node = { type: string; props: Record<string, unknown> }

/** When a region is there: never, always, or only where the frame is wide or narrow (under 620px, a phone). */
export type Vis = 'off' | 'always' | 'wide' | 'narrow'
export const VIS: readonly Vis[] = ['off', 'always', 'wide', 'narrow']

/** The regions every screen shares, by the name of their slot. */
export const SHARED = ['bar', 'tabs', 'nav', 'foot', 'bottom'] as const
export type SharedSlot = (typeof SHARED)[number]
/** The setting that says whether a shared region is there and where. The bar has none: it is always there. */
export const SHARED_VIS = { tabs: 'tabs', nav: 'sidebar', foot: 'foot', bottom: 'bottom' } as const satisfies Record<Exclude<SharedSlot, 'bar'>, keyof Settings>
/** Whether the app has a shared region at all, at some width. */
export const hasRegion = (settings: Settings, slot: SharedSlot): boolean => slot === 'bar' || settings[SHARED_VIS[slot]] !== 'off'
/** The regions of one screen. */
export const OWN = ['content', 'status', 'details', 'actions'] as const
export type OwnSlot = (typeof OWN)[number]

export type Settings = {
  /**
   * The form of the frame (`AppShell frame`): `line`, one surface with lines between the regions, or `sheet`, Xiox's
   * (the bar and the sidebar on the window's ground, the work one sheet with a corner).
   */
  frame: 'line' | 'sheet'
  /**
   * The top of the sheet frame (`AppShell top`): `bar`, the bar across the window; `unified`, one row flush above the
   * sheet, with the sidebar's button and the app over the sidebar, the tabs beside them joined to the sheet, and the
   * bar's tools at its end. The line frame has no such row: there it is the bar.
   */
  top: 'bar' | 'unified'
  /** `compact`: the thin caption of a classic desktop program. Not in the one top row, whose height is the window's. */
  barSize: 'default' | 'compact'
  sidebar: Vis
  sidebarSearch: boolean
  /** The name at the foot of the sidebar, with its avatar. Empty: nothing there. */
  account: string
  tabs: Vis
  bottom: Vis
  foot: Vis
}

export type Screen = {
  id: string
  name: string
  icon: IconName
  /** The room around the content, and how wide it may grow: the whole place, a page, or a column of text. */
  pad: 'none' | 'sm' | 'md' | 'lg'
  width: 'full' | 'page' | 'prose'
  /**
   * One screen and no more: the content is the toolkit's `Page fit`, as tall as the frame's content, and gives way and
   * scrolls inside itself; the document never scrolls. The room and the width are then the page's own.
   */
  fit: boolean
  /**
   * The row under the bar (in the sheet frame, the head of the sheet): the last result, a summary, the progress of a
   * job. Off: no row.
   */
  statusOn: boolean
  statusItems: Node[]
  details: 'off' | 'on'
  detailsTitle: string
  actionsOn: boolean
  content: Node[]
  detailsItems: Node[]
  actions: Node[]
}

export type AppModel = { version: 1; name: string; look: Look; settings: Settings; shared: Record<SharedSlot, Node[]>; screens: Screen[]; start: string }

/* ———— Making components and screens ———— */

let serial = 0
const uid = (kind: string) => `${kind}-${Date.now().toString(36)}${(serial++).toString(36)}`

/** A component as the list of components gives it, with some of its fields set. */
export function make(kind: Kind, set: Record<string, unknown> = {}): Node {
  return { type: kind, props: { ...structuredClone(CATALOG[kind].fresh), show: 'always', ...set, id: uid(kind) } }
}

export function screen(name: string, icon: IconName, set: Partial<Screen> = {}): Screen {
  return { id: slug(name, 'screen'), name, icon, pad: 'md', width: 'page', fit: false, statusOn: false, statusItems: [], details: 'off', detailsTitle: 'Details', actionsOn: false, content: [], detailsItems: [], actions: [], ...set }
}

/** A name no other screen has: «Screen», «Screen 2». */
export function freshScreenName(app: AppModel, base = 'Screen'): string {
  const taken = new Set(app.screens.map((s) => s.id))
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base} ${n}`
    if (!taken.has(slug(candidate, 'screen'))) return candidate
  }
}

/** A copy of some components, each with an id of its own, slots included. */
export function copyNodes(nodes: readonly Node[]): Node[] {
  return nodes.map((node) => {
    const props: Record<string, unknown> = { ...structuredClone(node.props), id: uid(node.type) }
    for (const [key, value] of Object.entries(props)) if (isNodes(value)) props[key] = copyNodes(value)
    return { type: node.type, props }
  })
}

export const isNodes = (value: unknown): value is Node[] => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'object' && item !== null && typeof (item as Node).type === 'string' && typeof (item as Node).props === 'object')

const SETTINGS: Settings = { frame: 'line', top: 'bar', barSize: 'default', sidebar: 'off', sidebarSearch: false, account: '', tabs: 'off', bottom: 'off', foot: 'off' }
const NO_SHARED = (): Record<SharedSlot, Node[]> => ({ bar: [], tabs: [], nav: [], foot: [], bottom: [] })

/* ———— Apps to start from ———— */

/** `app`: a whole app, with its content. `layout`: the regions of a frame with little in them, to start from. */
export type Starter = { id: string; name: string; kind: 'app' | 'layout'; about: string; make: () => AppModel }

function tasks(): AppModel {
  const rows = [
    { title: 'Read the terms of the new contract', line: 'Electricity contract', fact: 'Today', unread: true },
    { title: 'Ask the carpenter for a quote', line: 'Kitchen renovation', fact: 'Today', unread: false },
    { title: 'Renew the transit pass', line: 'No project', fact: 'Fri', unread: false },
  ]
  return {
    version: 1,
    name: 'Tasks',
    look: structuredClone(START_LOOK),
    start: 'today',
    // A whole sidebar where there is room; on a phone the same places are tabs at the foot, and the strip of keys goes.
    settings: { ...SETTINGS, sidebar: 'wide', bottom: 'narrow', foot: 'wide', account: 'Giulia Conti' },
    shared: {
      ...NO_SHARED(),
      bar: [make('Brand'), make('Spacer'), make('BarSearch', { label: 'Search the tasks', shortcut: '/' }), make('BarButton', { label: 'New task', icon: 'plus', variant: 'outline', action: 'say', said: 'Added to Today' })],
      nav: [
        make('NavGroup', {
          items: [make('NavItem', { label: 'Today', icon: 'now', count: 3, action: 'go:today' }), make('NavItem', { label: 'Board', icon: 'structure', action: 'go:board' }), make('NavItem', { label: 'Settings', icon: 'settings', action: 'go:settings' })],
        }),
      ],
      bottom: [make('BottomTabs')],
      foot: [make('FootText', { text: 'Saved' }), make('FootText', { text: '3 for today' }), make('Spacer'), make('KeyHint', { keys: '/', word: 'search' }), make('KeyHint', { keys: 'Z', word: 'undo' })],
    },
    screens: [
      screen('Today', 'now', {
        details: 'on',
        detailsTitle: 'Task',
        content: [
          make('Card', {
            items: [
              make('Text', { text: 'Now', tone: 'mute', size: 'xs' }),
              make('Heading', { text: 'Read the terms of the new contract', level: 'small' }),
              make('Row', { items: [make('Button', { label: 'Complete', action: 'say', said: 'Completed' }), make('Button', { label: 'Focus', variant: 'outline' }), make('Button', { label: 'Postpone', variant: 'ghost' })] }),
            ],
          }),
          make('List', { label: 'Tasks for today', rows, chosen: true, action: 'show' }),
        ],
        detailsItems: [make('Field', { label: 'Title', placeholder: 'Read the terms of the new contract' }), make('Field', { label: 'Notes', kind: 'area', placeholder: 'What there is to know' }), make('Day'), make('Segment', { label: 'Priority', options: [{ label: 'P1' }, { label: 'P2' }, { label: 'P3' }, { label: 'None' }] })],
      }),
      screen('Board', 'structure', { width: 'full', content: [make('Board')] }),
      screen('Settings', 'settings', {
        width: 'prose',
        content: [
          make('Heading', { text: 'Look', level: 'section' }),
          make('Text', { text: 'How the app looks on this device.', tone: 'mute' }),
          make('Stack', { gap: 'none', items: [make('Setting', { label: 'Scheme', control: 'segment' }), make('Setting', { label: 'Reminders', about: 'A notice at 9:00 for what is due' }), make('Setting', { label: 'Advanced', control: 'more' })] }),
        ],
      }),
    ],
  }
}

function mail(): AppModel {
  const rows = [
    { title: 'Maria Rossi', line: 'Q4 proposal: can you review by Thursday?', fact: '09:42', unread: true },
    { title: 'Luca Bianchi', line: 'Design review moved to 3 pm', fact: '08:15', unread: true },
    { title: 'Sofia', line: 'Dinner on Saturday?', fact: 'Sun', unread: false },
    { title: 'Accounting', line: 'Invoice 2291 for October', fact: 'Fri', unread: false },
  ]
  return {
    version: 1,
    name: 'Mail',
    look: { ...structuredClone(START_LOOK), accent: '#4452c4', accentAuto: false },
    start: 'inbox',
    // The folders are too many for tabs: on a narrow frame the sidebar is a drawer, opened from the bar.
    settings: { ...SETTINGS, sidebar: 'always', tabs: 'always', foot: 'wide', account: 'Alex' },
    shared: {
      ...NO_SHARED(),
      bar: [make('MenuButton'), make('Brand'), make('Spacer'), make('BarSearch', { label: 'Search the mail', closed: 'field', shortcut: 'Ctrl K' }), make('BarButton', { label: 'New message', icon: 'plus', shortcut: 'N', action: 'say', said: 'A new message would open here' })],
      tabs: [make('ViewTabs', { source: 'custom', tabs: [{ label: 'Smart' }, { label: 'All' }, { label: 'Unread' }] })],
      nav: [
        make('NavGroup', {
          label: 'Folders',
          icon: 'inbox',
          items: [
            make('NavItem', { label: 'Inbox', icon: 'inbox', count: 2, action: 'go:inbox' }),
            make('NavItem', { label: 'Snoozed', icon: 'clock' }),
            make('NavItem', { label: 'Drafts', icon: 'rename' }),
            make('NavItem', { label: 'Sent', icon: 'send' }),
            make('NavItem', { label: 'Archive', icon: 'archive' }),
          ],
        }),
        make('NavGroup', { items: [make('NavItem', { label: 'Settings', icon: 'settings', action: 'go:settings' })] }),
      ],
      foot: [make('FootText', { text: 'Connected' }), make('FootText', { text: '2 to read' }), make('Spacer'), make('KeyHint', { keys: 'R', word: 'reply' }), make('KeyHint', { keys: 'E', word: 'archive' })],
    },
    screens: [
      screen('Inbox', 'inbox', {
        pad: 'sm',
        width: 'full',
        details: 'on',
        detailsTitle: 'Message',
        actionsOn: true,
        content: [make('List', { label: 'Messages', rows, chosen: true, action: 'show' })],
        detailsItems: [
          make('Heading', { text: 'Q4 proposal: can you review by Thursday?', level: 'small' }),
          make('Person', { name: 'Maria Rossi', line: 'maria.rossi@studio-example.com, to you' }),
          make('Text', { text: 'I attached the draft of the Q4 proposal. Two numbers on page 3 still need your eye: the travel budget and the cost of the two new licences.' }),
        ],
        actions: [make('Button', { label: 'Archive', variant: 'outline', action: 'say', said: 'Archived' }), make('Button', { label: 'Reply', action: 'say', said: 'A reply would open here' })],
      }),
      screen('Settings', 'settings', { width: 'prose', content: [make('Heading', { text: 'Accounts', level: 'section' }), make('Stack', { gap: 'none', items: [make('Setting', { label: 'Work', about: 'alex@studio-example.com', control: 'more' }), make('Setting', { label: 'Notices of new mail' })] })] }),
    ],
  }
}

function workspace(): AppModel {
  const rows = [
    { title: 'Browser cache', line: 'Pages and images saved to load faster', fact: '1.50 GB', unread: false },
    { title: 'Cookies', line: 'Sites in the keep list stay signed in', fact: '40 MB', unread: false },
    { title: 'Model cache', line: 'Models downloaded for local tools', fact: '14.0 GB', unread: false },
    { title: 'Package cache', line: 'Packages a package manager downloaded', fact: '2.10 GB', unread: false },
    { title: 'Temporary files', line: 'Left behind by installers', fact: '640 MB', unread: false },
  ]
  const category = (label: string, icon: IconName, count: number) => make('NavItem', { label, icon, count })
  // The job of the whole window, at the head of every view: the row does not come and go from one view to the next.
  const job = () => make('Job', { result: 'Analysis done · 18.3 GB to clean', items: 'System\nBrowser\nDevelopment\nApplications' })
  return {
    version: 1,
    name: 'Workspace',
    look: structuredClone(START_LOOK),
    start: 'cleanup',
    // Xiox's frame: the views are tabs in the bar, the categories a sidebar on the window's ground, the work one sheet.
    // On a phone the views go to the foot and the categories are a drawer, opened from the bar.
    settings: { ...SETTINGS, frame: 'sheet', sidebar: 'always', bottom: 'narrow', foot: 'wide' },
    shared: {
      ...NO_SHARED(),
      bar: [
        make('MenuButton'),
        make('Brand', { page: 'none' }),
        make('ViewTabs', { show: 'wide' }),
        make('Spacer'),
        make('BarButton', { label: 'Commands', icon: 'search', variant: 'outline', shortcut: 'Ctrl K', action: 'say', said: 'The command palette would open here' }),
      ],
      nav: [make('NavGroup', { label: 'Categories', icon: 'labels', items: [category('System', 'settings', 6), category('Browser', 'link', 5), category('Development', 'ai', 4), category('Applications', 'all', 44)] })],
      bottom: [make('BottomTabs')],
      foot: [make('FootText', { text: '5 items' }), make('Spacer'), make('KeyHint', { keys: '↑↓', word: 'move' }), make('KeyHint', { keys: 'Space', word: 'select' }), make('KeyHint', { keys: '↵', word: 'clean' })],
    },
    screens: [
      screen('Cleanup', 'delete', {
        pad: 'none',
        width: 'full',
        statusOn: true,
        statusItems: [job()],
        details: 'on',
        detailsTitle: 'Item',
        actionsOn: true,
        content: [make('Panel', { title: 'Cleanup', subtitle: '5 items · 2 selected', items: [make('List', { label: 'Items', rows, chosen: true, action: 'show' })] })],
        detailsItems: [
          make('Heading', { text: 'Browser cache', level: 'small' }),
          make('Label', { text: 'Recommended' }),
          make('Text', { text: 'Pages and images the browser saved to load faster. It saves them again as you browse.' }),
        ],
        actions: [make('Button', { label: 'Analyze', variant: 'outline', icon: 'refresh', action: 'job' }), make('Button', { label: 'Clean 2 items', action: 'say', said: '2 items cleaned' })],
      }),
      screen('Registry', 'structure', {
        pad: 'none',
        width: 'full',
        statusOn: true,
        statusItems: [job()],
        content: [make('Panel', { title: 'Registry', subtitle: 'Not analyzed yet', items: [make('Empty', { title: 'Nothing analyzed yet', about: 'Analyze to find what can be cleaned.' })] })],
      }),
      screen('Settings', 'settings', {
        width: 'prose',
        statusOn: true,
        statusItems: [job()],
        content: [make('Heading', { text: 'Settings', level: 'section' }), make('Stack', { gap: 'none', items: [make('Setting', { label: 'Skip what is in use', about: 'Programs that are open keep their files' }), make('Setting', { label: 'Keep list', control: 'more' })] })],
      }),
    ],
  }
}

function notes(): AppModel {
  const place = (label: string, icon: IconName, to: string, count = 0) => make('NavItem', { label, icon, count, action: `go:${to}` })
  const list = (label: string, rows: { title: string; line: string; fact: string }[]) => make('List', { label, rows: rows.map((row) => ({ ...row, unread: false })), chosen: true, action: 'none' })
  return {
    version: 1,
    name: 'Notes',
    look: structuredClone(START_LOOK),
    start: 'all-notes',
    // The sheet frame with its one top row: the sidebar's button and the app over the places, the open notes as tabs
    // joined to the sheet, the search at the row's end. On a phone the places are tabs at the foot (no drawer: four
    // places fit there) and the open notes take the whole row.
    settings: { ...SETTINGS, frame: 'sheet', top: 'unified', sidebar: 'wide', bottom: 'narrow', tabs: 'always' },
    shared: {
      ...NO_SHARED(),
      bar: [make('Brand', { page: 'none' }), make('Spacer'), make('BarSearch', { label: 'Search the notes', shortcut: '/' })],
      tabs: [make('DocTabs', { tabs: [{ label: 'Trip' }, { label: 'Ideas' }] })],
      nav: [make('NavGroup', { items: [place('All notes', 'all', 'all-notes', 12), place('Travel', 'globe', 'travel', 4), place('Home', 'folder', 'home', 5), place('Archive', 'archive', 'archive')] })],
      bottom: [make('BottomTabs')],
    },
    screens: [
      screen('All notes', 'all', {
        width: 'prose',
        details: 'on',
        detailsTitle: 'Note',
        content: [
          make('Heading', { text: 'Trip to Lisbon', level: 'page' }),
          make('Text', { text: 'Four days in May, and the train from Porto on the way back.', tone: 'mute' }),
          make('Markdown', { text: '**Before leaving**\n\n- [x] Book the flight\n- [ ] Book the train back from Porto\n- [ ] Ask Marta about the tram passes' }),
        ],
        detailsItems: [make('Field', { label: 'Title', placeholder: 'Trip to Lisbon' }), make('Choice', { label: 'Folder', options: [{ label: 'Travel' }, { label: 'Home' }, { label: 'Archive' }] }), make('Day', { label: 'Reminder' })],
      }),
      screen('Travel', 'globe', {
        pad: 'sm',
        width: 'full',
        content: [
          list('Notes in Travel', [
            { title: 'Trip to Lisbon', line: 'Four days in May', fact: 'Today' },
            { title: 'Packing list', line: 'Chargers, the adapter, the rain jacket', fact: 'Mon' },
            { title: 'Hotels in Porto', line: 'Two near the station', fact: 'Apr 2' },
          ]),
        ],
      }),
      screen('Home', 'folder', {
        pad: 'sm',
        width: 'full',
        content: [
          list('Notes in Home', [
            { title: 'Kitchen quote', line: 'The second version, from Marta Riva', fact: 'Fri' },
            { title: 'Plants to repot', line: 'The fig and the two ferns', fact: 'Mar 28' },
          ]),
        ],
      }),
      screen('Archive', 'archive', { content: [make('Empty', { title: 'Nothing archived', about: 'A note you archive is kept here, out of the way.' })] }),
    ],
  }
}

/* The layouts: few components, each a way to lay a screen out. Only the one top row has a sidebar: it is made of one. */

function tabsOnly(): AppModel {
  return {
    version: 1,
    name: 'My app',
    look: structuredClone(START_LOOK),
    start: 'home',
    // The screens are tabs under the bar where there is room, and tabs at the foot on a phone.
    settings: { ...SETTINGS, tabs: 'wide', bottom: 'narrow' },
    shared: { ...NO_SHARED(), bar: [make('Brand', { page: 'none' }), make('Spacer'), make('BarButton', { label: 'New', icon: 'plus', variant: 'outline' })], tabs: [make('ViewTabs')], bottom: [make('BottomTabs')] },
    screens: [
      screen('Home', 'all', { content: [make('Heading', { text: 'Home', level: 'page' }), make('Text', { text: 'What the app is for, on its first screen.' })] }),
      screen('Activity', 'history', { content: [make('Empty', { title: 'Nothing yet', about: 'What happens shows up here.' })] }),
      screen('Settings', 'settings', { width: 'prose', content: [make('Heading', { text: 'Settings', level: 'section' }), make('Stack', { gap: 'none', items: [make('Setting', { label: 'Notices' })] })] }),
    ],
  }
}

function tabsDetails(): AppModel {
  return {
    version: 1,
    name: 'My app',
    look: structuredClone(START_LOOK),
    start: 'items',
    // Views of one screen as tabs under the bar; the details of the row chosen beside the list, a panel on a phone.
    settings: { ...SETTINGS, tabs: 'always' },
    shared: {
      ...NO_SHARED(),
      bar: [make('Brand', { page: 'none' }), make('Spacer'), make('BarSearch'), make('BarButton', { label: 'New', icon: 'plus', variant: 'outline' })],
      tabs: [make('ViewTabs', { source: 'custom', tabs: [{ label: 'All' }, { label: 'Open' }, { label: 'Closed' }] })],
    },
    screens: [
      screen('Items', 'all', {
        pad: 'sm',
        width: 'full',
        details: 'on',
        detailsTitle: 'Item',
        content: [make('List', { label: 'Items', action: 'show' })],
        detailsItems: [make('Field', { label: 'Title', placeholder: 'Kitchen quote, second version' }), make('Field', { label: 'Notes', kind: 'area' }), make('Segment', { label: 'State', options: [{ label: 'Open' }, { label: 'Closed' }], wide: true })],
      }),
    ],
  }
}

function listDetails(): AppModel {
  return {
    version: 1,
    name: 'My app',
    look: structuredClone(START_LOOK),
    start: 'list',
    // One screen: the list, the details of the row chosen beside it, and the actions on it under the content.
    settings: { ...SETTINGS },
    shared: { ...NO_SHARED(), bar: [make('Brand', { page: 'none' }), make('Spacer'), make('BarSearch')] },
    screens: [
      screen('List', 'all', {
        pad: 'sm',
        width: 'full',
        details: 'on',
        actionsOn: true,
        content: [make('List', { label: 'Items', action: 'show' })],
        detailsItems: [make('Heading', { text: 'Kitchen quote, second version', level: 'small' }), make('Person'), make('Text', { text: 'The details of the row chosen in the list.' })],
        actions: [make('Button', { label: 'Archive', variant: 'outline', action: 'say', said: 'Archived' }), make('Button', { label: 'Open', action: 'say', said: 'It would open here' })],
      }),
    ],
  }
}

function triage(): AppModel {
  const quick = (label: string) => make('Button', { label, variant: 'outline', size: 'sm', action: 'say', said: `Set to ${label.toLowerCase()}` })
  return {
    version: 1,
    name: 'Triage',
    look: structuredClone(START_LOOK),
    start: 'sort',
    // The screens are tabs in a bar of their own where there is room, and at the foot on a phone.
    settings: { ...SETTINGS, tabs: 'wide', bottom: 'narrow' },
    shared: {
      ...NO_SHARED(),
      bar: [make('Brand'), make('Spacer'), make('BarButton', { label: 'Write', icon: 'plus', variant: 'outline', action: 'go:write' })],
      tabs: [make('ViewTabs')],
      bottom: [make('BottomTabs')],
    },
    screens: [
      // One item at a time, on one screen: how many are left in the row under the bar, which never scrolls; in the
      // body, which gives way, the two-state switch, the progress and the item in a card; the two answers at the foot
      // (the actions), the solid one last. The row and the answers do not move from one item to the next.
      screen('Sort', 'inbox', {
        fit: true,
        statusOn: true,
        statusItems: [make('FootText', { text: '3 of 12 sorted' })],
        actionsOn: true,
        content: [
          make('Segment', { label: 'Which items', options: [{ label: 'New' }, { label: 'Waiting' }] }),
          make('Progress', { label: 'Sorted', shape: 'bar', value: 25 }),
          make('Card', {
            items: [
              make('Field', { label: 'Title', placeholder: 'Call the plumber about the leak' }),
              make('Choice', { label: 'Where it goes', options: [{ label: 'Home' }, { label: 'Work' }, { label: 'Someday' }] }),
              make('Day', { label: 'When' }),
              make('Row', { items: [quick('Today'), quick('Tomorrow'), quick('Next week')] }),
            ],
          }),
        ],
        actions: [make('Button', { label: 'Later', variant: 'outline', action: 'say', said: 'Moved to the end' }), make('Button', { label: 'Looks good', action: 'say', said: 'Sorted' })],
      }),
      screen('Write', 'rename', {
        width: 'prose',
        content: [make('Heading', { text: 'Write it all down', level: 'section' }), make('Field', { label: 'What is on your mind', kind: 'area', placeholder: 'One thing on each line', help: 'Each line is an item to sort.' })],
      }),
    ],
  }
}

function unifiedSheet(): AppModel {
  return {
    version: 1,
    name: 'My app',
    look: structuredClone(START_LOOK),
    start: 'home',
    // The sheet frame's one top row: the sidebar's button and the app over the places, the open documents as tabs
    // joined to the sheet. On a phone the places are tabs at the foot and the documents take the whole row.
    settings: { ...SETTINGS, frame: 'sheet', top: 'unified', sidebar: 'wide', bottom: 'narrow', tabs: 'always' },
    shared: {
      ...NO_SHARED(),
      bar: [make('Brand', { page: 'none' }), make('Spacer')],
      tabs: [make('DocTabs')],
      nav: [make('NavGroup', { items: [make('NavItem', { label: 'Home', icon: 'all', action: 'go:home' }), make('NavItem', { label: 'Settings', icon: 'settings', action: 'go:settings' })] })],
      bottom: [make('BottomTabs')],
    },
    screens: [
      screen('Home', 'all', { content: [make('Heading', { text: 'Home', level: 'page' }), make('Text', { text: 'The document of the tab chosen above.' })] }),
      screen('Settings', 'settings', { width: 'prose', content: [make('Heading', { text: 'Settings', level: 'section' }), make('Stack', { gap: 'none', items: [make('Setting', { label: 'Notices' })] })] }),
    ],
  }
}

function blank(): AppModel {
  return { version: 1, name: 'My app', look: structuredClone(START_LOOK), start: 'home', settings: { ...SETTINGS }, shared: { ...NO_SHARED(), bar: [make('Brand'), make('Spacer')] }, screens: [screen('Home', 'all')] }
}

export const STARTERS: readonly Starter[] = [
  { id: 'tasks', name: 'Tasks', kind: 'app', about: 'A to-do list: a sidebar on a computer, tabs at the foot on a phone, a list with its details, a board and a settings page.', make: tasks },
  { id: 'mail', name: 'Mail', kind: 'app', about: 'A mail client: folders in a sidebar that is a drawer on a phone, a list, the message beside it, its actions under it.', make: mail },
  {
    id: 'workspace',
    name: 'Workspace',
    kind: 'app',
    about: 'Laid out as Xiox, in the sheet frame: the views as tabs in the bar with a «Commands» button, a sidebar of categories, a status row, a list in a panel, the details, the actions and the keys at the foot.',
    make: workspace,
  },
  { id: 'triage', name: 'Triage', kind: 'app', about: 'Sorting what came in, one item at a time, on one screen whose page never scrolls: how many are left in the row under the bar, a two-state switch and the item in a body that gives way, the answers at the foot.', make: triage },
  {
    id: 'notes',
    name: 'Notes',
    kind: 'app',
    about: 'A notes app in the sheet frame with its one top row: the places in a sidebar, the open notes as tabs joined to the sheet (a plus adds one, a cross closes it), the search at the row’s end, a note with its details; on a phone the places are tabs at the foot.',
    make: notes,
  },
  { id: 'tabs', name: 'Tabs', kind: 'layout', about: 'No sidebar: three screens as tabs under the bar, at the foot on a phone.', make: tabsOnly },
  { id: 'tabs-details', name: 'Tabs and details', kind: 'layout', about: 'No sidebar: views as tabs under the bar, a list, and the details of the row chosen beside it.', make: tabsDetails },
  { id: 'list-details', name: 'List and details', kind: 'layout', about: 'No sidebar and no tabs: one list, the details of the row chosen beside it, the actions under it.', make: listDetails },
  { id: 'unified-sheet', name: 'One top row', kind: 'layout', about: 'The sheet frame with one row at its top: the sidebar’s button and the app over a sidebar, the open documents as tabs joined to the sheet; on a phone the places are tabs at the foot.', make: unifiedSheet },
  { id: 'blank', name: 'Blank', kind: 'layout', about: 'A bar with the name of the app and one empty screen.', make: blank },
]

/* ———— Reading an app back: from the browser, or from a file someone made ———— */

/**
 * The components of a region, from data of any origin: a kind the catalogue does not have, or one that this region
 * does not take (a button of the bar in the content has no toolbar around it, and the page would not draw), is left
 * out. Two components never share an id: the canvas tells them apart by it.
 */
function nodes(value: unknown, region: Region, ids: Set<string>): Node[] {
  return list(value)
    .filter((item) => isKind(item['type']) && (CATALOG[item['type']].into as readonly Region[]).includes(region) && typeof item['props'] === 'object' && item['props'] !== null)
    .map((item) => {
      const kind = item['type'] as Kind
      const given = item['props'] as Record<string, unknown>
      let id = typeof given['id'] === 'string' && given['id'] ? given['id'] : uid(kind)
      while (ids.has(id)) id = uid(kind)
      ids.add(id)
      const props: Record<string, unknown> = { ...structuredClone(CATALOG[kind].fresh), show: 'always', ...given, id }
      // A slot holds components, whatever was written there.
      for (const [key, field] of Object.entries(CATALOG[kind].fields) as [string, FieldSpec][]) if (field.kind === 'slot') props[key] = nodes(given[key], field.takes, ids)
      return { type: kind, props }
    })
}

/** An app from data of any origin, made whole: what is missing or of another kind takes its starting value. Null: not an app. */
export function readApp(value: unknown): AppModel | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  const settings = (typeof data['settings'] === 'object' && data['settings'] !== null ? data['settings'] : {}) as Record<string, unknown>
  const shared = (typeof data['shared'] === 'object' && data['shared'] !== null ? data['shared'] : {}) as Record<string, unknown>
  const seen = new Set<string>()
  const ids = new Set<string>()
  const screens = list(data['screens']).map((s): Screen => {
    const named = text(s['name'], 'Screen')
    // An app saved when the status row was one line of text: the line is a fact in the row.
    const said = text(s['status'])
    let id = slug(text(s['id']) || named, 'screen')
    while (seen.has(id)) id = `${id}-2`
    seen.add(id)
    return {
      id,
      name: named,
      icon: iconName(s['icon']),
      pad: oneOf(s['pad'], ['md', 'none', 'sm', 'lg'] as const),
      width: oneOf(s['width'], ['page', 'full', 'prose'] as const),
      // An app saved before the option: its screens do not fit.
      fit: flag(s['fit']),
      statusOn: flag(s['statusOn']) || (s['statusOn'] === undefined && said !== ''),
      statusItems: nodes(Array.isArray(s['statusItems']) ? s['statusItems'] : said ? [{ type: 'FootText', props: { text: said } }] : [], 'status', ids),
      details: s['details'] === 'on' ? 'on' : 'off',
      detailsTitle: text(s['detailsTitle'], 'Details'),
      actionsOn: flag(s['actionsOn']),
      content: nodes(s['content'], 'content', ids),
      detailsItems: nodes(s['detailsItems'], 'content', ids),
      actions: nodes(s['actions'], 'actions', ids),
    }
  })
  if (screens.length === 0) return null
  return {
    version: 1,
    name: text(data['name'], 'My app'),
    look: readLook(data['look']),
    start: screens.some((s) => s.id === data['start']) ? (data['start'] as string) : screens[0]!.id,
    settings: {
      // An app saved before the frame had two forms has the line one.
      frame: settings['frame'] === 'sheet' ? 'sheet' : 'line',
      // An app saved before the sheet frame had two tops has the bar.
      top: settings['top'] === 'unified' ? 'unified' : 'bar',
      barSize: settings['barSize'] === 'compact' ? 'compact' : 'default',
      sidebar: oneOf(settings['sidebar'], VIS),
      sidebarSearch: flag(settings['sidebarSearch']),
      account: text(settings['account']),
      tabs: oneOf(settings['tabs'], VIS),
      bottom: oneOf(settings['bottom'], VIS),
      foot: oneOf(settings['foot'], VIS),
    },
    shared: { bar: nodes(shared['bar'], 'bar', ids), tabs: nodes(shared['tabs'], 'tabs', ids), nav: nodes(shared['nav'], 'sidebar', ids), foot: nodes(shared['foot'], 'footer', ids), bottom: nodes(shared['bottom'], 'bottom', ids) },
    screens,
  }
}

/** Where the app being edited is kept in this browser. The run page reads the same place. */
export const STORE_KEY = 'sigrid-app-editor-1'

export function loadApp(): AppModel | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? readApp(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveApp(app: AppModel): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(app))
  } catch {
    // A browser that keeps nothing: the editor works, and forgets on reload.
  }
}

/** How many components an app holds, slots included. */
export function countNodes(app: AppModel): number {
  const count = (list: readonly Node[]): number => list.reduce((sum, node) => sum + 1 + Object.values(node.props).reduce<number>((inner, value) => inner + (isNodes(value) ? count(value) : 0), 0), 0)
  return SHARED.reduce((sum, slot) => sum + count(app.shared[slot]), 0) + app.screens.reduce((sum, s) => sum + count(s.content) + count(s.statusItems) + count(s.detailsItems) + count(s.actions), 0)
}
