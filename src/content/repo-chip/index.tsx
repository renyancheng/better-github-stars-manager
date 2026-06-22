import type { Tag } from '@/types';
import { bgCall } from '@/utils/messaging';

/**
 * repo-chip content script (Task #8, decision D4).
 *
 * Injects a tag chip next to the repo title on github.com/{owner}/{repo}.
 * Anchors (verified during grill, in order of stability):
 *   1. strong[itemprop="name"] a[data-pjax]  — schema.org microdata (most stable)
 *   2. h1.sr-only whose text is "owner/repo" — semantic fallback
 *   3. [data-pjax="#repo-content-pjax-container"] — structural fallback
 *
 * The title area is OUTSIDE the Turbo/PJAX swap frame, so we DON'T need a
 * MutationObserver; turbo:load / popstate are enough for re-injection.
 *
 * D4 interactions on the chip:
 *   - label text = tags (read-only display)
 *   - click a tag label → open the stars management page filtered by that tag
 *   - ✎ button → inline edit (add/remove tags) writing to idbTagStore live
 */

const injected = new Map<string, HTMLElement>(); // url → host element, for idempotency

function parseRepoFromUrl(): { owner: string; repo: string } | null {
  const m = location.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\/|$)/);
  if (!m) return null;
  const [, owner, repo] = m;
  // Exclude non-repo top-level paths.
  const exclude = new Set(['settings', 'orgs', 'users', 'search', 'explore', 'notifications', 'login', 'signup', 'stars', 'dashboard', 'marketplace', 'pulls', 'issues', 'trending', 'collections', 'topics', 'events', 'sponsors', 'about', 'features', 'security', 'customer-stories', 'readme', 'enterprise', 'team', 'pricing', 'site', 'resources', 'apps', 'developer', 'copilot', 'freecoursecenter', 'forks', 'network', 'graphs']);
  if (exclude.has(owner)) return null;
  if (repo.includes('.')) return null; // e.g. /about.html — not a repo
  return { owner, repo };
}

function findAnchor(): { host: HTMLElement; full_name: string } | null {
  // 1. microdata anchor
  const nameA = document.querySelector<HTMLElement>('strong[itemprop="name"] a[data-pjax]');
  if (nameA) {
    const strong = nameA.closest('strong') ?? nameA.parentElement;
    if (strong) {
      // Derive owner/repo from the breadcrumb author + repo link.
      const authorA = document.querySelector<HTMLElement>('span[itemprop="author"] a');
      const owner = authorA?.textContent?.trim();
      const repo = nameA.textContent?.trim();
      if (owner && repo) return { host: strong, full_name: `${owner}/${repo}` };
    }
  }
  // 2. sr-only h1 fallback ("owner/repo")
  const h1 = document.querySelector<HTMLElement>('h1.sr-only');
  if (h1) {
    const text = h1.textContent?.trim() ?? '';
    if (text.includes('/')) return { host: h1, full_name: text };
  }
  return null;
}

function buildChip(full_name: string, tag: Tag | undefined): { el: HTMLElement; rerender: () => void } {
  const host = document.createElement('span');
  host.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-left:8px;vertical-align:middle;';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .chip { display:inline-flex; align-items:center; gap:2px; font:12px/1.4 -apple-system,system-ui,sans-serif; }
    .tag { display:inline-block; padding:1px 7px; border-radius:10px; background:#1f6feb33; color:#79c0ff; cursor:pointer; border:1px solid #1f6feb55; }
    .tag:hover { background:#1f6feb55; }
    .none { color:#8b949e; font-style:italic; font-size:11px; }
    .edit { cursor:pointer; color:#8b949e; border:1px solid #30363d; border-radius:4px; padding:0 4px; font-size:11px; }
    .edit:hover { color:#c9d1d9; border-color:#8b949e; }
    .editor { display:flex; gap:4px; align-items:center; }
    .editor input { font:12px monospace; padding:2px 6px; background:#0d1117; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; width:180px; }
    .editor button { font:11px system-ui; padding:2px 6px; background:#238636; color:#fff; border:0; border-radius:4px; cursor:pointer; }
  `;
  root.appendChild(style);
  const box = document.createElement('div');
  root.appendChild(box);

  let editing = false;
  let draft = (tag?.tags ?? []).join(', ');

  function render() {
    box.innerHTML = '';
    const wrap = document.createElement('span');
    wrap.className = 'chip';
    if (editing) {
      const editor = document.createElement('span');
      editor.className = 'editor';
      const input = document.createElement('input');
      input.value = draft;
      input.placeholder = 'tag1, tag2';
      input.oninput = () => (draft = input.value);
      const save = document.createElement('button');
      save.textContent = '✓';
      save.onclick = async () => {
        const tags = draft.split(',').map((t) => t.trim()).filter(Boolean);
        await bgCall('setTags', { full_name, tags });
        editing = false;
        const got = await bgCall<{ tag: Tag | null }>('getTag', { full_name });
        tag = got.tag ?? { full_name, tags, notes: '', mtime: new Date().toISOString() };
        render();
      };
      editor.appendChild(input);
      editor.appendChild(save);
      wrap.appendChild(editor);
    } else {
      const tags = tag?.tags ?? [];
      if (tags.length === 0) {
        const none = document.createElement('span');
        none.className = 'none';
        none.textContent = 'untagged';
        wrap.appendChild(none);
      } else {
        for (const t of tags) {
          const c = document.createElement('span');
          c.className = 'tag';
          c.textContent = t;
          c.title = `Filter stars by "${t}"`;
          c.onclick = async () => {
            // D4 click → open management page filtered by this tag.
            const u = await bgCall<{ username: string | null }>('getUsername');
            const url = u.username
              ? `https://github.com/${u.username}?tab=stars#gsm-tag=${encodeURIComponent(t)}`
              : `https://github.com/stars#gsm-tag=${encodeURIComponent(t)}`;
            window.open(url, '_blank');
          };
          wrap.appendChild(c);
        }
      }
      const edit = document.createElement('span');
      edit.className = 'edit';
      edit.textContent = '✎';
      edit.title = 'Edit tags';
      edit.onclick = () => {
        editing = true;
        draft = (tag?.tags ?? []).join(', ');
        render();
      };
      wrap.appendChild(edit);
    }
    box.appendChild(wrap);
  }

  return { el: host, rerender: render };
}

async function inject() {
  const repo = parseRepoFromUrl();
  if (!repo) return cleanup();
  const anchor = findAnchor();
  if (!anchor) return; // not a repo page (yet)

  const url = location.href;
  // Idempotent: if we already injected for this URL, skip.
  if (injected.has(url)) return;

  const got = await bgCall<{ tag: Tag | null }>('getTag', { full_name: anchor.full_name });
  const { el } = buildChip(anchor.full_name, got.tag ?? undefined);
  anchor.host.insertAdjacentElement('afterend', el);
  injected.set(url, el);
}

function cleanup() {
  // Remove chips when navigating away from repo pages.
  for (const [url, el] of injected) {
    if (!location.pathname.match(/^\/[^/]+\/[^/]+/)) {
      el.remove();
      injected.delete(url);
    }
  }
}

// Initial + Turbo/PJAX re-injection. No MutationObserver (title area is outside
// the swap frame, per grill findings).
inject();
document.addEventListener('turbo:load', inject);
document.addEventListener('turbo:render', inject);
window.addEventListener('popstate', inject);

