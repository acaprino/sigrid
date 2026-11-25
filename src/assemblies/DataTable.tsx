// A table of data, ready to use: columns that sort when their heading is pressed, one row that can be chosen, and,
// for thousands of rows, only the ones in sight in the page. The behaviour is TanStack's (`@tanstack/react-table` for
// the columns and the sorting, `@tanstack/react-virtual` for the rows in sight: npm dependencies, pinned, see
// THIRD_PARTY.md); the form is the toolkit's `Table` parts. It lives in its own entry of the package (`./table`), so
// an app without a table does not load either library.
// - A column says its heading, what a cell shows, and the value it sorts by. Without that value the heading is a
//   word and not a button. A press sorts up, a second down, a third puts the rows back as they were given. The
//   heading says how it is sorted with `aria-sort`, and with an arrow for the eye.
// - With `onRowPress` a row is pressed with the pointer or with Enter and Space; the arrows, Home and End move among
//   the rows, which are one Tab stop, as in a list: the row that had the focus last, or the chosen one, or the first
//   in sight. A press on a control inside a cell (a button, a link, a field) is that control's and not the row's.
//   The chosen row (`current`) has the selection tint (R1).
// - With `virtual` the box needs a height (`className="h-96"`): the rows outside it are not in the page, two spacer
//   rows keep the scrollbar honest, and each row is measured as it is drawn, so any density and a finger's 44px hold.
//   Home and End go to the first and the last row of the data. A row scrolled far out of sight is no longer in the
//   page, and the focus it had goes with it: Tab comes back to a row in sight.
// - `columns` is best made once (outside the component, or with `useMemo`): a new array at every paint sorts the
//   rows again at every paint.
// - A tree and a choice (the list of things to clean up, a folder with what is in it): `rowLevel` gives a row its level
//   (1 is the first) and indents its first cell by it, `rowOpen` says of a row that holds others whether it is open
//   (`undefined`: it holds none) and puts a caret before its first cell, `onRowOpenChange` hears the caret and the keys
//   (Right opens, Left closes the row in focus); the app puts in `rows` only the rows in sight, the children of an open row.
//   `isGroupRow` makes a row a group: one cell across every column, which stays in sight under the headings while its
//   rows scroll (`groupCell` is what it says: a name, a count, a size), foldable like any row that holds others. With any
//   of them the table is a `treegrid`: each row says its level, whether it is open and, with `selection`, whether it is
//   chosen.
// - `selection` adds a column of checks, one for each row, and in the heading one for all: `isSelected` says `true`,
//   `false` or `'mixed'` (a group of which some rows are chosen, shown as a dash), `onSelectedChange` hears the check, and
//   `selectAll` and `onSelectAll` are the heading's. It is the app that holds what is chosen.
// - `onRowKeyDown` is asked first about a key on a row: an app key (Space ticks, Enter opens a folder) is taken there and
//   `preventDefault()` keeps the table from taking it too; without it, and for every key the app leaves, the table does
//   what it did (Enter and Space press the row, the arrows, Home, End, PageUp and PageDown move). `containerRef` is the
//   box that scrolls, for an app that reads its scrolling.
// An app that needs more of a table (filters, pinned columns, groups) drives TanStack Table itself and draws it with
// `Table`, `TableRow` and `TableCell`: this component is the common case, not a wall around the library.
import * as React from 'react'
import { createSortedRowModel, rowSortingFeature, tableFeatures, useTable, type RowData, type SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp } from '../internal/sigrid-icons'
import { Icon } from '../icons'
import { FOCUS_RING } from '../lib/focus'
import { useMergedRef } from '../lib/refs'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { Checkbox } from '../primitives/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type TableCellAlign } from '../primitives/table'

export type DataColumn<Row> = {
  id: string
  /** The heading of the column: a word, or a part (a check that chooses all the rows, in the first column). */
  header: React.ReactNode
  /** The name of the column as a text, when `header` is not one: what the sort button and screen readers say. Absent: the `id`. */
  label?: string | undefined
  /** What a cell of the column shows. */
  cell: (row: Row) => React.ReactNode
  /** The value the column sorts by: a text, a number, a date. Without it the column does not sort. */
  sortValue?: ((row: Row) => string | number | Date | null | undefined) | undefined
  /** `end`: a column of numbers, set at the end in tabular figures. */
  align?: TableCellAlign | undefined
  /** Classes for the heading and the cells of the column: its width (`w-24`), no wrapping. */
  className?: string | undefined
}

/** The column the rows are sorted by, and the direction. Null: as they were given. */
export type DataSort = { column: string; descending: boolean } | null

/** The choice of rows: a column of checks, and the one in the heading that chooses all. */
export type DataSelection<Row> = {
  /** Whether a row is chosen: `'mixed'` for a group of which some rows are. */
  isSelected: (row: Row) => boolean | 'mixed'
  /** The check of a row was pressed: the state it asks for. */
  onSelectedChange: (row: Row, checked: boolean) => void
  /** Whether all the rows are chosen, for the check in the heading. */
  selectAll?: boolean | 'mixed' | undefined
  /** The check in the heading was pressed. Absent: the heading has no check. */
  onSelectAll?: ((checked: boolean) => void) | undefined
  /** The name of the check of a row for screen readers («Select report.pdf»). Absent: the toolkit's words. */
  label?: ((row: Row) => string) | undefined
}

export type DataTableProps<Row> = {
  /** The name of the table for screen readers («Files»). */
  'aria-label': string
  columns: readonly DataColumn<Row>[]
  rows: readonly Row[]
  /** What tells a row from the others, and stays the same when the rows are sorted. */
  rowId: (row: Row) => string
  /** The sorting, when the app keeps it; otherwise the table keeps its own, starting from `defaultSort`. */
  sort?: DataSort | undefined
  defaultSort?: DataSort | undefined
  onSortChange?: ((sort: DataSort) => void) | undefined
  /** The id of the row chosen: the one shown in the details. */
  current?: string | null | undefined
  /** With it, a row is pressed: with the pointer, or with Enter and Space. */
  onRowPress?: ((row: Row) => void) | undefined
  /** Only the rows in sight are in the page: for thousands of rows. The box needs a height (`className`). */
  virtual?: boolean | undefined
  /** The level of a row, 1 for the first: it indents the first cell and the row says it (`aria-level`). */
  rowLevel?: ((row: Row) => number) | undefined
  /** Whether a row that holds others is open; `undefined` for a row that holds none. A row that holds others has a caret and says `aria-expanded`. */
  rowOpen?: ((row: Row) => boolean | undefined) | undefined
  /** The caret of a row, or Right or Left on it, asks to open or close it: the state it asks for. The app puts the rows in or takes them out of `rows`. */
  onRowOpenChange?: ((row: Row, open: boolean) => void) | undefined
  /** A row is a group (a category): one cell across all the columns that stays under the headings while its rows scroll. */
  isGroupRow?: ((row: Row) => boolean) | undefined
  /** What a group says in its cell: a name, a count, a size. Absent: what the first column shows for it. */
  groupCell?: ((row: Row) => React.ReactNode) | undefined
  /** A column of checks, to choose rows. */
  selection?: DataSelection<Row> | undefined
  /** A key on a row (the row itself has the focus), before the table takes it: the app's own keys. `event.preventDefault()` keeps the table from taking the key too. */
  onRowKeyDown?: ((row: Row, event: React.KeyboardEvent<HTMLTableRowElement>) => void) | undefined
  /** The box that scrolls, for an app that reads its scrolling. */
  containerRef?: React.Ref<HTMLDivElement> | undefined
  /** In place of the rows when there are none. Absent: the toolkit's words («Nothing to show»). */
  empty?: React.ReactNode
  /** Classes of the box that scrolls: its height. */
  className?: string | undefined
}

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() })

// One collator for every comparison: making one at each of them is what makes sorting ten thousand names slow.
const TEXT = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Texts by the rules of the user's language, with the numbers inside them as numbers. */
function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return TEXT.compare(String(a), String(b))
}

/** What a press on a heading asks for: up, then down, then the rows as they were given. */
export function nextSort(now: DataSort, column: string): DataSort {
  if (!now || now.column !== column) return { column, descending: false }
  return now.descending ? null : { column, descending: true }
}

const ROW = '[data-slot="table-row"]'

/** One level in is 20px: the 16px of the caret's slot and its 4px gap, after the cell's own padding. */
// design-check-ignore-next-line dimension-value: one level in is 20px, after the cell's own padding
const INDENT = 'ps-[calc(0.75rem_+_(var(--depth)_-_1)_*_1.25rem)]'

/** A group's cells stay in sight under the headings (which are one row tall) while the rows scroll under them; their line is their own, like the headings'. */
const STICKY = "sticky top-(--row-height) z-9 bg-paper after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line after:content-['']"

/** The caret of a row that holds others, or its slot kept empty so the first cells line up. */
function Caret({ open, onToggle, label }: { open: boolean | undefined; onToggle: () => void; label: string }) {
  if (open === undefined) return <span aria-hidden="true" data-slot="table-caret-slot" className="inline-flex size-6 shrink-0 pointer-coarse:size-11" />
  return (
    <button
      type="button"
      data-slot="table-caret"
      aria-label={label}
      aria-expanded={open}
      onClick={onToggle}
      className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-mute hover:text-ink pointer-coarse:size-11 [&_svg]:size-3.5', FOCUS_RING)}
    >
      <Icon name="chevron" className={cn(open && 'rotate-90')} />
    </button>
  )
}

function DataTable<Row>({ columns, rows, rowId, sort, defaultSort = null, onSortChange, current, onRowPress, virtual = false, rowLevel, rowOpen, onRowOpenChange, isGroupRow, groupCell, selection, onRowKeyDown, containerRef, empty, className, ...props }: DataTableProps<Row>) {
  const words = useWords()
  const [own, setOwn] = React.useState<DataSort>(defaultSort)
  const sorted = sort === undefined ? own : sort
  const setSort = (next: DataSort) => {
    if (sort === undefined) setOwn(next)
    onSortChange?.(next)
  }

  const defs = React.useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        // A row without a value has none for the library either, which then keeps it last, up and down.
        accessorFn: (row: RowData) => column.sortValue?.(row as Row) ?? undefined,
        enableSorting: column.sortValue !== undefined,
        sortUndefined: 'last' as const,
        sortFn: (a: { getValue: (id: string) => unknown }, b: { getValue: (id: string) => unknown }, id: string) => compare(a.getValue(id), b.getValue(id)),
      })),
    [columns],
  )
  // The library takes any row as data; what it gives back is read here as the app's own rows. New columns are new
  // data too: the library keeps what a row sorts by, and a column that sorts by something else must be read again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = React.useMemo(() => [...rows] as RowData[], [rows, columns])
  const sorting: SortingState = React.useMemo(() => (sorted ? [{ id: sorted.column, desc: sorted.descending }] : []), [sorted])
  const table = useTable({ features, columns: defs, data, getRowId: (row) => rowId(row as Row), state: { sorting } })
  const model = table.getRowModel().rows

  const box = React.useRef<HTMLDivElement>(null)
  const boxRef = useMergedRef<HTMLDivElement>(box, containerRef)
  // A table with levels, folds or groups is a tree of rows; with only a column of checks it stays a table.
  const tree = rowLevel !== undefined || rowOpen !== undefined || isGroupRow !== undefined
  // The rows are one Tab stop when something can be done with one.
  const navigable = onRowPress !== undefined || onRowKeyDown !== undefined || selection !== undefined || tree
  const virtualizer = useVirtualizer({ count: model.length, getScrollElement: () => box.current, estimateSize: () => 40, overscan: 12, enabled: virtual })
  const drawn = virtual ? virtualizer.getVirtualItems() : null
  const first = drawn?.[0]
  const last = drawn?.[drawn.length - 1]
  const before = first ? first.start : 0
  const after = last ? virtualizer.getTotalSize() - last.end : 0
  const indexes = drawn ? drawn.map((item) => item.index) : model.map((_, index) => index)

  // One Tab stop for the rows: the row that had the focus last, else the chosen one, else the first one in sight
  // (with `virtual` the first rows drawn are above the box, kept ready for a scroll up).
  const [focused, setFocused] = React.useState<string | null>(null)
  const drawnIds = indexes.map((index) => model[index]?.id)
  const offset = virtual ? (virtualizer.scrollOffset ?? 0) : 0
  const inSight = drawn?.find((item) => item.start >= offset)?.index ?? indexes[0] ?? 0
  const stop = focused != null && drawnIds.includes(focused) ? focused : current != null && drawnIds.includes(current) ? current : model[inSight]?.id
  // The row to give the focus to once it is drawn: the first or the last of the data, reached with Home or End.
  const wanted = React.useRef<string | null>(null)
  React.useLayoutEffect(() => {
    if (wanted.current === null) return
    const row = Array.from(box.current?.querySelectorAll<HTMLTableRowElement>(ROW) ?? []).find((el) => el.dataset['rowId'] === wanted.current)
    if (!row) return
    wanted.current = null
    row.focus()
  })
  const toggle = (row: Row, open: boolean) => onRowOpenChange?.(row, open)
  const keys = (event: React.KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (event.target !== event.currentTarget) return
    // The app's keys first: what it takes, the table leaves alone.
    onRowKeyDown?.(row, event)
    if (event.defaultPrevented) return
    move(event, row)
  }
  const move = (event: React.KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    const from = event.currentTarget
    const all = Array.from(from.parentElement?.querySelectorAll<HTMLTableRowElement>(ROW) ?? [])
    const at = all.indexOf(from)
    // Right opens a row that holds others, Left closes it.
    const state = rowOpen?.(row)
    if (state !== undefined && onRowOpenChange && ((event.key === 'ArrowRight' && !state) || (event.key === 'ArrowLeft' && state))) {
      event.preventDefault()
      toggle(row, event.key === 'ArrowRight')
      return
    }
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      // A page is the rows that fit in the box, less one, so the one the eye was on stays in sight.
      event.preventDefault()
      const height = from.offsetHeight
      const fit = box.current && height > 0 ? Math.floor(box.current.clientHeight / height) - 1 : 10
      const by = Math.max(1, fit) * (event.key === 'PageDown' ? 1 : -1)
      if (virtual && model.length > 0) {
        const place = Math.min(model.length - 1, Math.max(0, Number(from.dataset['index'] ?? 0) + by))
        wanted.current = model[place]?.id ?? null
        virtualizer.scrollToIndex(place)
        const there = all.find((el) => el.dataset['rowId'] === wanted.current)
        if (there) {
          wanted.current = null
          there.focus()
        }
        return
      }
      all[Math.min(all.length - 1, Math.max(0, at + by))]?.focus()
      return
    }
    if (virtual && (event.key === 'Home' || event.key === 'End') && model.length > 0) {
      // The ends of the data, which may not be in the page: scroll there, and take the focus when the row is drawn.
      event.preventDefault()
      const to = event.key === 'Home' ? 0 : model.length - 1
      wanted.current = model[to]?.id ?? null
      virtualizer.scrollToIndex(to)
      // The row may be in the page already, and then nothing is drawn again.
      const there = all.find((el) => el.dataset['rowId'] === wanted.current)
      if (there) {
        wanted.current = null
        there.focus()
      }
      return
    }
    const to = event.key === 'ArrowDown' ? all[at + 1] : event.key === 'ArrowUp' ? all[at - 1] : event.key === 'Home' ? all[0] : event.key === 'End' ? all[all.length - 1] : undefined
    if (to) {
      event.preventDefault()
      to.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowPress?.(row)
    }
  }
  /** A press on a control inside a cell is that control's. */
  const press = (event: React.MouseEvent<HTMLTableRowElement>, row: Row) => {
    const inner = (event.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="menuitem"], [contenteditable="true"]')
    if (inner && inner !== event.currentTarget && event.currentTarget.contains(inner)) return
    onRowPress?.(row)
  }

  const columnName = (column: DataColumn<Row>) => (typeof column.header === 'string' ? column.header : (column.label ?? column.id))
  const check = (state: boolean | 'mixed' | undefined) => (state === 'mixed' ? ('indeterminate' as const) : state === true)
  const span = columns.length + (selection ? 1 : 0)

  return (
    <Table containerRef={boxRef} containerClassName={className} role={tree ? 'treegrid' : undefined} aria-rowcount={virtual ? model.length + 1 : undefined} {...props}>
      <TableHeader>
        <tr aria-rowindex={virtual ? 1 : undefined}>
          {selection ? (
            <TableHead key="select" sticky className="w-0">
              {selection.onSelectAll ? (
                <Checkbox checked={check(selection.selectAll ?? false)} onCheckedChange={(next) => selection.onSelectAll?.(next === true)} aria-label={words.table.selectAll} />
              ) : (
                <span className="sr-only">{words.table.select}</span>
              )}
            </TableHead>
          ) : null}
          {columns.map((column) => {
            const direction = sorted?.column === column.id ? (sorted.descending ? 'descending' : 'ascending') : 'none'
            return (
              <TableHead key={column.id} align={column.align} sticky aria-sort={column.sortValue ? direction : undefined} aria-label={typeof column.header === 'string' ? undefined : column.label} className={column.className}>
                {column.sortValue ? (
                  <button
                    type="button"
                    data-slot="table-sort"
                    aria-label={words.table.sortBy(columnName(column))}
                    onClick={() => setSort(nextSort(sorted, column.id))}
                    className={cn('-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-2xs font-medium pointer-coarse:min-h-11 hover:text-ink', direction !== 'none' && 'text-ink', column.align === 'end' && 'flex-row-reverse', FOCUS_RING)}
                  >
                    {column.header}
                    {/* The arrow keeps its room when the column is not the one sorted by, so the headings do not shift. */}
                    <span aria-hidden="true" className={cn('inline-flex [&_svg]:size-3.5', direction === 'none' && 'invisible')}>
                      {direction === 'descending' ? <ArrowDown /> : <ArrowUp />}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            )
          })}
        </tr>
      </TableHeader>
      <TableBody>
        {model.length === 0 ? (
          <tr data-slot="table-empty">
            <td colSpan={Math.max(1, span)} className="px-3 py-10 text-center text-sm text-ink-mute">
              {empty ?? words.table.empty}
            </td>
          </tr>
        ) : null}
        {before > 0 ? (
          <tr aria-hidden="true" data-slot="table-spacer" style={{ height: before }}>
            <td colSpan={span} />
          </tr>
        ) : null}
        {indexes.map((index) => {
          const item = model[index]
          if (!item) return null
          const row = item.original as Row
          const group = isGroupRow?.(row) === true
          const open = rowOpen?.(row)
          const state = selection?.isSelected(row)
          const level = rowLevel?.(row) ?? 1
          const caret = <Caret open={open} onToggle={() => toggle(row, !open)} label={open ? words.table.fold : words.table.unfold} />
          const mark = selection ? (
            <TableCell key="select" className={cn('w-0', group && STICKY)}>
              <Checkbox checked={check(state)} onCheckedChange={(next) => selection.onSelectedChange(row, next === true)} aria-label={selection.label?.(row) ?? words.table.selectRow} />
            </TableCell>
          ) : null
          return (
            <TableRow
              key={item.id}
              ref={virtual ? virtualizer.measureElement : undefined}
              data-index={index}
              data-row-id={item.id}
              data-group={group || undefined}
              aria-rowindex={virtual ? index + 2 : undefined}
              aria-level={tree ? level : undefined}
              aria-expanded={tree ? open : undefined}
              aria-selected={tree && selection ? state === true : undefined}
              current={current != null && item.id === current}
              tabIndex={navigable ? (item.id === stop ? 0 : -1) : undefined}
              onClick={onRowPress ? (event) => press(event, row) : undefined}
              onFocus={navigable ? (event) => (event.target === event.currentTarget ? setFocused(item.id) : undefined) : undefined}
              onKeyDown={navigable ? (event) => keys(event, row) : undefined}
              className={cn(navigable && 'cursor-default', group && 'font-medium text-ink')}
            >
              {mark}
              {group ? (
                <TableCell colSpan={columns.length} className={STICKY}>
                  <div className="flex min-w-0 items-center gap-1">
                    {caret}
                    {groupCell ? groupCell(row) : columns[0]?.cell(row)}
                  </div>
                </TableCell>
              ) : (
                columns.map((column, at) => (
                  <TableCell key={column.id} align={column.align} style={tree && at === 0 ? ({ '--depth': level } as React.CSSProperties) : undefined} className={cn(tree && at === 0 && INDENT, column.className)}>
                    {tree && at === 0 ? (
                      <div className="flex min-w-0 items-center gap-1">
                        {caret}
                        {column.cell(row)}
                      </div>
                    ) : (
                      column.cell(row)
                    )}
                  </TableCell>
                ))
              )}
            </TableRow>
          )
        })}
        {after > 0 ? (
          <tr aria-hidden="true" data-slot="table-spacer" style={{ height: after }}>
            <td colSpan={span} />
          </tr>
        ) : null}
      </TableBody>
    </Table>
  )
}

export { DataTable }
