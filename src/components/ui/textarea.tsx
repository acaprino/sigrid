// SmoothUI (MIT) textarea 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/textarea.json)
// Park UI (MIT) textarea 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/textarea.ts)
import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '../../lib/utils'
import { FOCUS_FIELD } from '../../lib/focus'

// The form is Park's `textarea` recipe, md size: l2 corners, 12px of side padding and 7px above and below, so one line
// is as tall as a field (40px). The border stays `border-input` (3:1), not Park's lighter one.
// Adaptation: as in SmoothUI, Base UI's `Input` rendered as a `<textarea>`. With our tokens: `border-input` border
// (>= 3:1), the toolkit's focus ring (`lib/focus.ts`, R8), no transitions. `field-sizing-content` stays (the capture box
// grows with the text; cap and scrolling are set by Stack) and `min-h-16`; no `resize-y`, `min-h-20` nor `rows = 4` by
// SmoothUI's default: `rows` and `resize-*` are left to whoever uses the component.
const TEXTAREA_CLASS = cn(
  // design-check-ignore-next-line dimension-value: Park's md textarea padding (7px), so one line with its 1px border is 40px like a field
  'flex field-sizing-content min-h-16 w-full rounded-md border border-line bg-transparent px-(--pad-sm) py-[7px] text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm',
  FOCUS_FIELD,
  'not-aria-invalid:hover:border-input',
)

type PrimitiveProps = React.ComponentProps<typeof InputPrimitive>

/**
 * A multi-line field. Same API as before: the props of `<textarea>` (`ref` reaches the `<textarea>`). Base UI's types
 * describe an `<input>`: with `render` the element is a `<textarea>`, so the props are passed with a cast.
 */
function Textarea({ className, ref, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <InputPrimitive
      render={<textarea />}
      data-slot="textarea"
      className={cn(TEXTAREA_CLASS, className)}
      {...(props as unknown as Omit<PrimitiveProps, 'ref' | 'render' | 'className'>)}
      ref={ref as React.Ref<HTMLElement>}
    />
  )
}

export { Textarea }
