// The entry of the package each part is imported from, by level: every name the main entry and the entries of the
// levels export. Written out, and not read from the modules, so the code export runs where the parts themselves
// cannot be loaded (scripts/agents.mjs, in Node); test/editor-export.test.ts holds it against what each entry really
// exports, so a part added to the toolkit is added here too.
export const ENTRY_NAMES: Readonly<Record<string, readonly string[]>> = {
  '@acaprino/sigrid': [
    'accentSuggestions', 'APP_HEIGHT_VAR', 'applyDensity', 'applyFont', 'applyHeadingFont', 'applyMotionFeel', 'applyTheme', 'BACKDROP',
    'BASE_THEME', 'BOTTOM_BAR_ROOM_VAR', 'cn', 'COARSE', 'COLOR_NAMES', 'colorHue', 'COLORS', 'colorTheme',
    'contrast', 'copyTheme', 'DARK_DEPTHS', 'DARK_TINTS', 'DEFAULT_DARK_DEPTH', 'DEFAULT_DARK_TINT',
    'DEFAULT_DENSITY', 'DEFAULT_FONT', 'DEFAULT_MOTION_FEEL', 'DEFAULT_SHAPE', 'DEFAULT_TONE_INTENSITY',
    'DEFAULT_TONE_LIGHT', 'DEFAULT_WORDS', 'DENSITIES', 'DENSITY_LIMITS', 'DENSITY_VARIABLES', 'densityById',
    'densityOf', 'densityVariables', 'densityWith', 'duoTheme', 'fit', 'FIXED', 'FONT_VARIABLE', 'fontById', 'FONTS',
    'grayScale', 'guardDesktop', 'HARMONIES', 'hasMarkdown', 'HEADING_FONT_VARIABLE', 'HEADING_WEIGHT_VARIABLE', 'HUE_NAMES', 'hueColor', 'hueScale', 'ignoreToasts', 'isAccentColor', 'isBrowserKey', 'isDensityId',
    'isFontId', 'isHueName', 'isMotionEase', 'isSpotKind', 'isThemeRadii', 'isThemeShape', 'kindIcon', 'kindLabel', 'limitLabel',
    'loadMotion', 'luminance', 'markdownHeadings', 'markHueAttrs', 'MAX_FILE_BYTES', 'MOTION_EASE_NAMES', 'MOTION_EASES', 'MOTION_PACE',
    'motionFeel', 'MotionProvider', 'motionVariables', 'namedTheme', 'NARROW', 'over', 'overLimitNotice', 'OWN_BACKGROUNDS',
    'OWN_SECONDS', 'OWN_SIDEBARS', 'OWN_TINTS', 'ownTheme', 'pageTint', 'PALETTE_COMBOS', 'palettePick',
    'paletteTheme', 'parseBlocks', 'parseInline', 'payloadFromDataTransfer', 'plainText', 'PortalContainerProvider',
    'preloadMotion', 'presetTone', 'restoreFocus', 'SHAPE_RADII', 'SHEET_TOASTS_ROOM', 'SHORT', 'splitLines',
    'SPOT_KINDS', 'spotOf', 'spotSuggestions', 'STATUS', 'SYSTEM_FONT', 'TAG_COLOR', 'TAG_HUES', 'TAG_PILL', 'tagColorAttrs',
    'tagHue', 'THEME_ATTRIBUTES', 'THEME_SHAPES', 'THEME_VARIABLES', 'themeDark', 'themeTokens', 'themeTone',
    'themeVariables', 'TOASTS_ATTR', 'TOASTS_LAYER', 'TOASTS_ROOM_VAR', 'toHex', 'tokensFor', 'TONE_INTENSITIES',
    'TONE_LIGHTS', 'TONE_PRESETS', 'toneHasEffect', 'tonePresetOf', 'TOUCH_TARGET', 'useAppHeight', 'useDesktopGuard',
    'useDropTarget', 'useEdgeAutoScroll', 'useMedia', 'useMotion', 'usePhone', 'usePortalContainer', 'useWords',
    'withinLimit', 'withWords', 'WordsProvider',
  ],
  '@acaprino/sigrid/primitives': [
    'Avatar', 'AvatarGroup', 'Badge', 'badgeVariants', 'Button', 'buttonVariants', 'Card', 'Cell', 'Checkbox', 'Cluster', 'Collapsible',
    'Column', 'Count', 'DialogClose', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader',
    'DialogOverlay', 'DialogPortal', 'DialogRoot', 'DialogTitle', 'DialogTrigger', 'Dot', 'DropdownMenu',
    'DropdownMenuCheckboxItem', 'DropdownMenuContent', 'DropdownMenuGroup', 'DropdownMenuItem', 'DropdownMenuLabel',
    'DropdownMenuPortal', 'DropdownMenuRadioGroup', 'DropdownMenuRadioItem', 'DropdownMenuSeparator',
    'DropdownMenuShortcut', 'DropdownMenuSub', 'DropdownMenuSubContent', 'DropdownMenuSubTrigger',
    'DropdownMenuTrigger', 'Field', 'Grid', 'Heading', 'HoverFollow', 'Icon', 'ICON_NAMES', 'initials', 'Input', 'isIconName', 'Kbd', 'LevelMeter', 'Logo',
    'NeedThumbnail', 'Page', 'Popover', 'PopoverAnchor', 'PopoverContent', 'PopoverDescription', 'PopoverHeader',
    'PopoverPrimitive', 'PopoverTitle', 'PopoverTrigger', 'Progress', 'ProgressRing', 'ProgressSegments',
    'QUIET_CHIP', 'RadioGroup', 'RadioGroupItem', 'safeThumbnail', 'ScrollArea', 'Section', 'Select', 'Separator',
    'Sheet', 'SheetClose', 'SheetContent', 'SheetDescription', 'SheetFooter', 'SheetHeader', 'SheetTitle',
    'SheetTrigger', 'Shortcut', 'Slider', 'Spacer', 'Split', 'Switch', 'Table', 'TableBody', 'TableCaption',
    'TableCell', 'TableHead', 'TableHeader', 'TableRow', 'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Text',
    'TextList', 'Textarea', 'Thumbnail', 'ToggleGroup', 'ToggleGroupItem', 'Tooltip', 'TOOLTIP_DELAY_MS',
  ],
  '@acaprino/sigrid/components': [
    'Calendar', 'CALENDAR_WORDS', 'calendarWords', 'ChipsInput', 'Combobox', 'ConfirmDialog', 'ContextMenu', 'COPIED_MS',
    'CopyButton', 'DateField', 'DateRangeField', 'DateTimeField', 'dayPicks', 'DescriptionList', 'Dialog',
    'Disclosure', 'DurationField', 'Empty', 'FileDrop', 'FilterBar', 'FilterPopover', 'FormField', 'frameRect', 'FrameSurface', 'InlineMarkdown', 'InputGroup',
    'InputGroupButton', 'InputGroupText', 'ItemList', 'ItemRow', 'MarkdownBlocks', 'markdownHeadings', 'Message', 'Metric', 'Note', 'OnThisPage', 'OverflowList',
    'pastRangePicks', 'Prose', 'rangePicks', 'Reasoning', 'SearchField', 'SettingRow', 'Sparkline', 'Steps', 'Suggestions', 'Swatches', 'Toasts', 'ToolCall',
  ],
  '@acaprino/sigrid/layout': [
    'APP_SHELL_STEPS', 'AppShell', 'AppShellContext', 'appShellLayout', 'brandInitial', 'ContentSplit',
    'DrawerButton', 'Inspector', 'NavItem', 'NavList', 'Panel', 'Sidebar', 'SidebarGroup', 'SidebarRow', 'SplitPane', 'TitleBar',
    'TitleBarDragContext', 'TitleBarSizeContext', 'Toolbar', 'ToolbarBrand', 'ToolbarButton', 'ToolbarGroup',
    'ToolbarSearch', 'ToolbarSeparator', 'ToolbarSpacer', 'ToolbarTab', 'ToolbarTabs', 'ToolbarTitle', 'useAppShell',
    'WindowControls',
  ],
  '@acaprino/sigrid/assemblies': [
    'applyKeptScheme', 'AttachmentMarks', 'AttachmentsSection', 'AttachmentViewer', 'AUTH_PASSWORD_MIN', 'AuthForm',
    'BaseColorChoice', 'Chat', 'ChoiceCard', 'ChoiceCards', 'ChoiceGroup', 'ChoicePreview', 'ColorMatch',
    'CommandPalette', 'CommandsProvider', 'Conversation', 'CONVERSATION_NEAR_PX', 'DensityChoice', 'filterCommands',
    'formatKeys', 'KeyHints', 'Lightbox', 'PALETTE_COMMAND', 'PaletteComboChoice', 'PaletteStrip', 'PromptInput',
    'radioArrows', 'stateText', 'summarize', 'SWIPE_DISTANCE_PX', 'SWIPE_FLICK', 'SwipeDeck', 'ThemeCatalogChoice',
    'ThemeGallery', 'TonePresetChoice', 'TonePreview', 'Tree', 'typedUrl', 'useCommand', 'useCommandKey',
    'useCommandPalette', 'useCommands', 'useSchemeCommands', 'VIEWER_ZOOMS', 'Wizard', 'Workspace',
    'activateWorkspaceTab', 'addWorkspaceTab', 'closeWorkspaceTab', 'emptyWorkspace', 'findWorkspaceGroup',
    'findWorkspaceTab', 'layoutWorkspace', 'moveWorkspaceTab', 'normalizeWorkspace', 'resizeWorkspace',
    'shiftWorkspaceWeights', 'splitWorkspaceGroup', 'workspaceGroups', 'workspaceMinimum', 'workspaceNeighbor',
    'workspaceNodeAt', 'workspaceZone',
  ],
}

/** The types the code export names, which no module holds when it runs, and the part each comes with. */
const TYPE_WITH: Readonly<Record<string, string>> = { ToastItem: 'Toasts' }

/**
 * The names sorted into the entries they are imported from, in the order of the levels. A name may be `type X`. A name
 * no entry lists is an error of the export, said at once: add it to `ENTRY_NAMES`.
 */
export function byEntry(names: readonly string[]): [entry: string, names: string[]][] {
  const groups = new Map<string, string[]>()
  for (const name of names) {
    const bare = name.replace(/^type /, '')
    const value = name === bare ? bare : (TYPE_WITH[bare] ?? bare)
    const entry = Object.keys(ENTRY_NAMES).find((key) => ENTRY_NAMES[key]!.includes(value))
    if (!entry) throw new Error(`No entry is listed for ${bare} (showcase/editor/entries.ts)`)
    groups.set(entry, [...(groups.get(entry) ?? []), name])
  }
  return Object.keys(ENTRY_NAMES).filter((entry) => groups.has(entry)).map((entry) => [entry, groups.get(entry)!])
}
