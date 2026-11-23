import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Whether a part a caller passed is empty: absent (`undefined`, `null`), a condition that came out false
 * (`{busy && …}`), or an empty text. An empty part gets no room, no gap and no name. (`true` is not empty: a caller
 * may pass it to say «yes» where there are no words, as `error` does.)
 */
export function isEmptyNode(node: ReactNode): boolean {
  return node === undefined || node === null || node === false || node === ''
}
