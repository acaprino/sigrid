/** A fake DataTransfer: jsdom does not implement it. */
export const dt = (types: Record<string, string>, files: File[] = []) => ({
  types: Object.keys(types).concat(files.length ? ['Files'] : []),
  getData: (t: string) => types[t] ?? '',
  files: files as unknown as FileList,
})
