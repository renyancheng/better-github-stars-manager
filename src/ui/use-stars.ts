import { useEffect, useState } from 'react';
import { useFilterStore } from './filter-store';
import type { Star, Tag } from '@/types';
import type { QueryResult } from '@/background/query';

/**
 * Query stars from the background service worker (which owns the extension-origin
 * IndexedDB). Content scripts cannot share that IDB, so we never touch db directly.
 *
 * MVP strategy: request the entire filtered result set in one message (9900 rows
 * × ~400B ≈ 4MB, structuredClone in tens of ms — acceptable for a personal tool).
 * Re-requests on any filter change or on a `dataChanged` broadcast.
 */
export function useStars() {
  const f = useFilterStore();
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);

  const filter = {
    query: f.query,
    languages: f.languages,
    tags: f.tags,
    tagMode: f.tagMode,
    showTombstone: f.showTombstone,
    onlyUntagged: f.onlyUntagged,
    sortKey: f.sortKey,
    sortDir: f.sortDir,
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chrome.runtime
      .sendMessage({ type: 'query', params: { filter, offset: 0, limit: Number.MAX_SAFE_INTEGER } })
      .then((res: { ok: boolean; data?: QueryResult; error?: string }) => {
        if (cancelled) return;
        if (res?.ok && res.data) setResult(res.data);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  // Live refresh when background signals data changed (sync/write).
  useEffect(() => {
    const listener = (msg: { type?: string }) => {
      if (msg.type === 'dataChanged') {
        chrome.runtime
          .sendMessage({ type: 'query', params: { filter, offset: 0, limit: Number.MAX_SAFE_INTEGER } })
          .then((res: { ok: boolean; data?: QueryResult }) => {
            if (res?.ok && res.data) setResult(res.data);
          })
          .catch(() => {});
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  const rows: Star[] = result?.rows ?? [];
  const tagsByFullName = new Map<string, Tag>();
  if (result?.tagsForRows) {
    for (const [name, tag] of Object.entries(result.tagsForRows)) {
      if (tag) tagsByFullName.set(name, tag);
    }
  }

  // Group tagTree by dimension for the sidebar.
  const tagTreeGrouped = new Map<string | null, { name: string; count: number }[]>();
  for (const t of result?.tagTree ?? []) {
    const dim = t.dim;
    if (!tagTreeGrouped.has(dim)) tagTreeGrouped.set(dim, []);
    tagTreeGrouped.get(dim)!.push({ name: t.name, count: t.count });
  }

  return {
    rows,
    total: result?.total ?? 0,
    grandTotal: result?.grandTotal ?? 0,
    loading,
    languages: result?.languages ?? [],
    tagTree: { grouped: tagTreeGrouped, total: result?.tagTotal ?? 0 },
    tagsByFullName,
  };
}
