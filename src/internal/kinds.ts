import { FileText, Link, Mail, TextAlignLeft, type Glyph } from './sigrid-icons'
import { DEFAULT_WORDS, type Words } from '../words'

/** Kind of an item of the stack. */
export type ItemKind = 'text' | 'file' | 'email' | 'link'
/** Kind of an attachment. */
export type AttachmentKind = Exclude<ItemKind, 'text'>

const ICONS: Record<ItemKind, Glyph> = { text: TextAlignLeft, file: FileText, email: Mail, link: Link }

export function kindIcon(kind: ItemKind): Glyph {
  return ICONS[kind]
}

/** The name of a kind, in the words given (`useWords()` in a component); the toolkit's English without them. */
export function kindLabel(kind: ItemKind, words: Words = DEFAULT_WORDS): string {
  return words.kinds[kind]
}
