import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { hasMarkdown, InlineMarkdown, parseBlocks, plainText } from '../src/internal/markdown'
import { MarkdownBlocks } from '../src/components'

// The small Markdown of the title and the notes: React elements, never HTML; marks that do not close stay text.

test('inline marks become strong, em, del and code', () => {
  const { container } = render(<InlineMarkdown text="**Call** the *dentist*, ~~yesterday~~ `today` and __now__" />)
  expect(container.querySelector('strong')!.textContent).toBe('Call')
  expect(container.querySelector('em')!.textContent).toBe('dentist')
  expect(container.querySelector('del')!.textContent).toBe('yesterday')
  expect(container.querySelector('code')!.textContent).toBe('today')
  expect(container.querySelectorAll('strong')[1]!.textContent).toBe('now')
  expect(container.textContent).toBe('Call the dentist, yesterday today and now')
})

test('html stays text and nothing is injected', () => {
  const { container } = render(<MarkdownBlocks text={'<img src=x onerror=alert(1)> **<script>alert(1)</script>**'} />)
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('script')).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
})

test('only http, https and mailto links are recognised, and they are not clickable here', () => {
  const { container } = render(<InlineMarkdown text="[site](https://example.com) and [bad](javascript:alert(1))" />)
  const link = container.querySelector('[data-slot="md-link"]')!
  expect(link.textContent).toBe('site')
  expect(link.getAttribute('title')).toBe('https://example.com')
  expect(container.querySelector('a')).toBeNull()
  expect(container.textContent).toContain('[bad](javascript:alert(1))')
})

test('marks that do not close, underscores inside words and spaced asterisks stay as they are', () => {
  for (const text of ['**open', 'final_file_name', '2 * 3 = 6', 'a * b *', '_ space_']) {
    expect(plainText(text), text).toBe(text)
    expect(hasMarkdown(text), text).toBe(false)
  }
  expect(plainText(String.raw`an \*asterisk\*`)).toBe('an *asterisk*')
})

test('blocks: paragraphs, lists, checkboxes, headings and quotes', () => {
  const blocks = parseBlocks('# Groceries\n- milk\n- bread\n\n1. first\n2. second\n- [x] done\n- [ ] to do\n> note\nline one\nline two')
  expect(blocks.map((b) => b.kind)).toEqual(['h', 'ul', 'ol', 'ul', 'quote', 'p'])
  const { container } = render(<MarkdownBlocks text={'- [x] passport\n- [ ] tickets'} />)
  expect(container.querySelectorAll('li').length).toBe(2)
  // The checkbox is read-only: the hidden text says it, it is not a control.
  expect(container.querySelector('input')).toBeNull()
  expect(container.textContent).toContain('Done: passport')
  expect(container.textContent).toContain('To do: tickets')
})

test('plainText removes the marks for names and tooltips', () => {
  expect(plainText('**Meeting** with *Marco*')).toBe('Meeting with Marco')
  // The block marks stay: the title shows them like this (InlineMarkdown).
  expect(plainText('1. Call **Marco**')).toBe('1. Call Marco')
  expect(hasMarkdown('1. Call Marco')).toBe(false)
})

test('a fenced block of code is one block: its text as written, the language named, closed by the same mark or by the end', () => {
  const blocks = parseBlocks('Run it:\n```ts\nconst a = 1\n\n  const b = *2*\n```\nthen\n~~~\n# not a heading\n- not a list')
  expect(blocks.map((b) => b.kind)).toEqual(['p', 'code', 'p', 'code'])
  expect(blocks[1]).toEqual({ kind: 'code', lang: 'ts', text: 'const a = 1\n\n  const b = *2*' })
  // Unclosed, it runs to the end: an answer still arriving shows as code from its first line. No language: an empty one.
  expect(blocks[3]).toEqual({ kind: 'code', lang: '', text: '# not a heading\n- not a list' })
  // A shorter mark inside does not close a longer one; a line of backticks with words is text of the block.
  expect(parseBlocks('````md\n```\ninner\n```\n````')).toEqual([{ kind: 'code', lang: 'md', text: '```\ninner\n```' }])
  // Three backticks with code after them on one line are inline code, not a fence.
  expect(parseBlocks('```not a fence```').map((b) => b.kind)).toEqual(['p'])
  // The indent of the fence is taken off its lines, the rest of the indent stays.
  expect(parseBlocks('  ```\n  a\n    b\n  ```')).toEqual([{ kind: 'code', lang: '', text: 'a\n  b' }])
})

test('a code block is drawn in the mono face with its language and a copy button, no colours, and its text stays text', async () => {
  const { container } = render(<MarkdownBlocks text={'```sh\nnpm run <b>x</b>\n```'} />)
  const block = container.querySelector('[data-slot="md-code"]')!
  expect(block.getAttribute('data-lang')).toBe('sh')
  expect(block.querySelector('[data-slot="md-code-lang"]')!.textContent).toBe('sh')
  const code = block.querySelector('pre code')!
  expect(code.textContent).toBe('npm run <b>x</b>')
  expect(block.querySelector('pre b')).toBeNull()
  expect(block.querySelector('pre')!.className).toContain('font-mono')
  // No syntax colours: the code is one text node.
  expect(code.children.length).toBe(0)
  expect(block.querySelector('pre')!.tabIndex).toBe(0)
  const written: string[] = []
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => void written.push(text) } })
  const copy = block.querySelector<HTMLButtonElement>('[data-slot="copy-button"]')!
  expect(copy.getAttribute('aria-label')).toBe('Copy')
  copy.click()
  await Promise.resolve()
  expect(written).toEqual(['npm run <b>x</b>'])
})
