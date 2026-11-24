// The frame as the window of a program (`AppShell desktop`) and the guard that takes the browser out of a page
// (`guardDesktop`, `useDesktopGuard`): the techniques of Imago's windows, in the toolkit's own writing.
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { guardDesktop, isBrowserKey, useDesktopGuard } from '../src'
import { DialogContent, DialogRoot, DialogTitle } from '../src/primitives'
import { AppShell, TitleBar } from '../src/layout'
import { flush } from './helpers'

const key = (k: string, more: Partial<KeyboardEventInit> = {}) => ({ key: k, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...more })
/** Dispatches and says whether the default was refused. */
const refused = (target: EventTarget, event: Event) => !target.dispatchEvent(event)

test('the keys a browser keeps for itself are told from the app\'s own', () => {
  for (const k of ['F5', 'F12']) expect(isBrowserKey(key(k))).toBe(true)
  for (const k of ['r', 'P', 'f', 's']) expect(isBrowserKey(key(k, { ctrlKey: true }))).toBe(true)
  expect(isBrowserKey(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true)
  expect(isBrowserKey(key('ArrowLeft', { altKey: true }))).toBe(true)
  // The palette's key, copy and paste, a plain letter, and anything with the Mac's command key are the app's.
  for (const e of [key('k', { ctrlKey: true }), key('c', { ctrlKey: true }), key('v', { ctrlKey: true }), key('r'), key('r', { metaKey: true }), key('ArrowLeft')]) expect(isBrowserKey(e)).toBe(false)
})

test('the guard refuses the browser\'s keys, its menu outside a field, the mouse\'s side buttons and the drag of a picture, and is taken away', () => {
  document.body.innerHTML = '<p id="text">Text</p><input id="field" /><img id="picture" /><img id="own" draggable="true" /><div class="editor"><span id="code">x</span></div>'
  const at = (id: string) => document.getElementById(id)!
  const stop = guardDesktop(document, { ownKeysIn: '.editor' })
  const down = (k: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
  const mouse = (type: string, init: MouseEventInit = {}) => new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  expect(refused(at('text'), down('F5'))).toBe(true)
  expect(refused(at('text'), down('k', { ctrlKey: true }))).toBe(false)
  // A terminal or an editor keeps its own keys and menu.
  expect(refused(at('code'), down('F5'))).toBe(false)
  expect(refused(at('code'), mouse('contextmenu'))).toBe(false)
  expect(refused(at('text'), mouse('contextmenu'))).toBe(true)
  expect(refused(at('field'), mouse('contextmenu'))).toBe(false)
  expect(refused(at('text'), mouse('mouseup', { button: 3 }))).toBe(true)
  expect(refused(at('text'), mouse('mouseup', { button: 0 }))).toBe(false)
  expect(refused(at('picture'), mouse('dragstart'))).toBe(true)
  expect(refused(at('own'), mouse('dragstart'))).toBe(false)
  stop()
  expect(refused(at('text'), down('F5'))).toBe(false)
  document.body.innerHTML = ''
})

test('the hook guards only while it is active', () => {
  function App({ active }: { active: boolean }) {
    useDesktopGuard(active)
    return <p>Window</p>
  }
  const { rerender, unmount } = render(<App active={false} />)
  const f5 = () => new KeyboardEvent('keydown', { key: 'F5', bubbles: true, cancelable: true })
  expect(refused(document.body, f5())).toBe(false)
  rerender(<App active />)
  expect(refused(document.body, f5())).toBe(true)
  unmount()
  expect(refused(document.body, f5())).toBe(false)
})

test('a desktop frame says so, and what opens over it mounts in a layer under the title bar, not in the page', async () => {
  render(
    <AppShell desktop contentLabel="Page" titleBar={<header>Bar</header>}>
      <DialogRoot open>
        <DialogContent>
          <DialogTitle>Sure?</DialogTitle>
        </DialogContent>
      </DialogRoot>
    </AppShell>,
  )
  await flush()
  const frame = document.querySelector('[data-slot="app-shell"]')!
  expect(frame.hasAttribute('data-desktop')).toBe(true)
  const layer = document.querySelector('[data-slot="app-shell-overlays"]')!
  // The layer is beside the regions under the bar, never around the bar.
  expect(layer.parentElement?.getAttribute('data-slot')).toBe('app-shell-below')
  expect(layer.parentElement?.previousElementSibling?.textContent).toBe('Bar')
  expect(layer.contains(screen.getByRole('dialog', { name: 'Sure?' }))).toBe(true)
  expect(layer.contains(document.querySelector('[data-slot="dialog-overlay"]'))).toBe(true)
})

test('a frame in a browser tab has no such layer: its overlays open over the whole page', async () => {
  render(
    <AppShell contentLabel="Page">
      <DialogRoot open>
        <DialogContent>
          <DialogTitle>Sure?</DialogTitle>
        </DialogContent>
      </DialogRoot>
    </AppShell>,
  )
  await flush()
  expect(document.querySelector('[data-slot="app-shell"]')?.hasAttribute('data-desktop')).toBe(false)
  expect(document.querySelector('[data-slot="app-shell-overlays"]')).toBeNull()
  expect(document.querySelector('[data-slot="app-shell"]')?.contains(screen.getByRole('dialog'))).toBe(false)
})

test('theme.css keeps the chrome of a desktop frame unselectable and its content selectable, and bounds its overlays', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/styles/theme.css'), 'utf8')
  expect(css).toMatch(/\[data-slot="app-shell"\]\[data-desktop\] \{[^}]*user-select: none;[^}]*cursor: default;/)
  expect(css).toMatch(/\[data-slot="app-shell"\]\[data-desktop\] :is\(\[data-slot="app-shell-content"\][^{]*\{[^}]*user-select: text;/)
  expect(css).toMatch(/\[data-slot="app-shell-overlays"\] \{\s*transform: translateZ\(0\);/)
})

test('on a Mac the browser\'s keys go with Command, and Command with an arrow is left to the caret', () => {
  for (const k of ['r', 'p', 'f', '[', ']']) expect(isBrowserKey(key(k, { metaKey: true }), true)).toBe(true)
  expect(isBrowserKey(key('i', { metaKey: true, altKey: true }), true)).toBe(true)
  for (const e of [key('k', { metaKey: true }), key('c', { metaKey: true }), key('ArrowLeft', { metaKey: true }), key('r', { ctrlKey: true }), key('r')]) expect(isBrowserKey(e, true)).toBe(false)
  // Elsewhere the Command key is not the browser's.
  expect(isBrowserKey(key('r', { metaKey: true }))).toBe(false)
})

test('a desktop frame mounts what it holds once', async () => {
  let mounts = 0
  function Page() {
    const [text, setText] = useState('')
    useEffect(() => {
      mounts++
    }, [])
    return <input aria-label="Draft" value={text} onChange={(event) => setText(event.target.value)} />
  }
  render(
    <AppShell desktop contentLabel="Page" titleBar={<header>Bar</header>}>
      <Page />
    </AppShell>,
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Draft' }), { target: { value: 'kept' } })
  await flush()
  expect(mounts).toBe(1)
  expect((screen.getByRole('textbox', { name: 'Draft' }) as HTMLInputElement).value).toBe('kept')
  expect(document.querySelector('[data-slot="app-shell-overlays"]')).toBeTruthy()
})

test('a press on the window\'s bar does not close a dialog; a press on the backdrop still does', async () => {
  const seen: boolean[] = []
  render(
    <AppShell desktop contentLabel="Page" titleBar={<TitleBar><button type="button">Minimize</button></TitleBar>}>
      <DialogRoot open onOpenChange={(open) => seen.push(open)}>
        <DialogContent>
          <DialogTitle>Sure?</DialogTitle>
        </DialogContent>
      </DialogRoot>
    </AppShell>,
  )
  await flush()
  const press = (el: Element) => {
    fireEvent.pointerDown(el)
    fireEvent.mouseDown(el)
    fireEvent.pointerUp(el)
    fireEvent.mouseUp(el)
    fireEvent.click(el)
  }
  press(screen.getByText('Minimize'))
  await flush()
  expect(seen).toEqual([])
  press(document.querySelector('[data-slot="dialog-overlay"]')!)
  await flush()
  expect(seen).toEqual([false])
})

test('theme.css lets a link inside the content be selected with the text around it', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/styles/theme.css'), 'utf8')
  expect(css).toMatch(/\[data-slot="app-shell-content"\], \[data-slot="inspector-body"\], \[data-selectable\]\) :is\(a, label, summary\),[^{]*\{[^}]*user-select: text;/)
})
