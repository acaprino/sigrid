import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { BASE_THEME, ThemeGallery, presetTone, themeVariables } from '../src'
import { THEMES } from './fixtures/sample-themes'

test('theme previews follow the scheme and tone, while the custom choice stays keyboard accessible', () => {
  const onTheme = vi.fn()
  const custom = { label: 'Custom', onChoose: vi.fn() }
  const props = { label: 'Themes', themes: [BASE_THEME], selected: BASE_THEME.id, onTheme, custom }
  const view = render(<ThemeGallery {...props} scheme="light" />)
  const tile = screen.getByRole('radio', { name: BASE_THEME.label, checked: true })
  tile.focus()
  fireEvent.keyDown(tile, { key: 'ArrowRight' })
  expect(custom.onChoose).toHaveBeenCalledOnce()
  const tone = presetTone('calm')
  view.rerender(<ThemeGallery {...props} selected={null} scheme="dark" tone={tone} />)
  expect(screen.getByRole('radio', { name: 'Custom', checked: true }).tabIndex).toBe(0)
  expect(tile.tabIndex).toBe(-1)
  expect(tile.querySelector<HTMLElement>('[style]')?.style.getPropertyValue('--color-primary'))
    .toBe(themeVariables({ theme: BASE_THEME, scheme: 'dark', tone })['--color-primary'])
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
  expect(onTheme).toHaveBeenCalledWith(BASE_THEME)
})

test('Home and End reach the first and the last tile and choose it, as in the radio group; on the chosen one they choose nothing again', () => {
  const themes = THEMES.slice(0, 3)
  const onTheme = vi.fn()
  const custom = { label: 'Custom', onChoose: vi.fn() }
  const view = render(<ThemeGallery label="Themes" themes={themes} selected={themes[1]!.id} onTheme={onTheme} custom={custom} scheme="light" />)
  const middle = screen.getByRole('radio', { name: themes[1]!.label })
  middle.focus()
  expect(fireEvent.keyDown(middle, { key: 'End' })).toBe(false)
  expect(custom.onChoose).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Custom' }))
  fireEvent.keyDown(document.activeElement!, { key: 'Home' })
  expect(onTheme).toHaveBeenCalledExactlyOnceWith(themes[0])
  const first = screen.getByRole('radio', { name: themes[0]!.label })
  expect(document.activeElement).toBe(first)
  // On the chosen tile: the key is taken, nothing is chosen again.
  view.rerender(<ThemeGallery label="Themes" themes={themes} selected={themes[0]!.id} onTheme={onTheme} custom={custom} scheme="light" />)
  first.focus()
  expect(fireEvent.keyDown(first, { key: 'Home' })).toBe(false)
  expect(onTheme).toHaveBeenCalledOnce()
  // Another key is left to the page.
  expect(fireEvent.keyDown(first, { key: 'PageDown' })).toBe(true)
})

// The tone chooser does not offer three copies of one preview.
import { TonePresetChoice as ToneChoice, BASE_THEME as GrayTheme, paletteTheme as paletteThemeOf, COLORS as SeedColors } from '../src'
test('on a theme with no hue the tone chooser says why it offers nothing; on a coloured theme it shows its three cards', () => {
  const text = { label: 'Tone', hint: '', noEffect: 'No hue: the tone changes nothing.', presets: { calm: { name: 'Calm', note: '' }, balanced: { name: 'Balanced', note: '' }, vivid: { name: 'Vivid', note: '' } } }
  const { unmount } = render(<ToneChoice theme={GrayTheme} scheme="light" palette={null} tone={null} onTone={() => {}} text={text} />)
  expect(screen.getByText('No hue: the tone changes nothing.')).toBeTruthy()
  expect(document.querySelectorAll('[data-slot="tone-preview"]').length).toBe(0)
  unmount()
  const coloured = render(<ToneChoice theme={paletteThemeOf({ seed: SeedColors[1]!, combo: 'clean' })} scheme="light" palette={null} tone={null} onTone={() => {}} text={text} />)
  expect(document.querySelectorAll('[data-slot="tone-preview"]').length).toBe(3)
  // Without the sentence an app keeps the cards on any theme, as before.
  coloured.unmount()
  render(<ToneChoice theme={GrayTheme} scheme="light" palette={null} tone={null} onTone={() => {}} text={{ ...text, noEffect: undefined }} />)
  expect(document.querySelectorAll('[data-slot="tone-preview"]').length).toBe(3)
})
