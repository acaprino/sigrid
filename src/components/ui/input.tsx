// SmoothUI (MIT) input 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/input.json)
// Park UI (MIT) input 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/input.ts)
import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '../../lib/utils'
import { FOCUS_RING } from '../../lib/focus'

// The form is Park's `input` recipe, md size and outline variant: 40px tall, l2 corners, 12px of side padding, no fill.
// Park's border is its gray step 7, lighter than 3:1: here it stays `border-input` (>= 3:1 on every background,
// contrast test). The text is 14px (16px below 860px, so iOS does not zoom the page on focus).
// Adaptation of SmoothUI's primitive: border `border-input` instead of `border-foreground/25`; the toolkit's focus ring (`lib/focus.ts`, R8) instead of `focus-ring`; no
// `state-transition` nor any other transition: without `animated` the field has no motion styles. `pointer-coarse:min-h-11`
// keeps the 44 px with touch. No default `type` (SmoothUI sets `text`): the attribute stays whatever is passed.
const INPUT_CLASS = cn(
  'h-(--control-md) w-full min-w-0 rounded-md pointer-coarse:min-h-11 border border-line bg-transparent px-(--pad-sm) py-1 text-base file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  FOCUS_RING,
  // Under the pointer the border goes one step darker: the field answers before it is clicked.
  'not-aria-invalid:hover:border-input aria-invalid:border-destructive',
)

/**
 * A one-line field: Base UI's `Input` (outside a `Field` it behaves like a native `<input>`: `value`/`onChange`,
 * `ref`, `autoFocus`, `id` passed as they are). Same API as before: the props of `<input>`.
 */
function Input({ className, ref, ...props }: React.ComponentProps<'input'>) {
  return <InputPrimitive data-slot="input" className={cn(INPUT_CLASS, className)} {...props} ref={ref as React.Ref<HTMLElement>} />
}

export { Input }
