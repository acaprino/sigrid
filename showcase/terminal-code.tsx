// The sections of the gallery for the terminal (`./terminal`: xterm.js) and the code view (`./code`: CodeMirror 6). The
// program the terminal runs is made up here: a few lines of colour and a prompt that answers what is typed.
import * as React from 'react'
import { Button, Cluster, ToggleGroup, ToggleGroupItem } from '../src/primitives'
import { OverviewStrip, Terminal, findWebLinks, textExtent, type OverviewMark, type TerminalBufferView, type TerminalHandle } from '../src/terminal'
import { CodeView, codeLanguageOf, type CodeViewHandle } from '../src/code'
import { Code, Row, Section } from './parts'

const ESC = String.fromCharCode(27)
const sgr = (...codes: number[]) => `${ESC}[${codes.join(';')}m`
const RESET = sgr(0)
const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const PROMPT = `${sgr(1, 32)}sigrid${RESET}:${sgr(1, 34)}~/app${RESET}$ `

/** What the made-up program prints first: the sixteen colours, the weights, a link and a line that is an error. */
const GREETING = [
  `${sgr(1)}Sigrid terminal${RESET}  the colours are the page's tokens`,
  NAMES.map((name, at) => `${sgr(30 + at)}${name.padEnd(8)}${RESET}`).join(' '),
  NAMES.map((name, at) => `${sgr(90 + at)}${name.padEnd(8)}${RESET}`).join(' '),
  `${sgr(1)}bold${RESET} ${sgr(2)}dim${RESET} ${sgr(3)}italic${RESET} ${sgr(4)}underline${RESET} ${sgr(7)}inverse${RESET}`,
  `docs at https://github.com/acaprino/sigrid (a press opens it through the app)`,
  `${sgr(31)}error${RESET}: this line is marked on the strip at the right`,
  '',
].join('\r\n')

/** The lines of output, enough to scroll. */
const OUTPUT = Array.from({ length: 80 }, (_, i) => (i % 17 === 5 ? `${sgr(31)}error${RESET}: step ${i + 1} failed, retrying` : `${sgr(2)}${String(i + 1).padStart(3, '0')}${RESET}  compiled module ${i + 1}${i % 3 === 0 ? ' ' + 'ok'.repeat(i % 7) : ''}`)).join('\r\n')

export function Terminals() {
  const terminal = React.useRef<TerminalHandle>(null)
  const typed = React.useRef('')
  const [size, setSize] = React.useState('')
  const [opened, setOpened] = React.useState('')
  const [buffer, setBuffer] = React.useState<TerminalBufferView | null>(null)
  const [tick, setTick] = React.useState(0)
  const [readOnly, setReadOnly] = React.useState(false)
  const [keys, setKeys] = React.useState('')
  // The program: it greets, and answers a line with the line.
  React.useEffect(() => {
    const first = window.setTimeout(() => terminal.current?.write(`${GREETING}\r\n${OUTPUT}\r\n${PROMPT}`), 50)
    return () => window.clearTimeout(first)
  }, [])
  const answer = (data: string) => {
    for (const char of data) {
      if (char === '\r') {
        const line = typed.current
        typed.current = ''
        terminal.current?.write(`\r\n${line ? `you typed: ${sgr(33)}${line}${RESET}\r\n` : ''}${PROMPT}`)
      } else if (char === '\x7f') {
        if (typed.current) {
          typed.current = typed.current.slice(0, -1)
          terminal.current?.write('\b \b')
        }
      } else if (char >= ' ') {
        typed.current += char
        terminal.current?.write(char)
      }
    }
  }
  const marks = React.useMemo<OverviewMark[]>(() => {
    if (!buffer) return []
    return Array.from({ length: buffer.length }, (_, i) => i).filter((i) => /^error/.test(buffer.line(i))).map((line) => ({ line, tone: 'destructive' as const }))
    // The strip is drawn again when the lines change (`tick`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, tick])
  return (
    <Section
      id="terminal"
      title="Terminal"
      note={
        <>
          A terminal from the entry <Code>@acaprino/sigrid/terminal</Code> (xterm.js, with its fit addon; its own stylesheet comes with the part). The colours are not written anywhere: the ground, the ink, the cursor and the selection are the tokens of the page, the sixteen colours of ANSI are the text steps of the six tints in the scheme the ground says (black and white are the page's own grays), and all of it is read again when the theme, the scheme or the density changes. The font is <Code>--font-mono</Code>. The program is the app's: <Code>ref.write</Code> gives it output, <Code>onData</Code> says what was typed and <Code>onResize</Code> the size of the pseudo-terminal, at the first fit and at every change. The terminal keeps every key for the program and stops it there; the keys named by <Code>appKeys</Code> go on to the app's commands. An address of the text, or a hyperlink the program wrote, opens through <Code>onLinkOpen</Code>. <Code>OverviewStrip</Code> is a scroll bar by another face: the lines in miniature, a frame on the ones in sight, ticks on the lines the app marks.
        </>
      }
    >
      <Row label="a live terminal">
        <div data-sample="terminal" className="flex w-full max-w-4xl flex-col gap-3">
          <Cluster>
            <Button variant="outline" size="sm" onClick={() => terminal.current?.clear()}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => terminal.current?.scrollToBottom()}>
              To the end
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpened(terminal.current?.getSelection() || 'nothing is selected')}>
              Read the selection
            </Button>
            <ToggleGroup aria-label="Input" value={readOnly ? 'read' : 'type'} onValueChange={(value) => setReadOnly(value === 'read')}>
              <ToggleGroupItem value="type">Type</ToggleGroupItem>
              <ToggleGroupItem value="read">Read only</ToggleGroupItem>
            </ToggleGroup>
          </Cluster>
          <div className="flex h-96 gap-1 rounded-md bg-paper">
            <Terminal
              ref={terminal}
              aria-label="Shell of the app"
              className="min-w-0 flex-1"
              readOnly={readOnly}
              onData={answer}
              onResize={(cols, rows) => setSize(`${cols} × ${rows}`)}
              onLinkOpen={(target) => setOpened(target)}
              appKeys={(event) => (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'k'}
              onBufferChange={(view) => {
                setBuffer(view)
                setTick((n) => n + 1)
                setKeys(`${view.viewportY + 1}–${view.viewportY + view.rows} of ${view.length}`)
              }}
            />
            {buffer ? (
              <OverviewStrip
                count={buffer.length}
                extent={(index) => textExtent(buffer.line(index))}
                viewport={{ start: buffer.viewportY, size: buffer.rows }}
                columns={Math.min(buffer.cols, 80)}
                marks={marks}
                revision={tick}
                onSeek={(line) => terminal.current?.scrollToLine(line)}
                className="my-1"
              />
            ) : null}
          </div>
          <p data-sample="terminal-state" className="text-xs text-ink-mute">
            Size: {size || '…'} · Lines in sight: {keys || '…'} · Last link or selection: {opened || 'none'}. Ctrl+Shift+K is the app's: the terminal leaves it alone. The address in the first lines is found by <Code>findWebLinks</Code>: {JSON.stringify(findWebLinks('docs at https://github.com/acaprino/sigrid (a press opens it)').map((link) => link.target))}.
          </p>
        </div>
      </Row>
    </Section>
  )
}

const TS = `import { readFileSync } from 'node:fs'

type Entry = { name: string; size: number }

/** The biggest entries of a folder listing. */
export function biggest(entries: Entry[], count = 3): Entry[] {
  return [...entries].sort((a, b) => b.size - a.size).slice(0, count)
}

const listing: Entry[] = JSON.parse(readFileSync('listing.json', 'utf8'))
console.log(biggest(listing).map((entry) => \`\${entry.name}: \${entry.size}\`).join('\\n'))
`
const RS = `use std::collections::HashMap;

/// Counts the words of a text.
fn count(text: &str) -> HashMap<&str, usize> {
    let mut seen = HashMap::new();
    for word in text.split_whitespace() {
        *seen.entry(word).or_insert(0) += 1;
    }
    seen
}

fn main() {
    let words = count("one two two three three three");
    println!("{:?}", words.get("three")); // Some(3)
}
`
const PY = `from dataclasses import dataclass

@dataclass
class Entry:
    name: str
    size: int

def biggest(entries: list[Entry], count: int = 3) -> list[Entry]:
    """The biggest entries of a listing."""
    return sorted(entries, key=lambda e: e.size, reverse=True)[:count]
`
const MD = `# Notes

A line of prose wraps at the width of the view, however long it grows, because prose is read and not scanned; code keeps its lines and scrolls.

- A list
- With **strong** words and a [link](https://example.com)

\`\`\`json
{ "a": [1, 2, 3] }
\`\`\`
`
const CSS = `.panel {
  display: grid;
  gap: var(--pad-sm);
  color: var(--color-ink);
}
`

const FILES = [
  { id: 'listing.ts', text: TS },
  { id: 'count.rs', text: RS },
  { id: 'entries.py', text: PY },
  { id: 'NOTES.md', text: MD },
  { id: 'panel.css', text: CSS },
] as const

export function CodeViews() {
  const [file, setFile] = React.useState<(typeof FILES)[number]['id']>('listing.ts')
  const [texts, setTexts] = React.useState<Record<string, string>>(() => Object.fromEntries(FILES.map((f) => [f.id, f.text])))
  const [edits, setEdits] = React.useState(0)
  const view = React.useRef<CodeViewHandle>(null)
  const [lines, setLines] = React.useState(true)
  const language = codeLanguageOf(file)
  return (
    <Section
      id="code"
      title="CodeView"
      note={
        <>
          A view for code, read-only or editable, from the entry <Code>@acaprino/sigrid/code</Code> (CodeMirror 6). Its theme is made from the page's tokens: the ink and the ground, the selection, the accent for the caret and for functions, and the status colours for the syntax (info for keywords, success for strings, warning for numbers, destructive for what is wrong, the muted ink for comments); it is made again when the scheme or the theme changes. The font is <Code>--font-mono</Code> at the size of code. The language comes from <Code>fileName</Code> and is loaded when a file of it is shown (CSS, HTML, JavaScript and TypeScript with their tags, JSON, Markdown, Python, Rust); prose wraps and code scrolls. Each file keeps its own undo steps and selection while it is away (<Code>docId</Code>). Tab moves the focus on unless <Code>tabIndents</Code> is set. Read-only is still selectable and searchable (Ctrl F).
        </>
      }
    >
      <Row label="editable, by file">
        <div data-sample="code" className="flex w-full max-w-4xl flex-col gap-3">
          <Cluster>
            <ToggleGroup aria-label="File" value={file} onValueChange={setFile}>
              {FILES.map((f) => (
                <ToggleGroupItem key={f.id} value={f.id}>
                  {f.id}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup aria-label="Line numbers" value={lines ? 'on' : 'off'} onValueChange={(value) => setLines(value === 'on')}>
              <ToggleGroupItem value="on">Line numbers</ToggleGroupItem>
              <ToggleGroupItem value="off">None</ToggleGroupItem>
            </ToggleGroup>
          </Cluster>
          <div className="h-80 rounded-md border border-line">
            <CodeView ref={view} className="h-full" fileName={file} value={texts[file] ?? ''} lineNumbers={lines} aria-label={`Source of ${file}`} onChange={(next) => { setTexts((now) => ({ ...now, [file]: next })); setEdits((n) => n + 1) }} />
          </div>
          <p data-sample="code-state" className="text-xs text-ink-mute">
            {language ? language.label : 'Plain text'} · {edits} {edits === 1 ? 'change' : 'changes'} · switch file and back: the undo steps of each stay.
          </p>
        </div>
      </Row>
      <Row label="read only">
        <div className="h-48 w-full max-w-4xl rounded-md border border-line">
          <CodeView className="h-full" fileName="count.rs" value={RS} readOnly aria-label="Count, a file that cannot be changed" />
        </div>
      </Row>
      <Row label="the same text, wrapped">
        <div className="flex w-full max-w-4xl flex-col gap-2">
          <p className="text-xs text-ink-mute">Long lines wrap at the width of the view when asked for: <Code>wrap</Code>.</p>
          <div className="h-32 rounded-md border border-line">
            <CodeView className="h-full" fileName="NOTES.md" value={MD} readOnly wrap aria-label="Notes, wrapped" />
          </div>
        </div>
      </Row>
    </Section>
  )
}
