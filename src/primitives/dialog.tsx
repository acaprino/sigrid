// Park UI (MIT) dialog 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/dialog.ts)
// From Park's `dialog` recipe comes the form: the window on the raised sheet with l3 corners and the lg elevation in
// place of a border, 16px of padding (24px from 768px) and as much between its parts; the backdrop is the toolkit's one
// backdrop (`BACKDROP`: the elevation's `drop` color at 40%, the same for every overlay that dims); the close button is a
// 36px plain icon button (Park's sm), muted at rest and the ink under the pointer, like the sheet's. The title is 16px
// semibold (Park's is 18px: R7, text sizes from the toolkit's tokens) and the header is aligned to the start at every width.
// Behaviour: Ark UI's Dialog (`@ark-ui/react/dialog`: Root, Trigger, Backdrop, Positioner, Content, Title, Description,
// CloseTrigger). Colors and borders are the tokens from `theme.css`.
import * as React from "react"
import { Dialog as DialogPrimitive } from "@ark-ui/react/dialog"
import { Icon } from "../icons"

import { cn } from "../lib/utils"
import { useWords } from "../words"
import { Button, QUIET_ICON } from "./button"
import { BACKDROP, TOASTS_ATTR, inTitleBar, inToasts } from "../internal/overlay"
import { OverlayPortal } from "../internal/portal"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"

type FocusConfig = {
  initialFocus?: React.RefObject<HTMLElement | null> | false | undefined
  finalFocus?: (() => boolean | HTMLElement | null | void) | React.RefObject<HTMLElement | null> | false | undefined
}

const DialogFocusContext = React.createContext<(next: FocusConfig) => void>(() => {})

type RootProps = Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "onOpenChange"> & {
  onOpenChange?: ((open: boolean) => void) | undefined
}

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, onInteractOutside, ...props }: RootProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const [focusConfig, setFocusConfig] = React.useState<FocusConfig>({})
  const wasOpen = React.useRef(open)

  const setFocusStable = React.useCallback((next: FocusConfig) => {
    setFocusConfig((prev) =>
      prev.initialFocus === next.initialFocus && prev.finalFocus === next.finalFocus ? prev : next,
    )
  }, [])

  // When a caller provides a custom `finalFocus` handler (such as `components/Dialog`'s `useCloseFocus`),
  // run it when the dialog transitions from open to closed.
  React.useEffect(() => {
    const prev = wasOpen.current
    wasOpen.current = open
    if (prev && !open && typeof focusConfig.finalFocus === "function") {
      focusConfig.finalFocus()
    }
  }, [open, focusConfig.finalFocus])

  const disableRestore = typeof focusConfig.finalFocus === "function" || focusConfig.finalFocus === false
  const finalFocusEl =
    focusConfig.finalFocus && typeof focusConfig.finalFocus === "object"
      ? () => (focusConfig.finalFocus && typeof focusConfig.finalFocus === "object" ? focusConfig.finalFocus.current : null)
      : undefined
  const initialFocusEl =
    focusConfig.initialFocus === false
      ? () => false as const
      : focusConfig.initialFocus && typeof focusConfig.initialFocus === "object"
        ? () => (focusConfig.initialFocus && typeof focusConfig.initialFocus === "object" ? focusConfig.initialFocus.current : null)
        : undefined

  const persistentElements = React.useMemo(
    () => [() => document.querySelector<HTMLElement>(`[${TOASTS_ATTR}]`)],
    [],
  )

  return (
    <DialogFocusContext.Provider value={setFocusStable}>
      <DialogPrimitive.Root
        {...props}
        open={open}
        lazyMount
        unmountOnExit
        immediate
        restoreFocus={!disableRestore}
        persistentElements={persistentElements}
        {...(initialFocusEl ? { initialFocusEl } : {})}
        {...(finalFocusEl ? { finalFocusEl } : {})}
        onInteractOutside={(event) => {
          onInteractOutside?.(event)
          const target = event.detail.originalEvent.target
          // A click on a notification (undoing) or on the window's title bar (moving/minimizing) does not leave the dialog.
          if (inToasts(target) || inTitleBar(target)) {
            event.preventDefault()
          }
        }}
        onOpenChange={(details) => {
          if (openProp === undefined) setInner(details.open)
          onOpenChange?.(details.open)
        }}
      />
    </DialogFocusContext.Provider>
  )
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ children, container }: { children: React.ReactNode; container?: HTMLElement | null | undefined }) {
  return <OverlayPortal container={container}>{children}</OverlayPortal>
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.CloseTrigger>) {
  return <DialogPrimitive.CloseTrigger data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
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

/** Immediate initial focus when the panel mounts so a key pressed right away lands inside the dialog. */
function focusFirst(el: HTMLDivElement | null) {
  if (!el || el.contains(el.ownerDocument.activeElement)) return
  const first = Array.from(el.querySelectorAll<HTMLElement>(TABBABLE)).find((c) => !c.closest("[hidden], [inert]"))
  ;(first ?? el).focus({ preventScroll: first === undefined })
}

/**
 * The widest a centred dialog grows, from the `sm` width of the window up (under it, the window less a margin):
 * `md` 512px, a name or a confirmation (the default); `lg` 672px, a form of several fields; `xl` 896px, a list or a
 * table to choose from. Steps of the scale, named with the toolkit's words for a size.
 */
export type DialogWidth = "md" | "lg" | "xl"
// Whole class names, so that Tailwind finds them in this file.
const WIDTH_CLASS: Record<DialogWidth, string> = { md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ref,
  animated,
  width = "md",
  initialFocus,
  finalFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  animated?: boolean | undefined
  /** How wide the window grows on a wide screen: `md` by default (see `DialogWidth`). */
  width?: DialogWidth | undefined
  initialFocus?: FocusConfig["initialFocus"]
  finalFocus?: FocusConfig["finalFocus"]
}) {
  const setFocus = React.useContext(DialogFocusContext)
  React.useLayoutEffect(() => {
    setFocus({ initialFocus, finalFocus })
  }, [setFocus, initialFocus, finalFocus])

  const words = useWords()
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterDialog(el))
  const autoFocus = initialFocus === undefined
  const first = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (autoFocus) focusFirst(el)
    },
    [autoFocus],
  )
  const popupRef = useMergedRef(enter, first, ref)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Positioner
        data-slot="dialog-positioner"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <DialogPrimitive.Content
          ref={popupRef}
          data-slot="dialog-content"
          aria-modal="true"
          className={cn(
            // Centred without a translation: a translated window would be the containing block of what is `fixed` inside it (the date card), and its scrolling would clip it.
            "pointer-events-auto relative grid h-fit max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] gap-6 overflow-y-auto rounded-lg bg-raised p-4 text-sm shadow-lg outline-none md:p-6",
            WIDTH_CLASS[width],
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.CloseTrigger asChild data-slot="dialog-close">
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn("absolute top-3 end-3 pointer-coarse:top-1.5 pointer-coarse:end-1.5", QUIET_ICON)}
              >
                <Icon name="close" />
                <span className="sr-only">{words.common.close}</span>
              </Button>
            </DialogPrimitive.CloseTrigger>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Positioner>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-start", className)}
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
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
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
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
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
