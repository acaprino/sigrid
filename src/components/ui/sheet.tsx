// SmoothUI (MIT) drawer 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/drawer.json)
// Park UI (MIT) drawer 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/drawer.ts)
// From Park's `drawer` recipe comes the elevation (lg, in place of a border: no border on the inner edge, R4) and the
// backdrop (the `drop` color, at the 40% of `BACKDROP`, the same as the dialog's). The title is 16px semibold (Park's is 20px: R7, text sizes from the toolkit's tokens).
// From SmoothUI's Drawer we keep Base UI's primitives (Root, Portal, Backdrop, Viewport, Popup, Content), the
// drag direction per side and the content marked `Drawer.Content` (a mouse drag that starts
// there does not move the sheet: the text of the fields can be selected). Removed: the 400 ms CSS transitions, the spring and the
// staggering of the children with Motion, the handle of the bottom side. The entrance (32 px from the panel edge, 200 ms) follows
// the shared Motion preference and respects reduced motion.
import * as React from "react"
import { Drawer as SheetPrimitive } from "@base-ui/react/drawer"
import { XIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { useWords } from "../../words"
import { Button, QUIET_ICON } from "./button"
import { useMotion } from "../../internal/motion"
import { BACKDROP, inTitleBar, inToasts, openState } from "../../internal/overlay"
import { useMergedRef } from "../../lib/refs"
import { usePortalContainer } from "../PortalContainer"

type SheetSide = "top" | "right" | "bottom" | "left"

const SIDE_TO_SWIPE = { bottom: "down", left: "left", right: "right", top: "up" } as const satisfies Record<
  SheetSide,
  NonNullable<React.ComponentProps<typeof SheetPrimitive.Root>["swipeDirection"]>
>

const VIEWPORT_SIDE_CLASS: Record<SheetSide, string> = {
  bottom: "items-end justify-center",
  left: "items-stretch justify-start",
  right: "items-stretch justify-end",
  top: "items-start justify-center",
}

// The offset during a drag (variables written by Base UI only while the finger moves): it follows the gesture,
// it is not an animation, and at rest it is 0.
const POPUP_SIDE_CLASS: Record<SheetSide, string> = {
// No border on the inner edge: the sheet is a raised surface and its lg shadow already draws the edge (R4).
  right: "h-full w-3/4 sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x,0px))]",
  left: "h-full w-3/4 sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x,0px))]",
  top: "h-auto w-full [transform:translateY(var(--drawer-swipe-movement-y,0px))]",
  bottom: "h-auto w-full [transform:translateY(var(--drawer-swipe-movement-y,0px))]",
}

/** `SheetContent` declares the side, the root needs the drag direction: it passes through here. */
const SideContext = React.createContext<(side: SheetSide) => void>(() => {})
/** The root says whether the sheet is modal: a non-modal one has no backdrop and leaves the page under it usable. */
const ModalContext = React.createContext(true)

/** Why a sheet asks to close: the Esc key, a press outside it, or anything else (a close button, the code). */
export type SheetCloseReason = "escape" | "outside" | "other"

type SheetProps = Omit<React.ComponentProps<typeof SheetPrimitive.Root>, "onOpenChange" | "swipeDirection"> & {
  /** `reason` is told when it closes: an app that keeps a form in the sheet may answer a press outside differently from the Esc. */
  onOpenChange?: ((open: boolean, reason: SheetCloseReason) => void) | undefined
}

/**
 * A modal sheet: focus trapped, Esc and a click outside close it, page scrolling is blocked. With `modal={false}` it
 * is a side panel beside the page: no backdrop, the focus is not trapped, the page scrolls and takes clicks, and Esc
 * or a click outside still close it (`disablePointerDismissal` keeps it open on a click outside).
 * A click on the notifications (which sit above, outside the sheet) does not close it: Base UI closes a modal only on what
 * is behind it, and here a second safeguard also cancels the closing caused by focus moving to the notifications.
 */
function Sheet({ onOpenChange, ...props }: SheetProps) {
  const [side, setSide] = React.useState<SheetSide>("right")
  return (
    <ModalContext.Provider value={props.modal !== false}>
      <SideContext.Provider value={setSide}>
      <SheetPrimitive.Root
        swipeDirection={SIDE_TO_SWIPE[side]}
        onOpenChange={(open, details) => {
          // A sheet beside the page stays when the focus goes to the page: Tab past its last control, or a click that
          // gives focus elsewhere, is not a way to dismiss it (a form in it would be lost). Esc and a click outside are.
          if (!open && details.reason === "focus-out" && props.modal === false) {
            details.cancel()
            return
          }
          const outside = details.reason === "outside-press" || details.reason === "focus-out"
          // A press on the window's bar (moving the window, its buttons) is not leaving the sheet either.
          if (!open && outside && (inToasts(details.event?.target) || inTitleBar(details.event?.target))) {
            details.cancel()
            return
          }
          onOpenChange?.(open, details.reason === "escape-key" ? "escape" : details.reason === "outside-press" ? "outside" : "other")
        }}
        {...props}
      />
      </SideContext.Provider>
    </ModalContext.Provider>
  )
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Backdrop>) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn("fixed inset-0 z-50", BACKDROP, className)} {...props} />
}

type SheetContentProps = Omit<React.ComponentProps<typeof SheetPrimitive.Popup>, "className" | "finalFocus"> & {
  className?: string | undefined
  side?: SheetSide | undefined
  showCloseButton?: boolean | undefined
  /**
   * On closing, before the focus moves (like Radix's `onCloseAutoFocus`): `event.preventDefault()` says that
   * the caller has already taken care of the focus, and the sheet no longer touches it.
   */
  onCloseAutoFocus?: ((event: Event) => void) | undefined
  /** Animate the entrance from the configured edge. Inherits the provider preference. */
  animated?: boolean | undefined
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onCloseAutoFocus,
  animated,
  ref,
  ...props
}: SheetContentProps) {
  const setSide = React.useContext(SideContext)
  const modal = React.useContext(ModalContext)
  // As the dialog: inside part of the app drawn elsewhere (another document, the layer of a window's frame) the sheet opens there.
  const container = usePortalContainer()
  const words = useWords()
  React.useLayoutEffect(() => setSide(side), [setSide, side])
  const motion = useMotion(animated)
  // The latest value of what the stable references below read.
  const latest = React.useRef({ motion, onCloseAutoFocus, initialFocus: props.initialFocus })
  latest.current = { motion, onCloseAutoFocus, initialFocus: props.initialFocus }
  const popup = React.useRef<HTMLDivElement | null>(null)
  const before = React.useRef<Element | null>(null)
  const entered = React.useRef<Element | null>(null)
  // Stable reference: React calls it once when the sheet mounts (the opening, a user gesture) and not on
  // every render; the Motion piece that arrives after opening does not make an already open sheet move.
  const enter = React.useCallback(
    (el: HTMLDivElement | null) => {
      popup.current = el
      if (!el) return
      before.current = el.ownerDocument.activeElement
      // Base UI sets the initial focus one frame later (microtask + requestAnimationFrame): a key pressed
      // right away would go elsewhere. Here it goes right away to the requested element; Base UI then finds it already inside and does not move it.
      const initial = latest.current.initialFocus
      if (initial && typeof initial === "object") initial.current?.focus()
      // Once per element: a reference called again on the same sheet (React does it in development) is not a new opening.
      if (entered.current !== el) latest.current.motion?.enterSheet(el, side)
      entered.current = el
    },
    [side]
  )
  // The caller's ref gets the sheet too, without taking the place of the entrance and the focus above.
  const popupRef = useMergedRef(enter, ref)
  // On closing the sheet decides the focus, as Radix did: after one turn (the sheet is unmounted and the page is no
  // longer `aria-hidden`), first the caller's handler, then, if it did not decide, the element that had focus before
  // opening. Base UI calls this function even if one of its effects restarts with the sheet open: then nothing is done.
  const finalFocus = React.useCallback(() => {
    setTimeout(() => {
      const el = popup.current
      if (el && el.isConnected && !el.hasAttribute("data-closed")) return
      const event = new Event("closeAutoFocus", { cancelable: true })
      latest.current.onCloseAutoFocus?.(event)
      const target = before.current
      if (!event.defaultPrevented && target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true })
    }, 0)
    return false
  }, [])
  return (
    <SheetPortal container={container}>
      {modal ? <SheetOverlay /> : null}
      {/* Non-modal: the viewport still places the sheet, but only the sheet takes the pointer. */}
      <SheetPrimitive.Viewport data-slot="sheet-viewport" data-modal={modal ? undefined : "false"} className={cn("fixed inset-0 z-50 flex", !modal && "pointer-events-none", VIEWPORT_SIDE_CLASS[side])}>
        <SheetPrimitive.Popup
          ref={popupRef}
          data-slot="sheet-content"
          data-side={side}
          finalFocus={finalFocus}
          // The sheet itself is the `Drawer.Content`: a single element, with the caller's classes, and `data-state` as
          // every overlay of the toolkit (`openState`).
          render={(renderProps, state) => <SheetPrimitive.Content {...renderProps} data-state={openState(state)} />}
          className={cn(
            "pointer-events-auto relative flex flex-col gap-4 bg-background shadow-lg outline-none data-swiping:select-none",
            POPUP_SIDE_CLASS[side],
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" />}
              className={cn("absolute top-3 right-3 pointer-coarse:top-1.5 pointer-coarse:right-1.5", QUIET_ICON)}
            >
              <XIcon aria-hidden="true" className="size-4" />
              <span className="sr-only">{words.common.close}</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
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
