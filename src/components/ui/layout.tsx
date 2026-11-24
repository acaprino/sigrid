// The layout of a screen with no class of the app's own: a pile, a wrapping row, two groups at the two ends of a row, an
// automatic grid, a spacer, a named section, an area that scrolls, the body of a page (or a page of exactly one screen,
// `Page fit`), and the weight of a line of text.
// Every space is a step of the scale (`Space`: xs 4, sm 8, md 12, lg 16, xl 24px). No part takes a class or a style, and
// one passed in spite of the types is dropped: an app that lays out a screen with these writes no class (the owner's
// rule of 2026-11-23: an app has no interface code of its own).
// After Imago's helpers (`im-stack`, `im-cluster`, `im-split`, `im-auto-grid`, `im-spacer`, `im-section`, `im-scroll`,
// `im-page-content`, `im-muted`, `im-caption`, `im-kicker`, `im-readout`). The pile is `Column`: «Stack» names a view
// of an app, which the toolkit does not carry (test/build.test.ts).
// `Column fill` is a pile as tall as the region that holds it, so that one of its parts (a `GraphCanvas fill`, a
// `VirtualList fill`, an `Empty fill`) takes the height the others leave, with no class of the app's.
// `Column width` keeps a pile to the width of a column of text or of content, centred; `Cluster wrap={false}` keeps a
// row on one line (an avatar and its words); `Text` also has the soft ink of running text, the strong words of a line
// and the 13px note beside a title.
import * as React from "react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { AppShellContext } from "./app-shell"

/** A step of the spacing scale: 4, 8, 12, 16 or 24px. */
export type Space = "xs" | "sm" | "md" | "lg" | "xl"
// Whole class names, so that Tailwind finds them in this file.
const GAP: Record<Space, string> = { xs: "gap-1", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6" }
const PAD: Record<Space, string> = { xs: "p-1", sm: "p-2", md: "p-3", lg: "p-4", xl: "p-6" }

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
   * takes the height its other parts leave. Absent: as tall as its parts.
   */
  fill?: boolean | undefined
  children?: React.ReactNode
}

/** A pile of parts, one under the other. */
function Column({ gap = "sm", pad, align = "stretch", as = "div", width, fill = false, children, ...props }: ColumnProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="column" data-fill={fill || undefined} className={cn("flex min-w-0 flex-col", GAP[gap], pad && PAD[pad], ALIGN[align], width && WIDTH[width], fill && "h-full min-h-0 flex-1")}>
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

export type GridProps = LayoutAttributes & {
  /** The narrowest a column may be before the grid takes one column fewer: `sm` 12rem, `md` 17rem (the default), `lg` 24rem. */
  min?: keyof typeof COLUMNS | undefined
  /** The space between the cells (default `md`). */
  gap?: Space | undefined
  /** The element it is: a `div` (the default), or a list, a list item, a section, an aside, a navigation. A list keeps `role="list"`. */
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/** Cells in as many columns as the width holds, each at least `min` wide: tiles and panels that reflow with the window. */
function Grid({ min = "md", gap = "md", as = "div", children, ...props }: GridProps) {
  const Tag = as
  return (
    <Tag role={listRole(as)} {...own(props)} data-slot="grid" className={cn("grid min-w-0", COLUMNS[min], GAP[gap])}>
      {children}
    </Tag>
  )
}

/** The empty room that pushes what follows it to the end of a row. */
function Spacer() {
  return <span aria-hidden="true" data-slot="spacer" className="flex-auto" />
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
  children?: React.ReactNode
}

/** A line of text at the weight it carries: the text around it, muted, a caption or a kicker. */
function Text({ variant = "body", as = "span", pre = false, children, ...props }: TextProps) {
  const Tag = as
  return (
    <Tag {...own(props)} data-slot="text" data-variant={variant} className={cn(TEXT[variant], pre && "break-words whitespace-pre-wrap") || undefined}>
      {children}
    </Tag>
  )
}

export { Cluster, Column, Grid, Page, ScrollArea, Section, Spacer, Split, Text }
