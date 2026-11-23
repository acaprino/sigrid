// Tasks: A to-do list: a sidebar on a computer, tabs at the foot on a phone, a list with its details, a board and a settings page.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports: `./host` is that project's file for the window of a native build.
// Tasks: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useLayoutEffect, useState, type ReactNode } from 'react'
import {
  AppShell, Avatar, BOTTOM_BAR_ROOM_VAR, Button, Count, DateField, FormField, Icon, Input, Inspector,
  ItemList, ItemRow, Kbd, NavItem, Sidebar, SidebarGroup, Switch, Textarea, TitleBar, Toasts, ToggleGroup,
  ToggleGroupItem, Toolbar, ToolbarBrand, ToolbarButton, ToolbarSearch, ToolbarSpacer, ToolbarTab,
  ToolbarTabs, useDesktopGuard, useMedia, WindowControls, type ToastItem,
} from '@acaprino/sigrid'
import { OWN_WINDOW, closeWindow, minimizeWindow, toggleMaximizeWindow } from './host'

type Screen = 'today' | 'board' | 'settings'
const SCREENS: Record<Screen, string> = { today: 'Today', board: 'Board', settings: 'Settings' }

export function App() {
  const [screen, setScreen] = useState<Screen>('today')
  const [menu, setMenu] = useState(false)
  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.
  const [details, setDetails] = useState(() => window.matchMedia('(min-width: 1000px)').matches)
  const [notices, setNotices] = useState<ToastItem[]>([])
  const [search, setSearch] = useState('')
  const [row, setRow] = useState(0)
  const [day, setDay] = useState<string | null>(null)
  const [choice, setChoice] = useState('p1')
  const [setting, setSetting] = useState('light')
  // Under this width the frame is laid out as on a phone: the sidebar is a drawer, the tabs are at the foot.
  const narrow = useMedia('(width < 620px)')
  // A window of its own on a computer: the app draws the window's bar, and takes the browser's own keys away.
  const ownWindow = OWN_WINDOW && !narrow
  useDesktopGuard(ownWindow)
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
    today: (
      <div className="flex min-h-full flex-col gap-4 p-4 mx-auto w-full max-w-3xl">
        <section className="flex flex-col gap-3 rounded-lg bg-raised shadow-xs p-4">
          <p className="text-xs text-ink-mute">Now</p>
          <h3 className="text-base font-semibold text-ink">Read the terms of the new contract</h3>
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <Button className="w-fit" onClick={() => say('Completed')}>Complete</Button>
            <Button variant="outline" className="w-fit">Focus</Button>
            <Button variant="ghost" className="w-fit">Postpone</Button>
          </div>
        </section>
        <ItemList aria-label="Tasks for today">
          <ItemRow
            title="Read the terms of the new contract"
            description="Electricity contract"
            meta="Today"
            unread
            current={row === 0}
            onClick={() => {
              setRow(0)
              setDetails(true)
            }}
          />
          <ItemRow
            title="Ask the carpenter for a quote"
            description="Kitchen renovation"
            meta="Today"
            unread={false}
            current={row === 1}
            onClick={() => {
              setRow(1)
              setDetails(true)
            }}
          />
          <ItemRow
            title="Renew the transit pass"
            description="No project"
            meta="Fri"
            unread={false}
            current={row === 2}
            onClick={() => {
              setRow(2)
              setDetails(true)
            }}
          />
        </ItemList>
      </div>
    ),
    board: (
      <div className="flex min-h-full flex-col gap-4 p-4">
        <div className="flex items-start gap-3 overflow-x-auto">
          <section className="flex w-56 shrink-0 flex-col gap-2 rounded-lg bg-paper-2 p-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
              To do
              <span className="text-2xs font-normal text-ink-mute tabular-nums">2</span>
            </h3>
            <div className="rounded-md bg-raised p-2 text-sm text-ink shadow-xs">Renew the identity card</div>
            <div className="rounded-md bg-raised p-2 text-sm text-ink shadow-xs">Book the train to Rome</div>
          </section>
          <section className="flex w-56 shrink-0 flex-col gap-2 rounded-lg bg-paper-2 p-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
              Doing
              <span className="text-2xs font-normal text-ink-mute tabular-nums">1</span>
            </h3>
            <div className="rounded-md bg-raised p-2 text-sm text-ink shadow-xs">Draft of the quote</div>
          </section>
          <section className="flex w-56 shrink-0 flex-col gap-2 rounded-lg bg-paper-2 p-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
              Done
              <span className="text-2xs font-normal text-ink-mute tabular-nums">1</span>
            </h3>
            <div className="rounded-md bg-raised p-2 text-sm text-ink shadow-xs">Pay the waste tax</div>
          </section>
        </div>
      </div>
    ),
    settings: (
      <div className="flex min-h-full flex-col gap-4 p-4 mx-auto w-full max-w-prose">
        <h2 className="text-xl font-semibold text-ink">Look</h2>
        <p className="text-sm text-ink-mute">How the app looks on this device.</p>
        <div className="flex flex-col gap-0">
          <div
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col"><span>Scheme</span></span>
            <ToggleGroup aria-label="Scheme" value={setting} onValueChange={setSetting}>
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col">
              <span>Reminders</span>
              <span className="text-xs text-ink-mute">A notice at 9:00 for what is due</span>
            </span>
            <Switch aria-label="Reminders" defaultChecked />
          </div>
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col"><span>Advanced</span></span>
            <span className="inline-flex text-ink-mute"><Icon name="chevron" /></span>
          </button>
        </div>
      </div>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    today: (
      <Inspector title="Task" open={details} onOpenChange={setDetails}>
        <div className="flex flex-col gap-4">
          <FormField label="Title">
            <Input placeholder="Read the terms of the new contract" autoComplete="off" />
          </FormField>
          <FormField label="Notes"><Textarea placeholder="What there is to know" /></FormField>
          <FormField label="Due date"><DateField value={day} onChange={setDay} /></FormField>
          <ToggleGroup aria-label="Priority" value={choice} onValueChange={setChoice} className="w-fit">
            <ToggleGroupItem value="p1">P1</ToggleGroupItem>
            <ToggleGroupItem value="p2">P2</ToggleGroupItem>
            <ToggleGroupItem value="p3">P3</ToggleGroupItem>
            <ToggleGroupItem value="none">None</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Inspector>
    ),
  }

  return (
    <>
      <AppShell
        desktop={ownWindow}
        contentLabel={SCREENS[screen]}
        titleBar={
          <TitleBar
            dragProps={ownWindow ? { 'data-tauri-drag-region': '' } : undefined}
            windowControls={ownWindow ? <WindowControls onMinimize={minimizeWindow} onMaximizeToggle={toggleMaximizeWindow} onClose={closeWindow} /> : undefined}
          >
            <Toolbar aria-label="Tasks">
              <ToolbarBrand name="Tasks" page={SCREENS[screen]} />
              <ToolbarSpacer />
              <ToolbarSearch label="Search the tasks" value={search} onValueChange={setSearch} shortcut="/" />
              <ToolbarButton
                label="New task"
                icon={<Icon name="plus" />}
                variant="outline"
                onClick={() => say('Added to Today')}
              >
                New task
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        sidebar={
          !narrow ? (
            <Sidebar
              aria-label="Places"
              open={menu}
              onOpenChange={setMenu}
              footer={
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-ink">
                  <Avatar name="Giulia Conti" size="xs" decorative />
                  <span className="min-w-0 flex-1 truncate">Giulia Conti</span>
                </div>
              }
            >
              <SidebarGroup>
                <NavItem
                  current={screen === 'today'}
                  icon={<Icon name="now" />}
                  end={<Count value={3} label="items" reserve />}
                  onClick={() => go('today')}
                >
                  Today
                </NavItem>
                <NavItem
                  current={screen === 'board'}
                  icon={<Icon name="structure" />}
                  onClick={() => go('board')}
                >
                  Board
                </NavItem>
                <NavItem
                  current={screen === 'settings'}
                  icon={<Icon name="settings" />}
                  onClick={() => go('settings')}
                >
                  Settings
                </NavItem>
              </SidebarGroup>
            </Sidebar>
          ) : undefined
        }
        inspector={inspector[screen]}
        footer={
          !narrow ? (
            <>
              <span className="tabular-nums">Saved</span>
              <span className="tabular-nums">3 for today</span>
              <ToolbarSpacer />
              <span className="inline-flex items-center gap-1"><Kbd>/</Kbd>search</span>
              <span className="inline-flex items-center gap-1"><Kbd>Z</Kbd>undo</span>
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
                <ToolbarTab value="today" icon={<Icon name="now" />}>Today</ToolbarTab>
                <ToolbarTab value="board" icon={<Icon name="structure" />}>Board</ToolbarTab>
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
