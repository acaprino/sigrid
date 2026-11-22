// SmoothUI (MIT) dialog 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/dialog.json)
// SmoothUI's props (`open`, `onOpenChange`, `title`, `description`, `footer`, `children`) match ours;
// plus returning focus and the toolkit's motion preference.
import type * as React from 'react'
import { useCallback, useRef, type RefObject } from 'react'
import {
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { restoreFocus, SHEET_TOASTS_ROOM } from '../internal/overlay'
import { cn } from '../lib/utils'
import { usePortalContainer } from './PortalContainer'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet'

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible title of the window. */
  title: string
  description?: string
  children?: React.ReactNode
  /** Actions at the bottom (usually a primary `Button` and a `ghost` one). */
  footer?: React.ReactNode
  /**
   * Where focus goes when it closes: the window opens from state, not from a `Trigger` that would get focus back, and
   * without this focus ends up on the `body`. `restoreFocusTo` is the element that opened it; `onCloseAutoFocus` speaks
   * first and can decide for itself (`event.preventDefault()`, then move focus wherever it wants). Both are optional.
   */
  restoreFocusTo?: RefObject<HTMLElement | null> | undefined
  onCloseAutoFocus?: ((event: Event) => void) | undefined
  /**
   * The form opens in a side panel on the right, like a details sheet.
   * Without it, it is a window in the center of the page: the short confirmations.
   */
  drawer?: boolean | undefined
  animated?: boolean | undefined
}

/**
 * Focus on close, decided the way Radix does it. Base UI calls `finalFocus` while it unmounts the panel, when the rest
 * of the page is still `aria-hidden` (an effect removes it later): a handler that looks for a button by role would not
 * find it. So Base UI is told not to move anything (`false`) and the decision is made one turn later
 * (`setTimeout` 0, like Radix's `FocusScope`), with the page visible again: first the caller's handler, with a
 * cancelable event; if it does not cancel, `restoreFocusTo` (`restoreFocus`); if that is missing, the element that had
 * focus on open, if it is still there and is not the `body`. Once per close, and never if the window was reopened.
 */
function useCloseFocus(open: boolean, onCloseAutoFocus: DialogProps['onCloseAutoFocus'], restoreFocusTo: DialogProps['restoreFocusTo']) {
  const owner = usePortalContainer()?.ownerDocument ?? (typeof document === 'undefined' ? null : document)
  const state = useRef({ open: false, session: 0, handled: -1, before: null as Element | null })
  const s = state.current
  // In render, not in an effect: Base UI's effects (the children's, so they run first) have already moved focus inside.
  if (open && !s.open) {
    s.session += 1
    s.before = owner?.activeElement ?? null
  }
  s.open = open
  const latest = useRef({ onCloseAutoFocus, restoreFocusTo })
  latest.current = { onCloseAutoFocus, restoreFocusTo }
  return useCallback((): boolean => {
    const session = state.current.session
    setTimeout(() => {
      const now = state.current
      if (now.open || now.handled === session || now.session !== session) return
      now.handled = session
      const event = new Event('closeautofocus', { cancelable: true })
      restoreFocus(latest.current.onCloseAutoFocus, latest.current.restoreFocusTo)(event)
      if (event.defaultPrevented) return
      const before = now.before
      if (before?.isConnected && before !== before.ownerDocument.body && 'focus' in before) (before as HTMLElement).focus()
    }, 0)
    return false
  }, [])
}

/** Modal window on a raised surface: a name to change, a profile, confirmations. */
export function Dialog({ open, onOpenChange, title, description, children, footer, restoreFocusTo, onCloseAutoFocus, drawer = false, animated }: DialogProps) {
  const finalFocus = useCloseFocus(open, onCloseAutoFocus, restoreFocusTo)
  // The sheet gives focus back by itself to whoever had it before it opened.
  if (drawer) return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent side="right" animated={animated} className={cn('w-full gap-5 overflow-hidden bg-raised p-6 sm:max-w-xl', SHEET_TOASTS_ROOM)} onCloseAutoFocus={restoreFocus(onCloseAutoFocus, restoreFocusTo)}>
        <SheetHeader className="shrink-0 p-0 pr-6">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? <SheetFooter className="shrink-0 flex-row flex-wrap justify-end p-0">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  )
  return (
    <DialogRoot open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent animated={animated} className="bg-raised" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </DialogRoot>
  )
}
