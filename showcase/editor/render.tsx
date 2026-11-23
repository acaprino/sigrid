// From elements (ir.ts) to React, and a whole app running from its plan (plan.ts): the run page is `RunApp`, and the
// canvas of the editor uses the same `Frame` with places to drop components in. What the frame is made of here is
// what the export writes (codegen.ts `frameSource`): change the two together.
import * as React from 'react'
import * as Sigrid from '../../src/index'
import {
  AppShell,
  AppShellContext,
  Avatar,
  BOTTOM_BAR_ROOM_VAR,
  Icon,
  Inspector,
  Sidebar,
  TitleBar,
  Toasts,
  Toolbar,
  ToolbarButton,
  WindowControls,
  useAppShell,
  useDesktopGuard,
  useMedia,
  type AppShellLayout,
  type ToastItem,
} from '../../src/index'
import { isEl, isExpr, isJson, isSlot, isWhen, type Child, type Scope, type Val } from './ir'
import type { AppModel, Settings } from './model'
import { DETAILS_CLASS, contentClass, planOf, visible, type ScreenPlan } from './plan'

/** Under this width of the frame the sidebar is a drawer: the app is laid out as on a phone. */
export const NARROW_PX = Sigrid.APP_SHELL_STEPS.rail
export type HostKind = 'web' | 'native'

/* ———— The helpers a generated app defines for itself (codegen.ts writes the same source) ———— */

/** The button that opens the sidebar, in the bar only where the frame has taken the sidebar out of the layout. */
function MenuButton({ onOpen }: { onOpen?: () => void }) {
  return useAppShell().sidebar === 'drawer' ? <ToolbarButton label="Open the menu" icon={<Icon name="sidebarOpen" />} onClick={onOpen} /> : null
}

const HELPERS: Record<string, React.ElementType> = { MenuButton }

function tagOf(tag: string): React.ElementType | null {
  if (/^[a-z]/.test(tag)) return tag as keyof React.JSX.IntrinsicElements
  return HELPERS[tag] ?? ((Sigrid as unknown as Record<string, React.ElementType | undefined>)[tag] ?? null)
}

const valueOf = (value: Val, scope: Scope): unknown => (isEl(value) ? draw(value, scope) : isExpr(value) ? value.run(scope) : isJson(value) ? value.$json : value)

/** An element, an expression or a word, as React draws it. */
export function draw(child: Child, scope: Scope, key?: React.Key): React.ReactNode {
  if (child === null || child === undefined || child === false) return null
  if (typeof child === 'string' || typeof child === 'number') return child
  if (isWhen(child)) return child.$when.run(scope) ? draw(child.then, scope, key) : null
  if (isSlot(child)) return React.createElement(child.$slot, { ...child.props, key })
  if (isExpr(child)) return child.run(scope) as React.ReactNode
  const tag = tagOf(child.tag)
  if (!tag) return null
  const props: Record<string, unknown> = { key }
  for (const [name, value] of Object.entries(child.props)) props[name] = valueOf(value, scope)
  return React.createElement(tag, props, ...child.children.map((kid, at) => draw(kid, scope, at)))
}

export const drawAll = (children: readonly Child[], scope: Scope): React.ReactNode => children.map((child, at) => draw(child, scope, at))

/* ———— The frame of an app: AppShell with its regions filled in ———— */

export type FrameProps = {
  name: string
  settings: Settings
  screen: Pick<ScreenPlan, 'id' | 'name' | 'status' | 'detailsTitle'>
  host: HostKind
  narrow: boolean
  /** What each region holds. Null: the region is not there. */
  bar: React.ReactNode
  tabs: React.ReactNode | null
  nav: React.ReactNode | null
  foot: React.ReactNode | null
  bottom: React.ReactNode | null
  content: React.ReactNode
  details: React.ReactNode | null
  actions: React.ReactNode | null
  menu: boolean
  onMenu: (open: boolean) => void
  detailsOpen: boolean
  onDetails: (open: boolean) => void
  animated?: boolean | undefined
  /**
   * On the canvas: how the frame is laid out at its width. There the drawer and the panel of the details are drawn in
   * place, over the content, and not as sheets: a sheet would close at the first press outside it.
   */
  edit?: AppShellLayout | undefined
}

const DOCKED: AppShellLayout = { sidebar: 'full', inspector: 'docked' }

export function Frame({ name, settings, screen, host, narrow, bar, tabs, nav, foot, bottom, content, details, actions, menu, onMenu, detailsOpen, onDetails, animated, edit }: FrameProps) {
  // A window of its own on a computer: the app draws the window's bar. On a phone the system draws everything.
  const ownWindow = host === 'native' && !narrow
  const [maximized, setMaximized] = React.useState(false)
  const sidebar = nav ? (
    <Sidebar
      aria-label="Places"
      open={menu}
      onOpenChange={onMenu}
      search={settings.sidebarSearch || undefined}
      animated={animated}
      footer={
        settings.account ? (
          <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-ink">
            <Avatar name={settings.account} size="xs" decorative />
            <span className="min-w-0 flex-1 truncate">{settings.account}</span>
          </div>
        ) : undefined
      }
    >
      {nav}
    </Sidebar>
  ) : undefined
  const inspector = details ? (
    <Inspector title={screen.detailsTitle || 'Details'} open={detailsOpen} onOpenChange={onDetails} animated={animated}>
      {details}
    </Inspector>
  ) : undefined
  return (
    <AppShell
      desktop={ownWindow}
      contentLabel={screen.name}
      titleBar={
        <TitleBar
          size={settings.barSize}
          dragProps={ownWindow ? { 'data-tauri-drag-region': '' } : undefined}
          windowControls={ownWindow ? <WindowControls maximized={maximized} onMinimize={() => {}} onMaximizeToggle={() => setMaximized(!maximized)} onClose={() => {}} /> : undefined}
        >
          <Toolbar aria-label={name}>{bar}</Toolbar>
        </TitleBar>
      }
      tabs={tabs ? <Toolbar aria-label="Views">{tabs}</Toolbar> : undefined}
      status={screen.status ? <span>{screen.status}</span> : undefined}
      sidebar={
        !edit || !sidebar ? (
          sidebar
        ) : edit.sidebar === 'drawer' ? (
          menu ? (
            <div data-edit-overlay="sidebar" className="absolute inset-y-0 left-0 z-30 flex shadow-lg">
              <AppShellContext.Provider value={DOCKED}>{sidebar}</AppShellContext.Provider>
            </div>
          ) : undefined
        ) : (
          sidebar
        )
      }
      inspector={
        !edit || !inspector ? (
          inspector
        ) : edit.inspector === 'drawer' ? (
          detailsOpen ? (
            <div data-edit-overlay="details" className="absolute inset-y-0 right-0 z-30 flex bg-raised shadow-lg">
              <AppShellContext.Provider value={DOCKED}>{inspector}</AppShellContext.Provider>
            </div>
          ) : undefined
        ) : (
          inspector
        )
      }
      actions={actions ?? undefined}
      footer={foot ?? undefined}
      bottomBar={bottom ? <Toolbar aria-label="Views at the foot">{bottom}</Toolbar> : undefined}
    >
      {content}
    </AppShell>
  )
}

/* ———— An app, running ———— */

/** Tells the notices how much room the app keeps at its foot, so they sit above it. */
function useFootRoom(root: React.RefObject<HTMLElement | null>, deps: React.DependencyList) {
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const kept = ['[data-slot="app-shell-bottom"]', '[data-slot="app-shell-actions"]', '[data-slot="app-shell-footer"]']
    const room = kept.reduce((sum, slot) => sum + (el.querySelector<HTMLElement>(slot)?.offsetHeight ?? 0), 0)
    el.ownerDocument.documentElement.style.setProperty(BOTTOM_BAR_ROOM_VAR, `${room}px`)
  }, deps)
}

export type RunAppProps = {
  app: AppModel
  host: HostKind
  /** The screen to start on, and to follow when it changes from outside (the editor shows the same one). */
  screen?: string | undefined
  onScreen?: ((id: string) => void) | undefined
}

/** The app as it runs: the same plan the export prints, with its state, its navigation and its notices. */
export function RunApp({ app, host, screen: asked, onScreen }: RunAppProps) {
  const plan = React.useMemo(() => planOf(app), [app])
  const [screenId, setScreenId] = React.useState(asked && plan.screens.some((s) => s.id === asked) ? asked : plan.start)
  const [menu, setMenu] = React.useState(false)
  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.
  const [details, setDetails] = React.useState(() => window.matchMedia(`(min-width: ${Sigrid.APP_SHELL_STEPS.inspector}px)`).matches)
  const [values, setValues] = React.useState<Record<string, unknown>>({})
  const [notices, setNotices] = React.useState<ToastItem[]>([])
  const count = React.useRef(0)
  const root = React.useRef<HTMLDivElement>(null)
  const narrow = useMedia(`(width < ${NARROW_PX}px)`)
  useDesktopGuard(host === 'native' && !narrow)
  // Only when another screen is asked for: an edit makes a new plan, and must not take the user back to the first screen.
  const screensNow = React.useRef(plan.screens)
  screensNow.current = plan.screens
  React.useEffect(() => {
    if (asked && screensNow.current.some((s) => s.id === asked)) setScreenId(asked)
  }, [asked])
  const screen = plan.screens.find((s) => s.id === screenId) ?? plan.screens[0]
  useFootRoom(root, [screenId, narrow, plan])
  if (!screen) return null

  const go = (next: string) => {
    if (!plan.screens.some((s) => s.id === next)) return
    setScreenId(next)
    setMenu(false)
    onScreen?.(next)
  }
  const scope: Scope = {
    screen: screen.id,
    go,
    SCREENS: Object.fromEntries(plan.screens.map((s) => [s.id, s.name])),
    narrow,
    menu,
    setMenu,
    details,
    setDetails,
    toggleDetails: () => setDetails((open) => !open),
    say: (said: string) => setNotices((list) => [...list, { id: `notice-${(count.current += 1)}`, text: said }]),
  }
  for (const state of plan.states) {
    scope[state.name] = state.name in values ? values[state.name] : state.initial
    scope[state.setter] = (next: unknown) => setValues((now) => ({ ...now, [state.name]: next }))
  }
  const region = (slot: 'tabs' | 'nav' | 'foot' | 'bottom', vis: Settings['sidebar']) => (visible(vis, narrow) ? <>{drawAll(plan.shared[slot], scope)}</> : null)
  return (
    <div ref={root} className="h-full">
      <Frame
        name={plan.name}
        settings={plan.settings}
        screen={screen}
        host={host}
        narrow={narrow}
        animated={app.look.animated}
        bar={drawAll(plan.shared.bar, scope)}
        tabs={region('tabs', plan.settings.tabs)}
        nav={region('nav', plan.settings.sidebar)}
        foot={region('foot', plan.settings.foot)}
        bottom={region('bottom', plan.settings.bottom)}
        content={<div className={contentClass(screen)}>{drawAll(screen.content, scope)}</div>}
        details={screen.details ? <div className={DETAILS_CLASS}>{drawAll(screen.details, scope)}</div> : null}
        actions={screen.actions ? <>{drawAll(screen.actions, scope)}</> : null}
        menu={menu}
        onMenu={setMenu}
        detailsOpen={details}
        onDetails={setDetails}
      />
      {plan.uses.say ? <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((n) => n.id !== id))} animated={app.look.animated} /> : null}
    </div>
  )
}
