// The notes and the answers as Markdown blocks: paragraphs, lists, checkboxes (read-only), headings, quotes, rules and
// fenced blocks of code, with the inline marks inside (`InlineMarkdown`). It draws what `parseBlocks` reads
// (`src/internal/markdown.tsx`): React elements only, never HTML, so a `<script>` written in a note stays text.
// Two renderings: `note` (the default), the compact 14px blocks of a message or a note, where a heading is only a bold
// line; and `article`, a page of reading on the scale of `Prose`, where the headings are real (`h1` to `h6`), each
// with the anchor `markdownHeadings` names, so an `OnThisPage` can point into it.
// A fenced block («```ts») is a quiet box in the mono face, the language above it and a `CopyButton` beside it, always
// there (nothing is revealed by the pointer): the text is shown as written, with no syntax colours (R1), and a line
// longer than the box scrolls sideways; the box is a Tab stop so the keyboard can scroll it.
import { Fragment } from 'react'
import { cn } from '../lib/utils'
import { FOCUS_RING_INSET } from '../lib/focus'
import { useWords } from '../words'
import { InlineMarkdown, headingAnchors, parseBlocks } from '../internal/markdown'
import { CopyButton } from './copy-button'
import { Prose } from './prose'

export type MarkdownBlocksProps = {
  /** The Markdown source. */
  text: string
  /** `note` (the default): the compact blocks of a message or a note. `article`: a page of reading on the scale of `Prose`, the headings real and anchored. */
  variant?: 'note' | 'article' | undefined
  className?: string | undefined
}

/** Lines broken as written, with the inline marks inside. */
function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, j) => (
        <Fragment key={j}>
          {j > 0 ? <br /> : null}
          <InlineMarkdown text={l} />
        </Fragment>
      ))}
    </>
  )
}

/** The notes and the answers: paragraphs, lists, checkboxes (read-only), headings, quotes, rules and fenced code; `article` for a page of reading. */
export function MarkdownBlocks({ text, variant = 'note', className }: MarkdownBlocksProps) {
  const words = useWords().checklist
  const article = variant === 'article'
  const blocks = parseBlocks(text)
  const anchors = article ? headingAnchors(blocks) : []
  let heads = 0
  const children = blocks.map((b, i) => {
    switch (b.kind) {
      case 'p':
        return (
          <p key={i}>
            <Lines lines={b.lines} />
          </p>
        )
      case 'h': {
        if (!article)
          return (
            <p key={i} className="font-semibold">
              <InlineMarkdown text={b.text} />
            </p>
          )
        const Tag = `h${b.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        return (
          <Tag key={i} id={anchors[heads++]!}>
            <InlineMarkdown text={b.text} />
          </Tag>
        )
      }
      case 'hr':
        return <hr key={i} className={article ? undefined : 'border-line'} />
      case 'quote':
        return (
          <blockquote key={i} className={article ? undefined : 'border-s-2 border-line ps-3 text-ink-soft'}>
            <Lines lines={b.lines} />
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
          <List
            key={i}
            {...(checklist ? { 'data-check': '' } : {})}
            className={
              checklist
                ? 'list-none space-y-1 ps-0'
                : article
                  ? undefined
                  : cn('space-y-1 ps-5', b.kind === 'ul' ? 'list-disc' : 'list-decimal')
            }
          >
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
  })
  if (article)
    return (
      <Prose as="div" className={cn('break-words', className)}>
        {children}
      </Prose>
    )
  return (
    <div data-slot="markdown" className={cn('space-y-2 text-sm break-words', className)}>
      {children}
    </div>
  )
}
