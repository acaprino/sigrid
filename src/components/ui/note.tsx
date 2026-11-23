// Park UI (MIT) alert 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/alert.ts)
// A message that stays in the page until the app removes it: a failure, a warning, a success or a piece of
// information, with a title, its text, an optional list and the actions that answer it. It has no close button: it
// goes when its cause is gone. One need, one look: a failure the page shows is a note with `tone="error"` (with
// «Retry» as its action when it can be tried again), never an `Empty`, which is only for a view with nothing in it; a
// passing event (saved, moved, sent) is a toast (`Toasts`).
// Each tone is said three ways, never by colour alone (DESIGN.md "Status"): its icon, from Sigrid's one set (`info`,
// `check`, `alert` for a warning, `error` for a failure: the circle with an X that marks a failure everywhere, in a
// toast, a progress and a step too), its colour, and a word read first by screen readers («Error: Could not reach the
// server»: `useWords().common.error`, the word of an error toast, and `useWords().note` for the other three).
// An error or a warning is announced when it appears (`role="alert"`, read at once), unless the app says `announce`
// false: a warning that is a fact of the item shown (read only, out of date) would be read again at each selection.
// Information and a success are not: they have no live role, so a screen reader meets them in the page's order. A
// polite `role="status"` would not keep them quiet: some screen readers read a status as soon as it is put in the page,
// and again at each change of its text. The root is keyed on its tone: a note whose tone changes in place is drawn
// anew, so an information that becomes an error, or a warning that becomes an error, is announced as it appears.
// A long word (a path, a JSON value, an address) breaks where it must (`overflow-wrap: anywhere`, inherited by the
// title, the text and the list), so the note never grows wider than its place; a tool's output, with its line breaks,
// goes in the text as a `<Text pre>`.
// Form: Park's `alert` recipe, its default `subtle` variant at its `md` size: a row with the icon at the start and the
// content beside it (12px apart, 16px of padding, l3 corners, 14px text), the title semibold over the text, 4px apart.
// The fill is the tone's soft colour (the theme engine's `success-soft`, `warning-soft`, `destructive-soft`, as the
// error box of `FormField`); information has no status colour and is never the accent (R2), so it is the quiet fill
// (the ink at 6%). A fill and no border or shadow: it lies in the page, it is not raised (R4). The icon and the title
// take the tone's colour, which reads on its soft fill in every theme; the text and the list stay in the ink.
// Not taken from Park: its colour palettes (blue, orange, green, red: here the status tokens), the 20px icon (16px, R7),
// the `solid`, `surface` and `outline` variants and the `lg` size (one form for every app). The actions are the
// app's buttons, `outline` (the ink) or `ghost` (the soft ink), both at 4.5:1 on the four fills in every theme: a note
// never holds the solid action unless it is the one of its screen (R3).
import type * as React from "react"
import { cn } from "../../lib/utils"
import { Icon, type IconName } from "../../icons"
import { useWords } from "../../words"

/** What a note says: a piece of information, a success, a warning or an error. */
export type NoteTone = "info" | "success" | "warning" | "error"

export type NoteProps = Omit<React.ComponentProps<"div">, "title" | "role" | "children"> & {
  /** What kind of message it is: its icon, its colour and the word read before the title. `info` by default. An error or a warning is announced when it appears; a note whose tone changes is drawn anew, and announced if it is now one of them. */
  tone?: NoteTone | undefined
  /** An error or a warning is announced when it appears (the default). `false` for one that is a fact of the item shown (a warning «Read only»), which would otherwise be read at each selection. Information and a success are never announced. */
  announce?: boolean | undefined
  /** What happened, in a few words («Could not reach the server»), without the tone's word: screen readers read it before the title. A long word breaks to fit. */
  title: React.ReactNode
  /** The text under the title: why, and what to do. A tool's output, with its line breaks, goes in a `<Text pre>`. */
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
function Note({ tone = "info", announce = true, title, children, items, actions, className, ...props }: NoteProps) {
  const words = useWords()
  // A tone outside the four (from data) is information.
  const known: NoteTone = Object.prototype.hasOwnProperty.call(TONES, tone) ? tone : "info"
  const look = TONES[known]
  // The word of an error is the one an error toast says; the other three are the note's own.
  const word = known === "error" ? words.common.error : words.note[known]
  const hasBody = children != null && children !== false && children !== ""
  return (
    <div
      // A new tone is a new note: every screen reader reads a node put in the page with `role="alert"`; not all of
      // them read a node already there that takes the role, or whose text changes.
      key={known}
      data-slot="note"
      data-tone={known}
      {...props}
      role={look.announced && announce ? "alert" : undefined}
      className={cn("flex w-full items-start gap-3 rounded-lg p-4 text-sm text-ink wrap-anywhere", look.surface, className)}
    >
      <span data-slot="note-icon" className={cn("flex h-5 shrink-0 items-center", look.mark)}>
        <Icon name={look.icon} />
      </span>
      <div data-slot="note-content" className="flex min-w-0 flex-1 flex-col gap-1">
        <div data-slot="note-title" className={cn("font-semibold", look.title)}>
          <span className="sr-only">{word}:</span> {title}
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
