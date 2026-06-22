import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStars } from '@/ui/use-stars';
import { useFilterStore } from '@/ui/filter-store';
import { StarRow } from '@/ui/components/StarRow';
import { Toolbar } from '@/ui/components/Toolbar';
import { FilterSidebar } from '@/ui/components/FilterSidebar';
import { ActiveFilterChips } from '@/ui/components/ActiveFilterChips';
import { RepoDetailPanel } from '@/ui/components/RepoDetailPanel';
import { PortalProvider } from '@/ui/shadcn/portal-context';
import { useTheme } from '@/ui/hooks/use-theme';
import { bgCall, onProgress, type SyncStatus } from '@/utils/messaging';
import { cn } from '@/lib/utils';

const ROW_HEIGHT = 64; // fixed; matches StarRow h-16 + virtualizer estimate
// grid columns shared by the sticky header and each row — keep in sync with StarRow.
const GRID_COLS = 'grid-cols-[minmax(180px,1.4fr)_2fr_80px_64px_84px_1.6fr_20px]';

export function ManagerPanel() {
  const { rows, total, grandTotal, loading, languages, tagTree, tagsByFullName } = useStars();
  const f = useFilterStore();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme, themeClass, toggle: toggleTheme } = useTheme();

  // Read initial tag filter from URL hash (D4 chip click → #gsm-tag=xxx).
  useEffect(() => {
    const m = location.hash.match(/gsm-tag=([^&]+)/);
    if (m) {
      f.toggleTag(decodeURIComponent(m[1]));
      history.replaceState(null, '', location.pathname + location.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount: read status, auto-sync if token present (full vs incremental by DB count).
  useEffect(() => {
    let off = () => {};
    (async () => {
      const st = await bgCall<SyncStatus>('getStatus').catch(() => null);
      setStatus(st);
      if (st?.hasToken) {
        const q = await bgCall<{ grandTotal: number }>('query', {
          params: { filter: emptyFilter(), offset: 0, limit: 1 },
        }).catch(() => null);
        const syncType = q && q.grandTotal > 0 ? 'syncIncremental' : 'syncFull';
        bgCall(syncType).catch(
          (e) => setInfo(`✗ ${syncType}: ${e instanceof Error ? e.message : String(e)}`),
        );
      }
      off = onProgress(() => bgCall<SyncStatus>('getStatus').then(setStatus));
    })();
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard: / focuses search. (Detail-panel nav keys are handled inside it.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const doSync = async (type: string, label: string) => {
    setBusy(true);
    setInfo(null);
    try {
      const r = await bgCall<Record<string, number>>(type);
      setInfo(`${label}: ${JSON.stringify(r)}`);
    } catch (e) {
      setInfo(`✗ ${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const refreshTags = async () => {
    setBusy(true);
    setInfo(null);
    try {
      const r = await bgCall<{ tagged: number }>('refreshTags');
      setInfo(`已刷新:${r.tagged} 个仓库按 language/topics 更新了标签`);
    } catch (e) {
      setInfo(`✗ refresh tags: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const selectedIdx = useMemo(
    () => (selected ? rows.findIndex((r) => r.full_name === selected) : -1),
    [selected, rows],
  );
  const selectedStar = selectedIdx >= 0 ? rows[selectedIdx] : null;
  const selectedTag = selectedStar ? tagsByFullName.get(selectedStar.full_name) : undefined;

  const handleSelect = (full_name: string) => {
    setSelected((cur) => (cur === full_name ? null : full_name));
  };

  // Whether any filter is active — drives the animated filter-chips row.
  const hasActiveFilter =
    f.languages.length > 0 || f.tags.length > 0 || f.onlyUntagged || f.showTombstone;

  return (
    <PortalProvider containerRef={rootRef}>
      <div
        ref={rootRef}
        className={cn('flex h-full flex-col bg-background text-foreground font-sans', themeClass)}
      >
        <Toolbar
          f={f}
          status={status}
          loading={loading}
          total={total}
          grandTotal={grandTotal}
          busy={busy}
          onSync={doSync}
          onRefreshTags={refreshTags}
          onToggleTheme={toggleTheme}
          theme={theme}
          searchRef={searchRef}
        />

        {status && !status.hasToken && (
          <div className="flex items-center gap-3 bg-warning/10 px-3 py-2 text-xs text-warning">
            <span>⚠️ 未配置 GitHub token — 无法加载数据。</span>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="rounded bg-primary px-2.5 py-0.5 text-primary-foreground"
            >
              打开选项页添加 PAT
            </button>
          </div>
        )}

        {/* Animated active-filter row: grows/shrinks via grid-template-rows. */}
        <div className={cn('filter-row-anim border-b border-border', !hasActiveFilter && 'collapsed')}>
          <ActiveFilterChips f={f} count={total} />
        </div>

        {info && (
          <div className="border-b border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">{info}</div>
        )}

        <div className="flex min-h-0 flex-1">
          <FilterSidebar f={f} languages={languages} tagTree={tagTree} />

          {/* Virtual list */}
          <div ref={listRef} className="no-scrollbar flex-1 overflow-auto">
            <div
              className={cn(
                'sticky top-0 z-10 grid gap-2 border-b border-border bg-background px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground',
                GRID_COLS,
              )}
            >
              <span>Repository</span>
              <span>Description</span>
              <span>Lang</span>
              <span className="text-right">Stars</span>
              <span>Updated</span>
              <span>Tags</span>
              <span />
            </div>
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {loading ? '加载中…' : '无结果。调整筛选,或点击工具栏 ↻ Sync。'}
              </div>
            ) : (
              <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((vi) => {
                  const star = rows[vi.index];
                  return (
                    <div
                      key={star.full_name}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: ROW_HEIGHT, transform: `translateY(${vi.start}px)` }}
                    >
                      <StarRow
                        star={star}
                        tag={tagsByFullName.get(star.full_name)}
                        selectedTags={f.tags}
                        onToggleTag={f.toggleTag}
                        selected={selected === star.full_name}
                        onSelect={handleSelect}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right detail drawer — always mounted so exit animation can play.
              Width animates 0→340px; inner content renders only when a repo is
              selected (so the panel isn't doing work while collapsed). */}
          <div className={cn('drawer-anim border-l border-border', selectedStar ? 'drawer-enter' : 'drawer-exit')}>
            {selectedStar && (
              <RepoDetailPanel
                star={selectedStar}
                tag={selectedTag}
                selectedTags={f.tags}
                onToggleTag={f.toggleTag}
                onClose={() => setSelected(null)}
                onPrev={() => selectedIdx > 0 && setSelected(rows[selectedIdx - 1].full_name)}
                onNext={() => selectedIdx >= 0 && selectedIdx < rows.length - 1 && setSelected(rows[selectedIdx + 1].full_name)}
                hasPrev={selectedIdx > 0}
                hasNext={selectedIdx >= 0 && selectedIdx < rows.length - 1}
              />
            )}
          </div>
        </div>
      </div>
    </PortalProvider>
  );
}

function emptyFilter() {
  return {
    query: '',
    languages: [],
    tags: [],
    tagMode: 'any' as const,
    showTombstone: false,
    onlyUntagged: false,
    sortKey: 'starred_at' as const,
    sortDir: 'desc' as const,
  };
}
