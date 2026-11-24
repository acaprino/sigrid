// The bar at the top of a window: the place of its name and of its toolbar, on the same row as the buttons that
// minimize, maximize and close it. It is plain web: on a page in a browser it is the app's top bar and nothing else.
// What makes it the frame of a window is given from outside, so the toolkit knows no window API:
// - the empty parts of the bar move the window. The standard way is the `app-region` property, set in theme.css on the
//   bar and taken off every control inside it; a host that marks its drag regions with an attribute of its own gets it
//   through `dragProps`, which the bar, the toolbar inside it, its title and its spacers all carry (such a mark often
//   counts only on the element under the pointer);
// - the room the system keeps for its own buttons over the page (the window-controls overlay of an installed web app)
//   is left free: theme.css reads it into `--titlebar-start` and `--titlebar-end`, and an app can set the two itself;
// - where the system draws no buttons, `WindowControls` draws them and calls the app back; the app talks to its host.
//   On Windows 11 a host can lay the system's own hit area over the maximize button, so the Snap Layouts open from it:
//   the pointer then never reaches the page's button. `maximizeRef` gives the host the button to measure, and
//   `maximizeState` shows on it the hover and the press the system reports (Imago's window does this).
// The bar is as tall as a dense control and 8px above and below it (`--titlebar-height`), on the page's own surface
// with a line under it (R4: a line, no shadow). With `size="compact"` it is the thin caption of a classic desktop
// program: the smallest control and 2px above and below it (32px at normal density), and the toolbar inside it takes
// the small size by itself. Nothing else changes: it is a measure, chosen with a parameter.
import * as React from "react"
import { Icon } from "../../icons"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { useWords } from "../../words"

/** The attributes a host reads to know where a window can be dragged from: `{ 'data-…': '' }`. */
export type TitleBarDragProps = Readonly<Record<`data-${string}`, string>>

/** The drag attributes of the bar around, for the parts inside it that move the window too. */
export const TitleBarDragContext = React.createContext<TitleBarDragProps | undefined>(undefined)

/** The size of the bar around, which the toolbar inside it follows. */
export const TitleBarSizeContext = React.createContext<"default" | "compact">("default")

export type TitleBarProps = Omit<React.ComponentProps<"header">, "children"> & {
  /** `compact`: the thin caption of a classic desktop program, with small controls. */
  size?: "default" | "compact" | undefined
  /** The host's own mark of a drag region, if it has one. */
  dragProps?: TitleBarDragProps | undefined
  /** The window's buttons (`WindowControls`), at the end of the bar and flush with its corner. */
  windowControls?: React.ReactNode
  children?: React.ReactNode
}

function TitleBar({ size = "default", dragProps, windowControls, className, children, ...props }: TitleBarProps) {
  return (
    <header
      data-slot="title-bar"
      data-size={size}
      data-window-controls={windowControls ? "" : undefined}
      {...dragProps}
      {...props}
      className={cn("flex shrink-0 cursor-default items-center gap-2 border-b border-line bg-paper text-ink select-none", className)}
    >
      <TitleBarSizeContext.Provider value={size}>
        <TitleBarDragContext.Provider value={dragProps}>{children}</TitleBarDragContext.Provider>
      </TitleBarSizeContext.Provider>
      {windowControls}
    </header>
  )
}

export type WindowControlsProps = {
  /** The window fills the screen: the middle button restores it. */
  maximized?: boolean | undefined
  /** Each button is drawn only if its action is given. */
  onMinimize?: (() => void) | undefined
  onMaximizeToggle?: (() => void) | undefined
  onClose?: (() => void) | undefined
  /** The middle button, for a host that needs its rectangle. */
  maximizeRef?: React.Ref<HTMLButtonElement> | undefined
  /** The pointer over the middle button as the system sees it, when the system and not the page receives it. */
  maximizeState?: "hover" | "pressed" | undefined
  className?: string | undefined
}

const CONTROL = cn("flex w-11 cursor-default items-center justify-center text-ink-soft hover:bg-ink/6 hover:text-ink active:bg-ink/9 data-[os-state=hover]:bg-ink/6 data-[os-state=hover]:text-ink data-[os-state=pressed]:bg-ink/9 data-[os-state=pressed]:text-ink", FOCUS_RING_INSET)

/**
 * The three buttons of a window, for a host that draws none: as tall as the bar, 44px wide, with no gap. The last one
 * takes the accent under the pointer, as in Imago: closing a window destroys nothing, and red is kept for danger.
 * They only call back: what minimizes, maximizes and closes the window is the app's.
 */
function WindowControls({ maximized = false, onMinimize, onMaximizeToggle, onClose, maximizeRef, maximizeState, className }: WindowControlsProps) {
  const words = useWords()
  return (
    <div data-slot="window-controls" className={cn("flex shrink-0 self-stretch", className)}>
      {onMinimize ? (
        <button type="button" data-window-control="minimize" aria-label={words.window.minimize} onClick={onMinimize} className={CONTROL}>
          <Icon name="windowMinimize" className="size-3.5" />
        </button>
      ) : null}
      {onMaximizeToggle ? (
        <button ref={maximizeRef} type="button" data-os-state={maximizeState} data-window-control={maximized ? "restore" : "maximize"} aria-label={maximized ? words.window.restore : words.window.maximize} onClick={onMaximizeToggle} className={CONTROL}>
          <Icon name={maximized ? "windowRestore" : "windowMaximize"} className="size-3.5" />
        </button>
      ) : null}
      {onClose ? (
        <button type="button" data-window-control="close" aria-label={words.window.close} onClick={onClose} className={cn(CONTROL, "hover:bg-primary hover:text-primary-foreground active:bg-accent-hover")}>
          <Icon name="close" className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export { TitleBar, WindowControls }
