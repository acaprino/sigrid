import { AlignLeft, FileText, Link, Mail, type LucideIcon } from 'lucide-react'

/** Kind of an item of the stack. */
export type ItemKind = 'text' | 'file' | 'email' | 'link'
/** Kind of an attachment. */
export type AttachmentKind = Exclude<ItemKind, 'text'>

const ICONS: Record<ItemKind, LucideIcon> = { text: AlignLeft, file: FileText, email: Mail, link: Link }
const LABELS: Record<ItemKind, string> = { text: 'text', file: 'file', email: 'email', link: 'link' }

export function kindIcon(kind: ItemKind): LucideIcon {
  return ICONS[kind]
}

export function kindLabel(kind: ItemKind): string {
  return LABELS[kind]
}
