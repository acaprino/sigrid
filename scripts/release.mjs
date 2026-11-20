// Release build: the "build" of .github/release.json, run by the shared release workflow (and by hand to try it).
// Builds, checks, then packs the toolkit into release/ with the proof of what is in it.
// Usage: npm run release [-- --skip-test]     (--skip-test is for trying it locally: the release workflow runs the tests)
//   release/acaprino-toolkit-<version>.tgz   the package, installable with `npm i ./file.tgz` or from any URL
//   release/manifest.json                    the version, and the file name and SHA-256 of the package
//   release/SHA256SUMS                       `<sha256>  <file>` for every other file here (`sha256sum -c SHA256SUMS`)
// Inside the package, provenance.json holds the commit and the SHA-256 of every other file of the package.
// release/ always holds only the current release (it is wiped first) and only files, because the workflow
// publishes the files at its top level.
import { execFileSync, execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { manifestOf, PROVENANCE_FILE, provenanceOf, sha256Of } from './release-files.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
for (const arg of args) if (arg !== '--skip-test') throw new Error(`unknown argument ${arg} (only --skip-test)`)

// On Windows npm is `npm.cmd`, which Node runs only through a shell. The arguments are fixed words, so they go in
// the command line as they are (`execFileSync` with `shell: true` and an argument list is deprecated).
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npm = (argv, { capture = false } = {}) =>
  execSync(`${npmCommand} ${argv.join(' ')}`, { cwd: root, stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'], encoding: 'utf8' })
const json = (argv) => JSON.parse(npm(argv, { capture: true }))

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const release = join(root, 'release')
const provenanceFile = join(root, PROVENANCE_FILE)

rmSync(release, { recursive: true, force: true })
rmSync(provenanceFile, { force: true })
mkdirSync(release, { recursive: true })

npm(['run', 'build'])
npm(['run', 'typecheck'])
if (!args.includes('--skip-test')) npm(['test'])

try {
  // Every file the package will hold (dist/, src/ and the files listed in package.json), as npm itself counts them.
  const [dryRun] = json(['pack', '--dry-run', '--json'])
  const provenance = provenanceOf(root, dryRun.files.map((f) => f.path), { version: pkg.version, commit })
  writeFileSync(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`)

  const [packed] = json(['pack', '--pack-destination', 'release', '--json'])
  // The tarball must hold exactly what the provenance lists, plus the provenance itself.
  const expected = new Set([...Object.keys(provenance.files), PROVENANCE_FILE])
  const actual = new Set(packed.files.map((f) => f.path))
  const differ = [
    ...[...expected].filter((f) => !actual.has(f)).map((f) => `not packed: ${f}`),
    ...[...actual].filter((f) => !expected.has(f)).map((f) => `not in provenance.json: ${f}`),
  ]
  if (differ.length) throw new Error(`${packed.filename} does not hold what provenance.json lists:\n  ${differ.join('\n  ')}`)

  const manifest = manifestOf(pkg.version, [{ file: packed.filename, sha256: sha256Of(readFileSync(join(release, packed.filename))) }])
  writeFileSync(join(release, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  const sums = readdirSync(release).sort().map((file) => `${sha256Of(readFileSync(join(release, file)))}  ${file}`)
  writeFileSync(join(release, 'SHA256SUMS'), `${sums.join('\n')}\n`)

  console.log(`\nrelease ${pkg.version} (${commit.slice(0, 7)}):`)
  for (const file of readdirSync(release).sort()) console.log(`  release/${file}`)
} finally {
  // It belongs to the package, not to the working tree: a left-over would be stale the next time.
  rmSync(provenanceFile, { force: true })
}
