// The icon packs (R6 of the toolkit's rules, 2026-11-20): every meaning is drawn by every pack, the pack comes from
// context or from `pack`, and a saved value outside the lists is refused, a pack that left the toolkit among them.
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DEFAULT_ICON_PACK, ICON_NAMES, ICON_PACKS, Icon, IconPackProvider, isIconName, isIconPack, type IconPack, type IconSet } from '../src'

test('the packs, in the order Settings shows them: Lucide (the default), the two in the colour of the theme, the three in full colour', () => {
  expect(ICON_PACKS).toEqual(['lucide', 'duotone', 'solar', 'fluent', 'emoji', 'twemoji'])
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

test('the drawn packs: one drawing per meaning, none shared, a picture in its own square box; the duotones take the text colour, the emoji keep theirs', () => {
  for (const pack of ['duotone', 'solar', 'emoji', 'twemoji'] as const) {
    const drawings = ICON_NAMES.map((name) => {
      const { container, unmount } = render(
        <p>
          <Icon name={name} pack={pack} />
          Label
        </p>,
      )
      const svg = container.querySelector('svg')!
      const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(' ')
      expect(width, `${pack} ${name}`).toBe(height)
      expect(svg.getAttribute('class'), `${pack} ${name}`).toBe('size-4')
      // A picture, not text: the text read from the page is the label alone.
      expect(container.textContent, `${pack} ${name}`).toBe('Label')
      const drawing = svg.innerHTML
      unmount()
      expect(drawing.length, `${pack} ${name}`).toBeGreaterThan(20)
      expect(drawing.includes('currentColor'), `${pack} ${name}`).toBe(pack === 'duotone' || pack === 'solar')
      return drawing
    })
    expect(new Set(drawings).size, pack).toBe(ICON_NAMES.length)
  }
})

test('the pack comes from the provider; Lucide without one; `pack` wins for a preview', () => {
  const { container, rerender } = render(<Icon name="settings" />)
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe(DEFAULT_ICON_PACK)
  rerender(
    <IconPackProvider pack="fluent">
      <Icon name="settings" />
    </IconPackProvider>,
  )
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('fluent')
  rerender(
    <IconPackProvider pack="fluent">
      <Icon name="settings" pack="emoji" />
    </IconPackProvider>,
  )
  expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('emoji')
})

test('saved values are checked: only real packs and names pass', () => {
  for (const pack of ['lucide', 'duotone', 'solar', 'fluent', 'emoji', 'twemoji']) expect(isIconPack(pack), pack).toBe(true)
  for (const no of ['', 'Lucide', 'material', null, 3, 'constructor']) expect(isIconPack(no), String(no)).toBe(false)
  expect(isIconName('settings')).toBe(true)
  for (const no of ['', 'Settings', 'sparkles', 'today', 'project', undefined, 'toString']) expect(isIconName(no), String(no)).toBe(false)
})

test('a pack that left (Phosphor, Tabler, 2026-11-20) is refused when read back, so the icons fall back to Lucide', () => {
  for (const saved of ['phosphor', 'tabler'] as unknown[]) {
    expect(isIconPack(saved), String(saved)).toBe(false)
    const { container, unmount } = render(<Icon name="settings" pack={isIconPack(saved) ? saved : undefined} />)
    expect(container.firstElementChild!.getAttribute('data-icon-pack')).toBe('lucide')
    unmount()
  }
})

test("an app's own meanings: drawn by the pack in context, the line drawing where a pack has none; the toolkit's names keep the toolkit's drawing", () => {
  const Line = ({ className }: { className?: string | undefined }) => <svg data-own="line" className={className} />
  const Colour = ({ className }: { className?: string | undefined }) => <svg data-own="colour" className={className} />
  const art = [24, '<path data-own="art" d="M4 4h16v16H4z" fill="currentColor"/>'] as const
  const icons: IconSet = {
    invoice: { lucide: Line, fluent: Colour, emoji: '\u{1F4E5}', duotone: art },
    receipt: { lucide: Line, emoji: art, twemoji: art },
    stamp: { lucide: Line },
    settings: { lucide: Line },
  }
  const drawn = (pack: IconPack, name: string) => {
    const { container, unmount } = render(
      <IconPackProvider pack={pack} icons={icons}>
        <IconPackProvider pack={pack}>
          <Icon name={name} className="size-5" />
        </IconPackProvider>
      </IconPackProvider>,
    )
    const box = container.firstElementChild!
    expect(box.getAttribute('data-icon')).toBe(name)
    const svg = box.querySelector('svg')
    const found = { own: svg?.getAttribute('data-own') ?? null, image: svg?.querySelector('image') != null, size: svg?.getAttribute('class') }
    unmount()
    return found
  }
  expect(drawn('lucide', 'invoice')).toEqual({ own: 'line', image: false, size: 'size-5' })
  expect(drawn('fluent', 'invoice')).toEqual({ own: 'colour', image: false, size: 'size-5' })
  expect(drawn('emoji', 'invoice')).toEqual({ own: null, image: true, size: 'size-5' })
  // A pack the app did not draw falls back to its line drawing.
  expect(drawn('fluent', 'stamp').own).toBe('line')
  expect(drawn('emoji', 'stamp').own).toBe('line')
  for (const pack of ['duotone', 'solar', 'twemoji'] as const) expect(drawn(pack, 'stamp').own, pack).toBe('line')
  // The drawn packs take the app's drawing; Twemoji takes the emoji where it has none of its own.
  const picture = (pack: IconPack, name: string) => {
    const { container, unmount } = render(<IconPackProvider pack={pack} icons={icons}><Icon name={name} /></IconPackProvider>)
    const found = { art: container.querySelector('[data-own="art"]') != null, image: container.querySelector('image') != null }
    unmount()
    return found
  }
  expect(picture('duotone', 'invoice')).toEqual({ art: true, image: false })
  expect(drawn('solar', 'invoice').own).toBe('line')
  expect(picture('twemoji', 'invoice')).toEqual({ art: false, image: true })
  expect(picture('emoji', 'receipt')).toEqual({ art: true, image: false })
  expect(picture('twemoji', 'receipt')).toEqual({ art: true, image: false })
  // A name of the toolkit is not replaced.
  expect(drawn('lucide', 'settings').own).toBeNull()
})

test('a name nobody draws is an empty slot of the same size, so the row keeps its alignment', () => {
  for (const name of ['invoice', 'constructor', '']) {
    const { container, unmount } = render(<Icon name={name} className="size-5" />)
    const box = container.firstElementChild!
    expect(box.querySelector('svg'), name).toBeNull()
    const slot = box.querySelector('[data-icon-empty]')!
    expect(slot.getAttribute('class'), name).toBe('size-5')
    unmount()
  }
})
