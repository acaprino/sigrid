// The pure pieces of a release: the provenance the package carries and the manifest that sits beside it.
// scripts/release.mjs does the building, the packing and the writing; test/release-files.test.ts covers these.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const PACKAGE_NAME = '@acaprino/sigrid'
/** The proof inside the package: it lists every other file, so it cannot list itself. */
export const PROVENANCE_FILE = 'provenance.json'

export const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex')

/**
 * What `provenance.json` says: which version of which commit the package is, and the SHA-256 of each of its files.
 * `files` are the paths (relative to `dir`, with `/`) the package will hold; the provenance file itself is left out.
 * The paths are sorted, so the same tree always gives the same file.
 */
export function provenanceOf(dir, files, { version, commit }) {
  const hashes = {}
  for (const file of [...new Set(files)].filter((f) => f !== PROVENANCE_FILE).sort()) {
    hashes[file] = sha256Of(readFileSync(join(dir, file)))
  }
  return { package: PACKAGE_NAME, version, commit, files: hashes }
}

/** `release/manifest.json`: the version and, for each tarball, its file name and SHA-256. */
export function manifestOf(version, entries) {
  return { version, packages: entries.map(({ file, sha256 }) => ({ name: PACKAGE_NAME, file, sha256 })) }
}
