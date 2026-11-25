// A view for code, read-only or editable: CodeMirror 6 (`@codemirror/*` and `@lezer/highlight`: npm dependencies,
// pinned, see THIRD_PARTY.md) in the toolkit's colours. The editing, the highlighting and the search are CodeMirror's;
// the colours are made from the tokens as they resolve in the page and made again when the page's look changes
// (`code-theme.ts`), and the font is `--font-mono`. It has its own entry of the package (`./code`): an app that shows no
// code does not load CodeMirror, and a language is loaded when a file of it is shown (`code-languages.ts`).
// - The text is the app's: `value` in, `onChange` out at every change the person makes. A `value` that is not the one
//   last given back (another file opened, a visual edit) replaces the text and is not a step of the undo.
// - Each file keeps its own state (the undo steps, the selection) while the view lives: `docId` names the file, and
//   going back to it brings its state back. `ref.forget(docId)` lets one go.
// - The language comes from `fileName` (`src/main.rs`) or is said by `language`; `extensions` carries what the toolkit
//   does not know (another language, a key) into the editor. Prose (Markdown, text with no language) wraps; code
//   scrolls; `wrap` says otherwise.
// - Tab moves the focus on, as on every page, so the keyboard is never trapped in the text; `tabIndents` makes Tab indent.
// - Read-only is a view the person can still select and search in (Ctrl F), and says so to screen readers.
import * as React from 'react'
import { Annotation, Compartment, EditorState, Transaction, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { watchLook } from '../internal/look'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { codeLanguageById, codeLanguageOf, loadCodeLanguage, type CodeLanguageId } from './code-languages'
import { codeTheme } from './code-theme'

/** What the app can do to the view, through its `ref`. */
export type CodeViewHandle = {
  focus(): void
  /** Lets go of the state (undo steps, selection) kept for a file. */
  forget(docId: string): void
  /** CodeMirror's own view, for what the toolkit does not cover; null before the part is in the page. */
  readonly view: EditorView | null
}

export type CodeViewProps = {
  ref?: React.Ref<CodeViewHandle> | undefined
  /** The text. */
  value: string
  /** The text changed by what the person did. Absent, the view takes the text but tells nobody. */
  onChange?: ((value: string) => void) | undefined
  /** The name or the path of the file the text is from: its extension picks the language, and it names the text for the state kept for it unless `docId` does. */
  fileName?: string | undefined
  /** The language, when the name of the file does not say (or there is no file). */
  language?: CodeLanguageId | undefined
  /** Which text this is: a state is kept for each one. The file name by default. */
  docId?: string | undefined
  /** The text cannot be changed; it can be selected and searched. */
  readOnly?: boolean | undefined
  /** The numbers of the lines, and the arrows that fold them; on by default. */
  lineNumbers?: boolean | undefined
  /** Long lines wrap at the width of the view. By default prose wraps and code scrolls. */
  wrap?: boolean | undefined
  /** Tab indents instead of moving the focus on. */
  tabIndents?: boolean | undefined
  /** The width of a tab, in characters. */
  tabSize?: number | undefined
  /** More of CodeMirror: another language, another key. */
  extensions?: readonly Extension[] | undefined
  /** The words of CodeMirror's own panels (search), by its phrases: `{ 'Find': 'Cerca' }`. */
  phrases?: Readonly<Record<string, string>> | undefined
  /** The name of the view for screen readers; «Code» by default (`words.code.label`). */
  'aria-label'?: string | undefined
  /** Takes the keyboard when it is drawn. */
  autoFocus?: boolean | undefined
  className?: string | undefined
}

/** The change the view makes of the text because the app handed it another: not the person's, not a step of the undo. */
const FROM_APP = Annotation.define<boolean>()

/** The focus ring, inside the edge: the view fills its place, and a ring outside it would be cut. */
const FOCUS = 'outline-hidden focus-within:outline-solid focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ring'

function CodeView({ ref, value, onChange, fileName, language, docId, readOnly = false, lineNumbers: numbers = true, wrap, tabIndents = false, tabSize = 4, extensions, phrases, 'aria-label': ariaLabel, autoFocus = false, className }: CodeViewProps) {
  const words = useWords().code
  const label = ariaLabel ?? words.label
  const host = React.useRef<HTMLDivElement>(null)
  const view = React.useRef<EditorView | null>(null)
  const states = React.useRef(new Map<string, EditorState>())
  const shown = React.useRef<string>(docId ?? fileName ?? '')
  /** The text the view last gave the app: when it comes back as `value` there is nothing to take. */
  const given = React.useRef<string | null>(null)
  const latest = React.useRef({ onChange, value })
  latest.current = { onChange, value }
  const key = docId ?? fileName ?? ''

  // The parts of the editor that change while it lives, each in a compartment of its own.
  const parts = React.useRef({
    theme: new Compartment(),
    language: new Compartment(),
    wrap: new Compartment(),
    gutter: new Compartment(),
    access: new Compartment(),
    keys: new Compartment(),
    tab: new Compartment(),
    more: new Compartment(),
    phrases: new Compartment(),
  }).current

  const spec = (language ? codeLanguageById(language) : null) ?? (fileName ? codeLanguageOf(fileName) : null)
  const wraps = wrap ?? (spec ? spec.wraps : true)
  const gutterOf = (on: boolean): Extension => (on ? [lineNumbers(), foldGutter()] : [])
  const accessOf = (ro: boolean, name: string): Extension => [EditorState.readOnly.of(ro), EditorView.editable.of(true), EditorView.contentAttributes.of(ro ? { 'aria-label': words.readOnly(name), 'aria-readonly': 'true' } : { 'aria-label': name })]

  /** A state for a text, with the editor's parts as they are now. */
  const make = React.useCallback(
    (doc: string, themeOf: Extension): EditorState =>
      EditorState.create({
        doc,
        extensions: [
          history(),
          highlightSpecialChars(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          highlightSelectionMatches(),
          search({ top: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || update.transactions.some((tr) => tr.annotation(FROM_APP))) return
            const text = update.state.doc.toString()
            given.current = text
            latest.current.onChange?.(text)
          }),
          parts.theme.of(themeOf),
          parts.language.of([]),
          parts.wrap.of([]),
          parts.gutter.of([]),
          parts.access.of([]),
          parts.keys.of([]),
          parts.tab.of([]),
          parts.more.of([]),
          parts.phrases.of([]),
        ],
      }),
    [parts],
  )

  /** Everything that follows the props, put on the state the view has now. */
  const settings = (): { effects: ReturnType<Compartment['reconfigure']>[] } => ({
    effects: [
      parts.wrap.reconfigure(wraps ? EditorView.lineWrapping : []),
      parts.gutter.reconfigure(gutterOf(numbers)),
      parts.access.reconfigure(accessOf(readOnly, label)),
      parts.keys.reconfigure(tabIndents && !readOnly ? keymap.of([indentWithTab]) : []),
      parts.tab.reconfigure(EditorState.tabSize.of(tabSize)),
      parts.more.reconfigure(extensions ? [...extensions] : []),
      parts.phrases.reconfigure(phrases ? EditorState.phrases.of({ ...phrases }) : []),
    ],
  })
  const current = React.useRef(settings)
  current.current = settings

  React.useImperativeHandle(
    ref,
    (): CodeViewHandle => ({
      focus: () => view.current?.focus(),
      forget: (id) => { states.current.delete(id) },
      get view() { return view.current },
    }),
    [],
  )

  // The editor, made once for the box it is in.
  React.useLayoutEffect(() => {
    const parent = host.current
    if (!parent) return
    const editor = new EditorView({ parent, state: make(latest.current.value, codeTheme(parent)) })
    view.current = editor
    shown.current = key
    given.current = null
    editor.dispatch(current.current())
    const stop = watchLook(parent.ownerDocument, () => editor.dispatch({ effects: parts.theme.reconfigure(codeTheme(parent)) }))
    if (autoFocus) editor.focus()
    return () => {
      stop()
      editor.destroy()
      view.current = null
      states.current.clear()
    }
    // The editor is made once; what can change is set below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The text: another file brings its own state back (or a new one); the same file takes a text the app changed.
  React.useLayoutEffect(() => {
    const editor = view.current
    const parent = host.current
    if (!editor || !parent) return
    if (key !== shown.current) {
      states.current.set(shown.current, editor.state)
      const kept = states.current.get(key)
      // A state kept for a text that is not the one handed over (it changed while the file was away) is not kept.
      editor.setState(kept && kept.doc.toString() === value ? kept : make(value, codeTheme(parent)))
      shown.current = key
      given.current = null
      editor.dispatch(current.current())
      return
    }
    if (value === given.current) return
    if (value !== editor.state.doc.toString()) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, annotations: [FROM_APP.of(true), Transaction.addToHistory.of(false)] })
    given.current = null
  }, [key, value, make])

  // The settings that follow the props.
  React.useEffect(() => {
    view.current?.dispatch(current.current())
  }, [wraps, numbers, readOnly, label, tabIndents, tabSize, extensions, phrases, words])

  // The language: loaded when it is first needed, put in when it has arrived, and only if it is still the one wanted.
  const wanted = React.useRef<string | null>(null)
  React.useEffect(() => {
    const id = spec?.id ?? null
    wanted.current = id
    if (!id) {
      view.current?.dispatch({ effects: parts.language.reconfigure([]) })
      return
    }
    let live = true
    loadCodeLanguage(id).then(
      (support) => { if (live && wanted.current === id) view.current?.dispatch({ effects: parts.language.reconfigure(support) }) },
      // A language that did not load leaves the text plain.
      () => { if (live) view.current?.dispatch({ effects: parts.language.reconfigure([]) }) },
    )
    return () => { live = false }
  }, [spec?.id, key, parts])

  return <div ref={host} data-slot="code-view" data-readonly={readOnly ? '' : undefined} className={cn('relative min-h-0 min-w-0 overflow-hidden', FOCUS, className)} />
}

export { CodeView }
