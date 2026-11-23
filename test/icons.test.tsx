// Sigrid's icons (R6 of the toolkit's rules): one set, Lucide, the same in every app (the owner, 2026-11-23). Every
// meaning is drawn, with Lucide's own drawing; a value read back is checked; a name Sigrid does not draw is an empty
// slot; the packs, the choice of a pack and an app's own icons are gone, with no name left behind for them.
import { render } from '@testing-library/react'
import { FileIcon, Folder, FolderOpen, Settings, Trash2, type LucideIcon } from 'lucide-react'
import { expect, test } from 'vitest'
import * as UI from '../src'
import { ICON_NAMES, Icon, isIconName, type IconName } from '../src'

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
    const classes = (svg!.getAttribute('class') ?? '').split(/\s+/)
    expect(classes, name).toContain('size-5')
    expect(classes, name).not.toContain('size-4')
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
