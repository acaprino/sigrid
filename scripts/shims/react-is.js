// Replaces CommonJS `react-is` in the ESM bundle (scripts/build.mjs) for Recharts, matching React 18/19's own
// element symbols so no `module.exports` or `__commonJS` enters `dist/chart.js`.
const sym = (name) => Symbol.for(name)

export const Element = sym('react.transitional.element')
const LEGACY_ELEMENT = sym('react.element')
export const Portal = sym('react.portal')
export const Fragment = sym('react.fragment')
export const StrictMode = sym('react.strict_mode')
export const Profiler = sym('react.profiler')
export const ContextProvider = sym('react.provider')
export const ContextConsumer = sym('react.consumer')
export const ForwardRef = sym('react.forward_ref')
export const Suspense = sym('react.suspense')
export const Memo = sym('react.memo')
export const Lazy = sym('react.lazy')

export function typeOf(object) {
  if (typeof object === 'object' && object !== null) {
    const t = object.$$typeof
    if (t === Element || t === LEGACY_ELEMENT) {
      const type = object.type
      if (type === Fragment || type === Profiler || type === StrictMode || type === Suspense) return type
      const inner = type && type.$$typeof
      if (inner === ContextConsumer || inner === ContextProvider || inner === ForwardRef || inner === Lazy || inner === Memo) return inner
      return Element
    }
    if (t === Portal) return t
  }
  return undefined
}

export const isElement = (object) => typeof object === 'object' && object !== null && (object.$$typeof === Element || object.$$typeof === LEGACY_ELEMENT)
export const isFragment = (object) => typeOf(object) === Fragment
export const isPortal = (object) => typeOf(object) === Portal
export const isForwardRef = (object) => typeOf(object) === ForwardRef
export const isMemo = (object) => typeOf(object) === Memo
export const isLazy = (object) => typeOf(object) === Lazy
export const isStrictMode = (object) => typeOf(object) === StrictMode
export const isSuspense = (object) => typeOf(object) === Suspense
export const isProfiler = (object) => typeOf(object) === Profiler
export const isContextProvider = (object) => typeOf(object) === ContextProvider
export const isContextConsumer = (object) => typeOf(object) === ContextConsumer
export const isValidElementType = (type) =>
  typeof type === 'string' ||
  typeof type === 'function' ||
  type === Fragment ||
  type === Profiler ||
  type === StrictMode ||
  type === Suspense ||
  (typeof type === 'object' && type !== null && (type.$$typeof === Lazy || type.$$typeof === Memo || type.$$typeof === ContextProvider || type.$$typeof === ContextConsumer || type.$$typeof === ForwardRef))

export default {
  Element,
  Portal,
  Fragment,
  StrictMode,
  Profiler,
  ContextProvider,
  ContextConsumer,
  ForwardRef,
  Suspense,
  Memo,
  Lazy,
  typeOf,
  isElement,
  isFragment,
  isPortal,
  isForwardRef,
  isMemo,
  isLazy,
  isStrictMode,
  isSuspense,
  isProfiler,
  isContextProvider,
  isContextConsumer,
  isValidElementType,
}
