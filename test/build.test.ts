// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { beforeAll, describe, expect, test } from 'vitest'
import { themeTokens } from '../src/theme-engine'
import { BASE_THEME } from '../src/themes'
import { root, walk } from './helpers'

// RULE FOR WHOEVER WRITES TESTS HERE: Tailwind also scans `test/` (the automatic scan starts from the package
// folder). A class name with a variant written out in full in a test (for example a breakpoint or container
// prefix followed by the class) generates the rule in the compiled CSS, and the checks on `dist/styles.css` pass even
// when the source has lost it. In tests, variant names are composed with `+`, never in a single literal; in
// CSS selectors they are written with escape slashes, as below.
const css = () => readFileSync(`${root}dist/styles.css`, 'utf8')

/** Removes every `@media (prefers-reduced-motion: no-preference) { … }` block, balancing the braces. */
function outsideReducedMotion(text: string): string {
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
function enclosingAtRules(text: string, index: number): string[] {
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

  test('the looks a theme asks for by name are compiled, each under its attribute and nowhere else', () => {
    const c = css()
    // Boxed keys (`ThemeDef.keys`): the cap of a key under `[data-keys=boxed]`, and its hairline inside a button.
    expect(c).toMatch(/\[data-keys=["']?boxed["']?\]\s+(?:&|\.|\[data-slot=["']?button["']?\])/)
    // Strong control borders (`ThemeDef.controls`): inside `:where()`, so the rule is as weak as the divider it
    // replaces and the invalid red and every state still win over it.
    expect(c).toMatch(/:where\(\[data-controls=["']?strong["']?\]\)\s+(?:&|\.)/)
    // The tone of a badge: the `info` status colour and its soft ground, as tokens and as utilities.
    for (const scheme of ['light', 'dark'] as const) {
      const t = themeTokens(BASE_THEME, scheme).colors
      expect(c.toLowerCase()).toMatch(new RegExp(`--color-info:\\s*${t['info']}`))
      expect(c.toLowerCase()).toMatch(new RegExp(`--color-info-soft:\\s*${t['info-soft']}`))
    }
    // Joined with `+`, so these names are not classes Tailwind reads from this file.
    for (const cls of ['.bg-' + 'info-soft', '.text-' + 'info', '.bg-' + 'success-soft', '.bg-' + 'warning-soft', '.bg-' + 'destructive-soft']) expect(c, cls).toMatch(new RegExp(`${cls.replace(/[.-]/g, '\\$&')}\\s*\\{`))
  })

  test('bold tabs, a tall status strip and the system font are compiled, each under its attribute', () => {
    const c = css()
    const under = (attribute: string) => new RegExp(`${attribute.replace(/[[\]=-]/g, '\\$&')}\\s+(?:&|\\.|\\[data-slot)`)
    // `ThemeDef.tabs`: the view of a bar, the item of a segment, and the label that keeps their width.
    expect(c).toMatch(under('[data-tabs=bold]'))
    // `ThemeDef.statusStrip`.
    expect(c).toMatch(under('[data-status-strip=tall]'))
    // The line of the chosen view eases its scale only with motion on, inside the reduced-motion gate.
    const rule = c.search(/\[data-slot=["']?toolbar-tab["']?\]:{1,2}after/)
    expect(rule).toBeGreaterThan(-1)
    expect(c.slice(rule, c.indexOf('}', rule))).toMatch(/transition:\s*scale /)
    expect(enclosingAtRules(c, rule).some((at) => at.includes('prefers-reduced-motion: no-preference') || at.includes('prefers-reduced-motion:no-preference'))).toBe(true)
    // The line keeps clear of the edge it is near (3px of the spacing scale), and the bar is 2px taller for it.
    expect(c).toMatch(/bottom:\s*calc\(var\(--spacing\)\s*\*\s*0?\.75\)/)
    expect(c).toMatch(/top:\s*calc\(var\(--spacing\)\s*\*\s*0?\.75\)/)
    const bar = c.search(/\[data-tabs=["']?bold["']?\]\s+\[data-slot=["']?title-bar["']?\]:not\(/)
    expect(bar).toBeGreaterThan(-1)
    expect(c.slice(bar, c.indexOf('}', bar))).toMatch(/min-height:\s*calc\(var\(--titlebar-height\)\s*\+\s*\.?0?\.?125rem\)/)
    // The system font: its monospace follows `data-font`, outside the layers; no face is shipped for either.
    const font = c.search(/\[data-font=["']?system["']?\]/)
    expect(font).toBeGreaterThan(-1)
    expect(c.slice(font, c.indexOf('}', font))).toContain('Cascadia Mono')
    expect(enclosingAtRules(c, font).some((at) => at.startsWith('@layer'))).toBe(false)
    expect(c).not.toMatch(/@font-face[^}]*(?:Segoe|Cascadia)/)
  })

  test('glass is compiled under its attribute on the root, outside the layers, shut with forced colours and with less transparency asked', () => {
    const c = css()
    // The frame that paints no ground, with what keeps a sample inside a work area as it was.
    const frame = c.search(/\[data-material=["']?glass["']?\][^{}]*\[data-slot=["']?title-bar["']?\][^{}]*:not\(\[data-slot=["']?app-shell-work["']?\]\s*\*\)/)
    expect(frame, 'the frame under glass').toBeGreaterThan(-1)
    const ground = c.search(/\[data-material=["']?glass["']?\]\s+body\s*\{/)
    expect(ground, 'the ground under glass').toBeGreaterThan(-1)
    expect(c.slice(ground, c.indexOf('}', ground))).toMatch(/background-color:\s*var\(--glass-ground,\s*var\(--color-paper\)\)/)
    for (const at of [frame, ground]) {
      const rules = enclosingAtRules(c, at)
      expect(rules.some((rule) => rule.startsWith('@layer'))).toBe(false)
      const media = rules.filter((rule) => rule.startsWith('@media')).join(' ')
      expect(media).toMatch(/forced-colors:\s*none/)
      expect(media).toMatch(/prefers-reduced-transparency:\s*no-preference/)
    }
    // Every rule that names the material is in that gate.
    for (const m of c.matchAll(/\[data-material/g)) expect(enclosingAtRules(c, m.index).join(' ')).toMatch(/prefers-reduced-transparency:\s*no-preference/)
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
    const ENTRIES = ['index.js', 'table.js', 'virtual.js', 'reorder.js', 'rich-text.js', 'graph.js', 'terminal.js', 'code.js', 'tauri.js']

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
      for (const [file, js] of loaded('index.js')) expect(js, file).not.toMatch(/node_modules\/(?:@tanstack|@dnd-kit|@tiptap|prosemirror[\w-]*|@xyflow|@dagrejs|@xterm|@codemirror|@lezer)\//)
    })

    test('each of the other entries holds its own library, and the table and the lists do not load the text editor', () => {
      const has = (entry: string, library: RegExp) => [...loaded(entry).values()].some((js) => library.test(js))
      expect(has('table.js', /node_modules\/@tanstack\/(?:react-)?table/)).toBe(true)
      expect(has('virtual.js', /node_modules\/@tanstack\/(?:react-)?virtual/)).toBe(true)
      expect(has('reorder.js', /node_modules\/@dnd-kit\//)).toBe(true)
      expect(has('rich-text.js', /node_modules\/@tiptap\//)).toBe(true)
      expect(has('graph.js', /node_modules\/@xyflow\//)).toBe(true)
      expect(has('graph.js', /node_modules\/@dagrejs\//)).toBe(true)
      expect(has('terminal.js', /node_modules\/@xterm\/xterm\//)).toBe(true)
      expect(has('terminal.js', /node_modules\/@xterm\/addon-fit\//)).toBe(true)
      expect(has('code.js', /node_modules\/@codemirror\/view\//)).toBe(true)
      expect(has('code.js', /node_modules\/@lezer\/highlight\//)).toBe(true)
      for (const entry of ['table.js', 'virtual.js', 'reorder.js', 'graph.js']) expect(has(entry, /node_modules\/(?:@tiptap|prosemirror[\w-]*)\//), entry).toBe(false)
      // The terminal and the code view do not load each other's library, nor the others' libraries.
      expect(has('terminal.js', /node_modules\/(?:@codemirror|@lezer)\//)).toBe(false)
      expect(has('code.js', /node_modules\/@xterm\//)).toBe(false)
      for (const entry of ['terminal.js', 'code.js']) expect(has(entry, /node_modules\/(?:@tiptap|prosemirror[\w-]*|@tanstack|@xyflow|@dagrejs|@dnd-kit)\//), entry).toBe(false)
    })

    // The terminal takes its own stylesheet with it (xterm's, put in the page by the part), so an app imports no CSS for it,
    // and the languages of the code view are chunks of their own, loaded when a file of them is shown.
    test('terminal.js carries xterm\'s stylesheet as text, and no entry has a CSS file of its own for it', () => {
      const all = [...loaded('terminal.js').values()].join('\n')
      expect(all).toMatch(/\.xterm\s*\{/)
      expect(all).toContain('sigrid-xterm')
      expect(existsSync(`${dist}terminal.css`)).toBe(false)
      expect(existsSync(`${dist}code.css`)).toBe(false)
    })

    test('code.js loads no language by a static import: each is behind import(), so a view of plain text loads none', () => {
      const all = [...loaded('code.js').values()].join('\n')
      for (const lezer of ['@lezer/rust', '@lezer/python', '@lezer/css', '@lezer/html', '@lezer/javascript', '@lezer/json', '@lezer/markdown']) expect(all, lezer).not.toContain(`node_modules/${lezer}/`)
      expect(readFileSync(`${dist}code.js`, 'utf8').match(/import\(\s*["']\.\/chunks\//g)?.length).toBeGreaterThanOrEqual(7)
    })

    // The Tauri entry: its own file with its types, Tauri's API outside the bundle and asked for only with `import()`,
    // and nothing of it in what the main entry loads.
    test('tauri.js and tauri.d.ts exist, and Tauri\'s API is reached only through import(), never bundled', () => {
      expect(existsSync(`${dist}tauri.d.ts`)).toBe(true)
      expect(readFileSync(`${dist}tauri.d.ts`, 'utf8')).toMatch(/from '\.\/tauri\/index'/)
      const all = [...loaded('tauri.js').values()].join('\n')
      expect(all).toMatch(/import\(\s*["']@tauri-apps\/api\/window["']\s*\)/)
      expect(all).not.toMatch(/(?:from|import)\s*["']@tauri-apps\//)
      expect(all).not.toMatch(/__TAURI_INTERNALS__\.invoke|node_modules\/@tauri-apps\//)
      for (const [file, js] of loaded('index.js')) expect(js, file).not.toMatch(/@tauri-apps|__TAURI_INTERNALS__/)
    })
  })

  test('index.js keeps React external and bundles nothing from tailwind', () => {
    const js = readFileSync(`${root}dist/index.js`, 'utf8')
    // While the barrel is empty (Task 2) there is nothing to check; Task 9 enforces the sixteen exports.
    if (js.trim()) expect(js).toMatch(/from\s*"react"/)
    expect(js).not.toMatch(/node_modules\/tailwindcss\//)
  })
})

import * as UI from './all'

describe('package invariants', () => {
  test('the toolkit carries no app component: an app\'s product components live in its own package', () => {
    // `Sidebar` left this list on 2026-11-22 (the owner's decision): the list is for what is specific to one app (its
    // task list, its sheets), and the toolkit's sidebar is the generic navigation of any app (groups of rows, a rail,
    // a search, a drawer).
    const product = ['FocusStrip', 'Gate', 'Kanban', 'Shell', 'SortCard', 'Stack', 'TaskList', 'TaskSheet', 'ViewHeader']
    expect(Object.keys(UI).filter((k) => product.includes(k))).toEqual([])
    // And no app concept in the sources' names.
    expect(walk(`${root}src`).map((f) => f.slice(root.length)).filter((f) => /(^|[/._-])(task|stack|sort|kanban|area|project|inbox|section)/i.test(f))).toEqual([])
  })

  test('the documented utility families are in styles.css', () => {
    const c = css()
    for (const cls of ['.bg-paper', '.bg-paper-2', '.text-ink-soft', '.text-ink-mute', '.border-line', '.bg-accent', '.text-accent', '.rounded-md', '.shadow-float', '.font-mono', '.gap-4', '.p-6', '.truncate']) {
      expect(c, cls).toMatch(new RegExp(`${cls.replace(/[.-]/g, '\\$&')}\\s*\\{`))
    }
  })

  test('no emoji in component sources', () => {
    for (const f of walk(`${root}src/components`)) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    }
  })
})
