// @acaprino/sigrid/layout, the frame of an app and its regions: `AppShell` with its two forms, the title bar, the
// toolbar, the sidebar and its rows, the inspector, a panel, the split of a list and its detail. It stands on the
// primitives and the components; the parts a region is laid out with inside (`Column`, `Cluster`, `Text`…) are
// primitives.
export { APP_SHELL_STEPS, AppShell, AppShellContext, Inspector, appShellLayout, useAppShell, type AppShellLayout, type AppShellProps, type AppShellSteps, type InspectorProps } from './layout/app-shell'
export { ContentSplit, type ContentSplitProps } from './layout/content-split'
export { DocumentTab, DocumentTabs, type DocumentTabProps, type DocumentTabsProps } from './layout/document-tabs'
export { DrawerButton, type DrawerButtonProps } from './layout/drawer-button'
export { SheetPile, type SheetPileItem, type SheetPileProps } from './layout/sheet-pile'
export { NavItem, NavList, type NavItemProps, type NavListProps } from './layout/nav-list'
export { Panel, type PanelProps } from './layout/panel'
export { Sidebar, SidebarGroup, type SidebarGroupProps, type SidebarProps } from './layout/sidebar'
export { SidebarRow, type SidebarRowProps } from './layout/sidebar-row'
export { TitleBar, TitleBarDragContext, TitleBarSizeContext, WindowControls, type TitleBarDragProps, type TitleBarProps, type WindowControlsProps } from './layout/title-bar'
export { SplitPane, type SplitPaneProps } from './layout/split-pane'
export { Toolbar, ToolbarBrand, brandInitial, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTab, ToolbarTabs, ToolbarTitle, type ToolbarBrandProps, type ToolbarButtonProps, type ToolbarGroupProps, type ToolbarProps, type ToolbarSearchProps, type ToolbarTabProps, type ToolbarTabsProps } from './layout/toolbar'
