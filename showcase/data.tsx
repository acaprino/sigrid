// The sections of the gallery for the parts that rest on a library of their own and have their own entry of the
// package: a table that sorts and draws only the rows in sight (`./table`), a long list that does the same
// (`./virtual`), a list put in order by its handles (`./reorder`) and a field for text with a little form
// (`./rich-text`). The data are made up and made here once, so the ten thousand rows are the same at every paint.
import * as React from 'react'
import { Avatar, Badge, FormField, ItemRow, Switch, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../src/index'
import { DataTable, type DataColumn, type DataSort } from '../src/table'
import { VirtualList } from '../src/virtual'
import { ReorderList } from '../src/reorder'
import { RichTextField } from '../src/rich-text'
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
