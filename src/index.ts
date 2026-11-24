// @acaprino/sigrid, its main entry: the ground every level stands on, with nothing that draws. The theme engine and
// the colours, the density, the words the parts say by themselves, the switch for motion, and the helpers of
// behaviour (media queries, drops, overlays, Markdown as data). What draws is in the entries of the levels, each on
// the ones before it: `/primitives` (one control), `/components` (primitives put together for one need), `/layout`
// (the frame of an app and its regions) and `/assemblies` (components that do a whole function together); the
// assemblies that rest on a library an app may not need have entries of their own (`/table`, `/virtual`, `/reorder`,
// `/rich-text`, `/graph`). No app concepts anywhere: each app composes its screens on top of this (the example
// applications are in `agents/examples`).
export { SPOT_KINDS, colorTheme, isSpotKind, spotOf, spotSuggestions, type ColorThemePick, type SpotKind } from './color-theme'
export { COLORS, COLOR_NAMES, colorHue, markHueAttrs } from './colors'
export { DEFAULT_DENSITY, DENSITIES, DENSITY_LIMITS, DENSITY_VARIABLES, TOUCH_TARGET, applyDensity, densityById, densityOf, densityVariables, densityWith, isDensityId, type Density, type DensityDef, type DensityId, type DensityOverride } from './density'
export { HUE_NAMES, grayScale, hueColor, hueScale, isHueName, namedTheme, type HueName, type HueScale, type NamedThemePick } from './hues'
export { HARMONIES, accentSuggestions, duoTheme, pageTint, type AccentSuggestion, type DuoPick, type Harmony } from './harmony'
export { APP_HEIGHT_VAR, useAppHeight } from './internal/app-height'
export { guardDesktop, isBrowserKey, useDesktopGuard, type DesktopGuardOptions } from './internal/desktop-guard'
export { MAX_FILE_BYTES, limitLabel, overLimitNotice, payloadFromDataTransfer, useDropTarget, withinLimit, type AttachPayload, type DropPayload, type DropTarget } from './internal/drop'
export { useEdgeAutoScroll } from './internal/edge-scroll'
export { kindIcon, kindLabel, type AttachmentKind, type ItemKind } from './internal/kinds'
export { splitLines } from './internal/lines'
export { hasMarkdown, parseBlocks, parseInline, plainText } from './internal/markdown'
export { COARSE, NARROW, SHORT, useMedia, usePhone } from './internal/media'
export { DEFAULT_MOTION_FEEL, MOTION_EASES, MOTION_EASE_NAMES, MOTION_PACE, MotionProvider, applyMotionFeel, isMotionEase, loadMotion, motionFeel, motionVariables, preloadMotion, useMotion, type MotionEase, type MotionFeel, type MotionImpl } from './internal/motion'
export { BACKDROP, BOTTOM_BAR_ROOM_VAR, SHEET_TOASTS_ROOM, TOASTS_ATTR, TOASTS_LAYER, TOASTS_ROOM_VAR, ignoreToasts, restoreFocus } from './internal/overlay'
export { PortalContainerProvider, usePortalContainer } from './internal/portal-container'
export { TAG_COLOR, TAG_HUES, TAG_PILL, tagColorAttrs, tagHue } from './internal/tag-color'
export { cn } from './lib/utils'
export { PALETTE_COMBOS, palettePick, paletteTheme, type PaletteCombo, type PalettePick } from './palette'
export { DARK_DEPTHS, DARK_TINTS, DEFAULT_DARK_DEPTH, DEFAULT_DARK_TINT, DEFAULT_FONT, DEFAULT_SHAPE, FONTS, SHAPE_RADII, SYSTEM_FONT, THEME_SHAPES, isThemeRadii, isThemeShape, themeDark, type DarkDepth, type DarkTint, type FontDef, type FontId, type PaletteProfile, type SidebarKind, type Surfaces, type ThemeDark, type ThemeDef, type ThemeRadii, type ThemeShape } from './theme-catalog'
export { FIXED, STATUS, contrast, fit, luminance, over, themeTokens, toHex, tokensFor, type Oklch, type ThemeScheme, type ThemeTokens } from './theme-engine'
export { DEFAULT_TONE_INTENSITY, DEFAULT_TONE_LIGHT, OWN_BACKGROUNDS, OWN_SECONDS, OWN_SIDEBARS, OWN_TINTS, TONE_INTENSITIES, TONE_LIGHTS, TONE_PRESETS, isAccentColor, ownTheme, presetTone, themeTone, tonePresetOf, type OwnTheme, type ThemeTone, type TonePreset } from './theme-engine'
export { BASE_THEME, FONT_VARIABLE, THEME_ATTRIBUTES, THEME_VARIABLES, applyFont, applyTheme, copyTheme, fontById, isFontId, themeVariables, toneHasEffect, type ThemePick } from './themes'
export { DEFAULT_WORDS, WordsProvider, useWords, withWords, type CalendarSpan, type Words, type WordsOverride } from './words'
