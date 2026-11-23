// The sections of the gallery for the parts that rest on a library of their own and have their own entry of the
// package: a table that sorts and draws only the rows in sight (`./table`), a long list that does the same
// (`./virtual`), a list put in order by its handles (`./reorder`) and a field for text with a little form
// (`./rich-text`). The data are made up and made here once, so the ten thousand rows are the same at every paint.
import * as React from 'react'
import { Avatar, Badge, FormField, Input, ItemRow, Switch, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../src/index'
import { DataTable, type DataColumn, type DataSort } from '../src/table'
import { VirtualList } from '../src/virtual'
import { ReorderList } from '../src/reorder'
import { RichTextField } from '../src/rich-text'
import { GraphCanvas, type GraphEdge, type GraphNode } from '../src/graph'
import '../src/styles/graph.css'
import { Code, Row, Section } from './parts'

type FileRow = { id: string; name: string; kind: string; size: number | null; changed: Date }

const KINDS = ['PDF', 'Image', 'Sheet', 'Text', 'Folder'] as const
const NAMES = ['Quarterly report', 'Site survey', 'Invoice', 'Meeting notes', 'Contract renewal', 'Budget', 'Floor plan', 'Price list', 'Offer', 'Minutes']
const DAY = 86_400_000
const START = new Date(2026, 10, 23).getTime()

/** Rows that are the same at every load: no chance in them. */
function files(count: number): FileRow[] {
  return Array.from({ length: count }, (_, i) => {
    const kind = KINDS[(i * 7) % KINDS.length]!
    return { id: `f${i}`, name: `${NAMES[(i * 3) % NAMES.length]} ${i + 1}`, kind, size: kind === 'Folder' ? null : ((i * 7919) % 48_000) + 12, changed: new Date(START - ((i * 37) % 900) * DAY) }
  })
}

const FEW = files(8)
const MANY = files(10_000)

const size = (kb: number | null) => (kb === null ? '' : kb < 1024 ? `${kb} kB` : `${(kb / 1024).toFixed(1)} MB`)
const day = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })

const COLUMNS: readonly DataColumn<FileRow>[] = [
  { id: 'name', header: 'Name', cell: (file) => <span className="font-medium text-ink">{file.name}</span>, sortValue: (file) => file.name },
  { id: 'kind', header: 'Kind', cell: (file) => file.kind, sortValue: (file) => file.kind, className: 'w-28' },
  { id: 'size', header: 'Size', cell: (file) => size(file.size), sortValue: (file) => file.size, align: 'end', className: 'w-28' },
  { id: 'changed', header: 'Changed', cell: (file) => day.format(file.changed), sortValue: (file) => file.changed, align: 'end', className: 'w-36 whitespace-nowrap' },
]

export function Tables() {
  const [current, setCurrent] = React.useState<string | null>('f2')
  const [sort, setSort] = React.useState<DataSort>({ column: 'changed', descending: true })
  const [chosen, setChosen] = React.useState<string | null>(null)
  return (
    <Section
      id="table"
      title="Table and DataTable"
      note={
        <>
          <Code>Table</Code> and its parts are the form: quiet headings, one line between rows, numbers at the end in tabular figures, the chosen row with the selection tint (R1). <Code>DataTable</Code>, from the entry <Code>@acaprino/sigrid/table</Code>, adds the behaviour of TanStack Table and TanStack Virtual: a press on a heading sorts up, a second down, a third puts the rows back; with <Code>virtual</Code> only the rows in sight are in the page, so ten thousand rows cost what thirty do.
        </>
      }
    >
      <Row label="parts">
        <div className="w-full max-w-xl">
          <Table aria-label="Plans">
            <TableCaption>The parts alone, for a table an app draws by hand.</TableCaption>
            <TableHeader>
              <tr>
                <TableHead>Plan</TableHead>
                <TableHead>State</TableHead>
                <TableHead align="end">Seats</TableHead>
                <TableHead align="end">Each month</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Solo</TableCell>
                <TableCell>
                  <Badge variant="secondary">Active</Badge>
                </TableCell>
                <TableCell align="end">1</TableCell>
                <TableCell align="end">€ 0</TableCell>
              </TableRow>
              <TableRow current>
                <TableCell>Team</TableCell>
                <TableCell>
                  <Badge variant="secondary">Active</Badge>
                </TableCell>
                <TableCell align="end">12</TableCell>
                <TableCell align="end">€ 96</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Studio</TableCell>
                <TableCell>
                  <Badge variant="outline">Ended</Badge>
                </TableCell>
                <TableCell align="end">40</TableCell>
                <TableCell align="end">€ 280</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Row>
      <Row label="sorting, a chosen row">
        <div data-sample="data-table" className="w-full max-w-3xl">
          <DataTable aria-label="Files" columns={COLUMNS} rows={FEW} rowId={(file) => file.id} sort={sort} onSortChange={setSort} current={current} onRowPress={(file) => setCurrent(file.id)} />
        </div>
      </Row>
      <Row label="10,000 rows">
        <div data-sample="data-table-virtual" className="w-full max-w-3xl">
          <DataTable aria-label="All files" columns={COLUMNS} rows={MANY} rowId={(file) => file.id} current={chosen} onRowPress={(file) => setChosen(file.id)} virtual className="h-96 rounded-md border border-line" />
        </div>
      </Row>
      <Row label="no rows">
        <div className="w-full max-w-3xl">
          <DataTable aria-label="Shared files" columns={COLUMNS} rows={[]} rowId={(file) => file.id} empty="Nothing is shared with you yet." />
        </div>
      </Row>
    </Section>
  )
}

const PEOPLE = ['Marco Rossi', 'Giulia Bianchi', 'Luca Ferrari', 'Sara Romano', 'Paolo Greco', 'Anna Conti', 'Elena Marino']
const SUBJECTS = ['Contract renewal', 'Site survey on Thursday', 'Invoice 2026/118', 'Notes from the call', 'The new price list', 'A question on the offer', 'Minutes of the meeting']

export function LongLists() {
  const [current, setCurrent] = React.useState(3)
  return (
    <Section
      id="virtual-list"
      title="VirtualList"
      note={
        <>
          A long list of which only the rows in sight are in the page, from the entry <Code>@acaprino/sigrid/virtual</Code> (TanStack Virtual). The rows are the toolkit's own <Code>ItemRow</Code>: one is measured as it is drawn, so any density and a finger's 44px hold. Screen readers still hear how many items the list holds and where each one is.
        </>
      }
    >
      <Row label="10,000 messages">
        <div data-sample="virtual-list" className="w-full max-w-md">
          <VirtualList aria-label="Messages" count={10_000} className="h-96 rounded-md border border-line p-1">
            {(index) => (
              <ItemRow
                leading={<Avatar name={PEOPLE[index % PEOPLE.length]!} size="sm" />}
                title={PEOPLE[index % PEOPLE.length]}
                description={`${SUBJECTS[(index * 3) % SUBJECTS.length]} (${index + 1})`}
                meta={day.format(new Date(START - (index % 400) * DAY))}
                unread={index % 5 === 0}
                current={index === current}
                onClick={() => setCurrent(index)}
              />
            )}
          </VirtualList>
        </div>
      </Row>
    </Section>
  )
}

type Lane = { id: string; name: string; shown: boolean }

const LANES: Lane[] = [
  { id: 'inbox', name: 'Inbox', shown: true },
  { id: 'today', name: 'Today', shown: true },
  { id: 'week', name: 'This week', shown: true },
  { id: 'waiting', name: 'Waiting for', shown: false },
  { id: 'someday', name: 'Someday', shown: true },
]

export function Reorders({ animated }: { animated: boolean }) {
  const [lanes, setLanes] = React.useState(LANES)
  return (
    <Section
      id="reorder"
      title="ReorderList"
      note={
        <>
          A list the user puts in order, from the entry <Code>@acaprino/sigrid/reorder</Code> (dnd-kit). The handle is the only thing that drags, so the rest of the row keeps its own controls. With the keyboard: Space takes a row, the arrows move it, Space puts it down, Escape puts it back, and a screen reader hears each step. The row taken is raised and follows the pointer up and down; the others slide to make room only with animations.
        </>
      }
    >
      <Row label="columns of a board">
        <div data-sample="reorder" className="w-full max-w-sm">
          <ReorderList aria-label="Columns" items={lanes} itemId={(lane) => lane.id} itemName={(lane) => lane.name} onReorder={(next) => setLanes(next)} animated={animated}>
            {(lane) => (
              <>
                <span className="min-w-0 flex-1 truncate">{lane.name}</span>
                <Switch aria-label={`Show ${lane.name}`} checked={lane.shown} onCheckedChange={(shown) => setLanes((now) => now.map((it) => (it.id === lane.id ? { ...it, shown } : it)))} animated={animated} />
              </>
            )}
          </ReorderList>
          <p data-sample="reorder-order" className="mt-3 text-xs text-ink-mute">
            {lanes.map((lane) => lane.name).join(', ')}
          </p>
        </div>
      </Row>
    </Section>
  )
}

export function RichTexts() {
  const [notes, setNotes] = React.useState('<p>Ask <strong>the supplier</strong> about the invoice.</p><ul><li><p>The amount</p></li><li><p>The date it is due</p></li></ul>')
  const [reply, setReply] = React.useState('')
  return (
    <Section
      id="rich-text"
      title="RichTextField"
      note={
        <>
          A field for text with a little form, from the entry <Code>@acaprino/sigrid/rich-text</Code> (TipTap): bold, italic and underlined words, two kinds of list, a quote, and nothing the row of buttons does not offer. The buttons are the toolkit's own toolbar, with the icons of the pack chosen; one that is on has the selection tint. The value is HTML, the app's to keep.
        </>
      }
    >
      <Row label="in a field">
        <div data-sample="rich-text" className="w-full max-w-xl">
          <FormField label="Notes" help="Select some words and press a button, or Ctrl B, Ctrl I, Ctrl U.">
            <RichTextField value={notes} onChange={setNotes} />
          </FormField>
        </div>
      </Row>
      <Row label="its value">
        <code data-sample="rich-text-value" className="block w-full max-w-xl font-mono text-xs break-all text-ink-soft">
          {notes}
        </code>
      </Row>
      <Row label="empty, with an error">
        <div className="w-full max-w-xl">
          <FormField label="Reply" error={reply === '' || reply === '<p></p>' ? 'Write a reply before sending.' : undefined} required>
            <RichTextField value={reply} onChange={setReply} />
          </FormField>
        </div>
      </Row>
      <Row label="disabled">
        <div className="w-full max-w-xl">
          <RichTextField aria-label="Sent message" value="<p>Sent on Monday. <em>It cannot be changed.</em></p>" onChange={() => {}} disabled />
        </div>
      </Row>
    </Section>
  )
}

const PLAN: GraphNode[] = [
  { id: 'launch', label: 'Launch the new site', detail: 'Due 12 December', icon: 'now' },
  { id: 'content', label: 'Content', detail: '3 of 5 done', color: '#297abc' },
  { id: 'design', label: 'Design', detail: '2 of 4 done', color: '#a35fd0' },
  { id: 'build', label: 'Build', detail: 'Waits for design', color: '#2f9e6e' },
  { id: 'copy', label: 'Write the home page' },
  { id: 'photos', label: 'Choose the photos' },
  { id: 'legal', label: 'Check the legal notes', detail: 'Marco' },
  { id: 'tokens', label: 'Colours and type' },
  { id: 'screens', label: 'Draw the five screens' },
  { id: 'review', label: 'Review with the client', detail: 'Thursday' },
  { id: 'pages', label: 'Build the pages' },
  { id: 'forms', label: 'Contact form' },
  { id: 'host', label: 'Hosting and domain' },
  { id: 'test', label: 'Test on phones' },
]
const JOINS: GraphEdge[] = [
  { from: 'launch', to: 'content' }, { from: 'launch', to: 'design' }, { from: 'launch', to: 'build' },
  { from: 'content', to: 'copy' }, { from: 'content', to: 'photos' }, { from: 'content', to: 'legal' },
  { from: 'design', to: 'tokens' }, { from: 'design', to: 'screens' }, { from: 'design', to: 'review' },
  { from: 'build', to: 'pages' }, { from: 'build', to: 'forms' }, { from: 'build', to: 'host' }, { from: 'build', to: 'test' },
  // A thing that hangs from two: the pages wait for the screens too.
  { from: 'screens', to: 'pages' },
]

/** A wide graph, the same at every load, to see what a thousand things cost. */
const WIDE: GraphNode[] = Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, label: `Item ${i + 1}` }))
const WIDE_JOINS: GraphEdge[] = WIDE.slice(1).map((node, i) => ({ from: `n${Math.floor(i / 4)}`, to: node.id }))

/** The calls between the parts of a service: relations, not «hangs from», with a ring (the queue and the worker call each other). */
const CALLS: GraphNode[] = [
  { id: 'gateway', label: 'Gateway', detail: 'Takes the requests' },
  { id: 'auth', label: 'Sign-in' },
  { id: 'orders', label: 'Orders', detail: '12 functions' },
  { id: 'billing', label: 'Billing' },
  { id: 'queue', label: 'Queue' },
  { id: 'worker', label: 'Worker' },
  { id: 'store', label: 'Store', detail: 'Database' },
]
const CALL_LINES: GraphEdge[] = [
  { from: 'gateway', to: 'auth' }, { from: 'gateway', to: 'orders' }, { from: 'orders', to: 'billing' }, { from: 'orders', to: 'queue' },
  { from: 'queue', to: 'worker' }, { from: 'worker', to: 'queue' }, { from: 'worker', to: 'store' }, { from: 'billing', to: 'store' }, { from: 'auth', to: 'store' },
]

export function Graphs() {
  const [graph, setGraph] = React.useState({ nodes: PLAN, edges: JOINS })
  const [selected, setSelected] = React.useState<string | null>('design')
  const [picked, setPicked] = React.useState<string | null>(null)
  const [call, setCall] = React.useState<string | null>(null)
  const [opened, setOpened] = React.useState<string | null>(null)
  const chosen = graph.nodes.find((node) => node.id === selected)
  const openedPart = CALLS.find((node) => node.id === opened)
  return (
    <Section
      id="graph"
      title="GraphCanvas"
      note={
        <>
          A canvas for a graph of things and what joins them, from the entry <Code>@acaprino/sigrid/graph</Code> (React Flow for the canvas, dagre for the places), with its stylesheet <Code>@acaprino/sigrid/graph.css</Code>. The graph lays itself out in ranks. A thing is a raised surface; the chosen one has the selection tint, what is joined to it stays and the rest is dimmed. A thing with others hanging from it opens and closes, and closed it says how many it hides. The keyboard is the one of a tree: Down and Up, Right to open or go in, Left to close or go back, Enter to choose. With <Code>editable</Code> the plus hangs a new thing, a drag between two handles joins them, Delete takes one away. With <Code>model="graph"</Code> the lines are relations: nothing closes, the arrows follow the lines, and a double press or the › of a thing asks the app to open it (<Code>onOpen</Code>). In both, +, − and 0 zoom in, out and fit.
        </>
      }
    >
      <Row label="explore and draw">
        <div data-sample="graph" className="flex w-full max-w-4xl flex-col gap-3">
          <GraphCanvas aria-label="Plan of the launch" nodes={graph.nodes} edges={graph.edges} selected={selected} onSelect={setSelected} defaultCollapsed={['content']} search minimap editable onChange={(next) => setGraph({ nodes: [...next.nodes], edges: [...next.edges] })} className="h-112" />
          {chosen ? (
            <FormField label="Name of the chosen thing" help="The details of what is chosen are the app's to show: here, a field that renames it.">
              <Input value={chosen.label} onChange={(event) => setGraph((now) => ({ ...now, nodes: now.nodes.map((node) => (node.id === chosen.id ? { ...node, label: event.target.value } : node)) }))} autoComplete="off" />
            </FormField>
          ) : (
            <p className="text-xs text-ink-mute">Nothing is chosen. Press a thing, or Tab into the canvas and press Enter.</p>
          )}
        </div>
      </Row>
      <Row label="downwards, read only">
        <div data-sample="graph-down" className="w-full max-w-4xl">
          <GraphCanvas aria-label="Plan, from the head" nodes={PLAN} edges={JOINS} direction="down" defaultCollapsed={['content', 'build']} className="h-80" />
        </div>
      </Row>
      <Row label="a graph: nothing closes">
        <div data-sample="graph-model" className="flex w-full max-w-4xl flex-col gap-3">
          <GraphCanvas aria-label="Calls of the service" model="graph" nodes={CALLS} edges={CALL_LINES} selected={call} onSelect={setCall} onOpen={setOpened} search className="h-80" />
          <p className="text-xs text-ink-mute">{openedPart ? `The app opens «${openedPart.label}» as it likes: here it only says which.` : 'Nothing is opened. Press a thing twice, or its ›.'}</p>
        </div>
      </Row>
      <Row label="1,000 things">
        <div data-sample="graph-wide" className="w-full max-w-4xl">
          <GraphCanvas aria-label="A thousand items" nodes={WIDE} edges={WIDE_JOINS} selected={picked} onSelect={setPicked} search minimap className="h-96" />
        </div>
      </Row>
    </Section>
  )
}
