// @vitest-environment node
// The tree of a workspace and what is done to it: pure functions that give a new tree, or the same one when nothing changes.
import { describe, expect, test } from 'vitest'
import {
  activateWorkspaceTab,
  addWorkspaceTab,
  closeWorkspaceTab,
  emptyWorkspace,
  findWorkspaceGroup,
  findWorkspaceTab,
  layoutWorkspace,
  moveWorkspaceTab,
  normalizeWorkspace,
  resizeWorkspace,
  shiftWorkspaceWeights,
  splitWorkspaceGroup,
  workspaceGroups,
  workspaceMinimum,
  workspaceNeighbor,
  workspaceNodeAt,
  workspaceZone,
  type WorkspaceNode,
  type WorkspaceSplit,
  type WorkspaceTab,
  type WorkspaceTabs,
} from '../src/assemblies'

const tab = (id: string): WorkspaceTab => ({ id, title: id.toUpperCase() })
const group = (id: string, ids: string[], activeId: string | null | undefined = ids[0] ?? null): WorkspaceTabs => ({ kind: 'tabs', id, tabs: ids.map(tab), activeId })
/** A node known to be a split. */
const split = (node: WorkspaceNode): WorkspaceSplit => {
  if (node.kind !== 'split') throw new Error('not a split')
  return node
}
const ids = (tree: WorkspaceNode) => workspaceGroups(tree).map((g) => `${g.id}:${g.tabs.map((t) => t.id).join('')}`)
const row = (...children: WorkspaceNode[]): WorkspaceNode => ({ kind: 'split', direction: 'horizontal', weights: children.map(() => 1), children })
const column = (...children: WorkspaceNode[]): WorkspaceNode => ({ kind: 'split', direction: 'vertical', weights: children.map(() => 1), children })

describe('reading the tree', () => {
  const tree = row(group('g1', ['a', 'b']), column(group('g2', ['c']), group('g3', ['d', 'e'])))
  test('the groups come in the order they are drawn, a tab is found with its group and place, a path leads to a node', () => {
    expect(ids(tree)).toEqual(['g1:ab', 'g2:c', 'g3:de'])
    expect(findWorkspaceGroup(tree, 'g3')!.tabs.map((t) => t.id)).toEqual(['d', 'e'])
    expect(findWorkspaceGroup(tree, 'nope')).toBeNull()
    const found = findWorkspaceTab(tree, 'e')!
    expect([found.group.id, found.index, found.tab.title]).toEqual(['g3', 1, 'E'])
    expect(findWorkspaceTab(tree, 'zz')).toBeNull()
    expect(workspaceNodeAt(tree, [])).toBe(tree)
    expect(workspaceNodeAt(tree, [1, 1])).toBe(workspaceGroups(tree)[2])
    expect(workspaceNodeAt(tree, [0, 0])).toBeNull()
    expect(workspaceNodeAt(tree, [5])).toBeNull()
  })
  test('an empty workspace is one group with no tab', () => {
    expect(emptyWorkspace()).toEqual({ kind: 'tabs', id: 'main', tabs: [], activeId: null })
    expect(emptyWorkspace('left').id).toBe('left')
  })
})

describe('normalizeWorkspace', () => {
  test('a tree that is normal comes back as the same object', () => {
    const tree = row(group('g1', ['a']), column(group('g2', ['b']), group('g3', ['c'])))
    expect(normalizeWorkspace(tree)).toBe(tree)
  })
  test('empty groups go, a split of one child is the child, a child that divides the same way is folded in with its share', () => {
    const tree: WorkspaceNode = {
      kind: 'split',
      direction: 'horizontal',
      weights: [1, 3, 1],
      children: [group('g1', ['a']), { kind: 'split', direction: 'horizontal', weights: [1, 3], children: [group('g2', ['b']), group('g3', ['c'])] }, group('g4', [])],
    }
    const fixed = normalizeWorkspace(tree)
    expect(ids(fixed)).toEqual(['g1:a', 'g2:b', 'g3:c'])
    // g4 went: its weight with it. The 3 of the middle becomes 0.75 and 2.25 of it.
    expect(fixed).toEqual({ kind: 'split', direction: 'horizontal', weights: [1, 0.75, 2.25], children: [group('g1', ['a']), group('g2', ['b']), group('g3', ['c'])] })
    expect(normalizeWorkspace(row(group('g1', ['a']), group('g2', [])))).toEqual(group('g1', ['a']))
  })
  test('the last group stays when it is empty, whatever is empty around it', () => {
    expect(normalizeWorkspace(row(group('g1', []), group('g2', [])))).toEqual(group('g1', []))
    expect(normalizeWorkspace(group('only', []))).toEqual(group('only', []))
  })
  test('a group names a tab it has; a tab that is twice stays where it is met first; weights that cannot be used are the mean of the others', () => {
    const tree: WorkspaceNode = {
      kind: 'split',
      direction: 'vertical',
      weights: [2, -1, Number.NaN, 4],
      children: [group('g1', ['a', 'b'], 'zz'), group('g2', ['b', 'c'], 'c'), group('g3', ['d'], null), group('g4', ['e'])],
    }
    const fixed = normalizeWorkspace(tree)
    expect(ids(fixed)).toEqual(['g1:ab', 'g2:c', 'g3:d', 'g4:e'])
    expect(workspaceGroups(fixed).map((g) => g.activeId)).toEqual(['a', 'c', 'd', 'e'])
    expect(split(fixed).weights).toEqual([2, 3, 3, 4])
    // Weights that do not match the children are all alike.
    expect(split(normalizeWorkspace({ ...split(row(group('g1', ['a']), group('g2', ['b']))), weights: [5] })).weights).toEqual([1, 1])
  })
})

describe('tabs added, chosen and closed', () => {
  const tree = row(group('g1', ['a', 'b', 'c']), group('g2', ['d']))
  test('a tab is added at a slot or at the end, and chosen; a known id or an unknown group changes nothing', () => {
    expect(ids(addWorkspaceTab(tree, 'g1', tab('x')))).toEqual(['g1:abcx', 'g2:d'])
    const at = addWorkspaceTab(tree, 'g1', tab('x'), 1)
    expect(ids(at)).toEqual(['g1:axbc', 'g2:d'])
    expect(findWorkspaceGroup(at, 'g1')!.activeId).toBe('x')
    expect(ids(addWorkspaceTab(tree, 'g1', tab('x'), 99))).toEqual(['g1:abcx', 'g2:d'])
    expect(ids(addWorkspaceTab(tree, 'g1', tab('x'), -4))).toEqual(['g1:xabc', 'g2:d'])
    expect(addWorkspaceTab(tree, 'g1', tab('d'))).toBe(tree)
    expect(addWorkspaceTab(tree, 'nope', tab('x'))).toBe(tree)
    expect(findWorkspaceGroup(addWorkspaceTab(emptyWorkspace(), 'main', tab('x')), 'main')!.activeId).toBe('x')
  })
  test('choosing a tab that is chosen, or not there, changes nothing', () => {
    expect(findWorkspaceGroup(activateWorkspaceTab(tree, 'c'), 'g1')!.activeId).toBe('c')
    expect(activateWorkspaceTab(tree, 'a')).toBe(tree)
    expect(activateWorkspaceTab(tree, 'zz')).toBe(tree)
  })
  test('closing the tab shown shows the one that takes its place, else the one before; a tab not shown leaves the choice alone', () => {
    const shown = (t: WorkspaceNode) => findWorkspaceGroup(t, 'g1')!.activeId
    expect(shown(closeWorkspaceTab(activateWorkspaceTab(tree, 'b'), 'b'))).toBe('c')
    expect(shown(closeWorkspaceTab(activateWorkspaceTab(tree, 'c'), 'c'))).toBe('b')
    expect(shown(closeWorkspaceTab(tree, 'c'))).toBe('a')
    expect(shown(closeWorkspaceTab(tree, 'a'))).toBe('b')
    expect(closeWorkspaceTab(tree, 'zz')).toBe(tree)
  })
  test('closing the only tab of a group takes the group away and the split with it; the last group stays, empty', () => {
    expect(closeWorkspaceTab(tree, 'd')).toEqual(group('g1', ['a', 'b', 'c']))
    const alone = closeWorkspaceTab(group('g1', ['a']), 'a')
    expect(alone).toEqual(group('g1', []))
  })
})

describe('splitting a group', () => {
  test('a new group goes beside the group at an edge: start and top before it, end and bottom after, equal shares', () => {
    const tree = group('g1', ['a', 'b'])
    const right = splitWorkspaceGroup(tree, 'g1', 'end', group('g2', ['c']))
    expect(right).toEqual({ kind: 'split', direction: 'horizontal', weights: [1, 1], children: [group('g1', ['a', 'b']), group('g2', ['c'])] })
    expect(ids(splitWorkspaceGroup(tree, 'g1', 'start', group('g2', ['c'])))).toEqual(['g2:c', 'g1:ab'])
    expect(ids(splitWorkspaceGroup(tree, 'g1', 'top', group('g2', ['c'])))).toEqual(['g2:c', 'g1:ab'])
    const below = split(splitWorkspaceGroup(tree, 'g1', 'bottom', group('g2', ['c'])))
    expect(below.direction).toBe('vertical')
  })
  test('where the parent already divides that way the new group is one more child and takes half of the room the group had', () => {
    const tree: WorkspaceNode = { kind: 'split', direction: 'horizontal', weights: [1, 3], children: [group('g1', ['a']), group('g2', ['b'])] }
    const next = split(splitWorkspaceGroup(tree, 'g2', 'end', group('g3', ['c'])))
    expect(next.weights).toEqual([1, 1.5, 1.5])
    expect(ids(next)).toEqual(['g1:a', 'g2:b', 'g3:c'])
    // The other way across: the group is divided in its place.
    const across = split(splitWorkspaceGroup(tree, 'g2', 'bottom', group('g3', ['c'])))
    expect(across.weights).toEqual([1, 3])
    expect(across.children[1]).toMatchObject({ kind: 'split', direction: 'vertical' })
  })
  test('an empty group, an id that is taken, a tab that is in the tree or a group that is not there change nothing', () => {
    const tree = row(group('g1', ['a']), group('g2', ['b']))
    expect(splitWorkspaceGroup(tree, 'g1', 'end', group('g3', []))).toBe(tree)
    expect(splitWorkspaceGroup(tree, 'g1', 'end', group('g2', ['c']))).toBe(tree)
    expect(splitWorkspaceGroup(tree, 'g1', 'end', group('g3', ['b']))).toBe(tree)
    expect(splitWorkspaceGroup(tree, 'nope', 'end', group('g3', ['c']))).toBe(tree)
  })
})

describe('moving a tab', () => {
  const tree = row(group('g1', ['a', 'b', 'c']), group('g2', ['d']))
  test('within its group: the slot is the one the strip shows, and the tab ends up chosen', () => {
    expect(ids(moveWorkspaceTab(tree, 'a', { groupId: 'g1', index: 3 }))).toEqual(['g1:bca', 'g2:d'])
    expect(ids(moveWorkspaceTab(tree, 'c', { groupId: 'g1', index: 0 }))).toEqual(['g1:cab', 'g2:d'])
    expect(ids(moveWorkspaceTab(tree, 'a', { groupId: 'g1', index: 2 }))).toEqual(['g1:bac', 'g2:d'])
    expect(ids(moveWorkspaceTab(tree, 'c', { groupId: 'g1' }))).toEqual(['g1:abc', 'g2:d'])
    expect(findWorkspaceGroup(moveWorkspaceTab(tree, 'c', { groupId: 'g1', index: 0 }), 'g1')!.activeId).toBe('c')
  })
  test('the slots just before and just after the tab are where it is: the same tree', () => {
    expect(moveWorkspaceTab(tree, 'b', { groupId: 'g1', index: 1 })).toBe(tree)
    expect(moveWorkspaceTab(tree, 'b', { groupId: 'g1', index: 2 })).toBe(tree)
    expect(moveWorkspaceTab(tree, 'c', { groupId: 'g1' })).toBe(tree)
  })
  test('into another group at a slot: it leaves its group, is chosen in the new one, and an emptied group goes', () => {
    const moved = moveWorkspaceTab(tree, 'b', { groupId: 'g2', index: 0 })
    expect(ids(moved)).toEqual(['g1:ac', 'g2:bd'])
    expect(findWorkspaceGroup(moved, 'g2')!.activeId).toBe('b')
    // The tab it was showing is replaced in the group it left.
    expect(findWorkspaceGroup(moveWorkspaceTab(activateWorkspaceTab(tree, 'b'), 'b', { groupId: 'g2' }), 'g1')!.activeId).toBe('c')
    expect(moveWorkspaceTab(tree, 'd', { groupId: 'g1', index: 1 })).toEqual(group('g1', ['a', 'd', 'b', 'c'], 'd'))
  })
  test('to an edge of a group: the group is divided and the tab is alone in the new one; not when it is the only tab of that group', () => {
    const split = moveWorkspaceTab(tree, 'c', { groupId: 'g1', edge: 'bottom', newId: 'g9' })
    expect(ids(split)).toEqual(['g1:ab', 'g9:c', 'g2:d'])
    expect(findWorkspaceGroup(split, 'g1')!.activeId).toBe('a')
    expect(layoutWorkspace(split).groups.get('g9')!.y).toBeGreaterThan(0)
    expect(moveWorkspaceTab(tree, 'd', { groupId: 'g2', edge: 'end', newId: 'g9' })).toBe(tree)
    // From another group's only tab: that group goes.
    expect(ids(moveWorkspaceTab(tree, 'd', { groupId: 'g1', edge: 'start', newId: 'g9' }))).toEqual(['g9:d', 'g1:abc'])
    // A new id that is taken, a tab or a group that is not there.
    expect(moveWorkspaceTab(tree, 'c', { groupId: 'g1', edge: 'end', newId: 'g2' })).toBe(tree)
    expect(moveWorkspaceTab(tree, 'zz', { groupId: 'g1', index: 0 })).toBe(tree)
    expect(moveWorkspaceTab(tree, 'a', { groupId: 'nope', index: 0 })).toBe(tree)
  })
})

describe('resizing', () => {
  const tree = row(group('g1', ['a']), column(group('g2', ['b']), group('g3', ['c'])))
  test('the weights of the split at a path are replaced; a wrong count or a weight that is not positive changes nothing', () => {
    const next = resizeWorkspace(tree, [], [1, 3])
    expect(split(next).weights).toEqual([1, 3])
    expect(split(split(resizeWorkspace(tree, [1], [2, 1])).children[1]!).weights).toEqual([2, 1])
    expect(resizeWorkspace(tree, [], [1])).toBe(tree)
    expect(resizeWorkspace(tree, [], [1, 0])).toBe(tree)
    expect(resizeWorkspace(tree, [], [1, Number.NaN])).toBe(tree)
    expect(resizeWorkspace(tree, [0], [1, 1])).toBe(tree)
    expect(resizeWorkspace(tree, [9], [1, 1])).toBe(tree)
    expect(resizeWorkspace(tree, [], [1, 1])).toBe(tree)
  })
  test('a line moved by px takes from one side and gives to the other, keeps the sum, and stops at the minimums', () => {
    expect(shiftWorkspaceWeights([1, 1], 0, 100, 1000)).toEqual([1.2, 0.8])
    expect(shiftWorkspaceWeights([1, 1, 2], 1, -100, 1000)).toEqual([1, 0.6, 2.4])
    // Never under a minimum: the second keeps 300 of 500 and the first 100.
    const clamped = shiftWorkspaceWeights([1, 1], 0, 900, 1000, [100, 300])
    expect(clamped[0]! / (clamped[0]! + clamped[1]!)).toBeCloseTo(0.7)
    const low = shiftWorkspaceWeights([1, 1], 0, -900, 1000, [100, 300])
    expect(low[0]! / (low[0]! + low[1]!)).toBeCloseTo(0.1)
    expect(clamped[0]! + clamped[1]!).toBeCloseTo(2)
    // Both minimums do not fit, nothing to measure, or a boundary that is not there: the weights stay.
    expect(shiftWorkspaceWeights([1, 1], 0, 50, 1000, [600, 600])).toEqual([1, 1])
    expect(shiftWorkspaceWeights([1, 1], 0, 50, 0)).toEqual([1, 1])
    expect(shiftWorkspaceWeights([1, 1], 1, 50, 1000)).toEqual([1, 1])
    expect(shiftWorkspaceWeights([1, 1], 0, Number.NaN, 1000)).toEqual([1, 1])
  })
  test('the least a node takes: the sum along its own direction, the largest across it', () => {
    expect(workspaceMinimum(tree, 'horizontal', 100)).toBe(200)
    expect(workspaceMinimum(tree, 'vertical', 100)).toBe(200)
    expect(workspaceMinimum(group('g1', ['a']), 'vertical', 80)).toBe(80)
    expect(workspaceMinimum(row(group('g1', ['a']), group('g2', ['b']), group('g3', ['c'])), 'horizontal', 50)).toBe(150)
  })
})

describe('geometry', () => {
  const tree: WorkspaceNode = { kind: 'split', direction: 'horizontal', weights: [1, 3], children: [group('g1', ['a']), column(group('g2', ['b']), group('g3', ['c']))] }
  test('every group has its box in fractions of the whole, and the boxes tile it', () => {
    const { groups } = layoutWorkspace(tree)
    expect(groups.get('g1')).toEqual({ x: 0, y: 0, width: 0.25, height: 1 })
    expect(groups.get('g2')).toEqual({ x: 0.25, y: 0, width: 0.75, height: 0.5 })
    expect(groups.get('g3')).toEqual({ x: 0.25, y: 0.5, width: 0.75, height: 0.5 })
    expect(layoutWorkspace(group('only', ['a'])).groups.get('only')).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })
  test('a sash lies on each line between two children: where, how long, what it divides and the weights it moves', () => {
    const { sashes } = layoutWorkspace(tree)
    expect(sashes).toEqual([
      { path: [], boundary: 0, direction: 'horizontal', at: 0.25, from: 0, length: 1, span: 1, weights: [1, 3] },
      { path: [1], boundary: 0, direction: 'vertical', at: 0.5, from: 0.25, length: 0.75, span: 1, weights: [1, 1] },
    ])
  })
  test('the neighbour of a group in a direction is the one that touches that side and shares most of it', () => {
    expect(workspaceNeighbor(tree, 'g1', 'end')).toBe('g2')
    expect(workspaceNeighbor(tree, 'g2', 'start')).toBe('g1')
    expect(workspaceNeighbor(tree, 'g3', 'start')).toBe('g1')
    expect(workspaceNeighbor(tree, 'g2', 'bottom')).toBe('g3')
    expect(workspaceNeighbor(tree, 'g3', 'top')).toBe('g2')
    expect(workspaceNeighbor(tree, 'g1', 'start')).toBeNull()
    expect(workspaceNeighbor(tree, 'g1', 'top')).toBeNull()
    expect(workspaceNeighbor(tree, 'nope', 'end')).toBeNull()
  })
  test('a point in a group body is its middle (joins), or the side it is nearest to (divides there)', () => {
    expect(workspaceZone(0.5, 0.5)).toBe('center')
    expect(workspaceZone(0.7, 0.6)).toBe('center')
    expect(workspaceZone(0.1, 0.5)).toBe('start')
    expect(workspaceZone(0.9, 0.4)).toBe('end')
    expect(workspaceZone(0.5, 0.05)).toBe('top')
    expect(workspaceZone(0.45, 0.95)).toBe('bottom')
    // The corner goes to the side it is further along.
    expect(workspaceZone(0.1, 0.3)).toBe('start')
    expect(workspaceZone(0.4, 0.05)).toBe('top')
  })
})
