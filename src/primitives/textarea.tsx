// Park UI (MIT) textarea 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/textarea.ts)
import * as React from 'react'
import { Field } from '@ark-ui/react/field'
import { cn } from '../lib/utils'
import { FOCUS_FIELD } from '../lib/focus'
import { FIELD_HOVER, FIELD_SURFACE, FIELD_TEXT } from '../lib/field'

// The form is Park's `textarea` recipe, md size: l2 corners, 12px of side padding and 7px above and below, so one line
// is as tall as a field (40px). The border stays `border-input` (3:1), not Park's lighter one.
// Built on Ark UI's `Field.Textarea` (`@ark-ui/react/field`), with `field-sizing-content` and `min-h-16`; `rows` and
// `resize-*` are left to the caller.
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
 * A multi-line field that grows with its text: Ark UI's `Field.Textarea` (outside a `Field.Root` it behaves like a
 * native `<textarea>`). Same API as before: the props of `<textarea>` (`ref` reaches the `<textarea>`), and `mono` and `maxRows`.
 */
function Textarea({ className, ref, mono = false, maxRows, style, ...props }: TextareaOwnProps) {
  // As many lines of the field's own text (`lh`), and its padding and border above and below (16px, as one line is 40px).
  const capped = maxRows !== undefined && maxRows >= 1 ? { maxHeight: `calc(${Math.floor(maxRows)}lh + 1rem)`, ...style } : style
  return (
    <Field.Textarea
      data-slot="textarea"
      className={cn(TEXTAREA_CLASS, mono && 'font-mono', className)}
      {...(capped ? { style: capped } : {})}
      {...props}
      ref={ref}
    />
  )
}

export { Textarea }
