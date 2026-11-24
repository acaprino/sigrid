// Four details of the looks a theme asks for (the owner, 2026-11-24), each off unless asked: a muted ink the palette
// states (`Surfaces.mute`), the corners and the ground of the segment under bold tabs, the text of a tall status strip
// (and of the footer, which shares its style), and the quiet button of a bar (`ToolbarButton variant="quiet"`).
// The pairs of the preset they were approved for are measured by the engine and printed (`[theme-details]` lines).
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { AppShell, Toolbar, ToolbarButton } from '../src/layout'
import type { Surfaces, ThemeDef } from '../src/theme-catalog'
import { tokensFor } from '../src/theme-engine'
import { THEMES } from './fixtures/sample-themes'
import { SHELL_ACCENTS, SHELL_MUTE, SHELL_TONE, shellPreset } from './fixtures/shell-preset'
import { classes, contrast } from './helpers'

const SCHEMES = ['light', 'dark'] as const
// Tailwind also scans `test/`: a variant and its class are joined with `+`, never one literal (test/build.test.ts).
const STRONG = '[[data-controls=strong]_&]' + ':'
const TALL = '[[data-status-strip=tall]_&]' + ':'
const nord = THEMES.find((t) => t.id === 'nord')! as ThemeDef
const withMute = (theme: ThemeDef, mute: (scheme: 'light' | 'dark') => unknown): ThemeDef =>
  ({ ...theme, surfaces: { light: { ...theme.surfaces!.light, mute: mute('light') }, dark: { ...theme.surfaces!.dark, mute: mute('dark') } } }) as unknown as ThemeDef
/** The preset as it was before the palette stated its muted ink. */
const derivedMute = (theme: ThemeDef): ThemeDef => {
  const drop = ({ mute: _mute, ...rest }: Surfaces): Surfaces => rest
  return { ...theme, surfaces: { light: drop(theme.surfaces!.light), dark: drop(theme.surfaces!.dark) } }
}
/** The names of the colours that differ between two sets of tokens. */
const differ = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) => Object.keys(a).filter((k) => a[k] !== b[k]).sort()
/** The text levels, with the names that are the same colours (the primitives' and the light sidebar's). */
const LADDER = ['ink-mute', 'muted-foreground', 'sidebar-mute', 'ink-soft', 'sidebar-ink', 'ink', 'foreground', 'popover-foreground', 'drop']
const GROUNDS = ['paper', 'paper-2', 'raised', 'sidebar-paper', 'selected'] as const

describe('a muted ink the palette states', () => {
  test('absent, or not a colour, the muted ink is derived as before: the same tokens', () => {
    for (const scheme of SCHEMES) {
      const plain = tokensFor(nord, scheme)
      expect(tokensFor(withMute(nord, () => undefined), scheme)).toEqual(plain)
      expect(tokensFor(withMute(nord, () => 'gray'), scheme)).toEqual(plain)
    }
  })

  test('one that holds is kept as written; it is the muted text everywhere it is drawn, and no other colour moves', () => {
    for (const scheme of SCHEMES) {
      const before = tokensFor(nord, scheme)
      // The muted ink the engine derives, with a little more of the palette's blue: as readable, so nothing to correct.
      const derived = before.colors['ink-mute']!
      // Away from the page (lighter in dark, darker in light), so it reads at least as well.
      const blue = parseInt(derived.slice(5, 7), 16) + (scheme === 'dark' ? 6 : -6)
      const tinted = '#' + [1, 3].map((i) => derived.slice(i, i + 2)).join('') + Math.min(255, Math.max(0, blue)).toString(16).padStart(2, '0')
      const after = tokensFor(withMute(nord, () => tinted), scheme)
      expect(after.colors['ink-mute']).toBe(tinted)
      expect(after.corrected).not.toContain('inkMute')
      // The light sidebar and the primitives' placeholders use the same muted ink.
      const changed = differ(after.colors, before.colors)
      expect(changed).toEqual(expect.arrayContaining(['ink-mute', 'muted-foreground', 'sidebar-mute']))
      // Nothing outside the ink ladder: the surfaces, the lines, the accents and the selection stay.
      for (const name of changed) expect(LADDER, name).toContain(name)
      expect(after.colors['muted-foreground']).toBe(tinted)
      expect(after.colors['sidebar-mute']).toBe(tinted)
    }
  })

  test('one that is too faint is moved until it holds 4.5:1 on the page, the sidebar, the sheets and the chosen row', () => {
    for (const scheme of SCHEMES) {
      // The palette's own divider as its muted text: far under 4.5:1.
      const t = tokensFor(withMute(nord, (s) => nord.surfaces![s].line), scheme)
      expect(t.corrected).toContain('inkMute')
      for (const g of GROUNDS) expect(contrast(t.colors['ink-mute']!, t.colors[g]!), `${scheme}: ink-mute on ${g}`).toBeGreaterThanOrEqual(4.5)
      // The secondary text stays above it, the ink above that.
      for (const g of ['paper', 'paper-2', 'raised'] as const) {
        expect(contrast(t.colors['ink-soft']!, t.colors[g]!)).toBeGreaterThanOrEqual(contrast(t.colors['ink-mute']!, t.colors[g]!) + 1.5)
        expect(contrast(t.colors['ink']!, t.colors[g]!)).toBeGreaterThanOrEqual(contrast(t.colors['ink-soft']!, t.colors[g]!) + 3)
      }
    }
  })

  test.each(SCHEMES)('%s: on the preset the stated muted ink holds 4.5:1 everywhere, for the five accents; what else of the ink ladder it moves is printed', (scheme) => {
    let lowest = { ratio: Infinity, where: '' }
    const moved = new Set<string>()
    const written = new Set<string>()
    for (const accent of SHELL_ACCENTS) {
      const preset = shellPreset(accent)
      const tokens = tokensFor(preset, scheme, SHELL_TONE)
      const c = tokens.colors
      written.add(`${c['ink-mute']}${tokens.corrected.includes('inkMute') ? ' (moved)' : ''}`)
      for (const g of GROUNDS) {
        const ratio = contrast(c['ink-mute']!, c[g]!)
        expect(ratio, `${accent.id} ${scheme}: ink-mute on ${g}`).toBeGreaterThanOrEqual(4.5)
        if (ratio < lowest.ratio) lowest = { ratio, where: `${g}, ${accent.id}` }
      }
      // The quiet button of a bar: the muted ink on the window's ground, the ink under the pointer.
      expect(contrast(c['ink-mute']!, c['sidebar-paper']!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c['ink']!, c['sidebar-paper']!)).toBeGreaterThanOrEqual(4.5)
      for (const name of differ(c, tokensFor(derivedMute(preset), scheme, SHELL_TONE).colors)) moved.add(name)
    }
    const first = tokensFor(shellPreset(SHELL_ACCENTS[0]), scheme, SHELL_TONE).colors
    const was = tokensFor(derivedMute(shellPreset(SHELL_ACCENTS[0])), scheme, SHELL_TONE).colors
    console.log(`[theme-details] ${scheme} muted ink: stated ${SHELL_MUTE[scheme]}, drawn ${[...written].join(', ')}; derived before ${was['ink-mute']}; lowest ${lowest.ratio.toFixed(2)}:1 (${lowest.where})`)
    console.log(`[theme-details] ${scheme} colours the stated muted ink moves: ${[...moved].sort().join(', ') || 'none'}; ink-soft ${was['ink-soft']} -> ${first['ink-soft']}; ink ${was['ink']} -> ${first['ink']}`)
    console.log(`[theme-details] ${scheme} quiet button of a bar: ink-mute on the bar ${contrast(first['ink-mute']!, first['sidebar-paper']!).toFixed(2)}:1; its hairline (no state, decoration) ${contrast(first['line']!, first['sidebar-paper']!).toFixed(2)}:1`)
    // Only the ink ladder may move (the muted ink, and the levels above it if they must stay apart from it): the log
    // above says which did.
    for (const name of moved) expect(LADDER, name).toContain(name)
    expect([...moved]).toEqual(expect.arrayContaining(['ink-mute', 'muted-foreground', 'sidebar-mute']))
  })
})

describe('the quiet button of a bar', () => {
  test('an outline with the muted ink, whose hairline stays under strong control borders; the other variants are as they were', () => {
    render(
      <Toolbar aria-label="Sample">
        <ToolbarButton label="Commands" variant="quiet" shortcut="Ctrl K">
          Commands
        </ToolbarButton>
        <ToolbarButton label="Export" variant="outline">
          Export
        </ToolbarButton>
        <ToolbarButton label="Help">Help</ToolbarButton>
      </Toolbar>,
    )
    const quiet = screen.getByRole('button', { name: 'Commands' })
    const q = classes(quiet)
    expect(quiet.getAttribute('data-variant')).toBe('quiet')
    for (const cls of ['border', 'border-line', 'text-ink-mute', 'hover' + ':text-ink', STRONG + 'border-line']) expect(q, cls).toContain(cls)
    // The ink of an outline gave way to the muted ink.
    expect(q).not.toContain('text-ink')
    // It still has the strong border's class of every outline button: the hairline's is one attribute heavier.
    expect(q.some((cls) => cls.includes(':where([data-controls=strong])'))).toBe(true)
    const outline = classes(screen.getByRole('button', { name: 'Export' }))
    expect(outline).toEqual(expect.arrayContaining(['border', 'border-line', 'text-ink']))
    expect(outline).not.toContain('text-ink-mute')
    expect(outline).not.toContain(STRONG + 'border-line')
    const ghost = classes(screen.getByRole('button', { name: 'Help' }))
    expect(ghost).not.toContain('border')
    expect(ghost).not.toContain(STRONG + 'border-line')
  })
})

describe('the text of a tall status strip', () => {
  test('the strip and the footer, which shares its text style, speak at the size of the body under the attribute, and at 12px without it', () => {
    render(
      <AppShell contentLabel="Work" status={<span>Ready</span>} footer={<span>3 unread</span>}>
        <p>Content</p>
      </AppShell>,
    )
    for (const slot of ['app-shell-status', 'app-shell-footer']) {
      const c = classes(document.querySelector(`[data-slot="${slot}"]`))
      expect(c, slot).toEqual(expect.arrayContaining(['text-2xs', 'text-ink-mute', TALL + 'text-sm']))
      expect(c.filter((cls) => /(?:^|:)text-(?:sm|base|xs)$/.test(cls)), slot).toEqual([TALL + 'text-sm'])
    }
    // The footer keeps its own height: only the strip is tall.
    const footer = classes(document.querySelector('[data-slot="app-shell-footer"]'))
    expect(footer).toContain('min-h-(--control-xs)')
    expect(footer.some((cls) => cls.includes('min-h-10'))).toBe(false)
  })
})
