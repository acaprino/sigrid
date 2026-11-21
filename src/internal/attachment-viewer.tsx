import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Minus, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { FOCUS_RING_INSET } from '../lib/focus'

/** A page of the document: the measures reserve its place before the image arrives. */
export type ViewerPage = {
  /** Width and height of the page, in any unit (only the ratio matters). */
  width: number
  height: number
  /** The image of the page (a `blob:` or `data:` address). Absent: the page is not drawn yet. */
  src?: string | null | undefined
}

export type AttachmentViewerStatus =
  | { kind: 'loading'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

export type AttachmentViewerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The name of the file. */
  title: string
  status: AttachmentViewerStatus
  /** The pages, in order. They are only looked at when `status.kind === 'ready'`. */
  pages?: ViewerPage[] | undefined
  /** Zoom: 1 is the width of the column. Chosen by whoever uses the package (also to draw sharp). */
  zoom?: number | undefined
  onZoomChange?: ((zoom: number) => void) | undefined
  /** A page has entered (or is about to enter) the view: whoever uses the package draws it and provides `src`. */
  onNeedPage?: ((index: number) => void) | undefined
  /** «Open the original»: downloads the file or opens it in the program. Absent: no button. */
  onOpenOriginal?: (() => void) | undefined
  /** The name of the `onOpenOriginal` action. */
  originalLabel?: string | undefined
  /** The sheet enters from the right (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/** The zoom steps: the width of the column is 1. */
export const VIEWER_ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3] as const

const percent = (zoom: number) => `${Math.round(zoom * 100)}%`

/** The step nearest to `zoom`, for when the caller sends a value that is not in the list. */
function nearestStep(zoom: number): number {
  return VIEWER_ZOOMS.reduce((best, step) => (Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best), 1 as number)
}

/**
 * The preview of an attachment (internal: `TaskSheet` opens it with the `preview` prop, the package always exports
 * sixteen components): pages one below the other in a sheet on the right (full width on the phone, a sheet inside the
 * page like the task details everywhere else). Only the drawing is here: whoever uses the
 * package opens and draws the document, provides the pages with their measures, provides the image when `onNeedPage`
 * asks for it and chooses the zoom. A page asks for its image only when it is close to entering the view.
 */
export function AttachmentViewer({ open, onOpenChange, title, status, pages = [], zoom = 1, onZoomChange, onNeedPage, onOpenOriginal, originalLabel: ownOriginalLabel, animated }: AttachmentViewerProps) {
  const words = useWords().viewer
  const originalLabel = ownOriginalLabel ?? words.openOriginal
  const [current, setCurrent] = useState(0)
  const step = nearestStep(zoom)
  const at = VIEWER_ZOOMS.indexOf(step as (typeof VIEWER_ZOOMS)[number])
  const ready = status.kind === 'ready'
  const total = ready ? pages.length : 0
  const position = ready && total > 0 ? words.page(Math.min(current + 1, total), total) : ' '

  const header = (
    <div className="flex shrink-0 items-center gap-1 border-b border-line px-4 py-3 pr-14 pointer-coarse:py-2">
      <div className="min-w-0 flex-1">
        <SheetTitle className="truncate text-sm text-ink" title={title}>
          {title}
        </SheetTitle>
        <SheetDescription className="text-xs text-ink-mute">{position}</SheetDescription>
      </div>
      {ready && onZoomChange ? (
        <div className="flex shrink-0 items-center" role="group" aria-label={words.zoom}>
          <Button variant="ghost" size="icon-sm" aria-label={words.zoomOut} disabled={at <= 0} onClick={() => onZoomChange(VIEWER_ZOOMS[Math.max(0, at - 1)] ?? 1)}>
            <Minus aria-hidden="true" />
          </Button>
          <span className="min-w-10 text-center text-xs text-ink-soft tabular-nums" aria-live="polite">
            {percent(step)}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label={words.zoomIn} disabled={at >= VIEWER_ZOOMS.length - 1} onClick={() => onZoomChange(VIEWER_ZOOMS[Math.min(VIEWER_ZOOMS.length - 1, at + 1)] ?? 1)}>
            <Plus aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      {onOpenOriginal ? (
        <Button variant="ghost" size="icon-sm" aria-label={originalLabel} title={originalLabel} onClick={onOpenOriginal}>
          <Download aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )

  let body: ReactNode
  if (status.kind === 'loading') {
    body = (
      // The words alone: a spinning icon would be a loop (the motion rules allow loops only for loading skeletons).
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-ink-soft">
        {status.label}
      </div>
    )
  } else if (status.kind === 'error') {
    body = (
      // The sentence says what happened: no alert icon on top of it (R6).
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-soft">
        <p className="max-w-xs">{status.message}</p>
        {onOpenOriginal ? (
          <Button variant="outline" onClick={onOpenOriginal}>
            {originalLabel}
          </Button>
        ) : null}
      </div>
    )
  } else {
    body = <PageColumn pages={pages} zoom={step} onNeedPage={onNeedPage} onCurrent={setCurrent} />
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col" data-slot="attachment-viewer">
      {header}
      {body}
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton animated={animated} className="w-full gap-0 overflow-hidden bg-raised p-0 sm:max-w-3xl lg:max-w-4xl">
        {content}
      </SheetContent>
    </Sheet>
  )
}

type PageColumnProps = {
  pages: ViewerPage[]
  zoom: number
  onNeedPage: ((index: number) => void) | undefined
  onCurrent: (index: number) => void
}

/** The pages one below the other. With zoom above 1 the column widens and also scrolls sideways. */
function PageColumn({ pages, zoom, onNeedPage, onCurrent }: PageColumnProps) {
  const words = useWords().viewer
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef({ onNeedPage, onCurrent })
  latest.current = { onNeedPage, onCurrent }
  const ratios = useRef(new Map<number, number>())
  // Where we were in the document (0..1): when the zoom changes, the page being looked at stays more or less the same.
  const place = useRef(0)

  useLayoutEffect(() => {
    const stage = root.current
    if (stage) stage.scrollTop = place.current * stage.scrollHeight
  }, [zoom])

  useEffect(() => {
    const stage = root.current
    if (!stage) return
    const items = Array.from(stage.querySelectorAll<HTMLElement>('[data-page]'))
    // Without IntersectionObserver (tests in jsdom, old engines) only the first pages are requested.
    if (typeof IntersectionObserver === 'undefined') {
      items.slice(0, 3).forEach((_, index) => latest.current.onNeedPage?.(index))
      return
    }
    ratios.current.clear()
    const need = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) latest.current.onNeedPage?.(Number((entry.target as HTMLElement).dataset.page))
      },
      // One page before and one after: when scrolling, it is already drawn.
      { root: stage, rootMargin: '100% 0px' },
    )
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.current.set(Number((entry.target as HTMLElement).dataset.page), entry.intersectionRatio)
        let best = -1
        let bestRatio = 0
        for (const [index, ratio] of ratios.current) if (ratio > bestRatio || (ratio === bestRatio && ratio > 0 && index < best)) [best, bestRatio] = [index, ratio]
        if (best >= 0) latest.current.onCurrent(best)
      },
      { root: stage, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    for (const item of items) {
      need.observe(item)
      seen.observe(item)
    }
    return () => {
      need.disconnect()
      seen.disconnect()
    }
  }, [pages.length, zoom])

  return (
    <div
      ref={root}
      className={cn('flex-1 overflow-auto overscroll-contain bg-paper-2 p-3 sm:p-4', FOCUS_RING_INSET)}
      tabIndex={0}
      aria-label={words.pages}
      onScroll={(event) => {
        const stage = event.currentTarget
        if (stage.scrollHeight > 0) place.current = stage.scrollTop / stage.scrollHeight
      }}
    >
      <div className={cn('flex flex-col gap-3', zoom < 1 && 'mx-auto')} style={{ width: `${zoom * 100}%` }}>
        {pages.map((page, index) => (
          <div
            key={index}
            data-page={index}
            role="img"
            aria-label={words.page(index + 1, pages.length)}
            // A page is a raised sheet: the sm shadow (with its 1px edge), no extra ring (R4).
            className="relative w-full overflow-hidden rounded-sm bg-raised shadow-sm"
            style={{ aspectRatio: `${Math.max(page.width, 1)} / ${Math.max(page.height, 1)}` }}
          >
            {page.src ? (
              <img src={page.src} alt="" draggable={false} className="absolute inset-0 size-full select-none" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-ink-mute">{index + 1}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
