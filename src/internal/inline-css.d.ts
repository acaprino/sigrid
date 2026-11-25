// The text of a stylesheet of a library, as a string: `import css from 'library/file.css?inline'`. Vite does this by
// itself; the package's build does it with a small plugin (scripts/build.mjs). A part that needs a library's own CSS
// puts it in the page once (`ensureStyle`), so the app imports nothing.
declare module '*.css?inline' {
  const css: string
  export default css
}
