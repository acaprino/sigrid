import { Fragment, type ReactNode } from 'react'

// A small Markdown of our own, for a title and the notes under it. No dependencies and no `innerHTML`: the text becomes
// React elements, so a `<script>` written in a note stays text. Links are not opened from here (the app that uses the
// package does it): they are shown underlined, with the address as a hint.
//
// Inline (title and notes): **bold** or __bold__, *italic* or _italic_, ~~strikethrough~~, `code`, [text](url).
// In blocks (notes only): lines starting with «- », «* » or «1. » (lists), «- [ ] » and «- [x] » (checkboxes, read-only),
// «# » (heading), «> » (quote), a fenced block of code («```lang» to «```», or «~~~»; unclosed it runs to the end, so a
// text still arriving shows as code from its first line); an empty line separates paragraphs. A «\*» stays an asterisk.
// The parser is here; `MarkdownBlocks` (`src/components/markdown-blocks.tsx`) draws the blocks.

type Inline = { kind: 'text'; text: string } | { kind: 'strong' | 'em' | 'del'; children: Inline[] } | { kind: 'code'; text: string } | { kind: 'link'; children: Inline[]; href: string }

const PAIRS: { open: string; kind: 'strong' | 'em' | 'del' }[] = [
  { open: '**', kind: 'strong' },
  { open: '__', kind: 'strong' },
  { open: '~~', kind: 'del' },
  { open: '*', kind: 'em' },
  { open: '_', kind: 'em' },
]

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c)

/** The inline text as a tree: missing closings leave the marks as text, never an error. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let text = ''
  const flush = () => {
    if (text) out.push({ kind: 'text', text })
    text = ''
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (c === '\\' && i + 1 < src.length && /[\\`*_~[\]()#>-]/.test(src[i + 1]!)) {
      text += src[i + 1]
      i += 2
      continue
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1)
      if (end > i + 1) {
        flush()
        out.push({ kind: 'code', text: src.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    if (c === '[') {
      const close = src.indexOf('](', i + 1)
      const end = close < 0 ? -1 : src.indexOf(')', close + 2)
      if (close > i + 1 && end > close + 2) {
        const href = src.slice(close + 2, end).trim()
        if (/^(https?:\/\/|mailto:)\S+$/i.test(href)) {
          flush()
          out.push({ kind: 'link', href, children: parseInline(src.slice(i + 1, close)) })
          i = end + 1
          continue
        }
      }
    }
    const pair = PAIRS.find((p) => src.startsWith(p.open, i))
    if (pair) {
      const { open } = pair
      const after = src[i + open.length]
      // It opens only before a non-blank character; «_» inside a word (file_name) does not open.
      const canOpen = after !== undefined && after !== ' ' && !(open[0] === '_' && isWordChar(src[i - 1]))
      if (canOpen) {
        let end = src.indexOf(open, i + open.length + 1)
        // `*a**` does not close the italic with the first asterisk of the bold
        while (end > 0 && open.length === 1 && src[end + 1] === open) end = src.indexOf(open, end + 2)
        const valid = end > 0 && src[end - 1] !== ' ' && !(open[0] === '_' && isWordChar(src[end + open.length]))
        if (valid) {
          flush()
          out.push({ kind: pair.kind, children: parseInline(src.slice(i + open.length, end)) })
          i = end + open.length
          continue
        }
      }
    }
    text += c
    i++
  }
  flush()
  return out
}

function plainOf(nodes: Inline[]): string {
  return nodes.map((n) => (n.kind === 'text' || n.kind === 'code' ? n.text : plainOf(n.children))).join('')
}

/**
 * The text without the inline marks: for accessible names, suggestions and wherever the plain title is needed. Like
 * `InlineMarkdown` it does not touch the block marks: «1. Call» stays «1. Call».
 */
export function plainText(src: string): string {
  return src
    .split('\n')
    .map((line) => plainOf(parseInline(line)))
    .join('\n')
}

/** True if the text has at least one mark the reader transforms: without one, it is shown as it is. */
export function hasMarkdown(src: string): boolean {
  return plainText(src) !== src
}

function renderInline(nodes: Inline[], key = ''): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}${i}`
    switch (n.kind) {
      case 'text':
        return <Fragment key={k}>{n.text}</Fragment>
      case 'strong':
        return <strong key={k} className="font-semibold">{renderInline(n.children, k + '.')}</strong>
      case 'em':
        return <em key={k}>{renderInline(n.children, k + '.')}</em>
      case 'del':
        return <del key={k}>{renderInline(n.children, k + '.')}</del>
      case 'code':
        return <code key={k} className="rounded-sm bg-paper-2 px-1 font-mono text-xs">{n.text}</code>
      case 'link':
        return <span key={k} data-slot="md-link" title={n.href} className="underline decoration-ink-mute underline-offset-2">{renderInline(n.children, k + '.')}</span>
    }
  })
}

/** An inline line (the title): bold, italic, strikethrough, code, link. No blocks. */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(parseInline(text))}</>
}

/** The words of a heading as an anchor: lowered, the marks and accents dropped, joined with hyphens; never empty. */
function slugOf(text: string): string {
  return (
    plainOf(parseInline(text))
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  )
}

/** The anchor of each heading of `blocks`, in order: the slug of its words, and `-2`, `-3`… where one repeats. */
export function headingAnchors(blocks: MarkdownBlock[]): string[] {
  const taken = new Map<string, number>()
  const anchors: string[] = []
  for (const b of blocks) {
    if (b.kind !== 'h') continue
    const slug = slugOf(b.text)
    const seen = taken.get(slug) ?? 0
    taken.set(slug, seen + 1)
    anchors.push(seen === 0 ? slug : `${slug}-${seen + 1}`)
  }
  return anchors
}

/**
 * The headings of a Markdown text, each with the anchor it takes in an article (`MarkdownBlocks variant="article"`):
 * what an `OnThisPage` is given, from the same source.
 */
export function markdownHeadings(src: string): { id: string; text: string; level: 1 | 2 | 3 | 4 | 5 | 6 }[] {
  const blocks = parseBlocks(src)
  const anchors = headingAnchors(blocks)
  let at = 0
  const out: { id: string; text: string; level: 1 | 2 | 3 | 4 | 5 | 6 }[] = []
  for (const b of blocks) {
    if (b.kind !== 'h') continue
    out.push({ id: anchors[at]!, text: plainOf(parseInline(b.text)), level: b.level })
    at += 1
  }
  return out
}

export type MarkdownBlock =
  | { kind: 'p'; lines: string[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'h'; text: string; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: 'hr' }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: { text: string; check?: boolean }[] }

/** The opening of a fenced block: three or more backticks or tildes, then the language (its first word) if any. */
const FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/

export function parseBlocks(src: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const last = () => blocks[blocks.length - 1]
  // The fence that is open: its text so far, what closes it and how far its lines are indented.
  let fence: { lang: string; lines: string[]; mark: string; indent: number } | null = null
  const close = () => {
    if (fence) blocks.push({ kind: 'code', lang: fence.lang, text: fence.lines.join('\n') })
    fence = null
  }
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    if (fence) {
      // A closing line is the same mark, at least as long, and nothing else.
      const end = raw.trim()
      if (end.length >= fence.mark.length && end === fence.mark[0]!.repeat(end.length)) close()
      else fence.lines.push(raw.replace(new RegExp(`^ {0,${fence.indent}}`), ''))
      continue
    }
    const open = FENCE.exec(raw)
    if (open) {
      fence = { lang: open[3]!, lines: [], mark: open[2]!, indent: open[1]!.length }
      continue
    }
    const line = raw.trimEnd()
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] })
      continue
    }
    let m: RegExpMatchArray | null
    if ((m = line.match(/^\s*(#{1,6})\s+(.*)$/))) blocks.push({ kind: 'h', text: m[2]!, level: m[1]!.length as 1 | 2 | 3 | 4 | 5 | 6 })
    else if (/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(line)) blocks.push({ kind: 'hr' })
    else if ((m = line.match(/^\s*>\s?(.*)$/))) {
      const b = last()
      if (b?.kind === 'quote') b.lines.push(m[1]!)
      else blocks.push({ kind: 'quote', lines: [m[1]!] })
    } else if ((m = line.match(/^\s*[-*]\s+(?:\[([ xX])\]\s+)?(.*)$/))) {
      const item = m[1] === undefined ? { text: m[2]! } : { text: m[2]!, check: m[1] !== ' ' }
      const b = last()
      if (b?.kind === 'ul') b.items.push(item)
      else blocks.push({ kind: 'ul', items: [item] })
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      const b = last()
      if (b?.kind === 'ol') b.items.push({ text: m[1]! })
      else blocks.push({ kind: 'ol', items: [{ text: m[1]! }] })
    } else {
      const b = last()
      if (b?.kind === 'p' && b.lines.length > 0) b.lines.push(line)
      else blocks.push({ kind: 'p', lines: [line] })
    }
  }
  // A fence still open at the end runs to the end.
  close()
  return blocks.filter((b) => b.kind !== 'p' || b.lines.length > 0)
}
