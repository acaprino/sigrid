// Base UI parts an app composes by itself (a collapsible group, a field with its description, a popover laid out by
// hand), re-exported so the app takes them from the toolkit: one copy of Base UI in the bundle, never two (a second
// copy would not share the floating tree, the focus guards or the portals of the toolkit's dialogs and menus).
export { Collapsible } from '@base-ui/react/collapsible'
export { Field } from '@base-ui/react/field'
export { Popover as PopoverPrimitive } from '@base-ui/react/popover'
