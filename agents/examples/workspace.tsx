// Workspace: Laid out as Xiox, in the sheet frame: the views as tabs in the bar with a «Commands» button, a sidebar of categories, a status row, a list in a panel, the details, the actions and the keys at the foot.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Workspace: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import {
  AppShell, Badge, BOTTOM_BAR_ROOM_VAR, Button, Count, Empty, Icon, Inspector, ItemList, ItemRow, Kbd,
  NavItem, Panel, Progress, Sidebar, SidebarGroup, Switch, TitleBar, Toasts, Toolbar, ToolbarBrand,
  ToolbarButton, ToolbarSpacer, ToolbarTab, ToolbarTabs, useAppShell, useDesktopGuard, useMedia,
  WindowControls, type ToastItem,
} from '@acaprino/sigrid'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'cleanup' | 'registry' | 'settings'
const SCREENS: Record<Screen, string> = { cleanup: 'Cleanup', registry: 'Registry', settings: 'Settings' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

/** The button that opens the sidebar: in the bar only where the frame has taken the sidebar out of the layout. */
function MenuButton({ onOpen }: { onOpen: () => void }) {
  return useAppShell().sidebar === 'drawer' ? <ToolbarButton label="Open the menu" icon={<Icon name="sidebarOpen" />} onClick={onOpen} /> : null
}

export function App() {
  const [screen, setScreen] = useState<Screen>('cleanup')
  const [menu, setMenu] = useState(false)
  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.
  const [details, setDetails] = useState(() => window.matchMedia('(min-width: 1000px)').matches)
  const [notices, setNotices] = useState<ToastItem[]>([])
  // The job of the app: how far it is, in percent, while it runs; null when it does not.
  const [job, setJob] = useState<number | null>(null)
  const busy = job !== null
  useEffect(() => {
    if (job === null) return
    const timer = setTimeout(() => setJob(job >= 100 ? null : Math.min(100, job + 5)), 200)
    return () => clearTimeout(timer)
  }, [job])
  const runJob = () => setJob(0)
  const [row, setRow] = useState(0)
  // Under this width the frame is laid out as on a phone: the sidebar is a drawer, the tabs are at the foot.
  const narrow = useMedia('(width < 620px)')
  // A window of its own on a computer: the app draws the window's bar, and takes the browser's own keys away.
  const ownWindow = HOST.ownWindow && !narrow
  useDesktopGuard(ownWindow)
  // The window's three buttons, wired to the Tauri window; in a browser they do nothing and are not drawn.
  const windowControls = useWindowControls({ enabled: ownWindow })
  const go = (next: Screen) => {
    setScreen(next)
    setMenu(false)
  }
  const say = (text: string) => setNotices((list) => [...list, { id: crypto.randomUUID(), text }])
  // The notices sit above what the app keeps at its foot.
  useLayoutEffect(() => {
    const kept = ['app-shell-bottom', 'app-shell-actions', 'app-shell-footer']
    const room = kept.reduce((sum, slot) => sum + (document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)?.offsetHeight ?? 0), 0)
    document.documentElement.style.setProperty(BOTTOM_BAR_ROOM_VAR, `${room}px`)
  }, [screen, narrow])

  const content: Record<Screen, ReactNode> = {
    cleanup: (
      <div className="flex min-h-full flex-col gap-4">
        <Panel title="Cleanup" subtitle="5 items · 2 selected" className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-4 pb-4">
            <ItemList aria-label="Items">
              <ItemRow
                title="Browser cache"
                description="Pages and images saved to load faster"
                meta="1.50 GB"
                current={row === 0}
                onClick={() => {
                  setRow(0)
                  setDetails(true)
                }}
              />
              <ItemRow
                title="Cookies"
                description="Sites in the keep list stay signed in"
                meta="40 MB"
                current={row === 1}
                onClick={() => {
                  setRow(1)
                  setDetails(true)
                }}
              />
              <ItemRow
                title="Model cache"
                description="Models downloaded for local tools"
                meta="14.0 GB"
                current={row === 2}
                onClick={() => {
                  setRow(2)
                  setDetails(true)
                }}
              />
              <ItemRow
                title="Package cache"
                description="Packages a package manager downloaded"
                meta="2.10 GB"
                current={row === 3}
                onClick={() => {
                  setRow(3)
                  setDetails(true)
                }}
              />
              <ItemRow
                title="Temporary files"
                description="Left behind by installers"
                meta="640 MB"
                current={row === 4}
                onClick={() => {
                  setRow(4)
                  setDetails(true)
                }}
              />
            </ItemList>
          </div>
        </Panel>
      </div>
    ),
    registry: (
      <div className="flex min-h-full flex-col gap-4">
        <Panel title="Registry" subtitle="Not analyzed yet" className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Empty
              className="py-10"
              title="Nothing analyzed yet"
              description="Analyze to find what can be cleaned."
            />
          </div>
        </Panel>
      </div>
    ),
    settings: (
      <div className="flex min-h-full flex-col gap-4 p-4 mx-auto w-full max-w-prose">
        <h2 className="text-xl font-semibold text-ink">Settings</h2>
        <div className="flex flex-col gap-0">
          <div
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col">
              <span>Skip what is in use</span>
              <span className="text-xs text-ink-mute">Programs that are open keep their files</span>
            </span>
            <Switch aria-label="Skip what is in use" defaultChecked />
          </div>
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col"><span>Keep list</span></span>
            <span className="inline-flex text-ink-mute"><Icon name="chevron" /></span>
          </button>
        </div>
      </div>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    cleanup: (
      <Inspector title="Item" open={details} onOpenChange={setDetails}>
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-ink">Browser cache</h3>
          <Badge variant="secondary" className="w-fit">Recommended</Badge>
          <p className="text-sm text-ink-soft">
            Pages and images the browser saved to load faster. It saves them again as you browse.
          </p>
        </div>
      </Inspector>
    ),
  }
  const actions: Partial<Record<Screen, ReactNode>> = {
    cleanup: (
      <>
        <Button variant="outline" className="w-fit" disabled={busy} onClick={() => runJob()}>
          <Icon name="refresh" />
          Analyze
        </Button>
        <Button className="w-fit" onClick={() => say('2 items cleaned')}>Clean 2 items</Button>
      </>
    ),
  }
  const status: Partial<Record<Screen, ReactNode>> = {
    cleanup: (
      <>
        {busy ? (
          <>
            <Badge variant="secondary" className="shrink-0">Analyzing</Badge>
            <span className="shrink-0 text-ink-soft">Analyzing…</span>
            <Progress aria-label="Analyzing…" value={job} size="sm" className="w-48 shrink-0" />
            <span className="shrink-0 font-semibold text-ink tabular-nums">{job}%</span>
            <span className="min-w-0 truncate">
              {['System', 'Browser', 'Development', 'Applications'][Math.min(3, Math.floor(((job ?? 0) * 4) / 100))]}
            </span>
          </>
        ) : null}
        {!busy ? (
          <span className="min-w-0 truncate text-ink-soft">Analysis done · 18.3 GB to clean</span>
        ) : null}
      </>
    ),
    registry: (
      <>
        {busy ? (
          <>
            <Badge variant="secondary" className="shrink-0">Analyzing</Badge>
            <span className="shrink-0 text-ink-soft">Analyzing…</span>
            <Progress aria-label="Analyzing…" value={job} size="sm" className="w-48 shrink-0" />
            <span className="shrink-0 font-semibold text-ink tabular-nums">{job}%</span>
            <span className="min-w-0 truncate">
              {['System', 'Browser', 'Development', 'Applications'][Math.min(3, Math.floor(((job ?? 0) * 4) / 100))]}
            </span>
          </>
        ) : null}
        {!busy ? (
          <span className="min-w-0 truncate text-ink-soft">Analysis done · 18.3 GB to clean</span>
        ) : null}
      </>
    ),
    settings: (
      <>
        {busy ? (
          <>
            <Badge variant="secondary" className="shrink-0">Analyzing</Badge>
            <span className="shrink-0 text-ink-soft">Analyzing…</span>
            <Progress aria-label="Analyzing…" value={job} size="sm" className="w-48 shrink-0" />
            <span className="shrink-0 font-semibold text-ink tabular-nums">{job}%</span>
            <span className="min-w-0 truncate">
              {['System', 'Browser', 'Development', 'Applications'][Math.min(3, Math.floor(((job ?? 0) * 4) / 100))]}
            </span>
          </>
        ) : null}
        {!busy ? (
          <span className="min-w-0 truncate text-ink-soft">Analysis done · 18.3 GB to clean</span>
        ) : null}
      </>
    ),
  }

  return (
    <>
      <AppShell
        desktop={ownWindow}
        frame="sheet"
        contentLabel={SCREENS[screen]}
        titleBar={
          <TitleBar
            dragProps={ownWindow ? DRAG_REGION : undefined}
            windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}
          >
            <Toolbar aria-label="Workspace">
              <MenuButton onOpen={() => setMenu(true)} />
              <ToolbarBrand name="Workspace" />
              {!narrow ? (
                <ToolbarTabs aria-label="Views" value={screen} onValueChange={(next) => go(next as Screen)}>
                  <ToolbarTab value="cleanup">Cleanup</ToolbarTab>
                  <ToolbarTab value="registry">Registry</ToolbarTab>
                  <ToolbarTab value="settings">Settings</ToolbarTab>
                </ToolbarTabs>
              ) : null}
              <ToolbarSpacer />
              <ToolbarButton
                label="Commands"
                icon={<Icon name="search" />}
                shortcut="Ctrl K"
                variant="outline"
                onClick={() => say('The command palette would open here')}
              >
                Commands
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        status={status[screen]}
        sidebar={
          <Sidebar aria-label="Places" open={menu} onOpenChange={setMenu}>
            <SidebarGroup label="Categories" icon={<Icon name="labels" />}>
              <NavItem icon={<Icon name="settings" />} end={<Count value={6} label="items" reserve />}>
                System
              </NavItem>
              <NavItem icon={<Icon name="link" />} end={<Count value={5} label="items" reserve />}>
                Browser
              </NavItem>
              <NavItem icon={<Icon name="ai" />} end={<Count value={4} label="items" reserve />}>
                Development
              </NavItem>
              <NavItem icon={<Icon name="all" />} end={<Count value={44} label="items" reserve />}>
                Applications
              </NavItem>
            </SidebarGroup>
          </Sidebar>
        }
        inspector={inspector[screen]}
        actions={actions[screen]}
        footer={
          !narrow ? (
            <>
              <span className="tabular-nums">5 items</span>
              <ToolbarSpacer />
              <span className="inline-flex items-center gap-1"><Kbd>↑↓</Kbd>move</span>
              <span className="inline-flex items-center gap-1"><Kbd>Space</Kbd>select</span>
              <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd>clean</span>
            </>
          ) : undefined
        }
        bottomBar={
          narrow ? (
            <Toolbar aria-label="Views at the foot">
              <ToolbarTabs
                aria-label="Views"
                value={screen}
                onValueChange={(next) => go(next as Screen)}
                edge="top"
                layout="stacked"
              >
                <ToolbarTab value="cleanup" icon={<Icon name="delete" />}>Cleanup</ToolbarTab>
                <ToolbarTab value="registry" icon={<Icon name="structure" />}>Registry</ToolbarTab>
                <ToolbarTab value="settings" icon={<Icon name="settings" />}>Settings</ToolbarTab>
              </ToolbarTabs>
            </Toolbar>
          ) : undefined
        }
      >
        {content[screen]}
      </AppShell>
      <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((notice) => notice.id !== id))} />
    </>
  )
}
