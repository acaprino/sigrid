// SmoothUI (MIT) popover 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/popover.json)
// Park UI (MIT) popover 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/popover.ts)
// From Park's `popover` recipe comes the form: l3 corners, the lg elevation in place of a border, 16px of padding, 320px
// wide (Park's `xs`), the title 16px medium.
// From SmoothUI we keep the primitive (Base UI's `Popover`: Root, Trigger, Portal, Positioner, Popup), the structure of
// `PopoverContent` (Portal + Positioner + Popup) and the classes of the card. The parts stay as before
// (`Popover`, `PopoverTrigger` with `asChild`, `PopoverContent` with `align`/`side`/`sideOffset`, `PopoverAnchor`,
// `PopoverHeader`/`Title`/`Description`), not SmoothUI's `trigger`/`children` API, so whoever uses them does not change.
// Removed: the spring and the automatic animation: with `animated` true (off by default, never with prefers-reduced-motion)
// the card enters with a short fade. As before: non-modal, Esc or a click outside close it and focus returns to the
// button; the button carries `data-state="open"|"closed"`. Closing, the card fades where the
// app turned motion on with `MotionProvider` (theme.css, `data-ending-style`, under the root's `data-motion`): the
// exit is the stylesheet's, so a card's own `animated` alone gives it the entrance only.
// A card that belongs to something that is not its button (the filters under a search field, the suggestions of a
// text box) needs no `PopoverTrigger`: the app opens it (`open`, `onOpenChange`) and says what it hangs from, with
// `PopoverAnchor` around that thing or, when it is drawn elsewhere, with `anchor` on the `Popover`. The anchor is part
// of the popover: a press on it, or the focus going to it, is not «outside» and does not close the card. To leave the
// focus where the user is typing, `PopoverContent initialFocus={false}`; Esc still closes the card, and the focus
// stays in the field. `width` is the card's width on the toolkit's scale; a long card scrolls in a `ScrollArea bounded`.
import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "../lib/utils"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"
import { renderWithOpenState } from "../internal/overlay"
import { usePortalContainer } from "../internal/portal-container"

type PopoverState = { open: boolean; anchor: Element | React.RefObject<Element | null> | null; setAnchor: (el: Element | null) => void }
const PopoverStateContext = React.createContext<PopoverState | null>(null)

type PopoverProps = Omit<PopoverPrimitive.Root.Props, "onOpenChange"> & {
  onOpenChange?: ((open: boolean, details?: PopoverPrimitive.Root.ChangeEventDetails) => void) | undefined
  /**
   * What the card hangs from, when it is not its button and is drawn outside the popover (a search field in a bar):
   * the element, or a `ref` to it. The card is placed against it, and a press on it or the focus going to it does not
   * close the card. For a thing drawn inside the popover, `PopoverAnchor` around it does the same.
   */
  anchor?: Element | null | React.RefObject<Element | null> | undefined
}

/** True for what happened on `anchor` or inside it. */
const within = (anchor: Element | null, target: EventTarget | null | undefined): boolean => anchor !== null && target instanceof Node && anchor.contains(target)

function Popover({ open: openProp, defaultOpen = false, onOpenChange, anchor: given, ...props }: PopoverProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const [wrapped, setAnchor] = React.useState<Element | null>(null)
  const open = openProp ?? inner
  // The anchor as it is now: the one given (an element, or what its `ref` holds at this moment), else `PopoverAnchor`'s.
  const anchorNow = (): Element | null => (given === undefined || given === null ? wrapped : "current" in given ? given.current : given)
  const handleOpenChange = (next: boolean, details: PopoverPrimitive.Root.ChangeEventDetails) => {
    // The anchor is part of the popover: a press on it, or the focus going to it, does not leave the card.
    if (!next) {
      const event = details.event as Event & { relatedTarget?: EventTarget | null }
      const at = anchorNow()
      if ((details.reason === "outside-press" && within(at, event.target)) || (details.reason === "focus-out" && within(at, event.relatedTarget))) {
        details.cancel()
        return
      }
    }
    if (openProp === undefined) setInner(next)
    onOpenChange?.(next, details)
  }
  const anchor = given ?? wrapped
  const state = React.useMemo(() => ({ open, anchor, setAnchor }), [open, anchor])
  return (
    <PopoverStateContext.Provider value={state}>
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props} />
    </PopoverStateContext.Provider>
  )
}

type PopoverTriggerProps = PopoverPrimitive.Trigger.Props & { asChild?: boolean | undefined }

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  const state = React.useContext(PopoverStateContext)
  const child = asChild && React.isValidElement(children) ? (children as React.ReactElement<Record<string, unknown>>) : null
  const nativeButton = child ? (typeof child.type === "string" ? child.type === "button" : true) : undefined
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      data-state={state?.open ? "open" : "closed"}
      {...props}
      {...(child ? { render: child, nativeButton } : {})}
    >
      {child ? undefined : children}
    </PopoverPrimitive.Trigger>
  )
}

type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"> & {
    /**
     * The card enters with a short fade (off by default, never with prefers-reduced-motion). Its fade on closing is
     * the app's `MotionProvider animated`, as for every surface.
     */
    animated?: boolean | undefined
    /** How wide the card is: absent, 320px; `sm` 384px, `md` 448px, `lg` 512px, `xl` 576px, and never wider than the room the window leaves. */
    width?: PopoverWidth | undefined
  }

/** The widths of a card above its own 320px: steps of the scale, named with the toolkit's words for a size (as `SheetWidth`). */
type PopoverWidth = "sm" | "md" | "lg" | "xl"
// Whole class names, so that Tailwind finds them in this file. `--available-width` is Base UI's: the room on the card's side.
const WIDTH_CLASS: Record<PopoverWidth, string> = {
  sm: "w-sm max-w-(--available-width)",
  md: "w-md max-w-(--available-width)",
  lg: "w-lg max-w-(--available-width)",
  xl: "w-xl max-w-(--available-width)",
}

function PopoverContent({
  className,
  align = "center",
  alignOffset,
  side = "bottom",
  sideOffset = 4,
  collisionPadding,
  animated,
  width,
  ref,
  ...props
}: PopoverContentProps) {
  const container = usePortalContainer()
  const state = React.useContext(PopoverStateContext)
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el))
  const refs = useMergedRef(enter, ref)
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        className="z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        {...(state?.anchor ? { anchor: state.anchor } : {})}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          render={renderWithOpenState}
          ref={refs}
          className={cn(
            "w-80 origin-(--transform-origin) rounded-lg bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-hidden",
            width && WIDTH_CLASS[width],
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

/** A reference other than the button for the card's position (Base UI has no such part: the Positioner's `anchor`). */
function PopoverAnchor({ ref, ...props }: React.ComponentProps<"div">) {
  const setAnchor = React.useContext(PopoverStateContext)?.setAnchor
  const refs = useMergedRef(setAnchor, ref)
  return <div data-slot="popover-anchor" ref={refs} {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-1.5 text-sm", className)} {...props} />
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-title" className={cn("text-base font-semibold", className)} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="popover-description" className={cn("text-muted-foreground", className)} {...props} />
}

export type { PopoverWidth }
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription }
