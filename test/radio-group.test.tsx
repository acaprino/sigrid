// The SmoothUI/Base UI RadioGroup (`src/components/ui/radio-group.tsx`) and the color group built on it
// (`src/components/Swatches.tsx`): keyboard, accessible names in English, returned value, Tab stop, appearance.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { COLORS, COLOR_NAMES } from '../src/colors'
import { RadioGroup, RadioGroupItem } from '../src/components/ui/radio-group'
import { Swatches } from '../src/components/Swatches'
import { palettes } from './theme-tokens'
import { contrast } from './helpers'

// Base UI moves the arrow focus in a microtask (`queueMicrotask` in `useCompositeRoot`, after the `returnFocus`
// of FocusManager): the test waits for that microtask before looking at the focus, as the browser would.
const press = async (key: string) => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key })
  await act(async () => {})
}
const radio = (name: string) => screen.getByRole('radio', { name })
const LAST = COLOR_NAMES[COLORS[COLORS.length - 1]!]
const checked = () => screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')

function Pick({ start = COLORS[0] as string, onPick = () => {} }: { start?: string; onPick?: (c: string) => void }) {
  const [value, setValue] = useState(start)
  return (
    <Swatches
      value={value}
      onChange={(c) => {
        onPick(c)
        setValue(c)
      }}
    />
  )
}

describe('RadioGroup (Base UI)', () => {
  function Sizes({ onChange = () => {} }: { onChange?: (v: string) => void }) {
    return (
      <RadioGroup aria-label="Size" defaultValue="m" onValueChange={onChange}>
        <RadioGroupItem value="s">Small</RadioGroupItem>
        <RadioGroupItem value="m">Medium</RadioGroupItem>
        <RadioGroupItem value="l" disabled>
          Large
        </RadioGroupItem>
      </RadioGroup>
    )
  }

  test('is a named radio group whose items are labelled by their visible text', () => {
    render(<Sizes />)
    expect(screen.getByRole('radiogroup', { name: 'Size' })).toBeTruthy()
    for (const name of ['Small', 'Medium', 'Large']) expect(radio(name)).toBeTruthy()
    expect(radio('Medium').getAttribute('aria-checked')).toBe('true')
    expect(radio('Medium').tagName).toBe('BUTTON')
    expect(radio('Medium').getAttribute('type')).toBe('button')
  })

  test('a click and the label choose; the value comes back; a disabled item cannot be chosen', () => {
    const onChange = vi.fn()
    render(<Sizes onChange={onChange} />)
    fireEvent.click(radio('Small'))
    expect(onChange).toHaveBeenLastCalledWith('s')
    expect(radio('Small').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByText('Medium'))
    expect(onChange).toHaveBeenLastCalledWith('m')
    fireEvent.click(radio('Large'))
    expect(onChange).not.toHaveBeenCalledWith('l')
    expect(radio('Medium').getAttribute('aria-checked')).toBe('true')
  })

  test('the default radio shows a dot only when chosen, without any motion', () => {
    const { container } = render(<Sizes />)
    const dots = container.querySelectorAll('[data-slot="radio-group-indicator"]')
    expect(dots).toHaveLength(1)
    expect(radio('Medium').contains(dots[0]!)).toBe(true)
    // No motion styles: no `transform`/`transition` in the inline styles, no transition classes.
    for (const el of container.querySelectorAll<HTMLElement>('[data-slot^="radio-group"]')) {
      expect(el.getAttribute('style') ?? '').not.toMatch(/transform|transition|will-change/)
      expect(el.className).not.toMatch(/transition|animate-|duration-/)
    }
  })
})

describe('Swatches on the Base UI RadioGroup', () => {
  test('one radio group named “Color”, a radio per color with its English name', () => {
    render(<Swatches value={COLORS[2]} onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Color' })).toBeTruthy()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(COLORS.map((c) => COLOR_NAMES[c]))
    expect(radio('Red')).toBeTruthy()
    expect(radio('Blue')).toBeTruthy()
    expect(checked()).toEqual([radios[2]])
    // The color is in the swatch, not in the name.
    expect(radios.map((r) => r.getAttribute('data-color'))).toEqual([...COLORS])
    expect(radios[0]!.style.background).not.toBe('')
  })

  test('another label can be given', () => {
    render(<Swatches value={COLORS[0]} onChange={() => {}} label="Project color" />)
    expect(screen.getByRole('radiogroup', { name: 'Project color' })).toBeTruthy()
  })

  test('a click returns the hex code of the color', () => {
    const onChange = vi.fn()
    render(<Swatches value={COLORS[0]} onChange={onChange} />)
    fireEvent.click(radio(COLOR_NAMES[COLORS[4]]))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(COLORS[4])
    expect(COLORS[4]).toMatch(/^#[0-9a-f]{6}$/i)
  })

  test('the group is a single tab stop: the chosen color, or the first when none is chosen', () => {
    const { unmount } = render(<Pick start={COLORS[5]} />)
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual(COLORS.map((_, i) => (i === 5 ? 0 : -1)))
    unmount()
    render(<Swatches value="#000000" onChange={() => {}} />)
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual(COLORS.map((_, i) => (i === 0 ? 0 : -1)))
    expect(checked()).toEqual([])
  })

  test('arrows move the focus and the choice, wrapping; Home and End jump and choose', async () => {
    const onPick = vi.fn()
    render(<Pick start={COLORS[0]} onPick={onPick} />)
    radio('Red').focus()
    await press('ArrowRight')
    expect(document.activeElement).toBe(radio('Coral'))
    expect(onPick).toHaveBeenLastCalledWith(COLORS[1])
    await press('ArrowLeft')
    await press('ArrowLeft')
    expect(document.activeElement).toBe(radio(LAST))
    expect(checked()).toEqual([radio(LAST)])
    expect(onPick).toHaveBeenLastCalledWith(COLORS[COLORS.length - 1])
    await press('Home')
    expect(document.activeElement).toBe(radio('Red'))
    expect(onPick).toHaveBeenLastCalledWith(COLORS[0])
    await press('End')
    expect(document.activeElement).toBe(radio(LAST))
    expect(checked()).toEqual([radio(LAST)])
    expect(screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)).toEqual([radio(LAST)])
  })

  test('Enter does not choose, other keys are left alone', async () => {
    const onPick = vi.fn()
    render(<Pick onPick={onPick} />)
    radio('Coral').focus()
    await press('Enter')
    const ev = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    radio('Coral').dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
    expect(onPick).not.toHaveBeenCalled()
  })

  test('inside a form, choosing a color does not submit it and adds no field', async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const { container } = render(
      <form onSubmit={onSubmit}>
        <Pick />
      </form>
    )
    fireEvent.click(radio('Blue'))
    radio('Blue').focus()
    await press('ArrowRight')
    fireEvent.keyDown(radio('Blue'), { key: ' ' })
    expect(onSubmit).not.toHaveBeenCalled()
    expect([...new FormData(container.querySelector('form')!).keys()]).toEqual([])
  })

  test('targets are 24 px, 44 with touch; the choice is an ink ring, the focus a separate full outline', () => {
    render(<Swatches value={COLORS[1]} onChange={() => {}} />)
    for (const r of screen.getAllByRole('radio')) {
      const cls = r.className.split(/\s+/)
      expect(cls).toContain('size-6')
      expect(cls).toContain('pointer-coarse:size-11')
      expect(cls).toEqual(expect.arrayContaining(['data-checked:ring-2', 'data-checked:ring-ink', 'data-checked:ring-offset-2', 'data-checked:ring-offset-paper']))
      expect(cls).toEqual(expect.arrayContaining(['focus-visible:outline-2', 'focus-visible:outline-ring']))
      // No reduced opacity on the ring or the outline, no animation.
      expect(r.className).not.toMatch(/(ring|outline)-(ink|ring)\/\d+|transition|animate-/)
    }
    expect(radio('Coral').hasAttribute('data-checked')).toBe(true)
    expect(radio('Red').hasAttribute('data-checked')).toBe(false)
  })
})

describe('contrast of the swatch ring and of the focus outline (theme.css tokens)', () => {
  const { light, dark } = palettes(readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8'))

  test.each([['light', light], ['dark', dark]] as const)('the ink ring and the ring outline reach 3:1 on paper, paper-2 and raised, palette %s', (_name, t) => {
    for (const bg of [t['paper']!, t['paper-2']!, t['raised']!]) {
      expect(contrast(t['ink']!, bg)).toBeGreaterThanOrEqual(3)
      expect(contrast(t['ring']!, bg)).toBeGreaterThanOrEqual(3)
    }
  })
})
