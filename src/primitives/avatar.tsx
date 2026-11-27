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
import { cn } from "../lib/utils"
import { contrast, toHex } from "../theme-engine"
import { useWords } from "../words"

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
   * initials take the ink with the better contrast on it (white or black). Without it the tile is
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
const BLACK = toHex({ L: 0, C: 0, h: 0 })
export function inkOn(fill: string): string {
  return contrast(fill, "#ffffff") >= contrast(fill, BLACK) ? "#ffffff" : BLACK
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

const GROUP_SURFACE = {
  paper: { bg: "bg-paper", ring: "ring-paper", badge: "bg-paper-2" },
  raised: { bg: "bg-raised", ring: "ring-raised", badge: "bg-paper-2" },
  quiet: { bg: "bg-paper-2", ring: "ring-paper-2", badge: "bg-raised" },
} as const

/** One person in an `AvatarGroup`. */
export type AvatarGroupItem = Pick<AvatarProps, "name" | "src" | "color">

export type AvatarGroupProps = {
  /** The people shown in the stack. */
  items: readonly AvatarGroupItem[]
  /** How many avatars are shown before the `+N` counter. Default 4. */
  max?: number | undefined
  size?: keyof typeof SIZES | undefined
  /** The surface behind the stack, for the ring that parts overlapping avatars. Default `paper`. */
  surface?: keyof typeof GROUP_SURFACE | undefined
  /** What the group represents («Assignees», «Participants»), for screen readers. */
  label: string
  className?: string | undefined
}

/** A tight stack of avatars for a group of people, with a `+N` counter when there are more than `max`. */
function AvatarGroup({ items, max = 4, size = "sm", surface = "paper", label, className }: AvatarGroupProps) {
  const words = useWords()
  if (items.length === 0) return null
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 4
  const visible = items.slice(0, limit)
  const overflow = items.length - visible.length
  const style = GROUP_SURFACE[surface]
  const ring = cn("ring-2", style.ring)
  return (
    <div role="group" aria-label={label} data-slot="avatar-group" className={cn("inline-flex items-center [&>*+*]:-ms-2", className)}>
      {visible.map((item, index) => (
        // Opaque surface base prevents translucent `bg-ink/6` initials from bleeding through the avatar underneath.
        <span key={`${item.name}-${index}`} className={cn("relative inline-flex shrink-0 rounded-full", style.bg, ring)}>
          <Avatar name={item.name} src={item.src} color={item.color} size={size} />
        </span>
      ))}
      {overflow > 0 ? (
        <span
          data-slot="avatar-overflow"
          className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full font-medium text-ink-soft tabular-nums select-none", SIZES[size], style.badge, ring)}
        >
          <span aria-hidden="true">+{overflow}</span>
          <span className="sr-only">{words.list.more(overflow)}</span>
        </span>
      ) : null}
    </div>
  )
}

export { Avatar, AvatarGroup }
