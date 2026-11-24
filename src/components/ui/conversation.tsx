// A conversation with an assistant (or with a person): the thread and its messages. `Conversation` is the column that
// scrolls: it stays at the last message while the reader is there, so an answer being written is followed, and it
// stops following as soon as the reader goes up to read; a button then leads back to the latest message. `Message` is
// one turn: what the user wrote is a quiet block at the end of the row, what was answered is plain text on the page
// (the answer is the content, not a bubble), with Markdown when it is a string. Under an answer, in a place that never
// changes, the quiet actions the app asks for: copy, try again, good or bad answer, and the app's own.
// Screen readers meet the thread as a log: each message says who it is from before its text, and while an answer is
// being written (`busy`) the log waits, so the answer is read once, whole, and not word by word.
// Nothing moves by itself: no typing dots, no shimmer. That an answer is on its way is said by the stop button of
// `PromptInput` and by the row of `Reasoning`.
import * as React from "react"
import { cn, isEmptyNode } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { Icon } from "../../icons"
import { useWords } from "../../words"
import { MarkdownBlocks } from "../../internal/markdown"
import { Button, QUIET_ICON } from "./button"
import { CopyButton } from "./copy-button"
import { Tooltip } from "./tooltip"

/** How near the end, in px, the reader still counts as being at the latest message. */
export const CONVERSATION_NEAR_PX = 48

export type ConversationProps = {
  /** The name of the thread for screen readers («Chat with the assistant»). Absent: the toolkit's word. */
  label?: string | undefined
  /** An answer is being written: screen readers wait for its end, and read it once. */
  busy?: boolean | undefined
  /** What is shown in place of the thread while it has no message: a greeting, an `Empty`, a `Suggestions`. */
  empty?: React.ReactNode
  className?: string | undefined
  /** The messages, oldest first: `Message`, `Reasoning`, `ToolCall`, a `Note` for a failure. */
  children?: React.ReactNode
}

/** The thread of a conversation: it follows the latest message while the reader is at the end. */
function Conversation({ label, busy = false, empty, className, children }: ConversationProps) {
  const words = useWords().chat
  const scroller = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  // Whether the reader is at the end: a ref for the following (read while content grows), a state for the button.
  const atEnd = React.useRef(true)
  const [away, setAway] = React.useState(false)

  const toEnd = React.useCallback(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])
  const follow = React.useCallback(() => {
    if (atEnd.current) toEnd()
  }, [toEnd])

  // After every draw (a new message, a longer answer), and when what is in it changes size by itself (an image that
  // arrives, a reasoning that opens).
  React.useLayoutEffect(follow)
  React.useEffect(() => {
    const el = content.current
    if (!el || typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(follow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [follow])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= CONVERSATION_NEAR_PX
    atEnd.current = near
    setAway(!near)
  }

  const none = React.Children.count(children) === 0
  return (
    <div data-slot="conversation" className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div
        ref={scroller}
        data-slot="conversation-thread"
        role="log"
        aria-label={label ?? words.conversation}
        aria-busy={busy || undefined}
        tabIndex={0}
        onScroll={onScroll}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", FOCUS_RING_INSET)}
      >
        <div ref={content} data-slot="conversation-content" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
          {none && !isEmptyNode(empty) ? empty : children}
        </div>
      </div>
      {away ? (
        <div data-slot="conversation-latest" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Tooltip label={words.latest} side="top">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={words.latest}
              // A raised surface over the thread: the raised fill and a shadow, no border (R4).
              className="pointer-events-auto bg-raised text-ink shadow-md hover:bg-raised"
              onClick={() => {
                atEnd.current = true
                setAway(false)
                toEnd()
              }}
            >
              <Icon name="moveDown" />
            </Button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  )
}

/** What the reader said of an answer. */
export type MessageVote = "up" | "down"

export type MessageProps = {
  /** Who wrote it: the user (a quiet block at the end of the row) or the assistant (plain text on the page). */
  from: "user" | "assistant"
  /** The name read by screen readers before the text («Ada», «Support»). Absent: the toolkit's word for `from`. */
  name?: string | undefined
  /** An `Avatar` at the start of an answer, when the thread has more than one voice. A user's message has none. */
  avatar?: React.ReactNode
  /** The text. A string is read as Markdown in an answer and kept as written (with its line breaks) in a user's message; anything else is drawn as it is (a `Card`, a table, `Reasoning` and `ToolCall` above the text). */
  children?: React.ReactNode
  /** When it was sent, already written out («10:42»): 12px, muted, at the start of the row of actions. */
  time?: React.ReactNode
  /** The text the copy button puts on the clipboard. Absent: no copy button. */
  copyText?: string | undefined
  /** Ask for the answer again. Absent: no button. */
  onRetry?: (() => void) | undefined
  /** What the reader said of the answer, when the app keeps it. */
  vote?: MessageVote | null | undefined
  /** The reader says the answer was good or not; the same button again takes it back (`null`). Absent: no buttons. Only under an answer. */
  onVote?: ((vote: MessageVote | null) => void) | undefined
  /** The app's own quiet actions, after the toolkit's: `Button variant="ghost" size="icon-sm"` with a `Tooltip`. */
  actions?: React.ReactNode
  className?: string | undefined
}

/** One turn of a conversation. */
function Message({ from, name, avatar, children, time, copyText, onRetry, vote, onVote, actions, className }: MessageProps) {
  const words = useWords().chat
  const user = from === "user"
  const who = name ?? (user ? words.user : words.assistant)
  const votes = !user && onVote !== undefined
  const hasFoot = !isEmptyNode(time) || copyText !== undefined || onRetry !== undefined || votes || !isEmptyNode(actions)
  const body =
    typeof children === "string" ? (
      user ? (
        <p className="break-words whitespace-pre-wrap">{children}</p>
      ) : (
        <MarkdownBlocks text={children} />
      )
    ) : (
      children
    )
  const voteButton = (value: MessageVote, label: string) => (
    <Tooltip label={label} side="bottom">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={vote === value}
        className={cn(QUIET_ICON, "aria-pressed:bg-ink/9 aria-pressed:text-ink")}
        onClick={() => onVote?.(vote === value ? null : value)}
      >
        <Icon name={value === "up" ? "thumbUp" : "thumbDown"} />
      </Button>
    </Tooltip>
  )
  return (
    <article data-slot="message" data-from={from} className={cn("flex min-w-0 gap-3", user && "justify-end", className)}>
      {!user && !isEmptyNode(avatar) ? (
        <span data-slot="message-avatar" className="shrink-0">
          {avatar}
        </span>
      ) : null}
      <div className={cn("flex min-w-0 flex-col gap-1", user ? "max-w-4/5 items-end" : "flex-1")}>
        <div
          data-slot="message-body"
          className={cn("min-w-0 text-sm text-ink wrap-anywhere", user ? "rounded-lg bg-ink/6 px-3 py-2" : "flex flex-col gap-3")}
        >
          <span className="sr-only">{who}: </span>
          {body}
        </div>
        {hasFoot ? (
          <div data-slot="message-actions" className={cn("flex min-h-(--control-sm) items-center gap-1", !user && "-ms-(--pad-xs)")}>
            {isEmptyNode(time) ? null : (
              <span data-slot="message-time" className={cn("px-(--pad-xs) text-xs text-ink-mute tabular-nums")}>
                {time}
              </span>
            )}
            {copyText === undefined ? null : <CopyButton value={copyText} className={QUIET_ICON} />}
            {onRetry ? (
              <Tooltip label={words.retry} side="bottom">
                <Button variant="ghost" size="icon-sm" aria-label={words.retry} className={QUIET_ICON} onClick={onRetry}>
                  <Icon name="refresh" />
                </Button>
              </Tooltip>
            ) : null}
            {votes ? voteButton("up", words.good) : null}
            {votes ? voteButton("down", words.bad) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export { Conversation, Message }
