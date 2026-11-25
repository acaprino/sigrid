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
//   in sight (the check and the caret of a row are not Tab stops of their own, and give the focus back to the row
//   when pressed). A press on a control inside a cell (a button, a link, a field) is that control's and not the row's.
//   The chosen row (`current`) has the selection tint (R1).
// - With `virtual` the box needs a height (`className="h-96"`): the rows outside it are not in the page, two spacer
//   rows keep the scrollbar honest, and each row is measured as it is drawn, so any density and a finger's 44px hold.
//   Home and End go to the first and the last row of the data. A row scrolled far out of sight is no longer in the
//   page, except the one that has the focus, which stays while the focus is in the table (so the keys do not fall to
//   the page after a turn of the wheel); once the focus leaves, Tab comes back to a row in sight. The box keeps clear of
//   the headings that stay in sight (and of a group's) when it scrolls to a row, whether the browser or the library does.
// - `columns` is best made once (outside the component, or with `useMemo`): a new array at every paint sorts the
//   rows again at every paint.
// - A tree and a choice (the list of things to clean up, a folder with what is in it): `rowLevel` gives a row its level
//   (1 is the first) and indents its first cell by it, `rowOpen` says of a row that holds others whether it is open
//   (`undefined`: it holds none) and puts a caret before its first cell, `onRowOpenChange` hears the caret and the keys
//   (Right opens a closed row and, on an open one, goes to its first row; Left closes an open row and, on any other, goes
//   to the row that holds it; they swap in a language written from the right); the app puts in `rows` only the rows in
//   sight, the children of an open row, in the order it wants them.
//   `isGroupRow` makes a row a group: one cell across every column, which stays in sight under the headings while its
//   rows scroll (`groupCell` is what it says: a name, a count, a size), foldable like any row that holds others; with
//   `virtual` the heading of the group in sight stays in the page even when its own row is far above. With any of them
//   the table is a `treegrid`: each row says its level, its place among its siblings (`aria-posinset`, `aria-setsize`),
//   whether it is open and, with `selection`, whether it is chosen (a row of which only some are chosen says nothing
//   of it, and its check says «mixed»).
// - A tree is ordered by the app, not by the table: with levels, folds or groups (or with `manualSort`) a press on a
//   heading still says how the app is asked to sort (the button, `aria-sort`, `onSortChange`) but the rows are shown as
//   given, so a child never leaves its parent.
// - `selection` adds a column of checks, one for each row, and in the heading one for all: `isSelected` says `true`,
//   `false` or `'mixed'` (a group of which some rows are chosen, shown as a dash), `onSelectedChange` hears the check, and
//   `selectAll` and `onSelectAll` are the heading's (the check that chooses all goes there, never in the `header` of a
//   column, where it would sit inside the sort button). It is the app that holds what is chosen.
// - `onRowKeyDown` is asked first about a key on a row: an app key (Enter opens a folder) is taken there and
//   `preventDefault()` keeps the table from taking it too; for every key the app leaves, the table does what it did
//   (Enter presses the row, Space too, or ticks it when there is a `selection`; the arrows, Home, End, PageUp and PageDown
//   move; none of them with Alt, Ctrl or Meta held). `containerRef` is the box that scrolls, for an app that reads its
//   scrolling.
// - A row may have no check (`isSelected` gives `null`: a sub-heading that cannot be chosen) or a check that cannot be
//   pressed now (`isDisabled`, `selectAllDisabled`: a blocked row, a job that holds the list). `fill` makes the box as tall
//   as the place that holds it, so that the table is the content of a panel and its headings stay in sight.
// An app that needs more of a table (filters, pinned columns, groups) drives TanStack Table itself and draws it with
// `Table`, `TableRow` and `TableCell`: this component is the common case, not a wall around the library.
import * as React from 'react'
import { createSortedRowModel, rowSortingFeature, tableFeatures, useTable, type RowData, type SortingState } from '@tanstack/react-table'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
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
  /**
   * The heading of the column: a word, or a part that says something (an icon with a word). Not a control: in a column that
   * sorts the heading sits inside the sort button, and a control inside a button is not valid. The check that chooses all the
   * rows is `selection.onSelectAll`, in the column of checks.
   */
  header: React.ReactNode
  /** The name of the column as a text, when `header` is not one: what the sort button and screen readers say. Absent: the words inside `header`, else the `id`. */
  label?: string | undefined
  /** What a cell of the column shows. */
  cell: (row: Row) => React.ReactNode
  /** The value the column sorts by: a text, a number, a date. Without it the column does not sort. */
  sortValue?: ((row: Row) => string | number | Date | null | undefined) | undefined
  /** `end`: a column of numbers, set at the end in tabular figures. */
  align?: TableCellAlign | undefined
  /** The column takes the width the others leave, and no more: a one-line text in it that is too long (`Text truncate`) is cut there instead of widening the table. For the column of the names. */
  grow?: boolean | undefined
  /** Classes for the heading and the cells of the column: its width (`w-24`), no wrapping. */
  className?: string | undefined
}

/** The column the rows are sorted by, and the direction. Null: as they were given. */
export type DataSort = { column: string; descending: boolean } | null

/** The choice of rows: a column of checks, and the one in the heading that chooses all. */
export type DataSelection<Row> = {
  /** Whether a row is chosen: `'mixed'` for a group of which some rows are, `null` for a row that has no check (a sub-heading that cannot be chosen). */
  isSelected: (row: Row) => boolean | 'mixed' | null
  /** The check of a row cannot be pressed now (a row that is blocked, a job that holds the list). It stays in sight, dimmed. Absent: every check can. */
  isDisabled?: ((row: Row) => boolean) | undefined
  /** The check of a row was pressed (or Space on the row): the state it asks for. */
  onSelectedChange: (row: Row, checked: boolean) => void
  /** Whether all the rows are chosen, for the check in the heading. */
  selectAll?: boolean | 'mixed' | undefined
  /** The check in the heading was pressed. Absent: the heading has no check. */
  onSelectAll?: ((checked: boolean) => void) | undefined
  /** The check in the heading cannot be pressed now. */
  selectAllDisabled?: boolean | undefined
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
  /**
   * The app puts the rows in order, whatever the headings say: a press on a heading still asks `onSortChange` and `sort` still marks
   * the column (`aria-sort`, the arrow), but the rows are shown as given. A tree is this always (sorting its rows flat would part a
   * child from its parent).
   */
  manualSort?: boolean | undefined
  /**
   * The table is the content of its place: the box takes the height of the place that holds it (a `Panel`, a pane) and scrolls
   * inside it, the headings and the groups staying in sight. The place gives it its height; with `virtual` it is the box's height.
   */
  fill?: boolean | undefined
  /** The id of the row chosen: the one shown in the details. */
  current?: string | null | undefined
  /** With it, a row is pressed: with the pointer, or with Enter and Space. */
  onRowPress?: ((row: Row) => void) | undefined
  /** Only the rows in sight are in the page: for thousands of rows. The box needs a height (`className`). With groups, the heading of the group in sight stays in the page and under the headings, whatever the rows above. */
  virtual?: boolean | undefined
  /** The level of a row, 1 for the first: it indents the first cell and the row says it (`aria-level`, with its place among its siblings). */
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
  /** The surface the table is on, for the headings that stay in sight, which must cover the rows under them in its colour: the page (default), a raised card or the quiet fill. */
  surface?: 'paper' | 'raised' | 'quiet' | undefined
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

/** The words inside a part of a heading, for the name of its sort button. */
function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children)
  return ''
}

const ROW = '[data-slot="table-row"]'

/** One level in is 20px: the 16px of the caret's slot and its 4px gap, after the cell's own padding (as the tree's). */
// design-check-ignore-next-line dimension-value: one level in is 20px, after the cell's own padding
const INDENT = 'ps-[calc(0.75rem_+_(var(--depth)_-_1)_*_1.25rem)]'

/**
 * A group's cells stay in sight under the headings (which are one row tall) while the rows scroll under them; their line
 * is their own, like the headings'. They cover the rows in the colour of the surface the table is on (`--ground`, the page's
 * by default) and take the tints of the row, which a solid colour would hide: the pointer's one is the surface with a
 * share of the selection tint (what the tint, which lets the surface show, looks like on it), the chosen row's is whole.
 */
const STICKY =
  "sticky top-(--row-height) z-9 bg-[var(--ground,var(--color-paper))] [tr:hover>&]:bg-[color-mix(in_oklab,var(--color-selected)_60%,var(--ground,var(--color-paper)))] [tr[aria-current=true]>&]:bg-selected after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line after:content-['']"

/** The ground of the sticky headings, by the surface the table is on. */
const GROUND = { paper: undefined, raised: '[--ground:var(--color-raised)]', quiet: '[--ground:var(--color-paper-2)]' } as const

/** The row of a part of the table, to give the focus back to once a control in it was pressed. */
const rowOf = (el: Element) => el.closest<HTMLElement>(ROW)

/**
 * The caret of a row that holds others, or its slot kept empty so the first cells line up. Both are 16px, as an indent
 * level (the hit area of the caret is larger: 24px, and 44px with a finger). It is not a Tab stop (the rows are), and gives
 * the focus back to its row when pressed, so the arrows go on working.
 */
function Caret({ open, onToggle, label }: { open: boolean | undefined; onToggle: () => void; label: string }) {
  if (open === undefined) return <span aria-hidden="true" data-slot="table-caret-slot" className="inline-flex size-4 shrink-0" />
  return (
    <button
      type="button"
      tabIndex={-1}
      data-slot="table-caret"
      aria-label={label}
      aria-expanded={open}
      onClick={(event) => {
        onToggle()
        rowOf(event.currentTarget)?.focus()
      }}
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-ink-mute hover:text-ink after:absolute after:-inset-1 after:content-[''] pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:-start-5 pointer-coarse:after:-end-2 [&_svg]:size-3.5",
        FOCUS_RING,
      )}
    >
      <Icon name="chevron" className={cn(open && 'rotate-90')} />
    </button>
  )
}

/** Where each row stands among its siblings (the rows of its level between two rows of a lesser one), for a tree. */
function siblings(levels: readonly number[]): { pos: number[]; size: number[] } {
  const pos: number[] = []
  const size: number[] = []
  const runs: { level: number; members: number[] }[] = []
  const close = (run: { members: number[] }) =>
    run.members.forEach((index, at) => {
      pos[index] = at + 1
      size[index] = run.members.length
    })
  levels.forEach((level, index) => {
    while (runs.length > 0 && runs[runs.length - 1]!.level > level) close(runs.pop()!)
    const top = runs[runs.length - 1]
    if (top && top.level === level) top.members.push(index)
    else runs.push({ level, members: [index] })
  })
  runs.forEach(close)
  return { pos, size }
}

function DataTable<Row>({ columns, rows, rowId, sort, defaultSort = null, onSortChange, manualSort, current, onRowPress, virtual = false, rowLevel, rowOpen, onRowOpenChange, isGroupRow, groupCell, selection, onRowKeyDown, containerRef, fill = false, surface = 'paper', empty, className, ...props }: DataTableProps<Row>) {
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
  // A table with levels, folds or groups is a tree of rows; with only a column of checks it stays a table.
  const tree = rowLevel !== undefined || rowOpen !== undefined || isGroupRow !== undefined
  // A tree is ordered by the app (so is a table that says so): the library keeps the sort in the state and leaves the rows where they are.
  const manual = manualSort === true || tree
  const table = useTable({ features, columns: defs, data, getRowId: (row) => rowId(row as Row), state: { sorting }, manualSorting: manual })
  const model = table.getRowModel().rows

  const box = React.useRef<HTMLDivElement>(null)
  const boxRef = useMergedRef<HTMLDivElement>(box, containerRef)
  // The rows are one Tab stop when something can be done with one.
  const navigable = onRowPress !== undefined || onRowKeyDown !== undefined || selection !== undefined || tree
  const groups = isGroupRow !== undefined
  const levels = React.useMemo(() => (tree ? model.map((item) => rowLevel?.(item.original as Row) ?? 1) : []), [tree, model, rowLevel])
  const place = React.useMemo(() => (tree ? siblings(levels) : null), [tree, levels])

  // The focus: the row that had it last (the Tab stop), and whether it is in the table now.
  const [focused, setFocused] = React.useState<string | null>(null)
  const [inside, setInside] = React.useState(false)
  // `virtual`: the headings that stay in sight are as tall as the row of the headings, and the rows scroll under them.
  const [head, setHead] = React.useState(0)
  React.useLayoutEffect(() => {
    if (!virtual) return
    const height = box.current?.querySelector('thead')?.offsetHeight ?? 0
    if (height !== head) setHead(height)
  })
  const shelf = virtual ? head : 0
  // The places that stay in the page whatever the scroll: the row with the focus, and the group in sight, whose heading
  // is under the table's own.
  const places = React.useMemo(() => (virtual ? new Map(model.map((item, index) => [item.id, index])) : null), [virtual, model])
  const held = virtual && inside && focused !== null ? places?.get(focused) : undefined
  const grouped = React.useMemo(() => (virtual && groups ? model.flatMap((item, index) => (isGroupRow(item.original as Row) ? [index] : [])) : []), [virtual, groups, model, isGroupRow])
  const keep = React.useCallback(
    (range: Range) => {
      const base = defaultRangeExtractor(range)
      const extra: number[] = []
      if (held !== undefined && held < model.length) extra.push(held)
      // The last group at or before the first row in sight.
      let low = 0
      let high = grouped.length - 1
      let found = -1
      while (low <= high) {
        const mid = (low + high) >> 1
        if (grouped[mid]! <= range.startIndex) {
          found = grouped[mid]!
          low = mid + 1
        } else high = mid - 1
      }
      if (found >= 0) extra.push(found)
      if (extra.length === 0) return base
      return [...new Set([...base, ...extra])].sort((a, b) => a - b)
    },
    [held, grouped, model.length],
  )
  const virtualizer = useVirtualizer({
    count: model.length,
    getScrollElement: () => box.current,
    estimateSize: () => 40,
    overscan: 12,
    enabled: virtual,
    rangeExtractor: keep,
    // The rows are under the headings in the box: their places begin there, and a row scrolled to is put under them (and
    // under a group's heading).
    scrollMargin: shelf,
    scrollPaddingStart: shelf * (groups ? 2 : 1),
  })
  const drawn = virtual ? virtualizer.getVirtualItems() : null
  const indexes = drawn ? drawn.map((item) => item.index) : model.map((_, index) => index)

  // One Tab stop for the rows: the row that had the focus last, else the chosen one, else the first one in sight
  // (with `virtual` the first rows drawn are above the box, kept ready for a scroll up).
  const drawnIds = indexes.map((index) => model[index]?.id)
  const offset = virtual ? (virtualizer.scrollOffset ?? 0) : 0
  const inSight = drawn?.find((item) => item.start >= offset)?.index ?? indexes[0] ?? 0
  const stop = focused != null && drawnIds.includes(focused) ? focused : current != null && drawnIds.includes(current) ? current : model[inSight]?.id
  // The row to give the focus to once it is drawn: the first or the last of the data, reached with Home or End.
  const wanted = React.useRef<string | null>(null)
  const rowEl = (id: string | null | undefined) => Array.from(box.current?.querySelectorAll<HTMLTableRowElement>(ROW) ?? []).find((el) => el.dataset['rowId'] === id)
  React.useLayoutEffect(() => {
    if (wanted.current === null) return
    const row = rowEl(wanted.current)
    if (!row) return
    wanted.current = null
    row.focus()
  })
  const toggle = (row: Row, open: boolean) => onRowOpenChange?.(row, open)
  /** The row at a place of the data gets the focus: now if it is in the page, else when it is drawn. */
  const goTo = (at: number) => {
    const target = model[at]
    if (!target) return
    const there = rowEl(target.id)
    if (there) {
      wanted.current = null
      there.focus()
      return
    }
    if (!virtual) return
    wanted.current = target.id
    virtualizer.scrollToIndex(at)
  }
  const keys = (event: React.KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (event.target !== event.currentTarget) return
    // The app's keys first: what it takes, the table leaves alone.
    onRowKeyDown?.(row, event)
    if (event.defaultPrevented) return
    // A key with a command held is the browser's or the system's.
    if (event.altKey || event.ctrlKey || event.metaKey) return
    move(event, row)
  }
  const move = (event: React.KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    const from = event.currentTarget
    const index = Number(from.dataset['index'] ?? 0)
    const key = event.key
    const take = () => event.preventDefault()
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      if (event.shiftKey) return
      // The key that goes in is the one that points to the end of the line: Left in a language written from the right.
      const goesIn = (key === 'ArrowRight') !== (getComputedStyle(from).direction === 'rtl')
      const state = rowOpen?.(row)
      if (goesIn) {
        // Right opens a row that holds others and, on one that is open, goes to the first row it holds.
        if (state === false && onRowOpenChange) {
          take()
          toggle(row, true)
        } else if (state === true && (levels[index + 1] ?? 0) > (levels[index] ?? 1)) {
          take()
          goTo(index + 1)
        }
        return
      }
      // Left closes a row that is open and, on any other, goes to the row that holds it.
      if (state === true && onRowOpenChange) {
        take()
        toggle(row, false)
        return
      }
      let parent = index - 1
      while (parent >= 0 && (levels[parent] ?? 1) >= (levels[index] ?? 1)) parent--
      if (parent >= 0 && levels.length > 0) {
        take()
        goTo(parent)
      }
      return
    }
    if (key === 'PageDown' || key === 'PageUp') {
      // A page is the rows that fit in the box, less one, so the one the eye was on stays in sight.
      take()
      const height = from.offsetHeight
      const fit = box.current && height > 0 ? Math.floor(box.current.clientHeight / height) - 1 : 10
      const by = Math.max(1, fit) * (key === 'PageDown' ? 1 : -1)
      goTo(Math.min(model.length - 1, Math.max(0, index + by)))
      return
    }
    const to = key === 'ArrowDown' ? index + 1 : key === 'ArrowUp' ? index - 1 : key === 'Home' ? 0 : key === 'End' ? model.length - 1 : null
    if (to !== null) {
      // The ends of the data may not be in the page: goTo scrolls there and takes the focus when the row is drawn.
      if (to >= 0 && to < model.length) {
        take()
        goTo(to)
      }
      return
    }
    if ((key === 'Enter' || key === ' ') && !event.shiftKey) {
      take()
      // With a choice, Space ticks the row (the app's keys came first); Enter is the row's press.
      if (key === ' ' && selection) selection.onSelectedChange(row, selection.isSelected(row) !== true)
      else onRowPress?.(row)
    }
  }
  /** A press on a control inside a cell is that control's. */
  const press = (event: React.MouseEvent<HTMLTableRowElement>, row: Row) => {
    const inner = (event.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="menuitem"], [contenteditable="true"]')
    if (inner && inner !== event.currentTarget && event.currentTarget.contains(inner)) return
    onRowPress?.(row)
  }

  const columnName = (column: DataColumn<Row>) => (typeof column.header === 'string' ? column.header : (column.label ?? (textOf(column.header).trim() || column.id)))
  const check = (state: boolean | 'mixed' | null | undefined) => (state === 'mixed' ? ('indeterminate' as const) : state === true)
  const span = columns.length + (selection ? 1 : 0)
  const spacer = (key: string, height: number) =>
    height > 0 ? (
      <tr key={key} aria-hidden="true" data-slot="table-spacer" style={{ height }}>
        <td colSpan={span} />
      </tr>
    ) : null

  const rowAt = (index: number) => {
    const item = model[index]
    if (!item) return null
    const row = item.original as Row
    const group = isGroupRow?.(row) === true
    const open = rowOpen?.(row)
    const state = selection?.isSelected(row)
    const level = levels[index] ?? 1
    const caret = <Caret open={open} onToggle={() => toggle(row, !open)} label={open ? words.table.fold : words.table.unfold} />
    const mark = selection ? (
      // A press on the check, or near it, leaves the focus on the row, which is the Tab stop (the check is not).
      <TableCell key="select" onClick={(event) => rowOf(event.currentTarget)?.focus()} className={cn('w-0', group && STICKY)}>
        {state === null ? null : (
          <Checkbox tabIndex={-1} checked={check(state)} onCheckedChange={(next) => selection.onSelectedChange(row, next === true)} disabled={selection.isDisabled?.(row) === true} aria-label={selection.label?.(row) ?? words.table.selectRow} />
        )}
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
        aria-posinset={place?.pos[index]}
        aria-setsize={place?.size[index]}
        aria-expanded={tree ? open : undefined}
        // A row of which some are chosen is neither: its check says «mixed», and `aria-selected` has no such value. A row with no check says nothing.
        aria-selected={tree && selection && state !== 'mixed' && state !== null ? state === true : undefined}
        current={current != null && item.id === current}
        tabIndex={navigable ? (item.id === stop ? 0 : -1) : undefined}
        onClick={onRowPress ? (event) => press(event, row) : undefined}
        onFocus={navigable ? (event) => (event.target === event.currentTarget ? setFocused(item.id) : undefined) : undefined}
        onKeyDown={navigable ? (event) => keys(event, row) : undefined}
        className={cn(navigable && 'cursor-default', group && 'font-medium text-ink')}
      >
        {mark}
        {group ? (
          <TableCell colSpan={columns.length} grow className={STICKY}>
            <div className="flex min-w-0 items-center gap-1">
              {caret}
              {groupCell ? groupCell(row) : columns[0]?.cell(row)}
            </div>
          </TableCell>
        ) : (
          columns.map((column, at) => (
            <TableCell key={column.id} align={column.align} grow={column.grow} style={tree && at === 0 ? ({ '--depth': level } as React.CSSProperties) : undefined} className={cn(tree && at === 0 && INDENT, column.className)}>
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
  }

  // The rows in the page, with the room of those that are not: before the first, between two that are not neighbours (the
  // row with the focus, a group's heading) and after the last.
  const lines: React.ReactNode[] = []
  if (drawn) {
    let reach = shelf
    drawn.forEach((item) => {
      lines.push(spacer(`room-${item.index}`, item.start - reach), rowAt(item.index))
      reach = item.end
    })
    lines.push(spacer('room-end', drawn.length > 0 ? virtualizer.getTotalSize() + shelf - reach : 0))
  } else {
    indexes.forEach((index) => lines.push(rowAt(index)))
  }

  return (
    <Table
      containerRef={boxRef}
      // The box keeps a row it scrolls to (focus, a key) clear of the headings that stay in sight, and of a group's.
      containerClassName={cn(groups ? 'scroll-pt-[calc(var(--row-height)*2)]' : 'scroll-pt-(--row-height)', GROUND[surface], fill && 'h-full min-h-0', className)}
      role={tree ? 'treegrid' : undefined}
      aria-rowcount={virtual ? model.length + 1 : undefined}
      onFocus={() => setInside(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInside(false)
      }}
      {...props}
    >
      <TableHeader>
        <tr aria-rowindex={virtual ? 1 : undefined}>
          {selection ? (
            <TableHead key="select" sticky className="w-0">
              {selection.onSelectAll ? (
                <Checkbox checked={check(selection.selectAll ?? false)} onCheckedChange={(next) => selection.onSelectAll?.(next === true)} disabled={selection.selectAllDisabled} aria-label={words.table.selectAll} />
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
        {lines}
      </TableBody>
    </Table>
  )
}

export { DataTable }
