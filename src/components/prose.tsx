// The reading ground of a long text: an article, a wiki page, help, notes kept as pages. Inside it plain written
// elements (headings, paragraphs, lists, quotes, tables, figures, rules) take the reading scale of DESIGN.md
// (Typography): a 16px body with a reading line, the headings of `Heading`'s sizes in the flow with the room of their
// level, and every colour from the tokens. It is the one place an app writes bare elements: only the written kinds,
// never a control (a control sits outside it, or the text is a `MarkdownBlocks variant="article"`). It sets no width:
// a column of reading is its place's (`Column width="prose"`, or a pane).
import type * as React from 'react'
import { cn } from '../lib/utils'

const PROSE = [
  // The body: 16px, a reading line, the ink; the first and last block keep the edge.
  'text-base leading-7 text-ink',
  '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
  // The headings: the sizes of `Heading` (24/20/18/16), in the titles' face, with more room above than below;
  // h5 and h6 are the small label of a group. An anchor lands just clear of the edge.
  '[&_:is(h1,h2,h3,h4,h5,h6)]:font-heading [&_:is(h1,h2,h3,h4,h5,h6)]:text-ink [&_:is(h1,h2,h3,h4,h5,h6)]:scroll-mt-4',
  '[&_h1]:text-2xl [&_h1]:mt-10 [&_h1]:mb-4',
  '[&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3',
  '[&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2',
  '[&_h4]:text-base [&_h4]:mt-6 [&_h4]:mb-2',
  '[&_:is(h5,h6)]:text-2xs [&_:is(h5,h6)]:font-medium [&_:is(h5,h6)]:text-ink-mute [&_:is(h5,h6)]:mt-6 [&_:is(h5,h6)]:mb-2',
  // The blocks of the flow.
  '[&_p]:my-4',
  // A checklist of `MarkdownBlocks` (`data-check`) keeps its own boxes and edge.
  '[&_:is(ul,ol)]:my-4 [&_:is(ul,ol):not([data-check])]:ps-6 [&_ul:not([data-check])]:list-disc [&_ol]:list-decimal [&_li]:my-1 [&_li>:is(ul,ol)]:my-1',
  '[&_blockquote]:my-4 [&_blockquote]:border-s-2 [&_blockquote]:border-line [&_blockquote]:ps-4 [&_blockquote]:text-ink-soft',
  '[&_hr]:my-8 [&_hr]:border-line',
  // Code: inline in the note face on the raised paper; a block a quiet box that scrolls sideways.
  '[&_code]:rounded-sm [&_code]:bg-paper-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm',
  // The code box of `MarkdownBlocks` (`md-code`) keeps its own frame; a bare `pre` gets the same quiet box.
  '[&_pre:not([data-slot=md-code]_pre)]:my-4 [&_pre:not([data-slot=md-code]_pre)]:rounded-md [&_pre:not([data-slot=md-code]_pre)]:bg-paper-2 [&_pre:not([data-slot=md-code]_pre)]:p-3',
  '[&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed',
  '[&_[data-slot=md-code]]:my-4',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs',
  // A table in the flow: quiet lines under the rows, the heads at the start in the medium weight.
  '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
  '[&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:py-2 [&_:is(th,td)]:pe-4 [&_:is(th,td)]:text-start [&_:is(th,td)]:align-top',
  '[&_th]:font-medium',
  // A picture and its words.
  '[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md',
  '[&_figure]:my-6 [&_figure>img]:my-0 [&_figcaption]:mt-2 [&_figcaption]:text-xs [&_figcaption]:text-ink-mute',
  // Links and marks: a link is underlined in the muted ink, whole under the pointer; never the accent (R2).
  '[&_a]:underline [&_a]:decoration-ink-mute [&_a]:underline-offset-2 [&_a:hover]:decoration-ink',
  '[&_:is(strong,b)]:font-semibold',
].join(' ')

export type ProseProps = {
  /** The element: a neutral block (the default), an `article` (a whole page of reading) or a `section`. */
  as?: 'div' | 'article' | 'section' | undefined
  /** The written elements: headings, paragraphs, lists, quotes, tables, figures, rules; or a `MarkdownBlocks variant="article"`. */
  children?: React.ReactNode
  className?: string | undefined
}

/** The reading ground of a long text: plain written elements inside take the reading scale, from the tokens. */
export function Prose({ as = 'div', children, className }: ProseProps) {
  const Tag = as
  return (
    <Tag data-slot="prose" className={cn(PROSE, className)}>
      {children}
    </Tag>
  )
}
