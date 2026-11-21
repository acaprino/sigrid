import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { BASE_THEME, ThemeGallery, presetTone, themeVariables } from '../src'

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
