// A surface that shows pictures the app pushes to it, one after the other, and tells the app what the person does on it: the
// window of an embedded browser that streams JPEG frames, a remote screen, a camera, a preview rendered elsewhere. The part
// draws and listens; what the pictures are and what the input means is the app's.
// - The pictures. The app calls `draw` on the part's `ref` with each one: encoded bytes (`BufferSource` or a `Blob`, JPEG by
//   default, `type` says another) or an `ImageBitmap`, which the part takes over and closes when the next one replaces it. A
//   picture is decoded off the main thread; when one finishes after a newer one was drawn it is dropped, so a stream that
//   decodes slower than it arrives still shows the latest and never stands still. `draw` resolves to whether it was drawn (a
//   picture that is broken, or too late, is skipped; the next one repaints). The last picture is kept and drawn again when
//   the box changes size, until the app sends one made for the new size.
// - The fit. `fill` (the default) stretches the picture over the box, for a stream that is asked for at the box's own size;
//   `contain` shows all of it, centred, with the rest of the box on the quiet ground (letterbox).
// - The size. `onSize` hears the box in CSS pixels and the device's pixel ratio: at the first size at once, and at each change
//   when it has held still for `settleMs` (default 150), so a tile being dragged asks its source once, at its final size. The
//   canvas itself follows the box at every change, at the device's resolution.
// - The input. `onPointer`, `onWheel`, `onKey` and `onPaste` tell what the person did, with the point in the box (`x`, `y`, in
//   CSS pixels) and in the picture (`frame`, in its own pixels, null outside it: the letterbox). A press captures the pointer
//   until it is let go; the surface takes the focus; the input the app listens to is not passed on to the page (no scroll, no
//   context menu, no browser key), except the keys `appKeys` names, which the page's own commands keep. With no callback the
//   surface is a picture.
// - It is one tab stop with the name `label` and the role `application`: the keys inside are the app's.
// Tokens only: the ground of the letterbox is `paper-2`; the ring is the toolkit's, inset.
import * as React from 'react'
import { FOCUS_RING_INSET } from '../lib/focus'
import { cn } from '../lib/utils'

/** The box in CSS pixels and the device's pixels for each of them. */
export type FrameSize = { width: number; height: number; dpr: number }
/** A point, in CSS pixels of the box or in pixels of the picture. */
export type FramePoint = { x: number; y: number }
type Modifiers = { altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }

export type FramePointerEvent = Modifiers & {
  kind: 'down' | 'up' | 'move'
  x: number
  y: number
  /** Where that is in the picture, in its pixels; null when the point is in the letterbox, or nothing is drawn yet. */
  frame: FramePoint | null
  button: number
  buttons: number
  /** The count of presses (2 for a double press). */
  detail: number
}
export type FrameWheelEvent = Modifiers & { x: number; y: number; frame: FramePoint | null; deltaX: number; deltaY: number; deltaMode: number }
export type FrameKeyEvent = Modifiers & { kind: 'down' | 'up'; key: string; code: string; keyCode: number; repeat: boolean }

/** What can be drawn: encoded bytes, a `Blob`, or a bitmap the surface takes over. */
export type FrameSource = BufferSource | Blob | ImageBitmap

/** What the app can do to the surface, through its `ref`. */
export type FrameSurfaceHandle = {
  /** Draws a picture; resolves to whether it was drawn (false: broken, or older than one already drawn). */
  draw(source: FrameSource): Promise<boolean>
  /** Takes the picture away; the box is the quiet ground again. */
  clear(): void
  focus(): void
  /** The size last measured, null before the box has one. */
  readonly size: FrameSize | null
}

export type FrameSurfaceProps = {
  ref?: React.Ref<FrameSurfaceHandle> | undefined
  /** The name for screen readers («Web page»). */
  label: string
  /** `fill`: the picture over the whole box (the default); `contain`: all of it, centred, with a letterbox. */
  fit?: 'fill' | 'contain' | undefined
  /** The type of encoded bytes (default `image/jpeg`). */
  type?: string | undefined
  /** The size of the box changed (see above). */
  onSize?: ((size: FrameSize) => void) | undefined
  /** How long the box holds still before a change is told, in ms. Default 150. */
  settleMs?: number | undefined
  onPointer?: ((event: FramePointerEvent) => void) | undefined
  onWheel?: ((event: FrameWheelEvent) => void) | undefined
  onKey?: ((event: FrameKeyEvent) => void) | undefined
  /** Text pasted while the surface has the focus. */
  onPaste?: ((text: string) => void) | undefined
  /** The keys the page's commands keep for themselves (`Ctrl+Tab`): not sent to `onKey`, and left alone. */
  appKeys?: ((event: KeyboardEvent) => boolean) | undefined
  className?: string | undefined
}

const isBitmap = (source: FrameSource): source is ImageBitmap => typeof (source as ImageBitmap).close === 'function' && 'width' in source && !(source instanceof Blob)

async function decode(source: FrameSource, type: string): Promise<ImageBitmap> {
  if (isBitmap(source)) return source
  return createImageBitmap(source instanceof Blob ? source : new Blob([source as BlobPart], { type }))
}

/** Where a picture of `width` by `height` goes in a box, in CSS pixels. */
export function frameRect(fit: 'fill' | 'contain', box: { width: number; height: number }, picture: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
  if (fit === 'fill' || picture.width < 1 || picture.height < 1) return { x: 0, y: 0, width: box.width, height: box.height }
  const scale = Math.min(box.width / picture.width, box.height / picture.height)
  const width = picture.width * scale
  const height = picture.height * scale
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height }
}

function FrameSurface({ ref, label, fit = 'fill', type = 'image/jpeg', onSize, settleMs = 150, onPointer, onWheel, onKey, onPaste, appKeys, className }: FrameSurfaceProps) {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const box = React.useRef<FrameSize | null>(null)
  const bitmap = React.useRef<ImageBitmap | null>(null)
  const requested = React.useRef(0)
  const drawn = React.useRef(0)
  const latest = React.useRef({ fit, type, onSize, settleMs, onPointer, onWheel, onKey, onPaste, appKeys })
  latest.current = { fit, type, onSize, settleMs, onPointer, onWheel, onKey, onPaste, appKeys }

  const paint = React.useCallback(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    context.clearRect(0, 0, element.width, element.height)
    const picture = bitmap.current
    const size = box.current
    if (!picture || !size) return
    const at = frameRect(latest.current.fit, size, picture)
    context.drawImage(picture, at.x * size.dpr, at.y * size.dpr, at.width * size.dpr, at.height * size.dpr)
  }, [])

  // The picture the app can draw again when the fit changes.
  React.useEffect(() => { paint() }, [fit, paint])

  React.useImperativeHandle(ref, () => ({
    async draw(source) {
      const mine = ++requested.current
      let next: ImageBitmap
      try {
        next = await decode(source, latest.current.type)
      } catch {
        return false
      }
      if (mine < drawn.current) {
        next.close()
        return false
      }
      drawn.current = mine
      bitmap.current?.close()
      bitmap.current = next
      paint()
      return true
    },
    clear() {
      requested.current += 1
      drawn.current = requested.current
      bitmap.current?.close()
      bitmap.current = null
      paint()
    },
    focus() { canvas.current?.focus() },
    get size() { return box.current },
  }), [paint])

  // The box: the canvas follows it at once, the app hears of it when it holds still.
  React.useEffect(() => {
    const element = canvas.current
    const holder = element?.parentElement
    if (!element || !holder || typeof ResizeObserver === 'undefined') return
    let timer: ReturnType<typeof setTimeout> | null = null
    let told = false
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      const width = entry?.contentRect.width ?? 0
      const height = entry?.contentRect.height ?? 0
      if (width < 1 || height < 1) return
      const dpr = window.devicePixelRatio || 1
      const size = { width, height, dpr }
      box.current = size
      element.width = Math.max(1, Math.round(width * dpr))
      element.height = Math.max(1, Math.round(height * dpr))
      paint()
      if (timer !== null) clearTimeout(timer)
      if (!told) {
        told = true
        latest.current.onSize?.(size)
        return
      }
      timer = setTimeout(() => { timer = null; latest.current.onSize?.(size) }, latest.current.settleMs)
    })
    observer.observe(holder)
    return () => {
      observer.disconnect()
      if (timer !== null) clearTimeout(timer)
    }
  }, [paint])

  // The input, with native listeners: a wheel that is stopped must not be passive, and a handler is read when it fires.
  React.useEffect(() => {
    const element = canvas.current
    if (!element) return
    const where = (event: { clientX: number; clientY: number }): { x: number; y: number; frame: FramePoint | null } => {
      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const picture = bitmap.current
      if (!picture) return { x, y, frame: null }
      const at = frameRect(latest.current.fit, { width: rect.width, height: rect.height }, picture)
      const inside = x >= at.x && y >= at.y && x <= at.x + at.width && y <= at.y + at.height
      return { x, y, frame: inside ? { x: ((x - at.x) / at.width) * picture.width, y: ((y - at.y) / at.height) * picture.height } : null }
    }
    const mods = (event: Modifiers): Modifiers => ({ altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey })
    const pointer = (kind: FramePointerEvent['kind']) => (event: PointerEvent) => {
      const handler = latest.current.onPointer
      if (!handler) return
      if (kind === 'down') {
        element.focus()
        try { element.setPointerCapture(event.pointerId) } catch { /* a pointer that is gone */ }
        event.preventDefault()
      }
      handler({ kind, ...where(event), button: event.button, buttons: event.buttons, detail: event.detail, ...mods(event) })
    }
    const down = pointer('down')
    const up = pointer('up')
    const move = pointer('move')
    const wheel = (event: WheelEvent) => {
      const handler = latest.current.onWheel
      if (!handler) return
      event.preventDefault()
      handler({ ...where(event), deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode, ...mods(event) })
    }
    const menu = (event: Event) => { if (latest.current.onPointer) event.preventDefault() }
    const key = (kind: FrameKeyEvent['kind']) => (event: KeyboardEvent) => {
      const handler = latest.current.onKey
      if (!handler || latest.current.appKeys?.(event)) return
      event.preventDefault()
      handler({ kind, key: event.key, code: event.code, keyCode: event.keyCode, repeat: event.repeat, ...mods(event) })
    }
    const keyDown = key('down')
    const keyUp = key('up')
    const paste = (event: ClipboardEvent) => {
      const handler = latest.current.onPaste
      if (!handler) return
      event.preventDefault()
      const text = event.clipboardData?.getData('text/plain')
      if (text) handler(text)
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointermove', move)
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('contextmenu', menu)
    element.addEventListener('keydown', keyDown)
    element.addEventListener('keyup', keyUp)
    element.addEventListener('paste', paste)
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('contextmenu', menu)
      element.removeEventListener('keydown', keyDown)
      element.removeEventListener('keyup', keyUp)
      element.removeEventListener('paste', paste)
    }
  }, [])

  // The last picture is the surface's to close when it goes.
  React.useEffect(() => () => { bitmap.current?.close(); bitmap.current = null }, [])

  return (
    <div data-slot="frame-surface" className={cn('relative size-full min-h-0 min-w-0 overflow-hidden bg-paper-2', className)}>
      <canvas ref={canvas} role="application" aria-label={label} tabIndex={0} data-slot="frame-surface-canvas" className={cn('absolute inset-0 size-full touch-none', FOCUS_RING_INSET)} />
    </div>
  )
}

export { FrameSurface }
