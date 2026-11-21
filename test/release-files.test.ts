// @vitest-environment node
// The release package carries its own proof: `provenance.json` lists the SHA-256 of every other file, and
// `manifest.json` names the package with the SHA-256 of its tarball. These are the two pure functions behind them
// (scripts/release-files.mjs); scripts/release.mjs does the build, the packing and the writing.
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
// @ts-expect-error the release scripts are plain ESM JavaScript without declarations
import { manifestOf, provenanceOf } from '../scripts/release-files.mjs'

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const dirs: string[] = []
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'sigrid-release-files-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('provenanceOf', () => {
  test('lists the SHA-256 of every file, without provenance.json, with the version and the commit', () => {
    const dir = temp()
    mkdirSync(join(dir, 'dist'))
    writeFileSync(join(dir, 'package.json'), '{"name":"@acaprino/sigrid"}')
    writeFileSync(join(dir, 'dist', 'index.js'), 'export {}\n')
    writeFileSync(join(dir, 'provenance.json'), 'a stale one from an earlier run')

    const provenance = provenanceOf(dir, ['package.json', 'dist/index.js', 'provenance.json'], { version: '1.2.3', commit: 'abc123' })

    expect(provenance).toEqual({
      package: '@acaprino/sigrid',
      version: '1.2.3',
      commit: 'abc123',
      files: {
        'dist/index.js': sha256('export {}\n'),
        'package.json': sha256('{"name":"@acaprino/sigrid"}'),
      },
    })
  })

  test('keeps the files in a fixed order, whatever order they come in', () => {
    const dir = temp()
    writeFileSync(join(dir, 'b.txt'), 'b')
    writeFileSync(join(dir, 'a.txt'), 'a')

    const provenance = provenanceOf(dir, ['b.txt', 'a.txt'], { version: '1.0.0', commit: 'c' })

    expect(Object.keys(provenance.files)).toEqual(['a.txt', 'b.txt'])
  })

  test('refuses a file that is not there', () => {
    expect(() => provenanceOf(temp(), ['missing.txt'], { version: '1.0.0', commit: 'c' })).toThrow(/missing\.txt/)
  })
})

describe('manifestOf', () => {
  test('names the toolkit package with the file and the SHA-256 of its tarball', () => {
    expect(manifestOf('1.2.3', [{ file: 'a.tgz', sha256: 'x' }])).toEqual({
      version: '1.2.3',
      packages: [{ name: '@acaprino/sigrid', file: 'a.tgz', sha256: 'x' }],
    })
  })
})
