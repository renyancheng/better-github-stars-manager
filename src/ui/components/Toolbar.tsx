import type { FilterState } from '@/ui/filter-store';
import type { SyncStatus } from '@/utils/messaging';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { cn } from '@/lib/utils';

/**
 * Top toolbar, layered:
 *  - Row 1 (main): search / sort / direction / primary sync / theme toggle.
 *  - Row 2 (status): result count, loading, syncing phase, no-token warning.
 * Secondary actions (Refresh tags / Push / Pull) are de-emphasized in a "数据"
 * group on the right, separated by a divider.
 */
export function Toolbar({
  f,
  status,
  loading,
  total,
  grandTotal,
  busy,
  onSync,
  onRefreshTags,
  onToggleTheme,
  theme,
  searchRef,
}: {
  f: FilterState;
  status: SyncStatus | null;
  loading: boolean;
  total: number;
  grandTotal: number;
  busy: boolean;
  onSync: (type: string, label: string) => void;
  onRefreshTags: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const syncing = status?.progress && status.progress.phase !== 'idle';
  const phase = syncing ? status!.progress : null;

  return (
    <div className="border-b border-border bg-card">
      {/* Row 1: main controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Input
          ref={searchRef}
          placeholder="搜索 名称 / 描述 / topics   (按 / 聚焦)"
          value={f.query}
          onChange={(e) => f.setQuery(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <select
          value={f.sortKey}
          onChange={(e) => f.setSort(e.target.value as typeof f.sortKey)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="starred_at">按 star 时间</option>
          <option value="pushed_at">按更新时间</option>
          <option value="stargazers_count">按 star 数</option>
          <option value="name">按名称</option>
        </select>
        <Button variant="outline" size="icon" onClick={() => f.setSort(f.sortKey, f.sortDir === 'asc' ? 'desc' : 'asc')} title="切换排序方向">
          {f.sortDir === 'asc' ? '↑' : '↓'}
        </Button>

        <Button onClick={() => onSync('syncIncremental', 'incremental')} disabled={busy} title="增量同步新 star">
          ↻ Sync
        </Button>
        <Button variant="outline" onClick={() => onSync('syncRescan', 'rescan')} disabled={busy} title="全量重扫,检测已 unstar 的仓库">
          ⟲ Rescan
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={onToggleTheme} title="切换黑白主题">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Secondary actions — de-emphasized "数据" group */}
        <div className="flex items-center gap-1 border-l border-border pl-2">
          <span className="text-[10px] text-muted-foreground">数据</span>
          <Button variant="ghost" size="sm" onClick={onRefreshTags} disabled={busy} title="从所有仓库的 language/topics 重新生成 tag(本地,无请求)">
            ⚡ Tags
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSync('gistPush', 'gist push')} disabled={busy} title="推送标签到 Gist">
            ⬆ Push
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSync('gistPull', 'gist pull')} disabled={busy} title="从 Gist 拉取标签">
            ⬇ Pull
          </Button>
        </div>
      </div>

      {/* Row 2: status */}
      <div className="flex items-center gap-4 border-t border-border/50 px-3 py-1 text-[11px] text-muted-foreground">
        <span className={cn(loading && 'animate-pulse')}>
          {loading ? '… 加载中' : (
            <><span className="text-foreground">{total}</span> shown / <span className="text-foreground">{grandTotal}</span> total</>
          )}
        </span>
        {syncing && phase && (
          <span className="text-primary">
            {phase.phase}: {phase.message}
            {phase.total != null && phase.total > 0 && ` (${phase.done}/${phase.total})`}
          </span>
        )}
        {!status?.hasToken && <span className="text-warning">⚠️ 未配置 token</span>}
      </div>
    </div>
  );
}
