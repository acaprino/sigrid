import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { markdownHeadings, parseBlocks } from '../src/internal/markdown'
import { MarkdownBlocks, OnThisPage, Prose } from '../src/components'

// The page of reading (docs/patterns.md, «A page of reading, and the home of a wiki»): `Prose` is the ground of a
// long text, `MarkdownBlocks variant="article"` draws Markdown on its scale with real, anchored headings, and
// `OnThisPage` is the index that points into them, from the same source (`markdownHeadings`).

test('parseBlocks keeps the level of a heading and reads a rule', () => {
  const blocks = parseBlocks('# Title\n## Part\n#### Deep\n\n---\nwords\n* * *')
  expect(blocks).toEqual([
    { kind: 'h', text: 'Title', level: 1 },
    { kind: 'h', text: 'Part', level: 2 },
    { kind: 'h', text: 'Deep', level: 4 },
    { kind: 'hr' },
    { kind: 'p', lines: ['words'] },
    { kind: 'hr' },
  ])
})

test('markdownHeadings names each heading and its anchor, repeats told apart', () => {
  expect(markdownHeadings('## Set up\ntext\n### Set up\n## À propos, **beta**!')).toEqual([
    { id: 'set-up', text: 'Set up', level: 2 },
    { id: 'set-up-2', text: 'Set up', level: 3 },
    { id: 'a-propos-beta', text: 'À propos, beta!', level: 2 },
  ])
  // Words with no letters the slug can keep still get an anchor.
  expect(markdownHeadings('## 你好')[0]!.id).toBe('section')
})

test('a note keeps its compact form: a heading is a bold line, a rule a hairline', () => {
  const { container } = render(<MarkdownBlocks text={'## Part\nwords\n---'} />)
  expect(container.querySelector('h2')).toBeNull()
  expect(container.querySelector('[data-slot=markdown]')).not.toBeNull()
  expect(container.querySelector('hr')).not.toBeNull()
})

test('an article has real anchored headings on the reading ground', () => {
  const { container } = render(<MarkdownBlocks variant="article" text={'## Set up\nwords\n### Set up\n- [x] done\n```ts\nconst a = 1\n```'} />)
  const h2 = container.querySelector('h2')!
  expect(h2.id).toBe('set-up')
  expect(h2.textContent).toBe('Set up')
  expect(container.querySelector('h3')!.id).toBe('set-up-2')
  // The ground is Prose, not the note's 14px pile.
  expect(container.querySelector('[data-slot=prose]')).not.toBeNull()
  expect(container.querySelector('[data-slot=markdown]')).toBeNull()
  // A checklist says so, for the ground to leave its edge alone; the code box keeps its frame and its copy button.
  expect(container.querySelector('ul[data-check]')).not.toBeNull()
  expect(container.querySelector('[data-slot=md-code] pre')!.textContent).toBe('const a = 1')
})

test('Prose is the element asked for and only sets the ground', () => {
  const { container } = render(
    <Prose as="article">
      <h2>Part</h2>
      <p>words</p>
    </Prose>,
  )
  const root = container.querySelector('article')!
  expect(root.dataset['slot']).toBe('prose')
  expect(root.querySelector('h2')!.textContent).toBe('Part')
})

test('OnThisPage is a named nav of anchors, the current one said; with nothing, nothing', () => {
  const items = [
    { id: 'set-up', title: 'Set up' },
    { id: 'use', title: 'Use', level: 3 as const },
  ]
  const { container } = render(<OnThisPage items={items} currentId="use" />)
  const nav = container.querySelector('nav')!
  expect(nav.getAttribute('aria-label')).toBe('On this page')
  const links = [...container.querySelectorAll('a')]
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['#set-up', '#use'])
  expect(links[1]!.getAttribute('aria-current')).toBe('true')
  expect(links[0]!.getAttribute('aria-current')).toBeNull()
  expect(render(<OnThisPage items={[]} />).container.querySelector('nav')).toBeNull()
})
