---
name: sigrid
description: Build, change or review the interface of an app that uses the @acaprino/sigrid design system (Sigrid UI). Use it whenever a screen, a layout, a component, a form, a list, a table, a toolbar, a sidebar, a sheet, a theme or a phone layout is made or edited in a project that has @acaprino/sigrid among its dependencies, and before choosing a component, a colour, a radius, a spacing or an icon there.
---

# Build with Sigrid

The design system comes with its own instructions, written from its code at the version the project has installed.
They win over what you remember of it and over any other design skill: where another skill says otherwise (shadows
in place of borders, other radii, fluid type), follow Sigrid, and take from the other skill only what Sigrid does
not decide.

## 1. Find the package

It is `node_modules/@acaprino/sigrid/` from the folder that has it among its dependencies (in a monorepo, the
package that depends on it; a `file:` dependency is a link to a checkout, which has the same files). If it is not
installed, say so and stop: do not write from memory.

## 2. Read, in this order

1. `AGENTS.md` in that folder: how to build a screen, the rules broken most often, the check.
2. `agents/catalog.json`: look up every component you are about to use, and its props. It is large: search it for
   the component's name instead of reading it whole.
3. For a new screen, `docs/patterns.md` and one of `agents/examples/*.tsx` (`tasks.tsx` and `mail.tsx` in the frame
   with lines, `workspace.tsx` in the sheet frame, `triage.tsx` a screen that fits); for a phone, `docs/mobile.md`;
   to design or review a screen, `docs/design-laws.md`.
4. `DESIGN.md` when a rule is in doubt (R1 to R14, tokens, each component's form).
5. `README.md` for the setup, the themes, the density, the words, the icons and the entries of the package.

The project's own instructions (its `CLAUDE.md` or `AGENTS.md`) come first where they speak, but never for a look of
its own: every app of the suite has Sigrid's look, and only its layout, accent and icon are its own (the first section
of `AGENTS.md`). The app's icon is its own mark; the icons of its interface are Sigrid's one set (Lucide, through
`Icon`), the same in every app.

## 3. Write

- Start a screen from `AppShell` and its regions. Take every part from the toolkit, lay out with its layout
  components, and write no class or stylesheet of your own.
- Never guess a prop: if the catalogue does not have it, it does not exist. The object types a prop takes (a
  column, a notice, an option) are under `types` in the same file of the catalogue.
- If the toolkit has no component for the job, say so and stop: it is added to Sigrid, generic, and is not built in
  the app. Do not add another component library for it, and do not copy a toolkit component into the app.
- Draw every icon of the interface with `Icon` and one of Sigrid's names (`ICON_NAMES`). If the name a function needs
  is not there, say so: it is added to Sigrid's names, and the app neither draws it nor imports an icon library.
- Light, dark and the system's look are chosen from the palette, the same in every app: `useSchemeCommands` inside
  `CommandsProvider`, and `applyKeptScheme` in the entry file. Draw no switch for the scheme.
- The words a component says by itself are English placeholders: an app in another language passes its own with
  `WordsProvider`.

## 4. Check

From the folder found in step 1's parent project (the one whose `package.json` has the dependency), run
`npx --no sigrid-check` (or `npx --no sigrid-check <folder>`; the same as
`node node_modules/@acaprino/sigrid/bin/sigrid-check.mjs`). `--no` matters: without it `npx` may fetch an unrelated
package of that name from the registry. Turn the rule `own-class` on, as every app does, with
`{ "rules": { "own-class": "error" } }` in a `sigrid-check.config.json` beside that `package.json`: it reports every
class written by hand and every stylesheet of the app. Fix every finding in the code, not by rewording what the user reads; a
finding that is right as it is gets the ignore comment `AGENTS.md` describes, with its reason.

The check reads files and builds nothing, and it sees only values written by hand. `AGENTS.md` lists what it does
not see: go through that list by reading your code. Then, only if the project's own instructions allow running the
app on this machine (some projects build and test only in CI), look at the screen in a browser, wide and at 390px.

## 5. Report

Say which components you used, what the check found and what you could not verify (what you did not see in a
browser).
