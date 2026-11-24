// A button that puts a text on the clipboard and says that it did. After the press the copy icon is a check and the
// word is «Copied» for two seconds, then both go back: the answer is where the eye already is, so no notice is needed
// (a toast is for an action that can be taken back). Nothing moves: the icon keeps its box and the word the room of
// the wider of its two texts. Screen readers hear «Copied» (a polite status), or that the system refused.
// Alone it is a quiet icon button with a hint; with `showLabel` it shows its word; in an `InputGroup` it takes the
// size of the group's buttons and is off with the field.
import * as React from "react"
import { Button, type ButtonProps } from "../primitives/button"
import { Tooltip } from "../primitives/tooltip"
import { useInputGroup } from "./input-group"
import { Icon } from "../icons"
import { useWords } from "../words"
import { SwapLabel } from "../internal/swap-label"

/** How long the button says «Copied» before it is the copy button again. */
export const COPIED_MS = 2000

export type CopyButtonProps = Omit<ButtonProps, "children" | "onClick" | "asChild" | "loading" | "loadingText" | "value"> & {
  /** The text put on the clipboard. */
  value: string
  /** The name of the action («Copy the link»): the accessible name, the hint, and the word with `showLabel`. Absent: the toolkit's word («Copy»). */
  label?: string | undefined
  /** The word beside the icon. Without it the button shows the icon alone. */
  showLabel?: boolean | undefined
  /** Called once the text is on the clipboard. */
  onCopied?: ((value: string) => void) | undefined
  /** Called when the system refused the clipboard. */
  onCopyError?: ((error: unknown) => void) | undefined
}

/** The clipboard of the page; where a page has none (not a secure context), the old command on a field out of sight. */
async function write(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const field = document.createElement("textarea")
  field.value = text
  field.setAttribute("readonly", "")
  field.setAttribute("aria-hidden", "true")
  field.className = "sr-only"
  document.body.append(field)
  field.select()
  const done = document.execCommand("copy")
  field.remove()
  if (!done) throw new Error("copy refused")
}

function CopyButton({ value, label, showLabel = false, onCopied, onCopyError, variant = "ghost", size, disabled, animated, ...props }: CopyButtonProps) {
  const words = useWords()
  const group = useInputGroup()
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle")
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const name = label ?? words.copy.copy
  const copied = state === "copied"

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await write(value)
      setState("copied")
      onCopied?.(value)
    } catch (error) {
      setState("failed")
      onCopyError?.(error)
    }
    timer.current = setTimeout(() => setState("idle"), COPIED_MS)
  }

  const button = (
    <Button
      data-slot="copy-button"
      data-state={state}
      variant={variant}
      size={size ?? (showLabel ? (group ? "xs" : "sm") : group ? "icon-xs" : "icon-sm")}
      disabled={disabled || group?.disabled === true}
      animated={animated}
      aria-label={name}
      {...props}
      onClick={copy}
    >
      <Icon name={copied ? "check" : "copy"} />
      {/* The two words in one cell, each from the start (beside the icon): the width never changes. */}
      {showLabel ? <SwapLabel slot="copy-button-label" first={name} second={words.copy.copied} showSecond={copied} align="start" /> : null}
    </Button>
  )
  return (
    <>
      {showLabel ? (
        button
      ) : (
        <Tooltip label={copied ? words.copy.copied : name} animated={animated}>
          {button}
        </Tooltip>
      )}
      {/* Beside the button, not in it: a status inside a named button is not read everywhere. */}
      <span role="status" data-slot="copy-button-status" className="sr-only">
        {copied ? words.copy.copied : state === "failed" ? words.copy.failed : ""}
      </span>
    </>
  )
}

export { CopyButton }
