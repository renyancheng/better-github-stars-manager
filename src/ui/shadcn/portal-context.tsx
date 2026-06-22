import { createContext, useContext, type ReactNode, type RefObject } from 'react';

/**
 * Portal target for Radix primitives inside the stars-page shadow root.
 *
 * Radix Popover/Dialog/Select default to portaling into document.body — which
 * is OUTSIDE our shadow root, so they'd lose the Tailwind theme CSS and leak
 * onto github.com. Components that render portals consume this context and pass
 * `container={portalRef.current}` so the portal lands inside the shadow.
 *
 * ManagerPanel provides the ref (its own root, which lives in the shadow).
 */
const PortalContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function PortalProvider({
  containerRef,
  children,
}: {
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return <PortalContext.Provider value={containerRef}>{children}</PortalContext.Provider>;
}

export function usePortalContainer(): HTMLElement | undefined {
  const ctx = useContext(PortalContext);
  return ctx?.current ?? undefined;
}
