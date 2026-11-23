// What scripts/agents.mjs takes from the showcase's app editor: the apps it starts with, each as the source its code
// export writes. A file of its own so the script can bundle the editor's TypeScript and run it.
import { appSource, exportFiles } from '../showcase/editor/codegen'
import { STARTERS } from '../showcase/editor/model'

// The apps only: a layout to start from (no sidebar, little in it) is not an example of a whole app.
export const apps = STARTERS.filter((starter) => starter.kind === 'app').map((starter) => ({ id: starter.id, name: starter.name, about: starter.about, source: appSource(starter.make()) }))

/** The file the exported apps import as `./host`. */
export const host = exportFiles(STARTERS[0]!.make(), { version: '0.0.0' }).find((file) => file.path === 'src/host.ts')?.text ?? ''
