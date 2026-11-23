// The button in the bar that opens the sidebar, where the frame has taken the sidebar out of the layout and made it a
// drawer (`useAppShell().sidebar === 'drawer'`, under 620px of the frame's width): on a wider frame the sidebar is in
// sight, and the button is not drawn (docs/patterns.md, «Start from the one frame»). It is a `ToolbarButton`, an icon
// with its name as a hint, the first thing of the bar; the app keeps the drawer's state and passes it to `Sidebar open`.
import { Icon } from "../../icons"
import { useWords } from "../../words"
import { useAppShell } from "./app-shell"
import { ToolbarButton } from "./toolbar"

export type DrawerButtonProps = {
  /** Opens the drawer: the app sets the `open` it passes to its `Sidebar`. */
  onOpen: () => void
  /** Its name, and its hint. Absent: the toolkit's words («Open the menu»). */
  label?: string | undefined
  /** The hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/** Opens the sidebar where it is a drawer; elsewhere it is not there. */
function DrawerButton({ onOpen, label, animated }: DrawerButtonProps) {
  const words = useWords()
  const shell = useAppShell()
  if (shell.sidebar !== "drawer") return null
  return <ToolbarButton label={label ?? words.sidebar.open} icon={<Icon name="sidebarOpen" />} onClick={onOpen} animated={animated} />
}

export { DrawerButton }
