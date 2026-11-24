import { useCallback, useRef, useState, type DragEvent } from 'react'
import { DEFAULT_WORDS, type Words } from '../words'

/**
 * What a drag brings in, already read: files, a link or text. Only one, in this order of precedence: a drag with
 * files and text (an email from Outlook: the file and its subject) is made of files. Several addresses together are
 * text, one per line. Whether a file is an email is decided by whoever receives it.
 */
export type DropPayload =
  | { kind: 'files'; files: File[] }
  | { kind: 'link'; url: string; title: string | null }
  | { kind: 'text'; text: string }

/** What becomes an attachment: files or a link (text is not an attachment). */
export type AttachPayload = Extract<DropPayload, { kind: 'files' | 'link' }>

/**
 * The limit of a file, 50 MiB. Without a path (the HTML drop of the window) the bytes cross the IPC whole: a larger
 * file is refused before sending it, with a message.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

type TransferLike = Pick<DataTransfer, 'types' | 'getData' | 'files'>

/** The text of an `<a>` link in `text/html` (Chromium puts it next to the address), or null. */
function anchorText(html: string): string | null {
  if (!html || typeof DOMParser === 'undefined') return null
  const a = new DOMParser().parseFromString(html, 'text/html').querySelector('a')
  const text = a?.textContent?.replace(/\s+/g, ' ').trim()
  return text ? text : null
}

export function payloadFromDataTransfer(dt: TransferLike): DropPayload | null {
  const types = Array.from(dt.types ?? [])
  const files = dt.files ? Array.from(dt.files) : []
  if (files.length) return { kind: 'files', files }
  if (types.includes('text/uri-list')) {
    const urls = dt
      .getData('text/uri-list')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    if (urls.length > 1) return { kind: 'text', text: urls.join('\n') }
    const url = urls[0]
    if (url) {
      // Firefox: `text/x-moz-url` is «address\ntitle»; Chromium: the title is the text of the link in `text/html`.
      const moz = types.includes('text/x-moz-url') ? dt.getData('text/x-moz-url').split(/\r?\n/)[1]?.trim() : undefined
      const title = moz || (types.includes('text/html') ? anchorText(dt.getData('text/html')) : null)
      return { kind: 'link', url, title: title && title !== url ? title : null }
    }
  }
  if (types.includes('text/plain')) {
    const text = dt.getData('text/plain').trim()
    if (text) return { kind: 'text', text }
  }
  return null
}

/** «50 MB»: the limit in words, rounded to the MiB. */
export function limitLabel(maxFileBytes: number): string {
  return `${Math.max(1, Math.round(maxFileBytes / (1024 * 1024)))} MB`
}

/** The message for whoever tried to add files over the limit: one by its name, several by their number. */
export function overLimitNotice(refused: readonly File[], maxFileBytes: number, words: Words = DEFAULT_WORDS): string | null {
  if (!refused.length) return null
  const limit = limitLabel(maxFileBytes)
  return refused.length === 1 ? words.attachments.fileOverLimit(refused[0]!.name, limit) : words.attachments.filesOverLimit(refused.length, limit)
}

/**
 * Removes the files over the limit from the payload. `payload` is what is left to send (null if nothing is left),
 * `notice` the message for whoever dragged (null if nothing was refused).
 */
export function withinLimit(payload: DropPayload, maxFileBytes: number, words: Words = DEFAULT_WORDS): { payload: DropPayload | null; notice: string | null } {
  if (payload.kind !== 'files') return { payload, notice: null }
  const kept = payload.files.filter((f) => f.size <= maxFileBytes)
  const refused = payload.files.filter((f) => f.size > maxFileBytes)
  if (!refused.length) return { payload, notice: null }
  return { payload: kept.length ? { kind: 'files', files: kept } : null, notice: overLimitNotice(refused, maxFileBytes, words) }
}

export type DropTarget = {
  props: {
    onDragStart: (e: DragEvent) => void
    onDragEnd: (e: DragEvent) => void
    onDragOver: (e: DragEvent) => void
    onDragLeave: (e: DragEvent) => void
    onDrop: (e: DragEvent) => void
  }
  active: boolean
}

/**
 * Makes an element a target for drags coming from outside the page.
 *
 * A drag that starts INSIDE the element (the text selected in an input, dragged to another point of the same input)
 * is not a drop from outside: while it lasts the element leaves it to the browser, without `preventDefault` and
 * without calling `onDrop`. An empty drop (nothing readable) does not call `onDrop`. The drop stops here: it does not
 * reach a listener further up the page.
 */
export function useDropTarget(onDrop: (payload: DropPayload) => void): DropTarget {
  const [active, setActive] = useState(false)
  const own = useRef(false)
  const onDragStart = useCallback(() => {
    own.current = true
  }, [])
  const onDragEnd = useCallback(() => {
    own.current = false
  }, [])
  const onDragOver = useCallback((e: DragEvent) => {
    if (own.current) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setActive(true)
  }, [])
  const onDragLeave = useCallback((e: DragEvent) => {
    if (own.current) return
    e.preventDefault()
    // Entering a child the element receives `dragleave`: it stays active as long as the pointer is inside.
    if (e.relatedTarget && 'nodeType' in e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return
    setActive(false)
  }, [])
  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (own.current) return
      e.preventDefault()
      e.stopPropagation()
      setActive(false)
      const payload = payloadFromDataTransfer(e.dataTransfer)
      if (payload) onDrop(payload)
    },
    [onDrop],
  )
  return { props: { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop: handleDrop }, active }
}
