/** @type {import('tailwindcss').Config} */
export default {
  // The stars-page UI is injected into a shadow root so GitHub's CSS won't clash.
  // Tailwind needs to scan our own source files; the repo-chip is also shadow-scoped.
  content: ['./src/**/*.{ts,tsx,html}'],
  // Do not use Tailwind's `preflight` (reset): it would reset GitHub's page when
  // injected into the light DOM. Our UIs live in shadow roots with their own resets.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // GitHub-like palette so the injected UI feels native
        gh: {
          canvas: '#0d1117',
          subtle: '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
          accent: '#2f81f7',
          success: '#3fb950',
          danger: '#f85149',
        },
      },
    },
  },
  plugins: [],
};
