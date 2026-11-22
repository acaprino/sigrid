// @vitest-environment node
// The toolkit rests on Ark UI for behaviour (with Base UI under the basic controls and the surfaces that open), on Park UI's recipes for
// form and on SmoothUI for part of the look; the motion is its own code on Fluent 2's token values: INV-007 (provenance and dependencies) and
// INV-008 (no decorative components, no infinite motion, no springs). An app's product package
// has its own provenance test for its product components.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const rel = (file: string) => relative(root, file).replaceAll('\\', '/')
const srcFiles = walk(join(root, 'src'))
const codeFiles = srcFiles.filter((f) => /\.(tsx?|css)$/.test(f))
const SMOOTH = {
  name: 'SmoothUI',
  header: /\/\/ SmoothUI \(MIT\) ([a-z0-9-]+) 4\.0\.0 — adapted for @acaprino\/sigrid \(https:\/\/smoothui\.dev\/r\/base-nova\/\1\.json\)/,
  mark: '// SmoothUI (MIT)',
  url: (slug: string) => `https://smoothui.dev/r/base-nova/${slug}.json`,
}
const PARK_COMMIT = '102769cc91a9d36753dbc5893c74b7954b495efe'
/** The commit of microsoft/fluentui at which the motion token values were read. */
const FLUENT_COMMIT = 'a568b4db7806f8642ab4ad296d2c80ad512de8a8'
const PARK = {
  name: 'Park UI',
  header: /\/\/ Park UI \(MIT\) ([a-z0-9-]+) 102769c — recipe translated to Tailwind for @acaprino\/sigrid \(https:\/\/github\.com\/chakra-ui\/park-ui\/blob\/102769c\/packages\/preset\/src\/recipes\/\1\.ts\)/,
  mark: '// Park UI (MIT)',
  url: (slug: string) => `https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/${slug}.ts`,
}
type Source = typeof SMOOTH

/** The rows of one source's table in THIRD_PARTY.md (the section `## <name>`): file → slug. */
function listed(source: Source): Map<string, string> {
  const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
  const start = text.indexOf(`\n## ${source.name}\n`)
  expect(start, `section ${source.name}`).toBeGreaterThan(-1)
  const next = text.indexOf('\n## ', start + 1)
  const section = text.slice(start, next === -1 ? undefined : next)
  const rows = new Map<string, string>()
  for (const m of section.matchAll(/^\| `(src\/[^`]+)` \| `([a-z0-9-]+)` \| (\S+) \|$/gm)) {
    const [, file, slug, url] = m
    expect(url).toBe(source.url(slug!))
    rows.set(file!, slug!)
  }
  return rows
}

describe('INV-007: Ark UI (and Base UI) under SmoothUI and Park UI, with the provenance written down', () => {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
  const allDeps = sections.flatMap((s) => Object.keys(pkg[s] ?? {}))

  test('package.json has no Radix, shadcn or cult-ui, and no Floating UI, Next.js, GSAP or three', () => {
    const extra = ['@floating-ui/react', 'framer-motion', 'gsap', 'three', '@react-three/fiber', 'next', 'next-themes', 'tw-animate-css', 'nucleo-arcade']
    const forbidden = allDeps.filter((d) => d === 'radix-ui' || d.startsWith('@radix-ui/') || d === 'shadcn' || d.includes('cult-ui') || extra.includes(d))
    expect(forbidden).toEqual([])
    expect(Object.values(pkg.scripts ?? {}).join(' ')).not.toMatch(/shadcn/)
  })

  // Base UI stays: it carries the basic controls and the surfaces that open (the split is meant to stay, 2026-11-22).
  test('@base-ui/react and motion are pinned to exact versions', () => {
    expect(pkg.dependencies?.['@base-ui/react']).toBe('1.9.0')
    expect(pkg.dependencies?.motion).toBe('14.6.0')
  })

  test('the sources import only the toolkit\'s own files, its declared packages and Node built-ins: never an app', () => {
    const own = join(root, 'src')
    const declared = new Set(allDeps)
    const packageOf = (spec: string) => spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/')
    const outside = codeFiles.filter((f) => /\.tsx?$/.test(f)).flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/^\s*(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm)]
        .map((m) => (m[1] ?? m[2] ?? m[3])!)
        .filter((spec) => (spec.startsWith('.') ? !resolve(dirname(f), spec).startsWith(own) : !spec.startsWith('node:') && !declared.has(packageOf(spec))))
        .map((spec) => `${rel(f)}: ${spec}`),
    )
    expect(outside).toEqual([])
  })

  test('no source file imports Radix', () => {
    const offenders = codeFiles.filter((f) => /from ['"](?:radix-ui|@radix-ui\/)/.test(readFileSync(f, 'utf8'))).map(rel)
    expect(offenders).toEqual([])
  })

  describe('Ark UI is the base for behaviour', () => {
    const ARK = '5.39.3'
    const installed = (name: string) => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')) as { version: string; license: string; dependencies?: Record<string, string> }
    /** The Ark components a file imports (`@ark-ui/react/<component>`): the subpath says which. */
    const arkImports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from ['"](@ark-ui\/[^'"]+)['"]/g)].map((m) => m[1]!)
    /** The rows of the «Ark UI» table of THIRD_PARTY.md: file → the import it declares. */
    function listedArk(): Map<string, { component: string; from: string }> {
      const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
      const start = text.indexOf('\n## Ark UI\n')
      expect(start, 'section Ark UI').toBeGreaterThan(-1)
      const section = text.slice(start, text.indexOf('\n## ', start + 1))
      const rows = new Map<string, { component: string; from: string }>()
      for (const m of section.matchAll(/^\| `(src\/[^`]+)` \| `([a-z-]+)` \| `(@ark-ui\/react\/[a-z-]+)` \|$/gm)) rows.set(m[1]!, { component: m[2]!, from: m[3]! })
      return rows
    }

    test('@ark-ui/react is pinned to the exact version, and that is the one installed', () => {
      expect(pkg.dependencies?.['@ark-ui/react']).toBe(ARK)
      expect(installed('@ark-ui/react').version).toBe(ARK)
      expect(installed('@ark-ui/react').license).toBe('MIT')
      // Nowhere else, and never as a range.
      for (const s of ['devDependencies', 'peerDependencies', 'optionalDependencies'] as const) expect(Object.keys(pkg[s] ?? {}).filter((d) => d.startsWith('@ark-ui/')), s).toEqual([])
      expect(allDeps.filter((d) => d.startsWith('@ark-ui/'))).toEqual(['@ark-ui/react'])
    })

    test('@internationalized/date is pinned to the version Ark itself depends on: one copy in the bundle', () => {
      const own = pkg.dependencies?.['@internationalized/date']
      expect(own).toMatch(/^\d+\.\d+\.\d+$/)
      expect(installed('@ark-ui/react').dependencies?.['@internationalized/date']).toBe(own)
      expect(installed('@internationalized/date').version).toBe(own)
      // Zag (Ark's machines) is never a direct dependency, and never imported: the package talks to Ark only.
      expect(allDeps.filter((d) => d.startsWith('@zag-js/'))).toEqual([])
      expect(codeFiles.filter((f) => /from ['"]@zag-js\//.test(readFileSync(f, 'utf8'))).map(rel)).toEqual([])
    })

    test('THIRD_PARTY.md says which files rest on Ark UI, and they are exactly the ones that import it', () => {
      const rows = listedArk()
      expect(rows.size).toBeGreaterThan(0)
      const importing = codeFiles.filter((f) => arkImports(f).length > 0)
      expect(importing.map(rel).sort()).toEqual([...rows.keys()].sort())
      for (const file of importing) {
        const row = rows.get(rel(file))!
        expect(arkImports(file), rel(file)).toEqual([row.from])
        expect(row.from, rel(file)).toBe(`@ark-ui/react/${row.component}`)
      }
      const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
      expect(text).toContain(`\`@ark-ui/react\` ${ARK}`)
      expect(text).toContain('Copyright (c) 2024 Chakra UI')
      expect(text).toContain('Apache-2.0')
    })

    test('Ark is imported component by component, never whole: the bundle carries only what is used', () => {
      const whole = codeFiles.filter((f) => /from ['"]@ark-ui\/react['"]/.test(readFileSync(f, 'utf8'))).map(rel)
      expect(whole).toEqual([])
    })

    // That an app and its product package do not import Ark themselves is checked on the app's side.

    test('a file that rests on Ark does not also import the Base UI primitive it replaced', () => {
      const replaced: Record<string, RegExp> = {
        'src/components/Toasts.tsx': /@base-ui\/react\/toast/,
        'src/internal/date-field.tsx': /@base-ui\/react\/popover|ui\/popover/,
        'src/internal/chips.tsx': /@base-ui\/react\/input/,
      }
      for (const [file, old] of Object.entries(replaced)) expect(readFileSync(join(root, file), 'utf8'), file).not.toMatch(old)
      // Base UI's Toast is used by nothing else: it is out of the package.
      expect(codeFiles.filter((f) => /@base-ui\/react\/toast/.test(readFileSync(f, 'utf8'))).map(rel)).toEqual([])
    })
  })

  for (const source of [SMOOTH, PARK]) {
    test(`every file listed under ${source.name} in THIRD_PARTY.md exists and carries its header with the slug`, () => {
      const rows = listed(source)
      expect(rows.size).toBeGreaterThan(0)
      for (const [file, slug] of rows) {
        const full = join(root, file)
        expect(existsSync(full), file).toBe(true)
        const m = readFileSync(full, 'utf8').match(source.header)
        expect(m?.[1], file).toBe(slug)
      }
    })

    test(`every file with a ${source.name} header is listed in THIRD_PARTY.md`, () => {
      const rows = listed(source)
      const withHeader = codeFiles.filter((f) => readFileSync(f, 'utf8').includes(source.mark)).map(rel)
      expect(withHeader.filter((f) => !rows.has(f))).toEqual([])
    })
  }

  test('THIRD_PARTY.md carries the MIT licence of SmoothUI', () => {
    const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
    expect(text).toContain('Copyright (c) 2024 Eduardo Calvo')
    expect(text).toContain('Permission is hereby granted, free of charge, to any person obtaining a copy')
    expect(text).toContain('4.0.0')
  })

  test('THIRD_PARTY.md has a Fluent 2 section: MIT, the files and commit read, token values only; the constants equal Fluent\'s', async () => {
    const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
    const start = text.indexOf('\n## Fluent 2 (Microsoft)\n')
    expect(start, 'section Fluent 2').toBeGreaterThan(-1)
    const next = text.indexOf('\n## ', start + 1)
    const section = text.slice(start, next === -1 ? undefined : next)
    expect(section).toContain('https://github.com/microsoft/fluentui')
    expect(section).toContain(FLUENT_COMMIT)
    expect(section).toContain('packages/tokens/src/global/durations.ts')
    expect(section).toContain('packages/tokens/src/global/curves.ts')
    expect(section).toContain('**MIT**')
    expect(section).toContain('Copyright (c) Microsoft Corporation')
    expect(section).toContain('Permission is hereby granted, free of charge, to any person obtaining a copy')
    expect(section).toContain('not installed')
    // The note of Fluent UI's licence is about its fonts and icons: none comes with the token values.
    expect(section).toContain('No font of Fluent is used anywhere in the toolkit, and no icon comes with these token values.')
    expect(section).toContain('https://aka.ms/fluentui-assets-license')
    // Values, not code: the tokens package is not a dependency. The only package of Fluent installed is its icons,
    // listed with their own licence (plain MIT, from fluentui-system-icons) under «Icon packs».
    expect(allDeps.filter((d) => d.startsWith('@fluentui/'))).toEqual(['@fluentui/react-icons'])
    const iconsAt = text.indexOf('\n## Icon packs\n')
    const icons = text.slice(iconsAt, text.indexOf('\n## ', iconsAt + 1))
    expect(iconsAt).toBeGreaterThan(-1)
    expect(icons).toContain('`@fluentui/react-icons` (MIT, "Copyright (c) 2020 Microsoft Corporation"')
    expect(icons).toContain('`lucide-react` (ISC')
    // The token values as they are in Fluent's two files at that commit; the toolkit declares only the ones it uses.
    const durations: Record<string, number> = { ultraFast: 50, faster: 100, fast: 150, normal: 200, gentle: 250, slow: 300, slower: 400, ultraSlow: 500 }
    const curves: Record<string, readonly number[]> = {
      accelerateMax: [0.9, 0.1, 1, 0.2],
      accelerateMid: [1, 0, 1, 1],
      accelerateMin: [0.8, 0, 0.78, 1],
      decelerateMax: [0.1, 0.9, 0.2, 1],
      decelerateMid: [0, 0, 0, 1],
      decelerateMin: [0.33, 0, 0.1, 1],
      easyEaseMax: [0.8, 0, 0.2, 1],
      easyEase: [0.33, 0, 0.67, 1],
      linear: [0, 0, 1, 1],
    }
    const { FLUENT_CURVES, FLUENT_DURATIONS } = await import('../src/internal/motion-impl')
    expect(Object.keys(FLUENT_DURATIONS).length).toBeGreaterThan(0)
    expect(Object.keys(FLUENT_CURVES).length).toBeGreaterThan(0)
    for (const [name, ms] of Object.entries(FLUENT_DURATIONS)) {
      expect(ms, name).toBe(durations[name])
      // The section lists each token used with its value.
      expect(section, name).toContain(`\`duration${name[0]!.toUpperCase()}${name.slice(1)}\` ${ms}ms`)
    }
    for (const [name, points] of Object.entries(FLUENT_CURVES)) {
      expect(points, name).toEqual(curves[name])
      expect(section, name).toContain(`\`curve${name[0]!.toUpperCase()}${name.slice(1)}\` cubic-bezier(${points.join(',')})`)
    }
  })

  test('THIRD_PARTY.md has a Park UI section: MIT, the commit read, recipes translated to Tailwind and nothing installed', () => {
    const text = readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8')
    const start = text.indexOf('\n## Park UI\n')
    expect(start, 'section Park UI').toBeGreaterThan(-1)
    const section = text.slice(start, text.indexOf('\n## ', start + 1))
    expect(section).toContain('https://github.com/chakra-ui/park-ui')
    expect(section).toContain(PARK_COMMIT)
    expect(section).toContain('**MIT**')
    expect(section).toContain('Copyright (c) 2025 cschroeter')
    expect(section).toContain('Permission is hereby granted, free of charge, to any person obtaining a copy')
    expect(section).toContain('not installed')
    // Translated, not installed: neither Park nor Panda CSS is a dependency.
    expect(allDeps.filter((d) => d.startsWith('@park-ui/') || d.startsWith('@pandacss/'))).toEqual([])
  })

})

describe('INV-008: no decorative component, no infinite motion, no springs', () => {
  const DECORATIVE = /orb|shimmer|loader|glow|tilt|text-effect|cursor|marquee|aurora|matrix|scramble|particles|magnetic|dock/i

  test('no decorative SmoothUI component is copied', () => {
    expect(srcFiles.map(rel).filter((f) => DECORATIVE.test(f))).toEqual([])
    const slugs = codeFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/SmoothUI \(MIT\) ([a-z0-9-]+)/g)].map((m) => m[1]!))
    expect(slugs.filter((s) => DECORATIVE.test(s))).toEqual([])
  })

  test('src has no infinite repetition', () => {
    const offenders = codeFiles.filter((f) => /repeat:\s*Infinity|\binfinite\b/.test(readFileSync(f, 'utf8')))
    expect(offenders.map(rel)).toEqual([])
  })

  test('no spring anywhere, and no code or link from Unlumen UI', () => {
    const offenders = codeFiles.filter((f) => /type:\s*['"]spring['"]|stiffness|unlumen/i.test(readFileSync(f, 'utf8')))
    expect(offenders.map(rel)).toEqual([])
  })

  test('motion is imported only by the Motion chunk (INV-006)', () => {
    const offenders = codeFiles.filter((f) => /from ['"]motion(?:\/react)?['"]/.test(readFileSync(f, 'utf8')))
    expect(offenders.map(rel)).toEqual(['src/internal/motion-impl.tsx'])
  })
  // `dist/styles.css` is checked by `test/build.test.ts` after the build (here it could be half rewritten).
})
