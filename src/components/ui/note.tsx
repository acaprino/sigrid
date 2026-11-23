// Park UI (MIT) alert 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/alert.ts)
// A message that stays in the page until the app removes it: a failure, a warning, a success or a piece of
// information, with a title, its text, an optional list and the actions that answer it. It has no close button: it
// goes when its cause is gone. A notice that goes by itself is `Toasts`; a view with nothing in it is `Empty`.
// Each tone is said three ways, never by colour alone (DESIGN.md "Status"): its icon, from Sigrid's one set (`info`,
// `check`, `alert` for a warning, `error`, the same circle with «!» that marks an error in a notice), its colour,
// and a word read first by screen readers («Error: Could not reach the server», `useWords().note`).
// An error or a warning is announced when it appears (`role="alert"`, read at once). Information and a success are
// not: they have no live role, so a screen reader meets them in the page's order. A polite `role="status"` would not
// keep them quiet: some screen readers read a status as soon as it is put in the page, and again at each change of its
// text. A note that turns into an error in place is not announced again: the app gives the error a `key` of its own,
// so it is a new note.
// Form: Park's `alert` recipe, its default `subtle` variant at its `md` size: a row with the icon at the start and the
// content beside it (12px apart, 16px of padding, l3 corners, 14px text), the title semibold over the text, 4px apart.
// The fill is the tone's soft colour (the theme engine's `success-soft`, `warning-soft`, `destructive-soft`, as the
// error box of `FormField`); information has no status colour and is never the accent (R2), so it is the quiet fill
// (the ink at 6%). A fill and no border or shadow: it lies in the page, it is not raised (R4). The icon and the title
// take the tone's colour, which reads on its soft fill in every theme; the text and the list stay in the ink.
// Not taken from Park: its colour palettes (blue, orange, green, red: here the status tokens), the 20px icon (16px, R7),
// the `solid`, `surface` and `outline` variants and the `lg` size (one form for every app). The actions are the
// app's buttons, `outline` or `ghost`: a note never holds the solid action unless it is the one of its screen (R3).
import type * as React from "react"
import { cn } from "../../lib/utils"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"

/** What a note says: a piece of information, a success, a warning or an error. */
export type NoteTone = "info" | "success" | "warning" | "error"

export type NoteProps = Omit<React.ComponentProps<"div">, "title" | "role" | "children"> & {
  /** What kind of message it is: its icon, its colour and the word read before the title. `info` by default. An error or a warning is announced when it appears. */
  tone?: NoteTone | undefined
  /** What happened, in a few words («Could not reach the server»). */
  title: React.ReactNode
  /** The text under the title: why, and what to do. */
  children?: React.ReactNode
  /** A list under the text (the files that failed, the steps to take), one entry each; an empty list shows nothing. */
  items?: readonly React.ReactNode[] | undefined
  /** The buttons that answer it («Retry», «Open the settings»), `outline` or `ghost`: the solid one only if it is the screen's one primary action (R3). */
  actions?: React.ReactNode
}

type Look = { icon: IconName; surface: string; mark: string; title: string; announced: boolean }

const TONES: Record<NoteTone, Look> = {
  info: { icon: "info", surface: "bg-ink/6", mark: "text-ink-soft", title: "text-ink", announced: false },
  success: { icon: "check", surface: "bg-success-soft", mark: "text-success", title: "text-success", announced: false },
  warning: { icon: "alert", surface: "bg-warning-soft", mark: "text-warning", title: "text-warning", announced: true },
  error: { icon: "error", surface: "bg-destructive-soft", mark: "text-destructive", title: "text-destructive", announced: true },
}

/** A message that stays in the page, in one of four tones, until the app removes it. */
function Note({ tone = "info", title, children, items, actions, className, ...props }: NoteProps) {
  const words = useWords()
  // A tone outside the four (from data) is information.
  const known: NoteTone = Object.prototype.hasOwnProperty.call(TONES, tone) ? tone : "info"
  const look = TONES[known]
  const hasBody = children != null && children !== false && children !== ""
  return (
    <div
      data-slot="note"
      data-tone={known}
      {...props}
      role={look.announced ? "alert" : undefined}
      className={cn("flex w-full items-start gap-3 rounded-lg p-4 text-sm text-ink", look.surface, className)}
    >
      <span data-slot="note-icon" className={cn("flex h-5 shrink-0 items-center", look.mark)}>
        <Icon name={look.icon} />
      </span>
      <div data-slot="note-content" className="flex min-w-0 flex-1 flex-col gap-1">
        <div data-slot="note-title" className={cn("font-semibold", look.title)}>
          <span className="sr-only">{words.note[known]}:</span> {title}
        </div>
        {hasBody ? <div data-slot="note-description">{children}</div> : null}
        {items && items.length > 0 ? (
          <ul data-slot="note-items" className="list-disc space-y-1 ps-5">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {actions ? (
          <div data-slot="note-actions" className="flex flex-wrap items-center gap-2 pt-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { Note }
