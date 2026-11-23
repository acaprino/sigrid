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
3. For a new screen, `docs/patterns.md` and one of `agents/examples/*.tsx`; for a phone, `docs/mobile.md`.
4. `DESIGN.md` when a rule is in doubt (R1 to R13, tokens, each component's form).

The project's own instructions (its `CLAUDE.md` or `AGENTS.md`) say where its product components live and what it
keeps to itself: they come first where they speak.

## 3. Write

- Start a screen from `AppShell` and its regions. Take controls from the toolkit, everything else from its tokens.
- Never guess a prop: if the catalogue does not have it, it does not exist.
- If the toolkit has no component for the job, say so, and build it in the app from the toolkit's parts. Do not add
  another component library for it, and do not copy a toolkit component into the app.

## 4. Check

Run `npx sigrid-check` from the folder of the app (or `npx sigrid-check <folder>`), and fix every finding. Then, if
the project lets you run it, look at the screen in a browser, wide and at 390px, and go through the rules of
`AGENTS.md` that the check cannot see: one solid primary action, the accent only where it belongs, border or
shadow and never both, icons on navigation rows, 44px for a finger.

Follow the project's own rule on what may be run on the machine (some projects build and test only in CI): the check
reads files and builds nothing.

## 5. Report

Say which components you used, what the check found and what you could not verify (what you did not see in a
browser).
