// The permissions of Tauri 2 the entry's calls need, for the app's capability file (`src-tauri/capabilities/*.json`).
// The plain skeleton of an app grants `core:default`: it holds what only reads (whether the window is maximized, the
// double press that maximizes from the bar) and listening to events, but not the calls that change the window. The
// identifiers are those of Tauri's core permissions (https://v2.tauri.app/reference/acl/core-permissions/); a
// permission already in `core:default` is listed too, for a capability that does not grant it.
// A command of the app's own (Snap Layouts, a window theme through a command) needs no core permission: Tauri allows
// the app's commands to all its windows, unless the app narrows them with `AppManifest::commands` in its `build.rs`.

/** The permissions the entry needs: what the basics need, and what each opt-in adds to them. */
export const TAURI_PERMISSIONS = {
  /** `DRAG_REGION`, `useWindowControls` and `useZoom`. */
  basics: [
    'core:window:allow-start-dragging',
    'core:window:allow-internal-toggle-maximize',
    'core:window:allow-minimize',
    'core:window:allow-toggle-maximize',
    'core:window:allow-close',
    'core:window:allow-is-maximized',
    'core:event:allow-listen',
    'core:event:allow-unlisten',
    'core:webview:allow-set-webview-zoom',
  ],
  /** `useSnapLayouts`: nothing more of the core (it listens as the basics do); the app's own command and event. */
  snapLayouts: [],
  /** `useWindowTheme` through the window's `setTheme`; with a command of the app's own, nothing. */
  windowTheme: ['core:window:allow-set-theme'],
} as const satisfies Record<string, readonly `core:${string}`[]>
