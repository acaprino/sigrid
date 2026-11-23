// The height of what the person sees, whatever hosts the page: a browser tab with its bars showing or gone, a Custom
// Tab, an installed app, a web view, a window half-snapped, with the keyboard open or shut. `100vh` is the height with
// the browser's bars gone, so a page that fits it still scrolls; `100dvh` follows the bars in most hosts but not in
// all, and never the keyboard. `visualViewport` is what the browser itself says it shows: its height, taken back to
// layout pixels with its scale (a page pinched in would otherwise read shorter). Where there is no `visualViewport`,
// the window's height.
// `useAppHeight` writes it in px as `--app-height` on the root (theme.css: `100dvh` until a script writes it, and where
// none does), and again when the visible area changes (the bars sliding, the keyboard, a rotation, a window resized):
// many events in one frame are one write. `AppShell` runs it by itself. Any number of parts may run it: they share one
// listener, and the property goes when the last of them stops. On a server it does nothing.
import { useEffect } from 'react'

/** The custom property, on the root, that holds the height of what the person sees, in px. */
export const APP_HEIGHT_VAR = '--app-height'

/** The height of what the person sees now, in layout px: `visualViewport`'s, or the window's where there is none. */
export function visibleHeight(): number {
  const view = window.visualViewport
  return view ? view.height * view.scale : window.innerHeight
}

let users = 0
let stop: (() => void) | null = null

function listen(): () => void {
  const root = document.documentElement
  const view = window.visualViewport
  let frame = 0
  const write = () => {
    frame = 0
    const px = visibleHeight()
    if (px > 0) root.style.setProperty(APP_HEIGHT_VAR, `${Math.round(px)}px`)
  }
  // A bar that slides fires a stream of events: one write a frame.
  const schedule = () => {
    if (frame === 0) frame = window.requestAnimationFrame(write)
  }
  write()
  view?.addEventListener('resize', schedule)
  view?.addEventListener('scroll', schedule)
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  return () => {
    view?.removeEventListener('resize', schedule)
    view?.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
    if (frame !== 0) window.cancelAnimationFrame(frame)
    root.style.removeProperty(APP_HEIGHT_VAR)
  }
}

/** Keeps `--app-height` on the root as the height of what the person sees, while `on` (the default) holds. */
export function useAppHeight(on = true): void {
  useEffect(() => {
    if (!on || typeof window === 'undefined') return
    users += 1
    if (users === 1) stop = listen()
    return () => {
      users -= 1
      if (users === 0) {
        stop?.()
        stop = null
      }
    }
  }, [on])
}
