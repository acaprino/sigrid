// Park UI (MIT) kbd 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/kbd.ts)
// The form is Park's `kbd` recipe, its plain variant (R5): a key hint is 12px text in medium weight, muted, with no box,
// hidden on a phone (narrow and with a finger), where there is no keyboard to press it on. Inside a button it takes
// the button's own text colour, so it stays readable on a fill. `size` is kept for callers: every size draws the same.
import { Fragment } from "react"
import type * as React from "react"
import { cn } from "../../lib/utils"
import { useWords } from "../../words"

export type KbdSize = "sm" | "md" | "lg"

export type KbdProps = React.ComponentProps<"kbd"> & { size?: KbdSize | undefined }

/** Muted 12px text; inside a button, the button's colour. */
const HINT_TEXT = "text-2xs leading-none font-medium text-ink-mute [[data-slot=button]_&]:text-current"

/** Hidden on a phone: narrow (below `md`, 860px) and with a coarse pointer, as `usePhone`. */
export const ON_PHONE_HIDDEN = "max-md:pointer-coarse:hidden"

/** One key or a combination written as text ("Ctrl+Enter", "Z", "Esc"). */
function Kbd({ size = "sm", className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-size={size}
      className={cn("pointer-events-none inline-flex shrink-0 items-center font-sans whitespace-nowrap select-none", HINT_TEXT, ON_PHONE_HIDDEN, className)}
      {...props}
    />
  )
}

export type ShortcutProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** The keys, in order: `["Ctrl", "Enter"]`. */
  keys: readonly string[]
  /** Drawn between two keys: "+" for keys held together (the default), anything else for keys pressed in turn. */
  separator?: React.ReactNode
  size?: KbdSize | undefined
}

/** A combination drawn key by key, announced once as words: «Ctrl + Enter», or «G then I» for keys pressed in turn (the toolkit's words). */
function Shortcut({ keys, separator = "+", size = "sm", className, ...props }: ShortcutProps) {
  const words = useWords()
  const parts = keys.map((key, index) => (
    <Fragment key={`${index}-${key}`}>
      {index > 0 ? <span aria-hidden="true" className={HINT_TEXT}>{separator}</span> : null}
      <Kbd size={size} aria-hidden="true">{key}</Kbd>
    </Fragment>
  ))
  return (
    <span data-slot="shortcut" role="img" aria-label={separator === "+" ? words.common.keysTogether(keys) : words.common.keysInSequence(keys)} className={cn("inline-flex items-center gap-1", ON_PHONE_HIDDEN, className)} {...props}>
      {parts}
    </span>
  )
}

export { Kbd, Shortcut }
