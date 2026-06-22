import type { FilterState } from '@/ui/filter-store';
import { Badge } from '@/ui/shadcn/badge';
import { cn } from '@/lib/utils';

/**
 * Active filter chips row: shows WHY the current result set is filtered, with a
 * one-click clear per chip and a "Clear all". Lives below the toolbar.
 */
export function ActiveFilterChips({
  f,
  count,
}: {
  f: FilterState;
  count: number;
}) {
  const active: { label: string; clear: () => void; kind: 'lang' | 'tag' | 'special' }[] = [];
  for (const lang of f.languages) {
    active.push({ label: lang, clear: () => f.toggleLanguage(lang), kind: 'lang' });
  }
  for (const tag of f.tags) {
    active.push({ label: tag, clear: () => f.toggleTag(tag), kind: 'tag' });
  }
  if (f.onlyUntagged) active.push({ label: '未标注', clear: () => f.setOnlyUntagged(false), kind: 'special' });
  if (f.showTombstone) active.push({ label: '已 unstar', clear: () => f.setShowTombstone(false), kind: 'special' });

  // No early return — the container in ManagerPanel animates height, so this
  // component always renders its inner content (which collapses to 0 height
  // when there are no active filters, via the parent's grid-template-rows: 0fr).

  return (
    <div className="flex flex-wrap items-center gap-1 bg-muted/30 px-3 py-1">
      <span className="mr-1 text-[10px] text-muted-foreground">{count} 结果 · 筛选中</span>
      {active.map((a, i) => (
        <button key={`${a.label}-${i}`} onClick={a.clear} title="点击移除该筛选">
          <Badge
            variant={a.kind === 'tag' ? 'default' : 'secondary'}
            className={cn(
              'cursor-pointer gap-1 hover:opacity-80',
              a.kind === 'special' && 'border-warning/40 bg-warning/10 text-warning',
            )}
          >
            {a.label}
            <span className="opacity-60">✕</span>
          </Badge>
        </button>
      ))}
      <button
        onClick={() => f.resetFilters()}
        className="ml-1 text-[11px] text-muted-foreground underline hover:text-foreground"
        title="清除全部筛选"
      >
        Clear all
      </button>
    </div>
  );
}
