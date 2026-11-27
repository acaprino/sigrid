// The parts the toolkit's components share (one ref made of several, the field's surface, the floating list, a label
// that swaps its text, an empty part) and the slips they used to hide when each component wrote them by hand.
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createRef, useRef, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { COLORS } from '../src'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, Input, Select, Sheet, SheetContent, SheetTitle } from '../src/primitives'
import { ChipsInput } from '../src/components'
import { BaseColorChoice, ColorMatch } from '../src/assemblies'
import { useMergedRef } from '../src/lib/refs'
import { isEmptyNode } from '../src/lib/utils'
import { SwapLabel } from '../src/internal/swap-label'
import { inToasts, TOASTS_ATTR } from '../src/internal/overlay'
import { classes, settle } from './helpers'

describe('useMergedRef', () => {
  test('gives the element to a function ref and to an object ref, and takes it back from both', () => {
    const fn = vi.fn()
    const obj = createRef<HTMLDivElement>()
    const { result } = renderHook(() => useMergedRef<HTMLDivElement>(fn, obj, undefined))
    const el = document.createElement('div')
    const cleanup = result.current(el)
    expect(fn).toHaveBeenLastCalledWith(el)
    expect(obj.current).toBe(el)
    // React 19 calls the cleanup in place of the ref with null: each ref is undone its own way.
    expect(typeof cleanup).toBe('function')
    ;(cleanup as () => void)()
    expect(fn).toHaveBeenLastCalledWith(null)
    expect(obj.current).toBeNull()
  })

  test("a ref's own cleanup (React 19) is called in place of null", () => {
    const undo = vi.fn()
    const withCleanup = vi.fn(() => undo)
    const plain = vi.fn()
    const { result } = renderHook(() => useMergedRef<HTMLDivElement>(withCleanup, plain))
    const el = document.createElement('div')
    const cleanup = result.current(el) as () => void
    cleanup()
    expect(undo).toHaveBeenCalledOnce()
    expect(withCleanup).toHaveBeenCalledTimes(1)
    expect(plain).toHaveBeenLastCalledWith(null)
  })

  test('the null React 18 passes goes to every ref; the callback stays the same while the refs do', () => {
    const fn = vi.fn()
    const obj = createRef<HTMLDivElement>()
    const { result, rerender } = renderHook(() => useMergedRef<HTMLDivElement>(fn, obj))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    first(document.createElement('div'))
    expect(first(null)).toBeUndefined()
    expect(fn).toHaveBeenLastCalledWith(null)
    expect(obj.current).toBeNull()
  })
})

describe("the sheet keeps its own ref beside the caller's", () => {
  function Host({ sheetRef }: { sheetRef: React.Ref<HTMLDivElement> }) {
    const [open, setOpen] = useState(false)
    const field = useRef<HTMLInputElement>(null)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent ref={sheetRef} initialFocus={field}>
            <SheetTitle>Details</SheetTitle>
            <input ref={field} aria-label="Name" />
            <button type="button" onClick={() => setOpen(false)}>
              Done
            </button>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  test('with a ref the sheet still gives the first focus at once and gives it back when it closes', async () => {
    const sheetRef = createRef<HTMLDivElement>()
    render(<Host sheetRef={sheetRef} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    act(() => opener.focus())
    fireEvent.click(opener)
    await settle()
    // The caller's ref has the sheet, and the requested field has the focus right away (the sheet's own ref ran).
    expect(sheetRef.current).toBe(document.querySelector('[data-slot="sheet-content"]'))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    // The focus goes back to what had it before the sheet opened: the sheet's own ref kept it.
    await waitFor(() => expect(document.activeElement).toBe(opener))
    await waitFor(() => expect(sheetRef.current).toBeNull())
  })
})

describe('the field surface is one, and the fields follow Input', () => {
  test('the labels field and the select write 16px below 860px, as Input does, so iOS does not zoom', async () => {
    render(<Input aria-label="Plain" />)
    const input = classes(screen.getByRole('textbox', { name: 'Plain' }))
    expect(input).toEqual(expect.arrayContaining(['text-base', 'md:text-sm']))
    render(
      <>
        <label htmlFor="tags">Labels</label>
        <ChipsInput id="tags" value={[]} onChange={() => {}} />
      </>,
    )
    const box = classes(screen.getByRole('textbox', { name: 'Labels' }))
    expect(box).toEqual(expect.arrayContaining(['text-base', 'md:text-sm']))
    expect(box).not.toContain('text-sm')
    render(<Select aria-label="Status" options={[{ value: 'a', label: 'A' }]} value="a" onValueChange={() => {}} />)
    const trigger = classes(screen.getByRole('combobox', { name: 'Status' }))
    expect(trigger).toEqual(expect.arrayContaining(['text-base', 'md:text-sm']))
    expect(trigger).not.toContain('text-sm')
  })
})

describe('a long submenu scrolls like the menu', () => {
  test('the submenu card is as tall as the room the window leaves, and scrolls', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Open</DropdownMenuItem>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Array.from({ length: 40 }, (_, i) => (
                <DropdownMenuItem key={i}>Folder {i + 1}</DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const main = await waitFor(() => document.querySelector('[data-slot="dropdown-menu-content"]')!)
    const sub = await waitFor(() => {
      const el = document.querySelector('[data-slot="dropdown-menu-sub-content"]')
      expect(el).not.toBeNull()
      return el!
    })
    for (const card of [main, sub]) {
      expect(classes(card)).toEqual(expect.arrayContaining(['max-h-(--available-height)', 'overflow-y-auto', 'overflow-x-hidden']))
      expect(classes(card)).not.toContain('overflow-hidden')
    }
  })
})

describe('a swatch shows its selection and its focus apart', () => {
  const TEXT = {
    color: 'Theme colour',
    spot: 'Spot colour',
    own: 'Your own colour',
    none: 'None',
    kinds: { quiet: 'Quiet', balanced: 'Balanced', loud: 'Loud' },
    sample: { action: 'Save', chosen: 'Inbox', row: 'Today', due: 'Due', running: 'Running' },
  }

  test("ColorMatch's theme colours are the toolkit's radio group of swatches: focus 6px away, outside the 2px selection ring", async () => {
    const onColor = vi.fn()
    render(<ColorMatch colors={[{ color: '#2563eb', label: 'Blue' }, { color: '#0d9488', label: 'Teal' }]} color="#0d9488" spot="balanced" scheme="light" onColor={onColor} onSpot={() => {}} text={TEXT} />)
    const teal = screen.getByRole('radio', { name: 'Teal' })
    const tealControl = teal.closest('label')!.querySelector('[data-slot="radio-group-item"]')!
    expect(classes(tealControl)).toEqual(expect.arrayContaining(['data-[focus-visible]' + ':outline-offset-6', 'data-[state=checked]' + ':ring-offset-2']))
    expect(classes(tealControl)).not.toContain('data-[focus-visible]' + ':outline-offset-2')
    // One Tab stop, on the chosen colour; the arrows move and choose, as in every radio group.
    expect(teal.tabIndex).toBe(0)
    expect(screen.getByRole('radio', { name: 'Blue' }).tabIndex).toBe(-1)
    fireEvent.click(screen.getByRole('radio', { name: 'Blue' }))
    await settle()
    expect(onColor).toHaveBeenLastCalledWith('#2563eb')
    // The colour of one's own: its field's focus also sits outside the ring.
    const own = screen.getByLabelText('Theme colour: Your own colour').closest('label')!
    expect(classes(own)).toContain('has-focus-visible:outline-offset-6')
    expect(classes(own)).not.toContain('has-focus-visible:outline-offset-2')
  })

  test("a theme colour of one's own leaves no swatch chosen, and the first swatch is the Tab stop", () => {
    render(<ColorMatch colors={[{ color: '#2563eb', label: 'Blue' }, { color: '#0d9488', label: 'Teal' }]} color="#aa3300" spot={null} scheme="light" onColor={() => {}} onSpot={() => {}} text={TEXT} />)
    expect(screen.getByRole('radio', { name: 'Blue' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radio', { name: 'Teal' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radio', { name: 'Blue' }).tabIndex).toBe(0)
  })

  test('the base colour swatches: the same selection ring, and the focus outside it', () => {
    render(<BaseColorChoice palette={{ seed: COLORS[2]!, combo: 'clean' }} seed={COLORS[2]!} onPalette={() => {}} text={{ label: 'Base colour', hint: '', theme: 'Theme', picker: 'Any colour' }} />)
    const swatches = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-label'))
    expect(swatches.length).toBeGreaterThan(1)
    for (const s of swatches) {
      expect(classes(s)).toContain('focus-visible:outline-offset-6')
      expect(classes(s)).not.toContain('focus-visible:outline-offset-2')
    }
    const chosen = swatches.find((s) => s.getAttribute('aria-checked') === 'true')!
    expect(classes(chosen)).toEqual(expect.arrayContaining(['ring-2', 'ring-ink', 'ring-offset-2']))
  })
})

describe('small shared parts', () => {
  test('isEmptyNode: absent, false and an empty text are empty; zero, a text and true are not', () => {
    for (const empty of [undefined, null, false, '']) expect(isEmptyNode(empty), String(empty)).toBe(true)
    for (const full of [0, 'a', true, <span key="x" />]) expect(isEmptyNode(full), String(full)).toBe(false)
  })

  test('SwapLabel: both texts in one cell, the one not shown kept invisible and out of the reading', () => {
    const { rerender } = render(<SwapLabel slot="label" first="Copy" second="Copied" showSecond={false} align="start" />)
    const cell = document.querySelector('[data-slot="label"]')!
    expect(classes(cell)).toContain('grid')
    const [a, b] = Array.from(cell.children)
    expect(classes(a!)).not.toContain('invisible')
    expect(classes(b!)).toEqual(expect.arrayContaining(['invisible', 'col-start-1', 'row-start-1', 'justify-start']))
    expect(b!.getAttribute('aria-hidden')).toBe('true')
    rerender(<SwapLabel slot="label" first="Copy" second="Copied" showSecond align="start" />)
    expect(classes(a!)).toContain('invisible')
    expect(a!.getAttribute('aria-hidden')).toBe('true')
    expect(b!.hasAttribute('aria-hidden')).toBe(false)
  })

  test('inToasts: a press inside the stack of notices, and nothing else', () => {
    const stack = document.createElement('div')
    stack.setAttribute(TOASTS_ATTR, '')
    const inner = document.createElement('button')
    stack.append(inner)
    document.body.append(stack)
    expect(inToasts(inner)).toBe(true)
    expect(inToasts(document.body)).toBe(false)
    expect(inToasts(null)).toBe(false)
    expect(inToasts(undefined)).toBe(false)
    stack.remove()
  })
})
