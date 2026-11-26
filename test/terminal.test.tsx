// `Terminal` (the `./terminal` entry, on xterm.js). Here: it is made in the page, it fits its box and says its size, it
// writes what it is given and says what is typed, its colours follow the page's tokens when the look changes, the app's
// keys are not taken, links open through the app, and the part leaves nothing behind when it goes.
import { act, render } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal, type TerminalHandle } from '../src/terminal'
import { classes, flush } from './helpers'

// xterm probes for a canvas when it is loaded, and jsdom has none (it says so on the console): the answer is given before it is.
vi.hoisted(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
})

/** jsdom has no layout: the box of the terminal has the size a test gives it. */
function boxSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height)
}

beforeEach(() => {
  // xterm reads the media of the window.
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null }),
    })
  }
})
afterEach(() => {
  vi.restoreAllMocks()
  document.getElementById('sigrid-xterm')?.remove()
})

describe('Terminal', () => {
  test('is made in the page, named, with xterm\'s own stylesheet put in the document by the part', async () => {
    render(<Terminal aria-label="Shell of the project" />)
    await flush()
    expect(document.querySelector('[data-slot="terminal"] .xterm')).not.toBeNull()
    expect(document.querySelector('textarea.xterm-helper-textarea')?.getAttribute('aria-label')).toBe('Shell of the project')
    expect(document.getElementById('sigrid-xterm')).not.toBeNull()
  })

  test('fills the box it is in, as tall and as wide: it has no height of its own, and 0 high in a pane of a Workspace without it', async () => {
    render(<Terminal className="rounded-md" />)
    await flush()
    const terminal = document.querySelector('[data-slot="terminal"]') as HTMLElement
    // `size-full` is the height and the width of the box it is in; `min-h-0` and `min-w-0` let a box smaller than the screen it holds shrink it.
    expect(classes(terminal)).toEqual(expect.arrayContaining(['size-full', 'min-h-0', 'min-w-0', 'relative', 'rounded-md']))
    // The screen is laid in it from corner to corner, so the fit addon reads the box's size and not the screen's own.
    expect(classes(document.querySelector('[data-slot="terminal-screen"]') as HTMLElement)).toEqual(expect.arrayContaining(['absolute', 'inset-0']))
  })

  test('is called «Terminal» by default, in the words of the app', async () => {
    render(<Terminal />)
    await flush()
    expect(document.querySelector('textarea.xterm-helper-textarea')?.getAttribute('aria-label')).toBe('Terminal')
  })

  test('says its size at the first fit and again when it changes, never twice for the same size', async () => {
    // jsdom measures no character, so the fit addon is told what the box would hold.
    let holds = { cols: 100, rows: 30 }
    vi.spyOn(FitAddon.prototype, 'proposeDimensions').mockImplementation(() => holds)
    const onResize = vi.fn()
    boxSize(800, 400)
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} onResize={onResize} />)
    await flush()
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenLastCalledWith(100, 30)
    expect(ref.current?.size).toEqual({ cols: 100, rows: 30 })
    // The same box is the same size: nothing is said again.
    act(() => { ref.current?.fit() })
    expect(onResize).toHaveBeenCalledTimes(1)
    // Another box is another size.
    holds = { cols: 60, rows: 12 }
    let size: ReturnType<TerminalHandle['fit']> = null
    act(() => { size = ref.current?.fit() ?? null })
    expect(size).toEqual({ cols: 60, rows: 12 })
    expect(onResize).toHaveBeenCalledTimes(2)
    expect(onResize).toHaveBeenLastCalledWith(60, 12)
  })

  test('fits again when its box changes size (a ResizeObserver), once for a burst', async () => {
    const callbacks: (() => void)[] = []
    class Observer {
      constructor(callback: () => void) { callbacks.push(callback) }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', Observer)
    let holds = { cols: 90, rows: 20 }
    vi.spyOn(FitAddon.prototype, 'proposeDimensions').mockImplementation(() => holds)
    boxSize(700, 300)
    const onResize = vi.fn()
    render(<Terminal onResize={onResize} />)
    await flush()
    expect(onResize).toHaveBeenLastCalledWith(90, 20)
    holds = { cols: 50, rows: 10 }
    await act(async () => {
      for (const callback of callbacks) { callback(); callback() }
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
    expect(onResize).toHaveBeenCalledTimes(2)
    expect(onResize).toHaveBeenLastCalledWith(50, 10)
    vi.unstubAllGlobals()
  })

  test('fits nothing while its box has no size (hidden): no size is said', async () => {
    const onResize = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} onResize={onResize} />)
    await flush()
    expect(ref.current?.fit()).toBeNull()
    expect(onResize).not.toHaveBeenCalled()
  })

  test('writes what it is given and gives the lines back', async () => {
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} />)
    await flush()
    const done = vi.fn()
    await act(async () => {
      ref.current?.write('first line\r\nsecond line\r\n', done)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(done).toHaveBeenCalledTimes(1)
    const buffer = ref.current!.buffer
    expect(buffer.line(0)).toBe('first line')
    expect(buffer.line(1)).toBe('second line')
    expect(buffer.line(999)).toBe('')
    expect(buffer.length).toBeGreaterThan(2)
  })

  test('says what is typed and what is pasted (onData), and nothing once it is read-only', async () => {
    const onData = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    const view = render(<Terminal ref={ref} onData={onData} />)
    await flush()
    act(() => { ref.current?.paste('ls -la') })
    expect(onData).toHaveBeenCalledWith('ls -la')
    onData.mockClear()
    view.rerender(<Terminal ref={ref} onData={onData} readOnly />)
    await flush()
    act(() => { ref.current?.paste('rm -rf') })
    expect(onData).not.toHaveBeenCalled()
    expect(document.querySelector('[data-slot="terminal"]')?.hasAttribute('data-readonly')).toBe(true)
  })

  test('says the lines changed when output is parsed, so a strip can follow them', async () => {
    const onBufferChange = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} onBufferChange={onBufferChange} />)
    await flush()
    await act(async () => {
      ref.current?.write('one\r\n')
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(onBufferChange).toHaveBeenCalled()
    expect(onBufferChange.mock.calls.at(-1)![0].line(0)).toBe('one')
  })

  test('the keys of the app are not taken: the terminal leaves them alone, and keeps the rest (the paste keys go to the browser)', async () => {
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} appKeys={(event) => event.ctrlKey && event.shiftKey && event.key === 'T'} />)
    await flush()
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea.xterm-helper-textarea')!
    const bubbled = vi.fn()
    document.addEventListener('keydown', bubbled)
    const press = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      textarea.dispatchEvent(event)
      return event
    }
    const app = press({ key: 'T', ctrlKey: true, shiftKey: true })
    expect(app.defaultPrevented).toBe(false)
    expect(bubbled).toHaveBeenCalledWith(app)
    // The terminal's own keys, a letter and an arrow: the program's, and stopped at the terminal.
    bubbled.mockClear()
    press({ key: 'k', keyCode: 75 })
    press({ key: 'ArrowUp', keyCode: 38 })
    expect(bubbled).not.toHaveBeenCalled()
    // A paste is the browser's.
    expect(press({ key: 'v', ctrlKey: true }).defaultPrevented).toBe(false)
    expect(press({ key: 'Insert', shiftKey: true }).defaultPrevented).toBe(false)
    document.removeEventListener('keydown', bubbled)
  })

  test('reads its colours again when the page\'s look changes, and its font from the token', async () => {
    document.documentElement.style.setProperty('--color-paper', '#101010')
    document.documentElement.style.setProperty('--font-mono', '"Fira Code", monospace')
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} />)
    await flush()
    expect(ref.current?.terminal?.options.theme?.background).toBe('#101010')
    expect(ref.current?.terminal?.options.fontFamily).toBe('"Fira Code", monospace')
    document.documentElement.style.setProperty('--color-paper', '#f4f4f4')
    document.documentElement.setAttribute('data-scheme', 'light')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) })
    expect(ref.current?.terminal?.options.theme?.background).toBe('#f4f4f4')
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('data-scheme')
  })

  test('the font is the token alone without `fontFamily`, and the family asked for goes before it', async () => {
    document.documentElement.style.setProperty('--font-mono', 'Menlo, monospace')
    const ref = React.createRef<TerminalHandle>()
    const view = render(<Terminal ref={ref} />)
    await flush()
    expect(ref.current?.terminal?.options.fontFamily).toBe('Menlo, monospace')
    view.rerender(<Terminal ref={ref} fontFamily="" />)
    await flush()
    expect(ref.current?.terminal?.options.fontFamily).toBe('Menlo, monospace')
    view.unmount()
    render(<Terminal ref={ref} fontFamily={'Cascadia Mono, "Fira Code"'} />)
    await flush()
    expect(ref.current?.terminal?.options.fontFamily).toBe('"Cascadia Mono", "Fira Code", Menlo, monospace')
    document.documentElement.removeAttribute('style')
  })

  test('a font that changes while the terminal lives: the same terminal, its lines kept, fitted again, and the new size said', async () => {
    let holds = { cols: 100, rows: 30 }
    vi.spyOn(FitAddon.prototype, 'proposeDimensions').mockImplementation(() => holds)
    boxSize(800, 400)
    const onResize = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    const view = render(<Terminal ref={ref} onResize={onResize} />)
    await flush()
    const x = ref.current!.terminal!
    await act(async () => {
      ref.current?.write('kept line\r\n$ ')
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const cursor = { x: x.buffer.active.cursorX, y: x.buffer.active.cursorY }
    expect(onResize).toHaveBeenCalledTimes(1)
    // A wider font: the box holds fewer cells.
    holds = { cols: 80, rows: 24 }
    view.rerender(<Terminal ref={ref} onResize={onResize} fontFamily="Courier New" />)
    await flush()
    expect(ref.current?.terminal).toBe(x)
    expect(x.options.fontFamily).toMatch(/^"Courier New", /)
    expect(onResize).toHaveBeenCalledTimes(2)
    expect(onResize).toHaveBeenLastCalledWith(80, 24)
    expect(ref.current?.buffer.line(0)).toBe('kept line')
    expect({ x: x.buffer.active.cursorX, y: x.buffer.active.cursorY }).toEqual(cursor)
    // Back to the toolkit's own font.
    holds = { cols: 100, rows: 30 }
    view.rerender(<Terminal ref={ref} onResize={onResize} />)
    await flush()
    expect(x.options.fontFamily).not.toContain('Courier New')
    expect(onResize).toHaveBeenLastCalledWith(100, 30)
  })

  test('the font asked for stays when the page\'s look changes, before the new token', async () => {
    document.documentElement.style.setProperty('--font-mono', 'Menlo, monospace')
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} fontFamily="Consolas" />)
    await flush()
    document.documentElement.style.setProperty('--font-mono', 'Monaco, monospace')
    document.documentElement.setAttribute('data-scheme', 'light')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) })
    expect(ref.current?.terminal?.options.fontFamily).toBe('"Consolas", Monaco, monospace')
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('data-scheme')
  })

  test('a page without `document.fonts` (jsdom) draws the font and waits for nothing', async () => {
    expect((document as { fonts?: unknown }).fonts).toBeUndefined()
    const ref = React.createRef<TerminalHandle>()
    const view = render(<Terminal ref={ref} fontFamily="Cascadia Mono" />)
    await flush()
    expect(() => view.rerender(<Terminal ref={ref} fontFamily="Consolas" />)).not.toThrow()
    await flush()
    expect(ref.current?.terminal?.options.fontFamily).toMatch(/^"Consolas", /)
  })

  describe('a face that is not ready', () => {
    /** The page's fonts as a test has them: nothing is ready until the test says so. */
    function fonts(check: (font: string) => boolean) {
      const waits: { font: string; ready(): void }[] = []
      const set = {
        check: vi.fn(check),
        load: vi.fn((font: string) => new Promise<unknown[]>((resolve) => { waits.push({ font, ready: () => resolve([]) }) })),
      }
      Object.defineProperty(document, 'fonts', { configurable: true, value: set })
      return { set, waits }
    }
    afterEach(() => { delete (document as { fonts?: unknown }).fonts })

    test('is waited for, and the cells are measured and the box fitted again once it is', async () => {
      const { set, waits } = fonts(() => false)
      let holds = { cols: 100, rows: 30 }
      vi.spyOn(FitAddon.prototype, 'proposeDimensions').mockImplementation(() => holds)
      boxSize(800, 400)
      const onResize = vi.fn()
      const ref = React.createRef<TerminalHandle>()
      render(<Terminal ref={ref} onResize={onResize} fontFamily="Web Mono" fontSize={15} />)
      await flush()
      expect(set.load).toHaveBeenCalledTimes(1)
      expect(waits[0]!.font).toMatch(/^15px "Web Mono", /)
      expect(onResize).toHaveBeenCalledTimes(1)
      const x = ref.current!.terminal!
      const measured: string[] = []
      x.onResize(() => measured.push(`${x.cols}x${x.rows}`))
      const family = x.options.fontFamily
      // The face arrives, and its cells are narrower than those of the font drawn while it was awaited.
      holds = { cols: 120, rows: 30 }
      await act(async () => {
        waits[0]!.ready()
        await Promise.resolve()
      })
      expect(x.options.fontFamily).toBe(family)
      expect(measured).toEqual(['120x30'])
      expect(onResize).toHaveBeenCalledTimes(2)
      expect(onResize).toHaveBeenLastCalledWith(120, 30)
    })

    test('a font that is ready is not waited for, and a wait for a font that was changed since does nothing', async () => {
      const { set, waits } = fonts((font) => !font.includes('Web Mono'))
      const ref = React.createRef<TerminalHandle>()
      const view = render(<Terminal ref={ref} />)
      await flush()
      expect(set.check).toHaveBeenCalled()
      expect(set.load).not.toHaveBeenCalled()
      view.rerender(<Terminal ref={ref} fontFamily="Web Mono" />)
      await flush()
      expect(set.load).toHaveBeenCalledTimes(1)
      view.rerender(<Terminal ref={ref} fontFamily="Consolas" />)
      await flush()
      const x = ref.current!.terminal!
      const set_ = vi.fn()
      x.onResize(set_)
      await act(async () => {
        waits[0]!.ready()
        await Promise.resolve()
      })
      expect(x.options.fontFamily).toMatch(/^"Consolas", /)
      expect(set_).not.toHaveBeenCalled()
      // The terminal is gone before the face is ready: nothing is touched.
      view.rerender(<Terminal ref={ref} fontFamily="Web Mono" />)
      await flush()
      view.unmount()
      await act(async () => {
        waits.at(-1)!.ready()
        await Promise.resolve()
      })
    })

    test('a list the browser refuses does not throw', async () => {
      fonts(() => { throw new SyntaxError('not a font') })
      const ref = React.createRef<TerminalHandle>()
      expect(() => render(<Terminal ref={ref} fontFamily="Consolas" />)).not.toThrow()
      await flush()
      expect(ref.current?.terminal?.options.fontFamily).toMatch(/^"Consolas", /)
    })
  })

  test('opens a link through the app: an address of the text, and the hyperlink the program wrote', async () => {
    const onLinkOpen = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} onLinkOpen={onLinkOpen} />)
    await flush()
    const x = ref.current!.terminal!
    await act(async () => {
      ref.current?.write('see https://example.com/docs, then go\r\n')
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    // The provider xterm was given asks for the links of a line, 1-based.
    const providers = (x as unknown as { _core: { _linkProviderService: { linkProviders: { provideLinks(y: number, done: (links: { text: string; activate(e: MouseEvent, t: string): void }[] | undefined) => void): void }[] } } })._core._linkProviderService.linkProviders
    let found: { text: string; activate(e: MouseEvent, t: string): void }[] | undefined
    providers.at(-1)!.provideLinks(1, (links) => { found = links })
    expect(found?.map((link) => link.text)).toEqual(['https://example.com/docs'])
    const click = new MouseEvent('click', { button: 0 })
    found![0]!.activate(click, found![0]!.text)
    expect(onLinkOpen).toHaveBeenCalledWith('https://example.com/docs', click)
    // The hyperlink a program writes (OSC 8) comes to the same place, whatever its scheme.
    const handler = x.options.linkHandler!
    handler.activate(click, 'file:///tmp/report.html', undefined as never)
    expect(onLinkOpen).toHaveBeenLastCalledWith('file:///tmp/report.html', click)
    expect(handler.allowNonHttpProtocols).toBe(true)
  })

  test('takes the finder of links the app gives', async () => {
    const onLinkOpen = vi.fn()
    const ref = React.createRef<TerminalHandle>()
    render(<Terminal ref={ref} onLinkOpen={onLinkOpen} linkFinder={(line) => [...line.matchAll(/#\d+/g)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, target: `issue:${m[0].slice(1)}` }))} />)
    await flush()
    await act(async () => {
      ref.current?.write('fixes #42\r\n')
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    const providers = (ref.current!.terminal as unknown as { _core: { _linkProviderService: { linkProviders: { provideLinks(y: number, done: (links: { text: string }[] | undefined) => void): void }[] } } })._core._linkProviderService.linkProviders
    let found: { text: string }[] | undefined
    providers.at(-1)!.provideLinks(1, (links) => { found = links })
    expect(found?.map((link) => link.text)).toEqual(['issue:42'])
  })

  test('leaves nothing behind: its terminal is disposed and its observers stop', async () => {
    const ref = React.createRef<TerminalHandle>()
    const view = render(<Terminal ref={ref} />)
    await flush()
    const x = ref.current!.terminal!
    const dispose = vi.spyOn(x, 'dispose')
    view.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.xterm')).toBeNull()
    expect(ref.current?.terminal ?? null).toBeNull()
  })

  test('is the same under StrictMode: one terminal in the page', async () => {
    render(<React.StrictMode><Terminal /></React.StrictMode>)
    await flush()
    expect(document.querySelectorAll('.xterm')).toHaveLength(1)
  })
})
