// Park UI (MIT) avatar 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/avatar.ts)
// From Park's `avatar` recipe comes the form (its subtle variant, its full shape): a round tile with the picture
// cropped to fill it, or the initials in medium weight when there is no picture. Ours: three sizes on the toolkit's
// control heights (36, 32 and 28px at normal density; Park's go from 24 to 64px), 12px initials below the largest, and a
// neutral fill for every person: the quiet gray of the label pills, with the ink. A person's colour is not a fill
// (R10: data colours are dots); an app that gives people a colour puts a dot beside the name.
// Behaviour: Ark UI's Avatar, which shows the initials until the picture has loaded and again if it fails.
// The name is the avatar's accessible name, unless `decorative` says the name is written beside it.
import * as React from "react"
import { Avatar as AvatarPrimitive } from "@ark-ui/react/avatar"
import { cn } from "../../lib/utils"
import { contrast } from "../../theme-engine"

const SIZES = {
  md: "size-(--control-md) text-sm",
  sm: "size-(--control-sm) text-2xs",
  xs: "size-(--control-xs) text-2xs",
} as const

export type AvatarProps = {
  /** The person's name: the accessible name, and the source of the initials. */
  name: string
  /** The picture. Without one, or while it loads, or if it fails: the initials. */
  src?: string | undefined
  size?: keyof typeof SIZES | undefined
  /** The name is written beside the avatar: hide it from screen readers. */
  decorative?: boolean | undefined
  /**
   * An identity fill, `#rrggbb`, for an app whose people or accounts are told apart by colour (a mail app's accounts). The
   * initials take the ink with the better contrast on it (the one the toolkit gives a filled mark). Without it the tile is
   * the neutral one (R10: a colour for a person is a dot, not a fill): this is for what the app chose on purpose.
   */
  color?: string | undefined
  /** Drawn in place of the initials (an icon for «all accounts»); the picture still wins when it loads. */
  children?: React.ReactNode
  className?: string | undefined
}

const IS_HEX = /^#[0-9a-fA-F]{6}$/

/**
 * The ink for a fill: white or black, whichever has the better contrast on it. Of the two, one always reaches 4.5:1 (the worst
 * fill, a mid-tone, still gets 4.58): the initials are small text, and the dark mark ink of the theme is not dark enough for that.
 */
export function inkOn(fill: string): string {
  return contrast(fill, "#ffffff") >= contrast(fill, "#000000") ? "#ffffff" : "#000000"
}

/** The first letter of the first and of the last word («Ada Lovelace» → «AL»); one word gives one letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (!first) return ""
  const last = words.length > 1 ? words[words.length - 1]! : ""
  const letter = (word: string) => Array.from(word)[0] ?? ""
  return (letter(first) + letter(last)).toUpperCase()
}

function Avatar({ name, src, size = "md", decorative, color, children, className }: AvatarProps) {
  const fill = color !== undefined && IS_HEX.test(color) ? color.toLowerCase() : null
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      {...(fill ? { "data-tinted": "", style: { backgroundColor: fill, color: inkOn(fill) } } : {})}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/6 align-top font-medium text-ink select-none", SIZES[size], className)}
    >
      <AvatarPrimitive.Fallback data-slot="avatar-fallback" aria-hidden="true" className="leading-none">
        {children ?? initials(name)}
      </AvatarPrimitive.Fallback>
      {src ? <AvatarPrimitive.Image data-slot="avatar-image" src={src} alt="" className="size-full object-cover" /> : null}
    </AvatarPrimitive.Root>
  )
}

export { Avatar }
