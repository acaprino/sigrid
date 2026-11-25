// @acaprino/sigrid/assemblies, the third level: components that do a whole function together, with a state of their
// own. The command palette and its commands, a whole chat with an assistant, a conversation and its field, a deck decided one card at a time, a tree
// of rows, the attachments and their viewer, the look settings. An assembly may use every level before it. Those that
// rest on a library an app may not need are entries of their own: `/table`, `/virtual`, `/reorder`, `/rich-text`,
// `/graph`.
export { AttachmentMarks, AttachmentsSection, stateText, summarize, typedUrl, type AttachmentMarksInput, type AttachmentState, type AttachmentSummary, type AttachmentView, type AttachmentsSectionProps } from './assemblies/Attachments'
export { AttachmentViewer, VIEWER_ZOOMS, type AttachmentViewerProps, type AttachmentViewerStatus, type ViewerPage } from './assemblies/AttachmentViewer'
export { ColorMatch, type ColorMatchProps } from './assemblies/ColorMatch'
export { AUTH_PASSWORD_MIN, AuthForm, type AuthFormProps, type AuthMode, type AuthProvider, type AuthValues } from './assemblies/auth-form'
export { Chat, type ChatMessage, type ChatProps, type ChatTool } from './assemblies/chat'
export { CommandPalette, filterCommands, useCommandKey, type Command, type CommandPaletteOpenness, type CommandPaletteProps } from './assemblies/command-palette'
export { CommandsProvider, KeyHints, PALETTE_COMMAND, formatKeys, useCommand, useCommandPalette, useCommands, type CommandDeclaration, type CommandsProviderProps, type KeyHint, type KeyHintsProps, type KeyNames } from './assemblies/commands'
export { CONVERSATION_NEAR_PX, Conversation, type ConversationProps } from './assemblies/conversation'
export { BaseColorChoice, ChoiceCard, ChoiceCards, ChoiceGroup, ChoicePreview, DensityChoice, PaletteComboChoice, PaletteStrip, ThemeCatalogChoice, TonePresetChoice, TonePreview, radioArrows, type BaseColorText, type ChoiceText, type DensityText, type PaletteComboText, type ThemeCatalogText, type TonePresetText } from './assemblies/LookSettings'
export { PromptInput, type PromptInputProps } from './assemblies/prompt-input'
export { applyKeptScheme, useSchemeCommands, type SchemeChoice, type SchemeCommandsOptions, type SchemeState } from './assemblies/scheme-commands'
export { SWIPE_DISTANCE_PX, SWIPE_FLICK, SwipeDeck, type SwipeDeckProps, type SwipeDirection } from './assemblies/swipe-deck'
export { ThemeGallery, type ThemeGalleryProps } from './assemblies/ThemeGallery'
export { Tree, type TreeNode, type TreeProps } from './assemblies/tree'
export { Lightbox, type LightboxImage, type LightboxProps } from './assemblies/lightbox'
export { Wizard, type WizardProps, type WizardStep } from './assemblies/wizard'
export { activateWorkspaceTab, addWorkspaceTab, closeWorkspaceTab, emptyWorkspace, findWorkspaceGroup, findWorkspaceTab, layoutWorkspace, moveWorkspaceTab, normalizeWorkspace, resizeWorkspace, shiftWorkspaceWeights, splitWorkspaceGroup, workspaceGroups, workspaceMinimum, workspaceNeighbor, workspaceNodeAt, workspaceZone, type WorkspaceDirection, type WorkspaceDrop, type WorkspaceEdge, type WorkspaceLayout, type WorkspaceNode, type WorkspacePath, type WorkspaceRect, type WorkspaceSash, type WorkspaceSplit, type WorkspaceTab, type WorkspaceTabs } from './assemblies/workspace-model'
export { Workspace, type WorkspaceProps, type WorkspaceTabState } from './assemblies/workspace'
