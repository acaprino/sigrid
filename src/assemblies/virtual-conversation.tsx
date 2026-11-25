// The thread of a long conversation, of which only the messages in sight are in the page: `Conversation` for ten
// thousand turns, each of its own height (a line, or an answer of a screenful). It is `Conversation` in every other
// way: a log with a name that waits while an answer is written, that stays at the latest message while the reader is
// at the end (an answer being written is followed, and it opens at the end), that stops following as soon as the reader
// moves up, and a button back to the latest message. The messages are given as a count and a function that draws the
// one at a place, as `VirtualList` does, and each is measured as it is drawn and watched (`VirtualList variable`, on
// TanStack Virtual: it has its own entry of the package, `./virtual`, so an app with short threads does not load it).
// - What a place gives is one element, a `Message` or whatever the thread holds (`Reasoning`, `ToolCall`, a `Note`),
//   never none and never two: the room of the messages not drawn is kept as padding, so the scrollbar is the thread's.
// - Screen readers meet a log, which announces what is added to it: while the reader is away from the end the log is
//   silent (`aria-live="off"`), so the messages that scroll into the page are not read out one after the other.
import * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { useWords } from "../words"
import { ConversationLatest, useStickToEnd, type ConversationProps } from "./conversation"
import { useVirtualRows } from "./virtual-list"

/** The room above the first message and under the last, in px: `p-4`, as `Conversation`. */
const EDGE = 16
/** The room between two messages, in px: `gap-6`, as `Conversation`. */
const GAP = 24

export type VirtualConversationProps = Omit<ConversationProps, "children"> & {
  /** How many messages the thread holds, oldest first. */
  count: number
  /** The message at a place, counted from 0: one element each (a `Message`, a `Reasoning`, a `ToolCall`, a `Note`). */
  children: (index: number) => React.ReactNode
  /** What tells the message at a place from the others, where the thread changes: its id. Absent: its place. */
  rowKey?: ((index: number) => React.Key) | undefined
  /** The height of a message in px before it is drawn and measured. Default 96. */
  estimateSize?: number | undefined
  /** How many messages are drawn beyond the ones in sight, on each side. Default 6. */
  overscan?: number | undefined
}

/** The thread of a long conversation: only the messages in sight are in the page, and it follows the latest one. */
function VirtualConversation({ label, busy = false, empty, animated, className, count, children, rowKey, estimateSize = 96, overscan = 6 }: VirtualConversationProps) {
  const words = useWords().chat
  const { box, list, drawn, room } = useVirtualRows<HTMLDivElement>({ count, rowKey, estimateSize, overscan, variable: true, gap: GAP, edge: EDGE })
  const { away, onScroll, back } = useStickToEnd(box, list)
  return (
    <div data-slot="conversation" data-virtual="" className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div
        ref={box}
        data-slot="conversation-thread"
        role="log"
        aria-label={label ?? words.conversation}
        aria-busy={busy || undefined}
        aria-live={away ? "off" : undefined}
        tabIndex={0}
        onScroll={onScroll}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", FOCUS_RING_INSET)}
      >
        <div ref={list} data-slot="conversation-content" className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6 px-4", count === 0 && "py-4")} style={count === 0 ? undefined : room}>
          {count === 0 && !isEmptyNode(empty)
            ? empty
            : drawn.map((item) => <React.Fragment key={rowKey ? rowKey(item.index) : item.index}>{children(item.index)}</React.Fragment>)}
        </div>
      </div>
      <ConversationLatest away={away} onBack={back} animated={animated} />
    </div>
  )
}

export { VirtualConversation }
