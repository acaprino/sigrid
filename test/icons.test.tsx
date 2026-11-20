// The icon packs (R6 of the toolkit's rules, 2026-11-20): every meaning is drawn by every pack, the pack comes from
// context or from `pack`, and a saved value outside the lists is refused, a pack that left the toolkit among them.
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DEFAULT_ICON_PACK, ICON_NAMES, ICON_PACKS, Icon, IconPackProvider, isIconName, isIconPack } from '../src'

test('the packs, in the order Settings shows them: Lucide (the default), Fluent Color, Emoji', () => {
  expect(ICON_PACKS).toEqual(['lucide', 'fluent', 'emoji'])
  expect(DEFAULT_ICON_PACK).toBe('lucide')
})

test('every pack draws every icon: an svg sized by the class given, hidden from screen readers, marked with its name and pack', () => {
  for (const pack of ICON_PACKS) {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} pack={pack} className="size-5" />)
      const box = container.firstElementChild!
      expect(box.getAttribute('aria-hidden'), `${pack} ${name}`).toBe('true')
      expect(box.getAttribute('data-icon')).toBe(name)
      expect(box.getAttribute('data-icon-pack')).toBe(pack)
      const svg = box.querySelector('svg')
      expect(svg, `${pack} ${name}`).not.toBeNull()
      // The same size contract in every pack: the class given sets the box, in place of the default size-4.
      const classes = (svg!.getAttribute('class') ?? '').split(/\s+/)
      expect(classes, `${pack} ${name}`).toContain('size-5')
      expect(classes, `${pack} ${name}`).not.toContain('size-4')
      unmount()
    }
  }
})

test('the Emoji pack: one colour emoji per meaning, none shared, a picture in the 24-unit box of the line icons', () => {
  // A fully qualified emoji: a symbol that is text by default (sun, gear, arrows) carries U+FE0F, or it shows as text.
  const qualified = new RegExp('^\\p{RGI_Emoji}$', 'v')
  expect('\u{2600}').not.toMatch(qualified)
  expect('\u{2600}\u{FE0F}').toMatch(qualified)
  const prefix = 'data:image/svg+xml,'
  const glyphs = ICON_NAMES.map((name) => {
    const { container, unmount } = render(
      <p>
        <Icon name={name} pack="emoji" />
        Label
      </p>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24')
    expect(svg.getAttribute('class'), name).toBe('size-4')
    // A picture, not text: the text read from the page is the label alone.
    expect(container.textContent, name).toBe('Label')
    const href = svg.querySelector('image')!.getAttribute('href')!
    expect(href.startsWith(prefix), name).toBe(true)
    const drawing = decodeURIComponent(href.slice(prefix.length))
    expect(drawing, name).toContain(`font-family="'Segoe UI Emoji'`)
    const glyph = /<text\b[^>]*>([^<]*)<\/text>/.exec(drawing)?.[1] ?? ''
    unmount()
    expect(glyph, name).toMatch(qualified)
    return glyph
  })
  expect(new Set(glyphs).size).toBe(ICON_NAMES.length)
})

test('the pack comes from the provider; Lucide without one; `pack` wins for a preview', () => {
  const { container, rerender } = render(<Icon name="today" />)
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe(DEFAULT_ICON_PACK)
  rerender(
    <IconPackProvider pack="fluent">
      <Icon name="today" />
    </IconPackProvider>,
  )
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('fluent')
  rerender(
    <IconPackProvider pack="fluent">
      <Icon name="today" pack="emoji" />
    </IconPackProvider>,
  )
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('emoji')
})

test('saved values are checked: only real packs and names pass', () => {
  for (const pack of ['lucide', 'fluent', 'emoji']) expect(isIconPack(pack), pack).toBe(true)
  for (const no of ['', 'Lucide', 'material', null, 3, 'constructor']) expect(isIconPack(no), String(no)).toBe(false)
  expect(isIconName('today')).toBe(true)
  for (const no of ['', 'Today', 'sparkles', undefined, 'toString']) expect(isIconName(no), String(no)).toBe(false)
})

test('a pack that left (Phosphor, Tabler, 2026-11-20) is refused when read back, so the icons fall back to Lucide', () => {
  for (const saved of ['phosphor', 'tabler'] as unknown[]) {
    expect(isIconPack(saved), String(saved)).toBe(false)
    const { container, unmount } = render(<Icon name="today" pack={isIconPack(saved) ? saved : undefined} />)
    expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('lucide')
    unmount()
  }
})
