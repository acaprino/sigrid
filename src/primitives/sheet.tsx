// Park UI (MIT) drawer 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/drawer.ts)
// From Park's `drawer` recipe comes the elevation (lg, in place of a border: no border on the inner edge, R4) and the
// backdrop (the `drop` color, at the 40% of `BACKDROP`, the same as the dialog's). The title is 16px semibold (Park's
// is 20px: R7, text sizes from the toolkit's tokens).
// Behaviour: Ark UI's Drawer (`@ark-ui/react/drawer`: Root, Trigger, Backdrop, Positioner, Content, Title, Description,
// CloseTrigger). The entrance (32 px from the panel edge, 200 ms) follows the shared Motion preference and respects
// reduced motion.
import * as React from "react"
import { Drawer as SheetPrimitive } from "@ark-ui/react/drawer"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { useWords } from "../words"
import { Button, QUIET_ICON } from "./button"
import { useMotion } from "../internal/motion"
import { BACKDROP, inTitleBar, inToasts, keepWindowOpen, leaveEscape } from "../internal/overlay"
import { useMergedRef } from "../lib/refs"
import { OverlayPortal } from "../internal/portal"

type SheetSide = "top" | "right" | "bottom" | "left"

const SIDE_TO_SWIPE = { bottom: "down", left: "start", right: "end", top: "up" } as const satisfies Record<
  SheetSide,
  NonNullable<React.ComponentProps<typeof SheetPrimitive.Root>["swipeDirection"]>
>

const VIEWPORT_SIDE_CLASS: Record<SheetSide, string> = {
  bottom: "items-end justify-center",
  left: "items-stretch justify-start",
  right: "items-stretch justify-end",
  top: "items-start justify-center",
}

const POPUP_SIDE_CLASS: Record<SheetSide, string> = {
  // No border on the inner edge: the sheet is a raised surface and its lg shadow already draws the edge (R4).
  right: "h-full w-3/4",
  left: "h-full w-3/4",
  top: "h-auto w-full",
  bottom: "h-auto w-full",
}

/**
 * The widest a sheet at the side grows, from the `sm` width of the window up (under it, three quarters of the window):
 * `sm` 384px, a form of a few fields (the default); `md` 448px, a message being written beside the mail; `lg` 512px,
 * the width of a dialog. Steps of the scale, named with the toolkit's words for a size. A sheet at the top or the foot
 * is as wide as the window, whatever its width.
 */
export type SheetWidth = "sm" | "md" | "lg"
// Whole class names, so that Tailwind finds them in this file.
const SIDE_WIDTH_CLASS: Record<SheetWidth, string> = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" }

type SheetContextValue = {
  setSide: (side: SheetSide) => void
  setInitialFocus: (next: React.RefObject<HTMLElement | null> | false | undefined) => void
  modal: boolean
  open: boolean
}

const SheetContext = React.createContext<SheetContextValue>({ setSide: () => {}, setInitialFocus: () => {}, modal: true, open: false })

/** Why a sheet asks to close: the Esc key, a press outside it, or anything else (a close button, the code). */
export type SheetCloseReason = "escape" | "outside" | "other"

type SheetProps = Omit<React.ComponentProps<typeof SheetPrimitive.Root>, "onOpenChange" | "swipeDirection"> & {
  /** `reason` is told when it closes: an app that keeps a form in the sheet may answer a press outside differently from the Esc. */
  onOpenChange?: ((open: boolean, reason: SheetCloseReason) => void) | undefined
  /** Keep the sheet open on a press outside it (for a side panel that stays while clicking the page). */
  disablePointerDismissal?: boolean | undefined
  /**
   * Asked at each Esc: false leaves the sheet open and the key to what has the focus and to the app's commands (the
   * `Inspector` beside the page answers it so, when the focus is not in it). Absent: Esc always closes the sheet.
   */
  closesOnEscape?: (() => boolean) | undefined
}

/**
 * A modal sheet: focus trapped, Esc and a click outside close it, page scrolling is blocked. With `modal={false}` it
 * is a side panel beside the page: no backdrop, the focus is not trapped, the page scrolls and takes clicks, and Esc
 * or a click outside still close it (`disablePointerDismissal` keeps it open on a click outside).
 * A click on the notifications (which sit above, outside the sheet) or on the window's title bar does not close it.
 */
function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closesOnEscape,
  disablePointerDismissal = false,
  modal = true,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onRequestDismiss,
  ...props
}: SheetProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const [side, setSide] = React.useState<SheetSide>("right")
  const [initialFocus, setInitialFocus] = React.useState<React.RefObject<HTMLElement | null> | false | undefined>(undefined)
  const reasonRef = React.useRef<SheetCloseReason>("other")
  const latest = React.useRef({ closesOnEscape, onOpenChange, controlled: openProp !== undefined })
  latest.current = { closesOnEscape, onOpenChange, controlled: openProp !== undefined }
  const ctx = React.useMemo(() => ({ setSide, setInitialFocus, modal, open }), [modal, open])

  // When `closesOnEscape` is given, handle Escape in capture phase on `window` (before Zag's document capture listener)
  // so a `true` answer closes the sheet with reason `"escape"`.
  React.useEffect(() => {
    if (!open || !latest.current.closesOnEscape) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (!latest.current.closesOnEscape?.()) return
      event.preventDefault()
      if (!latest.current.controlled) setInner(false)
      latest.current.onOpenChange?.(false, "escape")
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, closesOnEscape !== undefined])

  const initialFocusEl =
    initialFocus === false
      ? () => false as const
      : initialFocus && typeof initialFocus === "object"
        ? () => initialFocus.current
        : undefined

  return (
    <SheetContext.Provider value={ctx}>
      <SheetPrimitive.Root
        {...props}
        // A modal sheet is a window: a menu that closes under it does not take it along. A panel is not.
        onRequestDismiss={modal ? keepWindowOpen(onRequestDismiss) : onRequestDismiss}
        open={open}
        modal={modal}
        trapFocus={modal}
        preventScroll={modal}
        restoreFocus={false}
        lazyMount
        unmountOnExit
        immediate
        closeOnEscape={closesOnEscape === undefined}
        closeOnInteractOutside={!disablePointerDismissal}
        swipeDirection={SIDE_TO_SWIPE[side]}
        {...(initialFocusEl ? { initialFocusEl } : {})}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          // Asked, and the answer was no (an answer yes closed the sheet in the listener above, and marked the key
          // handled): Ark marks the key handled all the same, so the app's commands are told it is theirs.
          if (closesOnEscape !== undefined && !event.defaultPrevented && !latest.current.closesOnEscape?.()) leaveEscape(event)
          if (closesOnEscape === undefined && !event.defaultPrevented) {
            reasonRef.current = "escape"
            // Zag dispatches `onOpenChange` in a microtask; clear only on the next macrotask if it did not close.
            setTimeout(() => {
              if (reasonRef.current === "escape") reasonRef.current = "other"
            }, 0)
          }
        }}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          const target = event.detail.originalEvent.target
          if (inToasts(target) || inTitleBar(target)) {
            event.preventDefault()
            return
          }
          if (!disablePointerDismissal && !event.defaultPrevented) {
            reasonRef.current = "outside"
            setTimeout(() => {
              if (reasonRef.current === "outside") reasonRef.current = "other"
            }, 0)
          }
        }}
        onFocusOutside={(event) => {
          onFocusOutside?.(event)
          // A sheet beside the page stays when focus moves to the page: Tab past its last control is not a dismiss.
          if (!modal) {
            event.preventDefault()
            return
          }
          const target = event.detail.originalEvent.target
          if (inToasts(target) || inTitleBar(target)) {
            event.preventDefault()
          }
        }}
        onOpenChange={(details) => {
          if (details.open === open) return
          const reason = details.open ? "other" : reasonRef.current
          reasonRef.current = "other"
          if (openProp === undefined) setInner(details.open)
          onOpenChange?.(details.open, reason)
        }}
      />
    </SheetContext.Provider>
  )
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.CloseTrigger>) {
  return <SheetPrimitive.CloseTrigger data-slot="sheet-close" {...props} />
}

function SheetPortal({ children, container }: { children: React.ReactNode; container?: HTMLElement | null | undefined }) {
  return <OverlayPortal container={container}>{children}</OverlayPortal>
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Backdrop>) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn("fixed inset-0 z-50", BACKDROP, className)} {...props} />
}

type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  className?: string | undefined
  side?: SheetSide | undefined
  /** At the side (`left`, `right`): the widest it grows, `sm` 384px (the default), `md` 448px, `lg` 512px. Ignored at the top or the foot. */
  width?: SheetWidth | undefined
  /**
   * On a narrow window the sheet covers it all (a message being read, a file being looked at): it is then that
   * window's page, on the page's ground; from the `sm` width up it is a raised surface at the side, as wide as
   * `width` or the caller's own `max-w-*`.
   */
  cover?: boolean | undefined
  showCloseButton?: boolean | undefined
  /** Element to focus right away when the sheet mounts. */
  initialFocus?: React.RefObject<HTMLElement | null> | false | undefined
  /**
   * On closing, before the focus moves: `event.preventDefault()` says that the caller has already taken care of the
   * focus, and the sheet no longer touches it.
   */
  onCloseAutoFocus?: ((event: Event) => void) | undefined
  /** Animate the entrance from the configured edge. Inherits the provider preference. */
  animated?: boolean | undefined
}

function SheetContent({
  className,
  children,
  side = "right",
  width = "sm",
  cover = false,
  showCloseButton = true,
  initialFocus,
  onCloseAutoFocus,
  animated,
  ref,
  ...props
}: SheetContentProps) {
  const { setSide, setInitialFocus, modal, open } = React.useContext(SheetContext)
  const words = useWords()
  React.useLayoutEffect(() => setSide(side), [setSide, side])
  React.useLayoutEffect(() => setInitialFocus(initialFocus), [setInitialFocus, initialFocus])
  const motion = useMotion(animated)
  const latest = React.useRef({ motion, onCloseAutoFocus, initialFocus, open })
  latest.current = { motion, onCloseAutoFocus, initialFocus, open }
  const popup = React.useRef<HTMLDivElement | null>(null)
  const before = React.useRef<Element | null>(null)
  const entered = React.useRef<Element | null>(null)
  const captured = React.useRef(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Capture the active element once per opening during render (before Ark's focus effects move focus inside the sheet).
  if (open && !captured.current) {
    captured.current = true
    if (typeof document !== "undefined") before.current = document.activeElement
  } else if (!open && captured.current) {
    captured.current = false
  }

  React.useEffect(() => {
    return () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    }
  }, [])

  // Stable reference: called once when the sheet mounts (the opening, a user gesture) and when it unmounts (closing).
  const enter = React.useCallback(
    (el: HTMLDivElement | null) => {
      const prev = popup.current
      popup.current = el
      if (!el) {
        if (prev && !latest.current.open) {
          const target = before.current
          if (closeTimer.current !== null) clearTimeout(closeTimer.current)
          closeTimer.current = setTimeout(() => {
            closeTimer.current = null
            if (latest.current.open) return
            const event = new Event("closeAutoFocus", { cancelable: true })
            latest.current.onCloseAutoFocus?.(event)
            if (!event.defaultPrevented && target instanceof HTMLElement && target.isConnected) {
              target.focus({ preventScroll: true })
            }
          }, 0)
        }
        return
      }
      if (!before.current) before.current = el.ownerDocument.activeElement
      // Only for a sheet that has just opened: Ark composes the content's ref again at a render, so the same element
      // comes back here while the person types in it, and the focus must stay where they put it.
      if (entered.current !== el) {
        const initial = latest.current.initialFocus
        if (initial && typeof initial === "object") initial.current?.focus()
        latest.current.motion?.enterSheet(el, side)
      }
      entered.current = el
    },
    [side],
  )
  const popupRef = useMergedRef(enter, ref)

  return (
    <SheetPortal>
      {modal ? <SheetOverlay /> : null}
      {/* Non-modal: the viewport still places the sheet, but only the sheet takes the pointer. */}
      <SheetPrimitive.Positioner
        data-slot="sheet-viewport"
        data-modal={modal ? undefined : "false"}
        className={cn("fixed inset-0 z-50 flex", !modal && "pointer-events-none", VIEWPORT_SIDE_CLASS[side])}
      >
        <SheetPrimitive.Content
          ref={popupRef}
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            // A sheet floats over the page: the raised surface (DESIGN.md), told from the page in dark too. One that covers
            // the whole of a narrow window is that window's page, on the page's ground, and a raised surface from `sm` up.
            "pointer-events-auto relative flex flex-col gap-4 bg-raised shadow-lg outline-none data-dragging:select-none",
            POPUP_SIDE_CLASS[side],
            (side === "left" || side === "right") && SIDE_WIDTH_CLASS[width],
            // After the side's own width, which it replaces.
            cover && "w-full max-sm:bg-paper",
            className,
          )}
          {...props}
        >
          {/* A sheet at the foot is pulled down to close: the short bar at its top says so, as on a phone. */}
          {side === "bottom" ? <span aria-hidden="true" data-slot="sheet-handle" className="pointer-events-none absolute inset-x-0 top-2 mx-auto h-1 w-9 rounded-full bg-ink/20" /> : null}
          {children}
          {showCloseButton && (
            <SheetPrimitive.CloseTrigger asChild data-slot="sheet-close">
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn("absolute top-3 end-3", QUIET_ICON)}
              >
                <Icon name="close" />
                <span className="sr-only">{words.common.close}</span>
              </Button>
            </SheetPrimitive.CloseTrigger>
          )}
        </SheetPrimitive.Content>
      </SheetPrimitive.Positioner>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-base font-semibold text-foreground", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
