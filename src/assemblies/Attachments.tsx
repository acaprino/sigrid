// Park UI (MIT) file-upload 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts)
//
// «Attachments» (a section of an entry's details): the list of the attachments and the zone to add one. From Park's `file-upload`
// recipe comes the look: the zone on the raised sheet with l3 corners and a 2px dashed border that turns solid (in the
// ink, R2) while something is dragged over it, two lines of text (no upload icon: the words say it, R6), and each
// attachment a raised item with l3 corners and the xs shadow in place of Park's hairline (R4: file tiles get a shadow). The control rests on Ark UI's
// FileUpload (`@ark-ui/react/file-upload`).
// Ark gives: the button that opens the system picker and the `<input type="file">` behind it (outside the
// accessibility tree and the Tab order, emptied before each choice so the same file can be chosen again), and the
// check of every file against the limit (`maxFileSize`): the ones within it are accepted, the others rejected with
// their reason. Its list of chosen files is kept empty: a file goes to `onAttach` at once and the list is the caller's
// (`AttachmentView`), with thumbnail, state, «Open» and «Remove» that hand the actions back to `onAction`.
// Ours: the drop (`useDropTarget`: Ark's dropzone takes files only and keeps every other drag for itself, while here a
// link is an attachment too and dropped text is refused with a message; a dropped file goes through Ark's check like a
// chosen one); the words, in English; the field for a typed link; focus after «Remove». No animation, no preview, no
// network.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { FileUpload } from '@ark-ui/react/file-upload'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Tooltip } from '../primitives/tooltip'
import { limitLabel, overLimitNotice, useDropTarget, type AttachPayload, type DropPayload } from '../internal/drop'
import { DROP_BUTTON, DROP_HINT, DROP_TITLE, DROP_ZONE, DROP_ZONE_ACTIVE, useFileChoice } from '../components/file-drop'
import { kindIcon, kindLabel, type AttachmentKind } from '../internal/kinds'
import { DEFAULT_WORDS, useWords, type Words } from '../words'
import { NeedThumbnail, Thumbnail } from '../primitives/thumbnail'
import { cn } from '../lib/utils'
import { Icon } from '../icons'
import { GROUP_LABEL } from '../lib/rows'
import { FOCUS_RING } from '../lib/focus'

/**
 * The state of an attachment, as the app says it: `ready` can be opened; `arriving` is arriving from the sync; `notUploaded`
 * the other device has not uploaded it yet; `overLimit` exceeds the limit; `textOnly` only its text is left.
 */
export type AttachmentState = 'ready' | 'arriving' | 'notUploaded' | 'overLimit' | 'textOnly'

/**
 * An attachment in the details. `A` is the app's action type: the
 * sheet does not read it, it hands it back to `onAction`. `open` null: no «Open». `href` is shown as text, never
 * as a clickable link: it is opened only with `open`.
 */
export type AttachmentView<A = unknown> = {
  id: string
  kind: AttachmentKind
  title: string
  /** A line under the title («2.4 MB», the sender of an email). Null: none. */
  detail: string | null
  href: string | null
  state: AttachmentState
  /**
   * The state in words, if the caller gives it («Arriving»); null: none. Absent: the sheet's own words
   * («Arriving», «Not uploaded yet from the other device», «Over the 50 MB limit»).
   */
  stateLabel?: string | null | undefined
  /**
   * An image with its thumbnail ready: the row shows a 64px thumbnail in place
   * of the type mark, taken from `the section's `thumbnails[id]``. Absent or false: the row as before.
   */
  thumbnail?: boolean | undefined
  open: A | null
  remove: A
}

export type AttachmentSummary = { kinds: AttachmentKind[]; count: number }

/** The summary `{ kinds, count }`, or the attachments themselves (`AttachmentView[]`): the `kind` of each is enough. */
export type AttachmentMarksInput = AttachmentSummary | readonly { kind: AttachmentKind }[]

export function summarize(input: AttachmentMarksInput): AttachmentSummary {
  if ('count' in input && !Array.isArray(input)) return input as AttachmentSummary
  const list = input as readonly { kind: AttachmentKind }[]
  return { kinds: list.map((a) => a.kind), count: list.length }
}

/** Indicator of the attachments on a row or a details sheet: one mark per kind and the number. Nothing at zero. */
export function AttachmentMarks(props: AttachmentSummary | { attachments: AttachmentMarksInput }) {
  const words = useWords()
  const { kinds, count } = 'attachments' in props ? summarize(props.attachments) : props
  if (count <= 0) return null
  const unique = Array.from(new Set(kinds))
  return (
    // `role="img"`: an `aria-label` on a `<span>` without a role is not exposed to assistive technology.
    <span role="img" aria-label={words.attachments.count(count)} className="inline-flex items-center gap-1 text-ink-mute">
      {/* One kind only: its mark; several kinds: the paperclip (sketch `lista-attivita.html`), not a row of icons. */}
      <AttachmentIcon kind={unique.length === 1 ? unique[0] : undefined} />
      <span className="text-xs tabular-nums">{count}</span>
    </span>
  )
}

function AttachmentIcon({ kind }: { kind: AttachmentKind | undefined }) {
  if (kind === undefined) return <Icon name="attach" className="size-3.5" />
  const Glyph = kindIcon(kind)
  return <Glyph aria-hidden="true" className="size-3.5" />
}

/** The state in calm words; null for a ready attachment (or a text-only one). */
export function stateText(state: AttachmentState, maxFileBytes: number, words: Words = DEFAULT_WORDS): string | null {
  switch (state) {
    case 'arriving':
      return words.attachments.arriving
    case 'notUploaded':
      return words.attachments.notUploaded
    case 'overLimit':
      return words.attachments.overLimit(limitLabel(maxFileBytes))
    default:
      return null
  }
}

/** An address typed by hand: `example.com/x` becomes `https://example.com/x`; only http and https. Null if it is not one. */
export function typedUrl(value: string): string | null {
  const v = value.trim()
  if (!v || /\s/.test(v)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : v.includes('.') ? `https://${v}` : null
  if (!withScheme) return null
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export type AttachmentsSectionProps<A> = {
  attachments: AttachmentView<A>[]
  onAction: (action: A) => void
  onAttach: (payload: AttachPayload) => void
  maxFileBytes: number
  thumbnails: Record<string, string | null | undefined> | undefined
  onNeedThumbnail: ((id: string) => void) | undefined
  /**
   * What the section says when text is dropped on it (text is not an attachment): the app says where text goes
   * instead. Absent: the toolkit's words, a neutral sentence.
   */
  textNotice?: string | undefined
}

/** «Attachments»: the list and the zone to add (drop, «Add a file», a typed link). */
export function AttachmentsSection<A>({ attachments, onAction, onAttach, maxFileBytes, thumbnails, onNeedThumbnail, textNotice: ownTextNotice }: AttachmentsSectionProps<A>) {
  const words = useWords()
  const said = words.attachments
  const textNotice = ownTextNotice ?? said.textNotice
  const headingId = useId()
  const linkId = useId()
  const [notice, setNotice] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const listRef = useRef<HTMLUListElement>(null)
  const chooseRef = useRef<HTMLButtonElement>(null)
  // «Remove» pressed: the id and the position of the row. When the row disappears, focus goes to whatever takes its place.
  const removing = useRef<{ id: string; index: number } | null>(null)
  useEffect(() => {
    const r = removing.current
    if (!r || attachments.some((a) => a.id === r.id)) return
    removing.current = null
    const rows = listRef.current?.querySelectorAll<HTMLElement>(':scope > li') ?? []
    const row = rows[Math.min(r.index, rows.length - 1)]
    // The first reachable button: the clickable thumbnail is out of the Tab order and hidden, it must not take focus.
    const target = row?.querySelector<HTMLElement>('button:not([tabindex="-1"])') ?? chooseRef.current
    target?.focus()
  }, [attachments])

  // Ark's FileUpload, used for its picker and its check (`useFileChoice`): each choice is judged on its own and the
  // same file can be added twice, as the caller's list allows. The drop is `useDropTarget` below, on the whole zone.
  const upload = useFileChoice({
    maxFiles: Number.MAX_SAFE_INTEGER,
    maxFileBytes,
    onFiles: (files) => {
      setNotice(null)
      onAttach({ kind: 'files', files })
    },
    // The limit comes first: a file over `maxFileBytes` is never sent, the others are.
    onRefuse: (refused) => setNotice(overLimitNotice(refused.filter((r) => r.errors.includes('FILE_TOO_LARGE')).map((r) => r.file), maxFileBytes, words)),
  })
  const send = (payload: DropPayload) => {
    if (payload.kind === 'text') {
      setNotice(textNotice)
      return
    }
    if (payload.kind === 'files') {
      upload.setFiles(payload.files)
      return
    }
    setNotice(null)
    onAttach(payload)
  }
  const drop = useDropTarget(send)
  const onLink = (e: FormEvent) => {
    e.preventDefault()
    const url = typedUrl(link)
    if (!url) {
      setNotice(said.badAddress)
      return
    }
    setLink('')
    send({ kind: 'link', url, title: null })
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className={cn(GROUP_LABEL, "text-ink-mute")}>
        {said.heading}
      </h3>
      {attachments.length ? (
        <ul ref={listRef} aria-label={said.heading} className="space-y-2">
          {attachments.map((a, index) => {
            const Glyph = kindIcon(a.kind)
            const state = a.stateLabel !== undefined ? a.stateLabel : stateText(a.state, maxFileBytes, words)
            // Under the title: the detail, or the address. Always text: an `href` never becomes a link.
            const detail = a.detail ?? a.href
            const open = a.open
            const canOpen = open !== null && a.state !== 'textOnly'
            const thumb = a.thumbnail ? thumbnails?.[a.id] : undefined
            return (
              // A file tile is a raised surface: the xs shadow, no border (R4).
              <li key={a.id} className="flex items-center gap-3 rounded-lg bg-raised px-3 py-2.5 text-sm shadow-xs">
                {a.thumbnail ? (
                  <>
                    <NeedThumbnail id={a.id} when={thumb === undefined || thumb === null} onNeed={onNeedThumbnail} />
                    <Thumbnail src={thumb} kind={a.kind} size="sheet" label={kindLabel(a.kind, words)} onOpen={canOpen && open !== null ? () => onAction(open) : undefined} />
                  </>
                ) : (
                  <Glyph role="img" aria-label={kindLabel(a.kind, words)} className="size-4 shrink-0 text-ink-mute" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink" title={a.title}>
                    {a.title}
                  </p>
                  {detail ? (
                    <p className="truncate text-xs text-ink-mute" title={detail}>
                      {detail}
                    </p>
                  ) : null}
                  {state ? <p className="text-xs text-ink-mute">{state}</p> : null}
                </div>
                {canOpen && open !== null ? (
                  <Button variant="ghost" size="xs" aria-label={said.openNamed(a.title)} onClick={() => onAction(open)}>
                    {said.open}
                  </Button>
                ) : null}
                <Tooltip label={said.removeNamed(a.title)}>
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={said.removeNamed(a.title)}
                    onClick={() => {
                      removing.current = { id: a.id, index }
                      onAction(a.remove)
                    }}
                  >
                    {said.remove}
                  </Button>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      ) : null}
      <FileUpload.RootProvider value={upload} asChild>
        <div
          {...drop.props}
          role="group"
          aria-label={said.add}
          data-slot="file-upload"
          data-drop-active={drop.active}
          // While something is dragged over it the dashed edge turns solid ink: the accent is not for this (R2).
          className={cn('space-y-2', DROP_ZONE, drop.active && DROP_ZONE_ACTIVE)}
        >
          {/* The zone is the control (name and keyboard: a real button); the input stays outside it and outside the accessibility tree. */}
          <FileUpload.HiddenInput />
          <FileUpload.Trigger
            ref={chooseRef}
            // Named by what it shows (its title and the hint under it), not by a shorter label of its own: whoever
            // speaks to the screen says the words they see (WCAG 2.5.3).
            data-slot="file-upload-trigger"
            className={cn(DROP_BUTTON, 'hover:bg-ink/4', FOCUS_RING)}
          >
            <span className={DROP_TITLE}>{drop.active ? said.dropHere : said.addFile}</span>
            <span className={DROP_HINT}>{said.hint(limitLabel(maxFileBytes))}</span>
          </FileUpload.Trigger>
          <form onSubmit={onLink} className="flex items-center gap-2 px-1 pb-1">
            <label htmlFor={linkId} className="sr-only">
              {said.link}
            </label>
            <Input id={linkId} value={link} onChange={(e) => setLink(e.target.value)} placeholder={said.pasteLink} inputMode="url" />
            <Button type="submit" variant="ghost" size="sm" disabled={!link.trim()}>
              {said.addLink}
            </Button>
          </form>
        </div>
      </FileUpload.RootProvider>
      <p role="status" className={cn('text-xs text-ink-mute', !notice && 'sr-only')}>
        {notice}
      </p>
    </section>
  )
}
