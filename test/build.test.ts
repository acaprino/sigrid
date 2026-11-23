// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, test } from 'vitest'
import { themeTokens } from '../src/theme-engine'
import { BASE_THEME } from '../src/themes'

// RULE FOR WHOEVER WRITES TESTS HERE: Tailwind also scans `test/` (the automatic scan starts from the package
// folder). A class name with a variant written out in full in a test (for example a breakpoint or container
// prefix followed by the class) generates the rule in the compiled CSS, and the checks on `dist/styles.css` pass even
// when the source has lost it. In tests, variant names are composed with `+`, never in a single literal; in
// CSS selectors they are written with escape slashes, as below.
export const root = fileURLToPath(new URL('../', import.meta.url))
export const css = () => readFileSync(`${root}dist/styles.css`, 'utf8')

/** Removes every `@media (prefers-reduced-motion: no-preference) { … }` block, balancing the braces. */
export function outsideReducedMotion(text: string): string {
  const marker = '@media (prefers-reduced-motion: no-preference)'
  let out = ''
  let i = 0
  for (;;) {
    const at = text.indexOf(marker, i)
    if (at < 0) return out + text.slice(i)
    out += text.slice(i, at)
    let depth = 0
    let j = text.indexOf('{', at)
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++
      else if (text[j] === '}' && --depth === 0) break
    }
    i = j + 1
  }
}

/** The at-rules (`@media …`, `@supports …`) that enclose position `index` of the CSS, from the outermost. */
export function enclosingAtRules(text: string, index: number): string[] {
  const stack: string[] = []
  let start = 0
  for (let i = 0; i < index; i++) {
    const ch = text[i]
    if (ch === '{') {
      stack.push(text.slice(start, i).trim())
      start = i + 1
    } else if (ch === '}') {
      stack.pop()
      start = i + 1
    } else if (ch === ';') start = i + 1
  }
  return stack.filter((s) => s.startsWith('@')).map((s) => s.replace(/\s+/g, ' '))
}

/**
 * The declarations that the compiled CSS gives to an element through its classes, each with the conditions
 * (`@media`, `@supports`) that enclose it: this is the CSS the browser applies, not the class names.
 */
export function declarationsOf(classes: string, text = css()): { prop: string; value: string; conditions: string[] }[] {
  const found: { prop: string; value: string; conditions: string[] }[] = []
  for (const cls of classes.split(/\s+/).filter(Boolean)) {
    const selector = '.' + cls.replace(/[^a-zA-Z0-9_-]/g, '\\$&') + ' {'
    for (let at = text.indexOf(selector); at >= 0; at = text.indexOf(selector, at + 1)) {
      const conditions = enclosingAtRules(text, at).filter((c) => c.startsWith('@media') || c.startsWith('@supports'))
      const body = text.slice(at + selector.length, text.indexOf('}', at))
      for (const d of body.split(';')) {
        const colon = d.indexOf(':')
        if (colon > 0) found.push({ prop: d.slice(0, colon).trim(), value: d.slice(colon + 1).trim(), conditions })
      }
    }
  }
  return found
}

/** The value of the `class` attribute of the element the component renders, read from the HTML (not from the source). */
export function classesOf(element: Parameters<typeof renderToStaticMarkup>[0], tag: string): string {
  const html = renderToStaticMarkup(element)
  const match = new RegExp(`<${tag}\\b[^>]*\\sclass="([^"]*)"`).exec(html)
  expect(match, tag).not.toBeNull()
  return match![1]!
}

beforeAll(() => {
  execFileSync('node', ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' })
}, 180_000)

describe('build output', () => {
  test('emits the four artifacts', () => {
    for (const f of ['dist/index.js', 'dist/index.d.ts', 'dist/styles.css', 'dist/fonts/inter-0.woff2']) {
      expect(existsSync(`${root}${f}`), f).toBe(true)
    }
  })

  test('no file of dist is CommonJS: no entry and no chunk ever require()s, so each is an ES module a browser runs as it is (Base UI, use-sync-external-store, React Flow)', () => {
    const js = (dir: string) => readdirSync(`${root}${dir}`).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`)
    const files = [...js('dist'), ...js('dist/chunks')]
    expect(files).toContain('dist/graph.js')
    for (const f of files) expect(readFileSync(`${root}${f}`, 'utf8'), f).not.toMatch(/__require\(|require\(["']react|module\.exports/)
  })

  test("the graph's entry takes React's compiler runtime from the app, and has none of its own", () => {
    const graph = readFileSync(`${root}dist/graph.js`, 'utf8')
    expect(graph).toMatch(/from\s*["']react\/compiler-runtime["']/)
    expect(graph).not.toMatch(/\$dispatcherGuard|useRenderCounter/)
  })

  test('styles.css has no infinite animation (INV-008, test/provenance.test.ts)', () => {
    expect(css()).not.toMatch(/infinite/)
  })

  test('styles.css carries the theme tokens and the body rule', () => {
    const c = css()
    for (const t of [
      '--color-paper', '--color-paper-2', '--color-ink', '--color-ink-soft', '--color-ink-mute', '--color-line',
      '--color-accent', '--color-accent-soft', '--color-raised', '--radius-md', '--shadow-float', '--font-sans', '--font-mono',
    ]) expect(c, t).toContain(t)
    // The value is the first paint's (the gray baseline), computed by the engine (test/first-paint.test.ts).
    expect(c).toMatch(new RegExp(`--color-accent:\\s*${themeTokens(BASE_THEME, 'light').colors['accent']}`))
    expect(c).toMatch(/body\s*\{[^}]*var\(--color-paper\)/)
    expect(c).toContain('@font-face')
    expect(c).toContain('url(./fonts/inter-0.woff2)')
  })

  test('styles.css carries the muted text colors of theme.css, not an old copy', () => {
    const theme = readFileSync(`${root}src/styles/theme.css`, 'utf8')
    const c = css()
    for (const k of ['ink-mute', 'muted-foreground']) {
      const want = theme.match(new RegExp(`--color-${k}:\\s*(#[0-9a-fA-F]{6})`))![1]!.toLowerCase()
      expect(c.toLowerCase(), k).toMatch(new RegExp(`--color-${k}:\\s*${want}`))
    }
  })

  test('the 44px touch sizes exist only for a coarse pointer, and 11 spacing units are 44px', () => {
    const c = css()
    const conditions = (rule: string) => {
      const at = c.indexOf(rule)
      expect(at, rule).toBeGreaterThan(-1)
      return enclosingAtRules(c, at).filter((s) => s.startsWith('@media'))
    }
    // Selectors written with escape slashes (not whole class names: Tailwind also scans `test/`).
    for (const rule of [
      '.pointer-coarse\\:min-h-11 {',
      '.pointer-coarse\\:min-w-11 {',
      '.pointer-coarse\\:size-11 {',
      '.pointer-coarse\\:after\\:-inset-4\\.5::after {',
    ]) expect(conditions(rule), rule).toEqual(['@media (pointer: coarse)'])
    // 1 unit = 0.25rem = 4px: 11 units are 44px.
    expect(c).toMatch(/--spacing:\s*0\.25rem/)
  })

  test('the bottom room of the sheets (the space of the toasts) exists at every width, not inside a media query', () => {
    const c = css()
    const at = c.indexOf('padding-bottom: max(1.5rem, calc(var(--toasts-room')
    expect(at).toBeGreaterThan(-1)
    expect(enclosingAtRules(c, at).filter((s) => s.startsWith('@media'))).toEqual([])
  })

  test('the toast layer exists in the compiled CSS above the overlay layer', () => {
    const c = css()
    expect(c).toMatch(/\.z-\\\[70\\\]\s*\{\s*z-index:\s*70/)
    expect(c).toMatch(/\.z-50\s*\{\s*z-index:\s*50/)
  })

  test('no automatic motion', () => {
    const rest = outsideReducedMotion(css())
    expect(rest).not.toMatch(/animation-iteration-count:\s*infinite/)
    expect(rest).not.toMatch(/\banimation\s*:/)
    // `transition-property: none` (class transition-none) is not motion.
    expect(rest.replace(/transition-property:\s*none/g, '')).not.toMatch(/transition-property\s*:/)
  })

  // Motion (about 236 KB unminified) lives in a separate chunk, loaded with `import()` only when animations are on.
  // Without `splitting: true` in `scripts/build.mjs` esbuild raises no error: it puts everything back in `index.js` and every client pays
  // for Motion even with animations off.
  describe('Motion stays in a separate chunk, loaded lazily (splitting)', () => {
    const dist = `${root}dist/`
    const chunks = () => readdirSync(`${dist}chunks`).filter((f) => /^motion-impl-.+\.js$/.test(f))
    const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    test('dist/chunks/motion-impl-*.js exists and holds Motion', () => {
      expect(chunks()).toHaveLength(1)
      const file = `${dist}chunks/${chunks()[0]}`
      expect(readFileSync(file, 'utf8')).toMatch(/AnimatePresence/)
      expect(statSync(file).size).toBeGreaterThan(100_000)
    })

    /** An entry and every chunk it imports statically, however far: what a page loads when it imports the entry. */
    const loaded = (entry: string): Map<string, string> => {
      const seen = new Map<string, string>()
      const visit = (file: string) => {
        if (seen.has(file)) return
        const js = readFileSync(`${dist}${file}`, 'utf8')
        seen.set(file, js)
        for (const m of js.matchAll(/(?:from|import)\s*["'](\.\.?\/[^"']+\.js)["']/g)) visit(file.startsWith('chunks/') ? `chunks/${m[1]!.replace(/^\.\//, '')}` : m[1]!.replace(/^\.\//, ''))
      }
      visit(entry)
      return seen
    }
    const ENTRIES = ['index.js', 'table.js', 'virtual.js', 'reorder.js', 'rich-text.js', 'graph.js']

    // Since the package has more than one entry, the code that asks for Motion can sit in a chunk the entries share.
    test('what index.js loads reaches that chunk only through one dynamic import(), never a static import', () => {
      const name = escape(chunks()[0]!)
      const all = [...loaded('index.js').values()].join('\n')
      expect(all.match(new RegExp(`import\\(\\s*["']\\.(?:/chunks)?/${name}["']\\s*\\)`, 'g'))).toHaveLength(1)
      // A static import has the form `from "./chunks/…"` or `import "./chunks/…"`.
      expect(all).not.toMatch(new RegExp(`(?:from|import)\\s*["']\\.(?:/chunks)?/${name}`))
    })

    test('no entry, nor the chunks it imports statically, contains Motion', () => {
      const motion = /AnimatePresence|LazyMotion|MotionConfig/
      for (const entry of ENTRIES) {
        const files = loaded(entry)
        if (entry === 'index.js') expect(files.size, 'index.js imports at least the shared chunk').toBeGreaterThan(1)
        for (const [file, js] of files) expect(js, `${entry} → ${file}`).not.toMatch(motion)
      }
    })

    // The libraries of the other entries are for the apps that import those entries: the main one loads none of them.
    test('index.js loads none of the libraries of the other entries', () => {
      for (const [file, js] of loaded('index.js')) expect(js, file).not.toMatch(/node_modules\/(?:@tanstack|@dnd-kit|@tiptap|prosemirror[\w-]*|@xyflow|@dagrejs)\//)
    })

    test('each of the other entries holds its own library, and the table and the lists do not load the text editor', () => {
      const has = (entry: string, library: RegExp) => [...loaded(entry).values()].some((js) => library.test(js))
      expect(has('table.js', /node_modules\/@tanstack\/(?:react-)?table/)).toBe(true)
      expect(has('virtual.js', /node_modules\/@tanstack\/(?:react-)?virtual/)).toBe(true)
      expect(has('reorder.js', /node_modules\/@dnd-kit\//)).toBe(true)
      expect(has('rich-text.js', /node_modules\/@tiptap\//)).toBe(true)
      expect(has('graph.js', /node_modules\/@xyflow\//)).toBe(true)
      expect(has('graph.js', /node_modules\/@dagrejs\//)).toBe(true)
      for (const entry of ['table.js', 'virtual.js', 'reorder.js', 'graph.js']) expect(has(entry, /node_modules\/(?:@tiptap|prosemirror[\w-]*)\//), entry).toBe(false)
    })
  })

  test('index.js keeps React external and bundles nothing from tailwind', () => {
    const js = readFileSync(`${root}dist/index.js`, 'utf8')
    // While the barrel is empty (Task 2) there is nothing to check; Task 9 enforces the sixteen exports.
    if (js.trim()) expect(js).toMatch(/from\s*"react"/)
    expect(js).not.toMatch(/node_modules\/tailwindcss\//)
  })
})

import * as UI from '../src'

describe('package invariants', () => {
  test('the toolkit carries no app component: an app\'s product components live in its own package', () => {
    // `Sidebar` left this list on 2026-11-22 (the owner's decision): the list is for what is specific to one app (its
    // task list, its sheets), and the toolkit's sidebar is the generic navigation of any app (groups of rows, a rail,
    // a search, a drawer).
    const product = ['FocusStrip', 'Gate', 'Kanban', 'Shell', 'SortCard', 'Stack', 'TaskList', 'TaskSheet', 'ViewHeader']
    expect(Object.keys(UI).filter((k) => product.includes(k))).toEqual([])
    // And no app concept in the sources' names.
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]))
    expect(walk(`${root}src`).map((f) => f.slice(root.length)).filter((f) => /(^|[/._-])(task|stack|sort|kanban|area|project|inbox|section)/i.test(f))).toEqual([])
  })

  test('the documented utility families are in styles.css', () => {
    const c = css()
    for (const cls of ['.bg-paper', '.bg-paper-2', '.text-ink-soft', '.text-ink-mute', '.border-line', '.bg-accent', '.text-accent', '.rounded-md', '.shadow-float', '.font-mono', '.gap-4', '.p-6', '.truncate']) {
      expect(c, cls).toMatch(new RegExp(`${cls.replace(/[.-]/g, '\\$&')}\\s*\\{`))
    }
  })

  test('no emoji in component sources', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]))
    for (const f of walk(`${root}src/components`)) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    }
  })
})
