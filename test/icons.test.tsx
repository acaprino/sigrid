// Sigrid's icons (R6 of the toolkit's rules): one set, Lucide, the same in every app (the owner, 2026-11-23). Every
// meaning is drawn, with Lucide's own drawing; a value read back is checked; a name Sigrid does not draw is an empty
// slot; the packs, the choice of a pack and an app's own icons are gone, with no name left behind for them.
import { render } from '@testing-library/react'
import { Check, CircleX, CodeXml, ExternalLink, FileIcon, Folder, FolderOpen, GitBranch, Globe, Info, Key, Layers, MonitorSmartphone, Package, Router, Settings, Trash2, TriangleAlert, Waypoints, type LucideIcon } from 'lucide-react'
import { expect, test } from 'vitest'
import * as UI from '../src'
import { ICON_NAMES, Icon, isIconName, type IconName } from '../src'
import { classes } from './helpers'

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

test("an icon is Lucide's own drawing for its meaning", () => {
  const lucide = (Glyph: LucideIcon, className = 'size-4') => {
    const { container, unmount } = render(<Glyph className={className} />)
    const html = container.querySelector('svg')!.outerHTML
    unmount()
    return html
  }
  const MEANINGS: readonly (readonly [IconName, LucideIcon])[] = [
    ['settings', Settings],
    ['delete', Trash2],
    ['folder', Folder],
    ['folderOpen', FolderOpen],
    ['file', FileIcon],
    ['info', Info],
    ['check', Check],
    ['alert', TriangleAlert],
    ['error', CircleX],
    ['code', CodeXml],
    ['branch', GitBranch],
    ['package', Package],
    ['layers', Layers],
    ['graph', Waypoints],
    ['gateway', Router],
    ['device', MonitorSmartphone],
    ['key', Key],
    ['globe', Globe],
    ['external', ExternalLink],
  ]
  for (const [name, Glyph] of MEANINGS) {
    expect(draw(name), name).toBe(lucide(Glyph))
    expect(draw(name, 'size-5'), name).toBe(lucide(Glyph, 'size-5'))
  }
  expect(draw('settings')).not.toBe(draw('delete'))
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
