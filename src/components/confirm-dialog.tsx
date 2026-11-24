// The question asked before an action that cannot be taken back: deleting for good, sending what cannot be recalled.
// One look for it in every app: a small window with what will happen as its title, what is lost under it, «Cancel»
// and the one button that does it, named by its verb («Delete the project», never «OK» or «Yes»).
// Only for what cannot be undone. An action that can be taken back is done at once and offers Undo in a notice
// (`Toasts`): asking first is one question too many, every time.
// The focus starts on «Cancel», so Enter pressed out of habit does nothing lost; Esc and a press outside cancel too.
// The button that does it is red when what it does destroys something (`destructive`, the default), and the solid
// one otherwise; while the app does it (`busy`) it waits in its place and the window stays.
import * as React from "react"
import { useWords } from "../words"
import { Button } from "../primitives/button"
import { Dialog } from "./Dialog"

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What will happen, as a question or a plain statement («Delete "Budget 2026"?»). */
  title: string
  /** What is lost, and that it cannot be taken back («Its 14 tasks are deleted too. This cannot be undone.»). */
  description?: string | undefined
  /** The verb of the action, on its button («Delete the project»): never «OK» or «Yes». */
  confirmLabel: string
  /** The word of the button that cancels. Absent: the toolkit's word («Cancel»). */
  cancelLabel?: string | undefined
  /** Do it. The app closes the window when it is done (at once, or after `busy`). */
  onConfirm: () => void
  /** The action destroys something: its button is red (the default). `false` for one that only cannot be recalled (sending). */
  destructive?: boolean | undefined
  /** It is being done: the button waits in its place, and neither button acts again. */
  busy?: boolean | undefined
  /** The window enters with a movement. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  /** More about what is lost, under the description (a list of what goes with it). */
  children?: React.ReactNode
}

/** The question before an action that cannot be taken back. */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, destructive = true, busy = false, animated, children }: ConfirmDialogProps) {
  const words = useWords().common
  const cancel = React.useRef<HTMLButtonElement>(null)
  // The safe button has the focus when the question appears.
  React.useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => cancel.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])
  return (
    <Dialog
      open={open}
      // While it is being done the window stays: closing it would hide an action still under way.
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
      title={title}
      description={description}
      animated={animated}
      footer={
        <>
          <Button ref={cancel} variant="outline" disabled={busy} animated={animated} onClick={() => onOpenChange(false)}>
            {cancelLabel ?? words.cancel}
          </Button>
          <Button data-slot="confirm-dialog-action" variant={destructive ? "destructive" : "default"} loading={busy} animated={animated} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

export { ConfirmDialog }
