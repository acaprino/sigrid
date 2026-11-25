// `CodeView` (the `./code` entry, on CodeMirror 6). Here: it shows the text and says what is typed, a text the app hands
// over replaces it without echoing, each file keeps its own state, the language is loaded when a file of it is shown,
// read-only is still selectable and says so, the theme is made from the tokens and made again when the look changes.
import { act, render, screen } from '@testing-library/react'
import { undo } from '@codemirror/commands'
import { syntaxTree } from '@codemirror/language'
import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import * as React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CodeView, codeColors, type CodeViewHandle, type CodeViewProps } from '../src/code'
import { flush, settle } from './helpers'

// jsdom has no layout: CodeMirror measures with these.
if (!Range.prototype.getClientRects) Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)

afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-scheme')
})

const text = (view: EditorView | null | undefined) => view?.state.doc.toString()

/** A code view held by a state of the test, as an app holds it. */
function Held({ initial = '', onValue, ...props }: Partial<CodeViewProps> & { initial?: string; onValue?: (value: string) => void }) {
  const [value, setValue] = React.useState(initial)
  return <CodeView {...props} value={value} onChange={(next) => { setValue(next); onValue?.(next) }} />
}

describe('CodeView', () => {
  test('shows the text, named, in the page', async () => {
    render(<CodeView value={'let a = 1\nlet b = 2'} aria-label="Source" />)
    await flush()
    expect(document.querySelector('[data-slot="code-view"] .cm-editor')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'Source' }).textContent).toContain('let a = 1')
    expect(document.querySelectorAll('.cm-line')).toHaveLength(2)
  })

  test('is called «Code» by default', async () => {
    render(<CodeView value="x" />)
    await flush()
    expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy()
  })

  test('says what is typed, and a change the app makes of the text is not said back', async () => {
    const onChange = vi.fn()
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<CodeView ref={ref} value="one" onChange={onChange} />)
    await flush()
    const editor = ref.current!.view!
    act(() => { editor.dispatch({ changes: { from: 3, insert: ' two' } }) })
    expect(onChange).toHaveBeenCalledWith('one two')
    onChange.mockClear()
    // The app hands over another text: it takes the place of the text and is not said back.
    view.rerender(<CodeView ref={ref} value="another" onChange={onChange} />)
    await flush()
    expect(text(ref.current?.view)).toBe('another')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('held by the app\'s state, the text it gives back is the text it already has: no second change, no lost caret', async () => {
    const seen: string[] = []
    const ref = React.createRef<CodeViewHandle>()
    render(<Held ref={ref} initial="ab" onValue={(value) => seen.push(value)} />)
    await flush()
    const editor = ref.current!.view!
    act(() => { editor.dispatch({ selection: EditorSelection.cursor(1) }) })
    act(() => { editor.dispatch({ changes: { from: 1, insert: 'X' }, selection: EditorSelection.cursor(2) }) })
    await flush()
    expect(seen).toEqual(['aXb'])
    expect(text(editor)).toBe('aXb')
    expect(editor.state.selection.main.head).toBe(2)
  })

  test('a text handed over is not a step of the undo: Ctrl+Z never brings the other text back', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<CodeView ref={ref} value="first" onChange={() => {}} />)
    await flush()
    view.rerender(<CodeView ref={ref} value="second" onChange={() => {}} />)
    await flush()
    const editor = ref.current!.view!
    expect(undo(editor)).toBe(false)
    expect(text(editor)).toBe('second')
  })

  test('each file keeps its own state: its undo steps come back with it, and a text that changed while it was away starts new', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const show = (name: string, value: string) => <CodeView ref={ref} value={value} fileName={name} onChange={() => {}} />
    const view = render(show('a.txt', 'alpha'))
    await flush()
    act(() => { ref.current!.view!.dispatch({ changes: { from: 5, insert: '!' } }) })
    expect(text(ref.current!.view)).toBe('alpha!')
    // The app keeps the text it was given back, as an app does: the second file, then the first again.
    view.rerender(show('b.txt', 'beta'))
    await flush()
    expect(text(ref.current!.view)).toBe('beta')
    view.rerender(show('a.txt', 'alpha!'))
    await flush()
    expect(text(ref.current!.view)).toBe('alpha!')
    // Its undo step is still there.
    expect(undo(ref.current!.view!)).toBe(true)
    expect(text(ref.current!.view)).toBe('alpha')
    // Another text for the file that was away: not the kept state.
    view.rerender(show('b.txt', 'beta'))
    await flush()
    view.rerender(show('a.txt', 'changed elsewhere'))
    await flush()
    expect(text(ref.current!.view)).toBe('changed elsewhere')
    expect(undo(ref.current!.view!)).toBe(false)
  })

  test('forget lets the state of a file go', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const show = (name: string, value: string) => <CodeView ref={ref} value={value} docId={name} onChange={() => {}} />
    const view = render(show('a', 'alpha'))
    await flush()
    act(() => { ref.current!.view!.dispatch({ changes: { from: 5, insert: '!' } }) })
    view.rerender(show('b', 'beta'))
    await flush()
    ref.current!.forget('a')
    view.rerender(show('a', 'alpha!'))
    await flush()
    expect(undo(ref.current!.view!)).toBe(false)
  })

  test('read-only: the text cannot be changed by the person, can be selected and searched, and is said to be read-only', async () => {
    const ref = React.createRef<CodeViewHandle>()
    render(<CodeView ref={ref} value="fixed" readOnly aria-label="Source" />)
    await flush()
    const editor = ref.current!.view!
    expect(editor.state.readOnly).toBe(true)
    const content = screen.getByRole('textbox', { name: 'Source, read only' })
    expect(content.getAttribute('aria-readonly')).toBe('true')
    expect(content.getAttribute('contenteditable')).toBe('true')
    expect(document.querySelector('[data-slot="code-view"]')?.hasAttribute('data-readonly')).toBe(true)
  })

  test('line numbers and folding are in the gutter, and out of it when they are off', async () => {
    const view = render(<CodeView value={'a\nb\nc'} />)
    await flush()
    expect(document.querySelector('.cm-lineNumbers')).not.toBeNull()
    expect(document.querySelector('.cm-foldGutter')).not.toBeNull()
    view.rerender(<CodeView value={'a\nb\nc'} lineNumbers={false} />)
    await flush()
    expect(document.querySelector('.cm-lineNumbers')).toBeNull()
    expect(document.querySelector('.cm-foldGutter')).toBeNull()
  })

  test('code scrolls and prose wraps, unless the app says otherwise', async () => {
    const view = render(<CodeView value="x" fileName="main.rs" />)
    await flush()
    expect(document.querySelector('.cm-lineWrapping')).toBeNull()
    view.rerender(<CodeView value="x" fileName="notes.md" />)
    await flush()
    expect(document.querySelector('.cm-lineWrapping')).not.toBeNull()
    view.rerender(<CodeView value="x" fileName="notes.txt" />)
    await flush()
    expect(document.querySelector('.cm-lineWrapping')).not.toBeNull()
    view.rerender(<CodeView value="x" fileName="main.rs" wrap />)
    await flush()
    expect(document.querySelector('.cm-lineWrapping')).not.toBeNull()
    view.rerender(<CodeView value="x" fileName="notes.md" wrap={false} />)
    await flush()
    expect(document.querySelector('.cm-lineWrapping')).toBeNull()
  })

  test('the language is loaded when a file of it is shown, and the text is highlighted by it', async () => {
    const ref = React.createRef<CodeViewHandle>()
    render(<CodeView ref={ref} value={'fn main() { let a = 1; }'} fileName="src/main.rs" />)
    await flush()
    await settle(200)
    const tree = syntaxTree(ref.current!.view!.state)
    expect(tree.topNode.name).toBe('SourceFile')
    expect(document.querySelector('.cm-line span[class]')).not.toBeNull()
  })

  test('the language the app names wins over the name of the file; plain text has none', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<CodeView ref={ref} value="def a(): pass" fileName="script" language="python" />)
    await flush()
    await settle(200)
    expect(syntaxTree(ref.current!.view!.state).topNode.name).toBe('Script')
    view.rerender(<CodeView ref={ref} value="def a(): pass" fileName="notes.txt" />)
    await flush()
    expect(syntaxTree(ref.current!.view!.state).length).toBe(0)
  })

  test('a language that has not arrived when another is asked for does not take the place of the one asked for', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<CodeView ref={ref} value="x" fileName="a.rs" />)
    view.rerender(<CodeView ref={ref} value="x" fileName="a.py" />)
    await flush()
    await settle(200)
    expect(syntaxTree(ref.current!.view!.state).topNode.name).toBe('Script')
  })

  test('takes more of CodeMirror from the app (a language of its own), and the phrases of its panels', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const marker = EditorView.contentAttributes.of({ 'data-extra': 'yes' })
    render(<CodeView ref={ref} value="x" extensions={[marker]} phrases={{ Find: 'Cerca' }} />)
    await flush()
    expect(document.querySelector('.cm-content')?.getAttribute('data-extra')).toBe('yes')
    expect(ref.current!.view!.state.phrase('Find')).toBe('Cerca')
  })

  test('Tab leaves the text, as on every page, unless it is told to indent', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<CodeView ref={ref} value="x" />)
    await flush()
    const key = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      ref.current!.view!.contentDOM.dispatchEvent(event)
      return event
    }
    expect(key({ key: 'Tab', keyCode: 9 }).defaultPrevented).toBe(false)
    view.rerender(<CodeView ref={ref} value="x" tabIndents />)
    await flush()
    expect(key({ key: 'Tab', keyCode: 9 }).defaultPrevented).toBe(true)
    view.rerender(<CodeView ref={ref} value="x" tabIndents readOnly />)
    await flush()
    expect(key({ key: 'Tab', keyCode: 9 }).defaultPrevented).toBe(false)
  })

  test('leaves nothing behind: the editor is destroyed, and one is made under StrictMode', async () => {
    const ref = React.createRef<CodeViewHandle>()
    const view = render(<React.StrictMode><CodeView ref={ref} value="x" /></React.StrictMode>)
    await flush()
    expect(document.querySelectorAll('.cm-editor')).toHaveLength(1)
    const editor = ref.current!.view!
    const destroy = vi.spyOn(editor, 'destroy')
    view.unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.cm-editor')).toBeNull()
  })
})

describe('the theme of the code view is made from the tokens', () => {
  const dark = { paper: '#14181c', 'paper-2': '#0c0e10', raised: '#1c2126', ink: '#e6eaee', 'ink-soft': '#b4bcc4', 'ink-mute': '#8a949e', line: '#2c333a', accent: '#e0a030', selected: '#26323e', info: '#88aaee', success: '#77cc99', warning: '#eebb55', destructive: '#ff8877' }
  const paint = (tokens: Record<string, string>) => { for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(`--color-${name}`, value) }

  test('codeColors: each role is the token it names, the scheme is read from the ground', () => {
    paint(dark)
    const colors = codeColors(document.documentElement)
    expect(colors).toMatchObject({ paper: dark.paper, ink: dark.ink, mute: dark['ink-mute'], line: dark.line, accent: dark.accent, selected: dark.selected, info: dark.info, success: dark.success, warning: dark.warning, destructive: dark.destructive, dark: true })
    expect(colors.activeLine).toBe(dark['paper-2'])
    expect(colors.type).toMatch(/^#[0-9a-f]{6}$/)
    expect(colors.type).not.toBe(colors.info)
    paint({ paper: '#fafcfc' })
    expect(codeColors(document.documentElement).dark).toBe(false)
  })

  test('the editor is drawn in them: the ground and the ink of the page, the keywords in the info colour', async () => {
    paint(dark)
    const ref = React.createRef<CodeViewHandle>()
    render(<CodeView ref={ref} value="let a = 1" fileName="a.js" />)
    await flush()
    await settle(200)
    const editor = ref.current!.view!
    // The theme is a class CodeMirror writes in a stylesheet: its rules hold the tokens' values.
    const rules = [...document.head.querySelectorAll('style')].map((style) => style.textContent).join('\n')
    expect(rules).toContain(dark.paper)
    expect(rules).toContain(dark.ink)
    expect(rules).toContain(dark.info)
    expect(rules).toContain(dark.success)
    // A dark scheme is said to CodeMirror, which then picks the dark side of its own base rules.
    expect(editor.state.facet(EditorView.darkTheme)).toBe(true)
  })

  test('is made again when the look of the page changes: the new colours, and the scheme', async () => {
    paint(dark)
    const ref = React.createRef<CodeViewHandle>()
    render(<CodeView ref={ref} value="let a = 1" fileName="a.js" />)
    await flush()
    const editor = ref.current!.view!
    expect(editor.state.facet(EditorView.darkTheme)).toBe(true)
    paint({ paper: '#fafcfc', ink: '#161616', info: '#2b4a80' })
    document.documentElement.setAttribute('data-scheme', 'light')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) })
    expect(editor.state.facet(EditorView.darkTheme)).toBe(false)
    const rules = [...document.head.querySelectorAll('style')].map((style) => style.textContent).join('\n')
    expect(rules).toContain('#fafcfc')
    expect(rules).toContain('#2b4a80')
  })
})
