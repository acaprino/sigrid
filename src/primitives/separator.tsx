// A hairline between two groups of a page or a panel, in the divider's colour: what tells two groups apart where the
// space between them is not enough («Lines and space, not boxes», docs/design-laws.md). It is a horizontal rule, read
// by screen readers as a separator, and takes no room of its own: the pile around it spaces it. The separators of a
// bar and of a menu are their own (`ToolbarSeparator`, `DropdownMenuSeparator`).
export type SeparatorProps = {
  /** Only a drawing (between two groups that are already told apart for a screen reader): hidden from screen readers. */
  decorative?: boolean | undefined
}

/** A line across its place, between two groups. */
function Separator({ decorative = false }: SeparatorProps) {
  return <hr data-slot="separator" aria-hidden={decorative || undefined} className="m-0 w-full shrink-0 border-0 border-t border-line" />
}

export { Separator }
