// The colors of a user's labels (tags): eight background/ink pairs per scheme in `theme.css` (`--tag-1-*` …
// `--tag-8-*`), picked from the label's name, so the same name has the same color everywhere and on every device,
// without an extra datum. The chips of the labels field (`ChipsInput.tsx`) use them, and so can an app's own label pills.

/** How many colors the labels have (`--tag-1-*` … `--tag-8-*` in `theme.css`). */
export const TAG_HUES = 8

/**
 * The color (1…8) of a label, from its name: case, spaces at the sides and the at sign do not count. 32-bit FNV-1a
 * on the name in NFC: stable across devices and versions. Do not change it: every label would change color.
 */
export function tagHue(name: string): number {
  const key = name.trim().replace(/^@/, '').normalize('NFC').toLowerCase()
  let h = 0x811c9dc5
  for (const unit of new TextEncoder().encode(key)) {
    h ^= unit
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h % TAG_HUES) + 1
}

/**
 * The color attribute of a label: `theme.css` derives `--tag-bg` and `--tag-ink` from it (no inline style). The chips
 * of `ChipsInput.tsx` use it, together with `TAG_COLOR`.
 */
export function tagColorAttrs(name: string): { 'data-tag-hue': string } {
  return { 'data-tag-hue': String(tagHue(name)) }
}

/** Background and ink from the variables that `theme.css` puts on `[data-tag-hue]`. */
export const TAG_COLOR = 'bg-(--tag-bg) text-(--tag-ink)'

/** The pill of the Badge, Park's md badge (also the label chips in `ChipsInput.tsx`): l2 corners, 8px of side padding. */
export const TAG_PILL = 'rounded-md px-2 font-normal motion-safe:transition-none'
