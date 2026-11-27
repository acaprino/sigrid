// Park UI (MIT) menu 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/menu.ts)
// From Park's `menu` recipe comes the form (md): the card with l3 corners and the md elevation in place of a border,
// 4px of padding and 2px between items; items 40px tall with l2 corners and a quiet fill on the highlighted one.
// Behaviour: Ark UI's Menu (`@ark-ui/react/menu`: Root, Trigger, Positioner, Content, Item, CheckboxItem,
// RadioItemGroup, RadioItem, ItemGroup, Separator, TriggerItem). The parts stay as before (`DropdownMenuTrigger`,
// `DropdownMenuItem`…) with the same props (`asChild`, `onSelect`, `variant`, `inset`, `align`, `sideOffset`).
// With `animated` true (off by default, never with prefers-reduced-motion) the card enters with a short fade.
// Enter, Space and down arrow on the button open the menu with focus on the first item, arrows do not wrap by default,
// Esc closes and returns focus to the button, type-ahead comes from Ark UI, and the button carries `data-state="open"|"closed"`.
import * as React from "react"
import { Menu } from "@ark-ui/react/menu"
import { Check as CheckIcon, ChevronRight as ChevronRightIcon, Circle as CircleIcon } from "../internal/sigrid-icons"
import { cn } from "../lib/utils"
import { KEY_CAP } from "./kbd"
import { GROUP_LABEL, LIST_CARD, LIST_ROW, ROW_POPUP_OPEN } from "../lib/rows"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"
import { OverlayPortal } from "../internal/portal"

type Side = "top" | "right" | "bottom" | "left"
type Align = "start" | "center" | "end"
type VirtualAnchor = { getBoundingClientRect: () => DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number } }
type Anchor = Element | VirtualAnchor | null | undefined

type ContentConfig = {
  side: Side
  align: Align
  sideOffset: number
  alignOffset?: number | undefined
  collisionPadding?: number | undefined
  anchor?: Anchor
  finalFocus?: React.RefObject<HTMLElement | null> | undefined
}

type MenuContextValue = {
  setConfig: (next: ContentConfig) => void
  registerSelect: (value: string, fn: (() => void) | undefined) => () => void
}

const MenuStateContext = React.createContext<MenuContextValue | null>(null)

function placementOf(side: Side, align: Align): `${Side}` | `${Side}-start` | `${Side}-end` {
  return align === "center" ? side : `${side}-${align}`
}

type DropdownMenuProps = {
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  loopFocus?: boolean | undefined
  modal?: boolean | undefined
  children?: React.ReactNode
}

function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, loopFocus = false, children }: DropdownMenuProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const [config, setConfig] = React.useState<ContentConfig>({ side: "bottom", align: "center", sideOffset: 4 })
  const handlers = React.useRef(new Map<string, () => void>())

  const setConfigStable = React.useCallback((next: ContentConfig) => {
    setConfig((prev) =>
      prev.side === next.side &&
      prev.align === next.align &&
      prev.sideOffset === next.sideOffset &&
      prev.alignOffset === next.alignOffset &&
      prev.collisionPadding === next.collisionPadding &&
      prev.anchor === next.anchor &&
      prev.finalFocus === next.finalFocus
        ? prev
        : next,
    )
  }, [])

  const registerSelect = React.useCallback((value: string, fn: (() => void) | undefined) => {
    if (!fn) return () => {}
    handlers.current.set(value, fn)
    return () => {
      if (handlers.current.get(value) === fn) handlers.current.delete(value)
    }
  }, [])

  const positioning = React.useMemo(() => {
    const anchor = config.anchor
    return {
      placement: placementOf(config.side, config.align),
      gutter: config.sideOffset,
      ...(config.alignOffset !== undefined ? { offset: { crossAxis: config.alignOffset } } : {}),
      ...(config.collisionPadding !== undefined ? { overflowPadding: config.collisionPadding } : {}),
      ...(anchor
        ? {
            getAnchorRect: () => {
              const rect = anchor.getBoundingClientRect()
              return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
            },
          }
        : {}),
    }
  }, [config.side, config.align, config.sideOffset, config.alignOffset, config.collisionPadding, config.anchor])

  const state = React.useMemo(() => ({ setConfig: setConfigStable, registerSelect }), [setConfigStable, registerSelect])

  return (
    <MenuStateContext.Provider value={state}>
      <Menu.Root
        open={open}
        loopFocus={loopFocus}
        lazyMount
        unmountOnExit
        positioning={positioning}
        onSelect={(details) => {
          handlers.current.get(details.value)?.()
        }}
        onOpenChange={(details) => {
          if (openProp === undefined) setInner(details.open)
          onOpenChange?.(details.open)
          if (!details.open && config.finalFocus?.current) {
            const target = config.finalFocus.current
            queueMicrotask(() => target.focus())
          }
        }}
      >
        {children}
      </Menu.Root>
    </MenuStateContext.Provider>
  )
}

function DropdownMenuPortal({ children, container }: { children: React.ReactNode; container?: HTMLElement | null | undefined }) {
  return <OverlayPortal container={container}>{children}</OverlayPortal>
}

type DropdownMenuTriggerProps = React.ComponentProps<typeof Menu.Trigger>

function DropdownMenuTrigger({ asChild, children, ...props }: DropdownMenuTriggerProps) {
  return (
    <Menu.Trigger data-slot="dropdown-menu-trigger" asChild={asChild} {...props}>
      {children}
    </Menu.Trigger>
  )
}

/**
 * The card of a menu and of a submenu: the list's card (`LIST_CARD`) with l3 corners (Park's menu), at least 160px wide,
 * and as tall as the room the window leaves on its side (`--available-height`, Ark/Popper's): a longer menu scrolls.
 */
const CARD = cn(LIST_CARD, "max-h-(--available-height) min-w-40 origin-(--transform-origin) overflow-x-hidden rounded-lg outline-hidden")

/** A short entrance of the card (a fade, a few pixels from the side of its button), only with `animated`. */
function useEnter(animated: boolean | undefined) {
  return useEntrance<HTMLElement>(animated, (motion, el) => motion.enterPopup(el))
}

type DropdownMenuContentProps = React.ComponentProps<"div"> & {
  align?: Align | undefined
  alignOffset?: number | undefined
  side?: Side | undefined
  sideOffset?: number | undefined
  collisionPadding?: number | undefined
  anchor?: Anchor
  /** Element to restore focus to when a triggerless menu (such as `ContextMenu`) closes. */
  finalFocus?: React.RefObject<HTMLElement | null> | undefined
  /** The card enters with a short fade (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

function DropdownMenuContent({
  className,
  align = "center",
  alignOffset,
  side = "bottom",
  sideOffset = 4,
  collisionPadding,
  anchor,
  finalFocus,
  animated,
  ref,
  ...props
}: DropdownMenuContentProps) {
  const ctx = React.useContext(MenuStateContext)
  const setConfig = ctx?.setConfig
  React.useLayoutEffect(() => {
    setConfig?.({ side, align, sideOffset, alignOffset, collisionPadding, anchor, finalFocus })
  }, [setConfig, side, align, sideOffset, alignOffset, collisionPadding, anchor, finalFocus])

  const enter = useEnter(animated)
  const refs = useMergedRef<HTMLDivElement>(enter, ref)
  return (
    <OverlayPortal>
      <Menu.Positioner data-slot="dropdown-menu-positioner" className="z-50 outline-none">
        <Menu.Content
          data-slot="dropdown-menu-content"
          ref={refs}
          className={cn(CARD, className)}
          {...props}
        />
      </Menu.Positioner>
    </OverlayPortal>
  )
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof Menu.ItemGroup>) {
  return <Menu.ItemGroup data-slot="dropdown-menu-group" {...props} />
}

/** A row of the menu: the row of every list (`LIST_ROW`) with l2 corners, Park's menu item. */
const ITEM = cn(
  LIST_ROW,
  "rounded-md outline-hidden focus-visible:bg-selected/60 focus-visible:text-ink data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
)

type DropdownMenuItemProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  value?: string | undefined
  disabled?: boolean | undefined
  closeOnSelect?: boolean | undefined
  inset?: boolean | undefined
  variant?: "default" | "destructive" | undefined
  /** The item was chosen (click, Enter or Space); then the menu closes. */
  onSelect?: ((event?: React.MouseEvent<HTMLElement>) => void) | undefined
}

function DropdownMenuItem({ className, value: valueProp, disabled, closeOnSelect, inset, variant = "default", onSelect, onClick, ...props }: DropdownMenuItemProps) {
  const autoId = React.useId()
  const value = valueProp ?? autoId
  const ctx = React.useContext(MenuStateContext)
  const onSelectRef = React.useRef(onSelect)
  onSelectRef.current = onSelect

  // Register for keyboard selection (`Menu.Root onSelect`) and guard against double firing on click.
  const firedByClick = React.useRef(false)
  React.useEffect(() => {
    if (!ctx) return
    return ctx.registerSelect(value, () => {
      if (firedByClick.current) {
        firedByClick.current = false
        return
      }
      onSelectRef.current?.()
    })
  }, [ctx, value])

  return (
    <Menu.Item
      value={value}
      disabled={disabled}
      closeOnSelect={closeOnSelect}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        ITEM,
        "[&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:focus-visible:bg-destructive/10 data-[variant=destructive]:focus-visible:text-destructive data-[variant=destructive]:*:[svg]:text-destructive!",
        className,
      )}
      onClick={(event) => {
        if (disabled) return
        onClick?.(event)
        if (onSelectRef.current) {
          firedByClick.current = true
          onSelectRef.current(event)
          queueMicrotask(() => {
            firedByClick.current = false
          })
        }
      }}
      {...props}
    />
  )
}

type DropdownMenuCheckboxItemProps = Omit<React.ComponentProps<typeof Menu.CheckboxItem>, "value"> & {
  value?: string | undefined
}

function DropdownMenuCheckboxItem({ className, value: valueProp, children, ...props }: DropdownMenuCheckboxItemProps) {
  const autoId = React.useId()
  return (
    <Menu.CheckboxItem
      value={valueProp ?? autoId}
      data-slot="dropdown-menu-checkbox-item"
      className={cn(ITEM, "pe-2 ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <Menu.ItemIndicator>
          <CheckIcon className="size-4" />
        </Menu.ItemIndicator>
      </span>
      <Menu.ItemText>{children}</Menu.ItemText>
    </Menu.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ onValueChange, ...props }: Omit<React.ComponentProps<typeof Menu.RadioItemGroup>, "onValueChange"> & { onValueChange?: ((value: string) => void) | undefined }) {
  return (
    <Menu.RadioItemGroup
      data-slot="dropdown-menu-radio-group"
      onValueChange={onValueChange ? (details) => onValueChange(details.value) : undefined}
      {...props}
    />
  )
}

function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem data-slot="dropdown-menu-radio-item" className={cn(ITEM, "pe-2 ps-8", className)} {...props}>
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <Menu.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </Menu.ItemIndicator>
      </span>
      <Menu.ItemText>{children}</Menu.ItemText>
    </Menu.RadioItem>
  )
}

/**
 * The heading of a group of items ("Move to…"): plain text, as before.
 */
function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<"div"> & { inset?: boolean | undefined }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("flex h-(--row-height) items-center px-2 text-ink-mute data-[inset]:ps-8", GROUP_LABEL, className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-0.5 h-px bg-border", className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      // A key hint (R5): plain 12px muted text, hidden on a phone (narrow and with a finger).
      className={cn("ms-auto ps-4 text-2xs leading-none font-medium text-ink-mute max-md:pointer-coarse:hidden", KEY_CAP, className)}
      {...props}
    />
  )
}

type DropdownMenuSubProps = {
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  children?: React.ReactNode
}

function DropdownMenuSub({ open, defaultOpen, onOpenChange, children }: DropdownMenuSubProps) {
  const handlers = React.useRef(new Map<string, () => void>())
  const [gutter, setGutter] = React.useState(2)
  const registerSelect = React.useCallback((value: string, fn: (() => void) | undefined) => {
    if (!fn) return () => {}
    handlers.current.set(value, fn)
    return () => {
      if (handlers.current.get(value) === fn) handlers.current.delete(value)
    }
  }, [])
  const setConfig = React.useCallback((next: ContentConfig) => {
    setGutter((prev) => (prev === next.sideOffset ? prev : next.sideOffset))
  }, [])
  const positioning = React.useMemo(() => ({ placement: "right-start" as const, gutter }), [gutter])
  const state = React.useMemo(() => ({ setConfig, registerSelect }), [setConfig, registerSelect])
  return (
    <MenuStateContext.Provider value={state}>
      <Menu.Root
        {...(open !== undefined ? { open } : {})}
        {...(defaultOpen !== undefined ? { defaultOpen } : {})}
        lazyMount
        unmountOnExit
        onSelect={(details) => handlers.current.get(details.value)?.()}
        onOpenChange={onOpenChange ? (details) => onOpenChange(details.open) : undefined}
        positioning={positioning}
      >
        {children}
      </Menu.Root>
    </MenuStateContext.Provider>
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  disabled,
  children,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean | undefined; disabled?: boolean | undefined }) {
  return (
    <Menu.TriggerItem
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled ? true : undefined}
      className={cn(
        ITEM,
        ROW_POPUP_OPEN,
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto size-4" />
    </Menu.TriggerItem>
  )
}

function DropdownMenuSubContent({
  className,
  sideOffset = 2,
  ...props
}: React.ComponentProps<"div"> & { sideOffset?: number | undefined }) {
  const ctx = React.useContext(MenuStateContext)
  const setConfig = ctx?.setConfig
  React.useLayoutEffect(() => {
    setConfig?.({ side: "right", align: "start", sideOffset })
  }, [setConfig, sideOffset])
  return (
    <OverlayPortal>
      <Menu.Positioner data-slot="dropdown-menu-sub-positioner" className="z-50 outline-none">
        <Menu.Content
          data-slot="dropdown-menu-sub-content"
          className={cn(CARD, className)}
          {...props}
        />
      </Menu.Positioner>
    </OverlayPortal>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
