// The thread of a conversation with an assistant (or with a person): the column that scrolls. It stays at the last
// message while the reader is there, so an answer being written is followed, and it stops following as soon as the
// reader moves up, by however little; a button then leads back to the latest message. What is in it are the turns
// (`Message`), and what an assistant did on the way (`Reasoning`, `ToolCall`); the field under it is `PromptInput`.
// Screen readers meet the thread as a log: while an answer is being written (`busy`) the log waits, so the answer is
// read once, whole, and not word by word.
// Nothing moves by itself: no typing dots, no shimmer. That an answer is on its way is said by the stop button of
// `PromptInput` and by the row of `Reasoning`. Following the answer and going back to its end are done at once, never
// as a glide: a long way across the screen is not a movement of this toolkit. The button back, which the reader's own
// scroll brings up, enters as a hint does when motion is on.
import * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { Icon } from "../icons"
import { useWords } from "../words"
import { useEntrance } from "../internal/motion"
import { Button } from "../primitives/button"
import { Tooltip } from "../primitives/tooltip"

/** How near the end, in px, the reader counts as back at the latest message. */
export const CONVERSATION_NEAR_PX = 48

export type ConversationProps = {
  /** The name of the thread for screen readers («Chat with the assistant»). Absent: the toolkit's word. */
  label?: string | undefined
  /** An answer is being written: screen readers wait for its end, and read it once. */
  busy?: boolean | undefined
  /** What is shown in place of the thread while it has no message: a greeting, an `Empty`, a `Suggestions`. */
  empty?: React.ReactNode
  /** The button back to the latest message enters with a movement. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
  /** The messages, oldest first: `Message`, `Reasoning`, `ToolCall`, a `Note` for a failure. */
  children?: React.ReactNode
}

/** The thread of a conversation: it follows the latest message while the reader is at the end. */
function Conversation({ label, busy = false, empty, animated, className, children }: ConversationProps) {
  const words = useWords().chat
  const scroller = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  // Whether the reader is at the end: a ref for the following (read while content grows), a state for the button.
  const atEnd = React.useRef(true)
  // Where the thread was last seen: a place further up than this is the reader's own move.
  const lastTop = React.useRef(0)
  const [away, setAway] = React.useState(false)

  const toEnd = React.useCallback(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    lastTop.current = el.scrollTop
  }, [])
  const follow = React.useCallback(() => {
    if (atEnd.current) toEnd()
  }, [toEnd])

  // After every draw (a new message, a longer answer); and when what is in it changes size by itself (an image that
  // arrives, a reasoning that opens) or the thread itself does (the field under it grows, a phone's keyboard opens).
  React.useLayoutEffect(follow)
  React.useEffect(() => {
    if (typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(follow)
    if (content.current) observer.observe(content.current)
    if (scroller.current) observer.observe(scroller.current)
    return () => observer.disconnect()
  }, [follow])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    // Any move up leaves the end, so a slow scroll is not pulled back by the next word of the answer; coming back
    // within reach of the end takes it up again. A thread that got shorter (a reasoning that closed) is moved up by
    // the browser while still at its very end: that is not the reader's move.
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    const up = el.scrollTop < lastTop.current
    lastTop.current = el.scrollTop
    if (up && gap > 1) atEnd.current = false
    else if (gap <= CONVERSATION_NEAR_PX) atEnd.current = true
    setAway(!atEnd.current)
  }

  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterTooltip(el), away)
  // A condition that came out false is not a message: `{turns.map(…)}{busy ? … : null}` with no turn is empty.
  const none = React.Children.toArray(children).length === 0
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
        <div ref={enter} data-slot="conversation-latest" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Tooltip label={words.latest} side="top" animated={animated}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={words.latest}
              animated={animated}
              // A control that floats over the content: the raised fill and a small shadow, no border (R4). Its fill
              // stays the raised one under the pointer, or the thread would show through: the ink answers instead.
              className="pointer-events-auto bg-raised text-ink-soft shadow-sm hover:bg-raised hover:text-ink active:bg-raised"
              onClick={() => {
                atEnd.current = true
                setAway(false)
                toEnd()
                // The button goes: the focus it had goes to the thread it acted on.
                scroller.current?.focus()
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
