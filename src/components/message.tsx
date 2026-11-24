// One turn of a conversation: what the user wrote is a quiet block at the end of the row, what was answered is plain
// text on the page (the answer is the content, not a bubble), with Markdown when it is a string. Each message says who
// it is from before its text, for screen readers. Under it, in a place that never changes, the quiet actions the app
// asks for: copy, try again, good or bad answer, and the app's own. Nothing is revealed by the pointer: what can be
// done is there for a finger and for the keyboard too.
import type * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { Icon } from "../icons"
import { useWords } from "../words"
import { MarkdownBlocks } from "../internal/markdown"
import { Button, QUIET_ICON } from "../primitives/button"
import { Tooltip } from "../primitives/tooltip"
import { CopyButton } from "./copy-button"

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

export { Message }
