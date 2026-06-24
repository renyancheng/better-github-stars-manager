/**
 * Pure decision function for the stars-page content script.
 *
 * Lives in its own module (no React / `?inline` CSS / DOM imports) so the test
 * suite can import it without pulling the content-script bundle — which would
 * otherwise drag in React and the inline CSS string and dirty the test
 * environment. The content script imports this and feeds it the live inputs
 * (`isStarsPage()` + the in-memory panel-visibility flag, see panel-toggle.ts).
 */

export type MountState = 'panel' | 'fab' | 'none';

/**
 * Decide what the stars-page content script should show.
 *   - `panel`: on the stars page AND the panel is enabled → mount ManagerPanel.
 *   - `fab`:   on the stars page AND the panel is disabled → show the floating
 *     "show panel" button so the user can re-mount it (the native list is the
 *     actual page content under the overlay, so disabling just retracts the
 *     overlay; a re-mount entry point must remain).
 *   - `none`:  not on the stars page → retract everything.
 */
export function mountState(isStars: boolean, enabled: boolean): MountState {
  if (!isStars) return 'none';
  return enabled ? 'panel' : 'fab';
}
