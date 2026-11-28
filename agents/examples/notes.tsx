// Notes: A notes app in the sheet frame with its one top row: the places in a sidebar, the open notes as tabs joined to the sheet (a plus adds one, a cross closes it), the search at the row’s end, a note with its details; on a phone the places are tabs at the foot.
// A whole app in the toolkit's frame, written by the app editor of the showcase (scripts/agents.mjs). It is `src/App.tsx`
// of the project the editor exports; where it runs and its window come from `@acaprino/sigrid/tauri`.
// Notes: made with the Sigrid app editor. Every part is the toolkit's own; change anything.
import { useState, type ReactNode } from 'react'
import { useDesktopGuard, useMedia } from '@acaprino/sigrid'
import { Column, Count, Heading, Icon, Input, Select, Text } from '@acaprino/sigrid/primitives'
import { DateField, Empty, FormField, ItemList, ItemRow, MarkdownBlocks } from '@acaprino/sigrid/components'
import {
  AppShell, DocumentTab, DocumentTabs, Inspector, NavItem, Sidebar, SidebarGroup, Toolbar, ToolbarBrand,
  ToolbarSearch, ToolbarTab, ToolbarTabs, WindowControls,
} from '@acaprino/sigrid/layout'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Screen = 'all-notes' | 'travel' | 'home' | 'archive'
const SCREENS: Record<Screen, string> = { 'all-notes': 'All notes', travel: 'Travel', home: 'Home', archive: 'Archive' }
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

export function App() {
  const [screen, setScreen] = useState<Screen>('all-notes')
  const [menu, setMenu] = useState(false)
  // The details start open only where they are docked beside the content: on a narrow frame they would cover it.
  const [details, setDetails] = useState(() => window.matchMedia('(min-width: 1000px)').matches)
  // The sidebar shrunk to its rail by the button of the one top row, or whole.
  const [collapsed, setCollapsed] = useState(false)
  // The documents open in tabs, and the one in sight: the app's own, apart from the screen.
  const [docs, setDocs] = useState<{ id: string; title: string }[]>([
    { id: 'trip', title: 'Trip' },
    { id: 'ideas', title: 'Ideas' },
  ])
  const [activeDoc, setActiveDoc] = useState<string | null>('trip')
  const addDoc = () => {
    const id = crypto.randomUUID()
    setDocs((list) => [...list, { id, title: 'Untitled' }])
    setActiveDoc(id)
  }
  // A tab that closes: if it was the one in sight, the one beside it is, the next or else the one before.
  const closeDoc = (id: string) => {
    const at = docs.findIndex((doc) => doc.id === id)
    const left = docs.filter((doc) => doc.id !== id)
    setDocs(left)
    if (activeDoc === id) setActiveDoc(left[Math.min(at, left.length - 1)]?.id ?? null)
  }
  const [search, setSearch] = useState('')
  const [choice, setChoice] = useState('travel')
  const [day, setDay] = useState<string | null>(null)
  const [row, setRow] = useState(0)
  const [row2, setRow2] = useState(0)
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

  const content: Record<Screen, ReactNode> = {
    'all-notes': (
      <Column gap="lg" pad="lg" width="prose">
        <Heading size="page">Trip to Lisbon</Heading>
        <Text as="p" variant="muted">Four days in May, and the train from Porto on the way back.</Text>
        <MarkdownBlocks
          text={"**Before leaving**\n\n- [x] Book the flight\n- [ ] Book the train back from Porto\n- [ ] Ask Marta about the tram passes"}
        />
      </Column>
    ),
    travel: (
      <Column gap="lg" pad="sm">
        <ItemList aria-label="Notes in Travel">
          <ItemRow
            title="Trip to Lisbon"
            description="Four days in May"
            meta="Today"
            current={row === 0}
            onClick={() => setRow(0)}
          />
          <ItemRow
            title="Packing list"
            description="Chargers, the adapter, the rain jacket"
            meta="Mon"
            current={row === 1}
            onClick={() => setRow(1)}
          />
          <ItemRow
            title="Hotels in Porto"
            description="Two near the station"
            meta="Apr 2"
            current={row === 2}
            onClick={() => setRow(2)}
          />
        </ItemList>
      </Column>
    ),
    home: (
      <Column gap="lg" pad="sm">
        <ItemList aria-label="Notes in Home">
          <ItemRow
            title="Kitchen quote"
            description="The second version, from Marta Riva"
            meta="Fri"
            current={row2 === 0}
            onClick={() => setRow2(0)}
          />
          <ItemRow
            title="Plants to repot"
            description="The fig and the two ferns"
            meta="Mar 28"
            current={row2 === 1}
            onClick={() => setRow2(1)}
          />
        </ItemList>
      </Column>
    ),
    archive: (
      <Column gap="lg" pad="lg" width="page">
        <Empty fill title="Nothing archived" description="A note you archive is kept here, out of the way." />
      </Column>
    ),
  }
  const inspector: Partial<Record<Screen, ReactNode>> = {
    'all-notes': (
      <Inspector title="Note" open={details} onOpenChange={setDetails}>
        <Column gap="lg">
          <FormField label="Title"><Input placeholder="Trip to Lisbon" autoComplete="off" /></FormField>
          <FormField label="Folder">
            <Select
              options={[
                { value: 'travel', label: 'Travel' },
                { value: 'home', label: 'Home' },
                { value: 'archive', label: 'Archive' },
              ]}
              value={choice}
              onValueChange={setChoice}
            />
          </FormField>
          <FormField label="Reminder"><DateField value={day} onChange={setDay} /></FormField>
        </Column>
      </Inspector>
    ),
  }

  return (
    <AppShell
      desktop={ownWindow}
      frame="sheet"
      top="unified"
      contentLabel={SCREENS[screen]}
      sidebarHead={<ToolbarBrand name="Notes" />}
      sidebarCollapsed={collapsed}
      onSidebarCollapsedChange={setCollapsed}
      dragProps={ownWindow ? DRAG_REGION : undefined}
      windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}
      topActions={
        <Toolbar aria-label="Notes">
          <ToolbarSearch label="Search the notes" value={search} onValueChange={setSearch} shortcut="/" />
        </Toolbar>
      }
      tabs={
        <DocumentTabs value={activeDoc} onValueChange={setActiveDoc} onAdd={addDoc}>
          {docs.map((doc) => (
            <DocumentTab key={doc.id} value={doc.id} onClose={() => closeDoc(doc.id)}>
              {doc.title}
            </DocumentTab>
          ))}
        </DocumentTabs>
      }
      sidebar={
        !narrow ? (
          <Sidebar aria-label="Places" open={menu} onOpenChange={setMenu}>
            <SidebarGroup>
              <NavItem
                current={screen === 'all-notes'}
                icon={<Icon name="all" />}
                end={<Count value={12} label="items" reserve />}
                onClick={() => go('all-notes')}
              >
                All notes
              </NavItem>
              <NavItem
                current={screen === 'travel'}
                icon={<Icon name="globe" />}
                end={<Count value={4} label="items" reserve />}
                onClick={() => go('travel')}
              >
                Travel
              </NavItem>
              <NavItem
                current={screen === 'home'}
                icon={<Icon name="folder" />}
                end={<Count value={5} label="items" reserve />}
                onClick={() => go('home')}
              >
                Home
              </NavItem>
              <NavItem
                current={screen === 'archive'}
                icon={<Icon name="archive" />}
                onClick={() => go('archive')}
              >
                Archive
              </NavItem>
            </SidebarGroup>
          </Sidebar>
        ) : undefined
      }
      inspector={inspector[screen]}
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
              <ToolbarTab value="all-notes" icon={<Icon name="all" />}>All notes</ToolbarTab>
              <ToolbarTab value="travel" icon={<Icon name="globe" />}>Travel</ToolbarTab>
              <ToolbarTab value="home" icon={<Icon name="folder" />}>Home</ToolbarTab>
              <ToolbarTab value="archive" icon={<Icon name="archive" />}>Archive</ToolbarTab>
            </ToolbarTabs>
          </Toolbar>
        ) : undefined
      }
    >
      {content[screen]}
    </AppShell>
  )
}
