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
//   job, busy, runJob()       the app's job: how far it is (null when it does not run), whether it runs, the way to start it
import { CATALOG, FITS, isKind, type BuildCtx } from './catalog'
import { call, equals, h, isEl, isWhen, name, not, text, type Child, type El, type Expr, type StateDecl, type Val } from './ir'
import { SHARED, hasRegion, type AppModel, type Node, type Screen, type Settings, type SharedSlot } from './model'

export type ScreenPlan = Pick<Screen, 'id' | 'name' | 'icon' | 'pad' | 'width' | 'fit' | 'detailsTitle'> & {
  readonly content: readonly Child[]
  /** Null: this screen has no status row. */
  readonly status: readonly Child[] | null
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
  /**
   * What the frame has to provide, because something in the app uses it. `job`: a Job is in a status row, so there is a
   * job and its timer; `runJob`: something presses to start it.
   */
  readonly uses: { readonly say: boolean; readonly menu: boolean; readonly details: boolean; readonly job: boolean; readonly runJob: boolean }
}

/** The names the frame takes for itself: a component's state is given another. */
const RESERVED = ['screen', 'setScreen', 'go', 'menu', 'setMenu', 'details', 'setDetails', 'toggleDetails', 'narrow', 'notices', 'setNotices', 'say', 'job', 'setJob', 'busy', 'runJob', 'content', 'inspector', 'actions', 'status']

export const SCREEN_NAME: Expr = { $expr: 'SCREENS[screen]', run: (scope) => (scope['SCREENS'] as Record<string, string> | undefined)?.[scope['screen'] as string] }
/** The screen in sight has no details: `inspector` is the record of the screens that have them. */
const NO_DETAILS: Expr = { $expr: '!inspector[screen]', run: (scope) => !(scope['inspector'] as Record<string, unknown> | undefined)?.[scope['screen'] as string] }

/** The visibility a component asks for, as the condition it is drawn under. Null: always. */
export function shownWhen(show: unknown): Expr | null {
  return show === 'narrow' ? name('narrow') : show === 'wide' ? not(name('narrow')) : null
}

export function planOf(app: AppModel): Plan {
  const states: StateDecl[] = []
  const taken = new Set(RESERVED)
  const uses = { say: false, menu: app.settings.sidebar !== 'off', details: app.screens.some((s) => s.details === 'on'), job: app.screens.some((s) => s.statusOn && s.statusItems.some((node) => node.type === 'Job')), runJob: false }
  const screens = app.screens.map((s) => ({ id: s.id, name: s.name, icon: s.icon }))
  const noDetails = uses.details && app.screens.some((s) => s.details !== 'on') ? NO_DETAILS : undefined
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
    // With no job in a status row there is nothing to run: the button does nothing.
    if (action === 'job') {
      if (!uses.job) return undefined
      uses.runJob = true
      return call('runJob')
    }
    return undefined
  }
  const current: BuildCtx['current'] = (action) => (typeof action === 'string' && action.startsWith('go:') && known.has(action.slice(3)) ? equals('screen', action.slice(3)) : undefined)

  const build = (nodes: readonly Node[]): Child[] =>
    nodes.flatMap((node): Child[] => {
      if (!isKind(node.type)) return []
      const inside = (slot: string) => build(Array.isArray(node.props[slot]) ? (node.props[slot] as Node[]) : [])
      const ctx: BuildCtx = { appName: app.name, details: uses.details, job: uses.job, noDetails, screens, screenName: SCREEN_NAME, state, act, current, box: (slot, tag, props) => h(tag, props, tag === 'Cluster' ? inside(slot) : piled(inside(slot))), spread: (slot) => inside(slot) }
      const drawn = CATALOG[node.type].build(node.props, ctx)
      const when = shownWhen(node.props['show'])
      return [when ? { $when: when, then: drawn } : drawn]
    })

  // A region the app does not have is not built: what is kept in it (for when it comes back) declares no state.
  const shared = Object.fromEntries(SHARED.map((slot) => [slot, hasRegion(app.settings, slot) ? build(app.shared[slot]) : []])) as Record<SharedSlot, Child[]>
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
      fit: s.fit,
      detailsTitle: s.detailsTitle,
      content: build(s.content),
      status: s.statusOn ? build(s.statusItems) : null,
      details: s.details === 'on' ? piled(build(s.detailsItems)) : null,
      actions: s.actionsOn ? build(s.actions) : null,
    })),
    states,
    uses,
  }
}

/* ———— How the content of a screen is laid out: the same parts for the canvas, the run page and the export ———— */

/**
 * The parts of a pile, where a part that keeps the width of its content (a button, a badge: `FITS`) is in a row of its
 * own: a pile stretches what it holds, a row does not.
 */
export function piled(children: readonly Child[]): Child[] {
  const fit = (child: Child): Child => (isEl(child) && FITS.has(child) ? h('Cluster', null, child) : child)
  return children.map((child) => (isWhen(child) ? { ...child, then: fit(child.then) } : fit(child)))
}

/** The room around a screen's content, as a step of the toolkit's scale: none, 8, 16 or 24px. */
const PAD = { none: undefined, sm: 'sm', md: 'lg', lg: 'xl' } as const
/** How wide it grows (`Column width`): as wide as the content region, a column of content, a column of text. */
const WIDTH = { full: undefined, page: 'page', prose: 'prose' } as const

/** The props of the `Column` that holds a screen's content: 16px between its parts, its room and its width. */
export const bodyProps = (s: Pick<Screen, 'pad' | 'width'>): Record<string, Val> => ({ gap: 'lg', pad: PAD[s.pad], width: WIDTH[s.width] })
/** A job goes up by this many percent at each tick of its timer: from nothing to done in about four seconds. */
export const JOB_STEP = 5
export const JOB_TICK_MS = 200

/**
 * What holds a screen's content: a `Column` with its room and its width; for a screen that fits one screen, the
 * toolkit's `Page fit` (as tall as the frame's content; its body gives way and scrolls inside itself); and for a screen
 * that is one `Panel` from edge to edge, the panel itself, which lays the region out and scrolls its own body.
 */
export const screenBody = (s: Pick<Screen, 'pad' | 'width' | 'fit'>, children: readonly Child[]): El => {
  if (s.fit) return h('Page', { fit: true }, piled(children))
  const only = children.length === 1 ? children[0] : undefined
  if (s.pad === 'none' && s.width === 'full' && isEl(only) && only.tag === 'Panel') return only
  return h('Column', bodyProps(s), piled(children))
}
/** The props of the column inside the inspector. */
export const DETAILS_PROPS: Record<string, Val> = { gap: 'lg' }

/** Whether a region with this visibility is there in a frame of this kind. */
export const visible = (vis: Settings['sidebar'], narrow: boolean): boolean => vis === 'always' || (vis === 'narrow' && narrow) || (vis === 'wide' && !narrow)
