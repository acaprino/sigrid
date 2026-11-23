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
// Two forms, chosen with `frame`, with the same regions and steps:
// - `line` (the default): one surface, the page, with a line between the regions;
// - `sheet` (Xiox's frame, Imago's Smooth look without its glass): the title bar and the sidebar sit on the window's
//   ground with no line and no fill of their own, and the work area (status, content, inspector, actions, footer) is
//   one sheet of the page's surface with a line at its top and, where a sidebar lies beside it, at its start, with the
//   large corner there. The ground is the sidebar's surface, so a light sidebar and the ground are one; a theme with a
//   sidebar of its own colours (`data-sidebar="own"`, a dark or solid column) keeps its column on the lanes' surface.
//   Where the sidebar is a drawer (under 620px) the sheet reaches the window's edge and has no corner.
// The `Sidebar` and the `Inspector` read the step from the frame (`useAppShell`), so the app passes them as they are.
// F6 moves the focus to the next region (title bar, sidebar, content, inspector, the notices) and Shift+F6 to the one
// before, round again, skipping a region that is absent, closed or has nothing to focus: always, with nothing for the
// app to write (after Imago's `regions`). The frame answers F6 before anything else does (the notices' own F6 among
// them), so the round is one. In a region the focus goes to the place the user is in (`aria-current`), else to the first
// thing that takes it; the content takes it itself when it holds nothing that does.
// Without a way to measure (a server, a test) the frame is the wide one.
// Its height is the host's, never a guess (docs/mobile.md, «Heights and orientation»):
// - it is as tall as what the person sees (`--app-height`, which it keeps up to date itself with `useAppHeight`: the
//   browser's bars, the keyboard, a rotation), and never taller than the box it is put in, so a frame in a box of the
//   app's keeps to the box (in a box taller than the window, `className="h-full"` makes it fill the box); the app adds
//   no `h-dvh`;
// - where it is the whole screen (as tall as what is seen: `data-screen`), it keeps clear of the device's edges (the
//   notch, the status bar, the gesture bar: `env(safe-area-inset-*)`, the foot with its maximum, which does not change
//   while the page scrolls), and it writes how much it keeps at its foot (the actions, the footer, the bottom bar) to
//   `--bottom-bar-room` on the root, so the notices sit above it;
// - under 500px of height (`short:`, a phone lying down) the bottom bar is 44px and its views put the word beside the
//   icon, so the bar does not eat the screen.
import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { FOCUS_RING, FOCUS_RING_INSET } from "../../lib/focus"
import { useAppHeight, visibleHeight } from "../../internal/app-height"
import { BOTTOM_BAR_ROOM_VAR } from "../../internal/overlay"
import { useWords } from "../../words"
import { PortalContainerProvider, usePortalContainer } from "../PortalContainer"
import { Sheet, SheetContent, SheetTitle } from "./sheet"
import { TOASTS_ATTR } from "../../internal/overlay"

// The regions F6 goes through, in order: inside the frame, or (the inspector shown as a drawer, a sheet, and the column
// of notices) in a layer of the page.
const REGIONS: readonly { inside: string; page?: string }[] = [
  { inside: '[data-slot="title-bar"]' },
  { inside: '[data-slot="sidebar"]' },
  { inside: '[data-slot="app-shell-content"]' },
  { inside: '[data-slot="inspector"]', page: '[data-inspector-form="drawer"]' },
  { inside: `[${TOASTS_ATTR}]`, page: `[${TOASTS_ATTR}]` },
]
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex], [contenteditable=""], [contenteditable="true"]'
// An open surface that is not a region of the round keeps F6 (a menu, a list of options, a dialog other than the inspector).
const SURFACES = '[role="dialog"]:not([data-inspector-form]), [role="alertdialog"], [role="menu"], [role="listbox"]'
const visible = (el: Element) => el.closest("[hidden], [inert], [aria-hidden=\"true\"]") === null
const takes = (el: HTMLElement) => el.tabIndex >= 0 && visible(el) && !el.matches(":disabled")

/** Where the focus may land in a region, in order: the place the user is in, the things that take the focus, the region itself if it takes it. */
function entriesOf(region: HTMLElement): HTMLElement[] {
  const current = Array.from(region.querySelectorAll<HTMLElement>('[aria-current="page"], [aria-current="true"]')).filter(takes)
  const focusable = Array.from(region.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(takes)
  return [...current, ...focusable, ...(region.hasAttribute("tabindex") ? [region] : [])]
}

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
  /**
   * Under everything, across the whole window: the views of the app as tabs at the foot (a `Toolbar` of `ToolbarTabs`
   * with `edge="top"`). Where the frame is the whole screen it keeps clear of the gesture bar, and its height (with the
   * actions and the footer above it) is written to `--bottom-bar-room`.
   */
  bottomBar?: React.ReactNode
  /**
   * The frame is the window of a program: chrome that is not selectable, and overlays that open under the title bar.
   * Leave it off for a page in a browser tab.
   */
  desktop?: boolean | undefined
  /**
   * `line` (the default): one surface with lines between the regions. `sheet`: the title bar and the sidebar on the
   * window's ground, the work area one sheet with a corner, as in Xiox.
   */
  frame?: "line" | "sheet" | undefined
  /** The app's own steps, all or some, in place of the recommended ones (`APP_SHELL_STEPS`); 0 switches a step off. */
  steps?: Partial<AppShellSteps> | undefined
  /** The name of the content for screen readers, and where the skip link goes. */
  contentLabel: string
  className?: string | undefined
  /** The content: what the app is for. It scrolls by itself. */
  children?: React.ReactNode
}

const STRIP = "flex shrink-0 items-center gap-3 px-4 text-2xs text-ink-mute"

function AppShell({ titleBar, tabs, status, sidebar, inspector, actions, footer, bottomBar, desktop = false, frame = "line", steps, contentLabel, className, children }: AppShellProps) {
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
  useAppHeight()
  // What the frame keeps at its foot, under the content: the actions, the footer, the bottom bar.
  const actionsBox = React.useRef<HTMLDivElement>(null)
  const footerBox = React.useRef<HTMLElement>(null)
  const bar = React.useRef<HTMLDivElement>(null)
  const hasBar = Boolean(bottomBar)
  const hasActions = Boolean(actions)
  const hasFooter = Boolean(footer)
  // Is the frame the whole screen? Then it keeps clear of the device's edges and says how much room it keeps at its
  // foot, so the notices sit above it. A frame in a box of the app's (a preview, a dialog) does neither. Read on the
  // elements, with no render of its own.
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === "undefined") return
    const html = document.documentElement
    const foot = [actionsBox.current, footerBox.current, bar.current]
    let wrote = false
    const read = () => {
      const whole = Math.abs(el.getBoundingClientRect().height - visibleHeight()) <= 1
      el.toggleAttribute("data-screen", whole)
      bar.current?.toggleAttribute("data-screen", whole)
      const room = whole ? foot.reduce((sum, part) => sum + (part?.offsetHeight ?? 0), 0) : 0
      if (room > 0) {
        html.style.setProperty(BOTTOM_BAR_ROOM_VAR, `${room}px`)
        wrote = true
      } else if (wrote) {
        html.style.removeProperty(BOTTOM_BAR_ROOM_VAR)
        wrote = false
      }
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    for (const part of foot) if (part) observer.observe(part)
    return () => {
      observer.disconnect()
      if (wrote) html.style.removeProperty(BOTTOM_BAR_ROOM_VAR)
    }
  }, [hasBar, hasActions, hasFooter])
  const id = React.useId()
  // F6 and Shift+F6, from wherever the focus is in the frame (or nowhere): the next region that has something to focus.
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    const doc = el.ownerDocument
    // A region of this frame, not of a frame inside its content (a sample, a preview).
    const own = (region: Element) => region.closest('[data-slot="app-shell"]') === el
    const listen = (event: KeyboardEvent) => {
      if (event.key !== "F6" || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
      const found = REGIONS.map(({ inside, page }) => Array.from(el.querySelectorAll<HTMLElement>(inside)).find(own) ?? (page ? doc.querySelector<HTMLElement>(page) : null))
      const active = doc.activeElement
      const nowhere = active === null || active === doc.body || active === doc.documentElement
      // With the focus nowhere, the outermost frame answers; with it somewhere, the frame it is in (or one of its
      // regions in a layer of the page); an open surface that is not a region keeps F6.
      if (nowhere ? el.parentElement?.closest('[data-slot="app-shell"]') : !(active.closest('[data-slot="app-shell"]') === el || found.some((region) => region?.contains(active)))) return
      if (!nowhere && active.closest(SURFACES) && !found.some((region) => region?.contains(active))) return
      const step = event.shiftKey ? -1 : 1
      const at = found.findIndex((region) => region !== null && active !== null && region.contains(active))
      const from = at === -1 ? (step === 1 ? -1 : 0) : at
      for (let k = 1; k <= found.length; k += 1) {
        const region = found[(((from + step * k) % found.length) + found.length) % found.length]
        if (!region || !visible(region)) continue
        // The first place that really takes the focus: one hidden by a style does not, and the next is tried.
        for (const entry of entriesOf(region)) {
          entry.focus()
          if (doc.activeElement !== entry) continue
          // Answered here and no further: an app's command on F6 does not run too.
          event.preventDefault()
          event.stopPropagation()
          return
        }
      }
    }
    doc.addEventListener("keydown", listen, { capture: true })
    return () => doc.removeEventListener("keydown", listen, { capture: true })
  }, [])
  const [overlays, setOverlays] = React.useState<HTMLDivElement | null>(null)
  // Until the layer is there (the first render), the overlays go where they would have gone without the frame.
  const outer = usePortalContainer() ?? null
  const sheet = frame === "sheet"
  // The sheet has its corner and its start edge only where a sidebar lies beside it.
  const beside = Boolean(sidebar) && layout.sidebar !== "drawer"
  // Everything under the title bar, so the overlays of a window start there.
  const below = (
    <>
      {tabs ? (
        <div data-slot="app-shell-tabs" className={cn("flex min-h-(--control-md) shrink-0 items-stretch px-2 select-none", !sheet && "border-b border-line")}>
          {tabs}
        </div>
      ) : null}
      <div data-slot="app-shell-body" className="flex min-h-0 flex-1">
        {sidebar}
        <div
          data-slot="app-shell-work"
          data-sheet={sheet ? (beside ? "beside" : "alone") : undefined}
          className={cn("flex min-w-0 flex-1 flex-col", sheet && "overflow-hidden border-t border-line bg-paper", sheet && beside && "rounded-ss-lg border-s")}
        >
          {status ? (
            <div data-slot="app-shell-status" role="status" className={cn(STRIP, "min-h-(--control-sm)", !sheet && "border-b border-line")}>
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
            <div ref={actionsBox} data-slot="app-shell-actions" className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-2">
              {actions}
            </div>
          ) : null}
          {footer ? (
            <footer ref={footerBox} data-slot="app-shell-footer" className={cn(STRIP, "min-h-(--control-xs) border-t border-line")}>
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
      {bottomBar ? (
        <div ref={bar} data-slot="app-shell-bottom" className="flex min-h-12 shrink-0 items-stretch border-t border-line px-2 select-none short:min-h-11 data-screen:pb-(--safe-area-max-inset-bottom)">
          {bottomBar}
        </div>
      ) : null}
    </>
  )
  const regions = (
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
      <div
        ref={root}
        data-slot="app-shell"
        data-frame={frame}
        data-desktop={desktop ? "" : undefined}
        data-sidebar={layout.sidebar}
        data-inspector={layout.inspector}
        className={cn(
          "relative flex h-(--app-height) max-h-full min-h-0 w-full flex-col text-ink",
          "data-screen:pt-(--safe-area-inset-top) data-screen:ps-(--safe-area-inset-left) data-screen:pe-(--safe-area-inset-right)",
          // With a bottom bar the bar keeps clear of the gesture bar, with its own fill under it.
          !hasBar && "data-screen:pb-(--safe-area-max-inset-bottom)",
          sheet ? "bg-sidebar-paper in-data-[sidebar=own]:bg-paper-2" : "bg-paper",
          className,
        )}
      >
        <a href={`#${id}`} data-slot="app-shell-skip" className={cn("sr-only top-2 left-2 z-50 rounded-md bg-raised px-3 py-2 text-sm font-medium text-ink shadow-lg focus:not-sr-only focus:absolute", FOCUS_RING)}>
          {words.shell.skip}
        </a>
        {/* The provider is there from the first render, with or without its layer: the frame is never mounted twice. */}
        {desktop ? <PortalContainerProvider container={overlays ?? outer}>{regions}</PortalContainerProvider> : regions}
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
