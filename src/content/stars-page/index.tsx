import { createRoot } from 'react-dom/client';
import { ManagerPanel } from '@/ui/ManagerPanel';

/**
 * stars-page content script (Task #7, Q6=B).
 *
 * On github.com/{user}?tab=stars (matched by URL gate below — MV3 match patterns
 * can't target query strings), we inject a full-width management panel that
 * replaces the native paginated card list with a virtualized table of all ~9900
 * stars. A single stable container is the only coupling to GitHub's DOM; the
 * panel's internals are fully self-managed (low reversion risk per the grill).
 */

function isStarsPage(): boolean {
  return new URLSearchParams(location.search).get('tab') === 'stars';
}

function injectPanel(): void {
  if (!isStarsPage()) return;
  if (document.getElementById('gsm-manager-root')) return; // idempotent

  // Find a stable anchor near the page main content. We create our own container
  // and insert it after the page header, hiding the native starred list + pagination.
  const main = document.querySelector('main') ?? document.querySelector('[data-pjax-container]') ?? document.body;
  const host = document.createElement('div');
  host.id = 'gsm-manager-root';
  host.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483000;background:#0d1117;';

  // Hide GitHub's native chrome behind us (we're full-screen overlay).
  main.parentElement?.insertBefore(host, main);

  createRoot(host).render(<ManagerPanel />);
}

// GitHub uses Turbo/PJAX; re-inject on navigation.
injectPanel();
document.addEventListener('turbo:load', injectPanel);
document.addEventListener('turbo:render', injectPanel);
window.addEventListener('popstate', injectPanel);
