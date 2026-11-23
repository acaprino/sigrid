// A table: rows of the same things, each with the same facts in columns. These are the parts of its form and nothing
// more: a `<table>` in a box that scrolls, a heading row, rows and cells, drawn with the toolkit's tokens so every
// table of an app reads as the others do.
// - A row is as tall as the density's row (44px with a finger), with a line under it and no other frame (R4).
// - A heading is small muted text (the label size); a column of numbers is set at the end, in tabular figures (R5).
// - The row chosen has the selection tint, stronger text and a short accent bar at its start (R1), as in every list;
//   under the pointer a row takes a share of that tint.
// What a table does (sorting, filtering, choosing columns, drawing only the rows in sight) is not here: `DataTable`
// (the `./table` entry of the package) does the first and the last on TanStack Table, and an app with a table of its
// own drives it with the library it likes and draws it with these parts.
import * as React from "react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"

export type TableProps = React.ComponentProps<"table"> & {
  /** The classes of the box around the table, which scrolls: its height, where the rows are many. */
  containerClassName?: string | undefined
  /** The box around the table, for what has to read its scrolling. */
  containerRef?: React.Ref<HTMLDivElement> | undefined
}

function Table({ className, containerClassName, containerRef, ...props }: TableProps) {
  return (
    <div ref={containerRef} data-slot="table-container" className={cn("relative w-full overflow-auto", containerClassName)}>
      <table data-slot="table" className={cn("w-full border-collapse text-sm text-ink-soft", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

export type TableRowProps = React.ComponentProps<"tr"> & {
  /** This row is the one chosen: the selection tint, stronger text and the accent bar. One for each table (R1). */
  current?: boolean | undefined
}

function TableRow({ className, current, ...props }: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      aria-current={current ? "true" : undefined}
      className={cn(
        "border-b border-line hover:bg-selected/60 hover:text-ink aria-[current=true]:bg-selected aria-[current=true]:font-semibold aria-[current=true]:text-selected-ink",
        // The accent bar is drawn at the start of the row's first cell.
        "aria-[current=true]:[&>td:first-child]:before:absolute aria-[current=true]:[&>td:first-child]:before:top-1/2 aria-[current=true]:[&>td:first-child]:before:left-0 aria-[current=true]:[&>td:first-child]:before:h-4 aria-[current=true]:[&>td:first-child]:before:w-0.75 aria-[current=true]:[&>td:first-child]:before:-translate-y-1/2 aria-[current=true]:[&>td:first-child]:before:rounded-full aria-[current=true]:[&>td:first-child]:before:bg-primary aria-[current=true]:[&>td:first-child]:before:content-['']",
        FOCUS_RING_INSET,
        className,
      )}
      {...props}
    />
  )
}

export type TableCellAlign = "start" | "end"

export type TableHeadProps = Omit<React.ComponentProps<"th">, "align"> & {
  /** `end`: over a column of numbers. */
  align?: TableCellAlign | undefined
  /** The heading stays in sight while the rows scroll under it. */
  sticky?: boolean | undefined
}

function TableHead({ className, align = "start", sticky, scope = "col", ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn("h-(--row-height) border-b border-line px-3 text-2xs font-medium whitespace-nowrap text-ink-mute", align === "end" ? "text-end" : "text-start", sticky && "sticky top-0 z-10 bg-paper", className)}
      {...props}
    />
  )
}

export type TableCellProps = Omit<React.ComponentProps<"td">, "align"> & {
  /** `end`: a number, in tabular figures. */
  align?: TableCellAlign | undefined
}

function TableCell({ className, align = "start", ...props }: TableCellProps) {
  return <td data-slot="table-cell" className={cn("relative h-(--row-height) px-3 py-1.5 align-middle", align === "end" ? "text-end tabular-nums" : "text-start", className)} {...props} />
}

/** The name of the table, for everyone: above it, small and muted. A table can be named with `aria-label` instead. */
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("px-3 py-2 text-start text-2xs text-ink-mute", className)} {...props} />
}

export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow }
