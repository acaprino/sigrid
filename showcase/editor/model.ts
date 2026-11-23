// An app as the editor keeps it: its name, its look, the regions of the frame that every screen shares (the bar at the
// head, the sidebar, the tabs, the strip and the bar at the foot), and its screens, each with what is its own (the
// content, the details, the actions). It is plain data: kept in the browser, copied and read back as JSON, and the one
// thing the run page and the export are given. Also here: the apps to start from, and where the data is kept.
import type { IconName } from '../../src/index'
import { CATALOG, iconName, isKind, type Kind } from './catalog'
import { flag, list, oneOf, slug, text } from './ir'
import { START_LOOK, type Look } from './look'

/** A component in a region: what it is and how it is set. `props.id` tells it apart; a slot is a list of these. */
export type Node = { type: string; props: Record<string, unknown> }

/** When a region is there: never, always, or only where the frame is wide or narrow (under 620px, a phone). */
export type Vis = 'off' | 'always' | 'wide' | 'narrow'
export const VIS: readonly Vis[] = ['off', 'always', 'wide', 'narrow']

/** The regions every screen shares, by the name of their slot. */
export const SHARED = ['bar', 'tabs', 'nav', 'foot', 'bottom'] as const
export type SharedSlot = (typeof SHARED)[number]
/** The regions of one screen. */
export const OWN = ['content', 'details', 'actions'] as const
export type OwnSlot = (typeof OWN)[number]

export type Settings = {
  /** `compact`: the thin caption of a classic desktop program. */
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
  /** The line under the bar: the last result, a summary. Empty: no line. */
  status: string
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
  return { id: slug(name, 'screen'), name, icon, pad: 'md', width: 'page', status: '', details: 'off', detailsTitle: 'Details', actionsOn: false, content: [], detailsItems: [], actions: [], ...set }
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

const SETTINGS: Settings = { barSize: 'default', sidebar: 'off', sidebarSearch: false, account: '', tabs: 'off', bottom: 'off', foot: 'off' }
const NO_SHARED = (): Record<SharedSlot, Node[]> => ({ bar: [], tabs: [], nav: [], foot: [], bottom: [] })

/* ———— Apps to start from ———— */

export type Starter = { id: string; name: string; about: string; make: () => AppModel }

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

function blank(): AppModel {
  return { version: 1, name: 'My app', look: structuredClone(START_LOOK), start: 'home', settings: { ...SETTINGS }, shared: { ...NO_SHARED(), bar: [make('Brand'), make('Spacer')] }, screens: [screen('Home', 'all')] }
}

export const STARTERS: readonly Starter[] = [
  { id: 'tasks', name: 'Tasks', about: 'A to-do list: a sidebar on a computer, tabs at the foot on a phone, a list with its details, a board and a settings page.', make: tasks },
  { id: 'mail', name: 'Mail', about: 'A mail client: folders in a sidebar that is a drawer on a phone, a list, the message beside it, its actions under it.', make: mail },
  { id: 'blank', name: 'Blank', about: 'A bar with the name of the app and one empty screen.', make: blank },
]

/* ———— Reading an app back: from the browser, or from a file someone made ———— */

const nodes = (value: unknown): Node[] =>
  list(value)
    .filter((item) => isKind(item['type']) && typeof item['props'] === 'object' && item['props'] !== null)
    .map((item) => {
      const kind = item['type'] as Kind
      const given = item['props'] as Record<string, unknown>
      const props: Record<string, unknown> = { ...structuredClone(CATALOG[kind].fresh), show: 'always', ...given, id: typeof given['id'] === 'string' && given['id'] ? given['id'] : uid(kind) }
      // A slot holds components, whatever was written there.
      for (const [key, field] of Object.entries(CATALOG[kind].fields)) if (field.kind === 'slot') props[key] = nodes(given[key])
      return { type: kind, props }
    })

/** An app from data of any origin, made whole: what is missing or of another kind takes its starting value. Null: not an app. */
export function readApp(value: unknown): AppModel | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  const settings = (typeof data['settings'] === 'object' && data['settings'] !== null ? data['settings'] : {}) as Record<string, unknown>
  const shared = (typeof data['shared'] === 'object' && data['shared'] !== null ? data['shared'] : {}) as Record<string, unknown>
  const seen = new Set<string>()
  const screens = list(data['screens']).map((s): Screen => {
    const named = text(s['name'], 'Screen')
    let id = slug(text(s['id']) || named, 'screen')
    while (seen.has(id)) id = `${id}-2`
    seen.add(id)
    return {
      id,
      name: named,
      icon: iconName(s['icon']),
      pad: oneOf(s['pad'], ['md', 'none', 'sm', 'lg'] as const),
      width: oneOf(s['width'], ['page', 'full', 'prose'] as const),
      status: text(s['status']),
      details: s['details'] === 'on' ? 'on' : 'off',
      detailsTitle: text(s['detailsTitle'], 'Details'),
      actionsOn: flag(s['actionsOn']),
      content: nodes(s['content']),
      detailsItems: nodes(s['detailsItems']),
      actions: nodes(s['actions']),
    }
  })
  if (screens.length === 0) return null
  const look = typeof data['look'] === 'object' && data['look'] !== null ? { ...structuredClone(START_LOOK), ...(data['look'] as Partial<Look>) } : structuredClone(START_LOOK)
  return {
    version: 1,
    name: text(data['name'], 'My app'),
    look,
    start: screens.some((s) => s.id === data['start']) ? (data['start'] as string) : screens[0]!.id,
    settings: {
      barSize: settings['barSize'] === 'compact' ? 'compact' : 'default',
      sidebar: oneOf(settings['sidebar'], VIS),
      sidebarSearch: flag(settings['sidebarSearch']),
      account: text(settings['account']),
      tabs: oneOf(settings['tabs'], VIS),
      bottom: oneOf(settings['bottom'], VIS),
      foot: oneOf(settings['foot'], VIS),
    },
    shared: { bar: nodes(shared['bar']), tabs: nodes(shared['tabs']), nav: nodes(shared['nav']), foot: nodes(shared['foot']), bottom: nodes(shared['bottom']) },
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
  return SHARED.reduce((sum, slot) => sum + count(app.shared[slot]), 0) + app.screens.reduce((sum, s) => sum + count(s.content) + count(s.detailsItems) + count(s.actions), 0)
}
