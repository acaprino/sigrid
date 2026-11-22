import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { hasMarkdown, InlineMarkdown, MarkdownBlocks, parseBlocks, plainText } from '../src/internal/markdown'

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
