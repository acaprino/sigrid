// @acaprino/sigrid: the shared design system. Theme engine and colours, tokens and fonts, primitives (Ark UI for
// behaviour, Park UI recipes for form, Base UI under the basic controls and the surfaces that open), motion in a lazy chunk, and the
// generic fields and surfaces built on them. No app concepts: each app builds its product components on top of
// this.

// Theme engine, catalog and colours: the single source of truth for colours.
export { COLORS, COLOR_NAMES, colorHue, markHueAttrs } from './colors'
export { BASE_THEME, FONT_VARIABLE, THEME_ATTRIBUTES, THEME_VARIABLES, applyFont, applyTheme, copyTheme, fontById, isFontId, themeVariables, toneHasEffect, type ThemePick } from './themes'
export { DEFAULT_DENSITY, DENSITIES, DENSITY_LIMITS, DENSITY_VARIABLES, TOUCH_TARGET, applyDensity, densityById, densityOf, densityVariables, densityWith, isDensityId, type Density, type DensityDef, type DensityId, type DensityOverride } from './density'
export { DEFAULT_FONT, DEFAULT_SHAPE, FONTS, SHAPE_RADII, THEME_SHAPES, isThemeRadii, isThemeShape, type FontDef, type FontId, type PaletteProfile, type SidebarKind, type Surfaces, type ThemeDef, type ThemeRadii, type ThemeShape } from './theme-catalog'
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
export { CommandPalette, filterCommands, useCommandKey, type Command, type CommandPaletteProps } from './components/ui/command-palette'
export { Combobox, type ComboboxOption, type ComboboxProps } from './components/ui/combobox'
export { Count, type CountProps } from './components/ui/count'
export { Steps, type StepItem, type StepsProps } from './components/ui/steps'
export { Progress, ProgressRing, ProgressSegments, type ProgressProps, type ProgressRingProps } from './components/ui/progress'
export { Dialog as DialogRoot, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from './components/ui/dialog'
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './components/ui/dropdown-menu'
export { Empty, type EmptyProps } from './components/ui/empty'
export { FormField, type FormFieldProps } from './components/ui/form-field'
export { Input } from './components/ui/input'
export { ItemList, ItemRow, type ItemListProps, type ItemRowProps } from './components/ui/item-list'
export { Kbd, Shortcut, type KbdProps, type KbdSize, type ShortcutProps } from './components/ui/kbd'
export { NavItem, NavList, type NavItemProps, type NavListProps } from './components/ui/nav-list'
export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './components/ui/popover'
export { RadioGroup, RadioGroupItem, type RadioGroupItemProps, type RadioGroupProps } from './components/ui/radio-group'
export { SearchField, type SearchFieldProps } from './components/ui/search-field'
export { Sidebar, SidebarGroup, type SidebarGroupProps, type SidebarProps } from './components/ui/sidebar'
export { Select, type SelectGroup, type SelectOption, type SelectProps } from './components/ui/select'
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet'
export { Slider, type SliderProps } from './components/ui/slider'
export { Switch, type SwitchProps } from './components/ui/switch'
export { Tabs, TabsContent, TabsList, TabsTrigger, type TabsContentProps, type TabsListProps, type TabsProps, type TabsTriggerProps } from './components/ui/tabs'
export { Textarea } from './components/ui/textarea'
export { TitleBar, TitleBarDragContext, TitleBarSizeContext, WindowControls, type TitleBarDragProps, type TitleBarProps, type WindowControlsProps } from './components/ui/title-bar'
export { ToggleGroup, ToggleGroupItem, type ToggleGroupItemProps, type ToggleGroupProps } from './components/ui/toggle-group'
export { Toolbar, ToolbarBrand, brandInitial, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTab, ToolbarTabs, ToolbarTitle, type ToolbarBrandProps, type ToolbarButtonProps, type ToolbarGroupProps, type ToolbarProps, type ToolbarSearchProps, type ToolbarTabProps, type ToolbarTabsProps } from './components/ui/toolbar'
export { TOOLTIP_DELAY_MS, Tooltip, type TooltipProps } from './components/ui/tooltip'
export { Collapsible, Field, PopoverPrimitive } from './components/ui/headless'
export type InputProps = React.ComponentProps<typeof import('./components/ui/input').Input>
export type TextareaProps = React.ComponentProps<typeof import('./components/ui/textarea').Textarea>
export type CheckboxProps = React.ComponentProps<typeof import('./components/ui/checkbox').Checkbox>

// Surfaces.
export { Dialog, type DialogProps } from './components/Dialog'
export { PortalContainerProvider, usePortalContainer } from './components/PortalContainer'
export { Toasts, type ToastAction, type ToastItem, type ToastsProps } from './components/Toasts'

// Look settings: the base colour, the combination, the tone, the icon pack and the ready-made themes, as cards with a
// preview each; the app passes its words.
export { BaseColorChoice, ChoiceCard, ChoiceCards, ChoiceGroup, ChoicePreview, DensityChoice, IconPackChoice, PaletteComboChoice, PaletteStrip, ThemeCatalogChoice, TonePresetChoice, TonePreview, radioArrows, type BaseColorText, type ChoiceText, type DensityText, type IconPackText, type PaletteComboText, type ThemeCatalogText, type TonePresetText } from './components/LookSettings'

// Motion: the hook and the loader; Motion itself stays in a separate chunk, loaded only with animations on.
export { MotionProvider, loadMotion, preloadMotion, useMotion, type MotionImpl } from './internal/motion'

// Fields, content and behaviour helpers.
export { AttachmentMarks, AttachmentsSection, stateText, summarize, typedUrl, type AttachmentMarksInput, type AttachmentState, type AttachmentSummary, type AttachmentView, type AttachmentsSectionProps } from './internal/attachments'
export { AttachmentViewer, VIEWER_ZOOMS, type AttachmentViewerProps, type AttachmentViewerStatus, type ViewerPage } from './internal/attachment-viewer'
export { ChipsInput, type ChipsInputProps } from './internal/chips'
export { DateField, DateRangeField, DateTimeField, dayPicks, rangePicks, type DateFieldProps, type DatePick, type DateRange, type DateRangeFieldProps, type DateRangePick, type DateTimeFieldProps } from './internal/date-field'
export { MAX_FILE_BYTES, limitLabel, overLimitNotice, payloadFromDataTransfer, useDropTarget, usePageDrop, withinLimit, type AttachPayload, type DropPayload, type DropTarget } from './internal/drop'
export { DurationField, type DurationFieldProps, type DurationParts } from './internal/duration-field'
export { FileDrop, type FileDropProps, type FileDropReason, type FileDropRefusal } from './internal/file-drop'
export { guardDesktop, isBrowserKey, useDesktopGuard, type DesktopGuardOptions } from './internal/desktop-guard'
export { useEdgeAutoScroll } from './internal/edge-scroll'
export { kindIcon, kindLabel, type AttachmentKind, type ItemKind } from './internal/kinds'
export { splitLines } from './internal/lines'
export { InlineMarkdown, MarkdownBlocks, hasMarkdown, parseBlocks, parseInline, plainText } from './internal/markdown'
export { COARSE, NARROW, useMedia, usePhone } from './internal/media'
export { BACKDROP, BOTTOM_BAR_ROOM_VAR, SHEET_TOASTS_ROOM, TOASTS_ATTR, TOASTS_LAYER, TOASTS_ROOM_VAR, ignoreToasts, restoreFocus } from './internal/overlay'
export { Swatches, type SwatchesProps } from './internal/swatches'
export { TAG_COLOR, TAG_HUES, TAG_PILL, tagColorAttrs, tagHue } from './internal/tag-color'
export { NeedThumbnail, Thumbnail, safeThumbnail, type ThumbnailProps } from './internal/thumbnail'
export { DEFAULT_ICON_PACK, ICON_NAMES, ICON_PACKS, Icon, IconPackProvider, isIconName, isIconPack, useIconPack, type IconArt, type IconDrawing, type IconName, type IconPack, type IconSet } from './icons'
export { PALETTE_COMBOS, palettePick, paletteTheme, type PaletteCombo, type PalettePick } from './palette'
export { HARMONIES, accentSuggestions, duoTheme, pageTint, type AccentSuggestion, type DuoPick, type Harmony } from './harmony'
export { SPOT_KINDS, colorTheme, isSpotKind, spotOf, spotSuggestions, type ColorThemePick, type SpotKind } from './color-theme'
export { ThemeGallery, type ThemeGalleryProps } from './components/ThemeGallery'
export { ColorMatch, type ColorMatchProps } from './components/ColorMatch'
