// The `./tauri` entry of the package: the toolkit's window parts wired to a Tauri window, from the page's side. It is
// apart from the toolkit's source (`src/` knows nothing of a shell) and from its main entry: an app that runs only in a
// browser never imports it. `@tauri-apps/api` is an optional peer, imported only inside the functions, the first time
// one acts: a page in a browser that imports this entry calls and loads nothing of Tauri.
// - `readHost()`: in a Tauri window or not, on a phone or a computer, in a window of its own.
// - `DRAG_REGION`: the attribute for `TitleBar dragProps`.
// - `useWindowControls`: the props of `WindowControls` (the three buttons, and whether the window is maximized).
// - `useZoom` and `createZoom`: Ctrl with + - 0 and the wheel, 50% to 200%, kept on the machine.
// - Opt-in, with the names the app's native side uses: `useSnapLayouts` (Windows 11's layouts over the maximize button)
//   and `useWindowTheme` (the scheme the page draws, told to the window).
// - `TAURI_PERMISSIONS`: what to grant in the app's capability file.
// A refused or failed call goes to the `onError` the app gives, never into an unhandled rejection. Each part takes an
// `api` to call instead of Tauri's (a fake window in a test). The native skeleton of an app (its Rust side, its
// config, its capabilities) is not the toolkit's: the tauri-app-builder plugin makes it.
export { tauriApi, type TauriApi, type TauriCall, type TauriErrorHandler, type TauriWebview, type TauriWindow, type Unlisten } from './api'
export { DRAG_REGION, readHost, type TauriHost } from './host'
export { TAURI_PERMISSIONS } from './permissions'
export { useSnapLayouts, type CaptionRect, type SnapLayoutsOptions, type SnapLayoutsWiring } from './snap-layouts'
export { useWindowControls, type WindowControlsOptions, type WindowControlsWiring } from './window-controls'
export { useWindowTheme, type WindowThemeOptions } from './window-theme'
export { clampZoom, createZoom, stepZoom, useZoom, zoomKey, type UseZoomOptions, type ZoomController, type ZoomKey, type ZoomOptions } from './zoom'
