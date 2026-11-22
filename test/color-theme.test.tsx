// A theme from two colours (owner, 2026-11-22: «due colori e poi un accento»): the theme colour and the spot colour
// matched to it. The spot is for what asks for attention: it must be seen without text, carry a readable label, and
// read as text on the page; and it never sits where the fixed red is.
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ColorMatch, SPOT_KINDS, colorTheme, isSpotKind, spotOf, spotSuggestions, themeTokens } from '../src'
import { contrast, fromHex } from '../src/theme-engine'

const COLORS = ['#00857a', '#d1453b', '#eb6f0a', '#f5b800', '#058527', '#3db8e5', '#246fe0', '#7b3ff2', '#d6246e', '#3d4350']
const AS_CHOSEN = { intensity: 'theme', light: 'theme' } as const
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

test('three spot colours for a theme colour, each another colour than it and none near the fixed red', () => {
  for (const color of COLORS) {
    const spots = spotSuggestions(color)
    expect(Object.keys(spots)).toEqual([...SPOT_KINDS])
    const all = SPOT_KINDS.map((kind) => spots[kind])
    expect(new Set(all).size, color).toBe(3)
    for (const spot of all) {
      expect(spot).toMatch(/^#[0-9a-f]{6}$/)
      expect(apart(fromHex(spot).h, 27), `${color} ${spot}`).toBeGreaterThanOrEqual(20)
    }
  }
  // Something that is not a colour still gets three proposals.
  expect(Object.values(spotSuggestions('teal')).every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true)
})

test('the spot tokens hold their thresholds in light and in dark, for every proposal of every colour', () => {
  for (const color of COLORS) {
    for (const spot of SPOT_KINDS) {
      for (const scheme of ['light', 'dark'] as const) {
        const c = themeTokens(colorTheme({ id: 'two', label: 'Two', color, spot }), scheme, null, AS_CHOSEN).colors
        const where = `${color} ${spot} ${scheme}`
        // The label on the fill, the spot as text on the page and on its soft background.
        expect(contrast(c['spot-foreground']!, c['spot']!), where).toBeGreaterThanOrEqual(4.5)
        for (const bg of [c['paper']!, c['raised']!, c['sidebar-paper']!, c['spot-soft']!]) expect(contrast(c['spot-ink']!, bg), where).toBeGreaterThanOrEqual(4.5)
        // Another colour than the theme's own fill.
        expect(c['spot'], where).not.toBe(c['primary'])
      }
    }
  }
})

test('without a spot colour the spot tokens are the theme\'s own fill and accent', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const c = themeTokens(colorTheme({ id: 'one', label: 'One', color: '#00857a' }), scheme, null, AS_CHOSEN).colors
    expect(c['spot']).toBe(c['primary'])
    expect(c['spot-foreground']).toBe(c['primary-foreground'])
    expect(c['spot-soft']).toBe(c['accent-soft'])
    expect(c['spot-ink']).toBe(c['accent'])
  }
})

test('a pick names a proposal or a colour of its own; anything else is no spot', () => {
  expect(spotOf({ color: '#00857a', spot: 'loud' })).toBe(spotSuggestions('#00857a').loud)
  expect(spotOf({ color: '#00857a', spot: '#AA3300' })).toBe('#aa3300')
  for (const no of [null, undefined, 'none', 'Balanced', 'red']) expect(spotOf({ color: '#00857a', spot: no as string | null })).toBeUndefined()
  expect(isSpotKind('balanced')).toBe(true)
  expect(isSpotKind('constructor')).toBe(false)
  expect(colorTheme({ id: 'one', label: 'One', color: '#00857a', spot: 'none' }).spot).toBeUndefined()
})

test('ColorMatch: two radio groups, the proposals named, a pick reported', () => {
  const onColor = vi.fn()
  const onSpot = vi.fn()
  render(
    <ColorMatch
      colors={[{ color: '#00857a', label: 'Teal' }, { color: '#246fe0', label: 'Blue' }]}
      color="#00857a" spot="balanced" scheme="light" onColor={onColor} onSpot={onSpot}
      text={{ color: 'Theme colour', spot: 'Spot colour', own: 'Your own colour', none: 'None', kinds: { quiet: 'Quiet', balanced: 'Balanced', loud: 'Loud' }, sample: { action: 'Save', chosen: 'Today', row: 'Upcoming', due: 'Due now', running: 'Running' } }}
    />,
  )
  expect(screen.getByRole('radio', { name: 'Teal' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByRole('radio', { name: 'Balanced' }).getAttribute('aria-checked')).toBe('true')
  fireEvent.click(screen.getByRole('radio', { name: 'Blue' }))
  expect(onColor).toHaveBeenCalledWith('#246fe0')
  fireEvent.click(screen.getByRole('radio', { name: 'Loud' }))
  expect(onSpot).toHaveBeenCalledWith('loud')
  fireEvent.click(screen.getByRole('radio', { name: 'None' }))
  expect(onSpot).toHaveBeenCalledWith(null)
  fireEvent.change(screen.getByLabelText('Spot colour: Your own colour'), { target: { value: '#aa3300' } })
  expect(onSpot).toHaveBeenCalledWith('#aa3300')
})
