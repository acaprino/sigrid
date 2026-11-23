// The layout of a screen with no class of the app's own: a pile, a wrapping row, two groups at the two ends of a row, an
// automatic grid, a spacer, a named section, an area that scrolls, the body of a page, and the weight of a line of text.
// Every space is a step of the scale (`Space`: xs 4, sm 8, md 12, lg 16, xl 24px). No part takes a class or a style, and
// one passed in spite of the types is dropped: an app that lays out a screen with these writes no class (the owner's
// rule of 2026-11-23: an app has no interface code of its own).
// After Imago's helpers (`im-stack`, `im-cluster`, `im-split`, `im-auto-grid`, `im-spacer`, `im-section`, `im-scroll`,
// `im-page-content`, `im-muted`, `im-caption`, `im-kicker`, `im-readout`), which the pages of Daodan were laid out with.
import * as React from "react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"

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

const ALIGN = { stretch: "items-stretch", start: "items-start", center: "items-center", end: "items-end" } as const
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as const

export type StackProps = LayoutAttributes & {
  /** The space between its parts (default `sm`). */
  gap?: Space | undefined
  /** The space inside its edges. Absent: none. */
  pad?: Space | undefined
  /** How its parts sit across it: stretched to its width (the default), or at its start, centre or end. */
  align?: keyof typeof ALIGN | undefined
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/** A pile of parts, one under the other. */
function Stack({ gap = "sm", pad, align = "stretch", as = "div", children, ...props }: StackProps) {
  const Tag = as
  return (
    <Tag {...own(props)} data-slot="stack" className={cn("flex min-w-0 flex-col", GAP[gap], pad && PAD[pad], ALIGN[align])}>
      {children}
    </Tag>
  )
}

export type ClusterProps = LayoutAttributes & {
  /** The space between its parts, across and down when they wrap (default `sm`). */
  gap?: Space | undefined
  pad?: Space | undefined
  /** Where the parts gather along the row (default `start`). */
  justify?: keyof typeof JUSTIFY | undefined
  /** How they line up across the row (default `center`). */
  align?: keyof typeof ALIGN | undefined
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/** A row of parts side by side that wraps to the next line when the room runs out: buttons, fields, chips. */
function Cluster({ gap = "sm", pad, justify = "start", align = "center", as = "div", children, ...props }: ClusterProps) {
  const Tag = as
  return (
    <Tag {...own(props)} data-slot="cluster" className={cn("flex min-w-0 flex-wrap", GAP[gap], pad && PAD[pad], JUSTIFY[justify], ALIGN[align])}>
      {children}
    </Tag>
  )
}

export type SplitProps = LayoutAttributes & {
  /** The space kept between the two groups, and between the lines when they wrap (default `md`). */
  gap?: Space | undefined
  pad?: Space | undefined
  as?: LayoutElement | undefined
  /** Two parts: the first at the start of the row, the second at its end (a title and its action). */
  children?: React.ReactNode
}

/** Two groups at the two ends of one row, such as a heading and its action; on a narrow width the second goes under. */
function Split({ gap = "md", pad, as = "div", children, ...props }: SplitProps) {
  const Tag = as
  return (
    <Tag {...own(props)} data-slot="split" className={cn("flex min-w-0 flex-wrap items-center justify-between", GAP[gap], pad && PAD[pad])}>
      {children}
    </Tag>
  )
}

// The columns are custom properties of theme.css: `repeat(auto-fit, minmax(min(<width>, 100%), 1fr))`.
const COLUMNS = { sm: "grid-cols-(--grid-min-sm)", md: "grid-cols-(--grid-min-md)", lg: "grid-cols-(--grid-min-lg)" } as const

export type GridProps = LayoutAttributes & {
  /** The narrowest a column may be before the grid takes one column fewer: `sm` 12rem, `md` 17rem (the default), `lg` 24rem. */
  min?: keyof typeof COLUMNS | undefined
  /** The space between the cells (default `md`). */
  gap?: Space | undefined
  as?: LayoutElement | undefined
  children?: React.ReactNode
}

/** Cells in as many columns as the width holds, each at least `min` wide: tiles and panels that reflow with the window. */
function Grid({ min = "md", gap = "md", as = "div", children, ...props }: GridProps) {
  const Tag = as
  return (
    <Tag {...own(props)} data-slot="grid" className={cn("grid min-w-0", COLUMNS[min], GAP[gap])}>
      {children}
    </Tag>
  )
}

/** The empty room that pushes what follows it to the end of a row. */
function Spacer() {
  return <span aria-hidden="true" data-slot="spacer" className="flex-auto" />
}

export type SectionProps = LayoutAttributes & {
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
        <Heading id={id} className={cn("min-w-0 flex-1 truncate font-semibold text-ink", level === 2 ? "text-base" : "text-sm")}>
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
  children?: React.ReactNode
}

/** The body of a page in the content region: as wide as the content may be (`--content-max`), centred, with its margins and the sections spaced `xl` apart. */
function Page({ children, ...props }: PageProps) {
  return (
    <div {...own(props)} data-slot="page" className="mx-auto flex w-full max-w-(--content-max) min-w-0 flex-col gap-6 p-6">
      {children}
    </div>
  )
}

const TEXT = {
  body: "",
  muted: "text-ink-mute",
  caption: "text-2xs text-ink-mute",
  kicker: "text-2xs font-medium text-ink-mute",
} as const

export type TextProps = LayoutAttributes & {
  /** `muted`: words of less weight, in the muted ink; `caption`: a small line under a thing; `kicker`: the small label above a title. `body` (the default) is the text around it. */
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

export { Cluster, Grid, Page, ScrollArea, Section, Spacer, Split, Stack, Text }
