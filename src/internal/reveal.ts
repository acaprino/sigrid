// What opens and closes in place (the panel of a `Disclosure`, the rows of a group of the sidebar, the rows of the
// copies of a message) glides open and shut when motion is on: the stylesheet does it (theme.css, `[data-reveal]`),
// with no element added and none changed, where the browser can ease a height to and from `auto`; elsewhere it opens
// at once, as with motion off. It moves only after the reader's own press: a part that the app opens or closes by
// itself (a reasoning that ends, a search that opens every group) changes at once, since nothing moves by itself.
import { useRef } from 'react'

/**
 * For a part that is `open` or not: `pressed()` is called in the handler of the reader's press, before the state
 * changes; `attrs` go on the element that opens, and mark it (`data-reveal`) only while its last change was a press.
 * `byPress` says the same to a part that moves something else with it (an arrow that turns).
 */
export function useReveal(open: boolean): { pressed: () => void; byPress: boolean; changes: number; attrs: { 'data-reveal'?: '' } } {
  const state = useRef({ open, pressed: false, byPress: false, jumps: 0 })
  const now = state.current
  if (now.open !== open) {
    now.byPress = now.pressed
    if (!now.pressed) now.jumps += 1
    now.open = open
    now.pressed = false
  }
  return {
    pressed: () => {
      now.pressed = true
    },
    byPress: now.byPress,
    // How many times it changed with no press: a key for what must be drawn anew, at once, on such a change.
    changes: now.jumps,
    attrs: now.byPress ? { 'data-reveal': '' } : {},
  }
}
