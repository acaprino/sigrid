// Where the app runs. A page in a Tauri window finds `__TAURI_INTERNALS__`; a page in a browser does not.
export const NATIVE = '__TAURI_INTERNALS__' in window
const MOBILE = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
/** A window of its own on a computer, with its decorations off: the app draws the window's bar and its three buttons. */
export const OWN_WINDOW = NATIVE && !MOBILE

const current = async () => (await import('@tauri-apps/api/window')).getCurrentWindow()
export const minimizeWindow = () => void current().then((window) => window.minimize())
export const toggleMaximizeWindow = () => void current().then((window) => window.toggleMaximize())
export const closeWindow = () => void current().then((window) => window.close())
