// What a component of the editor draws, as data: a small tree of elements, with the few expressions an app needs
// (a value kept in state, the function that changes it, going to a screen). One description serves three readers,
// so they cannot disagree: the canvas and the run page turn it into React (render.tsx), and the export prints it as
// the source of an app (codegen.ts). An element names what it is by its tag: a part of the toolkit («Button»), one of
// the few helpers the generated app defines itself («MenuButton»), or an HTML element («div»).
import type * as React from 'react'

/** The names an expression can read while the app runs: the state, its setters, and what the frame provides. */
export type Scope = Record<string, unknown>

/** An expression: its source, as the export writes it, and what it is worth while the app runs. */
export type Expr = { readonly $expr: string; readonly run: (scope: Scope) => unknown }

/** A plain value written as a literal: an array of options, the steps of a path. */
export type Json = { readonly $json: unknown }

export type El = { readonly tag: string; readonly props: Readonly<Record<string, Val>>; readonly children: readonly Child[] }

/** A child that is there only while an expression holds: «narrow only», «wide only». */
export type When = { readonly $when: Expr; readonly then: Child }

/** The place of a slot on the canvas, where components are dropped. Only the canvas makes these. */
export type SlotPlace = { readonly $slot: React.ComponentType<Record<string, unknown>>; readonly props: Readonly<Record<string, unknown>> }

export type Val = string | number | boolean | null | undefined | El | Expr | Json
export type Child = El | string | number | Expr | When | SlotPlace | null | undefined | false

export const isExpr = (value: unknown): value is Expr => typeof value === 'object' && value !== null && '$expr' in value
export const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null && '$json' in value
export const isEl = (value: unknown): value is El => typeof value === 'object' && value !== null && 'tag' in value
export const isWhen = (value: unknown): value is When => typeof value === 'object' && value !== null && '$when' in value
export const isSlot = (value: unknown): value is SlotPlace => typeof value === 'object' && value !== null && '$slot' in value

/** An element. A prop that is undefined is left out; children may be given as lists. */
export function h(tag: string, props?: Record<string, Val> | null, ...children: (Child | readonly Child[])[]): El {
  const kept: Record<string, Val> = {}
  for (const [name, value] of Object.entries(props ?? {})) if (value !== undefined) kept[name] = value
  return { tag, props: kept, children: children.flat().filter((child) => child !== null && child !== undefined && child !== false && child !== '') as Child[] }
}

export const json = (value: unknown): Json => ({ $json: value })

/**
 * A literal as source: a string in single quotes where that needs no escape, a number, true, null. JSON leaves the
 * two Unicode line separators as they are: written out, they would break a line in the middle of a string.
 */
export const lit = (value: unknown): string => (typeof value === 'string' && /^[^'\\\n\r\u2028\u2029]*$/.test(value) ? `'${value}'` : JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'))

/** A name in scope: a value in state, or its setter. */
export const name = (id: string): Expr => ({ $expr: id, run: (scope) => scope[id] })

export const not = (expr: Expr): Expr => ({ $expr: `!${expr.$expr}`, run: (scope) => !expr.run(scope) })

/** `value === "literal"`. */
export const equals = (id: string, value: unknown): Expr => ({ $expr: `${id} === ${lit(value)}`, run: (scope) => scope[id] === value })

/** One call of a function in scope with literal arguments: `setView("board")`. */
export type Call = { readonly fn: string; readonly args: readonly unknown[] }
export const call = (fn: string, ...args: unknown[]): Call => ({ fn, args })

/** A handler that makes one call or several: `() => go("today")`, `() => { setRow(2); go("task") }`. */
export function handler(...calls: (Call | undefined)[]): Expr | undefined {
  const made = calls.filter((c): c is Call => c !== undefined)
  if (made.length === 0) return undefined
  const source = made.map((c) => `${c.fn}(${c.args.map(lit).join(', ')})`)
  return {
    $expr: source.length === 1 ? `() => ${source[0]}` : `() => {\n${source.map((line) => `  ${line}`).join('\n')}\n}`,
    run: (scope) => () => {
      for (const c of made) (scope[c.fn] as ((...args: unknown[]) => void) | undefined)?.(...c.args)
    },
  }
}

/** A value kept in the app's state: its name, its setter, what it starts as, and its type where TypeScript cannot tell. */
export type StateDecl = { readonly name: string; readonly setter: string; readonly initial: unknown; readonly type?: string | undefined }

/* ———— Values that come from the editor's data, made safe: a prop may be missing, or of another kind ———— */

export const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback)
export const flag = (value: unknown): boolean => value === true || value === 'yes'
export const number = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
export const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [])
/** One of a few words, or the first of them. */
export const oneOf = <T extends string>(value: unknown, words: readonly T[]): T => (words.includes(value as T) ? (value as T) : (words[0] as T))
/** A word that can be an identifier and an address: «In progress» is `in-progress`. */
export const slug = (value: string, fallback = 'item'): string => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback
