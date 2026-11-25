// The tree of a workspace and what is done to it (`Workspace` draws it): panes in a split tree, each leaf a group of
// tabs. Plain data, so an app keeps it, saves it as JSON and restores it; every function here is pure and gives back a
// new tree, or the very same one when there is nothing to change, so an app can tell by `===` whether to save.
// - A `split` puts its children side by side (`horizontal`: the first at the start of the line) or one under the other
//   (`vertical`), each as wide or as tall as its `weight` is of all of them. Weights are ratios, not pixels.
// - A `tabs` is a group: its tabs in order and the one chosen (`activeId`, null with no tabs). The ids of the groups and
//   of the tabs are the app's, and each is unique in the tree.
// - The tree is always normal (`normalizeWorkspace`): no group is empty unless it is the only one, no split has a single
//   child or a child that splits the same way (it is folded in), every weight is a positive number, every group names a
//   tab that is in it. Each function that changes the tree gives it back normal.
// - Where a tab goes is a `WorkspaceDrop`: into a group at a slot, or to an edge of a group, which divides that group
//   and puts the tab in a new one beside it. The same value is what a drop of the pointer and a key of the keyboard say.
// - Geometry is in fractions of the whole workspace (`layoutWorkspace`): the groups' boxes, the sashes between them and
//   the nearest group in a direction, so the drawing, the drop targets and the keyboard read one source.
import type { IconName } from '../icons'

/** A tab: what its title says, an icon if it has one, a colour if the person gave one to what it holds, and whether it can be closed (default yes). An app may add its own fields (`WorkspaceTab` is what the parts need). */
export type WorkspaceTab = {
  id: string
  title: string
  icon?: IconName | undefined
  /** A colour the person gave to what the tab holds (a thread, a project), one of the palette's (`COLORS`): a `Dot` before the title, so the tabs of one thing are told apart in the panes they share. */
  color?: string | undefined
  closable?: boolean | undefined
}

/** A group of tabs: a pane. `activeId` is the tab shown, `null` when the group has none. */
export type WorkspaceTabs<T extends WorkspaceTab = WorkspaceTab> = {
  kind: 'tabs'
  id: string
  tabs: readonly T[]
  activeId: string | null
}

/** Children side by side (`horizontal`) or one under the other (`vertical`). */
export type WorkspaceDirection = 'horizontal' | 'vertical'

/** A division: `children` in a line, each with its `weights` share. There are at least two children and as many weights. */
export type WorkspaceSplit<T extends WorkspaceTab = WorkspaceTab> = {
  kind: 'split'
  direction: WorkspaceDirection
  weights: readonly number[]
  children: readonly WorkspaceNode<T>[]
}

/** A pane (a group of tabs) or a division of panes. */
export type WorkspaceNode<T extends WorkspaceTab = WorkspaceTab> = WorkspaceTabs<T> | WorkspaceSplit<T>

/** A side of a group, in the sides of the line of reading: `start` and `end` follow the language, `top` and `bottom` do not. */
export type WorkspaceEdge = 'start' | 'end' | 'top' | 'bottom'

/**
 * Where a tab is put. In a group, at a slot of its strip (`index`: before the tab now at that place, the end when
 * absent). Or at an edge of a group: the group is divided there and the tab goes into a new group, named `newId`.
 */
export type WorkspaceDrop = { groupId: string; index?: number | undefined } | { groupId: string; edge: WorkspaceEdge; newId: string }

/** The path of a split from the root: the index of the child to take at each step. The root is `[]`. */
export type WorkspacePath = readonly number[]

/** A box in fractions (0 to 1) of the workspace: `x` and `y` from its start and top. */
export type WorkspaceRect = { x: number; y: number; width: number; height: number }

/** A line between two children of a split, in the same fractions. */
export type WorkspaceSash = {
  /** The split it divides. */
  path: WorkspacePath
  /** Between the children `boundary` and `boundary + 1`. */
  boundary: number
  direction: WorkspaceDirection
  /** Where the line is: `x` for a `horizontal` split (a vertical line), `y` for a `vertical` one. */
  at: number
  /** Where it starts and how long it is across the split. */
  from: number
  length: number
  /** How much of the workspace the split takes along its direction: what a distance moved is a fraction of. */
  span: number
  /** The split's weights now. */
  weights: readonly number[]
}

/** What the geometry of a tree says: the box of each group (by id) and the sashes. */
export type WorkspaceLayout = { groups: ReadonlyMap<string, WorkspaceRect>; sashes: readonly WorkspaceSash[] }

const horizontal = (edge: WorkspaceEdge): boolean => edge === 'start' || edge === 'end'
const before = (edge: WorkspaceEdge): boolean => edge === 'start' || edge === 'top'
const directionOf = (edge: WorkspaceEdge): WorkspaceDirection => (horizontal(edge) ? 'horizontal' : 'vertical')

/** A tree of one group with no tabs: where a workspace starts. */
export function emptyWorkspace<T extends WorkspaceTab = WorkspaceTab>(id = 'main'): WorkspaceTabs<T> {
  return { kind: 'tabs', id, tabs: [], activeId: null }
}

/** Every group, in the order they are drawn: from the start and the top. */
export function workspaceGroups<T extends WorkspaceTab>(tree: WorkspaceNode<T>): WorkspaceTabs<T>[] {
  return tree.kind === 'tabs' ? [tree] : tree.children.flatMap((child) => workspaceGroups(child))
}

/** A group by its id, or null. */
export function findWorkspaceGroup<T extends WorkspaceTab>(tree: WorkspaceNode<T>, groupId: string): WorkspaceTabs<T> | null {
  return workspaceGroups(tree).find((group) => group.id === groupId) ?? null
}

/** A tab by its id, with the group that holds it and its place there; null when no group has it. */
export function findWorkspaceTab<T extends WorkspaceTab>(tree: WorkspaceNode<T>, tabId: string): { group: WorkspaceTabs<T>; tab: T; index: number } | null {
  for (const group of workspaceGroups(tree)) {
    const index = group.tabs.findIndex((tab) => tab.id === tabId)
    if (index >= 0) return { group, tab: group.tabs[index]!, index }
  }
  return null
}

/** The node at a path: the root for `[]`, or null where the path leaves the tree. */
export function workspaceNodeAt<T extends WorkspaceTab>(tree: WorkspaceNode<T>, path: WorkspacePath): WorkspaceNode<T> | null {
  let node: WorkspaceNode<T> = tree
  for (const step of path) {
    if (node.kind !== 'split') return null
    const child: WorkspaceNode<T> | undefined = node.children[step]
    if (!child) return null
    node = child
  }
  return node
}

const sum = (weights: readonly number[]): number => weights.reduce((total, weight) => total + weight, 0)
const valid = (weight: unknown): weight is number => typeof weight === 'number' && Number.isFinite(weight) && weight > 0
const sameList = <X>(a: readonly X[], b: readonly X[]): boolean => a.length === b.length && a.every((item, at) => item === b[at])

/**
 * The tree made normal, and the very same tree when it already is. Repairs what an app's saved data can lack: a tab
 * that appears twice stays where it is first met; a group names a tab it has (the first when it names none, null with no
 * tabs); an empty group goes, unless it is the only one; a weight that is not a positive number takes the mean of the
 * others (all of them 1 when the weights do not match the children); a split of one child is the child, and a child that
 * divides the same way is folded in, its weights scaled to the share it had.
 */
export function normalizeWorkspace<T extends WorkspaceTab>(tree: WorkspaceNode<T>): WorkspaceNode<T> {
  const seen = new Set<string>()
  const fix = (node: WorkspaceNode<T>): WorkspaceNode<T> | null => {
    if (node.kind === 'tabs') {
      const tabs = node.tabs.filter((tab) => (seen.has(tab.id) ? false : (seen.add(tab.id), true)))
      const activeId = tabs.some((tab) => tab.id === node.activeId) ? node.activeId : (tabs[0]?.id ?? null)
      if (tabs.length === node.tabs.length && activeId === node.activeId) return node
      return { ...node, tabs, activeId }
    }
    const kept: { node: WorkspaceNode<T>; weight: number | undefined }[] = []
    const weights = node.weights.length === node.children.length ? node.weights : null
    node.children.forEach((child, at) => {
      const fixed = fix(child)
      if (fixed && (fixed.kind === 'split' || fixed.tabs.length > 0)) kept.push({ node: fixed, weight: weights?.[at] })
    })
    // Weights that cannot be used are the mean of the ones that can; with none, all alike.
    const good = kept.map((entry) => entry.weight).filter(valid)
    const mean = good.length > 0 ? sum(good) / good.length : 1
    const shares = kept.map((entry) => (valid(entry.weight) ? entry.weight : mean))
    if (kept.length === 0) return null
    if (kept.length === 1) return kept[0]!.node
    // A child that divides the same way is part of this line.
    const children: WorkspaceNode<T>[] = []
    const folded: number[] = []
    kept.forEach((entry, at) => {
      const share = shares[at]!
      const part = entry.node
      if (part.kind === 'split' && part.direction === node.direction) {
        const inner = sum(part.weights)
        part.children.forEach((grandchild, i) => {
          children.push(grandchild)
          folded.push((share * part.weights[i]!) / inner)
        })
      } else {
        children.push(part)
        folded.push(share)
      }
    })
    if (sameList(children, node.children) && sameList(folded, node.weights)) return node
    return { ...node, children, weights: folded }
  }
  const fixed = fix(tree)
  if (fixed) return fixed
  // Nothing is left but empty groups: the first of them stays.
  const first = workspaceGroups(tree)[0]
  return first && first.tabs.length === 0 && first.activeId === null ? first : emptyWorkspace<T>(first?.id ?? 'main')
}

/** The tree with the node at a path made by `change`; the same tree when `change` gives the same node. */
function replaceAt<T extends WorkspaceTab>(tree: WorkspaceNode<T>, path: WorkspacePath, change: (node: WorkspaceNode<T>) => WorkspaceNode<T>): WorkspaceNode<T> {
  if (path.length === 0) return change(tree)
  if (tree.kind !== 'split') return tree
  const [step, ...rest] = path
  const child = tree.children[step!]
  if (!child) return tree
  const next = replaceAt(child, rest, change)
  if (next === child) return tree
  return { ...tree, children: tree.children.map((c, at) => (at === step ? next : c)) }
}

/** The tree with the group of this id made by `change` (a group that comes out the same leaves the tree alone). */
function changeGroup<T extends WorkspaceTab>(tree: WorkspaceNode<T>, groupId: string, change: (group: WorkspaceTabs<T>) => WorkspaceTabs<T>): WorkspaceNode<T> {
  if (tree.kind === 'tabs') return tree.id === groupId ? change(tree) : tree
  let changed = false
  const children = tree.children.map((child) => {
    const next = changeGroup(child, groupId, change)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...tree, children } : tree
}

/** The tab shown in a group after its tab at `index` goes: the one that takes its place, else the one before. */
const afterRemoval = <T extends WorkspaceTab>(tabs: readonly T[], index: number): string | null => (tabs[index + 1] ?? tabs[index - 1])?.id ?? null

/** A tab added to a group at a slot (the end by default) and chosen. A tab whose id is already in the tree, or a group that is not, leaves the tree as it is. */
export function addWorkspaceTab<T extends WorkspaceTab>(tree: WorkspaceNode<T>, groupId: string, tab: T, index?: number): WorkspaceNode<T> {
  if (findWorkspaceTab(tree, tab.id) || !findWorkspaceGroup(tree, groupId)) return tree
  return normalizeWorkspace(
    changeGroup(tree, groupId, (group) => {
      const at = index === undefined ? group.tabs.length : Math.min(Math.max(Math.trunc(index), 0), group.tabs.length)
      return { ...group, tabs: [...group.tabs.slice(0, at), tab, ...group.tabs.slice(at)], activeId: tab.id }
    }),
  )
}

/** The tab chosen in its group. */
export function activateWorkspaceTab<T extends WorkspaceTab>(tree: WorkspaceNode<T>, tabId: string): WorkspaceNode<T> {
  const found = findWorkspaceTab(tree, tabId)
  if (!found || found.group.activeId === tabId) return tree
  return changeGroup(tree, found.group.id, (group) => ({ ...group, activeId: tabId }))
}

/** A tab taken out. If it was the one shown, the one that takes its place is; a group left with no tab goes (the last one stays, empty). */
export function closeWorkspaceTab<T extends WorkspaceTab>(tree: WorkspaceNode<T>, tabId: string): WorkspaceNode<T> {
  const found = findWorkspaceTab(tree, tabId)
  if (!found) return tree
  return normalizeWorkspace(
    changeGroup(tree, found.group.id, (group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => tab.id !== tabId),
      activeId: group.activeId === tabId ? afterRemoval(group.tabs, found.index) : group.activeId,
    })),
  )
}

/**
 * A new group, `group`, put beside the group `groupId` at an edge of it: the group is divided there (or, when its parent
 * already divides that way, the new one is one more child, and takes half of the room the group had). A group that is
 * empty or whose id is in the tree, or a group not found, leaves the tree as it is.
 */
export function splitWorkspaceGroup<T extends WorkspaceTab>(tree: WorkspaceNode<T>, groupId: string, edge: WorkspaceEdge, group: WorkspaceTabs<T>): WorkspaceNode<T> {
  if (group.tabs.length === 0 || findWorkspaceGroup(tree, group.id) || !findWorkspaceGroup(tree, groupId)) return tree
  if (group.tabs.some((tab) => findWorkspaceTab(tree, tab.id))) return tree
  const added: WorkspaceTabs<T> = { ...group, activeId: group.tabs.some((tab) => tab.id === group.activeId) ? group.activeId : (group.tabs[0]?.id ?? null) }
  const direction = directionOf(edge)
  const place = (node: WorkspaceNode<T>): WorkspaceNode<T> => {
    if (node.kind === 'tabs') {
      if (node.id !== groupId) return node
      const pair = before(edge) ? [added, node] : [node, added]
      return { kind: 'split', direction, weights: [1, 1], children: pair }
    }
    const at = node.children.findIndex((child) => child.kind === 'tabs' && child.id === groupId)
    if (at >= 0 && node.direction === direction) {
      const weights = [...node.weights]
      const half = weights[at]! / 2
      weights.splice(at, 1, half, half)
      const children = [...node.children]
      children.splice(at, 1, ...(before(edge) ? [added, node.children[at]!] : [node.children[at]!, added]))
      return { ...node, children, weights }
    }
    return { ...node, children: node.children.map(place) }
  }
  return normalizeWorkspace(place(tree))
}

/**
 * A tab moved: into a group at a slot, or to an edge of a group. A move that changes nothing (the tab where it already
 * is, or the only tab of a group to an edge of its own group) gives the same tree. A slot is the one the strip shows, so
 * it counts the tab itself while it is in the group: in a group of three the slots are 0 to 3, and 3 is the end.
 */
export function moveWorkspaceTab<T extends WorkspaceTab>(tree: WorkspaceNode<T>, tabId: string, drop: WorkspaceDrop): WorkspaceNode<T> {
  const found = findWorkspaceTab(tree, tabId)
  const target = findWorkspaceGroup(tree, drop.groupId)
  if (!found || !target) return tree
  if ('edge' in drop) {
    // Dividing a group to put its only tab beside itself would leave the old group empty: nothing moves.
    if (target.id === found.group.id && target.tabs.length === 1) return tree
    if (findWorkspaceGroup(tree, drop.newId)) return tree
    const moving: WorkspaceTabs<T> = { kind: 'tabs', id: drop.newId, tabs: [found.tab], activeId: tabId }
    // Out of its group first, so the tab is in one place at every step.
    const without = changeGroup(tree, found.group.id, (group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => tab.id !== tabId),
      activeId: group.activeId === tabId ? afterRemoval(group.tabs, found.index) : group.activeId,
    }))
    const next = splitWorkspaceGroup(without, drop.groupId, drop.edge, moving)
    return next === without ? tree : next
  }
  const slot = Math.min(Math.max(Math.trunc(drop.index ?? target.tabs.length), 0), target.tabs.length)
  if (target.id === found.group.id) {
    // The slot counts the tab itself: the slot just before it and the one just after it are where it is.
    if (slot === found.index || slot === found.index + 1) return tree
    const others = target.tabs.filter((tab) => tab.id !== tabId)
    const at = slot > found.index ? slot - 1 : slot
    return changeGroup(tree, target.id, (group) => ({ ...group, tabs: [...others.slice(0, at), found.tab, ...others.slice(at)], activeId: tabId }))
  }
  const without = changeGroup(tree, found.group.id, (group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => tab.id !== tabId),
    activeId: group.activeId === tabId ? afterRemoval(group.tabs, found.index) : group.activeId,
  }))
  return normalizeWorkspace(
    changeGroup(without, target.id, (group) => ({ ...group, tabs: [...group.tabs.slice(0, slot), found.tab, ...group.tabs.slice(slot)], activeId: tabId })),
  )
}

/** The weights of the split at a path replaced. Anything that is not one positive number for each child leaves the tree as it is. */
export function resizeWorkspace<T extends WorkspaceTab>(tree: WorkspaceNode<T>, path: WorkspacePath, weights: readonly number[]): WorkspaceNode<T> {
  const node = workspaceNodeAt(tree, path)
  if (!node || node.kind !== 'split' || weights.length !== node.children.length || !weights.every(valid)) return tree
  if (sameList(weights, node.weights)) return tree
  return replaceAt(tree, path, () => ({ ...node, weights: [...weights] }))
}

/**
 * The weights after the line between the children `boundary` and `boundary + 1` moves by `delta` px, in a split that is
 * `extent` px long. The two children keep at least `minimums` px each (by child); where both cannot, the weights stay. The
 * sum of the weights does not change, and the other children do not move.
 */
export function shiftWorkspaceWeights(weights: readonly number[], boundary: number, delta: number, extent: number, minimums?: readonly number[]): number[] {
  const next = [...weights]
  const total = sum(weights)
  if (boundary < 0 || boundary + 1 >= weights.length || !(extent > 0) || !(total > 0) || !Number.isFinite(delta)) return next
  const px = (weight: number) => (weight / total) * extent
  const first = px(weights[boundary]!)
  const second = px(weights[boundary + 1]!)
  const pair = first + second
  const low = minimums?.[boundary] ?? 0
  const high = pair - (minimums?.[boundary + 1] ?? 0)
  if (low > high) return next
  const moved = Math.min(Math.max(first + delta, low), high)
  next[boundary] = (moved / extent) * total
  next[boundary + 1] = ((pair - moved) / extent) * total
  return next
}

/** The least a node takes along a direction, in px, when each group takes at least `least`: the sum along its own direction, the widest of its children across it. */
export function workspaceMinimum<T extends WorkspaceTab>(node: WorkspaceNode<T>, direction: WorkspaceDirection, least: number): number {
  if (node.kind === 'tabs') return least
  const sizes = node.children.map((child) => workspaceMinimum(child, direction, least))
  return node.direction === direction ? sum(sizes) : Math.max(...sizes)
}

/** The boxes of the groups and the sashes of a tree, in fractions of the workspace. */
export function layoutWorkspace<T extends WorkspaceTab>(tree: WorkspaceNode<T>): WorkspaceLayout {
  const groups = new Map<string, WorkspaceRect>()
  const sashes: WorkspaceSash[] = []
  const visit = (node: WorkspaceNode<T>, rect: WorkspaceRect, path: WorkspacePath) => {
    if (node.kind === 'tabs') {
      groups.set(node.id, rect)
      return
    }
    const total = sum(node.weights)
    const wide = node.direction === 'horizontal'
    let offset = wide ? rect.x : rect.y
    node.children.forEach((child, at) => {
      const share = (node.weights[at]! / total) * (wide ? rect.width : rect.height)
      visit(child, wide ? { ...rect, x: offset, width: share } : { ...rect, y: offset, height: share }, [...path, at])
      offset += share
      if (at < node.children.length - 1) {
        sashes.push({ path, boundary: at, direction: node.direction, at: offset, from: wide ? rect.y : rect.x, length: wide ? rect.height : rect.width, span: wide ? rect.width : rect.height, weights: node.weights })
      }
    })
  }
  visit(tree, { x: 0, y: 0, width: 1, height: 1 }, [])
  return { groups, sashes }
}

/**
 * The group nearest to a group in a direction, or null. Nearest is the one whose box touches the group's side on that
 * side and shares the most of it, which is where an arrow key goes. `edge` follows the line of reading: `end` is the right in English.
 */
export function workspaceNeighbor<T extends WorkspaceTab>(tree: WorkspaceNode<T>, groupId: string, edge: WorkspaceEdge): string | null {
  const { groups } = layoutWorkspace(tree)
  const from = groups.get(groupId)
  if (!from) return null
  const EPS = 1e-6
  let best: { id: string; shared: number } | null = null
  for (const [id, box] of groups) {
    if (id === groupId) continue
    let touches: boolean
    let shared: number
    if (horizontal(edge)) {
      touches = before(edge) ? Math.abs(box.x + box.width - from.x) < EPS : Math.abs(from.x + from.width - box.x) < EPS
      shared = Math.min(box.y + box.height, from.y + from.height) - Math.max(box.y, from.y)
    } else {
      touches = before(edge) ? Math.abs(box.y + box.height - from.y) < EPS : Math.abs(from.y + from.height - box.y) < EPS
      shared = Math.min(box.x + box.width, from.x + from.width) - Math.max(box.x, from.x)
    }
    if (touches && shared > EPS && (!best || shared > best.shared + EPS)) best = { id, shared }
  }
  return best?.id ?? null
}

/** The share of a group's body (as fractions of it, from its start and top) that a point is in: the middle of it joins the group, a side divides the group there. */
export function workspaceZone(x: number, y: number): 'center' | WorkspaceEdge {
  const dx = x - 0.5
  const dy = y - 0.5
  if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) return 'center'
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'start' : 'end'
  return dy < 0 ? 'top' : 'bottom'
}
