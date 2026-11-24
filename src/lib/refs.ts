// One ref made of several: a part that needs its element for itself (an entrance, the first focus, the element a press
// goes back to) and also hands it to the caller's `ref`. Each ref may be a function or an object; a function may
// return a cleanup (React 19), which is then called in place of the function with `null`.
import { useCallback, type Ref, type RefCallback } from 'react'

/** A ref as a part receives it: the caller's (`undefined` when none was given) or one of its own. */
export type AnyRef<T> = Ref<T> | RefCallback<T> | undefined

/** Gives the element to one ref, and returns what undoes it: the ref's own cleanup, or `undefined`. */
function assign<T>(ref: AnyRef<T>, el: T | null): void | (() => void) {
  if (typeof ref === 'function') {
    const cleanup = ref(el)
    return typeof cleanup === 'function' ? cleanup : undefined
  }
  if (ref) (ref as { current: T | null }).current = el
}

/**
 * One ref callback that gives the element to every ref. On React 19 it returns a cleanup, which undoes each ref its own
 * way when the element goes (the ref's cleanup, or the ref told `null`); on React 18 the return is ignored and React
 * calls it with `null`, which goes to every ref too. It changes only when one of the refs does, so the refs passed
 * are stable ones (a `useCallback`, a `useRef`) or the caller's.
 */
export function useMergedRef<T>(...refs: AnyRef<T>[]): RefCallback<T> {
  return useCallback(
    (el: T | null) => {
      const cleanups = refs.map((ref) => assign(ref, el))
      if (el === null) return
      return () => {
        refs.forEach((ref, i) => {
          const cleanup = cleanups[i]
          if (cleanup) cleanup()
          else assign(ref, null)
        })
      }
    },
    // The refs are the dependencies: one call site always passes the same number of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  )
}
