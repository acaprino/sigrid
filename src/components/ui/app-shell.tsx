// The frame of an app: one layout with seven regions, after Imago's `im-shell`, so every app of the suite is laid out
// alike and an app fills in only the regions it needs.
//
//   ┌ title bar: app · views · toolbar · window buttons ───────┐
//   ├ tabs: the views, when they are not in the bar ───────────┤
//   ├ status: the last result · a summary ────────────────────┤
//   │ sidebar │ content                    │ inspector         │
//   │         ├ actions: the primary one at the end ───────────┤
//   ├─────────┴ footer: service · counts · keys ───────────────┤
//   └ bottom bar: the views, when they are at the foot ────────┘
//
// The frame measures its own width, not the screen's, so a window half-snapped on a wide screen is laid out as the
// narrow window it is. Three steps, Imago's:
// - 1000px or more: the inspector is docked at the end and pushes the content; under it, it covers the end of the
//   content as a panel with no backdrop (the page beside it keeps working);
// - 850px or more: the sidebar is whole, or a rail if the user shrank it; from 620px to 850px it is the rail, whatever
//   the user chose; under 620px it is out of the layout and opens as a drawer from a button of the title bar.
// The steps are a recommendation, not a rule: an app with a narrower sidebar or a wider inspector passes its own
// (`steps`), and a step set to 0 never happens (`steps={{ rail: 0, sidebar: 0 }}` keeps the sidebar whole at any width).
// With `desktop` the frame is the window of a program and not a page (what Imago's windows do):
// - its chrome is not selectable and keeps the arrow cursor, as in any program; the content, the body of the
//   inspector, every field and whatever carries `data-selectable` stay selectable (theme.css);
// - what opens over the window (dialogs, sheets, menus, the command palette) opens under the title bar and not over
//   it, so the window can still be moved, minimized and closed while a dialog is open: the overlays of the frame mount
//   into a layer that starts under the bar.
// The keys and menus of the browser engine are a separate switch, `useDesktopGuard`, since a page in a tab keeps them.
// The `Sidebar` and the `Inspector` read the step from the frame (`useAppShell`), so the app passes them as they are.
// Without a way to measure (a server, a test) the frame is the wide one.
import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { FOCUS_RING, FOCUS_RING_INSET } from "../../lib/focus"
import { useWords } from "../../words"
import { PortalContainerProvider, usePortalContainer } from "../PortalContainer"
import { Sheet, SheetContent, SheetTitle } from "./sheet"

/** The widths, in px of the frame, at which the layout changes: the recommended ones, which an app can replace. */
export const APP_SHELL_STEPS = { inspector: 1000, sidebar: 850, rail: 620 } as const

export type AppShellSteps = { readonly inspector: number; readonly sidebar: number; readonly rail: number }

export type AppShellLayout = {
  /** `full`: the user's choice holds. `rail`: forced to its icons. `drawer`: out of the layout, opened over the page. */
  sidebar: "full" | "rail" | "drawer"
  /** `docked` beside the content, or a `drawer` over its end. */
  inspector: "docked" | "drawer"
}

const WIDE: AppShellLayout = { sidebar: "full", inspector: "docked" }

/** The layout for a width of the frame, with the recommended steps or an app's own. */
export function appShellLayout(width: number, steps: AppShellSteps = APP_SHELL_STEPS): AppShellLayout {
  return {
    sidebar: width >= steps.sidebar ? "full" : width >= steps.rail ? "rail" : "drawer",
    inspector: width >= steps.inspector ? "docked" : "drawer",
  }
}

/** The frame around, for the parts that change with its width. Absent outside an `AppShell`. */
export const AppShellContext = React.createContext<AppShellLayout | undefined>(undefined)

/**
 * The layout of the frame around: an app reads it to show the button that opens the sidebar only where the sidebar is
 * a drawer. Outside an `AppShell` it is the wide layout.
 */
export function useAppShell(): AppShellLayout {
  return React.useContext(AppShellContext) ?? WIDE
}

export type AppShellProps = {
  /** The bar at the top (a `TitleBar`). */
  titleBar?: React.ReactNode
  /** Directly under the bar, across the whole window: the views of the app (a `Toolbar` of `ToolbarTabs`), when they are not in the bar. */
  tabs?: React.ReactNode
  /** Under the bar: the last result and a summary, one line. */
  status?: React.ReactNode
  /** The navigation (a `Sidebar`). */
  sidebar?: React.ReactNode
  /** The details of what is selected (an `Inspector`). */
  inspector?: React.ReactNode
  /** Under the content: the actions on it, the primary one last (R3: one). */
  actions?: React.ReactNode
  /** The foot: the state of the service, counts, the keys that work now. */
  footer?: React.ReactNode
  /** Under everything, across the whole window: the views of the app as tabs at the foot (a `Toolbar` of `ToolbarTabs` with `edge="top"`). */
  bottomBar?: React.ReactNode
  /**
   * The frame is the window of a program: chrome that is not selectable, and overlays that open under the title bar.
   * Leave it off for a page in a browser tab.
   */
  desktop?: boolean | undefined
  /** The app's own steps, all or some, in place of the recommended ones (`APP_SHELL_STEPS`); 0 switches a step off. */
  steps?: Partial<AppShellSteps> | undefined
  /** The name of the content for screen readers, and where the skip link goes. */
  contentLabel: string
  className?: string | undefined
  /** The content: what the app is for. It scrolls by itself. */
  children?: React.ReactNode
}

const STRIP = "flex shrink-0 items-center gap-3 px-4 text-2xs text-ink-mute"

function AppShell({ titleBar, tabs, status, sidebar, inspector, actions, footer, bottomBar, desktop = false, steps, contentLabel, className, children }: AppShellProps) {
  const words = useWords()
  const root = React.useRef<HTMLDivElement>(null)
  const [layout, setLayout] = React.useState<AppShellLayout>(WIDE)
  const inspectorStep = steps?.inspector ?? APP_SHELL_STEPS.inspector
  const sidebarStep = steps?.sidebar ?? APP_SHELL_STEPS.sidebar
  const railStep = steps?.rail ?? APP_SHELL_STEPS.rail
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === "undefined") return
    const read = (width: number) => {
      // A frame not laid out yet measures nothing: the wide layout stays.
      if (width <= 0) return
      const next = appShellLayout(width, { inspector: inspectorStep, sidebar: sidebarStep, rail: railStep })
      setLayout((now) => (now.sidebar === next.sidebar && now.inspector === next.inspector ? now : next))
    }
    read(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) read(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [inspectorStep, sidebarStep, railStep])
  const id = React.useId()
  const [overlays, setOverlays] = React.useState<HTMLDivElement | null>(null)
  // Until the layer is there (the first render), the overlays go where they would have gone without the frame.
  const outer = usePortalContainer() ?? null
  // Everything under the title bar, so the overlays of a window start there.
  const below = (
    <>
      {tabs ? (
        <div data-slot="app-shell-tabs" className="flex min-h-(--control-md) shrink-0 items-stretch border-b border-line px-2 select-none">
          {tabs}
        </div>
      ) : null}
      <div data-slot="app-shell-body" className="flex min-h-0 flex-1">
        {sidebar}
        <div data-slot="app-shell-work" className="flex min-w-0 flex-1 flex-col">
          {status ? (
            <div data-slot="app-shell-status" role="status" className={cn(STRIP, "min-h-(--control-sm) border-b border-line")}>
              {status}
            </div>
          ) : null}
          <div data-slot="app-shell-columns" className="flex min-h-0 flex-1">
            <main id={id} tabIndex={-1} aria-label={contentLabel} data-slot="app-shell-content" className={cn("min-w-0 flex-1 overflow-y-auto", FOCUS_RING_INSET)}>
              {children}
            </main>
            {inspector}
          </div>
          {actions ? (
            <div data-slot="app-shell-actions" className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-2">
              {actions}
            </div>
          ) : null}
          {footer ? (
            <footer data-slot="app-shell-footer" className={cn(STRIP, "min-h-(--control-xs) border-t border-line")}>
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
      {bottomBar ? (
        <div data-slot="app-shell-bottom" className="flex min-h-12 shrink-0 items-stretch border-t border-line px-2 select-none">
          {bottomBar}
        </div>
      ) : null}
    </>
  )
  const frame = (
    <>
      {titleBar}
      <div data-slot="app-shell-below" className="relative flex min-h-0 flex-1 flex-col">
        {below}
        {desktop ? <div ref={setOverlays} data-slot="app-shell-overlays" className="pointer-events-none absolute inset-0 z-40" /> : null}
      </div>
    </>
  )
  return (
    <AppShellContext.Provider value={layout}>
      <div ref={root} data-slot="app-shell" data-desktop={desktop ? "" : undefined} data-sidebar={layout.sidebar} data-inspector={layout.inspector} className={cn("relative flex h-full min-h-0 w-full flex-col bg-paper text-ink", className)}>
        <a href={`#${id}`} data-slot="app-shell-skip" className={cn("sr-only top-2 left-2 z-50 rounded-md bg-raised px-3 py-2 text-sm font-medium text-ink shadow-lg focus:not-sr-only focus:absolute", FOCUS_RING)}>
          {words.shell.skip}
        </a>
        {/* The provider is there from the first render, with or without its layer: the frame is never mounted twice. */}
        {desktop ? <PortalContainerProvider container={overlays ?? outer}>{frame}</PortalContainerProvider> : frame}
      </div>
    </AppShellContext.Provider>
  )
}

export type InspectorProps = {
  /** What it shows («Details»): its heading and its name for screen readers. */
  title: string
  open: boolean
  /** With it, a button in the heading closes the inspector; as a drawer, Esc does too. */
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Under the body, always in sight: the actions on what is selected. */
  footer?: React.ReactNode
  /** The drawer slides in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

/**
 * The details or the form of what is selected, at the end of the frame. It is not modal: the rest of the window keeps
 * working beside it. Docked it is a column with a line at its inner edge (R4); in a frame under 1000px it is a raised
 * panel over the end of the content. Closed, the content takes its room.
 */
function Inspector({ title, open, onOpenChange, footer, animated, className, children }: InspectorProps) {
  const words = useWords()
  const { inspector } = useAppShell()
  const heading = (
    <div data-slot="inspector-header" className="flex min-h-(--row-height) shrink-0 items-center gap-2 border-b border-line ps-4 pe-2">
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</h2>
      {onOpenChange ? (
        <button type="button" data-slot="inspector-close" aria-label={words.common.close} onClick={() => onOpenChange(false)} className={cn("flex size-(--control-xs) shrink-0 items-center justify-center rounded-md text-ink-mute pointer-coarse:size-11 hover:bg-ink/6 hover:text-ink", FOCUS_RING)}>
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  )
  const body = (
    <>
      <div data-slot="inspector-body" className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {children}
      </div>
      {footer ? (
        <div data-slot="inspector-footer" className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-2">
          {footer}
        </div>
      ) : null}
    </>
  )
  if (inspector === "drawer") {
    return (
      <Sheet open={open} modal={false} onOpenChange={(next) => onOpenChange?.(next)}>
        <SheetContent side="right" showCloseButton={false} animated={animated} data-inspector-form="drawer" className={cn("gap-0 p-0", className)}>
          <SheetTitle className="sr-only">{title}</SheetTitle>
          {heading}
          {body}
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <aside data-slot="inspector" data-inspector-form="docked" aria-label={title} hidden={!open} className={cn("flex w-75 shrink-0 flex-col border-s border-line bg-paper", className)}>
      {heading}
      {body}
    </aside>
  )
}

export { AppShell, Inspector }
