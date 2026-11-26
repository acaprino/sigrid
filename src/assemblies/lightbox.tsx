// Pictures looked at one at a time, large: the photos of a message, the screens of a report, the pages of a scan
// that are images. A window that takes most of the screen, the picture whole in it (never cropped), its caption under
// it, where it is among the others («2 of 5»), and two buttons to the one before and the one after, which stay in
// their places and are off at the two ends (R14). The left and right arrows do the same; Esc and the close button
// close it. The app holds which picture is on (`index`) and whether the window is open.
// A file with pages, zoom and «open the original» is an `AttachmentViewer`; this is for pictures that are just looked at.
import * as React from 'react'
import { cn } from '../lib/utils'
import { Icon } from '../icons'
import { useWords } from '../words'
import { Button } from '../primitives/button'
import { DialogContent, Dialog as DialogRoot, DialogTitle } from '../primitives/dialog'
import { Tooltip } from '../primitives/tooltip'

/** One picture. */
export type LightboxImage = {
  id: string
  src: string
  /** What the picture shows, for who cannot see it. */
  alt: string
  /** A line under the picture. */
  caption?: string | undefined
}

export type LightboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The name of the set for screen readers and the title of the window («Photos of the site»). */
  title: string
  images: readonly LightboxImage[]
  /** The picture on show, counting from 0, which the app holds. */
  index: number
  onIndexChange: (index: number) => void
  /** The window enters with a movement. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
}

/** Pictures looked at one at a time, large, with the way to the one before and the one after. */
function Lightbox({ open, onOpenChange, title, images, index, onIndexChange, animated }: LightboxProps) {
  const words = useWords().lightbox
  const at = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0))
  const image = images[at]
  const move = (by: number) => {
    const next = at + by
    if (next >= 0 && next < images.length) onIndexChange(next)
  }
  const arrow = (by: -1 | 1) => {
    const name = by < 0 ? words.previous : words.next
    return (
      <Tooltip label={name} side="top" animated={animated}>
        <Button variant="outline" size="icon" aria-label={name} disabled={by < 0 ? at === 0 : at >= images.length - 1} animated={animated} onClick={() => move(by)}>
          <Icon name={by < 0 ? 'moveLeft' : 'moveRight'} />
        </Button>
      </Tooltip>
    )
  }
  return (
    <DialogRoot open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent
        animated={animated}
        data-lightbox=""
        className="flex h-[calc(100%-2rem)] flex-col gap-3 sm:max-w-5xl"
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return
          // The arrows of the page: the picture before is to the left, whatever the direction of the text.
          if (event.key === 'ArrowLeft') move(-1)
          else if (event.key === 'ArrowRight') move(1)
          else return
          event.preventDefault()
        }}
      >
        <DialogTitle className="pe-8">{title}</DialogTitle>
        {image ? (
          <figure data-slot="lightbox-figure" className="flex min-h-0 flex-1 flex-col gap-2">
            {/* The picture whole, on the quiet ground of what is looked at (as the pages of a file). */}
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-paper-2">
              <img key={image.id} src={image.src} alt={image.alt} draggable={false} className="max-h-full max-w-full object-contain" />
            </div>
            {image.caption ? <figcaption className="text-sm text-ink-soft wrap-anywhere">{image.caption}</figcaption> : null}
          </figure>
        ) : null}
        {/* Left and right are the sides of the pictures, whatever the direction of the text. */}
        <div data-slot="lightbox-actions" dir="ltr" className={cn('flex shrink-0 items-center justify-center gap-3')}>
          {arrow(-1)}
          <span role="status" data-slot="lightbox-count" className="min-w-16 text-center text-xs text-ink-mute tabular-nums">
            {images.length > 0 ? words.count(at + 1, images.length) : ''}
          </span>
          {arrow(1)}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

export { Lightbox }
