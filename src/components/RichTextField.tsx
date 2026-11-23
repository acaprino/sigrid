// A field for text with a little form: bold, italic and underlined words, two kinds of list, a quote. The editing is
// TipTap's (`@tiptap/react` and its starter kit, on ProseMirror: npm dependencies, pinned, see THIRD_PARTY.md); the
// form is the toolkit's: the border and the focus ring of a field, and above the text the toolkit's own `Toolbar`
// with Sigrid's icons (R6). It has its own entry of the package (`./rich-text`): TipTap is the
// heaviest thing the toolkit rests on, and an app that writes no formatted text does not load it.
// - What the row of buttons offers is all the field does: headings, code, links and rules are switched off, so a
//   paste or a shortcut cannot bring in what the user has no button to take away. The value holds what was written
//   and nothing else: no empty paragraph is kept after a list (Enter twice leaves a list or a quote).
// - A button that is on (the caret is in bold text) says so with the selection tint, as any switch of a toolbar.
// - The value is HTML, the app's to keep: `onChange` gives it at every change. A value that comes from outside (a
//   draft opened) replaces the text and is not a step of the undo: Ctrl+Z never brings the other draft back. The
//   field's own changes never loop back, also when the app hands them back late (a store, a round trip): a value
//   the field itself gave a moment ago is not taken for a new one.
// - It takes what a `FormField` gives its control (`id`, `aria-describedby`, `aria-invalid`, `required`). A `<label>`
//   names only the browser's own fields, so the text finds the label that points at its `id`, takes its name from it
//   (`aria-labelledby`) and takes the focus when the label is pressed, as an input does.
// - Text is 16px below 860px, so a phone does not zoom, and 14px above.
import * as React from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Icon, type IconName } from '../icons'
import { FOCUS_WITHIN_FIELD } from '../lib/focus'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { Toolbar, ToolbarButton, ToolbarSeparator } from './ui/toolbar'

export type RichTextFieldProps = {
  /** The text, as HTML. */
  value: string
  onChange: (html: string) => void
  id?: string | undefined
  /** The name of the field for screen readers, where no label names it. */
  'aria-label'?: string | undefined
  'aria-describedby'?: string | undefined
  'aria-invalid'?: boolean | 'true' | 'false' | undefined
  /** Said to screen readers; whether an empty text is accepted is the app's to check. */
  required?: boolean | undefined
  /** The text cannot be changed: half opacity, no buttons. */
  disabled?: boolean | undefined
  /** Classes of the box around the buttons and the text: the least height of the text is its own (`min-h-24`). */
  className?: string | undefined
}

const TEXT = cn(
  'min-h-24 px-(--pad-sm) py-2 text-base text-ink outline-none md:text-sm',
  '[&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_ul]:my-2 [&_ol]:my-2',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-soft',
)

type Mark = 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList' | 'blockquote'
const MARKS: readonly { id: Mark; icon: IconName; word: 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList' | 'quote' }[] = [
  { id: 'bold', icon: 'bold', word: 'bold' },
  { id: 'italic', icon: 'italic', word: 'italic' },
  { id: 'underline', icon: 'underline', word: 'underline' },
  { id: 'bulletList', icon: 'bulletList', word: 'bulletList' },
  { id: 'orderedList', icon: 'listOrdered', word: 'orderedList' },
  { id: 'blockquote', icon: 'quote', word: 'quote' },
]

/**
 * The row of buttons. It is drawn again only when what it shows changes (a button goes on or off, there is something
 * to take back): not at every key, and not when the app draws the field again with its new value.
 */
const Bar = React.memo(function Bar({ editor }: { editor: Editor }) {
  const words = useWords().richText
  const state = useEditorState({
    editor,
    selector: ({ editor: now }) => ({ on: MARKS.filter((mark) => now.isActive(mark.id)).map((mark) => mark.id), undo: now.can().undo(), redo: now.can().redo() }),
  })
  const toggle = (mark: Mark) => {
    const chain = editor.chain().focus()
    if (mark === 'bold') chain.toggleBold().run()
    else if (mark === 'italic') chain.toggleItalic().run()
    else if (mark === 'underline') chain.toggleUnderline().run()
    else if (mark === 'bulletList') chain.toggleBulletList().run()
    else if (mark === 'orderedList') chain.toggleOrderedList().run()
    else chain.toggleBlockquote().run()
  }
  return (
    <div data-slot="rich-text-bar" className="flex shrink-0 border-b border-line px-1 py-1">
      <Toolbar aria-label={words.toolbar} size="sm">
        {MARKS.map((mark, at) => (
          <React.Fragment key={mark.id}>
            {at === 3 || at === 5 ? <ToolbarSeparator /> : null}
            <ToolbarButton label={words[mark.word]} icon={<Icon name={mark.icon} />} pressed={state.on.includes(mark.id)} onClick={() => toggle(mark.id)} />
          </React.Fragment>
        ))}
        <ToolbarSeparator />
        <ToolbarButton label={words.undo} icon={<Icon name="undo" />} disabled={!state.undo} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label={words.redo} icon={<Icon name="redo" />} disabled={!state.redo} onClick={() => editor.chain().focus().redo().run()} />
      </Toolbar>
    </div>
  )
})

// Made once: an extension made at every paint would look new to the editor, which would set itself up again.
const EXTENSIONS = [StarterKit.configure({ heading: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false, trailingNode: false })]

/** How many of its own values the field remembers, to know them when the app hands them back late. */
const REMEMBERED = 64

function RichTextField({ value, onChange, id, required = false, disabled = false, className, ...aria }: RichTextFieldProps) {
  const latest = React.useRef(onChange)
  latest.current = onChange
  // The values the field gave and the app has not handed back yet, the newest last: when one of them comes back as
  // `value` there is nothing to read or to compare.
  const sent = React.useRef<string[]>([value])
  const editor = useEditor({
    extensions: EXTENSIONS,
    // The form of the text from the first paint; the effect below adds what names and describes it.
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', class: TEXT } },
    content: value,
    editable: !disabled,
    // The buttons read what they need below (`useEditorState`): the field itself is not drawn again at every key.
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: now }) => {
      const html = now.getHTML()
      sent.current.push(html)
      if (sent.current.length > REMEMBERED) sent.current.shift()
      latest.current(html)
    },
  })
  // What a label, a helper and an error say about a field goes on the text itself, which is what takes the focus.
  React.useEffect(() => {
    if (!editor) return
    const attributes: Record<string, string> = { role: 'textbox', 'aria-multiline': 'true', class: TEXT }
    if (id) attributes['id'] = id
    for (const key of ['aria-label', 'aria-describedby', 'aria-invalid'] as const) if (aria[key] !== undefined) attributes[key] = String(aria[key])
    if (required) attributes['aria-required'] = 'true'
    if (disabled) attributes['aria-disabled'] = 'true'
    // The label that points at the field (`FormField`'s): its words are the name, and a press on it is a press here.
    const label = id && aria['aria-label'] === undefined ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`) : null
    if (label) {
      if (!label.id) label.id = `${id}-label`
      attributes['aria-labelledby'] = label.id
    }
    editor.setOptions({ editorProps: { attributes } })
    editor.setEditable(!disabled, false)
    if (!label) return
    const focus = () => editor.commands.focus()
    label.addEventListener('click', focus)
    return () => label.removeEventListener('click', focus)
  }, [editor, id, required, disabled, aria['aria-label'], aria['aria-describedby'], aria['aria-invalid']])
  // A value from outside takes the place of the text; the field's own value is already there.
  React.useEffect(() => {
    if (!editor) return
    const at = sent.current.lastIndexOf(value)
    if (at >= 0) {
      // The field's own value, back from the app: the ones before it are answered too.
      sent.current = sent.current.slice(at)
      return
    }
    sent.current = [value]
    // Not a step of the undo: Ctrl+Z after a draft is opened must not bring the draft before it back.
    if (value !== editor.getHTML()) editor.chain().setMeta('addToHistory', false).setContent(value, { emitUpdate: false }).run()
  }, [editor, value])
  return (
    <div data-slot="rich-text" data-disabled={disabled ? '' : undefined} data-invalid={aria['aria-invalid'] === true || aria['aria-invalid'] === 'true' ? '' : undefined} className={cn('flex flex-col rounded-md border border-line bg-transparent data-invalid:border-destructive data-disabled:opacity-50', FOCUS_WITHIN_FIELD, className)}>
      {disabled || !editor ? null : <Bar editor={editor} />}
      <EditorContent editor={editor} data-slot="rich-text-content" className="min-h-0 flex-1 overflow-y-auto" />
    </div>
  )
}

export { RichTextField }
