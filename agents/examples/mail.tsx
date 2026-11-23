// Mail: A mail client: folders in a sidebar that is a drawer on a phone, a list, the message beside it, its actions under it.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Mail: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useState, type ReactNode } from 'react'
import {
  AppShell, Avatar, Button, Cluster, Column, Count, DrawerButton, Heading, Icon, Inspector, ItemList, ItemRow,
  KeyHints, NavItem, SettingRow, Sidebar, SidebarGroup, SidebarRow, Switch, Text, TitleBar, Toasts, Toolbar,
  ToolbarBrand, ToolbarButton, ToolbarSearch, ToolbarSpacer, ToolbarTab, ToolbarTabs, useDesktopGuard,
  useMedia, WindowControls, type ToastItem,
} from '@acaprino/sigrid'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'inbox' | 'settings'
const SCREENS: Record<Screen, string> = { inbox: 'Inbox', settings: 'Settings' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

export function App() {
  const [screen, setScreen] = useState<Screen>('inbox')
  const [menu, setMenu] = useState(false)
  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.
  const [details, setDetails] = useState(() => window.matchMedia('(min-width: 1000px)').matches)
  const [notices, setNotices] = useState<ToastItem[]>([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('smart')
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

  const content: Record<Screen, ReactNode> = {
    inbox: (
      <Column gap="lg" pad="sm">
        <ItemList aria-label="Messages">
          <ItemRow
            title="Maria Rossi"
            description="Q4 proposal: can you review by Thursday?"
            meta="09:42"
            unread
            current={row === 0}
            onClick={() => {
              setRow(0)
              setDetails(true)
            }}
          />
          <ItemRow
            title="Luca Bianchi"
            description="Design review moved to 3 pm"
            meta="08:15"
            unread
            current={row === 1}
            onClick={() => {
              setRow(1)
              setDetails(true)
            }}
          />
          <ItemRow
            title="Sofia"
            description="Dinner on Saturday?"
            meta="Sun"
            unread={false}
            current={row === 2}
            onClick={() => {
              setRow(2)
              setDetails(true)
            }}
          />
          <ItemRow
            title="Accounting"
            description="Invoice 2291 for October"
            meta="Fri"
            unread={false}
            current={row === 3}
            onClick={() => {
              setRow(3)
              setDetails(true)
            }}
          />
        </ItemList>
      </Column>
    ),
    settings: (
      <Column gap="lg" pad="lg" width="prose">
        <Heading>Accounts</Heading>
        <Column gap="xs">
          <SettingRow label="Work" description="alex@studio-example.com" onClick={() => {}} />
          <SettingRow
            label="Notices of new mail"
            control={<Switch aria-label="Notices of new mail" defaultChecked />}
          />
        </Column>
      </Column>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    inbox: (
      <Inspector title="Message" open={details} onOpenChange={setDetails}>
        <Column gap="lg">
          <Heading size="small">Q4 proposal: can you review by Thursday?</Heading>
          <Cluster gap="md" wrap={false}>
            <Avatar name="Maria Rossi" size="sm" decorative />
            <Column gap="xs">
              <Text variant="strong">Maria Rossi</Text>
              <Text variant="note">maria.rossi@studio-example.com, to you</Text>
            </Column>
          </Cluster>
          <Text as="p" variant="soft">
            I attached the draft of the Q4 proposal. Two numbers on page 3 still need your eye: the travel budget and the cost of the two new licences.
          </Text>
        </Column>
      </Inspector>
    ),
  }
  const actions: Partial<Record<Screen, ReactNode>> = {
    inbox: (
      <>
        <Button variant="outline" onClick={() => say('Archived')}>Archive</Button>
        <Button onClick={() => say('A reply would open here')}>Reply</Button>
      </>
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
            <Toolbar aria-label="Mail">
              <DrawerButton onOpen={() => setMenu(true)} />
              <ToolbarBrand name="Mail" page={SCREENS[screen]} />
              <ToolbarSpacer />
              <ToolbarSearch
                label="Search the mail"
                value={search}
                onValueChange={setSearch}
                closed="field"
                shortcut="Ctrl K"
              />
              <ToolbarButton
                label="New message"
                icon={<Icon name="plus" />}
                shortcut="N"
                variant="outline"
                onClick={() => say('A new message would open here')}
              >
                New message
              </ToolbarButton>
            </Toolbar>
          </TitleBar>
        }
        tabs={
          <Toolbar aria-label="Views">
            <ToolbarTabs aria-label="Views" value={view} onValueChange={setView}>
              <ToolbarTab value="smart">Smart</ToolbarTab>
              <ToolbarTab value="all">All</ToolbarTab>
              <ToolbarTab value="unread">Unread</ToolbarTab>
            </ToolbarTabs>
          </Toolbar>
        }
        sidebar={
          <Sidebar
            aria-label="Places"
            open={menu}
            onOpenChange={setMenu}
            footer={<SidebarRow leading={<Avatar name="Alex" size="xs" decorative />}>Alex</SidebarRow>}
          >
            <SidebarGroup label="Folders" icon={<Icon name="inbox" />}>
              <NavItem
                current={screen === 'inbox'}
                icon={<Icon name="inbox" />}
                end={<Count value={2} label="items" reserve />}
                onClick={() => go('inbox')}
              >
                Inbox
              </NavItem>
              <NavItem icon={<Icon name="clock" />}>Snoozed</NavItem>
              <NavItem icon={<Icon name="rename" />}>Drafts</NavItem>
              <NavItem icon={<Icon name="send" />}>Sent</NavItem>
              <NavItem icon={<Icon name="archive" />}>Archive</NavItem>
            </SidebarGroup>
            <SidebarGroup>
              <NavItem
                current={screen === 'settings'}
                icon={<Icon name="settings" />}
                onClick={() => go('settings')}
              >
                Settings
              </NavItem>
            </SidebarGroup>
          </Sidebar>
        }
        inspector={inspector[screen]}
        actions={actions[screen]}
        footer={
          !narrow ? (
            <>
              <Text>Connected</Text>
              <Text>2 to read</Text>
              <ToolbarSpacer />
              <KeyHints ids={[{ keys: 'R', label: 'reply' }]} />
              <KeyHints ids={[{ keys: 'E', label: 'archive' }]} />
            </>
          ) : undefined
        }
      >
        {content[screen]}
      </AppShell>
      <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((notice) => notice.id !== id))} />
    </>
  )
}
