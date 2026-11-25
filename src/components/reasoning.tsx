// What an assistant did on the way to its answer, kept behind a row each so the answer stays the thing to read:
// `Reasoning`, what it thought, and `ToolCall`, a tool it used. Both are the toolkit's row that opens in place
// (`Disclosure`): the same row, the same arrow, the same panel.
// `Reasoning` is open while it is being written (`busy`) and closes by itself when it is done, unless the reader
// opened or closed it: the reader's choice stays. Its row says «Thinking», then «Thought for 4 s». Its text is set
// apart as a quote is: the soft ink behind a line at its start.
// `ToolCall` says the tool's name and its state three ways, never by colour alone: an icon (a clock while it waits,
// the bolt while it runs, a check, the circle with an X of a failure), its colour, and a word for screen readers. It
// opens only when there is something to show: what the tool was given and what it gave back, as written, in the
// monospace of code; a long one scrolls in its block, which the keyboard reaches.
// Nothing loops: no shimmer and no spinner. A state changes once, when the app says so.
import * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { Icon, type IconName } from "../icons"
import { useWords } from "../words"
import { MarkdownBlocks } from "./markdown-blocks"
import { DISCLOSURE_ROW, DISCLOSURE_SLOT, Disclosure } from "./disclosure"

export type ReasoningProps = {
  /** It is being written: the row says so, and it is open unless the reader closed it. */
  busy?: boolean | undefined
  /** How long it took, in seconds, said by the row once it is done («Thought for 4 s»). */
  seconds?: number | undefined
  /** Open or closed, when the app keeps it. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  /** The arrow turns when the reader opens or closes the row. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
  /** The reasoning: a string is read as Markdown. */
  children?: React.ReactNode
}

/** The reasoning behind an answer, behind a row: open while it is written, closed once done. */
function Reasoning({ busy = false, seconds, open, onOpenChange, animated, className, children }: ReasoningProps) {
  const words = useWords().chat
  // The reader's own choice, once made; until then it follows `busy`.
  const [chosen, setChosen] = React.useState<boolean | null>(null)
  return (
    <div data-slot="reasoning" data-busy={busy ? "" : undefined} className={cn("min-w-0", className)}>
      <Disclosure
        label={busy ? words.thinking : words.thought(seconds)}
        open={open ?? chosen ?? busy}
        onOpenChange={(next) => {
          setChosen(next)
          onOpenChange?.(next)
        }}
        animated={animated}
      >
        <div data-slot="reasoning-text" className="border-s-2 border-line ps-3 text-sm text-ink-soft">
          {typeof children === "string" ? <MarkdownBlocks text={children} /> : children}
        </div>
      </Disclosure>
    </div>
  )
}

/** Where a tool's call is: not started, under way, ended well, failed. */
export type ToolCallStatus = "pending" | "running" | "success" | "error"

export type ToolCallProps = {
  /** The tool's name, as the app calls it («Search the web», `read_file`). */
  name: string
  /** Where the call is. `success` by default. A value outside the four (from data) is `pending`. */
  status?: ToolCallStatus | undefined
  /** A few words on what it did, after the name («3 results», the file's path): muted, cut when the row is short. */
  summary?: React.ReactNode
  /** What the tool was given. A string (JSON, a command) is shown as written, in a block that wraps. */
  input?: React.ReactNode
  /** What it gave back, or why it failed. A string is shown as written. */
  output?: React.ReactNode
  /** Open at first. Default closed. */
  defaultOpen?: boolean | undefined
  /** The arrow turns when the reader opens or closes the row. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
}

const STATES: Record<ToolCallStatus, { icon: IconName; mark: string; word: "toolPending" | "toolRunning" | "toolSuccess" | "toolError" }> = {
  pending: { icon: "clock", mark: "text-ink-mute", word: "toolPending" },
  running: { icon: "now", mark: "text-ink-soft", word: "toolRunning" },
  success: { icon: "check", mark: "text-success", word: "toolSuccess" },
  error: { icon: "error", mark: "text-destructive", word: "toolError" },
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-slot="tool-call-block" className="flex min-w-0 flex-col gap-1">
      <span data-slot="tool-call-block-title" className="text-2xs font-medium text-ink-mute">
        {title}
      </span>
      {typeof children === "string" ? (
        // It scrolls when long, so the keyboard has to reach it.
        <pre tabIndex={0} aria-label={title} className={cn("max-h-64 overflow-auto rounded-md bg-paper-2 p-3 font-mono text-xs break-words whitespace-pre-wrap text-ink", FOCUS_RING_INSET)}>
          {children}
        </pre>
      ) : (
        children
      )}
    </div>
  )
}

/** A tool an assistant used: its name and its state, and behind the row what it was given and what it gave back. */
function ToolCall({ name, status = "success", summary, input, output, defaultOpen = false, animated, className }: ToolCallProps) {
  const words = useWords().chat
  const state = STATES[Object.prototype.hasOwnProperty.call(STATES, status) ? status : "pending"]
  const opens = !isEmptyNode(input) || !isEmptyNode(output)
  const label = (
    <>
      <span data-slot="tool-call-state" className={cn("inline-flex shrink-0", state.mark)}>
        <Icon name={state.icon} />
      </span>
      <span data-slot="tool-call-name" className="shrink-0 text-ink">
        {name}
      </span>
      <span className="sr-only">, {words[state.word]}</span>
    </>
  )
  return (
    <div data-slot="tool-call" data-status={status} className={cn("min-w-0", className)}>
      {opens ? (
        <Disclosure label={label} summary={summary} defaultOpen={defaultOpen} animated={animated}>
          <div data-slot="tool-call-panel" className="flex flex-col gap-3">
            {isEmptyNode(input) ? null : <Block title={words.toolInput}>{input}</Block>}
            {isEmptyNode(output) ? null : <Block title={words.toolOutput}>{output}</Block>}
          </div>
        </Disclosure>
      ) : (
        // Nothing to show: the same row, not a button, with the arrow's slot empty so the names line up down the thread.
        <div data-slot="tool-call-row" className={DISCLOSURE_ROW}>
          <span aria-hidden="true" className={DISCLOSURE_SLOT} />
          <span className="flex min-w-0 items-center gap-2">{label}</span>
          {isEmptyNode(summary) ? null : (
            <span data-slot="tool-call-summary" className="ms-2 min-w-0 truncate text-2xs font-normal text-ink-mute">
              {summary}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { Reasoning, ToolCall }
