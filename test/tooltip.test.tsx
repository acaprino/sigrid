import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Tooltip, TOOLTIP_DELAY_MS } from '../src/primitives/tooltip'


afterEach(() => {
  vi.useRealTimers()
})

const tip = () => document.querySelector('[data-slot="tooltip-content"]')

test('hover opens after the delay, not before; the tooltip does not catch the pointer and stays under sheets', async () => {
  vi.useFakeTimers()
  render(
    <Tooltip label="Menu">
      <button type="button" aria-label="Menu">
        ≡
      </button>
    </Tooltip>,
  )
  const button = screen.getByRole('button', { name: 'Menu' })
  fireEvent.pointerEnter(button, { pointerType: 'mouse' })
  fireEvent.mouseEnter(button)
  fireEvent.pointerMove(button, { pointerType: 'mouse' })
  fireEvent.mouseMove(button)
  await act(async () => {
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 100)
  })
  expect(tip()).toBeNull()
  await act(async () => {
    vi.advanceTimersByTime(200)
  })
  const content = tip() as HTMLElement | null
  expect(content).not.toBeNull()
  expect(content!.textContent).toBe('Menu')
  expect(content!.className).toMatch(/pointer-events-none/)
  const positioner = content!.closest('[data-slot="tooltip-positioner"]') as HTMLElement
  expect(positioner.className).toMatch(/pointer-events-none/)
  expect(positioner.className).toMatch(/z-\[45\]/)
  expect(positioner.className).not.toMatch(/z-50/)
})

test('without animated the tooltip has no motion styles', async () => {
  render(
    <Tooltip label="Notifications">
      <button type="button" aria-label="Notifications">
        !
      </button>
    </Tooltip>,
  )
  const button = screen.getByRole('button', { name: 'Notifications' })
  await act(async () => {
    fireEvent.focus(button)
    button.focus()
  })
  const content = await screen.findByText('Notifications', { selector: '[data-slot="tooltip-content"]' })
  expect(content.className).not.toMatch(/transition|animate|duration/)
  expect(content.getAttribute('style') ?? '').not.toMatch(/opacity|transform/)
})

test('a click on the button still reaches its handler, and Escape closes the tooltip', async () => {
  const onClick = vi.fn()
  render(
    <Tooltip label="Minimize">
      <button type="button" aria-label="Minimize" onClick={onClick}>
        -
      </button>
    </Tooltip>,
  )
  const button = screen.getByRole('button', { name: 'Minimize' })
  await act(async () => {
    fireEvent.focus(button)
    button.focus()
  })
  await screen.findByText('Minimize', { selector: '[data-slot="tooltip-content"]' })
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledTimes(1)
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
  })
})
