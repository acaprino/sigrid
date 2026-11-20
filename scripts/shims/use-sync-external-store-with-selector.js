// Replaces `use-sync-external-store/shim/with-selector` in the build (scripts/build.mjs). The original package is
// CommonJS and does `require("react")`: esbuild leaves it as `__require("react")`, which at runtime resolves from the
// `dist` folder (the React in the node_modules of the package that bundles the toolkit), not from the app's: two Reacts, and the first
// Base UI hook fails with "Cannot read properties of null (reading 'useSyncExternalStore')". Here the same
// React algorithm (use-sync-external-store 1.x, MIT, © Meta Platforms) in ESM, on React 18/19's `useSyncExternalStore`,
// with an `import` that the client resolves against its own React.
import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

export function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  const instRef = useRef(null)
  let inst
  if (instRef.current === null) {
    inst = { hasValue: false, value: null }
    instRef.current = inst
  } else {
    inst = instRef.current
  }
  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot
    let memoizedSelection
    const memoizedSelector = (nextSnapshot) => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return currentSelection
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }
      const prevSnapshot = memoizedSnapshot
      const prevSelection = memoizedSelection
      if (Object.is(prevSnapshot, nextSnapshot)) return prevSelection
      const nextSelection = selector(nextSnapshot)
      if (isEqual !== undefined && isEqual(prevSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return prevSelection
      }
      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }
    const maybeGetServerSnapshot = getServerSnapshot === undefined ? null : getServerSnapshot
    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null ? undefined : () => memoizedSelector(maybeGetServerSnapshot()),
    ]
  }, [getSnapshot, getServerSnapshot, selector, isEqual])
  const value = useSyncExternalStore(subscribe, getSelection, getServerSelection)
  useEffect(() => {
    inst.hasValue = true
    inst.value = value
  }, [value])
  useDebugValue(value)
  return value
}
