// Park UI (MIT) field 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/field.ts)
// From Park's `field` recipe comes the form: a column with a 6px gap, the label in 14px medium ink, and the mark of a
// required field after the label. Ours (the owner's design of 2026-11-22): the helper text is 12px muted, and the error
// is a box on the soft destructive fill with the text in the destructive red, while the control keeps its border;
// the required mark is the ink, not the accent (R2), and hidden from screen readers (the control says `required`).
// The wiring is the toolkit's own, so any of its controls can sit inside (`Input`, `Textarea`, `Select`, `DateField`,
// `ChipsInput`, `Switch`): the one child receives the `id` the label points to, `aria-describedby` with the helper or
// the error, and `aria-invalid` when there is an error. The error is announced when it appears (`role="alert"`).
// The headless `Field` of Base UI stays exported for an app that lays a field out by hand.
import * as React from "react"
import { cn, isEmptyNode } from "../../lib/utils"

type Wired = {
  id?: string | undefined
  "aria-describedby"?: string | undefined
  "aria-invalid"?: boolean | "true" | "false" | undefined
  required?: boolean | undefined
}

export type FormFieldProps = {
  /** The visible label. */
  label: React.ReactNode
  /** A sentence under the control: what to write, a limit. */
  help?: React.ReactNode
  /** What is wrong, in words. With it the control is invalid and the sentence takes the helper's place. */
  error?: React.ReactNode
  required?: boolean | undefined
  /** The id of the control, when the caller needs to choose it. */
  id?: string | undefined
  className?: string | undefined
  /** The one control of the field. */
  children: React.ReactElement<Wired>
}

const shown = (text: React.ReactNode) => !isEmptyNode(text)

function FormField({ label, help, error, required, id, className, children }: FormFieldProps) {
  const own = React.useId()
  const controlId = id ?? children.props.id ?? own
  const hasError = shown(error)
  const hasHelp = !hasError && shown(help)
  const noteId = `${controlId}-note`
  const described = [children.props["aria-describedby"], hasError || hasHelp ? noteId : undefined].filter(Boolean).join(" ")
  return (
    <div
      data-slot="field"
      data-invalid={hasError || undefined}
      // With an error the box under the control says what is wrong: the control keeps its own border, not a red one.
      className={cn("flex flex-col gap-1.5 [&[data-invalid]_[aria-invalid=true]]:border-line", className)}
    >
      <label data-slot="field-label" htmlFor={controlId} className="flex items-center gap-0.5 text-start text-sm font-medium text-ink select-none">
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {React.cloneElement(children, {
        id: controlId,
        ...(described ? { "aria-describedby": described } : {}),
        ...(hasError ? { "aria-invalid": true } : {}),
        ...(required ? { required: true } : {}),
      })}
      {hasError ? (
        <p data-slot="field-error" id={noteId} role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : hasHelp ? (
        <p data-slot="field-help" id={noteId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  )
}

export { FormField }
