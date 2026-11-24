// The run page of the app editor: the app being edited, running by itself in a document of its own. It reads the app
// from where the editor keeps it in this browser and follows every change made there, so it is the app as exported,
// before exporting. The editor shows it in a frame as wide as the device chosen; opened in a tab, or on a phone, it is
// the app at the size of that window. `?host=native` draws it as a Tauri window on a computer (its own bar and the
// window's buttons); `?touch=1` gives it the sizes of a finger where the pointer is a mouse; `?screen=` is where it starts.
import './run.css'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider, applyDensity } from '../src/index'
import { Button } from '../src/primitives'
import { Empty } from '../src/components'
import { applyLook } from './editor/look'
import { STORE_KEY, loadApp } from './editor/model'
import { RunApp } from './editor/render'
import { touchDensity } from './phone'

const params = new URLSearchParams(location.search)
const host = params.get('host') === 'native' ? 'native' : 'web'
const touch = params.get('touch') === '1'

function Run() {
  const [app, setApp] = React.useState(loadApp)
  React.useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORE_KEY || event.key === null) setApp(loadApp())
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  React.useLayoutEffect(() => {
    if (!app) return
    applyLook(document.documentElement, app.look)
    if (touch) applyDensity(document.documentElement, touchDensity(app.look.density))
  }, [app])
  if (!app) {
    return (
      <Empty
        className="h-dvh p-6"
        title="No app yet"
        description="The editor keeps the app it is working on in this browser. Open it and start one."
        action={
          <Button asChild>
            <a href="builder.html">Open the editor</a>
          </Button>
        }
      />
    )
  }
  return (
    <MotionProvider animated={app.look.animated}>
      <div className="h-dvh bg-paper text-ink">
        {/* The editor around this page, if there is one, is told where the user went: it shows the same screen. */}
        <RunApp app={app} host={host} screen={params.get('screen') ?? undefined} onScreen={(id) => window.parent !== window && window.parent.postMessage({ type: 'sigrid-run-screen', id }, location.origin)} />
      </div>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Run />)
