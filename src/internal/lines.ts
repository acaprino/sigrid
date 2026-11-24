/** The text of a capture input as lines: a non-empty line is a thing, spaces at the edges do not count. */
export function splitLines(draft: string): string[] {
  return draft
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}
