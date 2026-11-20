// Button `loading` (the owner's decision Q3 of 2026-11-20): Park's loading state without its spinner. The button keeps
// its size, is busy and aria-disabled, keeps focus, ignores clicks, and may show the caller's `loadingText`.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { Button } from '../src'

test('without loading the button is as before: no busy state, no extra wrapper', () => {
  const { container } = render(<Button>Save</Button>)
  const b = screen.getByRole('button', { name: 'Save' })
  expect(b.getAttribute('aria-busy')).toBeNull()
  expect(b.getAttribute('aria-disabled')).toBeNull()
  expect(container.querySelector('[data-slot="button-label"]')).toBeNull()
  expect(b.innerHTML).toBe('Save')
})

test('loading: aria-busy and aria-disabled, still focusable (not disabled), and a click does nothing', () => {
  const onClick = vi.fn()
  render(
    <Button loading onClick={onClick}>
      Save
    </Button>,
  )
  const b = screen.getByRole('button', { name: 'Save' })
  expect(b.getAttribute('aria-busy')).toBe('true')
  expect(b.getAttribute('aria-disabled')).toBe('true')
  expect(b.hasAttribute('disabled')).toBe(false)
  b.focus()
  expect(document.activeElement).toBe(b)
  fireEvent.click(b)
  expect(onClick).not.toHaveBeenCalled()
  // No pointer while busy: no hover, no press.
  expect(b.className.split(' ')).toContain('pointer-events-none')
})

test('loading inside a form: the submit button does not submit', () => {
  const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
  render(
    <form onSubmit={onSubmit}>
      <Button type="submit" loading>
        Save
      </Button>
    </form>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSubmit).not.toHaveBeenCalled()
})

test('loadingText replaces the label while loading; both share one grid cell so the size does not change', () => {
  function Saving() {
    const [busy, setBusy] = useState(false)
    return (
      <Button loading={busy} loadingText="Saving…" onClick={() => setBusy(true)}>
        Save
      </Button>
    )
  }
  const { container } = render(<Saving />)
  const b = screen.getByRole('button', { name: 'Save' })
  const layers = () => [...container.querySelectorAll('[data-slot="button-label"] > span')] as HTMLElement[]
  // At rest: the label is visible, the loading text keeps its room but is hidden from the eye and the ear.
  expect(layers().map((l) => l.textContent)).toEqual(['Save', 'Saving…'])
  expect(layers().every((l) => l.className.split(' ').includes('col-start-1') && l.className.split(' ').includes('row-start-1'))).toBe(true)
  expect(layers()[0]!.className).not.toContain('invisible')
  expect(layers()[1]!.className.split(' ')).toContain('invisible')
  expect(layers()[1]!.getAttribute('aria-hidden')).toBe('true')
  fireEvent.click(b)
  // Busy: the accessible name is the loading text; the same element, the same two layers (nothing remounts).
  expect(screen.getByRole('button', { name: 'Saving…' })).toBe(b)
  expect(layers()[0]!.className.split(' ')).toContain('invisible')
  expect(layers()[0]!.getAttribute('aria-hidden')).toBe('true')
  expect(layers()[1]!.className).not.toContain('invisible')
  // The size classes stay the same.
  expect(b.getAttribute('data-size')).toBe('default')
  expect(b.className.split(' ')).toEqual(expect.arrayContaining(['h-10', 'min-w-10', 'px-3.5']))
})

test('no spinner and no looping animation while loading (motion rules)', () => {
  const { container } = render(
    <Button loading loadingText="Saving…">
      Save
    </Button>,
  )
  expect(container.querySelector('svg')).toBeNull()
  expect(container.innerHTML).not.toMatch(/animate-/)
})

test('asChild: the child takes the busy state too', () => {
  const onClick = vi.fn()
  render(
    <Button asChild loading onClick={onClick}>
      <a href="#next">Next</a>
    </Button>,
  )
  const link = screen.getByRole('link', { name: 'Next' })
  expect(link.getAttribute('aria-busy')).toBe('true')
  expect(link.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(link)
  expect(onClick).not.toHaveBeenCalled()
})
