// The `./terminal` entry of the package: a terminal (xterm.js, in the toolkit's colours and font) and the strip that shows
// its lines in miniature. It is apart from the entry of the assemblies because it brings xterm with it: an app without a
// terminal does not load it. xterm's own stylesheet is put in the page by the part; the app imports no CSS.
export { Terminal, type TerminalBufferView, type TerminalHandle, type TerminalProps, type TerminalSize } from './assemblies/Terminal'
export { terminalLook, type TerminalLook } from './assemblies/terminal-theme'
export { findLinksInRows, findWebLinks, type TerminalCell, type TerminalCellLink, type TerminalLinkMatch } from './assemblies/terminal-links'
export {
  OVERVIEW_COLUMNS,
  OVERVIEW_PITCH,
  OverviewStrip,
  archivedLineAt,
  holdAt,
  lineAt,
  overviewGeometry,
  textExtent,
  type OverviewExtent,
  type OverviewGeometry,
  type OverviewMark,
  type OverviewStripProps,
  type OverviewTone,
} from './assemblies/OverviewStrip'
