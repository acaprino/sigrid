// A surface for pictures the app pushes (`FrameSurface`): what it draws and when, its fit, its size told once and then when it settles,
// and the input it forwards with the point in the box and in the picture.
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FrameSurface, frameRect, type FrameSurfaceHandle } from '../src/components'

type Call = [picture: unknown, x: number, y: number, width: number, height: number]
let calls: Call[]
let cleared: number
let closed: number[]
let resize: (width: number, height: number) => void
let decoders: { resolve: (bitmap: unknown) => void; reject: (error: unknown) => void }[]

const bitmap = (id: number, width = 200, height = 100) => ({ id, width, height, close: () => { closed.push(id) } })

beforeEach(() => {
  calls = []
  cleared = 0
  closed = []
  decoders = []
  const observers: ResizeObserverCallback[] = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { observers.push(callback) }
    observe() {}
    disconnect() {}
  })
  resize = (width, height) => act(() => observers.forEach((callback) => callback([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver)))
  vi.stubGlobal('createImageBitmap', () => new Promise((resolve, reject) => { decoders.push({ resolve, reject }) }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    clearRect: () => { cleared += 1 },
    drawImage: (...args: Call) => { calls.push(args) },
  })) as never)
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

const surface = () => screen.getByRole('application', { name: 'Web page' }) as HTMLCanvasElement
function mount(props: Partial<React.ComponentProps<typeof FrameSurface>> = {}) {
  const ref = React.createRef<FrameSurfaceHandle>()
  render(<FrameSurface ref={ref} label="Web page" {...props} />)
  return ref
}
const box = (canvas: HTMLCanvasElement, width: number, height: number) => { canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width, height, right: 10 + width, bottom: 20 + height, x: 10, y: 20, toJSON: () => ({}) }) }

test('the fit places a picture in the box: stretched, or whole and centred', () => {
  expect(frameRect('fill', { width: 400, height: 300 }, { width: 200, height: 100 })).toEqual({ x: 0, y: 0, width: 400, height: 300 })
  expect(frameRect('contain', { width: 400, height: 300 }, { width: 200, height: 100 })).toEqual({ x: 0, y: 50, width: 400, height: 200 })
  expect(frameRect('contain', { width: 400, height: 100 }, { width: 200, height: 100 })).toEqual({ x: 100, y: 0, width: 200, height: 100 })
})

test('it is one tab stop with the name it is given', () => {
  mount()
  expect(surface().tabIndex).toBe(0)
})

test('the canvas follows the box at the device resolution and a picture is drawn over all of it', async () => {
  vi.stubGlobal('devicePixelRatio', 2)
  const ref = mount()
  resize(300, 150)
  expect(surface().width).toBe(600)
  expect(surface().height).toBe(300)
  const drawing = ref.current!.draw(new Uint8Array([1, 2, 3]))
  const one = bitmap(1)
  await act(async () => { decoders[0]!.resolve(one); await drawing })
  expect(calls.at(-1)).toEqual([one, 0, 0, 600, 300])
  // A new size draws the same picture again at once, until the app sends another.
  resize(100, 50)
  expect(calls.at(-1)).toEqual([one, 0, 0, 200, 100])
})

test('a picture that is replaced is closed, a broken one is skipped, and one that finishes after a newer one is dropped', async () => {
  const ref = mount()
  resize(200, 100)
  const first = ref.current!.draw(new Uint8Array([1]))
  const second = ref.current!.draw(new Uint8Array([2]))
  const third = ref.current!.draw(new Uint8Array([3]))
  // The second and the third are decoded first: the third is drawn, the second is too late, and the first is older still.
  await act(async () => { decoders[2]!.resolve(bitmap(3)); await third })
  await act(async () => { decoders[1]!.resolve(bitmap(2)); expect(await second).toBe(false) })
  await act(async () => { decoders[0]!.reject(new Error('broken')); expect(await first).toBe(false) })
  expect(closed).toEqual([2])
  expect((calls.at(-1)![0] as { id: number }).id).toBe(3)
  const fourth = ref.current!.draw(new Blob([new Uint8Array([4])]))
  await act(async () => { decoders[3]!.resolve(bitmap(4)); expect(await fourth).toBe(true) })
  expect(closed).toEqual([2, 3])
})

test('a stream that decodes slower than it arrives still shows the latest picture that finishes', async () => {
  const ref = mount()
  resize(200, 100)
  const a = ref.current!.draw(new Uint8Array([1]))
  const b = ref.current!.draw(new Uint8Array([2]))
  await act(async () => { decoders[0]!.resolve(bitmap(1)); expect(await a).toBe(true) })
  await act(async () => { decoders[1]!.resolve(bitmap(2)); expect(await b).toBe(true) })
  expect((calls.at(-1)![0] as { id: number }).id).toBe(2)
})

test('a bitmap is taken as it is, and clear takes the picture away', async () => {
  const ref = mount()
  resize(200, 100)
  const own = bitmap(9)
  expect(await ref.current!.draw(own as unknown as ImageBitmap)).toBe(true)
  expect(decoders).toHaveLength(0)
  ref.current!.clear()
  expect(closed).toEqual([9])
  const before = calls.length
  resize(210, 100)
  expect(calls.length).toBe(before)
})

test('contain leaves a letterbox: the points in it are in no picture', async () => {
  const onPointer = vi.fn()
  const ref = mount({ fit: 'contain', onPointer })
  resize(400, 300)
  box(surface(), 400, 300)
  await act(async () => { const drawing = ref.current!.draw(new Uint8Array([1])); decoders[0]!.resolve(bitmap(1, 200, 100)); await drawing })
  fireEvent.pointerMove(surface(), { clientX: 10 + 100, clientY: 20 + 150 })
  expect(onPointer.mock.calls[0]![0]).toMatchObject({ kind: 'move', x: 100, y: 150, frame: { x: 50, y: 50 } })
  fireEvent.pointerMove(surface(), { clientX: 10 + 100, clientY: 20 + 10 })
  expect(onPointer.mock.calls[1]![0].frame).toBeNull()
})

test('the size is told at once the first time and after the box holds still afterwards', () => {
  vi.useFakeTimers()
  vi.stubGlobal('devicePixelRatio', 1)
  const onSize = vi.fn()
  mount({ onSize, settleMs: 100 })
  resize(0, 0)
  expect(onSize).not.toHaveBeenCalled()
  resize(300, 200)
  expect(onSize).toHaveBeenCalledWith({ width: 300, height: 200, dpr: 1 })
  resize(310, 200)
  resize(320, 200)
  resize(330, 200)
  expect(onSize).toHaveBeenCalledTimes(1)
  act(() => { vi.advanceTimersByTime(100) })
  expect(onSize).toHaveBeenCalledTimes(2)
  expect(onSize).toHaveBeenLastCalledWith({ width: 330, height: 200, dpr: 1 })
})

test('a press takes the focus and captures the pointer; the buttons, the count and the keys held are told', () => {
  const onPointer = vi.fn()
  mount({ onPointer })
  box(surface(), 400, 300)
  const down = createEvent.pointerDown(surface(), { clientX: 50, clientY: 70, button: 2, buttons: 2, detail: 2, shiftKey: true })
  fireEvent(surface(), down)
  expect(down.defaultPrevented).toBe(true)
  expect(document.activeElement).toBe(surface())
  expect(surface().setPointerCapture).toHaveBeenCalled()
  expect(onPointer).toHaveBeenCalledWith({ kind: 'down', x: 40, y: 50, frame: null, button: 2, buttons: 2, detail: 2, altKey: false, ctrlKey: false, metaKey: false, shiftKey: true })
  const menu = createEvent.contextMenu(surface())
  fireEvent(surface(), menu)
  expect(menu.defaultPrevented).toBe(true)
})

test('the wheel is stopped and told; without a listener the page keeps it', () => {
  const onWheel = vi.fn()
  const { rerender } = render(<FrameSurface label="Web page" onWheel={onWheel} />)
  box(surface(), 400, 300)
  const wheel = createEvent.wheel(surface(), { clientX: 30, clientY: 40, deltaY: 120, deltaMode: 0 })
  fireEvent(surface(), wheel)
  expect(wheel.defaultPrevented).toBe(true)
  expect(onWheel).toHaveBeenCalledWith(expect.objectContaining({ x: 20, y: 20, deltaY: 120, deltaX: 0, deltaMode: 0 }))
  rerender(<FrameSurface label="Web page" />)
  const kept = createEvent.wheel(surface(), { deltaY: 1 })
  fireEvent(surface(), kept)
  expect(kept.defaultPrevented).toBe(false)
})

test('keys are told and stopped, except the ones the page keeps; paste gives its text', () => {
  const onKey = vi.fn()
  const onPaste = vi.fn()
  mount({ onKey, onPaste, appKeys: (event) => event.ctrlKey && event.key === 'Tab' })
  const a = createEvent.keyDown(surface(), { key: 'a', code: 'KeyA', keyCode: 65 })
  fireEvent(surface(), a)
  expect(a.defaultPrevented).toBe(true)
  expect(onKey).toHaveBeenCalledWith({ kind: 'down', key: 'a', code: 'KeyA', keyCode: 65, repeat: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false })
  const tab = createEvent.keyDown(surface(), { key: 'Tab', ctrlKey: true })
  fireEvent(surface(), tab)
  expect(tab.defaultPrevented).toBe(false)
  expect(onKey).toHaveBeenCalledTimes(1)
  fireEvent.keyUp(surface(), { key: 'a', code: 'KeyA', keyCode: 65 })
  expect(onKey).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'up', key: 'a' }))
  const paste = createEvent.paste(surface(), { clipboardData: { getData: () => 'hello' } })
  fireEvent(surface(), paste)
  expect(paste.defaultPrevented).toBe(true)
  expect(onPaste).toHaveBeenCalledWith('hello')
})

test('with no listener it is a picture: nothing is stopped', () => {
  mount()
  const down = createEvent.pointerDown(surface())
  fireEvent(surface(), down)
  expect(down.defaultPrevented).toBe(false)
  const key = createEvent.keyDown(surface(), { key: 'a' })
  fireEvent(surface(), key)
  expect(key.defaultPrevented).toBe(false)
})
