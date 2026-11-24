// A small square picture of a thing that has one of its own: the logo of a service, of a framework, of a library, of
// a client. The picture is whole in its box (never cropped, never recoloured: it is content, the same in light and in
// dark), 16 or 20px, with no border and no ground. While it loads and when it fails the box holds one of Sigrid's
// icons, or nothing, and never changes size, so nothing shifts. It is not an icon of the interface: those are Sigrid's
// one set (`Icon`, R6), and an app draws no logo in their place where an action or a kind of thing is meant. It is not
// an `Avatar` either (a person: round, cropped, with initials). It goes where an icon goes: the `leading` of an
// `ItemRow`, the `icon` of a `NavItem`, beside a name in a `DescriptionList` or a `Cluster`; a `TreeNode` and a
// `GraphNode` draw it from their `image`. Ours: no library; a plain `img`, whose load and failure are followed here.
import * as React from "react"
import { Icon, type IconName } from "../../icons"
import { cn } from "../../lib/utils"

const SIZES = {
  /** 16px: the size of an icon, in a row, a tree, a thing of a graph. */
  sm: "size-4",
  /** 20px: beside a title or a 16px name that should not dwarf it. */
  md: "size-5",
} as const

/**
 * What became of each address, so a picture drawn again (a row that scrolls back, a thing of a graph that comes into
 * view) is there at once, without its icon first, and one that failed is not asked for again for a minute. Kept for the page's
 * life, a few hundred addresses at most.
 */
const SEEN = new Map<string, { is: "shown" | "failed"; at: number }>()
/** How long a picture that failed is not asked for again: after it, the next time it is drawn it is tried once more (the address may answer by then). */
const FAILED_FOR_MS = 60_000
const remember = (src: string, is: "shown" | "failed") => {
  if (SEEN.size >= 500) SEEN.clear()
  SEEN.set(src, { is, at: Date.now() })
}
const known = (src: string): "shown" | "failed" | "loading" => {
  const seen = SEEN.get(src)
  if (!seen) return "loading"
  return seen.is === "failed" && Date.now() - seen.at >= FAILED_FOR_MS ? "loading" : seen.is
}

export type LogoProps = {
  /** The address of the picture: an SVG or a PNG the app serves. */
  src: string
  /** What the picture is («PostgreSQL»): its accessible name. Without it the picture is hidden from screen readers, as it should be when the name is written beside it. */
  name?: string | undefined
  /** The name is written beside the picture: hide it from screen readers even with a `name`. */
  decorative?: boolean | undefined
  /** `sm` 16px (the default), `md` 20px. */
  size?: keyof typeof SIZES | undefined
  /** One of Sigrid's icons, drawn in the box while the picture loads and when it fails. Without it the box is empty, at the same size. */
  icon?: IconName | (string & {}) | undefined
  /** What is drawn in the box instead of `icon`, for a part that has a mark of its own there (the dot of a colour). */
  children?: React.ReactNode
  className?: string | undefined
}

function Logo({ src, name, decorative = false, size = "sm", icon, children, className }: LogoProps) {
  const [seen, setSeen] = React.useState<{ src: string; is: "shown" | "failed" } | null>(null)
  // Another address starts again, from what is known of it.
  // What is known is read once, as it is drawn: a picture on the page does not start again by itself.
  const [first] = React.useState(() => ({ src, is: known(src) }))
  const state = seen !== null && seen.src === src ? seen.is : first.src === src ? first.is : known(src)
  const settle = (is: "shown" | "failed") => {
    remember(src, is)
    setSeen({ src, is })
  }
  const named = name !== undefined && name !== "" && !decorative
  return (
    <span
      data-slot="logo"
      data-state={state}
      {...(named ? { role: "img", "aria-label": name } : { "aria-hidden": true })}
      className={cn("relative inline-flex shrink-0 items-center justify-center align-middle", SIZES[size], className)}
    >
      {state === "shown" ? null : (children ?? (icon !== undefined ? <span className="inline-flex text-ink-mute"><Icon name={icon} /></span> : null))}
      {state === "failed" ? null : (
        <img
          src={src}
          // The box says the name, or the text beside it does.
          alt=""
          draggable={false}
          onLoad={() => settle("shown")}
          onError={() => settle("failed")}
          className={cn("absolute inset-0 size-full object-contain", state === "loading" && "opacity-0")}
        />
      )}
    </span>
  )
}

export { Logo }
