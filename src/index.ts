// @acaprino/sigrid, its main entry: the toolkit and the layout system of the shared UI system (its advanced components and
// the wiring of a native window are entries of their own). Theme engine and colours, tokens and fonts, primitives (Ark UI for
// behaviour, Park UI recipes for form, Base UI under the basic controls and the surfaces that open), motion in a lazy chunk, and the
// generic fields and surfaces built on them. No app concepts: each app builds its product components on top of
// this.

// Theme engine, catalog and colours: the single source of truth for colours.
export { COLORS, COLOR_NAMES, colorHue, markHueAttrs } from './colors'
export { BASE_THEME, FONT_VARIABLE, THEME_ATTRIBUTES, THEME_VARIABLES, applyFont, applyTheme, copyTheme, fontById, isFontId, themeVariables, toneHasEffect, type ThemePick } from './themes'
export { DEFAULT_DENSITY, DENSITIES, DENSITY_LIMITS, DENSITY_VARIABLES, TOUCH_TARGET, applyDensity, densityById, densityOf, densityVariables, densityWith, isDensityId, type Density, type DensityDef, type DensityId, type DensityOverride } from './density'
export { DARK_DEPTHS, DARK_TINTS, DEFAULT_DARK_DEPTH, DEFAULT_DARK_TINT, DEFAULT_FONT, DEFAULT_SHAPE, FONTS, SHAPE_RADII, THEME_SHAPES, isThemeRadii, isThemeShape, themeDark, type DarkDepth, type DarkTint, type FontDef, type FontId, type PaletteProfile, type SidebarKind, type Surfaces, type ThemeDark, type ThemeDef, type ThemeRadii, type ThemeShape } from './theme-catalog'
export { FIXED, STATUS, contrast, fit, luminance, over, themeTokens, toHex, tokensFor, type Oklch, type ThemeScheme, type ThemeTokens } from './theme-engine'
export { DEFAULT_TONE_INTENSITY, DEFAULT_TONE_LIGHT, OWN_BACKGROUNDS, OWN_SECONDS, OWN_SIDEBARS, OWN_TINTS, TONE_INTENSITIES, TONE_LIGHTS, TONE_PRESETS, isAccentColor, ownTheme, presetTone, themeTone, tonePresetOf, type OwnTheme, type ThemeTone, type TonePreset } from './theme-engine'
export { cn } from './lib/utils'

// The words the components say by themselves: English placeholders an app replaces, in any language.
export { DEFAULT_WORDS, WordsProvider, useWords, withWords, type CalendarSpan, type Words, type WordsOverride } from './words'

// Primitives.
export { APP_SHELL_STEPS, AppShell, AppShellContext, Inspector, appShellLayout, useAppShell, type AppShellLayout, type AppShellProps, type AppShellSteps, type InspectorProps } from './components/ui/app-shell'
export { Avatar, initials, type AvatarProps } from './components/ui/avatar'
export { Badge, badgeVariants } from './components/ui/badge'
export { Button, QUIET_CHIP, buttonVariants, type ButtonProps } from './components/ui/button'
export { CALENDAR_WORDS, Calendar, calendarWords, type CalendarProps } from './components/ui/calendar'
export { Checkbox } from './components/ui/checkbox'
export { CommandPalette, filterCommands, useCommandKey, type Command, type CommandPaletteOpenness, type CommandPaletteProps } from './components/ui/command-palette'
export { CommandsProvider, KeyHints, PALETTE_COMMAND, formatKeys, useCommand, useCommandPalette, useCommands, type CommandDeclaration, type CommandsProviderProps, type KeyHint, type KeyHintsProps, type KeyNames } from './components/ui/commands'
export { applyKeptScheme, useSchemeCommands, type SchemeChoice, type SchemeCommandsOptions, type SchemeState } from './components/ui/scheme-commands'
export { Combobox, type ComboboxOption, type ComboboxProps } from './components/ui/combobox'
export { COPIED_MS, CopyButton, type CopyButtonProps } from './components/ui/copy-button'
export { Count, type CountProps } from './components/ui/count'
export { Steps, type StepItem, type StepsProps } from './components/ui/steps'
export { Progress, ProgressRing, ProgressSegments, type ProgressProps, type ProgressRingProps } from './components/ui/progress'
export { Dialog as DialogRoot, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from './components/ui/dialog'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './components/ui/dropdown-menu'
export { Disclosure, type DisclosureProps } from './components/ui/disclosure'
export { Empty, type EmptyProps } from './components/ui/empty'
export { FormField, type FormFieldProps } from './components/ui/form-field'
export { Input } from './components/ui/input'
export { InputGroup, InputGroupButton, InputGroupText, type InputGroupButtonProps, type InputGroupProps, type InputGroupTextProps } from './components/ui/input-group'
export { ItemList, ItemRow, type ItemFact, type ItemListProps, type ItemRowProps } from './components/ui/item-list'
export { ContentSplit, type ContentSplitProps } from './components/ui/content-split'
export { Cluster, Column, Grid, Page, ScrollArea, Section, Spacer, Split, Text, type ClusterProps, type ColumnProps, type GridProps, type LayoutAttributes, type LayoutElement, type PageProps, type ScrollAreaProps, type SectionProps, type Space, type SplitProps, type TextProps } from './components/ui/layout'
export { Kbd, Shortcut, type KbdProps, type KbdSize, type ShortcutProps } from './components/ui/kbd'
export { NavItem, NavList, type NavItemProps, type NavListProps } from './components/ui/nav-list'
export { Note, type NoteProps, type NoteTone } from './components/ui/note'
export { OverflowList, type OverflowListProps } from './components/ui/overflow-list'
export { Panel, type PanelProps } from './components/ui/panel'
export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './components/ui/popover'
export { RadioGroup, RadioGroupItem, type RadioGroupItemProps, type RadioGroupProps } from './components/ui/radio-group'
export { SearchField, type SearchFieldProps } from './components/ui/search-field'
export { Sidebar, SidebarGroup, type SidebarGroupProps, type SidebarProps } from './components/ui/sidebar'
export { Select, type SelectGroup, type SelectOption, type SelectProps } from './components/ui/select'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet'
export type { SheetCloseReason } from './components/ui/sheet'
export type { SheetWidth } from './components/ui/sheet'
export { Slider, type SliderProps } from './components/ui/slider'
export { Switch, type SwitchProps } from './components/ui/switch'
export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, type TableCellAlign, type TableCellProps, type TableHeadProps, type TableProps, type TableRowProps } from './components/ui/table'
export { Tabs, TabsContent, TabsList, TabsTrigger, type TabsContentProps, type TabsListProps, type TabsProps, type TabsTriggerProps } from './components/ui/tabs'
export { Textarea } from './components/ui/textarea'
export { TitleBar, TitleBarDragContext, TitleBarSizeContext, WindowControls, type TitleBarDragProps, type TitleBarProps, type WindowControlsProps } from './components/ui/title-bar'
export { ToggleGroup, ToggleGroupItem, type ToggleGroupItemProps, type ToggleGroupProps } from './components/ui/toggle-group'
export { Toolbar, ToolbarBrand, brandInitial, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTab, ToolbarTabs, ToolbarTitle, type ToolbarBrandProps, type ToolbarButtonProps, type ToolbarGroupProps, type ToolbarProps, type ToolbarSearchProps, type ToolbarTabProps, type ToolbarTabsProps } from './components/ui/toolbar'
export { TOOLTIP_DELAY_MS, Tooltip, type TooltipProps } from './components/ui/tooltip'
export { Tree, type TreeNode, type TreeProps } from './components/ui/tree'
// The parts an app composes a screen of with no class of its own: a card, a heading, a dot, a line, the facts of one
// thing, a choice of a settings page, a row of the sidebar's head or foot, the button that opens the sidebar's drawer.
export { Card, type CardProps } from './components/ui/card'
export { DescriptionList, type DescriptionItem, type DescriptionListProps } from './components/ui/description-list'
export { Dot, type DotProps } from './components/ui/dot'
export { DrawerButton, type DrawerButtonProps } from './components/ui/drawer-button'
export { Heading, type HeadingProps } from './components/ui/heading'
export { Separator, type SeparatorProps } from './components/ui/separator'
export { SettingRow, type SettingRowProps } from './components/ui/setting-row'
export { SidebarRow, type SidebarRowProps } from './components/ui/sidebar-row'
export { Collapsible, Field, PopoverPrimitive } from './components/ui/headless'
export type InputProps = React.ComponentProps<typeof import('./components/ui/input').Input>
export type TextareaProps = React.ComponentProps<typeof import('./components/ui/textarea').Textarea>
export type CheckboxProps = React.ComponentProps<typeof import('./components/ui/checkbox').Checkbox>

// Surfaces.
export { Dialog, type DialogProps } from './components/Dialog'
export { PortalContainerProvider, usePortalContainer } from './internal/portal-container'
export { Toasts, type ToastAction, type ToastItem, type ToastsProps } from './components/Toasts'

// Look settings: the base colour, the combination, the tone, the density and the ready-made themes, as cards with a
// preview each; the app passes its words.
export { BaseColorChoice, ChoiceCard, ChoiceCards, ChoiceGroup, ChoicePreview, DensityChoice, PaletteComboChoice, PaletteStrip, ThemeCatalogChoice, TonePresetChoice, TonePreview, radioArrows, type BaseColorText, type ChoiceText, type DensityText, type PaletteComboText, type ThemeCatalogText, type TonePresetText } from './components/LookSettings'

// Motion: the hook and the loader; Motion itself stays in a separate chunk, loaded only with animations on.
export { MotionProvider, loadMotion, preloadMotion, useMotion, type MotionImpl } from './internal/motion'

// Fields, content and behaviour helpers.
export { AttachmentMarks, AttachmentsSection, stateText, summarize, typedUrl, type AttachmentMarksInput, type AttachmentState, type AttachmentSummary, type AttachmentView, type AttachmentsSectionProps } from './components/Attachments'
export { AttachmentViewer, VIEWER_ZOOMS, type AttachmentViewerProps, type AttachmentViewerStatus, type ViewerPage } from './components/AttachmentViewer'
export { ChipsInput, type ChipsInputProps } from './components/ChipsInput'
export { DateField, DateRangeField, DateTimeField, dayPicks, rangePicks, type DateFieldProps, type DatePick, type DateRange, type DateRangeFieldProps, type DateRangePick, type DateTimeFieldProps } from './components/DateField'
export { MAX_FILE_BYTES, limitLabel, overLimitNotice, payloadFromDataTransfer, useDropTarget, withinLimit, type AttachPayload, type DropPayload, type DropTarget } from './internal/drop'
export { DurationField, type DurationFieldProps, type DurationParts } from './components/DurationField'
export { FileDrop, type FileDropProps, type FileDropReason, type FileDropRefusal } from './internal/file-drop'
export { guardDesktop, isBrowserKey, useDesktopGuard, type DesktopGuardOptions } from './internal/desktop-guard'
export { kindIcon, kindLabel, type AttachmentKind, type ItemKind } from './internal/kinds'
export { InlineMarkdown, MarkdownBlocks, hasMarkdown, parseBlocks, parseInline, plainText } from './internal/markdown'
export { COARSE, NARROW, SHORT, useMedia, usePhone } from './internal/media'
export { APP_HEIGHT_VAR, useAppHeight } from './internal/app-height'
export { BACKDROP, BOTTOM_BAR_ROOM_VAR, SHEET_TOASTS_ROOM, TOASTS_ATTR, TOASTS_LAYER, TOASTS_ROOM_VAR, ignoreToasts, restoreFocus } from './internal/overlay'
export { Swatches, type SwatchesProps } from './components/Swatches'
export { TAG_COLOR, TAG_HUES, TAG_PILL, tagColorAttrs, tagHue } from './internal/tag-color'
export { NeedThumbnail, Thumbnail, safeThumbnail, type ThumbnailProps } from './internal/thumbnail'
export { ICON_NAMES, Icon, isIconName, type IconName } from './icons'
export { PALETTE_COMBOS, palettePick, paletteTheme, type PaletteCombo, type PalettePick } from './palette'
export { HARMONIES, accentSuggestions, duoTheme, pageTint, type AccentSuggestion, type DuoPick, type Harmony } from './harmony'
export { SPOT_KINDS, colorTheme, isSpotKind, spotOf, spotSuggestions, type ColorThemePick, type SpotKind } from './color-theme'
export { ThemeGallery, type ThemeGalleryProps } from './components/ThemeGallery'
export { ColorMatch, type ColorMatchProps } from './components/ColorMatch'
