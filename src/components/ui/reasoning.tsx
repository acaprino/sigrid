// What an assistant did on the way to its answer, kept behind a row each so the answer stays the thing to read:
// `Reasoning`, what it thought, and `ToolCall`, a tool it used. Both are rows that open in place (Base UI's
// `Collapsible`, as `Disclosure`).
// `Reasoning` is open while it is being written (`busy`) and closes by itself when it is done, unless the reader
// opened or closed it: the reader's choice stays. Its row says «Thinking», then «Thought for 4 s».
// `ToolCall` says the tool's name and its state three ways, never by colour alone: an icon (a clock while it waits,
// the bolt while it runs, a check, the circle with an X of a failure), its colour, and a word for screen readers. It
// opens only when there is something to show: what the tool was given and what it gave back.
// Nothing loops: no shimmer and no spinner. A state changes once, when the app says so.
import * as React from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { cn, isEmptyNode } from "../../lib/utils"
import { FOCUS_RING } from "../../lib/focus"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"
import { MarkdownBlocks } from "../../internal/markdown"
import { Disclosure } from "./disclosure"

export type ReasoningProps = {
  /** It is being written: the row says so, and it is open unless the reader closed it. */
  busy?: boolean | undefined
  /** How long it took, in seconds, said by the row once it is done («Thought for 4 s»). */
  seconds?: number | undefined
  /** Open or closed, when the app keeps it. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  className?: string | undefined
  /** The reasoning: a string is read as Markdown. */
  children?: React.ReactNode
}

/** The reasoning behind an answer, behind a row: open while it is written, closed once done. */
function Reasoning({ busy = false, seconds, open, onOpenChange, className, children }: ReasoningProps) {
  const words = useWords().chat
  // The reader's own choice, once made; until then it follows `busy`.
  const [chosen, setChosen] = React.useState<boolean | null>(null)
  return (
    <Disclosure
      label={busy ? words.thinking : words.thought(seconds)}
      open={open ?? chosen ?? busy}
      onOpenChange={(next) => {
        setChosen(next)
        onOpenChange?.(next)
      }}
      className={className}
    >
      <div data-slot="reasoning" className="border-l border-line pl-3 text-sm text-ink-soft">
        {typeof children === "string" ? <MarkdownBlocks text={children} /> : children}
      </div>
    </Disclosure>
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
  className?: string | undefined
}

const STATES: Record<ToolCallStatus, { icon: IconName; mark: string; word: "toolPending" | "toolRunning" | "toolSuccess" | "toolError" }> = {
  pending: { icon: "clock", mark: "text-ink-mute", word: "toolPending" },
  running: { icon: "now", mark: "text-ink-soft", word: "toolRunning" },
  success: { icon: "check", mark: "text-success", word: "toolSuccess" },
  error: { icon: "error", mark: "text-destructive", word: "toolError" },
}

const ROW = "flex min-h-(--control-sm) min-w-0 items-center gap-2 text-start text-sm text-ink-soft pointer-coarse:min-h-11"

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-slot="tool-call-block" className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-ink-mute">{title}</span>
      {typeof children === "string" ? <pre className="max-h-64 overflow-auto rounded-md bg-paper-2 p-3 text-xs break-words whitespace-pre-wrap text-ink">{children}</pre> : children}
    </div>
  )
}

/** A tool an assistant used: its name and its state, and behind the row what it was given and what it gave back. */
function ToolCall({ name, status = "success", summary, input, output, defaultOpen = false, className }: ToolCallProps) {
  const words = useWords().chat
  const state = STATES[Object.prototype.hasOwnProperty.call(STATES, status) ? status : "pending"]
  const opens = !isEmptyNode(input) || !isEmptyNode(output)
  const row = (
    <>
      {/* The arrow's slot stays, empty, on a row that does not open: the names line up down the thread. */}
      <span className="inline-flex size-4 shrink-0 group-data-panel-open/tool:rotate-90">{opens ? <Icon name="chevron" /> : null}</span>
      <span data-slot="tool-call-state" className={cn("inline-flex shrink-0", state.mark)}>
        <Icon name={state.icon} />
      </span>
      <span data-slot="tool-call-name" className="shrink-0 font-medium text-ink">
        {name}
      </span>
      <span className="sr-only">, {words[state.word]}</span>
      {isEmptyNode(summary) ? null : (
        <span data-slot="tool-call-summary" className="min-w-0 truncate text-xs text-ink-mute">
          {summary}
        </span>
      )}
    </>
  )
  if (!opens) {
    return (
      <div data-slot="tool-call" data-status={status} className={cn(ROW, className)}>
        {row}
      </div>
    )
  }
  return (
    <Collapsible.Root data-slot="tool-call" data-status={status} defaultOpen={defaultOpen} className={cn("flex min-w-0 flex-col", className)}>
      <Collapsible.Trigger className={cn(ROW, "group/tool -mx-(--pad-xs) max-w-full self-start rounded-md px-(--pad-xs) hover:bg-ink/6", FOCUS_RING)}>{row}</Collapsible.Trigger>
      <Collapsible.Panel data-slot="tool-call-panel" keepMounted className="flex flex-col gap-3 pt-2 pl-6 data-closed:hidden">
        {isEmptyNode(input) ? null : <Block title={words.toolInput}>{input}</Block>}
        {isEmptyNode(output) ? null : <Block title={words.toolOutput}>{output}</Block>}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

export { Reasoning, ToolCall }
