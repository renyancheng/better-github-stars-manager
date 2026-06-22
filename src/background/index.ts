import { authStore } from '@/auth/auth-store';
import { githubStarSource } from '@/api/github-star-source';
import { idbTagStore } from '@/storage/idb-tag-store';
import { db } from '@/storage/db';
import { queryStars, invalidateCache, type QueryParams, type QueryResult } from './query';
import { suggestTags } from '@/ui/suggest';
import type { SyncProgress } from '@/types';

/**
 * Background service worker — the sync orchestrator AND the sole owner of the
 * IndexedDB (extension origin). Content scripts/popup/options talk to it via
 * messages; they never touch IDB directly (content scripts would hit the page's
 * origin IDB instead — a different database).
 *
 * Q5 A2: incremental sync is triggered when the stars-page UI mounts. No alarms.
 */

type Req =
  | { type: 'syncIncremental' }
  | { type: 'syncFull' }
  | { type: 'syncRescan' }
  | { type: 'refreshTags' }
  | { type: 'gistPush' }
  | { type: 'gistPull' }
  | { type: 'getStatus' }
  | { type: 'getUsername' }
  | { type: 'query'; params: QueryParams }
  | { type: 'setTags'; full_name: string; tags: string[] }
  | { type: 'setNotes'; full_name: string; notes: string }
  | { type: 'acceptSuggestions'; full_name: string; toAdd: string[] }
  | { type: 'acceptSuggestionsBatch'; items: { full_name: string; toAdd: string[] }[] }
  | { type: 'suggestTags'; full_name: string }
  | { type: 'getTag'; full_name: string }
  | { type: 'testConnection' };

type Res =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

let inFlight: Promise<unknown> | null = null;
let lastProgress: SyncProgress = { phase: 'idle', done: 0, total: null, message: '' };

function setProgress(p: SyncProgress) {
  lastProgress = p;
  chrome.runtime.sendMessage({ type: 'progress', progress: p }).catch(() => {});
}

function broadcastDataChanged() {
  invalidateCache();
  chrome.runtime.sendMessage({ type: 'dataChanged' }).catch(() => {});
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight) await inFlight.catch(() => {});
  const p = fn();
  inFlight = p;
  try {
    return await p;
  } finally {
    if (inFlight === p) inFlight = null;
  }
}

/**
 * Auto-tag every star from its language + topics. Pure-local: no API calls —
 * it only reads star.language/star.topics (already in IDB from sync) and writes
 * the tags store. Idempotent (suggestTags dedupes against existing tags, and we
 * only write when the merged set actually grew). Preserves notes (setTags
 * spreads existing). This runs automatically after every sync so tags are
 * always populated without a manual button press; the button is a manual refresh.
 */
async function autoTagAll(): Promise<{ tagged: number }> {
  const stars = await db.stars.toArray();
  let tagged = 0;
  for (const star of stars) {
    const existing = (await idbTagStore.get(star.full_name))?.tags ?? [];
    const toAdd = suggestTags(star, existing);
    if (toAdd.length === 0) continue;
    const merged = Array.from(new Set([...existing, ...toAdd]));
    if (merged.length !== existing.length) {
      await idbTagStore.setTags(star.full_name, merged);
      tagged++;
    }
  }
  return { tagged };
}

async function handle(req: Req): Promise<Res> {
  try {
    switch (req.type) {
      case 'syncIncremental': {
        if (!(await authStore.hasToken())) return { ok: false, error: 'No token configured' };
        const r = await run(() => githubStarSource.syncIncremental());
        const t = await autoTagAll();
        broadcastDataChanged();
        setProgress({ phase: 'idle', done: 0, total: null, message: `+${r.added} new · ${t.tagged} auto-tagged` });
        return { ok: true, data: { ...r, autoTagged: t.tagged } };
      }
      case 'syncFull': {
        if (!(await authStore.hasToken())) return { ok: false, error: 'No token configured' };
        const r = await run(() => githubStarSource.syncFull((p) => setProgress(p)));
        const t = await autoTagAll();
        broadcastDataChanged();
        setProgress({ phase: 'idle', done: 0, total: null, message: `Full sync done · ${t.tagged} auto-tagged` });
        return { ok: true, data: { ...r, autoTagged: t.tagged } };
      }
      case 'syncRescan': {
        if (!(await authStore.hasToken())) return { ok: false, error: 'No token configured' };
        const r = await run(() => githubStarSource.syncRescan((p) => setProgress(p)));
        const t = await autoTagAll();
        broadcastDataChanged();
        setProgress({ phase: 'idle', done: 0, total: null, message: `Rescan done · ${t.tagged} auto-tagged` });
        return { ok: true, data: { ...r, autoTagged: t.tagged } };
      }
      case 'refreshTags': {
        const t = await autoTagAll();
        broadcastDataChanged();
        setProgress({ phase: 'idle', done: 0, total: null, message: `Refreshed · ${t.tagged} tagged` });
        return { ok: true, data: t };
      }
      case 'gistPush':
        return { ok: true, data: await idbTagStore.syncPush() };
      case 'gistPull': {
        const r = await idbTagStore.syncPull();
        broadcastDataChanged();
        return { ok: true, data: r };
      }
      case 'getStatus':
        return { ok: true, data: { progress: lastProgress, hasToken: await authStore.hasToken() } };
      case 'getUsername':
        return { ok: true, data: { username: await authStore.getUsername() } };
      case 'query':
        return { ok: true, data: await queryStars(req.params) as QueryResult };
      case 'setTags':
        await idbTagStore.setTags(req.full_name, req.tags);
        broadcastDataChanged();
        return { ok: true };
      case 'setNotes':
        await idbTagStore.setNotes(req.full_name, req.notes);
        broadcastDataChanged();
        return { ok: true };
      case 'acceptSuggestions': {
        const existing = (await idbTagStore.get(req.full_name))?.tags ?? [];
        const merged = Array.from(new Set([...existing, ...req.toAdd]));
        await idbTagStore.setTags(req.full_name, merged);
        broadcastDataChanged();
        return { ok: true, data: { tags: merged } };
      }
      case 'suggestTags': {
        return { ok: true };
      }
      case 'testConnection': {
        // Diagnostic: fetch one page of /user/starred and return the raw HTTP
        // status + key headers, so the UI can show EXACTLY what GitHub returned
        // (instead of a stuck spinner). Never throws — returns ok:false with detail.
        const token = await authStore.getToken();
        if (!token) return { ok: false, error: 'No token configured' };
        try {
          const res = await fetch('https://api.github.com/user/starred?per_page=1&page=1', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.star+json' },
            cache: 'no-store',
          });
          const body = res.status === 200 ? await res.json() : null;
          return {
            ok: true,
            data: {
              status: res.status,
              statusText: res.statusText,
              remaining: res.headers.get('x-ratelimit-remaining'),
              limit: res.headers.get('x-ratelimit-limit'),
              scopes: res.headers.get('x-oauth-scopes'),
              itemCount: Array.isArray(body) ? body.length : 0,
              sample: Array.isArray(body) && body[0] ? body[0].full_name : null,
            },
          };
        } catch (e) {
          return { ok: false, error: `fetch failed: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
      case 'getTag': {
        return { ok: true, data: { tag: (await idbTagStore.get(req.full_name)) ?? null } };
      }
      case 'acceptSuggestionsBatch': {
        let n = 0;
        for (const item of req.items) {
          if (item.toAdd.length === 0) continue;
          const existing = (await idbTagStore.get(item.full_name))?.tags ?? [];
          const merged = Array.from(new Set([...existing, ...item.toAdd]));
          if (merged.length !== existing.length) {
            await idbTagStore.setTags(item.full_name, merged);
            n++;
          }
        }
        broadcastDataChanged();
        return { ok: true, data: { count: n } };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Reset progress to idle on failure so the UI doesn't stay stuck on
    // "Fetching N pages…" when a sync throws (e.g. bad token, network).
    setProgress({ phase: 'idle', done: 0, total: null, message: `✗ ${msg}` });
    return { ok: false, error: msg };
  }
}

chrome.runtime.onMessage.addListener((req: Req, _sender, sendResponse) => {
  handle(req).then(sendResponse);
  return true; // async response
});

chrome.runtime.onInstalled.addListener(() => {
  setProgress({ phase: 'idle', done: 0, total: null, message: '' });
});

/**
 * Startup self-check: runs whenever the service worker wakes. Prints a single
 * diagnostic line to the SW console so the user (opening "Inspect views:
 * service worker") immediately sees token presence, GitHub HTTP status, and the
 * live row count in the DB — without clicking anything. Throttled to once per
 * 30s to avoid spamming on frequent SW wakeups.
 */
let lastSelfCheck = 0;
async function selfCheck() {
  const now = Date.now();
  if (now - lastSelfCheck < 30_000) return;
  lastSelfCheck = now;
  const hasToken = await authStore.hasToken();
  const starCount = await db.stars.count();
  if (!hasToken) {
    console.log('[GSM] no token configured | DB stars:', starCount, '| → open Options to add a PAT');
    return;
  }
  try {
    const token = await authStore.getToken();
    const res = await fetch('https://api.github.com/user/starred?per_page=1&page=1', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.star+json' },
      cache: 'no-store',
    });
    const body = res.status === 200 ? await res.json() : null;
    const sample = Array.isArray(body) && body[0]?.repo?.full_name ? body[0].repo.full_name : null;
    console.log(
      `[GSM] connection: HTTP ${res.status} | rate ${res.headers.get('x-ratelimit-remaining')}/${res.headers.get('x-ratelimit-limit')} | DB stars: ${starCount} | sample: ${sample ?? '—'}`,
    );
  } catch (e) {
    console.log('[GSM] self-check fetch failed:', e instanceof Error ? e.message : String(e), '| DB stars:', starCount);
  }
}
selfCheck();

