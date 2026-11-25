// The languages a code view knows, found by the name of the file and loaded the first time they are needed. A language
// of CodeMirror is a package of its own (a parser and its rules): each is behind a dynamic `import()`, so a view that
// shows plain text loads none, one that shows a Python file loads Python's, and the bundle splits at each. The names
// are the ones of Shinatama's file view: the extensions below, and the dot files that are JSON. Other languages are the
// app's: `CodeView` takes `extensions`, where its own language support goes (a name no entry here has is plain text).
import type { Extension } from '@codemirror/state'

/** The languages of the view. `typescript` and `javascript` are one package; `jsx` and `tsx` are theirs with the tags on. */
export type CodeLanguageId = 'css' | 'html' | 'javascript' | 'jsx' | 'typescript' | 'tsx' | 'json' | 'markdown' | 'python' | 'rust'

export interface CodeLanguage {
  readonly id: CodeLanguageId
  /** The name to put in a status line. */
  readonly label: string
  /** Prose wraps at the width of the view; code keeps its lines and scrolls. */
  readonly wraps: boolean
}

const LANGUAGES: Readonly<Record<CodeLanguageId, CodeLanguage>> = {
  css: { id: 'css', label: 'CSS', wraps: false },
  html: { id: 'html', label: 'HTML', wraps: false },
  javascript: { id: 'javascript', label: 'JavaScript', wraps: false },
  jsx: { id: 'jsx', label: 'JavaScript', wraps: false },
  typescript: { id: 'typescript', label: 'TypeScript', wraps: false },
  tsx: { id: 'tsx', label: 'TypeScript', wraps: false },
  json: { id: 'json', label: 'JSON', wraps: false },
  markdown: { id: 'markdown', label: 'Markdown', wraps: true },
  python: { id: 'python', label: 'Python', wraps: false },
  rust: { id: 'rust', label: 'Rust', wraps: false },
}

/** The names of a file (its last part, after any folder), each with the language it asks for. The first that matches wins. */
const BY_NAME: readonly (readonly [RegExp, CodeLanguageId])[] = [
  [/\.tsx$/i, 'tsx'],
  [/\.(ts|mts|cts)$/i, 'typescript'],
  [/\.jsx$/i, 'jsx'],
  [/\.(js|mjs|cjs)$/i, 'javascript'],
  [/\.(json|jsonc|json5)$|^\.(eslintrc|prettierrc|babelrc)$/i, 'json'],
  [/\.rs$/i, 'rust'],
  [/\.(py|pyw|pyi)$/i, 'python'],
  [/\.(css|scss|less)$/i, 'css'],
  [/\.(html?|vue|svelte|astro)$/i, 'html'],
  [/\.(md|markdown|mdx)$/i, 'markdown'],
]

/** The language of a language id, or null for a name that is not one. */
export function codeLanguageById(id: string): CodeLanguage | null {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, id) ? LANGUAGES[id as CodeLanguageId] : null
}

/** The language a file name or a path asks for (`src/main.rs` is Rust); null for plain text. */
export function codeLanguageOf(name: string): CodeLanguage | null {
  const file = name.split(/[\\/]/).pop() ?? name
  const found = BY_NAME.find(([pattern]) => pattern.test(file))
  return found ? LANGUAGES[found[1]] : null
}

const loading = new Map<CodeLanguageId, Promise<Extension>>()

async function load(id: CodeLanguageId): Promise<Extension> {
  switch (id) {
    case 'css': return (await import('@codemirror/lang-css')).css()
    case 'html': return (await import('@codemirror/lang-html')).html()
    case 'javascript': return (await import('@codemirror/lang-javascript')).javascript()
    case 'jsx': return (await import('@codemirror/lang-javascript')).javascript({ jsx: true })
    case 'typescript': return (await import('@codemirror/lang-javascript')).javascript({ typescript: true })
    case 'tsx': return (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true })
    case 'json': return (await import('@codemirror/lang-json')).json()
    case 'markdown': return (await import('@codemirror/lang-markdown')).markdown()
    case 'python': return (await import('@codemirror/lang-python')).python()
    case 'rust': return (await import('@codemirror/lang-rust')).rust()
  }
}

/**
 * The CodeMirror support of a language, loaded on the first ask and kept: a second ask for the same language is the
 * same promise. A language whose package fails to load is not kept, so the next ask tries again; the failure is the
 * caller's to meet (`CodeView` shows plain text).
 */
export function loadCodeLanguage(id: CodeLanguageId): Promise<Extension> {
  let pending = loading.get(id)
  if (!pending) {
    pending = load(id)
    loading.set(id, pending)
    pending.catch(() => loading.delete(id))
  }
  return pending
}
