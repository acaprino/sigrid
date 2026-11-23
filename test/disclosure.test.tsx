// Disclosure: one row that opens in place; what is inside stays in the page while closed.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Disclosure } from '../src'

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
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
