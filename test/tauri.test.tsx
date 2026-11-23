// The `./tauri` entry, tested with fake windows, webviews and events passed in, never with Tauri itself: where the page
// runs, that a page in a browser loads nothing of Tauri, the window's buttons and its maximized state, the zoom, and the
// two opt-ins (Snap Layouts and the window theme). Tauri's modules are mocked only to see whether they are loaded.
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { TitleBar, WindowControls, type TitleBarDragProps } from '../src'
import {
  DRAG_REGION,
  TAURI_PERMISSIONS,
  clampZoom,
  createZoom,
  readHost,
  stepZoom,
  useSnapLayouts,
  useWindowControls,
  useWindowTheme,
  useZoom,
  zoomKey,
  type SnapLayoutsOptions,
  type TauriApi,
  type TauriWindow,
  type WindowControlsOptions,
  type WindowThemeOptions,
} from '../tauri'

// What a page would load of Tauri: each module says when it is loaded.
const tauri = vi.hoisted(() => ({ loaded: [] as string[], window: undefined as unknown }))
vi.mock('@tauri-apps/api/window', () => {
  tauri.loaded.push('window')
  return { getCurrentWindow: () => tauri.window }
})
vi.mock('@tauri-apps/api/webview', () => {
  tauri.loaded.push('webview')
  return { getCurrentWebview: () => ({ setZoom: async () => {} }) }
})
vi.mock('@tauri-apps/api/core', () => {
  tauri.loaded.push('core')
  return { invoke: async () => {} }
})
vi.mock('@tauri-apps/api/event', () => {
  tauri.loaded.push('event')
  return { listen: async () => () => {} }
})

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)) })
/** Dispatches and says whether the default was refused. */
const refused = (target: EventTarget, event: Event) => !target.dispatchEvent(event)
const button = (name: string) => document.querySelector<HTMLButtonElement>(`[data-window-control="${name}"]`)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function fakeWindow(over: Partial<Record<keyof TauriWindow, unknown>> = {}) {
  let resized: (() => void) | undefined
  const unlisten = vi.fn()
  const win = {
    minimize: vi.fn(async () => {}),
    toggleMaximize: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    isMaximized: vi.fn(async () => false),
    onResized: vi.fn(async (handler: () => void) => {
      resized = handler
      return unlisten
    }),
    setTheme: vi.fn(async () => {}),
    ...over,
  } as unknown as TauriWindow
  return { win, unlisten, resize: () => act(() => resized?.()) }
}

function Bar(props: WindowControlsOptions) {
  return <WindowControls {...useWindowControls(props)} />
}

afterEach(() => {
  vi.restoreAllMocks()
})

// First: the modules of Tauri are loaded once and then stay, so this looks before any test asks for them.
describe('in a browser', () => {
  test('importing the entry and drawing its parts calls and loads nothing of Tauri', async () => {
    function App() {
      useWindowTheme('dark')
      const { zoom } = useZoom()
      return (
        <TitleBar dragProps={DRAG_REGION} windowControls={<WindowControls {...useWindowControls()} {...useSnapLayouts({ command: 'caption', event: 'caption-state' })} />}>
          {zoom}
        </TitleBar>
      )
    }
    render(<App />)
    for (const name of ['minimize', 'maximize', 'close']) fireEvent.click(button(name)!)
    fireEvent.keyDown(document.body, { key: '=', code: 'Equal', ctrlKey: true })
    await flush()
    expect(tauri.loaded).toEqual([])
  })

  test('the entry imports Tauri only inside its functions, never at the top of a file', () => {
    const dir = join(root, 'tauri')
    for (const name of readdirSync(dir)) {
      const text = readFileSync(join(dir, name), 'utf8')
      expect(text, name).not.toMatch(/^\s*(?:import|export)\s+(?!type\b)[^'"]*from\s*['"]@tauri-apps\//m)
      expect(text, name).not.toMatch(/^\s*import\s*['"]@tauri-apps\//m)
    }
  })

  test('in a Tauri window, Tauri\'s own window is loaded the first time it is needed', async () => {
    const fake = fakeWindow()
    tauri.window = fake.win
    render(<Bar enabled />)
    await flush()
    expect(tauri.loaded).toEqual(['window'])
    expect(fake.win.isMaximized).toHaveBeenCalled()
  })

  test('with Tauri\'s global on the page, the parts act by themselves, with no option', async () => {
    const fake = fakeWindow()
    tauri.window = fake.win
    const page = window as unknown as { __TAURI_INTERNALS__?: unknown }
    page.__TAURI_INTERNALS__ = {}
    try {
      expect(readHost().ownWindow).toBe(true)
      render(<Bar />)
      fireEvent.click(button('close')!)
      await flush()
      expect(fake.win.isMaximized).toHaveBeenCalled()
      expect(fake.win.close).toHaveBeenCalledTimes(1)
    } finally {
      delete page.__TAURI_INTERNALS__
    }
  })
})

describe('where the page runs', () => {
  const desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
  test('a Tauri window is told by its global, a phone by its agent, and a window of its own is Tauri on a computer', () => {
    expect(readHost(undefined)).toEqual({ native: false, mobile: false, ownWindow: false })
    expect(readHost({ navigator: { userAgent: desktop } })).toEqual({ native: false, mobile: false, ownWindow: false })
    expect(readHost({ __TAURI_INTERNALS__: {}, navigator: { userAgent: desktop } })).toEqual({ native: true, mobile: false, ownWindow: true })
    expect(readHost({ __TAURI_INTERNALS__: {}, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36' } })).toEqual({ native: true, mobile: true, ownWindow: false })
    expect(readHost({ navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } }).mobile).toBe(true)
    // An iPad says «Macintosh», with touch points.
    expect(readHost({ __TAURI_INTERNALS__: {}, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 } })).toEqual({ native: true, mobile: true, ownWindow: false })
    expect(readHost({ __TAURI_INTERNALS__: {}, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 } }).ownWindow).toBe(true)
    // This page (jsdom) has no Tauri.
    expect(readHost().native).toBe(false)
  })

  test('the drag mark is what Tauri reads, and the bar carries it', () => {
    const drag: TitleBarDragProps = DRAG_REGION
    expect(drag).toEqual({ 'data-tauri-drag-region': '' })
    render(<TitleBar dragProps={DRAG_REGION}>Name</TitleBar>)
    expect(document.querySelector('[data-slot="title-bar"]')!.getAttribute('data-tauri-drag-region')).toBe('')
  })
})

describe('the window\'s buttons', () => {
  test('each button calls the window', async () => {
    const fake = fakeWindow()
    render(<Bar api={{ window: () => fake.win }} />)
    fireEvent.click(button('minimize')!)
    fireEvent.click(button('maximize')!)
    fireEvent.click(button('close')!)
    await flush()
    expect(fake.win.minimize).toHaveBeenCalledTimes(1)
    expect(fake.win.toggleMaximize).toHaveBeenCalledTimes(1)
    expect(fake.win.close).toHaveBeenCalledTimes(1)
  })

  test('off, the buttons call nothing', async () => {
    const fake = fakeWindow()
    render(<Bar enabled={false} api={{ window: () => fake.win }} />)
    fireEvent.click(button('close')!)
    await flush()
    expect(fake.win.close).not.toHaveBeenCalled()
    expect(fake.win.isMaximized).not.toHaveBeenCalled()
  })

  test('whether the window is maximized is read at once and again at each resize', async () => {
    let maximized = false
    const fake = fakeWindow({ isMaximized: vi.fn(async () => maximized) })
    render(<Bar api={{ window: () => fake.win }} />)
    await flush()
    expect(button('maximize')).not.toBeNull()
    maximized = true
    fake.resize()
    await flush()
    expect(button('restore')).not.toBeNull()
    maximized = false
    fake.resize()
    await flush()
    expect(button('maximize')).not.toBeNull()
  })

  test('when answers overlap, only the last one asked is shown', async () => {
    const answers: ReturnType<typeof deferred<boolean>>[] = []
    const fake = fakeWindow({
      isMaximized: vi.fn(() => {
        const answer = deferred<boolean>()
        answers.push(answer)
        return answer.promise
      }),
    })
    render(<Bar api={{ window: () => fake.win }} />)
    await flush()
    fake.resize()
    fake.resize()
    await flush()
    expect(answers).toHaveLength(3)
    // The last asked says maximized; an older answer that comes after it does not undo it.
    answers[2]!.resolve(true)
    await flush()
    answers[1]!.resolve(false)
    answers[0]!.resolve(false)
    await flush()
    expect(button('restore')).not.toBeNull()
  })

  test('a refused or failed call reaches onError, and a reporter that throws goes no further', async () => {
    const denied = new Error('core:window:allow-minimize not allowed')
    const broken = new Error('no window')
    const fake = fakeWindow({
      minimize: vi.fn(async () => {
        throw denied
      }),
      close: vi.fn(() => {
        throw broken
      }),
      isMaximized: vi.fn(async () => {
        throw denied
      }),
    })
    const onError = vi.fn()
    render(<Bar api={{ window: () => fake.win }} onError={onError} />)
    fireEvent.click(button('minimize')!)
    fireEvent.click(button('close')!)
    await flush()
    expect(onError).toHaveBeenCalledWith('isMaximized', denied)
    expect(onError).toHaveBeenCalledWith('minimize', denied)
    expect(onError).toHaveBeenCalledWith('close', broken)
    // A window that cannot be reached at all is told by the calls that needed it.
    const lost = new Error('no Tauri')
    const failing = vi.fn(() => {
      throw new Error('the reporter itself fails')
    })
    const second = render(<Bar api={{ window: () => Promise.reject(lost) }} onError={failing} />)
    fireEvent.click(second.container.querySelector<HTMLButtonElement>('[data-window-control="close"]')!)
    await flush()
    expect(failing).toHaveBeenCalledWith('close', lost)
    expect(failing).toHaveBeenCalledWith('onResized', lost)
  })

  test('it stops listening on unmount, also when the listening begins after it', async () => {
    const fake = fakeWindow()
    const first = render(<Bar api={{ window: () => fake.win }} />)
    await flush()
    first.unmount()
    await flush()
    expect(fake.unlisten).toHaveBeenCalledTimes(1)

    const late = deferred<() => void>()
    const unlisten = vi.fn()
    const slow = fakeWindow({ onResized: vi.fn(() => late.promise) })
    const second = render(<Bar api={{ window: () => slow.win }} />)
    await flush()
    second.unmount()
    late.resolve(unlisten)
    await flush()
    expect(unlisten).toHaveBeenCalledTimes(1)
  })
})

describe('the zoom', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const map = new Map(Object.entries(initial))
    return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => void map.set(key, value) }
  }
  const webview = (setZoom: (level: number) => Promise<unknown> = async () => {}) => {
    const fake = { setZoom: vi.fn(setZoom) }
    return { fake, api: { webview: () => fake } satisfies Partial<TauriApi> }
  }
  const press = (key: string, more: KeyboardEventInit = {}) => refused(document.body, new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true, ...more }))
  const wheel = (deltaY: number, ctrlKey = true) => refused(document.body, new WheelEvent('wheel', { deltaY, ctrlKey, bubbles: true, cancelable: true }))

  test('levels go from 50% to 200% in tenths', () => {
    expect(clampZoom(1.75)).toBe(1.8)
    expect(clampZoom(5)).toBe(2)
    expect(clampZoom(0.1)).toBe(0.5)
    expect(clampZoom(Number.NaN)).toBe(1)
    expect(stepZoom(1, 1)).toBe(1.1)
    expect(stepZoom(2, 1)).toBe(2)
    expect(stepZoom(0.5, -1)).toBe(0.5)
    expect(stepZoom(1.7, 0)).toBe(1)
  })

  test('the keys: Ctrl or Command with + = - 0, on any layout; not with Alt, not with both', () => {
    const key = (k: string, more: Partial<Parameters<typeof zoomKey>[0]> = {}) => zoomKey({ key: k, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, ...more })
    expect(key('=')).toBe(1)
    expect(key('+', { shiftKey: true })).toBe(1)
    expect(key('x', { code: 'NumpadAdd' })).toBe(1)
    expect(key('-')).toBe(-1)
    expect(key('0')).toBe(0)
    expect(key('=', { ctrlKey: false, metaKey: true })).toBe(1)
    expect(key('=', { altKey: true })).toBeNull()
    expect(key('=', { metaKey: true })).toBeNull()
    expect(key('=', { ctrlKey: false })).toBeNull()
    expect(key('a')).toBeNull()
  })

  test('the keys and Ctrl with the wheel step the webview, and the level is kept', async () => {
    const storage = memory()
    const { fake, api } = webview()
    const zoom = createZoom({ api, storage })
    const detach = zoom.attach(document)
    expect(press('=', { code: 'Equal' })).toBe(true)
    await flush()
    expect(fake.setZoom).toHaveBeenLastCalledWith(1.1)
    expect(zoom.level()).toBe(1.1)
    expect(storage.map.get('sigrid.zoom')).toBe('1.1')
    expect(press('-')).toBe(true)
    await flush()
    expect(zoom.level()).toBe(1)
    // A notch of a mouse is a step; a touchpad's small turns add up to one.
    expect(wheel(-100)).toBe(true)
    await flush()
    expect(zoom.level()).toBe(1.1)
    wheel(20)
    wheel(20)
    await flush()
    expect(zoom.level()).toBe(1.1)
    wheel(20)
    await flush()
    expect(zoom.level()).toBe(1)
    // Without Ctrl the wheel scrolls; without Ctrl a key types.
    expect(wheel(-100, false)).toBe(false)
    expect(press('=', { ctrlKey: false })).toBe(false)
    expect(press('0')).toBe(true)
    await flush()
    expect(zoom.level()).toBe(1)
    detach()
    expect(press('=')).toBe(false)
  })

  test('it stops at 200% and at 50%, without asking the webview again', async () => {
    const { fake, api } = webview()
    const zoom = createZoom({ api, storage: null })
    await zoom.set(5)
    expect(zoom.level()).toBe(2)
    fake.setZoom.mockClear()
    await zoom.step(1)
    expect(fake.setZoom).not.toHaveBeenCalled()
    await zoom.set(0.2)
    expect(zoom.level()).toBe(0.5)
  })

  test('the saved level is given to the webview at the next start, under the app\'s own key', async () => {
    const storage = memory({ 'app.zoom': '1.5' })
    const { fake, api } = webview()
    const zoom = createZoom({ api, storage, storageKey: 'app.zoom' })
    expect(zoom.level()).toBe(1.5)
    await zoom.ready
    expect(fake.setZoom).toHaveBeenCalledWith(1.5)
    // At 100% there is nothing to give.
    const plain = webview()
    await createZoom({ api: plain.api, storage: memory() }).ready
    expect(plain.fake.setZoom).not.toHaveBeenCalled()
  })

  test('a level the webview refuses goes back, is not kept, and reaches onError', async () => {
    const denied = new Error('core:webview:allow-set-webview-zoom not allowed')
    const storage = memory()
    const { api } = webview(async (level) => {
      if (level > 1.1) throw denied
    })
    const onError = vi.fn()
    const onChange = vi.fn()
    const zoom = createZoom({ api, storage, onError, onChange })
    expect(await zoom.step(1)).toBe(true)
    const asked = zoom.step(1)
    // Shown at once, before the webview answers.
    expect(zoom.level()).toBe(1.2)
    expect(await asked).toBe(false)
    expect(zoom.level()).toBe(1.1)
    expect(storage.map.get('sigrid.zoom')).toBe('1.1')
    expect(onError).toHaveBeenCalledWith('setZoom', denied)
    expect(onChange.mock.calls.map(([level]) => level)).toEqual([1.1, 1.2, 1.1])
    // A saved level refused at the start is back at 100%.
    const start = createZoom({ api, storage: memory({ 'sigrid.zoom': '1.5' }), onError })
    await start.ready
    expect(start.level()).toBe(1)
  })

  test('a part of the page that takes the key or the wheel itself keeps it', async () => {
    const { fake, api } = webview()
    const detach = createZoom({ api, storage: null }).attach(document)
    const canvas = document.createElement('div')
    document.body.append(canvas)
    const own = (event: Event) => event.preventDefault()
    canvas.addEventListener('wheel', own)
    canvas.addEventListener('keydown', own)
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '=', ctrlKey: true, bubbles: true, cancelable: true }))
    await flush()
    expect(fake.setZoom).not.toHaveBeenCalled()
    detach()
    canvas.remove()
  })

  test('the hook shows the level and lets go of the keys on unmount', async () => {
    const { fake, api } = webview()
    function Level() {
      const { zoom, setZoom } = useZoom({ api, storage: null })
      return (
        <button type="button" onClick={() => void setZoom(1.5)}>
          {Math.round(zoom * 100)}
        </button>
      )
    }
    const view = render(<Level />)
    const shown = () => view.container.querySelector('button')!.textContent
    expect(shown()).toBe('100')
    press('=')
    await flush()
    expect(shown()).toBe('110')
    fireEvent.click(view.container.querySelector('button')!)
    await flush()
    expect(shown()).toBe('150')
    expect(fake.setZoom).toHaveBeenLastCalledWith(1.5)
    view.unmount()
    expect(press('=')).toBe(false)
  })
})

describe('Snap Layouts, with the app\'s command and event', () => {
  const page = document.defaultView!
  const box = { left: 100, top: 0, width: 46, height: 32 }
  const observers: (() => void)[] = []
  class StubObserver {
    constructor(callback: () => void) {
      observers.push(callback)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const place = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => box }) as DOMRect)
    const ratio = Object.getOwnPropertyDescriptor(page, 'devicePixelRatio')
    const observer = Object.getOwnPropertyDescriptor(page, 'ResizeObserver')
    Object.defineProperty(page, 'devicePixelRatio', { value: 1.5, configurable: true })
    Object.defineProperty(page, 'ResizeObserver', { value: StubObserver, configurable: true, writable: true })
    return () => {
      if (ratio) Object.defineProperty(page, 'devicePixelRatio', ratio)
      else delete (page as { devicePixelRatio?: number }).devicePixelRatio
      if (observer) Object.defineProperty(page, 'ResizeObserver', observer)
      else delete (page as { ResizeObserver?: unknown }).ResizeObserver
    }
  }
  const fakeEvents = () => {
    const unlisten = vi.fn()
    let handler: ((event: { payload: unknown }) => void) | undefined
    const listen = vi.fn(async (_event: string, given: (event: { payload: unknown }) => void) => {
      handler = given
      return unlisten
    })
    return { listen: listen as unknown as TauriApi['listen'], listenSpy: listen, unlisten, send: (payload: unknown) => act(() => handler?.({ payload })) }
  }
  function Controls(props: SnapLayoutsOptions) {
    return <WindowControls onMaximizeToggle={() => {}} {...useSnapLayouts(props)} />
  }

  test('the maximize button\'s rectangle goes to the command in physical pixels, when it changes and at each resize', async () => {
    const restore = place()
    try {
      const invoke = vi.fn(async () => {})
      const events = fakeEvents()
      const view = render(<Controls command="window_caption_maximize" event="caption-maximize" api={{ invoke, listen: events.listen }} />)
      await flush()
      expect(invoke).toHaveBeenCalledTimes(1)
      expect(invoke).toHaveBeenLastCalledWith('window_caption_maximize', { x: 150, y: 0, width: 69, height: 48 })
      // The same rectangle is not sent again; a new one is.
      act(() => observers[observers.length - 1]!())
      await flush()
      expect(invoke).toHaveBeenCalledTimes(1)
      box.left = 200
      act(() => observers[observers.length - 1]!())
      await flush()
      expect(invoke).toHaveBeenLastCalledWith('window_caption_maximize', { x: 300, y: 0, width: 69, height: 48 })
      // A resize of the window sends it again even when it is the same.
      act(() => {
        page.dispatchEvent(new Event('resize'))
      })
      await flush()
      expect(invoke).toHaveBeenCalledTimes(3)
      // When the button goes away, the shell is told to take its area away.
      view.unmount()
      await flush()
      expect(invoke).toHaveBeenLastCalledWith('window_caption_maximize', { x: 0, y: 0, width: 0, height: 0 })
    } finally {
      box.left = 100
      restore()
    }
  })

  test('a send that fails reaches onError and is sent again at the next change', async () => {
    const restore = place()
    try {
      const missing = new Error('command window_caption_maximize not found')
      const invoke = vi.fn().mockRejectedValueOnce(missing).mockResolvedValue(undefined)
      const onError = vi.fn()
      render(<Controls command="window_caption_maximize" event="caption-maximize" api={{ invoke, listen: fakeEvents().listen }} onError={onError} />)
      await flush()
      expect(onError).toHaveBeenCalledWith('snapLayouts', missing)
      act(() => observers[observers.length - 1]!())
      await flush()
      expect(invoke).toHaveBeenCalledTimes(2)
      expect(invoke.mock.calls[1]).toEqual(invoke.mock.calls[0])
    } finally {
      restore()
    }
  })

  test('the hover and the press the shell reports show on the button, and the listening stops on unmount', async () => {
    const events = fakeEvents()
    const view = render(<Controls command="window_caption_maximize" event="caption-maximize" api={{ invoke: async () => {}, listen: events.listen }} />)
    await flush()
    expect(events.listenSpy).toHaveBeenCalledWith('caption-maximize', expect.any(Function))
    const maximize = () => button('maximize')!.getAttribute('data-os-state')
    events.send({ hover: true, pressed: false })
    expect(maximize()).toBe('hover')
    events.send({ hover: true, pressed: true })
    expect(maximize()).toBe('pressed')
    events.send({ hover: false, pressed: false })
    expect(maximize()).toBeNull()
    view.unmount()
    await flush()
    expect(events.unlisten).toHaveBeenCalledTimes(1)
  })

  test('a listening that is refused reaches onError', async () => {
    const denied = new Error('core:event:allow-listen not allowed')
    const onError = vi.fn()
    render(<Controls command="c" event="e" api={{ invoke: async () => {}, listen: () => Promise.reject(denied) }} onError={onError} />)
    await flush()
    expect(onError).toHaveBeenCalledWith('listen', denied)
  })
})

describe('the window theme', () => {
  function Theme({ scheme, ...options }: WindowThemeOptions & { scheme: 'light' | 'dark' }) {
    useWindowTheme(scheme, options)
    return null
  }

  test('the scheme drawn goes to the app\'s command, once for each change', async () => {
    const invoke = vi.fn(async () => {})
    const view = render(<Theme scheme="dark" command="set_window_theme" api={{ invoke }} />)
    await flush()
    expect(invoke).toHaveBeenCalledWith('set_window_theme', { theme: 'dark' })
    view.rerender(<Theme scheme="dark" command="set_window_theme" api={{ invoke }} />)
    await flush()
    expect(invoke).toHaveBeenCalledTimes(1)
    view.rerender(<Theme scheme="light" command="set_window_theme" api={{ invoke }} args={(scheme) => ({ theme: scheme, look: 'plain' })} />)
    await flush()
    expect(invoke).toHaveBeenLastCalledWith('set_window_theme', { theme: 'light', look: 'plain' })
  })

  test('without a command it goes through the window\'s setTheme, and a refusal reaches onError', async () => {
    const fake = fakeWindow()
    render(<Theme scheme="dark" api={{ window: () => fake.win }} />)
    await flush()
    expect(fake.win.setTheme).toHaveBeenCalledWith('dark')
    const denied = new Error('core:window:allow-set-theme not allowed')
    const onError = vi.fn()
    render(<Theme scheme="light" command="set_window_theme" api={{ invoke: () => Promise.reject(denied) }} onError={onError} />)
    await flush()
    expect(onError).toHaveBeenCalledWith('setTheme', denied)
  })

  test('with the scheme changed by the user', async () => {
    const invoke = vi.fn(async () => {})
    function App() {
      const [scheme, setScheme] = useState<'light' | 'dark'>('light')
      useWindowTheme(scheme, { command: 'set_window_theme', api: { invoke } })
      return <button type="button" onClick={() => setScheme('dark')}>Dark</button>
    }
    const view = render(<App />)
    fireEvent.click(view.getByText('Dark'))
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('set_window_theme', { theme: 'dark' }))
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})

test('the permissions are those of Tauri 2\'s core, split into the basics and what each opt-in adds', () => {
  const all = [...TAURI_PERMISSIONS.basics, ...TAURI_PERMISSIONS.snapLayouts, ...TAURI_PERMISSIONS.windowTheme]
  for (const permission of all) expect(permission).toMatch(/^core:(?:window|event|webview):allow-[a-z-]+$/)
  expect(TAURI_PERMISSIONS.basics).toEqual(expect.arrayContaining(['core:window:allow-minimize', 'core:window:allow-toggle-maximize', 'core:window:allow-close', 'core:window:allow-is-maximized', 'core:window:allow-start-dragging', 'core:event:allow-listen', 'core:event:allow-unlisten', 'core:webview:allow-set-webview-zoom']))
  expect(new Set(TAURI_PERMISSIONS.basics).size).toBe(TAURI_PERMISSIONS.basics.length)
  expect(TAURI_PERMISSIONS.windowTheme).toEqual(['core:window:allow-set-theme'])
})
