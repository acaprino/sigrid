// What a library that cannot read `var()` needs from the page's look: the value of a token as a concrete colour, a
// font stack or a length, read where the part is drawn (the terminal and the code view are the users), and the moment
// to read them again. A theme, a scheme, a density or a font is written on the document root (`applyTheme`,
// `applyFont`, `applyDensity`) as inline variables and attributes, and the first paint follows the system's scheme
// by a media query: `watchLook` calls back on every one of those, so the part can read its tokens again.
import { luminance } from '../theme-engine'

/** A colour as it is read: `#rrggbb`, or `#rrggbbaa` when it is not opaque. */
export type Hex = `#${string}`

const pair = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

/** A colour written in hex (three, six or eight digits) or in the functional notation of the browser's computed colours, as six hex digits (eight below full opacity); anything else is null. */
export function toHexColor(value: string): Hex | null {
  const text = value.trim().toLowerCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/.exec(text)
  if (short) return `#${short[1]!.repeat(2)}${short[2]!.repeat(2)}${short[3]!.repeat(2)}${short[4] && short[4] !== 'f' ? short[4].repeat(2) : ''}`
  const long = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(text)
  if (long) return `#${long[1]}${long[2] && long[2] !== 'ff' ? long[2] : ''}`
  const fn = /^rgba?\(\s*([\d.]+)(%?)[\s,]+([\d.]+)(%?)[\s,]+([\d.]+)(%?)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(text)
  if (!fn) return null
  const channel = (n: string, percent: string) => (percent ? (Number(n) / 100) * 255 : Number(n))
  const alpha = fn[7] === undefined ? 1 : fn[8] ? Number(fn[7]) / 100 : Number(fn[7])
  return `#${pair(channel(fn[1]!, fn[2]!))}${pair(channel(fn[3]!, fn[4]!))}${pair(channel(fn[5]!, fn[6]!))}${alpha < 1 ? pair(alpha * 255) : ''}`
}

/**
 * The colour a token stands for, as hex, read where `el` is: the variable's own text when it is a colour, otherwise
 * what the browser computes for a probe painted with `var(--name)` (a token written as a mix or as another variable).
 * `fallback` when the token is not set or is no colour (a page that did not load the theme).
 */
export function readColor(el: Element, name: string, fallback: Hex): Hex {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el)
  const own = style?.getPropertyValue(name)
  const direct = own ? toHexColor(own) : null
  if (direct) return direct
  if (!own?.trim() || !el.ownerDocument.body) return fallback
  const probe = el.ownerDocument.createElement('span')
  probe.style.color = `var(${name})`
  el.appendChild(probe)
  const computed = toHexColor(el.ownerDocument.defaultView!.getComputedStyle(probe).color)
  probe.remove()
  return computed ?? fallback
}

/** A token's text as it is written (a font stack), or `fallback` when it is not set. */
export function readText(el: Element, name: string, fallback: string): string {
  return el.ownerDocument.defaultView?.getComputedStyle(el).getPropertyValue(name).trim() || fallback
}

/** A token written as a length, in pixels (`0.8125rem` is 13): `px` as it is, `rem` and `em` by the root's size. */
export function readLength(el: Element, name: string, fallback: number): number {
  const text = readText(el, name, '')
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(text)
  if (!m) return fallback
  const root = Number.parseFloat(el.ownerDocument.defaultView?.getComputedStyle(el.ownerDocument.documentElement).fontSize ?? '') || 16
  return m[2] === 'rem' || m[2] === 'em' ? Number(m[1]) * root : Number(m[1])
}

/** Whether a page colour belongs to a dark scheme: the one a white label reads better on than a black one. */
export function isDarkColor(paper: string): boolean {
  const l = luminance(paper.slice(0, 7)) + 0.05
  return 1.05 / l > l / 0.05
}

/** What on the root says the look changed: the inline variables (`style`), the theme, scheme, font and density attributes. */
const LOOK_ATTRIBUTES = ['style', 'class', 'data-theme', 'data-scheme', 'data-density', 'data-font', 'data-material']

/**
 * Calls `onChange` when the look of the page changes: an attribute of the root that carries it, or the system's scheme
 * (the first paint follows it until a theme is applied). One call for a burst of changes (a theme writes dozens of
 * variables), after the frame, so a part reads once. Returns the way to stop.
 */
export function watchLook(doc: Document, onChange: () => void): () => void {
  const view = doc.defaultView
  if (!view) return () => {}
  let frame = 0
  const soon = () => {
    if (frame) return
    frame = view.requestAnimationFrame(() => {
      frame = 0
      onChange()
    })
  }
  const observer = new MutationObserver(soon)
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: LOOK_ATTRIBUTES })
  const media = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-color-scheme: dark)') : null
  media?.addEventListener('change', soon)
  return () => {
    observer.disconnect()
    media?.removeEventListener('change', soon)
    if (frame) view.cancelAnimationFrame(frame)
    frame = 0
  }
}

/** Puts a stylesheet in the document once, by an id: a part that needs a library's own CSS brings it with itself. */
export function ensureStyle(doc: Document, id: string, css: string): void {
  if (doc.getElementById(id)) return
  const style = doc.createElement('style')
  style.id = id
  style.textContent = css
  doc.head.appendChild(style)
}
