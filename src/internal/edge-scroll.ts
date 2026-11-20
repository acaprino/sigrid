import { useEffect, type RefObject } from 'react'

const EDGE = 48
const STEP = 24

/**
 * While a drag passes within 48px of the left or right edge of the element, it scrolls horizontally: a row with many
 * columns can be reached all the way to the end without letting go of the card.
 */
export function useEdgeAutoScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const over = (e: DragEvent) => {
      const box = el.getBoundingClientRect()
      if (e.clientX < box.left + EDGE) el.scrollLeft -= STEP
      else if (e.clientX > box.right - EDGE) el.scrollLeft += STEP
    }
    el.addEventListener('dragover', over)
    return () => el.removeEventListener('dragover', over)
  }, [ref])
}
