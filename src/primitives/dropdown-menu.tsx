// SmoothUI (MIT) dropdown-menu 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/dropdown-menu.json)
// Park UI (MIT) menu 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/menu.ts)
// From Park's `menu` recipe comes the form (md): the card with l3 corners and the md elevation in place of a border,
// 4px of padding and 2px between items; items 40px tall with l2 corners and a quiet fill on the highlighted one.
// From SmoothUI we keep the primitive (Base UI's `Menu`: Portal, Positioner, Popup, Item, Separator, SubmenuRoot) and
// the classes of the menu card. We do not keep the item-list API (`items`): the package uses the parts
// (`DropdownMenuTrigger`, `DropdownMenuItem`…) with the same props as before (`asChild`, `onSelect`, `variant`, `inset`,
// `align`, `sideOffset`), so whoever uses them does not change. Removed: the spring and the staggered entrance of the items: with `animated`
// true (off by default, never with prefers-reduced-motion) the card enters with a short fade, without a spring.
// Behavior as before: Enter, Space and down arrow on the button open the menu with focus on the first item, the
// arrows do not wrap from the last to the first (like Radix), Esc closes and returns focus to the button, search by
// initial letter comes from Base UI. The button still carries `data-state="open"|"closed"`: the "visible while the menu is
// open" rules of the rows (`data-[state=open]:`) read it.
import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { cn } from "../lib/utils"
import { KEY_CAP } from "./kbd"
import { GROUP_LABEL, LIST_CARD, LIST_ROW, ROW_POPUP_OPEN } from "../lib/rows"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"
import { renderWithOpenState } from "../internal/overlay"
import { usePortalContainer } from "../internal/portal-container"

/** The open state of the menu, for the button's `data-state`, and its immediate reading for the keyboard. */
type MenuState = { open: boolean; openRef: React.RefObject<boolean> }
const MenuStateContext = React.createContext<MenuState | null>(null)

type DropdownMenuProps = Omit<Menu.Root.Props, "onOpenChange"> & {
  onOpenChange?: ((open: boolean, details?: Menu.Root.ChangeEventDetails) => void) | undefined
}

function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, loopFocus = false, ...props }: DropdownMenuProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const openRef = React.useRef(open)
  openRef.current = open
  const handleOpenChange = (next: boolean, details: Menu.Root.ChangeEventDetails) => {
    openRef.current = next
    if (openProp === undefined) setInner(next)
    onOpenChange?.(next, details)
  }
  const state = React.useMemo(() => ({ open, openRef }), [open])
  return (
    <MenuStateContext.Provider value={state}>
      <Menu.Root data-slot="dropdown-menu" open={open} onOpenChange={handleOpenChange} loopFocus={loopFocus} {...props} />
    </MenuStateContext.Provider>
  )
}

function DropdownMenuPortal({ ...props }: Menu.Portal.Props) {
  const container = usePortalContainer()
  return <Menu.Portal container={container} data-slot="dropdown-menu-portal" {...props} />
}

/** The child to render in place of the `<button>` (`asChild`) and whether it is a real `<button>`. */
function asChildRender(asChild: boolean | undefined, children: React.ReactNode) {
  if (!asChild || !React.isValidElement(children)) return null
  const native = typeof children.type === "string" ? children.type === "button" : true
  return { render: children as React.ReactElement<Record<string, unknown>>, nativeButton: native }
}

type DropdownMenuTriggerProps = Menu.Trigger.Props & { asChild?: boolean | undefined }

function DropdownMenuTrigger({ asChild, children, onKeyDown, ...props }: DropdownMenuTriggerProps) {
  const state = React.useContext(MenuStateContext)
  const child = asChildRender(asChild, children)
  return (
    <Menu.Trigger
      data-slot="dropdown-menu-trigger"
      data-state={state?.open ? "open" : "closed"}
      {...props}
      {...(child ?? {})}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return
        // Like Radix: Enter and Space open from the pressed key (no browser click afterwards), with focus on the
        // first item. Base UI opens on the "keyboard" click (`detail` 0), which here is dispatched by hand: in jsdom a
        // `keydown` does not click, and in the browser `preventDefault` removes the native one. If the first click does not open
        // (Base UI's handler still had a pointer pending and consumes it), a second one is dispatched.
        event.preventDefault()
        const wasOpen = state?.openRef.current ?? false
        event.currentTarget.click()
        if (!wasOpen && state && !state.openRef.current) event.currentTarget.click()
      }}
    >
      {child ? undefined : children}
    </Menu.Trigger>
  )
}

/**
 * The card of a menu and of a submenu: the list's card (`LIST_CARD`) with l3 corners (Park's menu), at least 160px wide,
 * and as tall as the room the window leaves on its side (`--available-height`, Base UI's): a longer menu scrolls.
 */
const CARD = cn(LIST_CARD, "max-h-(--available-height) min-w-40 origin-(--transform-origin) overflow-x-hidden rounded-lg outline-hidden")

/** A short entrance of the card (a fade, a few pixels from the side of its button), only with `animated`. */
function useEnter(animated: boolean | undefined) {
  return useEntrance<HTMLElement>(animated, (motion, el) => motion.enterPopup(el))
}

type DropdownMenuContentProps = Menu.Popup.Props &
  Pick<Menu.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"> & {
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
  animated,
  ref,
  ...props
}: DropdownMenuContentProps) {
  const container = usePortalContainer()
  const enter = useEnter(animated)
  const refs = useMergedRef<HTMLDivElement>(enter, ref)
  return (
    <Menu.Portal container={container}>
      <Menu.Positioner
        data-slot="dropdown-menu-positioner"
        className="z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        <Menu.Popup
          data-slot="dropdown-menu-content"
          render={renderWithOpenState}
          ref={refs}
          className={cn(CARD, className)}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuGroup({ ...props }: Menu.Group.Props) {
  return <Menu.Group data-slot="dropdown-menu-group" {...props} />
}

/** A row of the menu: the row of every list (`LIST_ROW`) with l2 corners, Park's menu item. */
const ITEM = cn(
  LIST_ROW,
  "rounded-md outline-hidden focus-visible:bg-selected/60 focus-visible:text-ink data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
)

type DropdownMenuItemProps = Menu.Item.Props & {
  inset?: boolean | undefined
  variant?: "default" | "destructive" | undefined
  /** The item was chosen (click, Enter or Space); then the menu closes. */
  onSelect?: ((event: React.MouseEvent<HTMLElement>) => void) | undefined
}

function DropdownMenuItem({ className, inset, variant = "default", onSelect, onClick, ...props }: DropdownMenuItemProps) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        ITEM,
        "[&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:focus-visible:bg-destructive/10 data-[variant=destructive]:focus-visible:text-destructive data-[variant=destructive]:*:[svg]:text-destructive!",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        onSelect?.(event)
      }}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({ className, children, ...props }: Menu.CheckboxItem.Props) {
  return (
    <Menu.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(ITEM, "pe-2 ps-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <Menu.CheckboxItemIndicator>
          <CheckIcon className="size-4" />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: Menu.RadioGroup.Props) {
  return <Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({ className, children, ...props }: Menu.RadioItem.Props) {
  return (
    <Menu.RadioItem data-slot="dropdown-menu-radio-item" className={cn(ITEM, "pe-2 ps-8", className)} {...props}>
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  )
}

/**
 * The heading of a group of items ("Move to…"): plain text, as before. It is not `Menu.GroupLabel`, which
 * exists only inside a `Menu.Group`, and here it sits directly in the card.
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

function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
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

function DropdownMenuSub({ ...props }: Menu.SubmenuRoot.Props) {
  return <Menu.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Menu.SubmenuTrigger.Props & { inset?: boolean | undefined }) {
  return (
    <Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        ITEM,
        ROW_POPUP_OPEN,
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto size-4" />
    </Menu.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  sideOffset = 2,
  ...props
}: Menu.Popup.Props & Pick<Menu.Positioner.Props, "sideOffset">) {
  const container = usePortalContainer()
  return (
    <Menu.Portal container={container}>
      <Menu.Positioner data-slot="dropdown-menu-sub-positioner" className="z-50 outline-none" side="right" align="start" sideOffset={sideOffset}>
        <Menu.Popup
          data-slot="dropdown-menu-sub-content"
          render={renderWithOpenState}
          className={cn(CARD, className)}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
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
