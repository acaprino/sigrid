// A label that keeps one width in both of its weights. The chosen item of a segment, a tab and a view of the bar has
// semibold text and the others medium: without this the chosen one is a few px wider than it was, and the items beside
// it move every time the choice changes (the owner's rule: a control never moves between states; a two-state switch
// stays where it is in both states). The label carries its own text a second time, semibold, in an `::after` with no
// height and no visibility: the box is as wide as the bold text, always. Only a label that is text: anything else is
// drawn as it is. The copy is not in the page's text and screen readers do not read it.
import * as React from "react"

// Under a theme with bold tabs (`ThemeDef.tabs`) the view of a bar and the item of a segment are chosen in weight 700:
// only there the hidden copy is as heavy, so the width they keep is the width of their heaviest self.
const STEADY =
  "inline-flex flex-col items-center after:invisible after:h-0 after:overflow-hidden after:font-semibold after:content-[attr(data-label)] [[data-tabs=bold]_[data-slot=toolbar-tab]_&]:after:font-bold [[data-tabs=bold]_[data-slot=toggle-group-item]_&]:after:font-bold"

/** `children` as a label as wide as its semibold self, when it is text; anything else as it is. */
export function steadyLabel(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string" && typeof children !== "number") return children
  return (
    <span data-slot="steady-label" data-label={children} className={STEADY}>
      {children}
    </span>
  )
}
