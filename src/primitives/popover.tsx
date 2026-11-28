// Park UI (MIT) popover 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/popover.ts)
// From Park's `popover` recipe comes the form: l3 corners, the lg elevation in place of a border, 16px of padding, 320px
// wide (Park's `xs`), the title 16px medium.
// Behaviour: Ark UI's Popover (`@ark-ui/react/popover`: Root, Trigger, Anchor, Positioner, Content). The parts stay as
// before (`Popover`, `PopoverTrigger` with `asChild`, `PopoverContent` with `align`/`side`/`sideOffset`, `PopoverAnchor`,
// `PopoverHeader`/`Title`/`Description`). With `animated` true (off by default, never with prefers-reduced-motion) the
// card enters with a short fade. Non-modal: Esc or a click outside close it and focus returns to the button; the button
// carries `data-state="open"|"closed"`.
// A card that belongs to something that is not its button (the filters under a search field, the suggestions of a
// text box) needs no `PopoverTrigger`: the app opens it (`open`, `onOpenChange`) and says what it hangs from, with
// `PopoverAnchor` around that thing or, when it is drawn elsewhere, with `anchor` on the `Popover`. The anchor is part
// of the popover: a press on it, or the focus going to it, is not «outside» and does not close the card. To leave the
// focus where the user is typing, `PopoverContent initialFocus={false}`; Esc still closes the card, and the focus
// stays in the field. `width` is the card's width on the toolkit's scale; a long card scrolls in a `ScrollArea bounded`.
import * as React from "react"
import { Popover as PopoverPrimitive } from "@ark-ui/react/popover"
import { cn } from "../lib/utils"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"
import { inToasts } from "../internal/overlay"
import { OverlayPortal } from "../internal/portal"
import { Tooltip } from "./tooltip"

type Side = "top" | "right" | "bottom" | "left"
type Align = "start" | "center" | "end"

type ContentConfig = {
  side: Side
  align: Align
  sideOffset: number
  alignOffset?: number | undefined
  collisionPadding?: number | undefined
  initialFocus?: boolean | undefined
}

type PopoverState = {
  open: boolean
  setAnchor: (el: Element | null) => void
  setConfig: (next: ContentConfig) => void
  /** The id of the popover's button, shared with its hint (`PopoverTrigger hint`). */
  triggerId: string
}

const PopoverStateContext = React.createContext<PopoverState | null>(null)

function placementOf(side: Side, align: Align): `${Side}` | `${Side}-start` | `${Side}-end` {
  return align === "center" ? side : `${side}-${align}`
}

type PopoverProps = {
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  modal?: boolean | undefined
  children?: React.ReactNode
  /**
   * What the card hangs from, when it is not its button and is drawn outside the popover (a search field in a bar):
   * the element, or a `ref` to it. The card is placed against it, and a press on it or the focus going to it does not
   * close the card. For a thing drawn inside the popover, `PopoverAnchor` around it does the same.
   */
  anchor?: Element | null | React.RefObject<Element | null> | undefined
}

/** True for what happened on `anchor` or inside it. */
const within = (anchor: Element | null, target: EventTarget | null | undefined): boolean =>
  anchor !== null && target instanceof Node && anchor.contains(target)

/** True for a press inside a nested floating overlay or notification stack opened alongside the popover. */
const inNestedOverlay = (target: EventTarget | null | undefined): boolean =>
  inToasts(target) ||
  (target instanceof Element &&
    target.closest(
      '[data-slot="select-content"], [data-slot="combobox-content"], [data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"], [data-slot="popover-content"]',
    ) !== null)

function Popover({ open: openProp, defaultOpen = false, onOpenChange, modal = false, anchor: given, children }: PopoverProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const [wrapped, setAnchor] = React.useState<Element | null>(null)
  const [config, setConfig] = React.useState<ContentConfig>({ side: "bottom", align: "center", sideOffset: 4 })
  const open = openProp ?? inner

  const anchorNow = React.useCallback((): Element | null => {
    if (given !== undefined && given !== null) return "current" in given ? given.current : given
    return wrapped
  }, [given, wrapped])

  const positioning = React.useMemo(() => {
    const hasAnchor = given !== undefined && given !== null ? true : wrapped !== null
    return {
      placement: placementOf(config.side, config.align),
      gutter: config.sideOffset,
      ...(config.alignOffset !== undefined ? { offset: { crossAxis: config.alignOffset } } : {}),
      ...(config.collisionPadding !== undefined ? { overflowPadding: config.collisionPadding } : {}),
      ...(hasAnchor
        ? {
            getAnchorRect: () => {
              const el = anchorNow()
              return el ? el.getBoundingClientRect() : null
            },
          }
        : {}),
    }
  }, [config.side, config.align, config.sideOffset, config.alignOffset, config.collisionPadding, given, wrapped, anchorNow])

  const setConfigStable = React.useCallback((next: ContentConfig) => {
    setConfig((prev) =>
      prev.side === next.side &&
      prev.align === next.align &&
      prev.sideOffset === next.sideOffset &&
      prev.alignOffset === next.alignOffset &&
      prev.collisionPadding === next.collisionPadding &&
      prev.initialFocus === next.initialFocus
        ? prev
        : next,
    )
  }, [])

  const triggerId = `popover-trigger-${React.useId()}`
  const state = React.useMemo(() => ({ open, setAnchor, setConfig: setConfigStable, triggerId }), [open, setConfigStable, triggerId])

  const close = React.useCallback(() => {
    if (openProp === undefined) setInner(false)
    onOpenChange?.(false)
  }, [openProp, onOpenChange])

  // When `initialFocus={false}` focus stays in the anchor (e.g. a search box outside the popover): Esc on the page
  // still closes the card without closing an outer dialog/sheet or interrupting IME composition.
  React.useEffect(() => {
    if (!open || config.initialFocus !== false) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, config.initialFocus, close])

  return (
    <PopoverStateContext.Provider value={state}>
      <PopoverPrimitive.Root
        ids={{ trigger: triggerId }}
        open={open}
        modal={modal}
        autoFocus={config.initialFocus !== false}
        lazyMount
        unmountOnExit
        positioning={positioning}
        onInteractOutside={(event) => {
          const target = event.detail.originalEvent.target
          if (within(anchorNow(), target) || inNestedOverlay(target)) {
            event.preventDefault()
          }
        }}
        onOpenChange={(details) => {
          if (openProp === undefined) setInner(details.open)
          onOpenChange?.(details.open)
        }}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverStateContext.Provider>
  )
}

type PopoverTriggerProps = React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  /**
   * The hint of an icon-only button that opens the popover (a `Tooltip` with this label). Give it here, never as a
   * `Tooltip` around the trigger: both would write their own id on the button and the popover would lose it.
   */
  hint?: string | undefined
  /** The hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

function PopoverTrigger({ asChild, children, hint, animated, ...props }: PopoverTriggerProps) {
  const ctx = React.useContext(PopoverStateContext)
  const trigger = (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" asChild={asChild} {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  )
  if (hint === undefined) return trigger
  return (
    <Tooltip label={hint} animated={animated} triggerId={ctx?.triggerId}>
      {trigger}
    </Tooltip>
  )
}

type PopoverContentProps = React.ComponentProps<"div"> & {
  align?: Align | undefined
  alignOffset?: number | undefined
  side?: Side | undefined
  sideOffset?: number | undefined
  collisionPadding?: number | undefined
  /** Set `false` to leave focus where the user is typing (for a card hanging from a search field). */
  initialFocus?: boolean | undefined
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
// Whole class names, so that Tailwind finds them in this file. `--available-width` is Ark/Popper's: the room on the card's side.
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
  initialFocus,
  animated,
  width,
  ref,
  ...props
}: PopoverContentProps) {
  const state = React.useContext(PopoverStateContext)
  const setConfig = state?.setConfig
  React.useLayoutEffect(() => {
    setConfig?.({ side, align, sideOffset, alignOffset, collisionPadding, initialFocus })
  }, [setConfig, side, align, sideOffset, alignOffset, collisionPadding, initialFocus])

  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el))
  const refs = useMergedRef(enter, ref)
  return (
    <OverlayPortal>
      <PopoverPrimitive.Positioner data-slot="popover-positioner" className="z-50 outline-none">
        <PopoverPrimitive.Content
          data-slot="popover-content"
          ref={refs}
          className={cn(
            "w-80 origin-(--transform-origin) rounded-lg bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-hidden",
            width && WIDTH_CLASS[width],
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </OverlayPortal>
  )
}

/** A reference other than the button for the card's position. */
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
