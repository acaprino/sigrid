// From an app as data to what it draws: every region of every screen as elements (ir.ts), the values the app keeps in
// state, and what the frame has to provide (the drawer, the details, the notices). The run page turns a plan into
// React and the export prints it as source, so what runs in the editor and what is exported are one thing.
//
// The names an element may use while the app runs, beside the state the components declare:
//   screen, go(id)            the screen in sight, and the way to another (it closes the drawer too)
//   SCREENS                   the name of each screen
//   narrow                    the frame is narrow (under 620px): the sidebar is a drawer, a phone
//   menu, setMenu(open)       the drawer
//   details, setDetails(open), toggleDetails()  the inspector: open at the start only where it is docked
//   say(text)                 a notice at the foot of the window
import { CATALOG, isKind, type BuildCtx } from './catalog'
import { call, equals, h, name, not, text, type Child, type Expr, type StateDecl } from './ir'
import { SHARED, type AppModel, type Node, type Screen, type Settings, type SharedSlot } from './model'

export type ScreenPlan = Pick<Screen, 'id' | 'name' | 'icon' | 'pad' | 'width' | 'status' | 'detailsTitle'> & {
  readonly content: readonly Child[]
  /** Null: this screen has no inspector. */
  readonly details: readonly Child[] | null
  /** Null: this screen has no action bar. */
  readonly actions: readonly Child[] | null
}

export type Plan = {
  readonly name: string
  readonly start: string
  readonly settings: Settings
  readonly screens: readonly ScreenPlan[]
  readonly shared: Readonly<Record<SharedSlot, readonly Child[]>>
  readonly states: readonly StateDecl[]
  /** What the frame has to provide, because something in the app uses it. */
  readonly uses: { readonly say: boolean; readonly menu: boolean; readonly details: boolean }
}

/** The names the frame takes for itself: a component's state is given another. */
const RESERVED = ['screen', 'setScreen', 'go', 'menu', 'setMenu', 'details', 'setDetails', 'toggleDetails', 'narrow', 'notices', 'setNotices', 'say', 'content', 'inspector', 'actions', 'status']

export const SCREEN_NAME: Expr = { $expr: 'SCREENS[screen]', run: (scope) => (scope['SCREENS'] as Record<string, string> | undefined)?.[scope['screen'] as string] }

/** The visibility a component asks for, as the condition it is drawn under. Null: always. */
export function shownWhen(show: unknown): Expr | null {
  return show === 'narrow' ? name('narrow') : show === 'wide' ? not(name('narrow')) : null
}

export function planOf(app: AppModel): Plan {
  const states: StateDecl[] = []
  const taken = new Set(RESERVED)
  const uses = { say: false, menu: app.settings.sidebar !== 'off', details: app.screens.some((s) => s.details === 'on') }
  const screens = app.screens.map((s) => ({ id: s.id, name: s.name, icon: s.icon }))
  const known = new Set(screens.map((s) => s.id))

  const state: BuildCtx['state'] = (hint, initial, type) => {
    let id = hint
    for (let n = 2; taken.has(id); n++) id = `${hint}${n}`
    const setter = `set${id[0]!.toUpperCase()}${id.slice(1)}`
    taken.add(id).add(setter)
    states.push({ name: id, setter, initial, type })
    return { value: name(id), set: name(setter), name: id, setter }
  }
  const act: BuildCtx['act'] = (action, said) => {
    if (typeof action !== 'string') return undefined
    if (action.startsWith('go:')) return known.has(action.slice(3)) ? call('go', action.slice(3)) : undefined
    // With no sidebar there is no menu to open: the button does nothing, as with details an app does not have.
    if (action === 'menu') return uses.menu ? call('setMenu', true) : undefined
    if (action === 'details') return uses.details ? call('toggleDetails') : undefined
    if (action === 'show') return uses.details ? call('setDetails', true) : undefined
    if (action === 'say') {
      uses.say = true
      return call('say', text(said) || 'Done')
    }
    return undefined
  }
  const current: BuildCtx['current'] = (action) => (typeof action === 'string' && action.startsWith('go:') && known.has(action.slice(3)) ? equals('screen', action.slice(3)) : undefined)

  const build = (nodes: readonly Node[]): Child[] =>
    nodes.flatMap((node): Child[] => {
      if (!isKind(node.type)) return []
      const inside = (slot: string) => build(Array.isArray(node.props[slot]) ? (node.props[slot] as Node[]) : [])
      const ctx: BuildCtx = { appName: app.name, details: uses.details, screens, screenName: SCREEN_NAME, state, act, current, box: (slot, tag, props) => h(tag, props, inside(slot)), spread: (slot) => inside(slot) }
      const drawn = CATALOG[node.type].build(node.props, ctx)
      const when = shownWhen(node.props['show'])
      return [when ? { $when: when, then: drawn } : drawn]
    })

  const shared = Object.fromEntries(SHARED.map((slot) => [slot, build(app.shared[slot])])) as Record<SharedSlot, Child[]>
  return {
    name: app.name,
    start: known.has(app.start) ? app.start : (screens[0]?.id ?? ''),
    settings: app.settings,
    shared,
    screens: app.screens.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      pad: s.pad,
      width: s.width,
      status: s.status,
      detailsTitle: s.detailsTitle,
      content: build(s.content),
      details: s.details === 'on' ? build(s.detailsItems) : null,
      actions: s.actionsOn ? build(s.actions) : null,
    })),
    states,
    uses,
  }
}

/* ———— How the content of a screen is laid out: the same words for the canvas, the run page and the export ———— */

const PAD = { none: '', sm: 'p-2', md: 'p-4', lg: 'p-6' } as const
const WIDTH = { full: '', page: 'mx-auto w-full max-w-3xl', prose: 'mx-auto w-full max-w-prose' } as const

/** The classes of the column that holds a screen's content. */
export const contentClass = (s: Pick<Screen, 'pad' | 'width'>): string => ['flex min-h-full flex-col gap-4', PAD[s.pad], WIDTH[s.width]].filter(Boolean).join(' ')
/** The classes of the column inside the inspector. */
export const DETAILS_CLASS = 'flex flex-col gap-4'

/** Whether a region with this visibility is there in a frame of this kind. */
export const visible = (vis: Settings['sidebar'], narrow: boolean): boolean => vis === 'always' || (vis === 'narrow' && narrow) || (vis === 'wide' && !narrow)
