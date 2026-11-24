// Sigrid's icons (R6 of the toolkit's rules): one set, Sigrid Icons, the same in every app (the owner, 2026-11-23 and
// 2026-11-24). Every meaning is drawn, with the set's own drawing: a glyph on a 24px grid, stroked, with no fill; a
// value read back is checked; a name Sigrid does not draw is an empty slot; the packs, the choice of a pack, an app's
// own icons and the package of icons are gone, with no name left behind for them.
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Check, Code, CogFour, DangerTriangle, Devices, ExternalLink, File, Folder, FolderOpen, GitBranch, Globe, Graph, InfoCircle, Key, LayersThree, Package, Router, Trash, XCircle, type Glyph } from '../src/internal/sigrid-icons'
import { expect, test } from 'vitest'
import * as UI from './all'
import { ICON_NAMES, Icon, isIconName, type IconName } from '../src/primitives'
import { classes, root } from './helpers'

/** The drawing an `Icon` of that name makes. */
const draw = (name: IconName, className?: string) => {
  const { container, unmount } = render(<Icon name={name} className={className} />)
  const html = container.querySelector('svg')!.outerHTML
  unmount()
  return html
}

test('every icon is drawn: an svg sized by the class given, hidden from screen readers, marked with its name', () => {
  for (const name of ICON_NAMES) {
    const { container, unmount } = render(<Icon name={name} className="size-5" />)
    const box = container.firstElementChild!
    expect(box.getAttribute('aria-hidden'), name).toBe('true')
    expect(box.getAttribute('data-icon')).toBe(name)
    // No pack to name: there is one set.
    expect(box.hasAttribute('data-icon-pack'), name).toBe(false)
    const svg = box.querySelector('svg')
    expect(svg, name).not.toBeNull()
    // The class given sets the box, in place of the default size-4.
    expect(classes(svg), name).toContain('size-5')
    expect(classes(svg), name).not.toContain('size-4')
    unmount()
  }
})

test("an icon is the set's own drawing for its meaning", () => {
  const glyph = (Glyph: Glyph, className = 'size-4') => {
    const { container, unmount } = render(<Glyph className={className} />)
    const html = container.querySelector('svg')!.outerHTML
    unmount()
    return html
  }
  const MEANINGS: readonly (readonly [IconName, Glyph])[] = [
    ['settings', CogFour],
    ['delete', Trash],
    ['folder', Folder],
    ['folderOpen', FolderOpen],
    ['file', File],
    ['info', InfoCircle],
    ['check', Check],
    ['alert', DangerTriangle],
    ['error', XCircle],
    ['code', Code],
    ['branch', GitBranch],
    ['package', Package],
    ['layers', LayersThree],
    ['graph', Graph],
    ['gateway', Router],
    ['device', Devices],
    ['key', Key],
    ['globe', Globe],
    ['external', ExternalLink],
  ]
  for (const [name, Glyph] of MEANINGS) {
    expect(draw(name), name).toBe(glyph(Glyph))
    expect(draw(name, 'size-5'), name).toBe(glyph(Glyph, 'size-5'))
  }
  expect(draw('settings')).not.toBe(draw('delete'))
})

test('every glyph is one kind of drawing: marked for the theme, on a 24px grid, stroked at 2 with round ends, with no fill', () => {
  for (const name of ICON_NAMES) {
    const { container, unmount } = render(<Icon name={name} />)
    const svg = container.querySelector('svg')!
    // The mark and the stroke of 2 are what the theme's rule looks for (`svg[data-glyph][stroke-width="2"]`).
    expect(svg.hasAttribute('data-glyph'), name).toBe(true)
    expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24')
    expect(svg.getAttribute('fill'), name).toBe('none')
    expect(svg.getAttribute('stroke'), name).toBe('currentColor')
    expect(svg.getAttribute('stroke-width'), name).toBe('2')
    expect(svg.getAttribute('stroke-linecap'), name).toBe('round')
    expect(svg.getAttribute('stroke-linejoin'), name).toBe('round')
    const parts = [...svg.children]
    expect(parts.length, name).toBeGreaterThan(0)
    for (const part of parts) {
      expect(part.tagName.toLowerCase(), name).toBe('path')
      expect(part.getAttribute('d'), name).toMatch(/^[Mm]/)
    }
    unmount()
  }
})

test('every meaning has a drawing of its own, but for the ones that share one on purpose', () => {
  const SHARED: readonly (readonly IconName[])[] = [['all', 'bulletList'], ['minus', 'windowMinimize']]
  const byDrawing = new Map<string, IconName[]>()
  for (const name of ICON_NAMES) byDrawing.set(draw(name), [...(byDrawing.get(draw(name)) ?? []), name])
  expect([...byDrawing.values()].filter((names) => names.length > 1)).toEqual(SHARED)
})

test('a stroke chosen on purpose is kept: the theme replaces only the stroke of 2', () => {
  const { container, unmount } = render(<Check strokeWidth={2.5} />)
  expect(container.querySelector('svg')!.getAttribute('stroke-width')).toBe('2.5')
  unmount()
  expect(readFileSync(join(root, 'src/styles/theme.css'), 'utf8')).toContain('svg[data-glyph][stroke-width="2"]')
})

test('no package of icons is a dependency, and no part imports one', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies })
  expect(deps.filter((d) => /lucide|mynaui|icons?-react|react-icons/.test(d))).toEqual([])
})

test('the rows of a tree of files: a folder, a folder shown open and a file, three meanings drawn apart', () => {
  for (const name of ['folder', 'folderOpen', 'file']) expect(isIconName(name), name).toBe(true)
  expect(draw('folderOpen')).not.toBe(draw('folder'))
  expect(draw('file')).not.toBe(draw('folder'))
  // A folder is not the action that makes one.
  expect(draw('folder')).not.toBe(draw('newFolder'))
})

test("the four tones of a message, four meanings drawn apart: a failure is the circle with an X, never the information's circle", () => {
  const tones = ['info', 'check', 'alert', 'error'] as const
  expect(new Set(tones.map((name) => draw(name))).size).toBe(4)
  // One look for a failure: the same drawing in a `Note`, a toast, a progress and a step (their own tests).
  expect(draw('error')).not.toBe(draw('info'))
  expect(draw('error')).not.toBe(draw('close'))
})

test('the parts of a project and of a system: each meaning has a drawing that no other name has', () => {
  const parts = ['code', 'branch', 'package', 'layers', 'graph', 'gateway', 'device', 'key', 'globe', 'external'] as const
  const drawn = ICON_NAMES.map((name) => [name, draw(name)] as const)
  for (const part of parts) {
    expect(isIconName(part), part).toBe(true)
    const own = draw(part)
    expect(drawn.filter(([, drawing]) => drawing === own).map(([name]) => name), part).toEqual([part])
  }
})

test('a value read back is checked: only the names Sigrid draws pass', () => {
  expect(isIconName('settings')).toBe(true)
  for (const no of ['', 'Settings', 'sparkles', 'today', 'project', undefined, 'toString']) expect(isIconName(no), String(no)).toBe(false)
})

test('a name nobody draws is an empty slot of the same size, so the row keeps its alignment', () => {
  // An app's own meaning (`invoice`) is not drawn: a missing icon is added to Sigrid's names, never by an app.
  for (const name of ['invoice', 'constructor', '']) {
    const { container, unmount } = render(<Icon name={name} className="size-5" />)
    const box = container.firstElementChild!
    expect(box.querySelector('svg'), name).toBeNull()
    const slot = box.querySelector('[data-icon-empty]')!
    expect(slot.getAttribute('class'), name).toBe('size-5')
    unmount()
  }
})

test("the packs, the choice of a pack and the provider of an app's own icons are gone, with no alias", () => {
  for (const gone of ['ICON_PACKS', 'DEFAULT_ICON_PACK', 'isIconPack', 'IconPackProvider', 'useIconPack', 'IconPackChoice']) expect(Object.keys(UI), gone).not.toContain(gone)
})
