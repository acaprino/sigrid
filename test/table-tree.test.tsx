// `DataTable` as a tree with a choice (the list of things to clean up: categories that hold items, items that hold
// their own rows): levels, rows that fold, groups that stay in sight, a column of checks, the app's keys before the
// table's, a heading that is a part, and the box that scrolls handed to the app. jsdom lays nothing out, so what is
// drawn at a height is checked in a browser, on the showcase (section «Table»).
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
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
const press = (el: Element, key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(el, { key, ...init })
const names = () => Array.from(document.querySelectorAll('[data-slot="table-row"][data-row-id]')).map((el) => el.querySelector('td')!.textContent)

afterEach(() => vi.restoreAllMocks())

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
  test('a heading can be a part; the column is named by its `label` for the sort button and screen readers, else by the words in the part, never by its id', () => {
    const columns: DataColumn<Entry>[] = [
      { id: 'name', header: <span data-testid="part">N</span>, label: 'Name', cell: (entry) => entry.name, sortValue: (entry) => entry.name },
      { id: 'size', header: <span>Size <b>in KB</b></span>, cell: (entry) => `${entry.size}`, sortValue: (entry) => entry.size },
      { id: 'kind', header: <span aria-hidden="true" />, cell: (entry) => entry.kind, sortValue: (entry) => entry.kind },
    ]
    render(<DataTable aria-label="Files" columns={columns} rows={ENTRIES} rowId={(entry) => entry.id} />)
    expect(screen.getByTestId('part')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sort by Size in KB' })).toBeTruthy()
    // Nothing to say it with: the id, which is better than nothing.
    expect(screen.getByRole('button', { name: 'Sort by kind' })).toBeTruthy()
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

describe('a choice that is not the same for every row', () => {
  const names = ENTRIES.map((entry) => entry.name)

  test('a row whose check is `null` has none, and says nothing of being chosen; a check that `isDisabled` cannot be pressed', () => {
    const change = vi.fn()
    const selection: DataSelection<Entry> = {
      isSelected: (entry) => (entry.id === 'cache/dir' ? null : false),
      isDisabled: (entry) => entry.id === 'logs',
      onSelectedChange: change,
      selectAll: false,
      onSelectAll: () => {},
      selectAllDisabled: true,
      label: (entry) => `Select ${entry.name}`,
    }
    render(<Tree extra={{ selection }} />)
    expect(screen.queryByRole('checkbox', { name: 'Select dir' })).toBeNull()
    expect(row('dir').children).toHaveLength(3)
    expect(row('dir').hasAttribute('aria-selected')).toBe(false)
    expect(row('a.tmp').getAttribute('aria-selected')).toBe('false')
    const blocked = screen.getByRole('checkbox', { name: 'Select Logs' })
    expect(blocked.hasAttribute('disabled') || blocked.getAttribute('aria-disabled') === 'true').toBe(true)
    fireEvent.click(blocked)
    expect(change).not.toHaveBeenCalled()
    const all = screen.getByRole('checkbox', { name: 'Select all' })
    expect(all.hasAttribute('disabled') || all.getAttribute('aria-disabled') === 'true').toBe(true)
  })

  test('a tree is shown as the app gives it, also when a heading asks for an order: the app is asked and the column is marked', () => {
    const sort = vi.fn()
    const columns: DataColumn<Entry>[] = [
      { id: 'name', header: 'Name', cell: (entry) => entry.name, sortValue: (entry) => entry.name },
      { id: 'size', header: 'Size', cell: (entry) => `${entry.size} KB`, sortValue: (entry) => entry.size, align: 'end' },
    ]
    render(<Tree extra={{ columns, sort: { column: 'name', descending: true }, onSortChange: sort }} />)
    expect(screen.getAllByRole('row').slice(1).map((el) => el.querySelector('td')!.textContent)).toEqual(names)
    expect(screen.getByRole('columnheader', { name: /Name/ }).getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Size' }))
    expect(sort).toHaveBeenCalledWith({ column: 'size', descending: false })
  })

  test('`manualSort` leaves the order to the app in a plain table too, and `fill` makes the box as tall as its place', () => {
    const rows = [...ENTRIES].reverse()
    const columns: DataColumn<Entry>[] = [{ id: 'name', header: 'Name', cell: (entry) => entry.name, sortValue: (entry) => entry.name }]
    render(<DataTable aria-label="Files" columns={columns} rows={rows} rowId={(entry) => entry.id} sort={{ column: 'name', descending: false }} manualSort fill />)
    expect(screen.getAllByRole('row').slice(1).map((el) => el.textContent)).toEqual(rows.map((entry) => entry.name))
    expect(screen.getByRole('table').parentElement!.className).toContain('h-full')
  })

  test('a column that `grow`s takes the room the others leave, and so does a group\'s cell', () => {
    const columns: DataColumn<Entry>[] = [
      { id: 'name', header: 'Name', cell: (entry) => entry.name, grow: true },
      { id: 'size', header: 'Size', cell: (entry) => `${entry.size} KB`, align: 'end' },
    ]
    render(<Tree extra={{ columns }} />)
    expect(row('a.tmp').children[0]!.className).toContain('max-w-0')
    expect(row('a.tmp').children[1]!.className).not.toContain('max-w-0')
    expect(row('a.tmp').children[1]!.className).toContain('whitespace-nowrap')
    expect(row('Caches').children[0]!.className).toContain('max-w-0')
  })
})

describe('a tree is ordered by the app', () => {
  const SORTABLE: DataColumn<Entry>[] = [
    { id: 'name', header: 'Name', cell: (entry) => entry.name, sortValue: (entry) => entry.name },
    { id: 'size', header: 'Size', cell: (entry) => `${entry.size} KB`, sortValue: (entry) => entry.size, align: 'end' },
  ]
  // Open, so that the children are in the rows, in the order the app gave: each under its group.
  const OPEN: Entry[] = [ENTRIES[0]!, ENTRIES[1]!, ENTRIES[2]!, ENTRIES[3]!]
  const FLAT: Entry[] = ENTRIES.filter((entry) => entry.kind === 'item').concat([{ id: 'z', name: 'z.tmp', level: 1, kind: 'item', size: 1 }])

  test('a press on a heading in a tree is heard and said, and the children stay with their parents', () => {
    const changed = vi.fn()
    render(<Tree extra={{ columns: SORTABLE, rows: OPEN, onSortChange: changed }} />)
    const before = names()
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Size' }))
    expect(changed).toHaveBeenLastCalledWith({ column: 'size', descending: false })
    expect(screen.getByRole('columnheader', { name: /Size/ }).getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Size' }))
    expect(screen.getByRole('columnheader', { name: /Size/ }).getAttribute('aria-sort')).toBe('descending')
    // The rows are shown as the app gave them: sorting them is the app's.
    expect(before).toEqual(['Caches', 'a.tmp', 'dir', 'Logs'])
    expect(names()).toEqual(before)
  })

  test('`manualSort` asks the same of a flat table: the rows are shown as given, and a table without it sorts them', () => {
    const rows = [...FLAT]
    const { unmount } = render(<DataTable aria-label="Files" columns={SORTABLE} rows={rows} rowId={(entry) => entry.id} manualSort defaultSort={{ column: 'size', descending: false }} />)
    expect(names()).toEqual(['a.tmp', 'z.tmp'])
    expect(screen.getByRole('columnheader', { name: /Size/ }).getAttribute('aria-sort')).toBe('ascending')
    unmount()
    render(<DataTable aria-label="Files" columns={SORTABLE} rows={rows} rowId={(entry) => entry.id} defaultSort={{ column: 'size', descending: false }} />)
    expect(names()).toEqual(['z.tmp', 'a.tmp'])
  })
})

describe('one Tab stop for the rows', () => {
  const selection: DataSelection<Entry> = { isSelected: () => false, onSelectedChange: () => {}, onSelectAll: () => {}, selectAll: false, label: (entry) => `Select ${entry.name}` }

  test('the check and the caret of a row are not Tab stops, and the heading\'s check is', () => {
    render(<Tree extra={{ selection }} />)
    const stops = Array.from(document.querySelectorAll<HTMLElement>('tbody [tabindex="0"], tbody button:not([tabindex="-1"]), tbody [role="checkbox"]:not([tabindex="-1"])'))
    expect(stops.map((el) => el.tagName + ':' + (el.getAttribute('data-slot') ?? ''))).toEqual(['TR:table-row'])
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-slot="table-caret"], tbody [role="checkbox"]'))) expect(el.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByRole('checkbox', { name: 'Select all' }).getAttribute('tabindex')).not.toBe('-1')
  })

  test('a press on a caret or on a check gives the focus back to its row, so the arrows keep working', () => {
    const change = vi.fn()
    render(<Tree extra={{ selection, onRowOpenChange: change }} />)
    fireEvent.click(within(row('dir')).getByRole('button', { name: 'Open' }))
    expect(change).toHaveBeenCalledWith(ENTRIES[2], true)
    expect(document.activeElement).toBe(row('dir'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a.tmp' }))
    expect(document.activeElement).toBe(row('a.tmp'))
  })
})

describe('the keys of a tree', () => {
  const selection = (change: (entry: Entry, checked: boolean) => void): DataSelection<Entry> => ({ isSelected: (entry) => (entry.id === 'cache/a' ? true : false), onSelectedChange: change })
  const OPEN_ALL: Entry[] = [ENTRIES[0]!, ENTRIES[1]!, { ...ENTRIES[2]!, open: true }, { id: 'cache/dir/x', name: 'x.tmp', level: 3, kind: 'item', size: 1 }, ENTRIES[3]!]

  test('Right on an open row goes in to its first row, Left on a row goes out to the row that holds it, and closes first when it is open', () => {
    const change = vi.fn()
    render(<Tree extra={{ rows: OPEN_ALL, onRowOpenChange: change }} />)
    row('dir').focus()
    press(row('dir'), 'ArrowRight')
    expect(document.activeElement).toBe(row('x.tmp'))
    press(row('x.tmp'), 'ArrowLeft')
    expect(document.activeElement).toBe(row('dir'))
    expect(change).not.toHaveBeenCalled()
    // An open row closes first; a second Left (it is then closed, as the app says) goes out.
    press(row('dir'), 'ArrowLeft')
    expect(change).toHaveBeenLastCalledWith(OPEN_ALL[2], false)
    press(row('a.tmp'), 'ArrowLeft')
    expect(document.activeElement).toBe(row('Caches'))
    // The top of the tree has no row that holds it.
    change.mockClear()
    press(row('Logs'), 'ArrowLeft')
    expect(document.activeElement).toBe(row('Caches'))
  })

  test('in a language written from the right, Left goes in and Right goes out', () => {
    const change = vi.fn()
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo)
      return new Proxy(style, { get: (target, key) => (key === 'direction' ? 'rtl' : Reflect.get(target, key)) })
    })
    render(<Tree extra={{ rows: OPEN_ALL, onRowOpenChange: change }} />)
    // `dir` is closed in the data: Left opens it, Right asks nothing and goes out.
    press(row('Logs'), 'ArrowLeft')
    expect(change).toHaveBeenLastCalledWith(ENTRIES[3], true)
    press(row('a.tmp'), 'ArrowRight')
    expect(document.activeElement).toBe(row('Caches'))
    press(row('Caches'), 'ArrowRight')
    expect(change).toHaveBeenLastCalledWith(OPEN_ALL[0], false)
  })

  test('Space ticks the row when the app has a choice and did not take the key; Enter presses it; a command key is left alone', () => {
    const change = vi.fn()
    const pressed = vi.fn()
    render(<Tree extra={{ selection: selection(change), onRowPress: pressed }} />)
    press(row('dir'), ' ')
    expect(change).toHaveBeenLastCalledWith(ENTRIES[2], true)
    press(row('a.tmp'), ' ')
    expect(change).toHaveBeenLastCalledWith(ENTRIES[1], false)
    expect(pressed).not.toHaveBeenCalled()
    press(row('dir'), 'Enter')
    expect(pressed).toHaveBeenCalledWith(ENTRIES[2])
    change.mockClear()
    press(row('dir'), ' ', { ctrlKey: true })
    press(row('dir'), 'ArrowDown', { metaKey: true })
    expect(change).not.toHaveBeenCalled()
    // The app's own key is the app's.
    const own = vi.fn((_: Entry, event: React.KeyboardEvent) => event.preventDefault())
    const { unmount } = render(<Tree extra={{ selection: selection(change), onRowKeyDown: own }} />)
    press(screen.getAllByText('dir')[1]!.closest('tr')!, ' ')
    expect(change).not.toHaveBeenCalled()
    unmount()
  })
})

describe('what the rows say of themselves', () => {
  test('each row of a tree says its place among its siblings, whatever the rows around', () => {
    const rows: Entry[] = [
      ENTRIES[0]!,
      ENTRIES[1]!,
      { ...ENTRIES[2]!, open: true },
      { id: 'cache/dir/x', name: 'x.tmp', level: 3, kind: 'item', size: 1 },
      { id: 'cache/dir/y', name: 'y.tmp', level: 3, kind: 'item', size: 1 },
      ENTRIES[3]!,
    ]
    render(<Tree extra={{ rows }} />)
    const place = (name: string) => [row(name).getAttribute('aria-posinset'), row(name).getAttribute('aria-setsize')]
    expect(place('Caches')).toEqual(['1', '2'])
    expect(place('Logs')).toEqual(['2', '2'])
    expect(place('a.tmp')).toEqual(['1', '2'])
    expect(place('dir')).toEqual(['2', '2'])
    expect(place('x.tmp')).toEqual(['1', '2'])
    expect(place('y.tmp')).toEqual(['2', '2'])
  })

  test('a row of which some are chosen is not «not selected»: its check says mixed and the row says nothing', () => {
    const selection: DataSelection<Entry> = { isSelected: (entry) => (entry.id === 'cache' ? 'mixed' : entry.id === 'cache/a'), onSelectedChange: () => {}, label: (entry) => `Select ${entry.name}` }
    render(<Tree extra={{ selection }} />)
    expect(row('Caches').hasAttribute('aria-selected')).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'Select Caches' }).getAttribute('aria-checked')).toBe('mixed')
    expect(row('a.tmp').getAttribute('aria-selected')).toBe('true')
    expect(row('dir').getAttribute('aria-selected')).toBe('false')
  })

  test('the box keeps a row it scrolls to clear of the headings, and of a group\'s', () => {
    const { unmount } = render(<Tree />)
    expect(document.querySelector('[data-slot="table-container"]')!.className).toContain('scroll-pt-[calc(var(--row-height)*2)]')
    unmount()
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} />)
    expect(document.querySelector('[data-slot="table-container"]')!.className).toContain('scroll-pt-(--row-height)')
  })

  test('the surface the table is on is the colour the headings that stay in sight cover the rows with', () => {
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={ENTRIES} rowId={(entry) => entry.id} surface="raised" />)
    expect(document.querySelector('[data-slot="table-container"]')!.className).toContain('[--ground:var(--color-raised)]')
    expect(screen.getAllByRole('columnheader')[0]!.className).toContain('var(--ground,var(--color-paper))')
  })

  test('a group\'s cell takes the tints of its row, which the colour of the surface must not hide', () => {
    render(<Tree />)
    const cell = row('Caches').querySelector('td')!
    expect(cell.className).toContain('[tr:hover>&]:bg-[color-mix(in_oklab,var(--color-selected)_60%,var(--ground,var(--color-paper)))]')
    expect(cell.className).toContain('[tr[aria-current=true]>&]:bg-selected')
  })
})

describe('virtual, with groups', () => {
  const ROWS = 40
  const BOX = 400
  const ITEMS: Entry[] = [
    { id: 'g', name: 'Group', level: 1, kind: 'group', size: 0, open: true },
    ...Array.from({ length: 300 }, (_, i): Entry => ({ id: `r${i}`, name: `row ${i}`, level: 2, kind: 'item', size: i })),
  ]

  /** The box is 400px, the headings and each row 40px. */
  function layOut() {
    const height = (el: Element) => (el.matches('[data-slot="table-container"]') ? BOX : el.matches('thead, [data-slot="table-row"]') ? ROWS : 0)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return height(this)
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return height(this)
    })
    // The box holds the headings and all the rows: how far it can scroll.
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
      return this.matches('[data-slot="table-container"]') ? (ITEMS.length + 2) * ROWS : 0
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const h = height(this)
      return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: h, width: 300, height: h, toJSON: () => ({}) }
    })
    // jsdom does not scroll: what the library asks the box to do is done by hand.
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      value(this: Element, options: { top?: number }) {
        this.scrollTop = options.top ?? 0
      },
    })
  }
  const box = () => document.querySelector<HTMLElement>('[data-slot="table-container"]')!
  const scrollTo = (top: number) =>
    act(() => {
      box().scrollTop = top
      fireEvent.scroll(box())
    })
  const indexes = () => Array.from(document.querySelectorAll('[data-slot="table-row"][data-index]')).map((el) => Number(el.getAttribute('data-index')))
  const table = () => (
    <DataTable aria-label="Clean up" columns={COLUMNS} rows={ITEMS} rowId={(entry) => entry.id} rowLevel={(entry) => entry.level} rowOpen={(entry) => entry.open} onRowOpenChange={() => {}} isGroupRow={(entry) => entry.kind === 'group'} virtual onRowPress={() => {}} className="h-96" />
  )

  test('the heading of the group in sight is in the page when its own row is far above, with the room between kept', () => {
    layOut()
    render(table())
    expect(indexes()[0]).toBe(0)
    scrollTo(40 * 150)
    const drawn = indexes()
    expect(drawn[0]).toBe(0)
    expect(drawn[1]).toBeGreaterThan(100)
    expect(row('Group').getAttribute('data-group')).toBe('true')
    // The room of the rows not drawn is still the whole table's: the first spacer sits between the group and the rows.
    const spacers = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="table-spacer"]')).map((el) => parseInt(el.style.height, 10))
    expect(spacers.length).toBe(2)
    expect(spacers.reduce((all, one) => all + one, 0) + drawn.length * ROWS).toBe(301 * ROWS)
  })

  test('the row with the focus stays in the page when it is scrolled far away, while the focus is in the table', () => {
    layOut()
    render(table())
    const third = row('row 2')
    act(() => third.focus())
    scrollTo(40 * 200)
    expect(indexes()).toContain(3)
    expect(screen.getByText('row 2').closest('tr')).toBe(third)
    expect(document.activeElement).toBe(third)
    // Once the focus is elsewhere the row goes, and the Tab stop is a row in sight.
    act(() => third.blur())
    expect(indexes()).not.toContain(3)
    expect(document.querySelectorAll('[data-slot="table-row"][tabindex="0"]')).toHaveLength(1)
  })

  test('PageDown goes to a row that is not in the page yet, and takes the focus when it is', async () => {
    layOut()
    render(table())
    const first = row('Group')
    act(() => first.focus())
    for (let i = 0; i < 3; i++) act(() => press(document.activeElement!, 'PageDown'))
    // The third page is out of the page: the box was told to scroll there, and the row is taken once it is drawn.
    await waitFor(() => expect(box().scrollTop).toBeGreaterThan(0))
    act(() => fireEvent.scroll(box()))
    await waitFor(() => expect(document.activeElement?.getAttribute('data-row-id')).toBe('r26'))
    expect(indexes()).toContain(27)
  })
})
