import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button, Checkbox, Input, Textarea } from '../src/primitives'
import { Dialog } from '../src/components'

test('Button default is the accent action', () => {
  render(<Button>Add</Button>)
  const b = screen.getByRole('button', { name: 'Add' })
  expect(b.className).toMatch(/(^|\s)bg-primary(\s|$)/)
  expect(b.getAttribute('type')).toBe('button')
})

test('Button outline has the light divider border, and its focus ring is the offset one, as on every control', () => {
  render(<Button variant="outline">Reply</Button>)
  const c = screen.getByRole('button').className.split(' ')
  expect(c).toContain('border-line')
  expect(c).not.toContain('border-input')
  expect(c).toContain('focus-visible:outline-offset-2')
  expect(c.some((x) => x.includes('-outline-offset-1'))).toBe(false)
})

test('a field has its focus ring on its own border, one line and not two; a button keeps it 2px away', () => {
  render(
    <>
      <Input aria-label="Name" />
      <Textarea aria-label="Notes" />
    </>,
  )
  for (const name of ['Name', 'Notes']) {
    const c = screen.getByRole('textbox', { name }).className.split(' ')
    expect(c, name).toContain('focus-visible:-outline-offset-1')
    expect(c, name).toContain('focus-visible:outline-2')
    expect(c, name).not.toContain('focus-visible:outline-offset-2')
  }
})

test('Button destructive is a solid red fill with the text colour paired with it', () => {
  render(<Button variant="destructive">Delete</Button>)
  expect(screen.getByRole('button').className.split(' ')).toEqual(expect.arrayContaining([
    'bg-destructive', 'text-destructive-foreground', 'hover:' + 'bg-destructive/90',
  ]))
})

test('Checkbox is a real checkbox', () => {
  render(<Checkbox aria-label="Complete" checked onCheckedChange={() => {}} />)
  expect(screen.getByRole('checkbox', { name: 'Complete' }).getAttribute('data-state')).toBe('checked')
})

test('Dialog renders title and footer when open', () => {
  render(
    <Dialog open onOpenChange={() => {}} title="New area" footer={<Button>Create</Button>}>
      <Input aria-label="Name" />
    </Dialog>,
  )
  expect(screen.getByRole('dialog', { name: 'New area' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy()
})

test('primitives carry no automatic motion classes', () => {
  // `baseElement`: the Dialog lives in a portal, outside the container. `transition-none` is the absence of motion.
  const { baseElement } = render(
    <>
      <Button>x</Button>
      <Input />
      <Textarea />
      <Checkbox aria-label="Complete" />
      <Dialog open onOpenChange={() => {}} title="New area" footer={<Button>Create</Button>} />
    </>,
  )
  expect(baseElement.innerHTML).not.toMatch(/(^|[\s"])(transition|animate)-(?!none)/)
})

// One language for every list (src/lib/rows.ts): the row under the pointer or reached with the arrows, and the
// heading of a group of rows, are the same in a menu, a select, a combo box, the labels field and the sidebar.
test('every list highlights a row the same way and heads a group the same way', async () => {
  const { readFileSync } = await import('node:fs')
  const { ROW_HIGHLIGHT, ROW_HIGHLIGHTED, ROW_HOVER, ROW_CHOSEN, GROUP_LABEL, LIST_ROW, LIST_CARD } = await import('../src/lib/rows')
  const source = (file: string) => readFileSync(`${process.cwd()}/src/${file}`, 'utf8')
  expect(ROW_HIGHLIGHT).toBe('bg-selected/60 text-ink')
  // A row reached in a card: the share of the selection tint, never the page's second paper (it was next to invisible),
  // taken from the shared module by every list that floats (a menu, a select, a combo box, the suggestions of the
  // labels field), never typed again by hand.
  expect(ROW_HIGHLIGHTED).toBe(`data-highlighted:${ROW_HIGHLIGHT.split(' ').join(' data-highlighted:')}`)
  expect(LIST_ROW).toContain(ROW_HIGHLIGHTED)
  expect(LIST_ROW.split(' ')).toEqual(expect.arrayContaining(['min-h-(--row-height)', 'py-(--row-pad)', 'data-[disabled]:pointer-events-none', 'data-[disabled]:opacity-50']))
  for (const file of ['primitives/dropdown-menu.tsx', 'primitives/select.tsx', 'components/combobox.tsx', 'components/ChipsInput.tsx']) {
    expect(source(file), file).toContain('LIST_ROW')
    expect(source(file), file).toContain('LIST_CARD')
    expect(source(file), file).not.toMatch(/highlighted\]?:bg-(selected|paper)/)
  }
  expect(LIST_CARD.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'shadow-md', 'rounded-md', 'overflow-y-auto']))
  expect(source('layout/nav-list.tsx')).toContain('hover:bg-selected/60')
  // A list of things and a tree: one row under the pointer, one chosen row with its tint and its accent bar (R1), taken
  // from the shared module, never drawn again by hand.
  expect(ROW_HOVER).toBe(`hover:${ROW_HIGHLIGHT.split(' ').join(' hover:')}`)
  expect(ROW_CHOSEN.split(' ')).toEqual(expect.arrayContaining(['aria-[current=true]:bg-selected', 'aria-[current=true]:text-selected-ink', 'aria-[current=true]:before:bg-primary']))
  for (const file of ['components/item-list.tsx', 'assemblies/tree.tsx']) {
    expect(source(file), file).toMatch(/ROW_HOVER[\s\S]*ROW_CHOSEN/)
    expect(source(file), file).not.toContain('aria-[current=true]:before:bg-primary')
  }
  // The heading of a group: the one overline, wherever a group has a heading.
  expect(GROUP_LABEL).toBe('text-2xs font-semibold tracking-[0.07em] uppercase')
  for (const file of ['primitives/dropdown-menu.tsx', 'primitives/select.tsx', 'layout/sidebar.tsx', 'assemblies/Attachments.tsx']) expect(source(file), file).toContain('GROUP_LABEL')
})

test('what is on or chosen is the accent, in every control: no control keeps the ink for it', async () => {
  const { readFileSync } = await import('node:fs')
  const source = (file: string) => readFileSync(`${process.cwd()}/src/${file}`, 'utf8')
  const on: Record<string, RegExp> = {
    'primitives/checkbox.tsx': /data-\[state=checked\]:bg-primary/,
    'primitives/radio-group.tsx': /data-checked:border-primary/,
    'primitives/switch.tsx': /data-\[state=checked\]:bg-primary/,
    'primitives/slider.tsx': /bg-primary/,
    'components/calendar.tsx': /data-selected:bg-primary/,
    'assemblies/ThemeGallery.tsx': /aria-checked:border-primary/,
    'internal/markdown.tsx': /border-primary bg-primary text-primary-foreground/,
  }
  for (const [file, pattern] of Object.entries(on)) {
    expect(source(file), file).toMatch(pattern)
    expect(source(file), file).not.toMatch(/(checked|selected|data-checked)\]?:(bg|border)-ink\b/)
  }
})
