// The commands of an app in one registry: an app declares each command once, near the state it acts on (`useCommand`),
// with its name, its group, its key and whether it can be done now; the key runs it from anywhere in the window, the
// palette lists it (`CommandPalette` with no list), and Ctrl+K (Cmd+K on a Mac) opens the palette in every app. After
// Imago's command registry (`createRegistry`, `mountApp`), which every app of the suite declares its commands in.
// - A key is written as `KeyboardEvent.key` names it, after `Ctrl`, `Alt` and `Shift`: «Escape», «F6», «Ctrl+F»,
//   «Ctrl+Shift+T», «Shift+?», «Ctrl++». `Ctrl` is Cmd on a Mac (Control stays the system's there), and the key is shown
//   in the words of the system and the app's language («Ctrl F», «Cmd F», «Strg F»). A letter or a digit is also found
//   by its place on the keyboard when the layout writes another sign there (Cyrillic, Option on a Mac); a digit or a
//   sign is found whatever Shift it took (AZERTY), and a sign typed with AltGr is not read as Ctrl+Alt.
// - Where a key belongs to what has the focus, it is left there: in a field, a plain key (but Escape and the function
//   keys) and Ctrl or Alt with a key that moves the caret; on a control, Enter, Space and the keys that move inside it;
//   in an open surface (a dialog, a menu, a list of options), a key with neither Ctrl nor Alt; a plain key a widget
//   already handled (`preventDefault`, or not let through with `stopPropagation`); and every key in the places
//   `ownKeysIn` names (a terminal, a code editor). A combination another handler refused (`useDesktopGuard` refuses
//   the browser's Ctrl+F) still runs the app's command: the browser's use of the key is what was refused.
// - A command whose `when` is false does not run, and the palette shows it dimmed, so the list does not jump.
// - The registry is in the order the commands are declared in the tree; when two available commands share a key, the
//   one declared last runs.
// - `KeyHints`, in the window's foot, names the keys that work now of the commands the app picks (R5: plain text,
//   hidden on a phone).
import * as React from "react"
import { FIELDS } from "../../internal/desktop-guard"
import { cn } from "../../lib/utils"
import { DEFAULT_WORDS, useWords, type Words } from "../../words"
import { Kbd, ON_PHONE_HIDDEN } from "./kbd"

export type CommandDeclaration = {
  /** Its name in the registry: one for each id, the one declared last stands for it. */
  id: string
  /** What it does, as the user would say it («Search in this view»): its name in the palette. */
  label: string
  /** The heading it sits under in the palette («Go to», «View»). */
  group?: string | undefined
  /** Its key, as `KeyboardEvent.key` names it, after `Ctrl`, `Alt`, `Shift` («Escape», «F6», «Ctrl+F», «Shift+?»); `Ctrl` is Cmd on a Mac. */
  keys?: string | undefined
  /** Other words it is found by in the palette. */
  keywords?: string | undefined
  /** A 16px drawing before its name in the palette. */
  icon?: React.ReactNode
  /** Whether it can be done now (default true): when false its key does nothing and the palette shows it dimmed. */
  when?: boolean | undefined
  /** What it does; the one of the latest render runs. */
  run: () => void
}

/** The id of the command the registry holds by itself: Ctrl+K, which opens the palette. */
export const PALETTE_COMMAND = "sigrid.palette"

type Entry = { order: number; command: CommandDeclaration }
type Registry = {
  put: (entry: Entry) => void
  drop: (entry: Entry) => void
  changed: () => void
  subscribe: (listener: () => void) => () => void
  version: () => number
  all: () => CommandDeclaration[]
}

// What a list hands out: the command as it is now, whose `run` is read when it runs, so a palette that kept the list
// still runs the latest one.
const view = (entry: Entry): CommandDeclaration => ({ ...entry.command, run: () => entry.command.run() })

function createRegistry(): Registry {
  const entries = new Set<Entry>()
  const listeners = new Set<() => void>()
  let version = 0
  const changed = () => {
    version += 1
    for (const listener of listeners) listener()
  }
  return {
    put: (entry) => {
      entries.add(entry)
      changed()
    },
    drop: (entry) => {
      entries.delete(entry)
      changed()
    },
    changed,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    version: () => version,
    all: () => {
      const sorted = [...entries].sort((a, b) => a.order - b.order)
      const last = new Map(sorted.map((entry) => [entry.command.id, entry]))
      return sorted.filter((entry) => last.get(entry.command.id) === entry).map(view)
    },
  }
}

// The order of declaration: taken at a component's first render, which runs from the root down the tree.
let declared = 0

type Commands = { registry: Registry; open: boolean; setOpen: (open: boolean) => void; mac: boolean }
const CommandsContext = React.createContext<Commands | null>(null)

/** True on a Mac, an iPhone or an iPad: there Ctrl is the Command key. */
function onMac(): boolean {
  if (typeof navigator === "undefined") return false
  const data = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
  return /mac|iphone|ipad/i.test(data ?? navigator.platform ?? "")
}

type Combination = { key: string; ctrl: boolean; shift: boolean; alt: boolean }

/** A key as written («Ctrl+Shift+T», «Ctrl++») into what it asks of a key press. */
function combination(keys: string): Combination {
  const written = keys.trim()
  const parts = written === "+" ? ["+"] : written.endsWith("++") ? [...written.slice(0, -2).split("+"), "+"] : written.split("+")
  const names = parts.map((part) => part.trim()).filter(Boolean)
  const key = (names.pop() ?? "").toLowerCase()
  const mods = new Set(names.map((part) => part.toLowerCase()))
  return { key: key === "space" ? " " : key, ctrl: mods.has("ctrl"), shift: mods.has("shift"), alt: mods.has("alt") }
}

function pressed(want: Combination, event: KeyboardEvent, mac: boolean): boolean {
  // AltGr writes a sign: it is not Ctrl and Alt held. Where the browser does not say so, Ctrl and Alt that write a sign
  // are AltGr (so Ctrl+Alt with a sign cannot be a command).
  const altGraph = event.getModifierState?.("AltGraph") === true || (event.ctrlKey && event.altKey && event.key.length === 1 && !/[a-z0-9]/i.test(event.key))
  // The other command key (Control on a Mac, the Windows key elsewhere) is the system's: never one of the app's keys.
  if (mac ? event.ctrlKey && !altGraph : event.metaKey) return false
  const ctrl = !altGraph && (mac ? event.metaKey : event.ctrlKey)
  const alt = !altGraph && event.altKey
  if (ctrl !== want.ctrl || alt !== want.alt) return false
  const key = event.key.toLowerCase()
  // A letter or a digit is found by its place when the layout (or Option) writes another sign there.
  const byPlace = !/^[a-z0-9]$/.test(key) && ((/^[a-z]$/.test(want.key) && event.code === `Key${want.key.toUpperCase()}`) || (/^[0-9]$/.test(want.key) && event.code === `Digit${want.key}`))
  if (key !== want.key && !byPlace) return false
  // Shift is asked of letters and named keys; a digit or a sign takes whatever Shift the keyboard needs for it.
  const sign = want.key.length === 1 && !/[a-z]/.test(want.key)
  return sign || event.shiftKey === want.shift
}

/** The words for the keys that are held: `Ctrl`, and `Cmd` on a Mac, `Alt` and `Option`, `Shift`. */
export type KeyNames = Words["keys"]

/**
 * A key as written («Ctrl+Shift+T») in the words of the system it runs on and of the app's language: «Ctrl Shift T», or
 * «Cmd Shift T» on a Mac. `names` are the toolkit's words for the keys held (`useWords().keys`).
 */
export function formatKeys(keys: string, mac: boolean = onMac(), names: KeyNames = DEFAULT_WORDS.keys): string {
  const want = combination(keys)
  const key = want.key === " " ? "Space" : want.key.length === 1 ? want.key.toUpperCase() : (keys.trim().split("+").pop() ?? want.key).trim()
  return [want.ctrl ? (mac ? names.cmd : names.ctrl) : null, want.alt ? (mac ? names.option : names.alt) : null, want.shift ? names.shift : null, key].filter(Boolean).join(" ")
}

// An open surface keeps its keys that have neither Ctrl nor Alt: the palette its Enter, a menu its arrows, a dialog
// its Escape. A combination goes through: Ctrl+K still opens the palette from the inspector shown as a sheet.
const SURFACES = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
// On a control, the keys that act on it or move inside it.
const CONTROLS = 'button, a[href], summary, [role="button"], [role="tab"], [role="slider"], [role="treeitem"], [role="tree"], [role="gridcell"], [role="grid"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="application"]'
const CONTROL_KEYS = new Set(["enter", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "home", "end", "pageup", "pagedown", "delete", "backspace"])
// In a field, the keys that move the caret or edit, with Ctrl or Alt too (a word to the left, the start of the line).
const CARET_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "home", "end", "pageup", "pagedown", "delete", "backspace", "enter", "tab"])
const within = (event: Event, selector: string) => {
  const target = event.target as Element | null
  return target !== null && typeof target.closest === "function" && target.closest(selector) !== null
}

/** Whether a key press that matches a command belongs to what has the focus instead. */
function leftToFocus(want: Combination, event: KeyboardEvent): boolean {
  const functionKey = /^f\d{1,2}$/.test(want.key)
  const plain = !want.ctrl && !want.alt && !functionKey
  if (plain && event.defaultPrevented) return true
  if (within(event, SURFACES) && (plain || functionKey)) return true
  if (within(event, FIELDS)) return plain ? want.key !== "escape" : !functionKey && CARET_KEYS.has(want.key)
  return plain && CONTROL_KEYS.has(want.key) && within(event, CONTROLS)
}

export type CommandsProviderProps = {
  /** A selector for the places that keep their own keys (`'.xterm, .cm-editor'`): there no command's key runs. */
  ownKeysIn?: string | undefined
  /** Whether Ctrl+K opens the registry's palette (default true). False leaves Ctrl+K to an app that opens its palette itself. */
  palette?: boolean | undefined
  children?: React.ReactNode
}

/**
 * The registry of an app's commands, around the whole app (outside `AppShell`): it runs their keys, holds the palette's
 * open state for a `CommandPalette` with no list, and holds Ctrl+K itself.
 */
function CommandsProvider({ ownKeysIn, palette = true, children }: CommandsProviderProps) {
  const words = useWords()
  const [registry] = React.useState(createRegistry)
  const [open, setOpen] = React.useState(false)
  // The system is read after the first paint, so the page drawn on a server and in the browser is the same.
  const [mac, setMac] = React.useState(false)
  React.useEffect(() => setMac(onMac()), [])
  // Ctrl+K opens the palette: a command like the app's, first of the list, so the list of keys in the foot can name it.
  const [own] = React.useState<Entry>(() => ({ order: 0, command: { id: PALETTE_COMMAND, label: "", keys: "Ctrl+K", run: () => setOpen(true) } }))
  own.command = { ...own.command, label: words.palette.command }
  React.useEffect(() => {
    if (!palette) return
    registry.put(own)
    return () => registry.drop(own)
  }, [registry, own, palette])
  React.useEffect(() => {
    registry.changed()
  }, [registry, words.palette.command])
  React.useEffect(() => {
    const listen = (event: KeyboardEvent) => {
      if (event.isComposing || (ownKeysIn && within(event, ownKeysIn))) return
      for (const command of registry.all().reverse()) {
        if (!command.keys || command.when === false) continue
        const want = combination(command.keys)
        if (!pressed(want, event, mac) || leftToFocus(want, event)) continue
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
 * Declares a command for as long as the component is mounted. The declaration of the latest render is the one that
 * runs and is listed, so `when` and `run` can follow the app's state.
 */
function useCommand(command: CommandDeclaration): void {
  const context = React.useContext(CommandsContext)
  const [entry] = React.useState<Entry>(() => ({ order: (declared += 1), command }))
  entry.command = command
  const registry = context?.registry
  React.useEffect(() => {
    if (!registry) return
    registry.put(entry)
    return () => registry.drop(entry)
  }, [registry, entry])
  // What the palette and the list of keys show changes with these: they are told.
  React.useEffect(() => {
    registry?.changed()
  }, [registry, command.id, command.label, command.group, command.keys, command.keywords, command.when])
}

const NONE: Registry = createRegistry()

/** The commands declared now, in their order, available or not, each key in the words of the system: for a palette or a list of keys. */
function useCommands(): readonly (CommandDeclaration & { shortcut: string | undefined })[] {
  const context = React.useContext(CommandsContext)
  const names = useWords().keys
  const registry = context?.registry ?? NONE
  const version = React.useSyncExternalStore(registry.subscribe, registry.version, registry.version)
  const mac = context?.mac ?? false
  return React.useMemo(() => registry.all().map((command) => ({ ...command, shortcut: command.keys ? formatKeys(command.keys, mac, names) : undefined })), [registry, version, mac, names])
}

/** The palette's open state, for a button that opens it (in a title bar) or an app that opens it itself. */
function useCommandPalette(): { open: boolean; setOpen: (open: boolean) => void } {
  const context = React.useContext(CommandsContext)
  return { open: context?.open ?? false, setOpen: context?.setOpen ?? (() => {}) }
}

/** A key that is not a command of the registry but works all the same (F6 of the frame): its key and its name. */
export type KeyHint = { keys: string; label: string }

export type KeyHintsProps = {
  /** What it names, in this order: a command by its id (shown when it has a key and can be done now; `PALETTE_COMMAND` names Ctrl+K), or a key that is not a command (`{ keys: 'F6', label: 'Next region' }`). */
  ids: readonly (string | KeyHint)[]
  /** Its name for screen readers. Absent: the toolkit's words («Keys»). */
  "aria-label"?: string | undefined
}

/**
 * The keys that work now, for the window's foot (`AppShell`'s `footer`): each named command that has a key and can be
 * done now, its key as plain text and its name («Ctrl K Commands»). A command that cannot be done now leaves the list
 * and comes back with it. Hidden on a phone, where there is no keyboard to press them on.
 */
function KeyHints({ ids, "aria-label": label }: KeyHintsProps) {
  const words = useWords()
  const commands = useCommands()
  const context = React.useContext(CommandsContext)
  const shown = ids.flatMap((id) =>
    typeof id === "string"
      ? commands.filter((command) => command.id === id && command.shortcut !== undefined && command.when !== false).map((command) => ({ key: command.id, shortcut: command.shortcut, label: command.label }))
      : [{ key: `keys:${id.keys}`, shortcut: formatKeys(id.keys, context?.mac ?? false, words.keys), label: id.label }],
  )
  if (shown.length === 0) return null
  return (
    <ul role="list" aria-label={label ?? words.palette.keys} data-slot="key-hints" className={cn("flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap", ON_PHONE_HIDDEN)}>
      {shown.map((hint) => (
        <li key={hint.key} className="inline-flex items-center gap-1">
          <Kbd>{hint.shortcut}</Kbd>
          <span>{hint.label}</span>
        </li>
      ))}
    </ul>
  )
}

export { CommandsContext, CommandsProvider, KeyHints, useCommand, useCommandPalette, useCommands }
