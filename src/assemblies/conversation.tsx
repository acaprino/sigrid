// The thread of a conversation with an assistant (or with a person): the column that scrolls. It stays at the last
// message while the reader is there, so an answer being written is followed, and it stops following as soon as the
// reader goes up to read; a button then leads back to the latest message. What is in it are the turns (`Message`),
// and what an assistant did on the way (`Reasoning`, `ToolCall`); the field under it is `PromptInput`.
// Screen readers meet the thread as a log: while an answer is being written (`busy`) the log waits, so the answer is
// read once, whole, and not word by word.
// Nothing moves by itself: no typing dots, no shimmer. That an answer is on its way is said by the stop button of
// `PromptInput` and by the row of `Reasoning`.
import * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { Icon } from "../icons"
import { useWords } from "../words"
import { Button } from "../primitives/button"
import { Tooltip } from "../primitives/tooltip"

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

export { Conversation }
