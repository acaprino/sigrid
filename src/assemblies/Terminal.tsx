// A terminal: xterm.js on the toolkit's look. The emulation is xterm's (`@xterm/xterm` with its fit addon: npm
// dependencies, pinned, see THIRD_PARTY.md); the look is the toolkit's: the colours of the ground, the ink, the cursor,
// the selection and the sixteen ANSI colours are made from the tokens as they resolve in the page (`terminalLook`),
// read again whenever the page's look changes (a theme, a scheme, a density), and the font is `--font-mono`, after the
// families the app asks for (`fontFamily`), if any: the cells are measured again when the font changes and when a face that was not ready is. xterm's own
// stylesheet is put in the page by the part, so an app imports none. It has its own entry of the package
// (`./terminal`), with the strip that shows its lines in miniature: an app without a terminal does not load xterm.
// - The program is the app's: the part writes what it is given (`ref.write`) and says what the person typed (`onData`)
//   and how big the terminal is (`onResize`, at the first size and at every change: the size of the pseudo-terminal).
// - It fills the box it is in, as tall and as wide (a terminal has no height of its own): in a pane of a `Workspace`, in a `Cluster fill`
//   beside its `OverviewStrip`, or in a box the app gives a size. It fits that box by itself (a `ResizeObserver` and the fit addon);
//   `ref.fit()` does it at once.
// - Keys. The terminal keeps every key that can go to the program, and stops it at itself (not even the screen reader's
//   view lets one through to the page's commands). The keys the app keeps for its own commands are named by `appKeys`:
//   for those the terminal leaves the key alone and does not stop it, so it reaches the document and the app's commands
//   (`CommandsProvider`) run. Do not put the terminal's place in `ownKeysIn` for that: `ownKeysIn` silences the app's
//   commands there, the keys of `appKeys` too. Paste (Ctrl or Command V, Shift Insert) is always left to the browser,
//   so the text arrives as a paste and not as a key.
// - Links: an address of the text, or a hyperlink the program wrote (OSC 8), opens through `onLinkOpen`: the app
//   decides what it opens. `linkFinder` says what in a line is a link (web addresses by default).
// - xterm's stylesheet paints its viewport black, outside the part's own colours: the part makes it clear, so the ground
//   of the terminal is the page's `paper` (or what is behind it, with `transparent`) all the way to the edge.
// - The screen reader's view of the screen is on (`screenReaderMode`), the part is named by `aria-label`.
import * as React from 'react'
import { Terminal as XTerm, type IBufferRange, type IDisposable, type ILink } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import xtermCss from '@xterm/xterm/css/xterm.css?inline'
import { ensureStyle, watchLook } from '../internal/look'
import { cn } from '../lib/utils'
import type { TonePreset } from '../theme-engine'
import { useWords } from '../words'
import { findLinksInRows, findWebLinks, type TerminalCell, type TerminalLinkMatch } from './terminal-links'
import { terminalLook } from './terminal-theme'

/** How many rows and columns the terminal has. */
export type TerminalSize = { cols: number; rows: number }

/** What the app can read of the lines of the terminal (the screen and what scrolled off it): live, never a copy. */
export interface TerminalBufferView {
  /** How many lines there are: the scrollback and the screen. */
  readonly length: number
  /** The first line in sight. */
  readonly viewportY: number
  /** How many lines are in sight. */
  readonly rows: number
  readonly cols: number
  /** The text of a line, without the blanks at its end; empty for a line that is not there. */
  line(index: number): string
}

/** What the app can do to the terminal, through its `ref`. */
export type TerminalHandle = {
  /** Writes what the program printed; `done` is called when it has been parsed. */
  write(data: string | Uint8Array, done?: () => void): void
  focus(): void
  blur(): void
  /** Fits the terminal to its box now, and gives the size it has (null while the box has none, as when it is hidden). */
  fit(): TerminalSize | null
  /** Clears the lines that scrolled off the screen and the screen but for its last line. */
  clear(): void
  /** Puts the terminal back as it was new: empty, with the cursor at the top. */
  reset(): void
  scrollToBottom(): void
  /** Scrolls so that line `line` is the first in sight. */
  scrollToLine(line: number): void
  scrollLines(amount: number): void
  /** The text the person selected, empty when nothing is. */
  getSelection(): string
  /** Selects `length` cells of a line, from `column`; the line is a place of the buffer, as `scrollToLine` takes it. */
  select(column: number, line: number, length: number): void
  clearSelection(): void
  /** Types text in as a paste (bracketed, if the program asked for it). */
  paste(text: string): void
  readonly size: TerminalSize
  /** The lines, for what is drawn from them (`OverviewStrip`, a search). */
  readonly buffer: TerminalBufferView
  /** xterm's own terminal, for what the toolkit does not cover; null before the part is in the page. */
  readonly terminal: XTerm | null
}

export type TerminalProps = {
  ref?: React.Ref<TerminalHandle> | undefined
  /** The name of the terminal for screen readers; «Terminal» by default (`words.terminal.label`). */
  'aria-label'?: string | undefined
  /** What the person typed or pasted, as the program should receive it. */
  onData?: ((data: string) => void) | undefined
  /** The size, at the first fit and at every change: the size the pseudo-terminal should be given. */
  onResize?: ((cols: number, rows: number) => void) | undefined
  /** A link was pressed: its target (the address, or what the program wrote as a hyperlink) and the press. */
  onLinkOpen?: ((target: string, event: MouseEvent) => void) | undefined
  /** The pointer is over a link (its target) or left it (null): where the app shows what the link really opens. */
  onLinkHover?: ((target: string | null) => void) | undefined
  /** Where the links are in a line of text; web addresses (`findWebLinks`) by default. */
  linkFinder?: ((line: string) => readonly TerminalLinkMatch[]) | undefined
  /** The lines changed: output was parsed, the view scrolled or the terminal was resized. For what follows them (`OverviewStrip`). */
  onBufferChange?: ((buffer: TerminalBufferView) => void) | undefined
  /** The keys the app keeps for its own commands: for these the terminal does nothing and does not stop the key. */
  appKeys?: ((event: KeyboardEvent) => boolean) | undefined
  /**
   * The font, as a list of font families of CSS (`"Cascadia Mono", Consolas`): it goes before the toolkit's monospace
   * stack (`--font-mono`), which stays as what is drawn when the machine has none of the names. Absent or empty: the
   * toolkit's stack alone. It can change while the terminal lives: the cells are measured again and the terminal fits its box again (`onResize`).
   */
  fontFamily?: string | undefined
  /** The size of the text in pixels; the toolkit's size of code (`--text-xs`) by default. */
  fontSize?: number | undefined
  /** The height of a row, in times the size of the text. */
  lineHeight?: number | undefined
  /** The lines kept above the screen. */
  scrollback?: number | undefined
  /** The shape of the cursor. */
  cursorStyle?: 'block' | 'underline' | 'bar' | undefined
  /** The terminal shows output and takes no input: no keys, no cursor. */
  readOnly?: boolean | undefined
  /** The ground is clear, so what is behind the terminal (a glass window) shows through. */
  transparent?: boolean | undefined
  /** The tone of the colours of ANSI; Vivid, the toolkit's own, by default. */
  tone?: TonePreset | undefined
  /** The view of the screen for screen readers; on by default. */
  screenReaderMode?: boolean | undefined
  /** Takes the keyboard when it is drawn. */
  autoFocus?: boolean | undefined
  className?: string | undefined
}

/** The keys that are a paste: left to the browser, which sends the text as a paste event, never as a key. */
function isPasteKey(event: KeyboardEvent): boolean {
  if (event.type !== 'keydown' || event.altKey) return false
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') return true
  return event.shiftKey && !event.ctrlKey && event.key === 'Insert'
}

/** The longest wrapped line the link finder reads, in rows: a line cut by the edge many times is not an address. */
const WRAP_ROWS = 16

const STYLE_ID = 'sigrid-xterm'

function bufferView(term: XTerm | null): TerminalBufferView {
  return {
    get length() { return term?.buffer.active.length ?? 0 },
    get viewportY() { return term?.buffer.active.viewportY ?? 0 },
    get rows() { return term?.rows ?? 0 },
    get cols() { return term?.cols ?? 0 },
    line: (index) => term?.buffer.active.getLine(index)?.translateToString(true) ?? '',
  }
}

/** The rows of the line that the one at `y` (1-based) is part of, as cells: a line wrapped by the edge is read whole. */
function wrappedRows(term: XTerm, y: number): { first: number; rows: TerminalCell[][] } {
  const buffer = term.buffer.active
  const blank = buffer.getNullCell()
  let first = y - 1
  while (first > 0 && y - 1 - first < WRAP_ROWS && buffer.getLine(first)?.isWrapped) first--
  let last = y - 1
  while (last - (y - 1) < WRAP_ROWS && buffer.getLine(last + 1)?.isWrapped) last++
  const rows: TerminalCell[][] = []
  for (let row = first; row <= last; row++) {
    const line = buffer.getLine(row)
    const cells: TerminalCell[] = []
    if (line) {
      for (let x = 0; x < line.length; x++) {
        const cell = line.getCell(x, blank)
        // The second half of a wide character has no text of its own.
        if (!cell || cell.getWidth() === 0) continue
        cells.push({ chars: cell.getChars() || ' ', x: x + 1 })
      }
    }
    rows.push(cells)
  }
  return { first, rows }
}

function Terminal({ ref, 'aria-label': ariaLabel, onData, onResize, onLinkOpen, onLinkHover, linkFinder, onBufferChange, appKeys, fontFamily, fontSize, lineHeight = 1.15, scrollback = 5000, cursorStyle = 'block', readOnly = false, transparent = false, tone, screenReaderMode = true, autoFocus = false, className }: TerminalProps) {
  const words = useWords().terminal
  const label = ariaLabel ?? words.label
  const box = React.useRef<HTMLDivElement>(null)
  const term = React.useRef<XTerm | null>(null)
  const fitter = React.useRef<FitAddon | null>(null)
  const reported = React.useRef('')
  // The app's callbacks, read when they are needed: a new function at every paint does not set the terminal up again.
  const latest = React.useRef({ onData, onResize, onLinkOpen, onLinkHover, linkFinder, onBufferChange, appKeys })
  latest.current = { onData, onResize, onLinkOpen, onLinkHover, linkFinder, onBufferChange, appKeys }
  // What is set when the terminal is made, and again when it changes.
  const options = { fontFamily, fontSize, lineHeight, scrollback, cursorStyle, readOnly, transparent, tone, screenReaderMode }
  const wanted = React.useRef(options)
  wanted.current = options

  /** Fits the box and says the size when it is not the one last said. */
  const fit = React.useCallback((): TerminalSize | null => {
    const x = term.current
    const screen = box.current
    if (!x || !fitter.current || !screen || screen.clientWidth === 0 || screen.clientHeight === 0) return null
    try { fitter.current.fit() } catch { return null }
    const size = { cols: x.cols, rows: x.rows }
    const key = `${size.cols}x${size.rows}`
    if (key !== reported.current) {
      reported.current = key
      latest.current.onResize?.(size.cols, size.rows)
    }
    return size
  }, [])

  /**
   * The font is set, and the cells measured again once its faces are ready: a face the browser has not loaded yet (a
   * font of the page, fetched when it is first used) is measured as the font after it in the list, which would leave
   * the grid of another font under the glyphs. A font of the machine is ready at once, and nothing is waited for.
   */
  const setFont = React.useCallback((family: string) => {
    const x = term.current
    if (!x) return
    x.options.fontFamily = family
    const fonts = box.current?.ownerDocument.fonts
    if (!fonts || typeof fonts.check !== 'function' || typeof fonts.load !== 'function') return
    const font = `${x.options.fontSize ?? 13}px ${family}`
    try {
      if (fonts.check(font)) return
      void fonts.load(font).then(
        () => {
          const now = term.current
          // Another terminal, or another font since: that one has its own wait.
          if (now !== x || now.options.fontFamily !== family) return
          // xterm measures when the option changes, and has no call that measures the same font again.
          now.options.fontFamily = 'monospace'
          now.options.fontFamily = family
          fit()
        },
        () => {},
      )
    } catch {
      // A list the browser cannot read as a font: it draws what it can of it, and there is nothing to wait for.
    }
  }, [fit])

  React.useImperativeHandle(
    ref,
    (): TerminalHandle => ({
      write: (data, done) => term.current?.write(data, done),
      focus: () => term.current?.focus(),
      blur: () => term.current?.blur(),
      fit,
      clear: () => term.current?.clear(),
      reset: () => term.current?.reset(),
      scrollToBottom: () => term.current?.scrollToBottom(),
      scrollToLine: (line) => term.current?.scrollToLine(line),
      scrollLines: (amount) => term.current?.scrollLines(amount),
      getSelection: () => term.current?.getSelection() ?? '',
      select: (column, line, length) => term.current?.select(column, line, length),
      clearSelection: () => term.current?.clearSelection(),
      paste: (text) => term.current?.paste(text),
      get size() { return { cols: term.current?.cols ?? 0, rows: term.current?.rows ?? 0 } },
      get buffer() { return bufferView(term.current) },
      get terminal() { return term.current },
    }),
    [fit],
  )

  // The terminal itself, made once for the box it is in.
  React.useLayoutEffect(() => {
    const host = box.current
    if (!host) return
    const doc = host.ownerDocument
    ensureStyle(doc, STYLE_ID, xtermCss)
    const o = wanted.current
    const look = terminalLook(host, { tone: o.tone, transparent: o.transparent, quietCursor: o.readOnly, fontFamily: o.fontFamily })
    const x = new XTerm({
      theme: look.theme,
      fontFamily: look.fontFamily,
      fontSize: o.fontSize ?? look.fontSize,
      lineHeight: o.lineHeight,
      scrollback: o.scrollback,
      cursorStyle: o.cursorStyle,
      cursorBlink: false,
      cursorInactiveStyle: o.readOnly ? 'none' : 'outline',
      disableStdin: o.readOnly,
      allowTransparency: o.transparent,
      screenReaderMode: o.screenReaderMode,
      allowProposedApi: false,
      // Links the program wrote (OSC 8) go to the app, whatever their scheme: the app decides what it opens.
      linkHandler: {
        allowNonHttpProtocols: true,
        activate: (event, text) => { if (event.button === 0) latest.current.onLinkOpen?.(text, event) },
        hover: (_event, text) => latest.current.onLinkHover?.(text),
        leave: () => latest.current.onLinkHover?.(null),
      },
    })
    const fitAddon = new FitAddon()
    x.loadAddon(fitAddon)
    term.current = x
    fitter.current = fitAddon
    reported.current = ''
    x.open(host)
    x.textarea?.setAttribute('aria-label', label)
    x.attachCustomKeyEventHandler((event) => {
      if (isPasteKey(event) || latest.current.appKeys?.(event)) return false
      // The terminal's key: with the screen reader's view on, xterm lets a key it has sent on to the page, where the
      // app's commands would take it for theirs. It stops here.
      event.stopPropagation()
      return true
    })
    const links = x.registerLinkProvider({
      provideLinks(y, callback) {
        if (!latest.current.onLinkOpen) return callback(undefined)
        const { first, rows } = wrappedRows(x, y)
        const found = findLinksInRows(rows, first + 1, latest.current.linkFinder ?? findWebLinks)
          .filter((link) => link.start.y <= y && link.end.y >= y)
          .map<ILink>((link) => ({
            text: link.target,
            range: { start: link.start, end: link.end } satisfies IBufferRange,
            decorations: { pointerCursor: true, underline: true },
            activate: (event, text) => { if (event.button === 0) latest.current.onLinkOpen?.(text, event) },
            hover: (_event, text) => latest.current.onLinkHover?.(text),
            leave: () => latest.current.onLinkHover?.(null),
          }))
        callback(found.length ? found : undefined)
      },
    })
    const changed = () => latest.current.onBufferChange?.(bufferView(x))
    const subscriptions: IDisposable[] = [
      x.onData((data) => latest.current.onData?.(data)),
      x.onResize(() => {
        const key = `${x.cols}x${x.rows}`
        if (key !== reported.current) {
          reported.current = key
          latest.current.onResize?.(x.cols, x.rows)
        }
        changed()
      }),
      x.onScroll(changed),
      x.onWriteParsed(changed),
      x.buffer.onBufferChange(changed),
      links,
    ]
    // The first size, and every change of the box after it, once per frame.
    const view = doc.defaultView
    let frame = 0
    const soon = () => {
      if (frame || !view) return
      frame = view.requestAnimationFrame(() => {
        frame = 0
        fit()
      })
    }
    const observer = new ResizeObserver(soon)
    observer.observe(host)
    fit()
    setFont(look.fontFamily)
    // The page's look changed (a theme, a scheme, a density): the colours and the font are read again.
    const stopWatching = watchLook(doc, () => {
      const next = terminalLook(host, { tone: wanted.current.tone, transparent: wanted.current.transparent, quietCursor: wanted.current.readOnly, fontFamily: wanted.current.fontFamily })
      x.options.theme = next.theme
      if (wanted.current.fontSize === undefined) x.options.fontSize = next.fontSize
      setFont(next.fontFamily)
      soon()
    })
    if (autoFocus) x.focus()
    return () => {
      stopWatching()
      observer.disconnect()
      if (frame) view?.cancelAnimationFrame(frame)
      for (const subscription of subscriptions) subscription.dispose()
      x.dispose()
      term.current = null
      fitter.current = null
    }
    // The terminal is made once; what can change is set below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // What can change while the terminal lives.
  React.useEffect(() => {
    const x = term.current
    const host = box.current
    if (!x || !host) return
    const look = terminalLook(host, { tone, transparent, quietCursor: readOnly, fontFamily })
    x.options.theme = look.theme
    x.options.fontSize = fontSize ?? look.fontSize
    if (x.options.fontFamily !== look.fontFamily) setFont(look.fontFamily)
    x.options.lineHeight = lineHeight
    x.options.scrollback = scrollback
    x.options.cursorStyle = cursorStyle
    x.options.cursorInactiveStyle = readOnly ? 'none' : 'outline'
    x.options.disableStdin = readOnly
    x.options.allowTransparency = transparent
    x.options.screenReaderMode = screenReaderMode
    x.textarea?.setAttribute('aria-label', label)
    fit()
  }, [fontFamily, fontSize, lineHeight, scrollback, cursorStyle, readOnly, transparent, tone, screenReaderMode, label, fit, setFont])

  return (
    <div data-slot="terminal" data-readonly={readOnly ? '' : undefined} className={cn('relative size-full min-h-0 min-w-0', transparent ? '' : 'bg-paper', className)}>
      <div ref={box} data-slot="terminal-screen" className="absolute inset-0 overflow-hidden [&_.xterm]:h-full [&_.xterm]:ps-2 [&_.xterm]:pt-1 [&_.xterm-viewport]:bg-transparent!" />
    </div>
  )
}

export { Terminal }
