// Disclosure: one row that opens in place; what is inside stays in the page while closed.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Disclosure } from '../src/components'
import { classes } from './helpers'

const panel = () => document.querySelector('[data-slot="disclosure-panel"]') as HTMLElement

describe('Disclosure', () => {
  test('closed at first: the row is a button that says so, and what is inside is in the page, hidden', () => {
    render(
      <Disclosure label="Add a coupon">
        <input aria-label="Coupon" />
      </Disclosure>,
    )
    const row = screen.getByRole('button', { name: 'Add a coupon' })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(row.querySelector('[data-icon="chevron"]')).toBeTruthy()
    expect(classes(row)).toEqual(expect.arrayContaining(['min-h-(--control-sm)', 'pointer-coarse:min-h-11', 'focus-visible:outline-ring']))
    expect(classes(row).some((c) => c === 'border' || c.startsWith('shadow'))).toBe(false)
    expect(panel().hidden).toBe(true)
    expect(panel().querySelector('input')).toBeTruthy()
  })

  test('a press opens it in place and a second closes it; what was written inside is kept', () => {
    render(
      <Disclosure label="Add a note">
        <input aria-label="Note" />
      </Disclosure>,
    )
    const row = screen.getByRole('button', { name: 'Add a note' })
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(panel().hidden).toBe(false)
    expect(row.getAttribute('aria-controls')).toBe(panel().id)
    const field = screen.getByLabelText('Note') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'kept' } })
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(row)
    expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('kept')
  })

  test('the app can keep it open or closed; the fact after the name is not part of the name people look for', () => {
    const seen = vi.fn()
    function Sample() {
      const [open, setOpen] = useState(true)
      return (
        <Disclosure label="Advanced" summary="2 set" open={open} onOpenChange={(next) => { seen(next); setOpen(next) }}>
          <p>inside</p>
        </Disclosure>
      )
    }
    render(<Sample />)
    const row = screen.getByRole('button', { name: /Advanced/ })
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(row.querySelector('[data-slot="disclosure-summary"]')!.textContent).toBe('2 set')
    fireEvent.click(row)
    expect(seen).toHaveBeenCalledWith(false)
    expect(row.getAttribute('aria-expanded')).toBe('false')
  })

  test('disabled: the row does not open', () => {
    render(
      <Disclosure label="Not available" disabled>
        <p>inside</p>
      </Disclosure>,
    )
    const row = screen.getByRole('button', { name: 'Not available' }) as HTMLButtonElement
    expect(row.disabled).toBe(true)
    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('what opens in place glides only after the reader\'s own press', () => {
  test('the panel is marked to glide after a press on the row, and not when the app opens or closes it', async () => {
    const { Reasoning } = await import('../src/components')
    const { rerender, container } = render(<Reasoning busy>Thinking it over</Reasoning>)
    const panel = () => container.querySelector('[data-slot="disclosure-panel"]')!
    // Opened by the app (it is being written): at once.
    expect(panel().hasAttribute('data-reveal')).toBe(false)
    // Closed by the app (it is done): at once too.
    rerender(<Reasoning>Thinking it over</Reasoning>)
    expect(panel().hasAttribute('data-reveal')).toBe(false)
    // Opened by the reader: it glides.
    fireEvent.click(screen.getByRole('button', { name: 'Thought' }))
    expect(panel().hasAttribute('data-reveal')).toBe(true)
  })

  test('the stylesheet moves it only with motion on and where the system allows it, and what closes waits for the end', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(`${process.cwd()}/src/styles/theme.css`, 'utf8')
    const at = css.indexOf(':where(:root[data-motion]) [data-reveal] {')
    expect(at).toBeGreaterThan(-1)
    expect(css.lastIndexOf('@media (prefers-reduced-motion: no-preference) {', at)).toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('\n  }\n', at))
    expect(rule).toMatch(/height var\(--motion-normal\) var\(--motion-ease-move\)/)
    expect(rule).toMatch(/display var\(--motion-normal\) allow-discrete/)
    expect(rule).toMatch(/@starting-style/)
    // No time and no curve written by hand in what the stylesheet moves: they are the feel's.
    const moving = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference) {', css.indexOf('--motion-ease-move:')), css.indexOf('[data-scroll-shade]'))
    expect(moving).not.toMatch(/\d+ms|cubic-bezier|\blinear\b/)
  })
})
