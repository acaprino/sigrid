import { type RefObject } from 'react'

/**
 * True for a press on the bar of a window (`TitleBar`). In a desktop frame the overlays open under the bar, so a
 * press on it is outside them: but the user is moving or minimizing the window, not leaving the dialog.
 */
export const inTitleBar = (target: EventTarget | null | undefined): boolean =>
  typeof (target as Element | null | undefined)?.closest === 'function' && (target as Element).closest('[data-slot="title-bar"]') !== null

/**
 * An Esc that a layer heard and declined: a sheet beside the page whose `closesOnEscape` answered false. Ark's layer
 * marks every Esc it hears as handled (`preventDefault`), the declined one too; this tells the app's commands that the
 * key is still theirs (`useCommand` on Escape), as `closesOnEscape` promises.
 */
const ESCAPES_LEFT = new WeakSet<Event>()
export const leaveEscape = (event: Event): void => void ESCAPES_LEFT.add(event)
export const escapeLeft = (event: Event): boolean => ESCAPES_LEFT.has(event)

/** Marks the stack of notices: it lets a modal window recognize it (see `ignoreToasts`). */
export const TOASTS_ATTR = 'data-toasts'

/**
 * The one backdrop of every overlay that dims the page (the owner's decision of 2026-11-20): dialog, sheet, drawer,
 * the attachment viewer and an app's own drawer. The theme engine's `drop` colour (the ink in light, a near-black in
 * dark) at 40%: DESIGN.md `colors.backdrop`.
 */
export const BACKDROP = 'bg-drop/40'

/** The layer of notices: above every backdrop and sheet (windows use `z-50`), even when a modal is open. */
export const TOASTS_LAYER = 'z-[70]'

/**
 * The space the stack of notices takes at the bottom (its height and the 16px from below), written by `Toasts` on the
 * document root: 0px without notices. Sheets reserve it so the notices do not cover their foot.
 */
export const TOASTS_ROOM_VAR = '--toasts-room'

/**
 * The bottom padding of a sheet, at every width: 1.5rem (the sheet's `p-6`) or the space of the notices, if greater.
 * Without notices the variable is 0px and the sheet does not change. It used to apply only below 860px: above that, the
 * stack centered at the bottom covered the foot of the sheet on the right (the controls an app puts there).
 */
export const SHEET_TOASTS_ROOM = 'pb-[max(1.5rem,calc(var(--toasts-room,0px)_+_0.5rem))]'

/**
 * The space kept at the bottom of the window (a tab bar on the phone, with the safe area; the actions and the footer
 * of the frame above it): the stack of notices sits that much higher (`Toasts`), and a page that fits outside a frame
 * leaves it (`--fit-height`). `AppShell` writes it on the root where it is the whole screen; an app with a bar of its
 * own, outside the frame, sets it itself (`0px` or unset without a bar).
 */
export const BOTTOM_BAR_ROOM_VAR = '--bottom-bar-room'

/**
 * True for a press (or a focus) on the stack of notices. A modal window or sheet that hears it as «outside» stays open:
 * the user is undoing the last action, not leaving it. The one check behind `ignoreToasts` and the `Dialog` and `Sheet`
 * of the toolkit.
 */
export const inToasts = (target: EventTarget | null | undefined): boolean => target instanceof Element && target.closest(`[${TOASTS_ATTR}]`) !== null

/**
 * For the `onInteractOutside` of a modal window: a click on a notice (or focus arriving there) does not close it.
 * The notice sits outside the window but the window was not «left»: the user is just undoing the last action.
 * The caller's handler, if there is one, speaks first and can decide.
 */
export function ignoreToasts<E extends Event>(next?: (event: E) => void) {
  return (event: E) => {
    next?.(event)
    if (!event.defaultPrevented && inToasts(event.target)) event.preventDefault()
  }
}

/**
 * For the `onCloseAutoFocus` of a window opened from state (without a `Trigger` that can take focus back): first the
 * caller's handler, which can decide (`preventDefault`); otherwise, focus goes to `restoreFocusTo`. Without either of
 * the two, the window's own return of focus remains (`SheetContent`: the element that had it before opening).
 */
export function restoreFocus<E extends Event>(next?: (event: E) => void, restoreFocusTo?: RefObject<HTMLElement | null> | undefined) {
  return (event: E) => {
    next?.(event)
    const target = restoreFocusTo?.current
    if (!event.defaultPrevented && target) {
      event.preventDefault()
      target.focus()
    }
  }
}
