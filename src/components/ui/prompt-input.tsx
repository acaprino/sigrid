// The field a message of a conversation is written in: a text box that grows with what is typed, up to eight lines,
// then scrolls; under it a row with the app's own tools at the start (attach a file, choose a model) and, at the end,
// the one button that sends. While an answer is being written (`busy`) that same button, in the same place, stops it:
// the control never moves (R14). Enter sends and Shift+Enter makes a new line; with a finger Enter makes a new line,
// as a phone's keyboard does, and the button sends. An empty message is not sent.
// Form: one field (`lib/field.ts`): the border of a field around the text and its row, and the focus ring on that
// border while the text has the focus. The send button is the solid action: on a chat screen it is the one primary
// (R3); the stop button is `outline`.
import * as React from "react"
import { cn, isEmptyNode } from "../../lib/utils"
import { FIELD_HOVER_DATA, FIELD_SURFACE, FIELD_TEXT } from "../../lib/field"
import { Icon } from "../../icons"
import { useWords } from "../../words"
import { COARSE, useMedia } from "../../internal/media"
import { Button } from "./button"
import { Tooltip } from "./tooltip"

export type PromptInputProps = {
  /** The text, when the app keeps it. After a message is sent the field asks for an empty one (`onValueChange("")`). */
  value?: string | undefined
  /** The text at first, for a field that keeps its own. */
  defaultValue?: string | undefined
  onValueChange?: ((value: string) => void) | undefined
  /** A message was sent: its text, without the blanks around it. Never called with an empty one, nor while `busy`. */
  onSubmit: (text: string) => void
  /** An answer is being written: the button stops it instead of sending, and Enter keeps the text. */
  busy?: boolean | undefined
  /** Stop the answer being written. Absent: while `busy` the button is off. */
  onStop?: (() => void) | undefined
  disabled?: boolean | undefined
  /** The name of the field for screen readers. Absent: the toolkit's word («Message»). */
  label?: string | undefined
  /** What the field shows while empty («Ask about this project»). */
  placeholder?: string | undefined
  /** The most characters a message may have: the count is shown beside the button («120/2000»). */
  maxLength?: number | undefined
  /** Above the text: what goes with the message (the files attached, as the app's chips). */
  attachments?: React.ReactNode
  /** At the start of the row under the text: the app's tools (`Button variant="ghost" size="icon-sm"`, a `Select`). */
  tools?: React.ReactNode
  autoFocus?: boolean | undefined
  /** Reaches the `<textarea>`. */
  ref?: React.Ref<HTMLTextAreaElement> | undefined
  className?: string | undefined
}

/** The field a message is written in, with the button that sends it or stops the answer. */
function PromptInput({ value, defaultValue = "", onValueChange, onSubmit, busy = false, onStop, disabled = false, label, placeholder, maxLength, attachments, tools, autoFocus, ref, className }: PromptInputProps) {
  const words = useWords().chat
  const coarse = useMedia(COARSE)
  const [own, setOwn] = React.useState(defaultValue)
  const text = value ?? own
  const set = (next: string) => {
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }
  const ready = text.trim() !== "" && !disabled && !busy
  const send = () => {
    if (!ready) return
    onSubmit(text.trim())
    set("")
  }
  const stopping = busy && !disabled
  const name = stopping ? words.stop : words.send
  return (
    <form
      data-slot="prompt-input"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        FIELD_SURFACE,
        FIELD_HOVER_DATA,
        "flex min-w-0 flex-col outline-hidden has-[textarea:focus-visible]:outline-solid has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:-outline-offset-1 has-[textarea:focus-visible]:outline-ring",
        disabled && "opacity-50",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      {isEmptyNode(attachments) ? null : (
        <div data-slot="prompt-input-attachments" className="flex flex-wrap items-center gap-1 px-(--pad-xs) pt-(--pad-xs)">
          {attachments}
        </div>
      )}
      <textarea
        ref={ref}
        data-slot="prompt-input-text"
        rows={1}
        value={text}
        aria-label={label ?? words.message}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        // Eight lines of 20px and the padding, then it scrolls.
        className={cn("field-sizing-content max-h-44 w-full resize-none bg-transparent px-(--pad-sm) py-2 text-ink outline-hidden disabled:cursor-not-allowed", FIELD_TEXT)}
        onChange={(event) => set(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || coarse) return
          event.preventDefault()
          send()
        }}
      />
      <div data-slot="prompt-input-row" className="flex items-center gap-1 px-(--pad-xs) pb-(--pad-xs)">
        <div data-slot="prompt-input-tools" className="flex min-w-0 flex-1 items-center gap-1">
          {tools}
        </div>
        {maxLength === undefined ? null : (
          <span data-slot="prompt-input-count" aria-hidden="true" className="px-(--pad-xs) text-xs text-ink-mute tabular-nums">
            {text.length}/{maxLength}
          </span>
        )}
        <Tooltip label={name} side="top">
          <Button
            data-slot="prompt-input-button"
            data-state={stopping ? "stop" : "send"}
            type={stopping ? "button" : "submit"}
            variant={stopping ? "outline" : "default"}
            size="icon-sm"
            aria-label={name}
            disabled={stopping ? onStop === undefined : !ready}
            onClick={stopping ? onStop : undefined}
          >
            <Icon name={stopping ? "stop" : "send"} />
          </Button>
        </Tooltip>
      </div>
    </form>
  )
}

export { PromptInput }
