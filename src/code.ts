// The `./code` entry of the package: a view for code, read-only or editable (CodeMirror 6, in the toolkit's colours and
// font), with the languages it loads when a file of them is shown. It is apart from the entry of the assemblies because
// it brings CodeMirror with it: an app that shows no code does not load it.
export { CodeView, type CodeViewHandle, type CodeViewProps } from './assemblies/CodeView'
export { codeLanguageById, codeLanguageOf, loadCodeLanguage, type CodeLanguage, type CodeLanguageId } from './assemblies/code-languages'
export { codeColors, codeTheme, type CodeColors } from './assemblies/code-theme'
