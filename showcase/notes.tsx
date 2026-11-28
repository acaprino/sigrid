// Notes, a notebook, as it would be made with the toolkit: the example of the sheet frame with its one top row
// (`AppShell frame="sheet" top="unified"`). It is no app of the suite: it is made up to show that frame whole, in the
// four hosts.
// - On a computer: one row is the window's bar. Over the sidebar its button (always in the same place) and the app;
//   then the open notes as tabs joined to the sheet (`DocumentTabs`: a plus adds one, a cross closes it), room that
//   moves the window, the tools and, in a Tauri window, the window's buttons. The places are the sidebar; the notes of
//   the place are a column of the content and the note in sight is read beside it (`ContentSplit`).
// - On a phone: no drawer. The places are tabs at the foot and the open notes take the whole row at the head; the list
//   is the screen, a note takes its place with its action under it, and the tool of the row goes back to the list (it
//   keeps its place, empty, where the list is in sight: `ToolbarButton absent`).
// Archiving is done at once and can be taken back from its notice (no question asked).
// It writes no class: the layout is `ContentSplit`, `Panel` and `Column`, the words `Heading`, `Text` and
// `MarkdownBlocks`, an empty view `Empty fill`.
import * as React from 'react'
import { colorTheme } from '../src/index'
import { Button, Column, Count, Heading, Icon, Text, type IconName } from '../src/primitives'
import { Empty, ItemList, ItemRow, MarkdownBlocks, SearchField, type ToastItem } from '../src/components'
import { AppShell, ContentSplit, DocumentTab, DocumentTabs, NavItem, Panel, Sidebar, SidebarGroup, Toolbar, ToolbarBrand, ToolbarButton, ToolbarTab, ToolbarTabs, WindowControls } from '../src/layout'
import { Host, type AppProps } from './hosts'

/** The notebook's own theme: its green. */
const THEME = colorTheme({ id: 'notes', label: 'Notes', color: '#2e7d4f', spot: 'balanced' })

type Folder = 'travel' | 'home' | 'archive'
type PlaceId = 'all' | Folder
const PLACES: readonly { id: PlaceId; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All notes', icon: 'all' },
  { id: 'travel', label: 'Travel', icon: 'globe' },
  { id: 'home', label: 'Home', icon: 'folder' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
]

type Note = { id: string; title: string; place: Folder; when: string; lead: string; text: string }
const NOTES: readonly Note[] = [
  { id: 'trip', title: 'Trip to Lisbon', place: 'travel', when: 'Today', lead: 'Four days in May, and the train from Porto on the way back.', text: '**Before leaving**\n\n- [x] Book the flight\n- [ ] Book the train back from Porto\n- [ ] Ask Marta about the tram passes\n\n**To see**\n\n- The tiles museum, in the morning\n- The viewpoint over the river, at sunset' },
  { id: 'packing', title: 'Packing list', place: 'travel', when: 'Mon', lead: 'Chargers, the adapter, the rain jacket.', text: '- [x] Chargers and the adapter\n- [ ] The rain jacket\n- [ ] Shoes to walk in' },
  { id: 'hotels', title: 'Hotels in Porto', place: 'travel', when: 'Apr 2', lead: 'Two near the station.', text: 'Both are ten minutes from the station on foot. The first has breakfast; the second is quieter.' },
  { id: 'ideas', title: 'Ideas', place: 'home', when: 'Sun', lead: 'Things to try when there is a free afternoon.', text: '- A shelf over the desk\n- Bread with the old starter\n- The photos of last year, in one album' },
  { id: 'quote', title: 'Kitchen quote', place: 'home', when: 'Fri', lead: 'The second version, from Marta Riva.', text: 'The quartz top and the built-in hood. The total goes down by 380.\n\n- [ ] Ask when the work can start\n- [ ] Send the measures taken on Tuesday' },
  { id: 'plants', title: 'Plants to repot', place: 'home', when: 'Mar 28', lead: 'The fig and the two ferns.', text: 'The fig needs a pot two sizes up. The ferns can share the long one on the balcony.' },
]

export function Notes({ device, host, animated, density, look }: AppProps) {
  const phone = device === 'phone'
  // A window of its own on a computer: the one top row is the window's bar.
  const ownWindow = !phone && host === 'native'
  const [maximized, setMaximized] = React.useState(false)
  const [notes, setNotes] = React.useState(NOTES)
  const [place, setPlace] = React.useState<PlaceId>('all')
  // The notes open in tabs, and the one in sight: the app's own, apart from the place.
  const [open, setOpen] = React.useState<readonly string[]>(['trip', 'ideas', 'quote'])
  const [current, setCurrent] = React.useState<string | null>('trip')
  const [collapsed, setCollapsed] = React.useState(false)
  const [search, setSearch] = React.useState('')
  // Where the list and the note do not fit side by side (a phone), the one on screen.
  const [one, setOne] = React.useState(false)
  const [pane, setPane] = React.useState<'aside' | 'main'>('main')
  const [notices, setNotices] = React.useState<ToastItem[]>([])
  const count = React.useRef(0)
  const dismiss = (id: string) => setNotices((list) => list.filter((n) => n.id !== id))

  const inPlace = (id: PlaceId) => notes.filter((n) => (id === 'all' ? n.place !== 'archive' : n.place === id))
  const shown = inPlace(place).filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
  const name = PLACES.find((p) => p.id === place)!.label
  const note = notes.find((n) => n.id === current)
  // With the list on screen in place of the note, no note is in sight: no tab is the chosen one.
  const reading = !one || pane === 'main'

  const show = (id: string) => {
    setOpen((ids) => (ids.includes(id) ? ids : [...ids, id]))
    setCurrent(id)
    setPane('main')
  }
  // A tab that closes: if it was the one in sight, the one beside it is, the next or else the one before.
  const close = (id: string) => {
    const at = open.indexOf(id)
    const left = open.filter((one) => one !== id)
    setOpen(left)
    if (current !== id) return
    const next = left[Math.min(at, left.length - 1)] ?? null
    setCurrent(next)
    if (!next) setPane('aside')
  }
  const add = () => {
    const id = `new-${(count.current += 1)}`
    setNotes((all) => [{ id, title: 'Untitled', place: place === 'travel' || place === 'home' ? place : 'home', when: 'Now', lead: 'Nothing written yet.', text: '' }, ...all])
    show(id)
  }
  const go = (next: PlaceId) => {
    setPlace(next)
    setPane('aside')
  }
  // Done at once, and taken back from the notice: the note goes back to its place and its tab.
  const archive = (target: Note) => {
    const move = (to: Folder) => setNotes((all) => all.map((n) => (n.id === target.id ? { ...n, place: to } : n)))
    move('archive')
    close(target.id)
    const id = `notice-${(count.current += 1)}`
    setNotices((list) => [...list, { id, text: `Archived «${target.title}»`, undo: { onClick: () => { move(target.place); show(target.id); dismiss(id) } } }])
  }

  const list = (
    <Panel title={name} subtitle={`${shown.length} ${shown.length === 1 ? 'note' : 'notes'}`} tools={<SearchField value={search} onValueChange={setSearch} aria-label={`Search in ${name}`} placeholder="Search" />}>
      {shown.length > 0 ? (
        <ItemList aria-label={name} animated={animated}>
          {shown.map((n) => (
            <ItemRow key={n.id} title={n.title} description={n.lead} meta={n.when} current={reading && n.id === current} onClick={() => show(n.id)} />
          ))}
        </ItemList>
      ) : (
        <Empty fill title={search ? 'No note has that name' : place === 'archive' ? 'Nothing archived' : 'No notes here'} description={search ? undefined : place === 'archive' ? 'A note you archive is kept here, out of the way.' : 'The plus in the row at the top starts one.'} />
      )}
    </Panel>
  )

  return (
    <Host app="notes" device={device} host={host} animated={animated} theme={THEME} look={look} density={density} address={`notes.example/${place}`} notices={notices} onDismiss={dismiss}>
      <AppShell
        desktop={ownWindow}
        frame="sheet"
        top="unified"
        contentLabel={note && reading ? note.title : name}
        sidebarHead={<ToolbarBrand name="Notes" />}
        sidebarCollapsed={collapsed}
        onSidebarCollapsedChange={setCollapsed}
        dragProps={ownWindow ? { 'data-tauri-drag-region': '' } : undefined}
        windowControls={ownWindow ? <WindowControls maximized={maximized} onMinimize={() => {}} onMaximizeToggle={() => setMaximized(!maximized)} onClose={() => {}} /> : undefined}
        topActions={
          <Toolbar aria-label="Notes">
            {/* The way back to the list where one pane fits: it keeps its place, empty, where the list is in sight. */}
            {one ? <ToolbarButton label={`Back to ${name}`} icon={<Icon name="back" />} absent={!reading} onClick={() => setPane('aside')} animated={animated} /> : null}
            {phone ? null : <ToolbarButton label="Archive the note" icon={<Icon name="archive" />} disabled={!note || note.place === 'archive'} onClick={() => note && archive(note)} animated={animated} />}
          </Toolbar>
        }
        tabs={
          <DocumentTabs aria-label="Open notes" value={reading ? current : null} onValueChange={show} onAdd={add} addLabel="New note" animated={animated}>
            {open.map((id) => (
              <DocumentTab key={id} value={id} onClose={() => close(id)}>
                {notes.find((n) => n.id === id)?.title}
              </DocumentTab>
            ))}
          </DocumentTabs>
        }
        sidebar={
          phone ? undefined : (
            <Sidebar aria-label="Places" animated={animated}>
              <SidebarGroup label="Notes" icon={<Icon name="all" />}>
                {PLACES.map((p) => (
                  <NavItem key={p.id} current={place === p.id} onClick={() => go(p.id)} icon={<Icon name={p.icon} />} end={<Count value={inPlace(p.id).length} label="notes" reserve />}>
                    {p.label}
                  </NavItem>
                ))}
              </SidebarGroup>
            </Sidebar>
          )
        }
        // On a phone the row at the head is the notes': the action on the one in sight is under it.
        actions={
          phone && note && reading && note.place !== 'archive' ? (
            <Button variant="outline" size="sm" onClick={() => archive(note)}>
              Archive
            </Button>
          ) : undefined
        }
        bottomBar={
          phone ? (
            <Toolbar aria-label="Places at the foot">
              <ToolbarTabs aria-label="Places" value={place} onValueChange={(next) => go(next as PlaceId)} edge="top" layout="stacked">
                {PLACES.map((p) => (
                  <ToolbarTab key={p.id} value={p.id} icon={<Icon name={p.icon} />}>
                    {p.label}
                  </ToolbarTab>
                ))}
              </ToolbarTabs>
            </Toolbar>
          ) : undefined
        }
      >
        <ContentSplit aside={list} asideLabel={name} width="sm" show={pane} onPanesChange={(panes) => setOne(panes === 1)}>
          {note ? (
            <Column gap="lg" pad="lg" width="prose">
              <Column gap="xs">
                <Heading size="page">{note.title}</Heading>
                <Text variant="caption">
                  {PLACES.find((p) => p.id === note.place)!.label} · {note.when}
                </Text>
              </Column>
              <Text as="p" variant="muted">
                {note.lead}
              </Text>
              {note.text ? <MarkdownBlocks text={note.text} /> : null}
            </Column>
          ) : (
            <Empty fill title="No note is open" description="Choose one from the list, or start a new one." action={<Button onClick={add}>New note</Button>} />
          )}
        </ContentSplit>
      </AppShell>
    </Host>
  )
}
