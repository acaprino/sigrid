// SmoothUI (MIT) textarea 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/textarea.json)
// Park UI (MIT) textarea 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/textarea.ts)
import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '../lib/utils'
import { FOCUS_FIELD } from '../lib/focus'
import { FIELD_HOVER, FIELD_SURFACE, FIELD_TEXT } from '../lib/field'

// The form is Park's `textarea` recipe, md size: l2 corners, 12px of side padding and 7px above and below, so one line
// is as tall as a field (40px). The border stays `border-input` (3:1), not Park's lighter one.
// Adaptation: as in SmoothUI, Base UI's `Input` rendered as a `<textarea>`. With our tokens: `border-input` border
// (>= 3:1), the toolkit's focus ring (`lib/focus.ts`, R8), no transitions. `field-sizing-content` stays (the capture box
// grows with the text; cap and scrolling are set by Stack) and `min-h-16`; no `resize-y`, `min-h-20` nor `rows = 4` by
// SmoothUI's default: `rows` and `resize-*` are left to whoever uses the component.
// The surface, the text, the hover and the invalid border are every field's (`lib/field.ts`). Off it fades like `Input`
// but keeps the pointer: a long text that is off still scrolls under the wheel or the finger.
const TEXTAREA_CLASS = cn(
  FIELD_SURFACE,
  // design-check-ignore-next-line dimension-value: Park's md textarea padding (7px), so one line with its 1px border is 40px like a field
  'flex field-sizing-content min-h-16 w-full px-(--pad-sm) py-[7px]',
  FIELD_TEXT,
  'disabled:cursor-not-allowed disabled:opacity-50',
  FOCUS_FIELD,
  FIELD_HOVER,
)

type PrimitiveProps = React.ComponentProps<typeof InputPrimitive>

type TextareaOwnProps = React.ComponentProps<'textarea'> & {
  /** What is typed is a path, an id or code: the monospace face (the second font role of DESIGN.md), at the field's size. */
  mono?: boolean | undefined
  /**
   * The field grows with its text by itself; this is the most lines it shows before it stops growing and scrolls
   * (a whole number, 1 or more). Absent: it grows as far as its text goes.
   */
  maxRows?: number | undefined
}

/**
 * A multi-line field that grows with its text. Same API as before: the props of `<textarea>` (`ref` reaches the
 * `<textarea>`), and `mono` and `maxRows`. Base UI's types describe an `<input>`: with `render` the element is a
 * `<textarea>`, so the props are passed with a cast.
 */
function Textarea({ className, ref, mono = false, maxRows, style, ...props }: TextareaOwnProps) {
  // As many lines of the field's own text (`lh`), and its padding and border above and below (16px, as one line is 40px).
  const capped = maxRows !== undefined && maxRows >= 1 ? { maxHeight: `calc(${Math.floor(maxRows)}lh + 1rem)`, ...style } : style
  return (
    <InputPrimitive
      render={<textarea />}
      data-slot="textarea"
      className={cn(TEXTAREA_CLASS, mono && 'font-mono', className)}
      {...(capped ? { style: capped } : {})}
      {...(props as unknown as Omit<PrimitiveProps, 'ref' | 'render' | 'className' | 'style'>)}
      ref={ref as React.Ref<HTMLElement>}
    />
  )
}

export { Textarea }
