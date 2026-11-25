// `DataTable` as a tree with a choice (the list of things to clean up: categories that hold items, items that hold
// their own rows): levels, rows that fold, groups that stay in sight, a column of checks, the app's keys before the
// table's, a heading that is a part, and the box that scrolls handed to the app. jsdom lays nothing out, so what is
// drawn at a height is checked in a browser, on the showcase (section «Table»).
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Checkbox } from '../src/primitives'
import { DataTable, type DataColumn, type DataSelection } from '../src/table'

type Entry = { id: string; name: string; level: number; kind: 'group' | 'folder' | 'item'; size: number; open?: boolean }
const ENTRIES: Entry[] = [
  { id: 'cache', name: 'Caches', level: 1, kind: 'group', size: 300, open: true },
  { id: 'cache/a', name: 'a.tmp', level: 2, kind: 'item', size: 100 },
  { id: 'cache/dir', name: 'dir', level: 2, kind: 'folder', size: 200, open: false },
  { id: 'logs', name: 'Logs', level: 1, kind: 'group', size: 5, open: false },
]
const COLUMNS: DataColumn<Entry>[] = [
  { id: 'name', header: 'Name', cell: (entry) => entry.name },
  { id: 'size', header: 'Size', cell: (entry) => `${entry.size} KB`, align: 'end' },
]
const row = (name: string) => screen.getByText(name).closest('tr')!
const press = (el: Element, key: string) => fireEvent.keyDown(el, { key })

function Tree({ extra = {} }: { extra?: Partial<React.ComponentProps<typeof DataTable<Entry>>> }) {
  return (
    <DataTable
      aria-label="Clean up"
      columns={COLUMNS}
      rows={ENTRIES}
      rowId={(entry) => entry.id}
      rowLevel={(entry) => entry.level}
      rowOpen={(entry) => entry.open}
      onRowOpenChange={() => {}}
      isGroupRow={(entry) => entry.kind === 'group'}
      {...extra}
    />
  )
}

describe('a tree of rows', () => {
  test('a treegrid whose rows say their level and whether they are open; a row that holds none says neither open nor closed', () => {
    render(<Tree />)
    expect(screen.getByRole('treegrid', { name: 'Clean up' })).toBeTruthy()
    expect(row('Caches').getAttribute('aria-level')).toBe('1')
    expect(row('a.tmp').getAttribute('aria-level')).toBe('2')
    expect(row('Caches').getAttribute('aria-expanded')).toBe('true')
    expect(row('dir').getAttribute('aria-expanded')).toBe('false')
    expect(row('a.tmp').hasAttribute('aria-expanded')).toBe(false)
  })

  test('the first cell is indented by the level, and a row that holds none keeps the room of the caret so the names line up', () => {
    render(<Tree />)
    const cell = (name: string) => screen.getByText(name).closest('td')!
    expect(cell('a.tmp').style.getPropertyValue('--depth')).toBe('2')
    expect(cell('dir').style.getPropertyValue('--depth')).toBe('2')
    expect(cell('a.tmp').className).toContain('ps-[calc(0.75rem_+_(var(--depth)_-_1)_*_1.25rem)]')
    expect(cell('a.tmp').querySelector('[data-slot="table-caret-slot"]')).not.toBeNull()
    expect(cell('a.tmp').querySelector('[data-slot="table-caret"]')).toBeNull()
  })

  test('the caret of a row that holds others asks to open or close it; Right and Left do the same from the keyboard', () => {
    const change = vi.fn()
    render(<Tree extra={{ onRowOpenChange: change }} />)
    const folder = within(row('dir')).getByRole('button', { name: 'Open' })
    expect(folder.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(folder)
    expect(change).toHaveBeenLastCalledWith(ENTRIES[2], true)
    fireEvent.click(within(row('Caches')).getByRole('button', { name: 'Close' }))
    expect(change).toHaveBeenLastCalledWith(ENTRIES[0], false)
    // Right on a closed row opens it, Left on an open one closes it; the other way round nothing is asked.
    press(row('dir'), 'ArrowRight')
    expect(change).toHaveBeenLastCalledWith(ENTRIES[2], true)
    press(row('Caches'), 'ArrowLeft')
    expect(change).toHaveBeenLastCalledWith(ENTRIES[0], false)
    change.mockClear()
    press(row('dir'), 'ArrowLeft')
    press(row('Caches'), 'ArrowRight')
    expect(change).not.toHaveBeenCalled()
  })

  test('a group is one cell across the columns, in sight under the headings, and says what the app gives for it', () => {
    render(<Tree extra={{ groupCell: (entry) => `${entry.name} (${entry.size} KB)` }} />)
    const group = row('Caches (300 KB)')
    expect(group.getAttribute('data-group')).toBe('true')
    const cells = Array.from(group.children) as HTMLTableCellElement[]
    expect(cells).toHaveLength(1)
    expect(cells[0]!.colSpan).toBe(2)
    expect(cells[0]!.className).toContain('sticky')
    expect(cells[0]!.className).toContain('top-(--row-height)')
    // The other rows have a cell for each column.
    expect(row('a.tmp').children).toHaveLength(2)
  })

  test('a table without levels, folds or groups is a table, as before', () => {
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} />)
    expect(screen.getByRole('table', { name: 'Files' })).toBeTruthy()
    expect(screen.queryByRole('treegrid')).toBeNull()
    expect(row('a.tmp').hasAttribute('aria-level')).toBe(false)
    expect(document.querySelector('[data-slot="table-caret-slot"]')).toBeNull()
  })
})

describe('a column of checks', () => {
  function Chosen({ chosen = new Set<string>(), onChange = () => {}, all = false as boolean | 'mixed', onAll = (() => {}) as ((checked: boolean) => void) | undefined }) {
    const selection: DataSelection<Entry> = {
      isSelected: (entry) => (entry.kind === 'group' ? (entry.id === 'cache' ? 'mixed' : false) : chosen.has(entry.id)),
      onSelectedChange: onChange,
      selectAll: all,
      onSelectAll: onAll,
      label: (entry) => `Select ${entry.name}`,
    }
    return <Tree extra={{ selection }} />
  }

  test('a check for each row, named by the app, in the first column, and the heading has the one that chooses all', () => {
    render(<Chosen chosen={new Set(['cache/a'])} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('checkbox', { name: 'Select a.tmp' }).getAttribute('data-state')).toBe('checked')
    expect(screen.getByRole('checkbox', { name: 'Select dir' }).getAttribute('data-state')).toBe('unchecked')
    // The heading's check is in the heading row, before the columns.
    const head = screen.getAllByRole('row')[0]!
    expect(within(head).getByRole('checkbox', { name: 'Select all' })).toBeTruthy()
    expect(head.children).toHaveLength(3)
    // The rows are the table's own: a cell for the check, then one for each column.
    expect(row('a.tmp').children).toHaveLength(3)
  })

  test('a group shows a dash for some of its rows chosen, stays in sight with its check, and a press on any check says the state asked for', () => {
    const change = vi.fn()
    const all = vi.fn()
    render(<Chosen onChange={change} onAll={all} all="mixed" />)
    const master = screen.getByRole('checkbox', { name: 'Select Caches' })
    expect(master.getAttribute('data-state')).toBe('indeterminate')
    expect(master.closest('td')!.className).toContain('sticky')
    fireEvent.click(master)
    expect(change).toHaveBeenLastCalledWith(ENTRIES[0], true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a.tmp' }))
    expect(change).toHaveBeenLastCalledWith(ENTRIES[1], true)
    const head = screen.getByRole('checkbox', { name: 'Select all' })
    expect(head.getAttribute('data-state')).toBe('indeterminate')
    fireEvent.click(head)
    expect(all).toHaveBeenLastCalledWith(true)
  })

  test('a press on a check is the check\'s: it does not press the row', () => {
    const pressed = vi.fn()
    const change = vi.fn()
    const selection: DataSelection<Entry> = { isSelected: () => false, onSelectedChange: change }
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} selection={selection} onRowPress={pressed} />)
    fireEvent.click(screen.getAllByRole('checkbox')[1]!)
    expect(change).toHaveBeenCalledTimes(1)
    expect(pressed).not.toHaveBeenCalled()
  })

  test('without a heading check there is none, and the column is still named for screen readers; a table of checks alone stays a table', () => {
    const selection: DataSelection<Entry> = { isSelected: () => false, onSelectedChange: () => {} }
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} selection={selection} />)
    expect(screen.getByRole('table', { name: 'Files' })).toBeTruthy()
    expect(within(screen.getAllByRole('row')[0]!).queryByRole('checkbox')).toBeNull()
    expect(screen.getAllByRole('columnheader')[0]!.textContent).toBe('Select')
    expect(screen.getAllByRole('checkbox')[0]!.getAttribute('aria-label')).toBe('Select')
  })
})

describe('the keys', () => {
  const FILES = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, name: `file ${i}` }))
  const cols: DataColumn<{ id: string; name: string }>[] = [{ id: 'name', header: 'Name', cell: (file) => file.name }]
  const table = (props: Partial<React.ComponentProps<typeof DataTable<{ id: string; name: string }>>> = {}) =>
    render(<DataTable aria-label="Files" columns={cols} rows={FILES} rowId={(file) => file.id} {...props} />)

  test('the app is asked first: a key it takes with preventDefault is not the table\'s, and one it leaves is', () => {
    const pressed = vi.fn()
    const ticked = vi.fn()
    table({
      onRowPress: pressed,
      onRowKeyDown: (file, event) => {
        if (event.key === ' ') {
          event.preventDefault()
          ticked(file.id)
        }
      },
    })
    press(row('file 3'), ' ')
    expect(ticked).toHaveBeenCalledWith('f3')
    expect(pressed).not.toHaveBeenCalled()
    press(row('file 3'), 'Enter')
    expect(pressed).toHaveBeenCalledWith(FILES[3])
  })

  test('a key on a control inside the row is that control\'s: the app is not asked', () => {
    const asked = vi.fn()
    table({ onRowKeyDown: asked, columns: [{ id: 'name', header: 'Name', cell: (file) => <button type="button">{file.name}</button> }] })
    press(screen.getByRole('button', { name: 'file 3' }), ' ')
    expect(asked).not.toHaveBeenCalled()
  })

  test('the rows are one Tab stop as soon as the app has keys for them, and PageDown and PageUp move by a page', () => {
    table({ onRowKeyDown: () => {} })
    expect(document.querySelectorAll('[data-slot="table-row"][tabindex="0"]')).toHaveLength(1)
    const first = row('file 0')
    first.focus()
    press(first, 'PageDown')
    expect(document.activeElement).toBe(row('file 10'))
    press(document.activeElement!, 'PageUp')
    expect(document.activeElement).toBe(row('file 0'))
    press(document.activeElement!, 'PageUp')
    expect(document.activeElement).toBe(row('file 0'))
  })

  test('without keys, a choice or a tree the rows are not a Tab stop, as before', () => {
    table()
    expect(document.querySelectorAll('[data-slot="table-row"][tabindex]')).toHaveLength(0)
  })
})

describe('the parts of a heading, and the box', () => {
  test('a heading can be a part; the column is named by its `label` for the sort button and screen readers', () => {
    const columns: DataColumn<Entry>[] = [
      { id: 'name', header: <Checkbox aria-label="All" />, label: 'Name', cell: (entry) => entry.name, sortValue: (entry) => entry.name },
      { id: 'size', header: 'Size', cell: (entry) => `${entry.size}` },
    ]
    render(<DataTable aria-label="Files" columns={columns} rows={ENTRIES} rowId={(entry) => entry.id} />)
    expect(screen.getByRole('checkbox', { name: 'All' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy()
  })

  test('`containerRef` is the box that scrolls, as an object or as a function', () => {
    const object: { current: HTMLDivElement | null } = { current: null }
    const { unmount } = render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} containerRef={object} />)
    expect(object.current).toBe(screen.getByRole('table').parentElement)
    expect(object.current!.getAttribute('data-slot')).toBe('table-container')
    unmount()
    const taken = vi.fn()
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} containerRef={taken} />)
    expect(taken).toHaveBeenCalledWith(screen.getByRole('table').parentElement)
  })
})
