// @vitest-environment node
// The design code checks (Marionette `design-file-integration`, 2026-11-20): new code that leaves DESIGN.md fails here.
// Two layers:
// 1. The zero-slop-design tool (a copy in tools/zero-slop-design, version in build-info.json): DESIGN.md lints clean,
//    and `check-code` finds no colour value, colour function, palette class, arbitrary dimension or font family that
//    DESIGN.md does not permit, nor a gradient, blur or emoji (`design-check.config.json`, known list
//    `design-check.known.json`). It reads only arbitrary utility values (`p-[13px]`).
// 2. The scale classes the tool does not read, checked here against the values of DESIGN.md's front matter: text sizes,
//    corner radii, shadows, weights, icon sizes, a border with a shadow on one element (R4), boxed key hints (R5),
//    loops and decorative effects. Accepted exceptions are listed in KNOWN with their reason.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const zsd = (...args: string[]) => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [join(root, 'tools/zero-slop-design/zsd.mjs'), ...args], { cwd: root, encoding: 'utf8' }) }
  } catch (e) {
    const err = e as { status: number; stdout: string }
    return { code: err.status, out: err.stdout }
  }
}

/* ———— DESIGN.md front matter: the values the rules permit ———— */

const design = readFileSync(join(root, 'DESIGN.md'), 'utf8')
const front = design.slice(design.indexOf('---') + 3, design.indexOf('\n---', 3))
/** The scalar values under a top-level key (or `x-zsd.<key>`), by name: `rounded`, `x-zsd.icons`. */
function group(path: string): Record<string, string> {
  const lines = front.split('\n')
  const parts = path.split('.')
  let indent = -2
  let i = 0
  for (const part of parts) {
    const want = indent + 2
    i = lines.findIndex((l, n) => n >= i && l === `${' '.repeat(want)}${part}:`)
    if (i < 0) throw new Error(`DESIGN.md has no ${path}`)
    indent = want
    i++
  }
  const out: Record<string, string> = {}
  for (; i < lines.length; i++) {
    const m = /^(\s*)([\w-]+):\s*(.*)$/.exec(lines[i]!)
    if (!m || m[1]!.length <= indent) break
    if (m[1]!.length === indent + 2 && m[3]) out[m[2]!] = m[3].replace(/^"|"$/g, '')
  }
  return out
}
/** Every `fontSize` / `fontWeight` of the typography roles. */
const typography = (prop: string) => [...front.matchAll(new RegExp(`^\\s{4}${prop}:\\s*(\\S+)`, 'gm'))].map((m) => m[1]!.replace('px', ''))
const px = (v: string) => Number.parseFloat(v)

const RADII = new Set(Object.values(group('rounded')).map(px))
const SIZES = new Set(typography('fontSize').map(Number))
const WEIGHTS = new Set(typography('fontWeight').map(Number))
const SHADOWS = new Set(Object.keys(group('x-zsd.elevation')).filter((k) => !k.endsWith('-dark')))
const ICONS = new Set(Object.values(group('x-zsd.icons')).filter((v) => v.endsWith('px')).map(px))
/** The font roles of the typography tokens: the interface stack (`font-sans`) and, if a role is set in a monospace stack, `font-mono`. */
const FAMILIES = new Set(['sans', ...([...front.matchAll(/^\s{4}fontFamily:\s*"([^"]*)"/gm)].some((m) => /monospace/.test(m[1]!)) ? ['mono'] : [])])

/* ———— The Tailwind scale as the toolkit sets it (theme.css `@theme`, then Tailwind's defaults) ———— */

const themeCss = readFileSync(join(root, 'src/styles/theme.css'), 'utf8')
const remPx = (v: string) => (v.endsWith('rem') ? Number.parseFloat(v) * 16 : Number.parseFloat(v))
const themeVar = (name: string): number | undefined => {
  const m = new RegExp(`--${name}:\\s*([\\d.]+(?:rem|px))`).exec(themeCss)
  return m ? remPx(m[1]!) : undefined
}
const TW_TEXT: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 }
const TW_RADIUS: Record<string, number> = { none: 0, xs: 2, sm: 4, '': 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, full: 9999 }
const TW_WEIGHT: Record<string, number> = { thin: 100, extralight: 200, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 }
const textPx = (name: string) => themeVar(`text-${name}`) ?? TW_TEXT[name]
const radiusPx = (name: string) => (name === 'none' || name === 'full' ? TW_RADIUS[name] : themeVar(`radius-${name || 'DEFAULT'}`) ?? TW_RADIUS[name])

/* ———— The sources ———— */

/** The colour sources (the theme engine, the catalog with the curated palettes, the generated first paint) and the font faces are the tokens themselves. */
// The generated icon drawings are the packs' own artwork, with the colours their authors drew.
const TOKEN_SOURCES = new Set(['theme-engine.ts', 'theme-catalog.ts', 'colors.ts', 'icon-packs.generated.ts', 'styles/theme.css', 'styles/fonts.css'])
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))
const sources = walk(join(root, 'src'))
  .filter((f) => /\.(tsx?|css)$/.test(f))
  .map((f) => ({ file: f.slice(join(root, 'src').length + 1), text: readFileSync(f, 'utf8') }))
  .filter((s) => !TOKEN_SOURCES.has(s.file))
/** The code without comments: a comment that names a forbidden class is not a use of it. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
/** Every class-like token of the code, with its variant prefix removed. */
function classes(text: string): { cls: string; base: string; line: string }[] {
  const out: { cls: string; base: string; line: string }[] = []
  for (const line of code(text).split('\n')) {
    for (const m of line.matchAll(/[\w\-:/.[\]&()*=>,%#!]+/g)) {
      const cls = m[0]
      const base = cls.replace(/^!?(?:[\w\-[\]&=*()>.,%#/]+:)+/, '').replace(/^!/, '')
      out.push({ cls, base, line })
    }
  }
  return out
}

/**
 * Accepted exceptions, each with the reason: `file: class`. Empty means every source follows the rules; an entry that
 * the code no longer contains fails the test, so the list only shrinks.
 */
const KNOWN: Record<string, string> = {}

function check(rule: string, bad: (c: { cls: string; base: string; line: string }, file: string) => boolean) {
  const found: string[] = []
  for (const s of sources) for (const c of classes(s.text)) if (bad(c, s.file)) found.push(`${s.file}: ${c.cls}`)
  const unknown = found.filter((f) => !(f in KNOWN))
  expect(unknown, `${rule}: not permitted by DESIGN.md`).toEqual([])
}

describe('DESIGN.md and the zero-slop-design code check', () => {
  test('DESIGN.md lints clean (format, tokens, references, contrast pairs, prose rules)', () => {
    const r = zsd('lint', join(root, 'DESIGN.md'), '--json')
    const report = JSON.parse(r.out) as { level: string; summary: { errors: number; warnings: number } }
    expect(report.summary, JSON.stringify(report)).toEqual({ errors: 0, warnings: 0, infos: 0 })
    expect(report.level).toBe('clean')
  })

  test('the source code passes check-code: colours, colour functions, palette classes, arbitrary sizes, fonts, effects', () => {
    const r = zsd('check-code', 'DESIGN.md', '--config', 'design-check.config.json', '--strict', '--json')
    const report = JSON.parse(r.out) as { errors: number; warnings: number; fixedKnown: unknown[]; findings: { rule: string; file: string; line: number; text: string }[] }
    // The findings of a failing run, to read in the test output.
    const listed = report.findings.map((f) => `${f.rule} ${f.file}:${f.line} ${f.text}`)
    expect(report.errors, listed.join('\n')).toBe(0)
    expect(report.warnings).toBe(0)
    // A known defect that is gone must leave the list (write it again with --update-known).
    expect(report.fixedKnown).toEqual([])
    expect(r.code).toBe(0)
  })

  test('the permitted values were read from DESIGN.md', () => {
    expect([...RADII].sort((a, b) => a - b)).toEqual([4, 6, 10, 9999])
    expect([...SIZES].sort((a, b) => a - b)).toEqual([12, 13, 14, 16, 18, 20, 24]) // 18, 20 and 24: the titles of an app's pages (2026-11-22)
    expect([...WEIGHTS].sort()).toEqual([400, 500, 600])
    expect(SHADOWS).toEqual(new Set(['xs', 'sm', 'md', 'lg', 'float']))
    expect([...ICONS].sort((a, b) => a - b)).toEqual([8, 14, 16])
    expect([...FAMILIES].sort()).toEqual(['mono', 'sans'])
  })
})

describe('the scale classes against DESIGN.md (what check-code does not read)', () => {
  test('text sizes come from the typography tokens (R7)', () => {
    check('text size', ({ base }) => {
      const m = /^text-(2xs|xs|sm|base|lg|xl|[2-9]xl)$/.exec(base)
      if (m) return !SIZES.has(textPx(m[1]!) ?? -1)
      return /^text-\[\d/.test(base)
    })
  })

  test('corner radii are l1/l2/l3 or round (R7: 4, 6, 10px)', () => {
    check('radius', ({ base }) => {
      const m = /^rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?(?:-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|full))?$/.exec(base)
      if (m) return m[1] !== 'none' && !RADII.has(radiusPx(m[1] ?? '') ?? -1)
      return /^rounded(?:-\w+)?-\[(?!inherit\])/.test(base)
    })
  })

  test('shadows are the elevation tokens, never an arbitrary value', () => {
    check('shadow', ({ base }) => (/^shadow-(?!none$)([\w-]+)$/.test(base) && !SHADOWS.has(base.slice(7)) && !/^shadow-(\w+-)*(ink|drop|paper|line|accent|primary)/.test(base)) || /^shadow-\[/.test(base))
  })

  test('font families are the roles of the typography tokens: the interface (font-sans) and inline code (font-mono)', () => {
    check('font family', ({ base }) => {
      const m = /^font-(sans|mono|serif|hand|\[.*)$/.exec(base)
      return m !== null && !FAMILIES.has(m[1]!)
    })
  })

  test('weights are 400, 500 and 600 (R7)', () => {
    check('weight', ({ base }) => {
      const m = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.exec(base)
      return m !== null && !WEIGHTS.has(TW_WEIGHT[m[1]!]!)
    })
  })

  test('icons are 16 or 14px, dots 8px (R7, R10)', () => {
    const iconPx = (n: string) => Number.parseFloat(n) * 4
    for (const s of sources) {
      const icons = new Set(['Icon', ...[...s.text.matchAll(/import \{([^}]+)\} from ['"]lucide-react['"]/g)].flatMap((m) => m[1]!.split(',').map((x) => x.trim().split(/\s+as\s+/).pop()!))])
      const bad: string[] = []
      for (const m of code(s.text).matchAll(/<([A-Z]\w*)\b[^>]*?className=(?:"([^"]*)"|\{[^}]*?['"`]([^'"`]*)['"`])/g)) {
        if (!icons.has(m[1]!)) continue
        const size = /(?:^|\s)size-(\d+(?:\.\d+)?)(?:\s|$)/.exec(m[2] ?? m[3] ?? '')
        if (size && !ICONS.has(iconPx(size[1]!))) bad.push(`${s.file}: <${m[1]} size-${size[1]}>`)
      }
      for (const m of code(s.text).matchAll(/\[&(?:>|_)svg[^\]]*\]:size-(\d+(?:\.\d+)?)/g)) if (!ICONS.has(iconPx(m[1]!))) bad.push(`${s.file}: svg size-${m[1]}`)
      expect(bad.filter((b) => !(b in KNOWN))).toEqual([])
    }
  })

  test('a border or a shadow, never both on one element (R4)', () => {
    const bad: string[] = []
    for (const s of sources) {
      for (const str of code(s.text).matchAll(/(['"`])((?:(?!\1).)*)\1/g)) {
        const list = str[2]!.split(/\s+/)
        const border = list.some((c) => /^border(?:-[trblxy])?(?:-[0-9])?$/.test(c))
        const shadow = list.some((c) => /^shadow-(xs|sm|md|lg|float)$/.test(c))
        if (border && shadow) bad.push(`${s.file}: "${str[2]!.slice(0, 80)}"`)
      }
    }
    expect(bad.filter((b) => !(b in KNOWN))).toEqual([])
  })

  test('key hints are plain text (R5): no fill and no border on a <kbd>', () => {
    const bad: string[] = []
    for (const s of sources) for (const m of code(s.text).matchAll(/<kbd\b[^>]*className=["'{`]([^"'`}]*)/g)) if (/(?:^|\s)(bg-|border|rounded|shadow-)/.test(m[1]!)) bad.push(`${s.file}: ${m[1]}`)
    expect(bad).toEqual([])
  })

  test('no loops, gradients or blur (motion rules; must-avoid)', () => {
    check('effect', ({ base }) => /^animate-(?!none$)/.test(base) || /^(bg-(linear|radial|conic|gradient)|from|via|to)-/.test(base) || /^(backdrop-)?blur(-|$)/.test(base))
  })

  test('the known list holds only exceptions the code still contains', () => {
    for (const entry of Object.keys(KNOWN)) {
      const [file, cls] = entry.split(': ') as [string, string]
      expect(sources.find((s) => s.file === file)?.text ?? '', entry).toContain(cls)
    }
  })
})
