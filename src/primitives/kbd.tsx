// Park UI (MIT) kbd 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/kbd.ts)
// The form is Park's `kbd` recipe, its plain variant (R5): a key hint is 12px text in medium weight, muted, with no box,
// hidden on a phone (narrow and with a finger), where there is no keyboard to press it on. Inside a button it takes
// the button's own text colour, so it stays readable on a fill. `size` is kept for callers: every size draws the same.
// A theme may ask for boxed keys instead (`ThemeDef.keys: 'boxed'`, which the engine writes as `data-keys="boxed"` on
// the root): the one approved exception to R5 (the owner, 2026-11-24), off unless the theme asks. Then a key is a 20px
// cap with a hairline, in the monospace face; the cap is decoration, the key is still read by its letter.
import { Fragment } from "react"
import type * as React from "react"
import { cn } from "../lib/utils"
import { useWords } from "../words"

export type KbdSize = "sm" | "md" | "lg"

export type KbdProps = React.ComponentProps<"kbd"> & { size?: KbdSize | undefined }

/** Muted 12px text; inside a button, the button's colour. */
const HINT_TEXT = "text-2xs leading-none font-medium text-ink-mute [[data-slot=button]_&]:text-current"

/**
 * The cap of a boxed key, only under `[data-keys="boxed"]`: 20px tall and at least as wide, the divider as a hairline,
 * l1 corners, 4px at the sides, the monospace face, its letters centred on an 18px line. On a fill (inside a button,
 * so in a toast's action too, and in the inverted tooltip) the hairline is the text's own colour at 35%, so it shows
 * there. Every class here carries the variant: with no attribute a key is plain text, as before.
 * The one way to draw a key: `Kbd` has it, and every other part that writes a key hint in a text style of its own
 * (a toolbar's `shortcut`, a row of the command palette, a menu's shortcut, a toast's hint, a tooltip's key) adds this
 * to that style, never a copy of it. It sets no `display`: a part that hides its hint keeps hiding it.
 */
export const KEY_CAP =
  "[[data-keys=boxed]_&]:h-5 [[data-keys=boxed]_&]:min-w-5 [[data-keys=boxed]_&]:justify-center [[data-keys=boxed]_&]:rounded-sm [[data-keys=boxed]_&]:border [[data-keys=boxed]_&]:border-line [[data-keys=boxed]_&]:px-1 [[data-keys=boxed]_&]:text-center [[data-keys=boxed]_&]:font-mono [[data-keys=boxed]_&]:leading-4.5 [[data-keys=boxed]_&]:[[data-slot=button]_&]:border-current/35 [[data-keys=boxed]_&]:[[data-slot=tooltip-content]_&]:border-current/35"

/**
 * For a hint that is a word in a line of text (the key of a tooltip): under boxed keys it becomes a box in that line,
 * so the cap has its height. Beside `KEY_CAP`, never alone.
 */
export const KEY_CAP_IN_TEXT = "[[data-keys=boxed]_&]:inline-block"

/** Hidden on a phone: narrow (below `md`, 860px) and with a coarse pointer, as `usePhone`. */
export const ON_PHONE_HIDDEN = "max-md:pointer-coarse:hidden"

/** One key or a combination written as text ("Ctrl+Enter", "Z", "Esc"); a 20px cap under a theme with boxed keys (`ThemeDef.keys`). */
function Kbd({ size = "sm", className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-size={size}
      className={cn("pointer-events-none inline-flex shrink-0 items-center font-sans whitespace-nowrap select-none", HINT_TEXT, KEY_CAP, ON_PHONE_HIDDEN, className)}
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
