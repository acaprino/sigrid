// The `./rich-text` entry of the package: a field for text with a little form, and the message of mail written with
// it. It is apart from the entry of the assemblies because
// it brings TipTap (and ProseMirror under it) with it, the heaviest thing the toolkit rests on: an app that writes no
// formatted text does not load it.
export { RichTextField, type RichTextFieldProps } from './assemblies/RichTextField'
export { EMPTY_EMAIL, EmailComposer, emailProblem, isEmailAddress, type EmailComposerProps, type EmailDraft } from './assemblies/EmailComposer'
