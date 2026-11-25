// The notes and the answers as Markdown blocks: paragraphs, lists, checkboxes (read-only), headings, quotes and fenced
// blocks of code, with the inline marks inside (`InlineMarkdown`). It draws what `parseBlocks` reads
// (`src/internal/markdown.tsx`): React elements only, never HTML, so a `<script>` written in a note stays text.
// A fenced block («```ts») is a quiet box in the mono face, the language above it and a `CopyButton` beside it, always
// there (nothing is revealed by the pointer): the text is shown as written, with no syntax colours (R1), and a line
// longer than the box scrolls sideways; the box is a Tab stop so the keyboard can scroll it.
import { Fragment } from 'react'
import { cn } from '../lib/utils'
import { FOCUS_RING_INSET } from '../lib/focus'
import { useWords } from '../words'
import { InlineMarkdown, parseBlocks } from '../internal/markdown'
import { CopyButton } from './copy-button'

export type MarkdownBlocksProps = {
  /** The Markdown source. */
  text: string
  className?: string | undefined
}

/** The notes: paragraphs, lists, checkboxes (read-only), headings, quotes and fenced code, with inline Markdown inside. */
export function MarkdownBlocks({ text, className }: MarkdownBlocksProps) {
  const words = useWords().checklist
  return (
    <div data-slot="markdown" className={cn('space-y-2 text-sm break-words', className)}>
      {parseBlocks(text).map((b, i) => {
        switch (b.kind) {
          case 'p':
            return (
              <p key={i}>
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    <InlineMarkdown text={l} />
                  </Fragment>
                ))}
              </p>
            )
          case 'h':
            return (
              <p key={i} className="font-semibold">
                <InlineMarkdown text={b.text} />
              </p>
            )
          case 'quote':
            return (
              <blockquote key={i} className="border-s-2 border-line ps-3 text-ink-soft">
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    <InlineMarkdown text={l} />
                  </Fragment>
                ))}
              </blockquote>
            )
          case 'code':
            return (
              <div key={i} data-slot="md-code" {...(b.lang ? { 'data-lang': b.lang } : {})} className="rounded-md bg-paper-2">
                <div className="flex min-h-(--control-sm) items-center justify-between gap-2 ps-3 pe-1 pt-1">
                  <span data-slot="md-code-lang" className="min-w-0 truncate font-mono text-xs text-ink-mute">
                    {b.lang}
                  </span>
                  <CopyButton value={b.text} size="icon-xs" />
                </div>
                <pre tabIndex={0} className={cn('overflow-x-auto px-3 pt-1 pb-3 font-mono text-xs leading-relaxed text-ink', FOCUS_RING_INSET)}>
                  <code>{b.text}</code>
                </pre>
              </div>
            )
          case 'ul':
          case 'ol': {
            const List = b.kind === 'ul' ? 'ul' : 'ol'
            const checklist = b.items.every((it) => it.check !== undefined)
            return (
              <List key={i} className={cn('space-y-1 ps-5', checklist ? 'list-none ps-0' : b.kind === 'ul' ? 'list-disc' : 'list-decimal')}>
                {b.items.map((it, j) => (
                  <li key={j} className={cn(it.check !== undefined && 'flex items-start gap-2')}>
                    {it.check !== undefined ? (
                      // The box of a checklist item: as the toolkit's Checkbox, the ink when done (R2: not the accent),
                      // l1 corners, a 12px stroked mark.
                      <span aria-hidden="true" className={cn('mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-input', it.check && 'border-primary bg-primary text-primary-foreground')}>
                        {it.check ? (
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : null}
                      </span>
                    ) : null}
                    {it.check !== undefined ? <span className="sr-only">{it.check ? words.done : words.todo}</span> : null}
                    <span className={cn(it.check && 'text-ink-mute line-through')}>
                      <InlineMarkdown text={it.text} />
                    </span>
                  </li>
                ))}
              </List>
            )
          }
        }
      })}
    </div>
  )
}
