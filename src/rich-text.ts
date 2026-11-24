// The `./rich-text` entry of the package: a field for text with a little form. It is apart from the main entry because
// it brings TipTap (and ProseMirror under it) with it, the heaviest thing the toolkit rests on: an app that writes no
// formatted text does not load it.
export { RichTextField, type RichTextFieldProps } from './assemblies/RichTextField'
