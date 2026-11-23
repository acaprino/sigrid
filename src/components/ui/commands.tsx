// The commands of an app in one registry: an app declares each command once, near the state it acts on (`useCommand`),
// with its name, its group, its key and whether it can be done now; the key runs it from anywhere in the window, the
// palette lists it (`CommandPalette` with no list), and Ctrl+K (Cmd+K on a Mac) opens the palette in every app. After
// Imago's command registry (`createRegistry`, `mountApp`), which every app of the suite declares its commands in.
// - A key is written as a combination: «Escape», «F6», «Ctrl+F», «Ctrl+Shift+T». `Ctrl` is Cmd on a Mac, and the key is
//   shown in the system's words («Ctrl F», «Cmd F»).
// - A key does nothing while the person types in a field, unless it holds Ctrl or Alt or is a function key; it does
//   nothing inside an open surface (a dialog, a menu, a list of options), which keeps its own keys, and nothing in the
//   places named by `ownKeysIn` (a terminal, a code editor).
// - A command whose `when` is false neither runs nor shows in the palette.
// - A key another handler already refused (`preventDefault`, as `useDesktopGuard` refuses the browser's Ctrl+F) still
//   runs the app's command: the browser's use of the key is what is refused, not the app's.
import * as React from "react"
import { useWords } from "../../words"

export type CommandDeclaration = {
  /** Its name in the registry: one declaration for each, the latest mounted one wins. */
  id: string
  /** What it does, as the user would say it («Search in this view»): its name in the palette. */
  label: string
  /** The heading it sits under in the palette («Go to», «View»). */
  group?: string | undefined
  /** Its key, a key or a combination with `+` («Escape», «F6», «Ctrl+F», «Ctrl+Shift+T»); `Ctrl` is Cmd on a Mac. */
  keys?: string | undefined
  /** Other words it is found by in the palette. */
  keywords?: string | undefined
  /** A 16px drawing before its name in the palette. */
  icon?: React.ReactNode
  /** Whether it can be done now (default true): when false its key does nothing and the palette does not offer it. */
  when?: boolean | undefined
  /** What it does. */
  run: () => void
}

/** The id of the command the registry holds by itself: Ctrl+K, which opens the palette. */
export const PALETTE_COMMAND = "sigrid.palette"

type Entry = { current: CommandDeclaration }
type Registry = {
  put: (entry: Entry) => void
  drop: (entry: Entry) => void
  changed: () => void
  subscribe: (listener: () => void) => () => void
  version: () => number
  all: () => CommandDeclaration[]
}

function createRegistry(): Registry {
  const entries: Entry[] = []
  const listeners = new Set<() => void>()
  let version = 0
  const changed = () => {
    version += 1
    for (const listener of listeners) listener()
  }
  return {
    put: (entry) => {
      entries.push(entry)
      changed()
    },
    drop: (entry) => {
      const at = entries.indexOf(entry)
      if (at >= 0) entries.splice(at, 1)
      changed()
    },
    changed,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    version: () => version,
    // One per id: the latest mounted declaration of an id stands for it.
    all: () => [...new Map(entries.map((entry) => [entry.current.id, entry.current])).values()],
  }
}

type Commands = { registry: Registry; open: boolean; setOpen: (open: boolean) => void; mac: boolean }
const CommandsContext = React.createContext<Commands | null>(null)

/** True on a Mac, an iPhone or an iPad: there Ctrl is the Command key. */
function onMac(): boolean {
  if (typeof navigator === "undefined") return false
  const data = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
  return /mac|iphone|ipad/i.test(data ?? navigator.platform ?? "")
}

type Combination = { key: string; ctrl: boolean; shift: boolean; alt: boolean }
const NAMES: Record<string, string> = { esc: "escape", space: " ", del: "delete", up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" }

/** A key as written («Ctrl+Shift+T») into what it asks of a key press. */
function combination(keys: string): Combination {
  const parts = keys.split("+").map((part) => part.trim()).filter(Boolean)
  const key = (parts.pop() ?? "").toLowerCase()
  const mods = new Set(parts.map((part) => part.toLowerCase()))
  return { key: NAMES[key] ?? key, ctrl: mods.has("ctrl") || mods.has("cmd") || mods.has("mod"), shift: mods.has("shift"), alt: mods.has("alt") || mods.has("option") }
}

function pressed(want: Combination, event: KeyboardEvent, mac: boolean): boolean {
  if (event.key.toLowerCase() !== want.key) return false
  if ((mac ? event.metaKey || event.ctrlKey : event.ctrlKey) !== want.ctrl || event.altKey !== want.alt) return false
  // A sign typed with Shift («?») carries it in its key: Shift is asked of letters and named keys only.
  return want.key.length === 1 && !/[a-z0-9]/.test(want.key) ? true : event.shiftKey === want.shift
}

/** A key as written («Ctrl+Shift+T») in the words of the system it runs on: «Ctrl Shift T», or «Cmd Shift T» on a Mac. */
export function formatKeys(keys: string, mac: boolean = onMac()): string {
  return keys
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const name = part.toLowerCase()
      if (name === "ctrl" || name === "cmd" || name === "mod") return mac ? "Cmd" : "Ctrl"
      if (name === "alt" || name === "option") return mac ? "Option" : "Alt"
      return part.length === 1 ? part.toUpperCase() : part
    })
    .join(" ")
}

const FIELDS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
// An open surface keeps its own keys: the palette its Enter, a menu its arrows, a dialog its Escape.
const SURFACES = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
const within = (event: Event, selector: string) => {
  const target = event.target as Element | null
  return target !== null && typeof target.closest === "function" && target.closest(selector) !== null
}

export type CommandsProviderProps = {
  /** A selector for the places that keep their own keys (`'.xterm, .cm-editor'`): there no command's key runs. */
  ownKeysIn?: string | undefined
  children?: React.ReactNode
}

/**
 * The registry of an app's commands, around the whole app (outside `AppShell`): it runs their keys, holds the palette's
 * open state for a `CommandPalette` with no list, and holds Ctrl+K itself.
 */
function CommandsProvider({ ownKeysIn, children }: CommandsProviderProps) {
  const words = useWords()
  const [registry] = React.useState(createRegistry)
  const [open, setOpen] = React.useState(false)
  const [mac] = React.useState(onMac)
  // Ctrl+K opens the palette: a command like the app's, so the list of keys in the foot can name it.
  const palette = React.useRef<CommandDeclaration>({ id: PALETTE_COMMAND, label: words.palette.command, keys: "Ctrl+K", run: () => setOpen(true) })
  palette.current = { ...palette.current, label: words.palette.command }
  React.useEffect(() => {
    const entry = palette as Entry
    registry.put(entry)
    return () => registry.drop(entry)
  }, [registry])
  React.useEffect(() => {
    const listen = (event: KeyboardEvent) => {
      if (event.isComposing || within(event, SURFACES) || (ownKeysIn && within(event, ownKeysIn))) return
      const typing = within(event, FIELDS)
      for (const command of registry.all().reverse()) {
        if (!command.keys || command.when === false) continue
        const want = combination(command.keys)
        if (!pressed(want, event, mac)) continue
        if (typing && !want.ctrl && !want.alt && !/^f\d{1,2}$/.test(want.key)) continue
        event.preventDefault()
        command.run()
        return
      }
    }
    window.addEventListener("keydown", listen)
    return () => window.removeEventListener("keydown", listen)
  }, [registry, ownKeysIn, mac])
  const value = React.useMemo(() => ({ registry, open, setOpen, mac }), [registry, open, mac])
  return <CommandsContext.Provider value={value}>{children}</CommandsContext.Provider>
}

/**
 * Declares a command for as long as the component is mounted. Its fields are read when it runs or is listed, so a
 * declaration that changes with the app's state (its `when`, its `run`) is always the latest.
 */
function useCommand(command: CommandDeclaration): void {
  const context = React.useContext(CommandsContext)
  const entry = React.useRef<CommandDeclaration>(command)
  entry.current = command
  const registry = context?.registry
  React.useEffect(() => {
    if (!registry) return
    const mine = entry as Entry
    registry.put(mine)
    return () => registry.drop(mine)
  }, [registry, command.id])
  // What the palette and the list of keys show changes with these: they are told.
  React.useEffect(() => {
    registry?.changed()
  }, [registry, command.label, command.group, command.keys, command.keywords, command.when])
}

const NONE: Registry = createRegistry()

/** The commands declared now, available or not, with the system's words for their keys: for a palette or a list of keys. */
function useCommands(): readonly (CommandDeclaration & { shortcut: string | undefined })[] {
  const context = React.useContext(CommandsContext)
  const registry = context?.registry ?? NONE
  const version = React.useSyncExternalStore(registry.subscribe, registry.version, registry.version)
  const mac = context?.mac ?? false
  return React.useMemo(() => registry.all().map((command) => ({ ...command, shortcut: command.keys ? formatKeys(command.keys, mac) : undefined })), [registry, version, mac])
}

/** The palette's open state, for a button that opens it (in a title bar) or an app that opens it itself. */
function useCommandPalette(): { open: boolean; setOpen: (open: boolean) => void } {
  const context = React.useContext(CommandsContext)
  return { open: context?.open ?? false, setOpen: context?.setOpen ?? (() => {}) }
}

export { CommandsContext, CommandsProvider, useCommand, useCommandPalette, useCommands }
