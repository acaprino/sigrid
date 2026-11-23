// @vitest-environment node
// The toolkit is a design system for any web app: nothing of Tauri, WebView2 or a desktop shell. Windows, IPC and the
// engine's quirks belong to the app that ships them.
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test } from 'vitest'
import { root, walk } from './helpers'

const SHELL = /tauri|webview2|wry\b|desktop shell|DesktopSurface/i

test('no source file of the toolkit mentions Tauri, WebView2 or a desktop shell', () => {
  const found = walk(join(root, 'src'))
    .filter((file) => SHELL.test(readFileSync(file, 'utf8')))
    .map((file) => relative(root, file).replaceAll('\\', '/'))
  expect(found).toEqual([])
})
