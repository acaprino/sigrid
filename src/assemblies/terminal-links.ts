// Links in terminal text, as pure functions: where a web address is in a line, and where in the cells of a line the
// terminal wrapped over several rows (a path or an address cut by the right edge is still one link, its range running
// from row to row). The terminal part wires them to xterm's link provider; an app that opens more than web addresses
// (a local file, an issue number) gives the part its own `linkFinder` with the same shape and keeps the rest.

/** A link in a line of text: its place (`start` inclusive, `end` exclusive, in characters) and what it opens. */
export interface TerminalLinkMatch {
  readonly start: number
  readonly end: number
  /** What the app is told to open; the text of the link when it is absent. */
  readonly target?: string | undefined
}

/** A terminal cell as the link finder reads it: its text and its 1-based column. */
export interface TerminalCell {
  readonly chars: string
  readonly x: number
}

/** A link as xterm places it: from a cell to a cell, 1-based, rows included. */
export interface TerminalCellLink {
  readonly target: string
  readonly start: { x: number; y: number }
  readonly end: { x: number; y: number }
}

const WEB = /\bhttps?:\/\/[^\s<>"'`]+/gi
const TRAILING = /[.,;:!?]+$/
const BRACKETS = [['(', ')'], ['[', ']'], ['{', '}']] as const

/** An address without the punctuation of the sentence it ends, and without a closing bracket it did not open. */
function trimAddress(candidate: string): string {
  let text = candidate.replace(TRAILING, '')
  for (const [open, close] of BRACKETS) {
    while (text.endsWith(close) && text.split(open).length < text.split(close).length) text = text.slice(0, -1).replace(TRAILING, '')
  }
  return text
}

/** The web addresses (`http://` and `https://`) of a line, in order. The default `linkFinder` of the terminal. */
export function findWebLinks(line: string): TerminalLinkMatch[] {
  const links: TerminalLinkMatch[] = []
  for (const match of line.matchAll(WEB)) {
    const target = trimAddress(match[0])
    const start = match.index ?? 0
    if (target.length > 'https://'.length) links.push({ start, end: start + target.length, target })
  }
  return links
}

/**
 * The links of a line that the terminal wrapped over rows (`rows[0]` is row `firstY`, 1-based), as cell ranges. A link is
 * found in the text of all the rows joined, and each end is put back on the cell its character came from.
 */
export function findLinksInRows(rows: readonly (readonly TerminalCell[])[], firstY: number, find: (line: string) => readonly TerminalLinkMatch[] = findWebLinks): TerminalCellLink[] {
  let text = ''
  const at: { x: number; y: number }[] = []
  rows.forEach((cells, row) => {
    for (const cell of cells) {
      text += cell.chars
      for (let unit = 0; unit < cell.chars.length; unit++) at.push({ x: cell.x, y: firstY + row })
    }
  })
  const found: TerminalCellLink[] = []
  for (const link of find(text)) {
    const start = at[link.start]
    const end = at[link.end - 1]
    if (start && end) found.push({ target: link.target ?? text.slice(link.start, link.end), start, end })
  }
  return found
}
