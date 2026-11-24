// Tasks: A to-do list: a sidebar on a computer, tabs at the foot on a phone, a list with its details, a board and a settings page.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Tasks: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useState, type ReactNode } from 'react'
import {
  AppShell, Avatar, Button, Card, Cluster, Column, Count, DateField, FormField, Grid, Heading, Icon, Input,
  Inspector, ItemList, ItemRow, KeyHints, NavItem, SettingRow, Sidebar, SidebarGroup, SidebarRow, Switch,
  Text, Textarea, TitleBar, Toasts, ToggleGroup, ToggleGroupItem, Toolbar, ToolbarBrand, ToolbarButton,
  ToolbarSearch, ToolbarSpacer, ToolbarTab, ToolbarTabs, useDesktopGuard, useMedia, WindowControls,
  type ToastItem,
} from '@acaprino/sigrid'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'today' | 'board' | 'settings'
const SCREENS: Record<Screen, string> = { today: 'Today', board: 'Board', settings: 'Settings' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

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
  const ownWindow = HOST.ownWindow && !narrow
  useDesktopGuard(ownWindow)
  // The window's three buttons, wired to the Tauri window; in a browser they do nothing and are not drawn.
  const windowControls = useWindowControls({ enabled: ownWindow })
  const go = (next: Screen) => {
    setScreen(next)
    setMenu(false)
  }
  const say = (text: string) => setNotices((list) => [...list, { id: crypto.randomUUID(), text }])

  const content: Record<Screen, ReactNode> = {
    today: (
      <Column gap="lg" pad="lg" width="page">
        <Card>
          <Text as="p" variant="note">Now</Text>
          <Heading size="small">Read the terms of the new contract</Heading>
          <Cluster>
            <Button onClick={() => say('Completed')}>Complete</Button>
            <Button variant="outline">Focus</Button>
            <Button variant="ghost">Postpone</Button>
          </Cluster>
        </Card>
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
      </Column>
    ),
    board: (
      <Column gap="lg" pad="lg">
        <Grid min="sm">
          <Card as="section" aria-label="To do" variant="quiet" pad="sm" gap="sm">
            <Cluster gap="sm"><Text variant="strong">To do</Text><Count value={2} label="cards" /></Cluster>
            <Card pad="sm">Renew the identity card</Card>
            <Card pad="sm">Book the train to Rome</Card>
          </Card>
          <Card as="section" aria-label="Doing" variant="quiet" pad="sm" gap="sm">
            <Cluster gap="sm"><Text variant="strong">Doing</Text><Count value={1} label="cards" /></Cluster>
            <Card pad="sm">Draft of the quote</Card>
          </Card>
          <Card as="section" aria-label="Done" variant="quiet" pad="sm" gap="sm">
            <Cluster gap="sm"><Text variant="strong">Done</Text><Count value={1} label="cards" /></Cluster>
            <Card pad="sm">Pay the waste tax</Card>
          </Card>
        </Grid>
      </Column>
    ),
    settings: (
      <Column gap="lg" pad="lg" width="prose">
        <Heading>Look</Heading>
        <Text as="p" variant="muted">How the app looks on this device.</Text>
        <Column gap="xs">
          <SettingRow
            label="Scheme"
            control={
              <ToggleGroup aria-label="Scheme" value={setting} onValueChange={setSetting}>
                <ToggleGroupItem value="light">Light</ToggleGroupItem>
                <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
              </ToggleGroup>
            }
          />
          <SettingRow
            label="Reminders"
            description="A notice at 9:00 for what is due"
            control={<Switch aria-label="Reminders" defaultChecked />}
          />
          <SettingRow label="Advanced" onClick={() => {}} />
        </Column>
      </Column>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    today: (
      <Inspector title="Task" open={details} onOpenChange={setDetails}>
        <Column gap="lg">
          <FormField label="Title">
            <Input placeholder="Read the terms of the new contract" autoComplete="off" />
          </FormField>
          <FormField label="Notes"><Textarea placeholder="What there is to know" /></FormField>
          <FormField label="Due date"><DateField value={day} onChange={setDay} /></FormField>
          <ToggleGroup aria-label="Priority" value={choice} onValueChange={setChoice}>
            <ToggleGroupItem value="p1">P1</ToggleGroupItem>
            <ToggleGroupItem value="p2">P2</ToggleGroupItem>
            <ToggleGroupItem value="p3">P3</ToggleGroupItem>
            <ToggleGroupItem value="none">None</ToggleGroupItem>
          </ToggleGroup>
        </Column>
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
            dragProps={ownWindow ? DRAG_REGION : undefined}
            windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}
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
                <SidebarRow leading={<Avatar name="Giulia Conti" size="xs" decorative />}>
                  Giulia Conti
                </SidebarRow>
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
              <Text>Saved</Text>
              <Text>3 for today</Text>
              <ToolbarSpacer />
              <KeyHints ids={[{ keys: '/', label: 'search' }]} />
              <KeyHints ids={[{ keys: 'Z', label: 'undo' }]} />
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
