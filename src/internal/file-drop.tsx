// Park UI (MIT) file-upload 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/file-upload.ts)
//
// A zone that takes a file: dropped on it, or chosen with the system picker, so dragging is never the only way (WCAG
// 2.5.7). The look is the attachments zone's (Park's `file-upload` recipe): the raised sheet with l3 corners and a 2px
// dashed border in the control colour that turns solid ink while a file is dragged over it (the accent is not for this,
// R2), two lines of text and no upload icon (the words say it, R6), 96px tall so it is an easy target with a mouse and a
// finger. Ark UI's FileUpload gives the real button that opens the picker, the input behind it (outside the
// accessibility tree and the tab order, emptied before each choice so the same file can be chosen again) and the checks
// of type, size and count; the drop is the toolkit's `useDropTarget` (a drag that starts in the page is left alone).
// The words are the app's: the label (the button's name, the same while dragging or busy), the hint (its description),
// the line while dragging and while busy, and the error under the zone. Busy, the button keeps its focus and ignores
// clicks and drops, like a loading Button. No animation.
import { useId, type ReactNode, type Ref } from 'react'
import { FileUpload, useFileUpload } from '@ark-ui/react/file-upload'
import { useDropTarget, type DropPayload } from './drop'
import { cn } from '../lib/utils'
import { FOCUS_RING } from '../lib/focus'

/** Why a file was not taken: its type is not in `accept`, it is over `maxFileBytes`, or there were more than allowed. */
export type FileDropReason = 'type' | 'size' | 'count'

/** A file the zone did not take, and why. `file` is null for a dropped text or link, which is not a file. */
export type FileDropRefusal = { file: File | null; reason: FileDropReason }

export type FileDropProps = {
  /** The main line, and the name of the button that opens the picker: "Drop a file here, or choose one". */
  label: string
  /** The second line, read as the button's description: what the zone takes ("CSV, up to 5 MB"). */
  hint?: string | undefined
  /** The main line while a file is dragged over the zone ("Drop it here"); the label when absent. */
  dropLabel?: string | undefined
  /** The files chosen or dropped that pass the checks (one, unless `multiple`). */
  onFiles: (files: File[]) => void
  /** The files that do not pass, each with its reason: the app says why in `error`. */
  onRefuse?: ((refused: FileDropRefusal[]) => void) | undefined
  /** The types taken, as MIME type → extensions: `{ 'text/csv': ['.csv'] }`. A file passes on its type or its extension. */
  accept?: Record<string, string[]> | undefined
  /** The largest file taken, in bytes. */
  maxFileBytes?: number | undefined
  /** Several files at once. */
  multiple?: boolean | undefined
  disabled?: boolean | undefined
  /** Work under way on the file just taken: this line takes the label's place and is announced, the zone takes nothing. */
  busy?: string | null | undefined
  /** What went wrong, under the zone and announced at once; the border turns destructive. */
  error?: ReactNode
  /** The button that opens the picker: to give it focus again. */
  ref?: Ref<HTMLButtonElement> | undefined
  className?: string | undefined
}

/** Ark's own list of chosen files stays empty: each choice is judged on its own, and the same file can come again. */
const NO_FILES: File[] = []

function reasonOf(errors: readonly string[]): FileDropReason {
  if (errors.includes('TOO_MANY_FILES')) return 'count'
  if (errors.includes('FILE_INVALID_TYPE')) return 'type'
  if (errors.includes('FILE_TOO_LARGE')) return 'size'
  return 'type'
}

export function FileDrop({ label, hint, dropLabel, onFiles, onRefuse, accept, maxFileBytes, multiple = false, disabled = false, busy = null, error = null, ref, className }: FileDropProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const working = Boolean(busy)
  const invalid = error !== null && error !== undefined && error !== false && error !== ''

  const upload = useFileUpload({
    acceptedFiles: NO_FILES,
    maxFiles: multiple ? Number.MAX_SAFE_INTEGER : 1,
    ...(maxFileBytes === undefined ? {} : { maxFileSize: maxFileBytes }),
    ...(accept === undefined ? {} : { accept }),
    // The drop is `useDropTarget` below, on the whole zone.
    allowDrop: false,
    disabled,
    onFileAccept: ({ files }) => {
      if (files.length) onFiles(files)
    },
    onFileReject: ({ files }) => {
      if (!files.length) return
      // Two files with the same name and size in one choice: Ark takes the second for a copy of the first. Both were chosen.
      const twin = (errors: readonly string[]) => errors.every((e) => e === 'FILE_EXISTS')
      const refused = files.filter((r) => !twin(r.errors))
      if (refused.length) onRefuse?.(refused.map((r) => ({ file: r.file, reason: reasonOf(r.errors) })))
      const twins = files.filter((r) => twin(r.errors)).map((r) => r.file)
      if (twins.length) onFiles(twins)
      // Forgotten at once: the same file refused again must say so again.
      upload.clearRejectedFiles()
    },
  })

  const drop = useDropTarget((payload: DropPayload) => {
    if (disabled || working) return
    if (payload.kind === 'files') upload.setFiles(payload.files)
    else onRefuse?.([{ file: null, reason: 'type' }])
  })
  const dragging = drop.active && !disabled && !working
  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <FileUpload.RootProvider value={upload} asChild>
        <div
          {...drop.props}
          data-slot="file-drop"
          data-drop-active={dragging}
          data-busy={working || undefined}
          data-invalid={invalid || undefined}
          className={cn(
            'rounded-lg border-2 border-dashed border-input bg-raised p-1.5',
            invalid && 'border-destructive',
            dragging && 'border-solid border-ink bg-paper-2',
            disabled && 'opacity-50',
          )}
        >
          <FileUpload.HiddenInput />
          <FileUpload.Trigger
            ref={ref}
            aria-label={label}
            aria-describedby={describedBy || undefined}
            aria-busy={working || undefined}
            aria-disabled={working || undefined}
            // Busy, the button keeps its focus (a disabled one would drop it) but opens nothing.
            onClickCapture={(event) => {
              if (!working) return
              event.preventDefault()
              event.stopPropagation()
            }}
            data-slot="file-drop-trigger"
            className={cn(
              'flex min-h-24 w-full flex-col items-center justify-center rounded-md px-6 py-4 text-center',
              FOCUS_RING,
              working ? 'cursor-progress' : disabled ? 'cursor-not-allowed' : 'hover:bg-ink/4',
            )}
          >
            <span aria-hidden="true" className="block text-sm font-medium text-ink">
              {working ? busy : dragging && dropLabel ? dropLabel : label}
            </span>
            {hint ? (
              <span id={hintId} className="mt-1 block text-xs text-ink-soft">
                {hint}
              </span>
            ) : null}
          </FileUpload.Trigger>
        </div>
      </FileUpload.RootProvider>
      <p role="status" className="sr-only">
        {working ? busy : ''}
      </p>
      {invalid ? (
        <div id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  )
}
