// Mail: A mail client: folders in a sidebar that is a drawer on a phone, a list, the message beside it, its actions under it.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Mail: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useState, type ReactNode } from 'react'
import {
  AppShell, Avatar, Button, Count, Icon, Inspector, ItemList, ItemRow, Kbd, NavItem, Sidebar, SidebarGroup,
  Switch, TitleBar, Toasts, Toolbar, ToolbarBrand, ToolbarButton, ToolbarSearch, ToolbarSpacer, ToolbarTab,
  ToolbarTabs, useAppShell, useDesktopGuard, useMedia, WindowControls, type ToastItem,
} from '@acaprino/sigrid'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'inbox' | 'settings'
const SCREENS: Record<Screen, string> = { inbox: 'Inbox', settings: 'Settings' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

/** The button that opens the sidebar: in the bar only where the frame has taken the sidebar out of the layout. */
function MenuButton({ onOpen }: { onOpen: () => void }) {
  return useAppShell().sidebar === 'drawer' ? <ToolbarButton label="Open the menu" icon={<Icon name="sidebarOpen" />} onClick={onOpen} /> : null
}

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
      <div className="flex min-h-full flex-col gap-4 p-2">
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
      </div>
    ),
    settings: (
      <div className="flex min-h-full flex-col gap-4 p-4 mx-auto w-full max-w-prose">
        <h2 className="text-xl font-semibold text-ink">Accounts</h2>
        <div className="flex flex-col gap-0">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col">
              <span>Work</span>
              <span className="text-xs text-ink-mute">alex@studio-example.com</span>
            </span>
            <span className="inline-flex text-ink-mute"><Icon name="chevron" /></span>
          </button>
          <div
            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-line py-2 text-start text-sm text-ink"
          >
            <span className="flex min-w-0 flex-col"><span>Notices of new mail</span></span>
            <Switch aria-label="Notices of new mail" defaultChecked />
          </div>
        </div>
      </div>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    inbox: (
      <Inspector title="Message" open={details} onOpenChange={setDetails}>
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-ink">Q4 proposal: can you review by Thursday?</h3>
          <div className="flex items-center gap-3">
            <Avatar name="Maria Rossi" size="sm" decorative />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-ink">Maria Rossi</span>
              <span className="truncate text-xs text-ink-mute">maria.rossi@studio-example.com, to you</span>
            </div>
          </div>
          <p className="text-sm text-ink-soft">
            I attached the draft of the Q4 proposal. Two numbers on page 3 still need your eye: the travel budget and the cost of the two new licences.
          </p>
        </div>
      </Inspector>
    ),
  }
  const actions: Partial<Record<Screen, ReactNode>> = {
    inbox: (
      <>
        <Button variant="outline" className="w-fit" onClick={() => say('Archived')}>Archive</Button>
        <Button className="w-fit" onClick={() => say('A reply would open here')}>Reply</Button>
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
              <MenuButton onOpen={() => setMenu(true)} />
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
            footer={
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-ink">
                <Avatar name="Alex" size="xs" decorative />
                <span className="min-w-0 flex-1 truncate">Alex</span>
              </div>
            }
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
              <span className="tabular-nums">Connected</span>
              <span className="tabular-nums">2 to read</span>
              <ToolbarSpacer />
              <span className="inline-flex items-center gap-1"><Kbd>R</Kbd>reply</span>
              <span className="inline-flex items-center gap-1"><Kbd>E</Kbd>archive</span>
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
