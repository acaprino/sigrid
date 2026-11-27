// Mounts overlay content into the active portal container (`PortalContainerProvider`), or `document.body`.
import * as React from 'react'
import { Portal } from '@ark-ui/react/portal'
import { usePortalContainer } from './portal-container'

export function OverlayPortal({ children, container: given }: { children: React.ReactNode; container?: HTMLElement | null | undefined }) {
  const fromContext = usePortalContainer()
  const target = given ?? fromContext ?? null
  // Ark's `Portal` re-reads `container.current` when the ref object changes.
  const ref = React.useMemo(() => (target ? { current: target } : undefined), [target])
  return <Portal container={ref}>{children}</Portal>
}
