import { useEffect, useRef } from 'react'
import { kindIcon, type ItemKind } from '../internal/kinds'
import { cn } from '../lib/utils'

/**
 * The only sources a thumbnail accepts: a JPEG or PNG image in base64, whole in the string. No `javascript:`,
 * `data:text/html`, `data:image/svg+xml` (it can carry script), `http:` or `blob:`: the thumbnail comes from the app as
 * a data URL and no other value must ever reach `src`.
 */
const SAFE_THUMBNAIL = /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/

/** The string if it is an acceptable thumbnail (`data:image/jpeg;base64,…` or `data:image/png;base64,…`), otherwise null. */
export function safeThumbnail(src: string | null | undefined): string | null {
  return typeof src === 'string' && SAFE_THUMBNAIL.test(src) ? src : null
}

const SIZE = { sheet: 'size-16', row: 'size-10' } as const

export type ThumbnailProps = {
  /** The data URL; null, absent or not acceptable: the neutral box with the mark of the kind. */
  src: string | null | undefined
  /** The mark of the neutral box. */
  kind: ItemKind
  /** 64px in the details, 40px on the rows. */
  size: keyof typeof SIZE
  /**
   * The name for assistive technology (the kind: «file»), or null if the row already says it or it is not needed. The
   * image always has an empty `alt`: the title next to it already says what it is.
   */
  label: string | null
  /**
   * A click on the thumbnail does what «Open» does. It is a button (never a link), out of the Tab order and hidden from
   * assistive technology: for keyboard and screen readers there is already «Open» in the same row, and two buttons with
   * the same name would be a duplicate.
   */
  onOpen?: (() => void) | undefined
}

/** A square thumbnail (`object-fit: cover`) or, until there is one, a neutral box of the same size. Still. */
export function Thumbnail({ src, kind, size, label, onOpen }: ThumbnailProps) {
  const safe = safeThumbnail(src)
  const Icon = kindIcon(kind)
  const frame = cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper-2', SIZE[size])
  const content = safe ? (
    <img src={safe} alt="" draggable={false} className="size-full object-cover" />
  ) : (
    <Icon aria-hidden="true" className="size-4 text-ink-mute" />
  )
  const name = label ? <span role="img" aria-label={label} className="sr-only" /> : null
  if (onOpen) {
    return (
      <>
        <button type="button" tabIndex={-1} aria-hidden="true" data-slot="thumbnail" data-thumbnail={safe ? 'image' : 'placeholder'} onClick={onOpen} className={frame}>
          {content}
        </button>
        {name}
      </>
    )
  }
  return (
    <>
      <span aria-hidden="true" data-slot="thumbnail" data-thumbnail={safe ? 'image' : 'placeholder'} className={frame}>
        {content}
      </span>
      {name}
    </>
  )
}

/**
 * Asks for a thumbnail only once per mounted row: when `when` becomes true it calls `onNeed(id)`, then never again for
 * that id, even if the value stays null (no loop). It draws nothing.
 */
export function NeedThumbnail({ id, when, onNeed }: { id: string; when: boolean; onNeed?: ((id: string) => void) | undefined }) {
  const asked = useRef<string | null>(null)
  const latest = useRef(onNeed)
  useEffect(() => {
    latest.current = onNeed
  })
  const has = Boolean(onNeed)
  useEffect(() => {
    if (!when || !has || asked.current === id) return
    asked.current = id
    latest.current?.(id)
  }, [id, when, has])
  return null
}
