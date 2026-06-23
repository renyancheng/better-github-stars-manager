import { useEffect, useState } from 'react';
import {
  Sun, Moon, Search, RefreshCw, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Tags, Upload, Download, MoreHorizontal, AlertTriangle,
} from 'lucide-react';
import type { FilterState } from '@/ui/filter-store';
import type { SyncStatus } from '@/utils/messaging';
import { bgCall } from '@/utils/messaging';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Progress } from '@/ui/shadcn/progress';
import { Spinner } from '@/ui/shadcn/spinner';
import { Popover, PopoverTrigger, PopoverContent } from '@/ui/shadcn/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * Top toolbar.
 *  - Row 1 (main): search / sort / direction / primary sync / overflow menu / account chip / theme.
 *  - Row 2 (status): result count, loading, syncing phase + progress, no-token warning.
 *
 * Secondary actions (Refresh tags / Push / Pull) live in an overflow menu (⋯) —
 * the old "数据"/Data group label is gone. The account chip (avatar + @username)
 * anchors the right side; clicking it opens the user's stars page. Account is
 * fetched once on mount (with a one-time backfill for users who verified before
 * avatar capture was added).
 */
type Account = { username: string | null; avatarUrl: string | null; displayName: string | null };

export function Toolbar({
  f,
  status,
  loading,
  total,
  grandTotal,
  busy,
  pendingAction,
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
  pendingAction: string | null;
  onSync: (type: string, label: string) => void;
  onRefreshTags: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const { m } = useI18n();
  const [account, setAccount] = useState<Account | null>(null);
  const syncing = status?.progress && status.progress.phase !== 'idle';
  const phase = syncing ? status!.progress : null;
  const actionBusy = busy || syncing || pendingAction !== null;
  const progressValue = phase && phase.total ? Math.max(1, Math.min(100, Math.round((phase.done / phase.total) * 100))) : null;
  const progressCount = phase?.total ? `${phase.done}/${phase.total}` : null;

  // Fetch account identity once. If avatar is missing (user verified before it
  // was captured), trigger a one-time backfill via fetchAccount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const acc = await bgCall<Account>('getAccount').catch(() => null);
      if (cancelled || !acc) return;
      setAccount(acc);
      if (!acc.avatarUrl && acc.username) {
        const backfilled = await bgCall<Account>('fetchAccount').catch(() => null);
        if (!cancelled && backfilled) setAccount(backfilled);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openMyStars = () => {
    const u = account?.username;
    chrome.tabs.create({ url: u ? `https://github.com/${u}?tab=stars` : 'https://github.com/stars' });
  };

  const buttonContent = (label: string, active: boolean) =>
    active ? (
      <>
        <Spinner data-icon="inline-start" />
        {label}
        {progressCount && <span className="ml-1 tabular-nums text-[10px] opacity-80">{progressCount}</span>}
      </>
    ) : (
      label
    );

  return (
    <div className="border-b border-border bg-card">
      {/* Row 1: main controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder={m.toolbar.searchPlaceholder}
            value={f.query}
            onChange={(e) => f.setQuery(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        {/* Sort + direction */}
        <Select value={f.sortKey} onValueChange={(value) => f.setSort(value as typeof f.sortKey)}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder={m.toolbar.sortName} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starred_at">{m.toolbar.sortStarredAt}</SelectItem>
            <SelectItem value="pushed_at">{m.toolbar.sortPushedAt}</SelectItem>
            <SelectItem value="stargazers_count">{m.toolbar.sortStars}</SelectItem>
            <SelectItem value="name">{m.toolbar.sortName}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => f.setSort(f.sortKey, f.sortDir === 'asc' ? 'desc' : 'asc')}
          title={m.toolbar.toggleSortDir}
        >
          {f.sortDir === 'asc' ? <ArrowUpNarrowWide className="size-4" /> : <ArrowDownWideNarrow className="size-4" />}
        </Button>

        {/* Primary sync */}
        <Button onClick={() => onSync('syncIncremental', m.toolbar.syncButton)} disabled={actionBusy} title={m.toolbar.syncTitle}>
          {pendingAction === 'syncIncremental' ? (
            buttonContent(m.toolbar.syncButton, true)
          ) : (
            <>
              <RefreshCw className="size-4" data-icon="inline-start" />
              {m.toolbar.syncButton}
            </>
          )}
        </Button>

        <span className="flex-1" />

        {/* Overflow menu: Refresh tags / Push / Pull (replaces the old "数据" group) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" title={m.toolbar.moreTitle} disabled={actionBusy}>
              <MoreHorizontal className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1">
            <OverflowItem
              icon={<Tags className="size-4" />}
              label={m.toolbar.refreshTagsButton}
              active={pendingAction === 'refreshTags'}
              progressCount={progressCount}
              disabled={actionBusy}
              onClick={() => onRefreshTags()}
            />
            <OverflowItem
              icon={<Upload className="size-4" />}
              label={m.toolbar.gistPushButton}
              active={pendingAction === 'gistPush'}
              progressCount={progressCount}
              disabled={actionBusy}
              onClick={() => onSync('gistPush', m.toolbar.gistPushButton)}
            />
            <OverflowItem
              icon={<Download className="size-4" />}
              label={m.toolbar.gistPullButton}
              active={pendingAction === 'gistPull'}
              progressCount={progressCount}
              disabled={actionBusy}
              onClick={() => onSync('gistPull', m.toolbar.gistPullButton)}
            />
          </PopoverContent>
        </Popover>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleTheme} title={m.toolbar.themeTitle}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Account chip */}
        {account?.username && (
          <button
            onClick={openMyStars}
            title={m.toolbar.accountTitle(account.username)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-2.5 hover:bg-muted/40"
          >
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="size-6 rounded-full object-cover ring-1 ring-border"
                // Refetch on error (avatar URL may have rotated) — best-effort.
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
            ) : (
              <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
                {account.username.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="max-w-[100px] truncate text-xs font-medium">@{account.username}</span>
          </button>
        )}
      </div>

      {/* Row 2: status */}
      <div className="flex flex-col gap-1 border-t border-border/50 px-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className={cn(loading && 'animate-pulse')}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-3" />
                {m.common.loading}
              </span>
            ) : (
              m.toolbar.shownTotal(total, grandTotal)
            )}
          </span>
          {syncing && phase && (
            <span className="inline-flex items-center gap-2 text-primary">
              <Spinner className="size-3" />
              {m.common.phase(phase.phase)}: {phase.message}
              {phase.total != null && phase.total > 0 && ` (${phase.done}/${phase.total})`}
            </span>
          )}
          {!status?.hasToken && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="size-3.5" />
              {m.toolbar.noToken}
            </span>
          )}
        </div>
        {syncing && progressValue != null && (
          <div className="flex items-center gap-2">
            <Progress value={progressValue} className="h-2 flex-1" />
            <span className="min-w-[48px] text-right tabular-nums text-foreground">{progressCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OverflowItem({
  icon, label, active, progressCount, disabled, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  progressCount: string | null;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/40 disabled:opacity-40"
    >
      {active ? <Spinner className="size-4" /> : icon}
      <span className="flex-1">{label}</span>
      {active && progressCount && <span className="tabular-nums text-[10px] opacity-70">{progressCount}</span>}
    </button>
  );
}
