import { createRoot } from 'react-dom/client';

/**
 * Mount a React app into a host element, creating a Shadow DOM root so our
 * Tailwind styles don't clash with GitHub's page (when injected into the page)
 * and GitHub's styles don't leak into ours.
 *
 * For popup/options (our own HTML pages), we still shadow-mount for consistency,
 * and inject the Tailwind stylesheet into the shadow root via a <link> to the
 * built CSS. On content-script pages we use a constructed stylesheet.
 */
export function mountApp(App: React.FC, host: HTMLElement, cssText?: string) {
  const shadow = host.attachShadow({ mode: 'open' });
  if (cssText) {
    const style = document.createElement('style');
    style.textContent = cssText;
    shadow.appendChild(style);
  }
  const root = document.createElement('div');
  shadow.appendChild(root);
  createRoot(root).render(<App />);
  return { shadow, root };
}
