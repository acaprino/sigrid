// SmoothUI (MIT) dialog 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/dialog.json)
// Park UI (MIT) dialog 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/dialog.ts)
// From Park's `dialog` recipe comes the form: the window on the raised sheet with l3 corners and the lg elevation in
// place of a border, 16px of padding (24px from 768px) and as much between its parts; the backdrop is the toolkit's one
// backdrop (`BACKDROP`: the elevation's `drop` color at 40%, the same for every overlay that dims); the close button is a 36px plain icon button (Park's sm), muted at rest and
// the ink under the pointer, like the sheet's. The title is 16px semibold (Park's is 18px: R7, text sizes from the
// toolkit's tokens) and the header is aligned to the start at every width.
//
// From the SmoothUI source we keep the Base UI primitives (`Root`, `Portal`, `Backdrop`, `Popup`, `Title`, `Description`,
// `Close`), the layout parts (`DialogHeader`, `DialogFooter`) and the panel structure. Removed: `AlertDialog`,
// `trigger` and the internal state with `AnimatePresence`, the staggered entrance of the children, the spring and the
// rotation of the X on hover, the blur of the page behind the window (decorative effects). The public `Dialog` has no `animated` prop:
// here there is no animation and Motion is not imported. Colors and borders are the tokens from `theme.css`.
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { useWords } from "../../words"
import { FOCUS_RING } from "../../lib/focus"
import { BACKDROP, ignoreToasts, inTitleBar } from "../../internal/overlay"
import { usePortalContainer } from "../PortalContainer"
import { useEntrance } from "../../internal/motion"

type RootProps = React.ComponentProps<typeof DialogPrimitive.Root>
type ChangeDetails = Parameters<NonNullable<RootProps["onOpenChange"]>>[1]

/**
 * A click on a notification does not close the window: the user is undoing the last action, not leaving the window.
 * Base UI closes a modal only for a click on its backdrop (or on an ancestor of the panel), so the notification, which sits
 * above the backdrop, already does not close it; this is the second check, the same one the sheets use (`ignoreToasts`).
 */
function isToastPress(details: ChangeDetails): boolean {
  if (details.reason !== "outside-press") return false
  // A probe event with the same target: the real click event is left untouched (a `preventDefault` on a
  // link in the notification would stop it from opening).
  const probe = new Event("interactoutside", { cancelable: true })
  Object.defineProperty(probe, "target", { value: details.event.target })
  ignoreToasts()(probe)
  return probe.defaultPrevented
}

function Dialog({ onOpenChange, ...props }: RootProps) {
  return (
    <DialogPrimitive.Root
      onOpenChange={(open, details) => {
        // Nor does a press on the window's bar: in a desktop frame the bar is outside the backdrop, and moving the
        // window is not leaving the dialog.
        if (!open && (isToastPress(details) || (details.reason === "outside-press" && inTitleBar(details.event.target)))) {
          details.cancel()
          return
        }
        onOpenChange?.(open, details)
      }}
      {...props}
    />
  )
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Backdrop>, "className"> & { className?: string }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50", BACKDROP, className)}
      {...props}
    />
  )
}

const TABBABLE =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/**
 * The initial focus right away, when the panel mounts, as Radix did: Base UI sets it one frame later
 * (microtask + `requestAnimationFrame`), and a key pressed right away would go to the page; with the window already open at
 * mount it does not set it at all. If the focus is already inside (an `autoFocus`) it stays where it is; Base UI then finds it inside
 * and does not move it. With the caller's `initialFocus`, Base UI decides.
 */
function focusFirst(el: HTMLDivElement | null) {
  if (!el || el.contains(el.ownerDocument.activeElement)) return
  const first = Array.from(el.querySelectorAll<HTMLElement>(TABBABLE)).find((c) => !c.closest("[hidden], [inert]"))
  ;(first ?? el).focus({ preventScroll: first === undefined })
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ref,
  animated,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & {
  className?: string
  showCloseButton?: boolean
  animated?: boolean | undefined
}) {
  // Inside part of the app drawn in another document (`PortalContainerProvider`) the dialog opens in that document.
  const container = usePortalContainer()
  const words = useWords()
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterDialog(el))
  const autoFocus = props.initialFocus === undefined
  const popupRef = React.useCallback((el: HTMLDivElement | null) => {
    enter(el)
    if (autoFocus) focusFirst(el)
    if (typeof ref === "function") return ref(el)
    if (ref) ref.current = el
  }, [autoFocus, enter, ref])
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popupRef}
        data-slot="dialog-content"
        // `data-state` as with Radix: the client (`openWindow`, the notifications observer) reads it to know whether a sheet,
        // a window or a menu is open. Base UI sets `data-open`/`data-closed`; this adds that one as well.
        render={(renderProps, state) => <div {...renderProps} data-state={state.open ? "open" : "closed"} />}
        // The window is always modal (focus trapped, page blocked, the rest `aria-hidden`): this is also told
        // to screen readers, which Base UI does not announce by itself.
        aria-modal="true"
        className={cn(
          // Centred with auto margins, not a translation: a translated window would be the containing block of what is `fixed` inside it (the date card), and its scrolling would clip it.
          "fixed inset-0 z-50 m-auto grid h-fit max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] gap-6 overflow-y-auto rounded-lg bg-raised p-4 text-sm shadow-lg outline-none sm:max-w-lg md:p-6",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "absolute top-3 right-3 flex size-(--control-sm) items-center justify-center rounded-md text-ink-mute pointer-coarse:top-1.5 pointer-coarse:right-1.5 pointer-coarse:size-11 hover:bg-ink/6 hover:text-ink disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              FOCUS_RING
            )}
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">{words.common.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Title>, "className"> & { className?: string }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Description>, "className"> & { className?: string }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
