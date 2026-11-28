// InputGroup: one field around its parts; the wiring of a FormField reaches the `<input>`; the buttons of the group.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { FormField, InputGroup, InputGroupButton, InputGroupText } from '../src/components'
import { classes } from './helpers'

const slot = (root: ParentNode, name: string) => root.querySelector(`[data-slot="${name}"]`) as HTMLElement

describe('InputGroup', () => {
  test('one field: the border is on the group and the input inside has none (R4)', () => {
    const { container } = render(<InputGroup aria-label="Site" start={<InputGroupText>https://</InputGroupText>} end={<InputGroupText>.com</InputGroupText>} />)
    const group = slot(container, 'input-group')
    const input = screen.getByRole('textbox', { name: 'Site' })
    expect(classes(group)).toEqual(expect.arrayContaining(['border', 'border-line', 'rounded-md', 'h-(--control-md)']))
    expect(classes(group).some((c) => c.startsWith('shadow'))).toBe(false)
    expect(classes(input).some((c) => c.startsWith('border') || c.startsWith('rounded'))).toBe(false)
    // The ring is the group's, while the text has the keyboard focus: the input draws none of its own.
    expect(classes(group)).toContain('has-[input:focus-visible]:outline-ring')
    expect(classes(input)).toContain('outline-none')
    expect(classes(input).some((c) => c.startsWith('focus'))).toBe(false)
    // The parts stand in the order they are read: before the text, the text, after it.
    expect([...group.children].map((el) => el.getAttribute('data-slot'))).toEqual(['input-group-start', 'input', 'input-group-end'])
    expect(slot(container, 'input-group-start').textContent).toBe('https://')
  })

  test('without parts there is no empty slot; the props and the ref go to the input', () => {
    const ref = { current: null as HTMLInputElement | null }
    const onChange = vi.fn()
    const { container } = render(<InputGroup ref={ref} aria-label="Name" placeholder="Ada" onChange={onChange} className="w-64" />)
    const group = slot(container, 'input-group')
    expect(group.children).toHaveLength(1)
    expect(classes(group)).toContain('w-64')
    expect(ref.current).toBe(screen.getByRole('textbox'))
    expect(ref.current?.placeholder).toBe('Ada')
    fireEvent.change(ref.current!, { target: { value: 'x' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test('in a FormField the label, the note and the invalid state reach the input', () => {
    render(
      <FormField label="Weight" error="Write a number." required>
        <InputGroup end={<InputGroupText>kg</InputGroupText>} />
      </FormField>,
    )
    const input = screen.getByLabelText(/Weight/) as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.required).toBe(true)
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Write a number.')
  })

  test('a press on the words puts the caret in the field; a press on a button does not', () => {
    const onClick = vi.fn()
    render(<InputGroup aria-label="Site" start={<InputGroupText>https://</InputGroupText>} end={<InputGroupButton label="Go" onClick={onClick} />} />)
    const input = screen.getByRole('textbox')
    expect(fireEvent.mouseDown(screen.getByText('https://'))).toBe(false)
    expect(document.activeElement).toBe(input)
    input.blur()
    const button = screen.getByRole('button', { name: 'Go' })
    expect(fireEvent.mouseDown(button)).toBe(true)
    expect(document.activeElement).not.toBe(input)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('a button of the group is quiet (R3); with an icon it shows the icon alone and is named by its label', () => {
    render(
      <InputGroup
        aria-label="Key"
        end={
          <>
            <InputGroupButton label="Copy the key" icon={<svg data-testid="drawing" />} />
            <InputGroupButton label="Show" pressed={false} />
          </>
        }
      />,
    )
    const copy = screen.getByRole('button', { name: 'Copy the key' })
    expect(copy.getAttribute('data-variant')).toBe('ghost')
    expect(copy.getAttribute('data-size')).toBe('icon-xs')
    expect(copy.textContent).toBe('')
    expect(copy.hasAttribute('title')).toBe(false)
    expect(copy.hasAttribute('aria-pressed')).toBe(false)
    const show = screen.getByRole('button', { name: 'Show' })
    expect(show.getAttribute('data-variant')).toBe('ghost')
    expect(show.getAttribute('aria-pressed')).toBe('false')
    expect(show.getAttribute('type')).toBe('button')
  })

  test('disabled: the input and the buttons of the group are off, and the group fades once', () => {
    const { container } = render(<InputGroup aria-label="Coupon" disabled end={<InputGroupButton label="Apply" />} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true)
    expect(classes(slot(container, 'input-group'))).toContain('has-[input:disabled]:opacity-50')
    expect(classes(input).some((c) => c.includes('opacity'))).toBe(false)
  })
})
