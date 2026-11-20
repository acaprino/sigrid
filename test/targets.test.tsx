import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button, Checkbox, Input } from '../src'
import { DENSITIES, DENSITY_LIMITS } from '../src/density'

// Round 3, M-12: every control has an area of at least 24x24 px (44 with a coarse pointer) without changing the look
// on the desktop. (An app's own row controls, and their areas, are tested in the app's package.)
// jsdom does no layout: here names and classes; the real areas are measured in the browser with elementFromPoint (see the report).
// Careful: Tailwind also scans `test/`. Class names with a variant are composed with v(), not written whole.

const v = (variant: string, cls: string) => variant + cls
const COARSE = 'pointer-coarse:'
const noop = () => {}
const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('hit areas: 24px on every pointer, 44px on a coarse one, same look on a desktop', () => {
  test('every Button size is at least 24px tall and, when square, wide, at every density', () => {
    for (const size of ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const) {
      const { unmount } = render(<Button size={size}>x</Button>)
      const own = classes(screen.getByRole('button')).filter((c) => !c.includes(':'))
      // The height is a density token (`--control-md`, `-sm`, `-xs`): its px in each preset, and the least a definition may ask.
      const token = own.map((c) => /^(?:h|size)-\(--control-(md|sm|xs)\)$/.exec(c)).find(Boolean)
      expect(token, size).toBeTruthy()
      for (const d of DENSITIES) expect(d.control[token![1] as 'md' | 'sm' | 'xs'], `${size} ${d.id}`).toBeGreaterThanOrEqual(24)
      unmount()
    }
    expect(DENSITY_LIMITS.control.min).toBeGreaterThanOrEqual(24)
  })

  test('on a coarse pointer a Button and an Input are at least 44px (11)', () => {
    render(
      <>
        <Button>x</Button>
        <Input aria-label="field" />
      </>,
    )
    for (const el of [screen.getByRole('button'), screen.getByLabelText('field')]) {
      expect(classes(el)).toContain(v(COARSE, 'min-h-11'))
    }
    expect(classes(screen.getByRole('button'))).toContain(v(COARSE, 'min-w-11'))
  })

  test('the checkbox keeps its 18px look (Park sm) and grows its hit area with a pseudo-element: 24px, 44px on coarse', () => {
    render(<Checkbox aria-label="Complete: x" checked={false} onCheckedChange={noop} />)
    const c = classes(screen.getByRole('checkbox'))
    // 18px: `size-4.5` is 1.125rem on the 4px spacing scale.
    expect(c).toContain('size-4.5')
    expect(c).toContain('relative')
    // The area is 18 + 2 x (inset - 1px of border): 1.5 -> 28px, 4.5 -> 52px. Never less than 24 and 44.
    const inset = (prefix: string) => Number(c.map((t) => t.startsWith(prefix) ? /after:-inset-([\d.]+)$/.exec(t)?.[1] : undefined).find(Boolean))
    expect(inset('after:-inset-') * 4 * 2 + 16).toBeGreaterThanOrEqual(24)
    expect(inset(COARSE) * 4 * 2 + 16).toBeGreaterThanOrEqual(44)
  })

})
