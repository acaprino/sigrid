// The languages of the code view (src/assemblies/code-languages.ts): found by the name of a file, loaded on first ask.
import { LanguageSupport } from '@codemirror/language'
import { describe, expect, test } from 'vitest'
import { codeLanguageById, codeLanguageOf, loadCodeLanguage, type CodeLanguageId } from '../src/code'

describe('codeLanguageOf: the language a name asks for', () => {
  test.each([
    ['main.rs', 'rust'],
    ['src/lib/main.rs', 'rust'],
    ['C:\\work\\app\\index.ts', 'typescript'],
    ['a.mts', 'typescript'],
    ['App.tsx', 'tsx'],
    ['util.js', 'javascript'],
    ['util.mjs', 'javascript'],
    ['App.jsx', 'jsx'],
    ['package.json', 'json'],
    ['tsconfig.jsonc', 'json'],
    ['.eslintrc', 'json'],
    ['.prettierrc', 'json'],
    ['script.py', 'python'],
    ['types.pyi', 'python'],
    ['site.css', 'css'],
    ['site.scss', 'css'],
    ['index.html', 'html'],
    ['Page.vue', 'html'],
    ['README.md', 'markdown'],
    ['notes.markdown', 'markdown'],
    ['Page.MDX', 'markdown'],
    ['UPPER.RS', 'rust'],
  ] as const)('%s is %s', (name, id) => {
    expect(codeLanguageOf(name)?.id).toBe(id)
  })

  test.each(['Makefile', 'notes.txt', 'archive.tar.gz', 'rs', '.gitignore', 'dir.rs/file', ''])('%j is plain text', (name) => {
    expect(codeLanguageOf(name)).toBeNull()
  })

  test('says the name to put in a status line, and that prose wraps and code does not', () => {
    expect(codeLanguageOf('a.tsx')).toMatchObject({ label: 'TypeScript', wraps: false })
    expect(codeLanguageOf('a.jsx')).toMatchObject({ label: 'JavaScript', wraps: false })
    expect(codeLanguageOf('a.md')).toMatchObject({ label: 'Markdown', wraps: true })
  })
})

describe('codeLanguageById', () => {
  test('is a language, or null for what is not one (also what an object inherits)', () => {
    expect(codeLanguageById('python')?.label).toBe('Python')
    expect(codeLanguageById('cobol')).toBeNull()
    expect(codeLanguageById('constructor')).toBeNull()
    expect(codeLanguageById('toString')).toBeNull()
  })
})

describe('loadCodeLanguage: loaded on the first ask, kept after it', () => {
  const IDS: CodeLanguageId[] = ['css', 'html', 'javascript', 'jsx', 'typescript', 'tsx', 'json', 'markdown', 'python', 'rust']

  test.each(IDS)('%s gives the support of a language', async (id) => {
    const support = await loadCodeLanguage(id)
    expect(support).toBeInstanceOf(LanguageSupport)
  })

  test('the same language asked twice is the same promise', () => {
    expect(loadCodeLanguage('rust')).toBe(loadCodeLanguage('rust'))
  })

  test('the tags of JSX are in jsx and tsx, and not in the plain languages: the grammars differ', async () => {
    const parse = async (id: CodeLanguageId, code: string) => ((await loadCodeLanguage(id)) as LanguageSupport).language.parser.parse(code).toString()
    const tagged = 'const a = <div/>'
    expect(await parse('jsx', tagged)).not.toContain('⚠')
    expect(await parse('tsx', tagged)).not.toContain('⚠')
    expect(await parse('javascript', tagged)).toContain('⚠')
    expect(await parse('typescript', tagged)).toContain('⚠')
    expect(await parse('typescript', 'const x: number = 1')).toContain('TypeAnnotation')
  })
})
