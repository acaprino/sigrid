// The command palette: quick access to everything an app can do, from the keyboard. A dialog near the top of the
// window with one field and the list of commands under it; typing narrows the list, the arrows move, Enter runs the
// command and closes the palette, Esc closes it. Each command shows its own key at the end of its row, as plain text
// (R5), so the palette also teaches the keys. After Imago's `openPalette`, which every app of the suite opens with
// Ctrl+K from a button of its title bar.
// The commands are the app's: the palette knows none. Given no list, it shows the commands the app declared in its
// registry (`CommandsProvider`, `useCommand`), by group, those that cannot be done now dimmed, and the registry opens it
// with Ctrl+K. A command is found by its name and by its `keywords`; every word typed has to be in one of the two. The highlighted row is the one language of every list (`ROW_HIGHLIGHT`).
// A command that chooses one of several (`checked`: light, dark, the system's look) is an option checked or not: the one
// in use has a check at the end of its row, in the ink (R2), the look of `Combobox`'s chosen option; for a screen reader
// it is `aria-checked` on the option, because `aria-selected` marks the highlighted row. The others keep the check's
// room, so a key after it does not move.
import * as React from "react"
import { Check } from "lucide-react"
import { Icon } from "../icons"
import { cn } from "../lib/utils"
import { KEY_CAP } from "../primitives/kbd"
import { GROUP_LABEL, ROW_HIGHLIGHT } from "../lib/rows"
import { useWords } from "../words"
import { CommandsContext, PALETTE_COMMAND, useCommands } from "./commands"
import { Dialog, DialogContent, DialogTitle } from "../primitives/dialog"

export type Command = {
  id: string
  /** What it does, as the user would say it («Go to Settings»). */
  label: string
  /** Its own key («Ctrl F»), shown at the end of the row. The app binds it. */
  shortcut?: string | undefined
  /** The heading it sits under («Go to», «Look»). Commands of one group follow each other. */
  group?: string | undefined
  /** A 16px drawing before the name. */
  icon?: React.ReactNode
  /** Other words it is found by. */
  keywords?: string | undefined
  disabled?: boolean | undefined
  /** For a command that chooses one of several: true for the one in use (a check at the end of its row, `aria-checked`), false for the others. Absent: not a choice. */
  checked?: boolean | undefined
  onSelect: () => void
}

/** Open and closed by the app, or both absent: then the registry's own state (`CommandsProvider`), which Ctrl+K opens. */
export type CommandPaletteOpenness = { open: boolean; onOpenChange: (open: boolean) => void } | { open?: undefined; onOpenChange?: undefined }

export type CommandPaletteProps = CommandPaletteOpenness & {
  /** What it lists. Absent: the commands declared in the registry (`useCommand`), by group, those that cannot be done now dimmed. */
  commands?: readonly Command[] | undefined
  /** The name of the palette and the placeholder of its field. Absent: the toolkit's words («Type a command»). */
  label?: string | undefined
  /** Said when no command holds the text. Absent: the toolkit's words. */
  emptyText?: string | undefined
  /** The palette fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

/** The commands that hold every word of the text, in their own order. */
export function filterCommands(commands: readonly Command[], text: string): Command[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  return commands.filter((command) => {
    const hay = `${command.label} ${command.keywords ?? ""}`.toLowerCase()
    return words.every((word) => hay.includes(word))
  })
}

// The registry's commands, each group together in the order its first command was declared.
function grouped(list: readonly Command[]): Command[] {
  const order = [...new Set(list.map((command) => command.group))]
  return order.flatMap((group) => list.filter((command) => command.group === group))
}

const NOTHING = () => {}

function CommandPalette({ open: openProp, onOpenChange: onOpenChangeProp, commands: commandsProp, label, emptyText, animated }: CommandPaletteProps) {
  const words = useWords()
  const registry = React.useContext(CommandsContext)
  const declared = useCommands()
  const open = openProp ?? registry?.open ?? false
  const onOpenChange = onOpenChangeProp ?? registry?.setOpen ?? NOTHING
  const commands = React.useMemo<readonly Command[]>(
    () =>
      commandsProp ??
      grouped(
        declared
          .filter((command) => command.id !== PALETTE_COMMAND)
          .map((command) => ({ id: command.id, label: command.label, group: command.group, shortcut: command.shortcut, icon: command.icon, keywords: command.keywords, disabled: command.when === false, checked: command.checked, onSelect: command.run })),
      ),
    [commandsProp, declared],
  )
  const name = label ?? words.palette.placeholder
  const [text, setText] = React.useState("")
  const [active, setActive] = React.useState(0)
  const id = React.useId()
  const list = React.useRef<HTMLDivElement>(null)
  // Each opening starts empty, on the first command.
  React.useEffect(() => {
    if (open) {
      setText("")
      setActive(0)
    }
  }, [open])
  const found = React.useMemo(() => filterCommands(commands, text), [commands, text])
  const usable = found.map((command, i) => (command.disabled ? -1 : i)).filter((i) => i >= 0)
  const current = usable.includes(active) ? active : (usable[0] ?? -1)
  React.useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" })
  }, [current])
  const run = (command: Command | undefined) => {
    if (!command || command.disabled) return
    onOpenChange(false)
    command.onSelect()
  }
  const move = (step: 1 | -1) => {
    if (usable.length === 0) return
    const at = usable.indexOf(current)
    setActive(usable[(at + step + usable.length) % usable.length]!)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} animated={animated} data-slot="command-palette" className="top-24 translate-y-0 gap-0 overflow-hidden p-0 md:p-0">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <label className="flex min-h-12 items-center gap-2 border-b border-line px-4">
          <Icon name="search" className="size-4 text-ink-mute" />
          <input
            data-slot="command-palette-input"
            type="text"
            role="combobox"
            aria-label={name}
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={current >= 0 ? `${id}-${current}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={name}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              // With an IME, Enter confirms the candidate being composed: it must not run a command.
              if (event.nativeEvent.isComposing) return
              if (event.key === "ArrowDown") move(1)
              else if (event.key === "ArrowUp") move(-1)
              else if (event.key === "Home" && usable.length > 0) setActive(usable[0]!)
              else if (event.key === "End" && usable.length > 0) setActive(usable[usable.length - 1]!)
              else if (event.key === "Enter") run(found[current])
              else return
              event.preventDefault()
            }}
            // The field has the focus for as long as the palette is open: the caret shows it, and the row it acts on
            // is highlighted under it.
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-ink-mute md:text-sm"
          />
        </label>
        <div ref={list} id={`${id}-list`} role="listbox" aria-label={name} data-slot="command-palette-list" className="flex max-h-80 flex-col gap-0.5 overflow-y-auto p-1">
          {found.length === 0 ? (
            <p role="status" data-slot="command-palette-empty" className="px-3 py-4 text-sm text-ink-mute">
              {emptyText ?? words.palette.empty}
            </p>
          ) : (
            found.map((command, i) => (
              <React.Fragment key={command.id}>
                {command.group !== undefined && command.group !== found[i - 1]?.group ? (
                  <div role="presentation" className={cn("px-3 pt-2 pb-1 text-ink-mute", GROUP_LABEL)}>
                    {command.group}
                  </div>
                ) : null}
                <div
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  aria-disabled={command.disabled || undefined}
                  aria-checked={command.checked}
                  data-slot="command-palette-item"
                  onPointerMove={() => {
                    if (!command.disabled && i !== current) setActive(i)
                  }}
                  onClick={() => run(command)}
                  className={cn("flex min-h-(--row-height) shrink-0 cursor-default items-center gap-2 rounded-md px-3 text-sm text-ink-soft select-none pointer-coarse:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0", i === current && ROW_HIGHLIGHT, command.disabled && "opacity-50")}
                >
                  {command.icon}
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.shortcut ? <span data-slot="command-palette-shortcut" className={cn("text-2xs font-medium text-ink-mute pointer-coarse:max-md:hidden", KEY_CAP)}>{command.shortcut}</span> : null}
                  {command.checked === undefined ? null : <Check aria-hidden="true" data-slot="command-palette-check" className={cn("size-4 text-ink", !command.checked && "invisible")} />}
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Calls back on Ctrl+K (Cmd+K on a Mac), the key every app of the suite opens its palette with, wherever the focus
 * is. `key` names another letter. The browser's own use of the key is taken over while the app is mounted.
 */
export function useCommandKey(onPress: () => void, key = "k"): void {
  const latest = React.useRef(onPress)
  latest.current = onPress
  React.useEffect(() => {
    const listen = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== key.toLowerCase()) return
      event.preventDefault()
      latest.current()
    }
    window.addEventListener("keydown", listen)
    return () => window.removeEventListener("keydown", listen)
  }, [key])
}

export { CommandPalette }
