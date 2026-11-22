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
// The bar is as tall as a dense control and 8px above and below it (`--titlebar-height`), on the page's own surface
// with a line under it (R4: a line, no shadow).
import * as React from "react"
import { Copy, Minus, Square, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { useWords } from "../../words"

/** The attributes a host reads to know where a window can be dragged from: `{ 'data-…': '' }`. */
export type TitleBarDragProps = Readonly<Record<`data-${string}`, string>>

/** The drag attributes of the bar around, for the parts inside it that move the window too. */
export const TitleBarDragContext = React.createContext<TitleBarDragProps | undefined>(undefined)

export type TitleBarProps = Omit<React.ComponentProps<"header">, "children"> & {
  /** The host's own mark of a drag region, if it has one. */
  dragProps?: TitleBarDragProps | undefined
  /** The window's buttons (`WindowControls`), at the end of the bar and flush with its corner. */
  windowControls?: React.ReactNode
  children?: React.ReactNode
}

function TitleBar({ dragProps, windowControls, className, children, ...props }: TitleBarProps) {
  return (
    <header
      data-slot="title-bar"
      data-window-controls={windowControls ? "" : undefined}
      {...dragProps}
      {...props}
      className={cn("flex shrink-0 items-center gap-2 border-b border-line bg-paper text-ink select-none", className)}
    >
      <TitleBarDragContext.Provider value={dragProps}>{children}</TitleBarDragContext.Provider>
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
  className?: string | undefined
}

const CONTROL = cn("flex w-11 items-center justify-center text-ink-soft hover:bg-ink/6 hover:text-ink active:bg-ink/9", FOCUS_RING_INSET)

/**
 * The three buttons of a window, for a host that draws none: as tall as the bar, square, with no gap, the last one
 * red under the pointer. They only call back: what minimizes, maximizes and closes the window is the app's.
 */
function WindowControls({ maximized = false, onMinimize, onMaximizeToggle, onClose, className }: WindowControlsProps) {
  const words = useWords()
  return (
    <div data-slot="window-controls" className={cn("flex shrink-0 self-stretch", className)}>
      {onMinimize ? (
        <button type="button" data-window-control="minimize" aria-label={words.window.minimize} onClick={onMinimize} className={CONTROL}>
          <Minus aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
      {onMaximizeToggle ? (
        <button type="button" data-window-control={maximized ? "restore" : "maximize"} aria-label={maximized ? words.window.restore : words.window.maximize} onClick={onMaximizeToggle} className={CONTROL}>
          {maximized ? <Copy aria-hidden="true" className="size-3.5 -scale-x-100" /> : <Square aria-hidden="true" className="size-3.5" />}
        </button>
      ) : null}
      {onClose ? (
        <button type="button" data-window-control="close" aria-label={words.window.close} onClick={onClose} className={cn(CONTROL, "hover:bg-destructive hover:text-destructive-foreground active:bg-destructive/90")}>
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export { TitleBar, WindowControls }
