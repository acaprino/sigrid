// The layout of a screen with no class of the app's own: a pile, a wrapping row, two groups at the two ends of a row, an
// automatic grid, a spacer, a part's own place among the others, a named section, an area that scrolls, the body of a
// page (or a page of exactly one screen, `Page fit`), and the weight of a line of text.
// Every space is a step of the scale (`Space`: xs 4, sm 8, md 12, lg 16, xl 24px for a screen that is worked in; 2xl 32,
// 3xl 48, 4xl 64px for a page of a few large parts, such as a welcome). No part takes a class or a style, and
// one passed in spite of the types is dropped: an app that lays out a screen with these writes no class (the owner's
// rule of 2026-11-23: an app has no interface code of its own).
// After Imago's helpers (`im-stack`, `im-cluster`, `im-split`, `im-auto-grid`, `im-spacer`, `im-section`, `im-scroll`,
// `im-page-content`, `im-muted`, `im-caption`, `im-kicker`, `im-readout`). The pile is `Column`: «Stack» names a view
// of an app, which the toolkit does not carry (test/build.test.ts).
// `Column fill` is a pile as tall as the region that holds it, so that one of its parts (a `GraphCanvas fill`, a
// `VirtualList fill`, an `Empty fill`) takes the height the others leave, with no class of the app's. With a canvas in
// it, it is never shorter than what its parts need, so the canvas at its floor covers nothing that follows the pile.
// `Column width` keeps a pile to the width of a column of text or of content, centred; `Cluster wrap={false}` keeps a
// row on one line (an avatar and its words); `Text` also has the soft ink of running text, the strong words of a line
// and the 13px note beside a title; it is cut to one line with its whole as a hint (`truncate`), set in the monospace
// face and selectable (`mono`: a path, an id), in a status colour beside its word (`tone`), or for screen readers only
// (`srOnly`). `TextList` is a list of lines with bullets or numbers.
// `Cell` is one part's own place where the pile, the row or the grid decides for all: it lines up by itself (`align`),
// takes the room the others leave (`grow`), or is two columns wide or a whole row of a `Grid` (`span`).
import * as React from "react"
import { cn } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { AppShellContext } from "../internal/frame"
import type { BadgeTone } from "./badge"

/**
 * A step of the spacing scale: 4, 8, 12, 16 or 24px (`xs` to `xl`) between the parts of a screen that is worked in, and
 * 32, 48 or 64px (`2xl`, `3xl`, `4xl`) between the few large parts of a page that is read once (a welcome, a first
 * run), where the room is what tells them apart. A list, a form or a panel stays within `xl`, and a region with
 * nothing in it yet is an `Empty`, which has its own room.
 */
export type Space = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
// Whole class names, so that Tailwind finds them in this file.
const GAP: Record<Space, string> = { xs: "gap-1", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6", "2xl": "gap-8", "3xl": "gap-12", "4xl": "gap-16" }
const PAD: Record<Space, string> = { xs: "p-1", sm: "p-2", md: "p-3", lg: "p-4", xl: "p-6", "2xl": "p-8", "3xl": "p-12", "4xl": "p-16" }

/** What a part of the layout hands to its element: its id, its role, its `aria-*` and `data-*`; never a class or a style. */
export type LayoutAttributes = Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">
/** The element a pile or a row is: a `div`, or the element its content asks for (a list, a list item, a section, an aside). */
export type LayoutElement = "div" | "section" | "aside" | "nav" | "ul" | "ol" | "li"

/** The attributes passed on, without a class or a style an app passed in spite of the types (from JavaScript, or a cast). */
function own(props: LayoutAttributes): LayoutAttributes {
  const { className: _class, style: _style, ...rest } = props as LayoutAttributes & { className?: unknown; style?: unknown }
  return rest
}

// A list keeps its role: Tailwind takes the bullets away, and some screen readers then stop calling it a list.
const listRole = (as: LayoutElement) => (as === "ul" || as === "ol" ? "list" : undefined)

const ALIGN = { stretch: "items-stretch", start: "items-start", center: "items-center", end: "items-end" } as const
// The widest a pile grows, centred in its place: a column of text (65 characters) or a column of content that reads as
// one (a list with a field over it, a message), 768px.
const WIDTH = { prose: "mx-auto w-full max-w-prose", page: "mx-auto w-full max-w-3xl" } as const
// A pile that fills: the whole height of a region that is a block (`h-full`), what the other parts leave of one that is
// a pile (`flex-1`), and it gives way (`min-h-0`), so a list in it scrolls instead of pushing.
const FILL = "h-full min-h-0 flex-1"
// With a canvas that fills in it, however deep, it gives way only down to what its parts need (`min-h-min`), and the
// region scrolls. With `min-h-0` alone a pile in a pile (or in the body of a `Page fit`) shrinks below the canvas's floor:
// the canvas overflows it and is painted over what follows the pile, which is laid out from the pile's own end, so no
// scrolling uncovers it; and in a block the pile ends before its parts do, so its padding at the foot is lost. `:has`
// reads every depth because each pile around the canvas must hold it.
// Not on every pile that fills, nor beside a part that scrolls by itself: a min-content counts that part whole, so the
// pile would be as tall as the list, and the list would draw every row and never scroll. Such a pile gives way as ever.
const HOLDS_CANVAS =
  "[&:has([data-slot=graph][data-fill]):not(:has([data-slot=virtual-list],[data-slot=scroll-area],[data-slot=content-split],[data-slot=tree],[data-slot=panel]))]:min-h-min"
// A field that is a part of the pile itself keeps its height: a height that is set is one a pile short of room takes from.
const FIELDS_KEEP = "[&>:is([data-slot=input],[data-slot=input-group],[data-slot=select-trigger],[data-slot=date-field])]:shrink-0"
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as const

export type ColumnProps = LayoutAttributes & {
  /** The space between its parts (default `sm`). */
  gap?: Space | undefined
  /** The space inside its edges. Absent: none. */
  pad?: Space | undefined
  /** How its parts sit across it: stretched to its width (the default), or at its start, centre or end. */
  align?: keyof typeof ALIGN | undefined
  /** The element it is: a `div` (the default), or a list, a list item, a section, an aside, a navigation. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  /** The widest it grows, centred in its place: `prose` a column of text (about 65 characters), `page` a column of content that reads as one (768px). Absent: as wide as its place. */
  width?: keyof typeof WIDTH | undefined
  /**
   * As tall as the region that holds it, which gives it its height (the content of the frame, a pane, the body of a
   * `Page fit`, another `Column fill`): a part of it that fills (`GraphCanvas`, `VirtualList`, `Empty`, a `Column`)
   * takes the height its other parts leave. With a `GraphCanvas` that fills in it, it is never shorter than what its
   * parts need: the region scrolls, and the canvas covers nothing that follows. Absent: as tall as its parts.
   */
  fill?: boolean | undefined
  children?: React.ReactNode
}

/** A pile of parts, one under the other. */
function Column({ gap = "sm", pad, align = "stretch", as = "div", width, fill = false, children, ...props }: ColumnProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="column" data-fill={fill || undefined} className={cn("flex min-w-0 flex-col", GAP[gap], pad && PAD[pad], ALIGN[align], width && WIDTH[width], fill && [FILL, HOLDS_CANVAS, FIELDS_KEEP])}>
      {children}
    </Tag>
  )
}

export type ClusterProps = LayoutAttributes & {
  /** The space between its parts, across and down when they wrap (default `sm`). */
  gap?: Space | undefined
  /** The space inside its edges. Absent: none. */
  pad?: Space | undefined
  /** Where the parts gather along the row (default `start`). */
  justify?: keyof typeof JUSTIFY | undefined
  /** How they line up across the row (default `center`). */
  align?: keyof typeof ALIGN | undefined
  /** The element it is: a `div` (the default), or a list, a list item, a section, an aside, a navigation. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  /** False: one line whatever the width (an avatar and the words beside it); a part that can give way (a `Column`, a `Text`) narrows and wraps its own words. Default true. */
  wrap?: boolean | undefined
  children?: React.ReactNode
}

/** A row of parts side by side that wraps to the next line when the room runs out: buttons, fields, chips. */
function Cluster({ gap = "sm", pad, justify = "start", align = "center", as = "div", wrap = true, children, ...props }: ClusterProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="cluster" className={cn("flex min-w-0", wrap ? "flex-wrap" : "flex-nowrap", GAP[gap], pad && PAD[pad], JUSTIFY[justify], ALIGN[align])}>
      {children}
    </Tag>
  )
}

export type SplitProps = LayoutAttributes & {
  /** The space kept between the two groups, and between the lines when they wrap (default `md`). */
  gap?: Space | undefined
  /** The space inside its edges. Absent: none. */
  pad?: Space | undefined
  /** The element it is: a `div` (the default), or a list, a list item, a section, an aside, a navigation. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  /** Two parts: the first at the start of the row, the second at its end (a title and its action). */
  children?: React.ReactNode
}

/** Two groups at the two ends of one row, such as a heading and its action; on a narrow width the second goes under. */
function Split({ gap = "md", pad, as = "div", children, ...props }: SplitProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="split" className={cn("flex min-w-0 flex-wrap items-center justify-between", GAP[gap], pad && PAD[pad])}>
      {children}
    </Tag>
  )
}

// The column tracks are custom properties of theme.css: `repeat(auto-fit, minmax(min(<width>, 100%), 1fr))`.
const COLUMNS = { sm: "grid-cols-(--grid-columns-sm)", md: "grid-cols-(--grid-columns-md)", lg: "grid-cols-(--grid-columns-lg)" } as const
// A cell two columns wide (`Cell span={2}`). A span wider than the grid would make a column of its own and push the
// grid out of its place, so the cell is two columns wide only where the grid has two: the grid measures itself (a
// container, and only when it holds such a cell, so every other grid is as it was) and the cell reads that width. The
// widths are two columns of the grid's minimum and the widest gap of the scale (4rem): with a narrower gap the grid
// has its second column a little before the cell takes it, never after.
const MEASURED = "has-[>[data-span]]:@container"
const SPAN_TWO = {
  sm: "@[28rem]:[&>[data-span='2']]:col-span-2",
  md: "@[38rem]:[&>[data-span='2']]:col-span-2",
  lg: "@[52rem]:[&>[data-span='2']]:col-span-2",
} as const

export type GridProps = LayoutAttributes & {
  /** The narrowest a column may be before the grid takes one column fewer: `sm` 12rem, `md` 17rem (the default), `lg` 24rem. */
  min?: keyof typeof COLUMNS | undefined
  /** The space between the cells (default `md`). */
  gap?: Space | undefined
  /** The element it is: a `div` (the default), or a list, a list item, a section, an aside, a navigation. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/**
 * Cells in as many columns as the width holds, each at least `min` wide: tiles and panels that reflow with the window.
 * Every part is one cell; one that asks for more room than the others (a chart among numbers) is a `Cell` with `span`.
 */
function Grid({ min = "md", gap = "md", as = "div", children, ...props }: GridProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="grid" className={cn("grid min-w-0", COLUMNS[min], GAP[gap], MEASURED, SPAN_TWO[min])}>
      {children}
    </Tag>
  )
}

/** The empty room that pushes what follows it to the end of a row. */
function Spacer() {
  return <span aria-hidden="true" data-slot="spacer" className="flex-auto" />
}

const SELF = { stretch: "self-stretch", start: "self-start", center: "self-center", end: "self-end" } as const
// It takes the room the others leave, along the row or down the pile, and gives way (a long word in it wraps, a list
// in it scrolls) instead of pushing the others out.
const GROW = "min-h-0 flex-1"

export type CellProps = LayoutAttributes & {
  /**
   * How this part alone lines up across its row or pile, whatever the others do: at the start, the centre or the end, or
   * stretched. In a `Cluster` that is up and down (an avatar at the top of a message that runs to four lines); in a
   * `Column`, side to side; in a `Grid`, up and down in its cell. Absent: as the row, the pile or the grid says.
   */
  align?: keyof typeof SELF | undefined
  /**
   * It takes the room the other parts leave: the width in a `Cluster`, the height in a `Column fill`. `Spacer` leaves
   * that room empty; this fills it with a part. With two in one row they share it evenly.
   */
  grow?: boolean | undefined
  /**
   * In a `Grid`: `2`, two columns wide where the grid has two, and one where it has one (a chart among numbers);
   * `"full"`, the whole row at any width (a heading or a note between the rows of cells). Absent: one column.
   */
  span?: 2 | "full" | undefined
  /** The element it is: a `div` (the default), or a list item, a section, an aside, a navigation, a list. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/**
 * One part's own place in a `Cluster`, a `Column` or a `Grid`, where the row, the pile or the grid decides for all
 * its parts: it lines up by itself, takes the room the others leave, or is wider than a column of the grid. A part
 * that sits as the others do needs none.
 */
function Cell({ align, grow = false, span, as = "div", children, ...props }: CellProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="cell" data-span={span} className={cn("min-w-0", align && SELF[align], grow && GROW, span === "full" && "col-span-full")}>
      {children}
    </Tag>
  )
}

// `title` is the heading here, not the HTML attribute of a hint.
export type SectionProps = Omit<LayoutAttributes, "title"> & {
  /** The heading: the name of the section, and of its region for a screen reader. */
  title: React.ReactNode
  /** The level of the heading: 2 (the default) for a part of a page, 3 or 4 for a part inside one. */
  level?: 2 | 3 | 4 | undefined
  /** The icon before the heading (an `Icon`), R6: without one the slot stays, empty, so the headings line up. */
  icon?: React.ReactNode
  /** At the end of the heading's row: an action on the whole section, a count. */
  end?: React.ReactNode
  /** The space under the heading and between the parts (default `sm`). */
  gap?: Space | undefined
  children?: React.ReactNode
}

/** A named part of a page: a heading with its icon, and under it the parts. It is a region named by its heading. */
function Section({ title, level = 2, icon, end, gap = "sm", children, ...props }: SectionProps) {
  const id = React.useId()
  const Heading = `h${level}` as "h2" | "h3" | "h4"
  return (
    <section aria-labelledby={id} {...own(props)} data-slot="section" className={cn("flex min-w-0 flex-col", GAP[gap])}>
      <div data-slot="section-heading" className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" data-slot="section-icon" className="inline-flex size-4 shrink-0 items-center justify-center text-ink-mute [&_svg]:size-4">
          {icon}
        </span>
        <Heading id={id} className={cn("min-w-0 flex-1 truncate font-semibold text-ink", level === 2 ? "text-lg" : "text-base")}>
          {title}
        </Heading>
        {end}
      </div>
      {children}
    </section>
  )
}

export type ScrollAreaProps = LayoutAttributes & {
  /** Its name for a screen reader: an area that scrolls is a stop of the keyboard, so it is named. */
  "aria-label": string
  /** Never taller than about half the window, so a long list does not push the rest of the page away. */
  bounded?: boolean | undefined
  /** The space inside its edges. Absent: none. */
  pad?: Space | undefined
  children?: React.ReactNode
}

/** An area that scrolls by itself: reached with Tab and scrolled with the arrows, as a region named for screen readers. */
function ScrollArea({ bounded = false, pad, children, ...props }: ScrollAreaProps) {
  return (
    <div role="region" tabIndex={0} {...own(props)} data-slot="scroll-area" className={cn("min-h-0 min-w-0 overflow-auto", bounded && "max-h-(--scroll-bounded)", pad && PAD[pad], FOCUS_RING_INSET)}>
      {children}
    </div>
  )
}

export type PageProps = LayoutAttributes & {
  /**
   * One screen and no more (a screen worked through one item at a time: sort, triage, a step). The page is as tall as
   * what the person sees: in an `AppShell` its content, elsewhere `--fit-height` (the visible height less the bottom
   * bar's room). `header` and `footer` keep their height and the body between them is the part that gives way: a large
   * text, a small phone, the keyboard or a phone lying down make the body scroll, never the document, which does not
   * bounce or pull to refresh while the page is shown.
   */
  fit?: boolean | undefined
  /** At the head: the title, a switch, a count. In a `fit` page it never gives way. */
  header?: React.ReactNode
  /** At the foot: the answers, the solid one last (R3). In a `fit` page it never gives way and stays in sight. */
  footer?: React.ReactNode
  children?: React.ReactNode
}

const PAGE = "mx-auto flex w-full max-w-(--content-max) min-w-0 flex-col p-6"

/**
 * The body of a page in the content region: as wide as the content may be (`--content-max`), centred, with its margins
 * and the sections spaced `xl` apart. With `fit`, one screen exactly, the body giving way between its head and its foot.
 * The margins are the same with or without `fit`, so what is at the head stays where it is when a page turns to fit.
 */
function Page({ fit = false, header, footer, children, ...props }: PageProps) {
  const framed = React.useContext(AppShellContext) !== undefined
  if (!fit) {
    return (
      <div {...own(props)} data-slot="page" className={cn(PAGE, "gap-6")}>
        {header}
        {children}
        {footer}
      </div>
    )
  }
  return (
    <div {...own(props)} data-slot="page" data-fit="" className={cn(PAGE, "gap-4", framed ? "h-full" : "h-(--fit-height)")}>
      {header ? (
        <div data-slot="page-header" className="flex shrink-0 flex-col gap-3">
          {header}
        </div>
      ) : null}
      <div data-slot="page-body" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {footer ? (
        <div data-slot="page-footer" className="flex shrink-0 flex-col gap-3">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

const TEXT = {
  body: "",
  soft: "text-ink-soft",
  strong: "font-medium",
  muted: "text-ink-mute",
  note: "text-xs text-ink-mute",
  caption: "text-2xs text-ink-mute",
  kicker: "text-2xs font-medium text-ink-mute",
} as const

export type TextProps = LayoutAttributes & {
  /**
   * `body` (the default) is the text around it; `soft`: running text, the body of a message or a paragraph under a title;
   * `strong`: the words that carry a line (a name, a subject), at medium weight in the colour of the line; `muted`: words of less
   * weight, in the muted ink; `note`: a 13px muted line beside or under a title (a date, an address); `caption`: a small
   * line under a thing; `kicker`: the small label above a title.
   */
  variant?: keyof typeof TEXT | undefined
  /** The element: a `span` (the default), a paragraph or a block. */
  as?: "span" | "p" | "div" | undefined
  /** Keep the text's line breaks and spaces and wrap its long words: the output of a tool, a path, a message as it came. */
  pre?: boolean | undefined
  /**
   * One line, cut with an ellipsis where its place ends (a name, a path in a row): it never widens its row. The whole
   * text is its hint (`title`) when it is plain words; give a `title` for another hint (the path of a file shown by
   * its name) or when it holds parts. It is a block that gives way: in a row beside other parts, in a `Cell grow` or
   * in a `TableCell grow`.
   */
  truncate?: boolean | undefined
  /**
   * A path, an id, a command: the monospace face at 13px (DESIGN.md `code-sm`), and it can be selected and copied
   * wherever it is (in the chrome of a desktop frame too). A long one breaks anywhere instead of widening its place,
   * unless it is cut (`truncate`) or keeps its breaks (`pre`).
   */
  mono?: boolean | undefined
  /**
   * A status in its colour: `success`, `warning`, `danger` (the destructive red) or `info`, the tones of a `Badge`.
   * Always with its word: the text says the status, the colour only repeats it (an `Icon` in it takes the colour, the
   * word stays beside it). In the chosen row of a list or a table, and in a row under the pointer, it takes the row's ink.
   */
  tone?: BadgeTone | undefined
  /** For screen readers only: read where it is in the page, never drawn (the words of a mark that says them by its form, as a dash for «none»). */
  srOnly?: boolean | undefined
  children?: React.ReactNode
}

const TONE: Record<BadgeTone, string> = { success: "text-success", warning: "text-warning", danger: "text-destructive", info: "text-info" }
// On the selection tint the status colours do not all hold 4.5:1 (success under the pointer in seven light themes, run
// 45617020632): in the chosen row and in a row under the pointer (a table's, an `ItemRow`, a `Tree`'s) the word takes
// the row's ink, which is measured there. The word still says the status.
const TONE_ROW = "[:is([aria-current=true],[data-current],[data-slot=table-row]:hover,[data-slot=item-row]:hover,[data-slot=tree-row]:hover)_&]:text-inherit"
// A block that gives way, also where its pile lines its parts up at the start (`max-w-full`).
const TRUNCATE = "block max-w-full min-w-0 truncate"

/** A line of text at the weight it carries: the text around it, muted, a caption or a kicker. */
function Text({ variant = "body", as = "span", pre = false, truncate = false, mono = false, tone, srOnly = false, children, ...props }: TextProps) {
  const Tag = as
  const rest = own(props)
  const whole = truncate && (typeof children === "string" || typeof children === "number") ? String(children) : undefined
  return (
    <Tag
      {...rest}
      title={rest.title ?? whole}
      data-slot="text"
      data-variant={variant}
      data-tone={tone}
      data-selectable={mono ? "" : undefined}
      className={
        cn(
          // Before the variant: a caption or a kicker in the monospace face keeps its own size.
          mono && "font-mono text-xs",
          TEXT[variant],
          tone && [TONE[tone], TONE_ROW],
          pre && "break-words whitespace-pre-wrap",
          truncate ? TRUNCATE : mono && !pre && "break-all",
          srOnly && "sr-only",
        ) || undefined
      }
    >
      {children}
    </Tag>
  )
}

export type TextListProps = LayoutAttributes & {
  /** The lines, in the order they are read. One may be left out with `null` or `false`; with none, nothing is drawn. */
  items: readonly React.ReactNode[]
  /** Numbers in place of bullets: the lines are steps, or their order counts. */
  ordered?: boolean | undefined
}

/**
 * A list of lines of text, each with a bullet, or a number with `ordered`: reasons, questions, steps to read. It takes
 * the size and the ink of the text around it (in a `Text as="div"`, that text's). A list of things to choose or to act
 * on is an `ItemList`; names with their values a `DescriptionList`.
 */
function TextList({ items, ordered = false, ...props }: TextListProps) {
  const lines = items.filter((item) => item !== null && item !== undefined && item !== false && item !== "")
  if (lines.length === 0) return null
  const Tag = ordered ? "ol" : "ul"
  return (
    <Tag {...own(props)} data-slot="text-list" className={cn("min-w-0 space-y-1 ps-5", ordered ? "list-decimal" : "list-disc")}>
      {lines.map((item, at) => (
        <li key={at}>{item}</li>
      ))}
    </Tag>
  )
}

export { Cell, Cluster, Column, Grid, Page, ScrollArea, Section, Spacer, Split, Text, TextList }
