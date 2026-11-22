// The controls an app needs for its settings and its navigation: Switch and Tabs (Ark UI, Park's form), FormField
// (label, helper, error around one control), Count (R5) and NavList/NavItem (R1, R6).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Count, FormField, Icon, Input, NavItem, NavList, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '../src'

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
// Careful: Tailwind also scans `test/`. Class names with a variant are composed, not written whole.
const coarse = (cls: string) => 'pointer-coarse:' + cls
// Ark moves the focus and commits a choice after the event, in a frame: the test waits for it, as the browser would.
const settle = () => act(async () => { await new Promise((done) => setTimeout(done, 120)) })

describe('Switch', () => {
  test('a switch with its label: a click on the control or on the label toggles, and the caller gets a boolean', async () => {
    const spy = vi.fn()
    render(<Switch onCheckedChange={spy}>Start with the system</Switch>)
    const control = screen.getByRole('switch', { name: 'Start with the system' }) as HTMLInputElement
    expect(control.checked).toBe(false)
    fireEvent.click(control)
    await settle()
    expect(spy).toHaveBeenLastCalledWith(true)
    expect(control.checked).toBe(true)
    fireEvent.click(screen.getByText('Start with the system'))
    await settle()
    expect(spy).toHaveBeenLastCalledWith(false)
  })

  test('controlled: the state is the caller\'s; `aria-label` names a switch without a label; `id` goes on the control', () => {
    const { rerender, container } = render(<Switch id="sync" aria-label="Sync" checked={false} onCheckedChange={() => {}} />)
    const control = screen.getByRole('switch', { name: 'Sync' }) as HTMLInputElement
    expect(control.id).toBe('sync')
    expect(control.checked).toBe(false)
    expect(container.querySelector('[data-slot="switch-label"]')).toBeNull()
    rerender(<Switch id="sync" aria-label="Sync" checked onCheckedChange={() => {}} />)
    expect(control.checked).toBe(true)
    expect(container.querySelector('[data-slot="switch-control"]')!.getAttribute('data-state')).toBe('checked')
  })

  test('disabled: not toggled; the form of Park md, the accent when on, a 44px area with a coarse pointer', async () => {
    const spy = vi.fn()
    const { container } = render(
      <Switch disabled onCheckedChange={spy}>
        Off
      </Switch>,
    )
    const input = screen.getByRole('switch') as HTMLInputElement
    expect(input.disabled).toBe(true)
    fireEvent.click(input)
    await settle()
    expect(spy).not.toHaveBeenCalled()
    const track = classes(container.querySelector('[data-slot="switch-control"]')!)
    for (const c of ['h-5', 'w-10', 'rounded-full', 'bg-input', 'data-[state=checked]:bg-primary']) expect(track).toContain(c)
    // On the accent the thumb takes the colour the engine pairs with it.
    expect(classes(container.querySelector('[data-slot="switch-thumb"]')!)).toContain('data-[state=checked]:bg-primary-foreground')
    // The area: 20px + 2 x 12px with a coarse pointer, 20px + 2 x 4px otherwise.
    expect(track).toContain(coarse('after:-inset-3'))
    expect(track).toContain('after:-inset-1')
    // No transition without `animated`.
    expect(classes(container.querySelector('[data-slot="switch-thumb"]')!).some((c) => c.includes('transition'))).toBe(false)
  })
})

describe('Tabs', () => {
  function Sample({ activation, onChange = () => {} }: { activation?: 'automatic' | 'manual'; onChange?: (v: string) => void }) {
    const [value, setValue] = useState('mail')
    return (
      <Tabs
        value={value}
        activation={activation}
        onValueChange={(v) => {
          onChange(v)
          setValue(v)
        }}
      >
        <TabsList aria-label="Settings">
          <TabsTrigger value="mail">Mail</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="off" disabled>
            Later
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mail">Mail settings</TabsContent>
        <TabsContent value="calendar">Calendar settings</TabsContent>
      </Tabs>
    )
  }
  const tab = (name: string) => screen.getByRole('tab', { name })

  test('a named tablist; the chosen tab is selected and its panel is the one shown; a click chooses', async () => {
    const spy = vi.fn()
    render(<Sample onChange={spy} />)
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeTruthy()
    expect(tab('Mail').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('Mail settings')
    fireEvent.click(tab('Calendar'))
    await settle()
    expect(spy).toHaveBeenLastCalledWith('calendar')
    expect(tab('Calendar').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('Calendar settings')
    // A click on the chosen tab is not a change.
    fireEvent.click(tab('Calendar'))
    await settle()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('one Tab stop; the arrows move along the tabs and wrap; a disabled tab is skipped', async () => {
    render(<Sample />)
    expect(tab('Mail').tabIndex).toBe(0)
    expect(tab('Calendar').tabIndex).toBe(-1)
    act(() => tab('Mail').focus())
    fireEvent.keyDown(tab('Mail'), { key: 'ArrowRight' })
    await settle()
    expect(document.activeElement).toBe(tab('Calendar'))
    fireEvent.keyDown(tab('Calendar'), { key: 'ArrowRight' })
    await settle()
    // «Later» is disabled: the focus wraps to the first tab. (That an arrow also chooses, with automatic activation,
    // is Ark's and needs a real frame clock: it is checked in the browser, on the showcase.)
    expect(document.activeElement).toBe(tab('Mail'))
  })

  test('manual activation: the arrows only move, and the tab is chosen as a button is (Enter, Space or a click)', async () => {
    const spy = vi.fn()
    render(<Sample activation="manual" onChange={spy} />)
    act(() => tab('Mail').focus())
    fireEvent.keyDown(tab('Mail'), { key: 'ArrowRight' })
    await settle()
    expect(document.activeElement).toBe(tab('Calendar'))
    expect(spy).not.toHaveBeenCalled()
    // Enter and Space on a native button are a click: jsdom does not turn the key into one.
    fireEvent.click(tab('Calendar'))
    await settle()
    expect(spy).toHaveBeenLastCalledWith('calendar')
  })

  test('the chosen tab is the selection tint with its ink, never a bar (R1); 44px with a coarse pointer', () => {
    render(<Sample />)
    const c = classes(tab('Mail'))
    expect(c).toContain('data-[selected]:bg-selected')
    expect(c).toContain('data-[selected]:text-selected-ink')
    expect(c).toContain(coarse('min-h-11'))
    expect(c.some((x) => /border-b|after:|before:/.test(x))).toBe(false)
  })
})

describe('FormField', () => {
  test('the label names the control; the helper describes it', () => {
    render(
      <FormField label="Name" help="As it appears on your messages.">
        <Input />
      </FormField>,
    )
    const input = screen.getByLabelText('Name')
    const note = document.getElementById(input.getAttribute('aria-describedby')!)!
    expect(note.textContent).toBe('As it appears on your messages.')
    expect(note.getAttribute('role')).toBeNull()
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })

  test('an error takes the helper\'s place, makes the control invalid and is announced', () => {
    render(
      <FormField label="Address" help="Your work address." error="Write an address with an @." required>
        <Input aria-describedby="other" />
      </FormField>,
    )
    // The required mark is not part of the name.
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(document.querySelector('[data-slot="field-label"] [aria-hidden="true"]')!.textContent).toBe('*')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.required).toBe(true)
    const ids = input.getAttribute('aria-describedby')!.split(' ')
    expect(ids[0]).toBe('other')
    expect(screen.getByRole('alert').id).toBe(ids[1])
    expect(screen.getByRole('alert').textContent).toBe('Write an address with an @.')
    expect(screen.queryByText('Your work address.')).toBeNull()
  })

  test('the id is the caller\'s when given, on the field or on the control; a Select is wired the same way', () => {
    render(
      <>
        <FormField label="One" id="one">
          <Input />
        </FormField>
        <FormField label="Two">
          <Input id="two" />
        </FormField>
        <FormField label="Density" error="Choose one.">
          <Select options={[{ value: 'a', label: 'A' }]} value="a" onValueChange={() => {}} />
        </FormField>
      </>,
    )
    expect(screen.getByLabelText('One').id).toBe('one')
    expect(screen.getByLabelText('Two').id).toBe('two')
    expect(screen.getByLabelText('Density').getAttribute('aria-invalid')).toBe('true')
  })
})

describe('the design of 2026-11-22: the error box, the count pills', () => {
  test('a field with an error shows it in a box on the soft destructive fill, and its control keeps its own border', () => {
    render(
      <FormField label="Address" error="Write an address with an @.">
        <Input defaultValue="ada.example.com" />
      </FormField>,
    )
    const box = screen.getByRole('alert')
    for (const c of ['rounded-md', 'bg-destructive-soft', 'text-destructive', 'px-3', 'py-2']) expect(classes(box)).toContain(c)
    expect(classes(box.closest('[data-slot="field"]')!)).toContain('[&[data-invalid]_[aria-invalid=true]]:border-line')
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true')
  })

  test('the helper of a field is the 12px muted text', () => {
    render(
      <FormField label="Name" help="As it appears on your messages.">
        <Input />
      </FormField>,
    )
    const help = classes(screen.getByText('As it appears on your messages.'))
    expect(help).toContain('text-xs')
    expect(help).toContain('text-muted-foreground')
  })

  test('a count on a navigation row is a pill: neutral on a row, in the accent on the chosen one, in each tone', () => {
    for (const tone of ['page', 'sidebar'] as const) {
      const { unmount } = render(
        <NavList aria-label="Places" tone={tone}>
          <NavItem current end={<Count value={3} />}>Chosen</NavItem>
        </NavList>,
      )
      const c = classes(screen.getByRole('button'))
      for (const cls of ['[&_[data-slot=count]]:rounded-full', '[&_[data-slot=count]]:px-1.5', '[&_[data-slot=count]]:font-semibold']) expect(c, tone).toContain(cls)
      expect(c, tone).toContain(tone === 'page' ? '[&_[data-slot=count]]:bg-ink/9' : '[&_[data-slot=count]]:bg-sidebar-ink/12')
      expect(c, tone).toContain(tone === 'page' ? 'aria-[current=page]:[&_[data-slot=count]]:bg-primary' : 'aria-[current=page]:[&_[data-slot=count]]:bg-sidebar-accent')
      expect(c, tone).toContain(tone === 'page' ? 'aria-[current=page]:before:bg-primary' : 'aria-[current=page]:before:bg-sidebar-accent')
      unmount()
    }
  })
})

describe('Count (R5)', () => {
  test('a plain tabular number, never a pill: no fill, no border, no rounding', () => {
    const { container } = render(<Count value={12} />)
    const el = container.querySelector('[data-slot="count"]')!
    expect(el.textContent).toBe('12')
    const c = classes(el)
    expect(c).toContain('tabular-nums')
    expect(c.some((x) => /^(bg-|border|rounded|px-|ring)/.test(x))).toBe(false)
  })

  test('zero or nothing shows nothing; with `reserve` the room stays, hidden; `label` says what is counted', () => {
    const { container, rerender } = render(<Count value={0} />)
    expect(container.firstChild).toBeNull()
    rerender(<Count value={null} reserve />)
    const kept = container.querySelector('[data-slot="count"]')!
    expect(kept.getAttribute('aria-hidden')).toBe('true')
    expect(classes(kept)).toContain('invisible')
    rerender(<Count value="99+" label="unread" />)
    expect(container.querySelector('[data-slot="count"]')!.textContent).toBe('99+ unread')
  })
})

describe('NavList and NavItem (R1, R6)', () => {
  test('a named navigation of rows; the current one says so and takes the selection tint; a click acts', () => {
    const spy = vi.fn()
    render(
      <NavList aria-label="Mail folders">
        <NavItem current icon={<Icon name="date" />} end={<Count value={3} />}>
          Inbox
        </NavItem>
        <NavItem onClick={spy}>Sent</NavItem>
        <NavItem href="/archive">Archive</NavItem>
      </NavList>,
    )
    const nav = screen.getByRole('navigation', { name: 'Mail folders' })
    expect(nav.querySelectorAll('li')).toHaveLength(3)
    const inbox = screen.getByRole('button', { name: /Inbox/ })
    expect(inbox.getAttribute('aria-current')).toBe('page')
    expect(classes(inbox)).toContain('aria-[current=page]:bg-selected')
    const sent = screen.getByRole('button', { name: 'Sent' })
    expect(sent.getAttribute('aria-current')).toBeNull()
    expect(sent.getAttribute('type')).toBe('button')
    fireEvent.click(sent)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Archive' }).getAttribute('href')).toBe('/archive')
  })

  test('a row without an icon keeps the empty slot (R6); the bar is only on the chosen row (R1); 44px with a coarse pointer', () => {
    render(
      <NavList aria-label="Places">
        <NavItem icon={<Icon name="date" />}>Today</NavItem>
        <NavItem>Plain</NavItem>
      </NavList>,
    )
    for (const row of screen.getAllByRole('button')) {
      const slot = row.querySelector('[data-slot="nav-item-icon"]')!
      expect(classes(slot)).toContain('size-4')
      const c = classes(row)
      expect(c).toContain(coarse('min-h-11'))
      // The short accent bar is drawn on the chosen row only: every class of it is under `aria-[current=page]`.
      expect(c.filter((x) => /before:|after:/.test(x)).every((x) => x.startsWith('aria-[current=page]:'))).toBe(true)
      expect(c).toContain('aria-[current=page]:before:bg-primary')
      expect(c.some((x) => /border-l|border-s/.test(x))).toBe(false)
    }
    expect(screen.getByRole('button', { name: 'Plain' }).querySelector('[data-slot="nav-item-icon"]')!.childElementCount).toBe(0)
  })

  test('on the sidebar the rows use the sidebar\'s own ink and selection', () => {
    render(
      <NavList aria-label="Views" tone="sidebar">
        <NavItem current>Today</NavItem>
      </NavList>,
    )
    const c = classes(screen.getByRole('button', { name: 'Today' }))
    expect(c).toContain('text-sidebar-ink')
    expect(c).toContain('aria-[current=page]:bg-sidebar-selected')
    expect(c).not.toContain('aria-[current=page]:bg-selected')
  })
})
