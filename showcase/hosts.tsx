// Where an example app runs (the Examples view): the four hosts of the suite's apps, drawn as quietly as possible so
// the eye stays on the app. A host is not part of the toolkit and not part of the app: it is what is around the page.
// - a browser tab on a computer: a strip with the address. The page is the app; the browser keeps its keys;
// - a Tauri window on a computer, with `decorations: false`: nothing is drawn around the app, which draws its own bar
//   and the window's buttons (`TitleBar` with `dragProps` and `WindowControls`, `AppShell desktop`);
// - a browser on a phone: the address bar above the page, which is as tall as what is left (the frame measures it:
//   `--app-height`);
// - a Tauri app on a phone: the page reaches under the clock and the home indicator (`viewport-fit=cover`), and the
//   frame keeps that room free itself (`env(safe-area-inset-*)`, the foot at its maximum). The clock and the indicator
//   are the system's, drawn here.
// The strips are `aria-hidden`: they are scenery. The frame of a phone is drawn with the sizes a finger gets
// (`touchDensity`, phone.tsx says why), and the overlays of an app open inside its frame, in a layer of their own.
// Each app brings its own theme (the toolkit ships none): it is put on the frame, in the scheme and the shape chosen
// for the page in Look, so the two apps are told apart by their colour as two windows of the suite are.
// A host is the window the app's frame fills: the app writes no height (no `h-full` around or on `AppShell`), and the
// host says how tall its window is (`--app-height`, the height `AppShell` takes, is the whole of the host's box). It
// also names the app it holds (`data-app`), so the keys of one example run only while the focus is in it
// (`CommandsProvider keysIn`): the four examples share one page, and a key of one is not a key of the others.
import * as React from 'react'
import { PortalContainerProvider, applyTheme, cn, densityOf, densityVariables, type DensityDef, type DensityId, type ThemeDef, type ThemeScheme, type ThemeShape } from '../src/index'
import { Toasts, type ToastItem } from '../src/components'
import { TitleBar, Toolbar, WindowControls } from '../src/layout'
import { touchDensity } from './phone'

/** What the page chose in Look, which an app's own theme follows: light or dark, and how round the corners are. */
export type Look = { scheme: ThemeScheme; shape: ThemeShape }
/** What every example app is given. */
export type AppProps = Setup & { density: DensityId; look: Look }

export type Device = 'desktop' | 'phone'
export type HostKind = 'web' | 'native'
/** How an example app is asked to draw itself. */
export type Setup = { device: Device; host: HostKind; animated: boolean }

/** What each of the four hosts is, in one sentence, for the line above the frame. */
export const HOSTS: Record<Device, Record<HostKind, string>> = {
  desktop: {
    web: 'A browser tab. The page is the app: its bar is a top bar and nothing more, the browser keeps its own keys and menu, and what opens does so over the whole page.',
    native: "A Tauri window with its decorations off. The app draws the window's bar: its empty parts move the window, its last three buttons minimize, maximize and close it, and what opens does so under the bar.",
  },
  phone: {
    web: "A browser on a phone. The page is as tall as what the browser's bars leave, and the browser keeps the page clear of the edges of the screen.",
    native: 'A Tauri app on a phone. The page reaches under the clock and the home indicator, and the app keeps that room free at the head and at the foot.',
  },
}

const STRIP = 'flex shrink-0 items-center select-none'

/** The address strip of a browser: scenery, one line. */
export function Address({ address, device }: { address: string; device: Device }) {
  return (
    <div aria-hidden="true" data-host-strip="address" className={cn(STRIP, 'justify-center bg-paper-2 px-3', device === 'phone' ? 'h-11' : 'h-9')}>
      <span className={cn('truncate rounded-md bg-ink/6 px-3 py-1 text-2xs text-ink-mute', device === 'phone' ? 'w-full text-center' : 'w-96 max-w-full')}>{address}</span>
    </div>
  )
}

/** The clock of a phone, over the app's own surface: the room an app keeps free at the head. */
export function Clock() {
  return (
    <div aria-hidden="true" data-host-strip="status" className={cn(STRIP, 'h-9 justify-between bg-paper px-6 text-2xs font-semibold text-ink tabular-nums')}>
      <span>9:41</span>
      <span className="font-medium text-ink-mute">5G</span>
    </div>
  )
}

/** The home indicator of a phone: the room an app keeps free at the foot. */
export function HomeIndicator() {
  return (
    <div aria-hidden="true" data-host-strip="home" className={cn(STRIP, 'h-5 justify-center bg-paper')}>
      <span className="h-1 w-28 rounded-full bg-ink/30" />
    </div>
  )
}

/**
 * The bar at the head of an app, in its host. In a browser it is a top bar and nothing more. In a Tauri window on a
 * computer it is the window's bar: the host's drag mark on its empty parts and the three buttons at its end (here
 * they only show their state: a real app calls `getCurrentWindow().minimize()` and the others).
 */
export function AppBar({ device, host, label, overlays, children }: Pick<Setup, 'device' | 'host'> & { label: string; overlays?: React.ReactNode; children: React.ReactNode }) {
  const [maximized, setMaximized] = React.useState(false)
  const isWindow = device === 'desktop' && host === 'native'
  return (
    <TitleBar
      dragProps={isWindow ? { 'data-tauri-drag-region': '' } : undefined}
      windowControls={isWindow ? <WindowControls maximized={maximized} onMinimize={() => {}} onMaximizeToggle={() => setMaximized(!maximized)} onClose={() => {}} /> : undefined}
    >
      <Toolbar aria-label={label}>{children}</Toolbar>
      {/* What the app opens (a sheet, a palette) is declared here, inside the frame: in a window it then opens under this bar. */}
      {overlays}
    </TitleBar>
  )
}

export type HostProps = Setup & {
  /** The app it holds, as a word («ethel»): the place its keys are read in (`appKeys`). */
  app: string
  /** The app's own theme. */
  theme: ThemeDef
  look: Look
  /** The address of the page in a browser («ethel.app/today»). */
  address: string
  /** The density of the page: a phone gets its touch sizes from it. */
  density: DensityId
  /** The notices of the app, drawn at the foot of its frame as `Toasts` draws them at the foot of a window. */
  notices?: ToastItem[]
  onDismiss?: (id: string) => void
  /** A desktop window as wide as the page lets it be (up to 1200px) and 760px tall: for an app whose work needs the room. */
  wide?: boolean
  children: React.ReactNode
}

/** One of the four hosts, with the app inside it. */
/** Where the keys of the app in a host are read: inside its frame (`CommandsProvider keysIn`). */
export const appKeys = (app: string) => `[data-app="${app}"]`

/** The host is the window: the frame of the app inside it is as tall as the host's box. */
const WINDOW = { '--app-height': '100%' } as React.CSSProperties

export function Host({ app, device, host, animated, theme, look, address, density, notices = [], onDismiss, wide = false, children }: HostProps) {
  const frame = React.useRef<HTMLDivElement>(null)
  const region = React.useRef<HTMLDivElement>(null)
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null)
  const [foot, setFoot] = React.useState(0)
  const phone = device === 'phone'
  const measures: DensityDef = phone ? touchDensity(density) : densityOf(density)
  // The notices sit above what the app keeps at its foot: the bar of the views, the status strip, the actions (a frame
  // that is the whole screen writes that room to `--bottom-bar-room`; this one is in a box, so the host measures it).
  React.useLayoutEffect(() => {
    const el = region.current
    if (!el) return
    const read = () => {
      const kept = ['[data-slot="app-shell-bottom"]', '[data-slot="app-shell-footer"]', '[data-slot="app-shell-actions"]']
      setFoot(kept.reduce((sum, slot) => sum + (el.querySelector<HTMLElement>(slot)?.offsetHeight ?? 0), 0))
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [phone, density])
  React.useLayoutEffect(() => {
    if (frame.current) applyTheme(frame.current, { theme: { ...theme, shape: look.shape }, scheme: look.scheme, tone: { intensity: 'theme', light: 'theme' } })
  }, [theme, look.scheme, look.shape])
  return (
    <div
      ref={frame}
      data-sample="example"
      data-app={app}
      data-device={device}
      data-host={host}
      data-density={measures.id}
      style={{ ...densityVariables(measures) }}
      className={cn('relative flex flex-col overflow-hidden rounded-lg bg-paper text-ink shadow-lg', phone ? 'h-190 w-97.5 max-w-full' : wide ? 'h-190 w-full max-w-300' : 'h-160 w-260')}
    >
      {host === 'web' ? <Address address={address} device={device} /> : phone ? <Clock /> : null}
      <div ref={region} data-host-region="" style={WINDOW} className="relative min-h-0 flex-1">
        <PortalContainerProvider container={layer}>{children}</PortalContainerProvider>
        {/* Where the overlays of the app open: a layer of the frame, which also holds what is `fixed` inside it. */}
        <div ref={setLayer} data-host-layer="" className="pointer-events-none absolute inset-0 z-40 transform-gpu *:pointer-events-auto" />
        <div style={{ bottom: `${foot}px` }} className={cn('pointer-events-none absolute z-50 [&_[data-toasts]]:w-full', phone ? 'inset-x-3' : 'end-4 w-88')}>
          <Toasts items={notices} inline max={3} durationMs={7000} onDismiss={onDismiss} animated={animated} />
        </div>
      </div>
      {phone && host === 'native' ? <HomeIndicator /> : null}
    </div>
  )
}
