// A table: the parts it is drawn with (`Table`, `TableRow`, `TableCell`, from `/primitives`) and the table of data that
// sorts and draws only the rows in sight (`DataTable`, the `./table` entry, on TanStack Table and TanStack Virtual).
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../src/primitives'
import { DataTable, nextSort, type DataColumn } from '../src/table'

type File = { id: string; name: string; size: number | null; changed: string }
const FILES: File[] = [
  { id: 'a', name: 'report 10.pdf', size: 2400, changed: '2026-11-20' },
  { id: 'b', name: 'Report 2.pdf', size: 96, changed: '2026-11-22' },
  { id: 'c', name: 'notes.txt', size: null, changed: '2026-10-01' },
]
const COLUMNS: DataColumn<File>[] = [
  { id: 'name', header: 'Name', cell: (file) => file.name, sortValue: (file) => file.name },
  { id: 'size', header: 'Size', cell: (file) => (file.size === null ? '' : `${file.size} KB`), sortValue: (file) => file.size, align: 'end' },
  { id: 'changed', header: 'Changed', cell: (file) => file.changed },
]
const names = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]!.textContent)

describe('the parts of a table', () => {
  test('a table in a box that scrolls, headings of columns, and one row that is the current one', () => {
    render(
      <Table aria-label="Files" containerClassName="h-40">
        <TableHeader>
          <tr>
            <TableHead>Name</TableHead>
            <TableHead align="end">Size</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          <TableRow current>
            <TableCell>a.pdf</TableCell>
            <TableCell align="end">12</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>b.pdf</TableCell>
            <TableCell align="end">7</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const table = screen.getByRole('table', { name: 'Files' })
    expect(table.parentElement!.getAttribute('data-slot')).toBe('table-container')
    expect(screen.getAllByRole('columnheader').map((head) => head.getAttribute('scope'))).toEqual(['col', 'col'])
    const [, first, second] = screen.getAllByRole('row')
    expect(first!.getAttribute('aria-current')).toBe('true')
    expect(second!.hasAttribute('aria-current')).toBe(false)
    // A number is set at the end, in tabular figures (R5).
    expect(within(first!).getAllByRole('cell')[1]!.className).toContain('tabular-nums')
  })

  test('the row of the headings takes no tint under the pointer, and a row of the body is as it was', () => {
    render(
      <Table aria-label="Files">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>a.pdf</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const [head, body] = screen.getAllByRole('row')
    expect(head!.parentElement!.tagName).toBe('THEAD')
    // The undoing is written for a row whose parent is the `thead`: it matches the first row and not the second.
    for (const row of [head!, body!]) expect(row.className.split(/\s+/)).toEqual(expect.arrayContaining(['hover:bg-selected/60', '[thead>&]:hover:bg-transparent']))
    expect(head!.matches('thead > tr')).toBe(true)
    expect(body!.matches('thead > tr')).toBe(false)
  })

  test('a cell that takes the room the others leave gives way, so a line that is cut in it does not widen the table', () => {
    render(
      <Table aria-label="Files">
        <TableBody>
          <TableRow>
            <TableCell grow>a-very-long-name.pdf</TableCell>
            <TableCell align="end">12</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const [name, size] = screen.getAllByRole('cell')
    expect(name!.className.split(/\s+/)).toEqual(expect.arrayContaining(['w-full', 'max-w-0']))
    expect(size!.className).not.toContain('max-w-0')
  })
})

describe('DataTable', () => {
  test('a press on a heading sorts up, a second down, a third puts the rows back; the heading says how', () => {
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} />)
    expect(names()).toEqual(['report 10.pdf', 'Report 2.pdf', 'notes.txt'])
    const byName = screen.getByRole('button', { name: 'Sort by Name' })
    const head = byName.closest('th')!
    expect(head.getAttribute('aria-sort')).toBe('none')
    fireEvent.click(byName)
    // Texts by the rules of the language, with the numbers inside them as numbers: 2 comes before 10.
    expect(names()).toEqual(['notes.txt', 'Report 2.pdf', 'report 10.pdf'])
    expect(head.getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(byName)
    expect(names()).toEqual(['report 10.pdf', 'Report 2.pdf', 'notes.txt'])
    expect(head.getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(byName)
    expect(names()).toEqual(['report 10.pdf', 'Report 2.pdf', 'notes.txt'])
    expect(head.getAttribute('aria-sort')).toBe('none')
    // A column with no value to sort by has a word for a heading, not a button.
    expect(screen.queryByRole('button', { name: 'Sort by Changed' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Changed' }).hasAttribute('aria-sort')).toBe(false)
  })

  test('numbers sort as numbers, and a row without a value comes last', () => {
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} defaultSort={{ column: 'size', descending: false }} />)
    expect(names()).toEqual(['Report 2.pdf', 'report 10.pdf', 'notes.txt'])
  })

  test('the app can keep the sorting: the table asks, and shows what it is given', () => {
    const asked = vi.fn()
    const { rerender } = render(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} sort={null} onSortChange={asked} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Size' }))
    expect(asked).toHaveBeenCalledWith({ column: 'size', descending: false })
    expect(names()).toEqual(['report 10.pdf', 'Report 2.pdf', 'notes.txt'])
    // Up, which is not the order the rows were given in: a sorting that was not taken would show here.
    rerender(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} sort={{ column: 'size', descending: false }} onSortChange={asked} />)
    expect(names()).toEqual(['Report 2.pdf', 'report 10.pdf', 'notes.txt'])
    // Down: the largest first, and the row without a size still last.
    rerender(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} sort={{ column: 'size', descending: true }} onSortChange={asked} />)
    expect(names()).toEqual(['report 10.pdf', 'Report 2.pdf', 'notes.txt'])
    rerender(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} sort={{ column: 'name', descending: false }} onSortChange={asked} />)
    expect(names()).toEqual(['notes.txt', 'Report 2.pdf', 'report 10.pdf'])
    expect(nextSort({ column: 'size', descending: true }, 'size')).toBeNull()
    expect(nextSort({ column: 'size', descending: true }, 'name')).toEqual({ column: 'name', descending: false })
  })

  test('a row is pressed with the pointer and with Enter; the arrows move among the rows, which are one Tab stop', () => {
    const pressed = vi.fn()
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} current="b" onRowPress={pressed} />)
    const [, a, b, c] = screen.getAllByRole('row')
    expect(b!.getAttribute('aria-current')).toBe('true')
    expect([a, b, c].map((row) => row!.tabIndex)).toEqual([-1, 0, -1])
    fireEvent.click(a!)
    expect(pressed).toHaveBeenLastCalledWith(FILES[0])
    b!.focus()
    fireEvent.keyDown(b!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(c)
    fireEvent.keyDown(c!, { key: 'Home' })
    expect(document.activeElement).toBe(a)
    fireEvent.keyDown(a!, { key: 'Enter' })
    expect(pressed).toHaveBeenCalledTimes(2)
  })

  test('the Tab stop follows the focus: after the arrows, Tab leaves the table from the row it is on', () => {
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={FILES} rowId={(file) => file.id} current="c" onRowPress={() => {}} />)
    const [, a, b, c] = screen.getAllByRole('row')
    expect([a, b, c].map((row) => row!.tabIndex)).toEqual([-1, -1, 0])
    c!.focus()
    fireEvent.keyDown(c!, { key: 'ArrowUp' })
    fireEvent.keyDown(b!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(a)
    expect([a, b, c].map((row) => row!.tabIndex)).toEqual([0, -1, -1])
  })

  test('a press on a control inside a cell is the control\'s, not the row\'s', () => {
    const pressed = vi.fn()
    const removed = vi.fn()
    const columns: DataColumn<File>[] = [
      ...COLUMNS,
      { id: 'remove', header: 'Remove', cell: (file) => <button type="button" onClick={() => removed(file.id)}>Remove {file.name}</button> },
    ]
    render(<DataTable aria-label="Files" columns={columns} rows={FILES} rowId={(file) => file.id} onRowPress={pressed} />)
    fireEvent.click(screen.getByRole('button', { name: `Remove ${FILES[0]!.name}` }))
    expect(removed).toHaveBeenCalledWith(FILES[0]!.id)
    expect(pressed).not.toHaveBeenCalled()
    // The text of a cell is the row.
    fireEvent.click(screen.getByText(FILES[1]!.name))
    expect(pressed).toHaveBeenCalledWith(FILES[1])
  })

  test('a column that comes to sort by something else sorts the rows again', () => {
    const by = (value: (file: File) => string | number | null): DataColumn<File>[] => [{ id: 'it', header: 'It', cell: (file) => file.name, sortValue: value }]
    const { rerender } = render(<DataTable aria-label="Files" columns={by((file) => file.name)} rows={FILES} rowId={(file) => file.id} sort={{ column: 'it', descending: false }} />)
    expect(names()).toEqual(['notes.txt', 'Report 2.pdf', 'report 10.pdf'])
    rerender(<DataTable aria-label="Files" columns={by((file) => file.size)} rows={FILES} rowId={(file) => file.id} sort={{ column: 'it', descending: false }} />)
    expect(names()).toEqual(['Report 2.pdf', 'report 10.pdf', 'notes.txt'])
  })

  test('without rows it says so, in the app\'s words', () => {
    render(
      <WordsProvider words={{ table: { empty: 'Niente da mostrare', sortBy: (column) => `Ordina per ${column}` } }}>
        <DataTable aria-label="File" columns={COLUMNS} rows={[]} rowId={(file) => file.id} />
      </WordsProvider>,
    )
    expect(screen.getByText('Niente da mostrare')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ordina per Name' })).toBeTruthy()
  })

  test('with `virtual` the rows are not all in the page, and the table still says how many it holds', () => {
    // jsdom lays nothing out, so no row is in sight here: which rows are drawn at a height, and that the scrollbar
    // is the one of the whole table, is checked in a browser, on the showcase (section «Table»).
    const many = Array.from({ length: 5000 }, (_, i): File => ({ id: `f${i}`, name: `file ${i}`, size: i, changed: '' }))
    render(<DataTable aria-label="Files" columns={COLUMNS} rows={many} rowId={(file) => file.id} virtual className="h-96" />)
    const table = screen.getByRole('table', { name: 'Files' })
    expect(table.getAttribute('aria-rowcount')).toBe('5001')
    // The heading is the first row of the count.
    expect(screen.getAllByRole('row')[0]!.getAttribute('aria-rowindex')).toBe('1')
    expect(table.querySelectorAll('[data-slot="table-row"]').length).toBeLessThan(60)
  })
})
