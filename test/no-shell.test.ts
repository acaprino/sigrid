// @vitest-environment node
// The toolkit is a design system for any web app: nothing of Tauri, WebView2 or a desktop shell. Windows, IPC and the
// engine's quirks belong to the app that ships them.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const SHELL = /tauri|webview2|wry\b|desktop shell|DesktopSurface/i

test('no source file of the toolkit mentions Tauri, WebView2 or a desktop shell', () => {
  const found = walk(join(root, 'src'))
    .filter((file) => SHELL.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file).replaceAll('\\', '/'))
  expect(found).toEqual([])
})
