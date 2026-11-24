import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { FileDrop } from '../src/components'
import { classes, dt, settle } from './helpers'

// `FileDrop` (src/components/file-drop.tsx): a file dropped on the zone or chosen with the picker, the checks of type,
// size and count, the words of the app, the busy and the error states.

// `settle(40)`: Ark's FileUpload judges the files and opens the picker in a microtask and an animation frame.

const zone = () => document.querySelector<HTMLElement>('[data-slot="file-drop"]')!
const picker = () => zone().querySelector<HTMLInputElement>('input[type="file"]')!
const trigger = () => screen.getByRole('button', { name: 'Drop a file here, or choose one' })
const choose = async (files: File[]) => {
  fireEvent.input(picker(), { target: { files } })
  await settle(40)
}
function sized(name: string, size: number, type = ''): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const ACCEPT = { 'application/json': ['.json'], 'text/csv': ['.csv'] }
const LABEL = 'Drop a file here, or choose one'

describe('FileDrop', () => {
  test('a real button named by the label and described by the hint; the input stays out of the tab order and the tree', async () => {
    render(<FileDrop label={LABEL} hint="JSON or CSV, up to 5 MB" onFiles={() => {}} accept={ACCEPT} />)
    await settle(40)
    const button = trigger()
    expect(button.tagName).toBe('BUTTON')
    const hint = document.getElementById(button.getAttribute('aria-describedby') ?? '')
    expect(hint?.textContent).toBe('JSON or CSV, up to 5 MB')
    expect(picker().tabIndex).toBe(-1)
    expect(picker().getAttribute('aria-hidden')).toBe('true')
    expect(picker().getAttribute('accept')).toBe('application/json,.json,text/csv,.csv')
    expect(button.contains(picker())).toBe(false)
    // A click opens the picker: dragging is never the only way (WCAG 2.5.7).
    const click = vi.spyOn(picker(), 'click')
    fireEvent.click(button)
    await settle(40)
    expect(click).toHaveBeenCalledTimes(1)
  })

  test('a chosen file goes to onFiles, and the same file can be chosen again', async () => {
    const onFiles = vi.fn()
    render(<FileDrop label={LABEL} onFiles={onFiles} accept={ACCEPT} maxFileBytes={100} />)
    await settle(40)
    const f = sized('backup.json', 10, 'application/json')
    await choose([f])
    await choose([f])
    expect(onFiles).toHaveBeenCalledTimes(2)
    expect(onFiles).toHaveBeenLastCalledWith([f])
  })

  test('a drop goes through the same checks: type (by extension too), size and count, each refusal with its reason', async () => {
    const onFiles = vi.fn()
    const onRefuse = vi.fn()
    render(<FileDrop label={LABEL} onFiles={onFiles} onRefuse={onRefuse} accept={ACCEPT} maxFileBytes={100} />)
    await settle(40)
    // Windows can type a CSV as an Excel file: the extension is enough.
    const csv = sized('export.csv', 10, 'application/vnd.ms-excel')
    fireEvent.drop(zone(), { dataTransfer: dt({}, [csv]) })
    await settle(40)
    expect(onFiles).toHaveBeenLastCalledWith([csv])

    const photo = sized('photo.png', 10, 'image/png')
    fireEvent.drop(zone(), { dataTransfer: dt({}, [photo]) })
    await settle(40)
    expect(onRefuse).toHaveBeenLastCalledWith([{ file: photo, reason: 'type' }])

    const big = sized('big.json', 101, 'application/json')
    fireEvent.drop(zone(), { dataTransfer: dt({}, [big]) })
    await settle(40)
    expect(onRefuse).toHaveBeenLastCalledWith([{ file: big, reason: 'size' }])

    const two = [sized('a.json', 1, 'application/json'), sized('b.json', 1, 'application/json')]
    fireEvent.drop(zone(), { dataTransfer: dt({}, two) })
    await settle(40)
    expect(onRefuse.mock.lastCall?.[0]).toEqual(two.map((file) => ({ file, reason: 'count' })))

    // Text is not a file: refused, without a file.
    fireEvent.drop(zone(), { dataTransfer: dt({ 'text/plain': 'a note' }) })
    expect(onRefuse).toHaveBeenLastCalledWith([{ file: null, reason: 'type' }])
    expect(onFiles).toHaveBeenCalledTimes(1)
  })

  test('while a file is dragged over it the zone says so and is marked; its name does not change; no motion', () => {
    render(<FileDrop label={LABEL} dropLabel="Drop it here" onFiles={() => {}} />)
    expect(zone().getAttribute('data-drop-active')).toBe('false')
    fireEvent.dragOver(zone(), { dataTransfer: dt({}, [sized('a.csv', 1)]) })
    expect(zone().getAttribute('data-drop-active')).toBe('true')
    // The dashed edge turns solid ink, not the accent (R2): the accent's ring is the focus's (R8).
    expect(classes(zone())).toEqual(expect.arrayContaining(['border-solid', 'border-ink']))
    expect(classes(zone())).not.toContain('border-ring')
    expect(screen.getByText('Drop it here')).toBeTruthy()
    expect(trigger()).toBeTruthy()
    for (const el of [zone(), trigger()]) expect(el.getAttribute('class') ?? '').not.toMatch(/transition|animate-|scale|duration/)
    fireEvent.dragLeave(zone())
    expect(zone().getAttribute('data-drop-active')).toBe('false')
  })

  test('busy: the line says what is happening and is announced; the button keeps focus but opens nothing and takes no drop', async () => {
    const onFiles = vi.fn()
    render(<FileDrop label={LABEL} busy="Reading backup.csv…" onFiles={onFiles} />)
    await settle(40)
    const button = trigger()
    button.focus()
    expect(document.activeElement).toBe(button)
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Reading backup.csv…')
    const click = vi.spyOn(picker(), 'click')
    fireEvent.click(button)
    await settle(40)
    expect(click).not.toHaveBeenCalled()
    fireEvent.drop(zone(), { dataTransfer: dt({}, [sized('a.csv', 1)]) })
    await settle(40)
    expect(onFiles).not.toHaveBeenCalled()
  })

  test('an error sits under the zone, is announced and describes the button; the border turns destructive', async () => {
    render(<FileDrop label={LABEL} hint="CSV" error="This is not a CSV file." onFiles={() => {}} />)
    await settle(40)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('This is not a CSV file.')
    expect(trigger().getAttribute('aria-describedby')?.split(' ')).toContain(alert.id)
    expect(zone().getAttribute('data-invalid')).toBe('true')
    expect(zone().className).toContain('border-destructive')
  })
})
